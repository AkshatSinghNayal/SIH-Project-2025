import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { User } from './models.js';

const router = express.Router();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT_SECRET environment variable is missing in production');
    }
    return 'dev-secret-key-do-not-use-in-production-1234567890';
  }
  return secret;
};

export const getCookieConfig = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const isSecure = process.env.COOKIE_SECURE === 'true' || isProd;
  const sameSiteConfig = (process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax')).toLowerCase();

  const cookieName = (isProd && isSecure) ? '__Host-token' : 'token';

  return {
    name: cookieName,
    options: {
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSiteConfig,
      path: '/',
      maxAge: 3600 * 1000, // 1 hour
    },
  };
};

export const generateCsrfToken = (userId, jti) => {
  const secret = getJwtSecret();
  return crypto.createHmac('sha256', secret).update(`csrf:${userId}:${jti}`).digest('hex');
};

export const verifyCsrfToken = (userId, jti, token) => {
  if (!token || typeof token !== 'string') return false;
  const expected = generateCsrfToken(userId, jti);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
};

// Validation helpers
export const validateUsername = (raw) => {
  if (typeof raw !== 'string') return { valid: false, message: 'Username is required.' };
  const username = raw.trim().toLowerCase();
  if (username.length < 3 || username.length > 32) {
    return { valid: false, message: 'Username must be between 3 and 32 characters long.' };
  }
  if (!/^[a-z0-9_@.-]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscores, hyphens, dots, and @.' };
  }
  return { valid: true, username };
};

export const validatePassword = (password) => {
  if (typeof password !== 'string') return { valid: false, message: 'Password is required.' };
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return { valid: false, message: 'Password is too long (maximum 72 bytes).' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
};

// Rate Limiters
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

// Authentication Middleware
export const requireAuth = (req, res, next) => {
  const { name: cookieName } = getCookieConfig();
  const token = req.cookies?.[cookieName] || req.cookies?.token || req.cookies?.['__Host-token'];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'helloMind',
      audience: 'helloMind-app',
    });

    req.user = {
      id: decoded.sub,
      username: decoded.username,
      jti: decoded.jti,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

// CSRF Protection Middleware for State-Changing Requests
export const requireCsrf = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const csrfHeader = req.headers['x-csrf-token'];
  if (!verifyCsrfToken(req.user.id, req.user.jti, csrfHeader)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  next();
};

const createAuthResponse = (res, user) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      jti,
    },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      issuer: 'helloMind',
      audience: 'helloMind-app',
      expiresIn: '1h',
    }
  );

  const { name: cookieName, options } = getCookieConfig();
  res.cookie(cookieName, token, options);

  const csrfToken = generateCsrfToken(user._id.toString(), jti);

  return res.json({
    user: {
      id: user._id.toString(),
      username: user.username,
    },
    csrfToken,
  });
};

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database service unavailable. Please check MongoDB connection.' });
    }

    const { username: rawUsername, password } = req.body || {};

    const usernameResult = validateUsername(rawUsername);
    if (!usernameResult.valid) {
      return res.status(400).json({ error: usernameResult.message });
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      return res.status(400).json({ error: passwordResult.message });
    }

    const { username } = usernameResult;

    // Check existing user case-insensitively to avoid duplicate conflicts
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await User.findOne({
      username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') }
    });
    if (existing) {
      return res.status(400).json({ error: `Username '${rawUsername.trim()}' is already taken. Please choose a different username or sign in.` });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, passwordHash });

    return createAuthResponse(res, user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username is already taken. Please choose a different username or sign in.' });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database service unavailable. Please check MongoDB connection.' });
    }

    const { username: rawUsername, password } = req.body || {};
    const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : '';

    if (!username || !password || typeof password !== 'string') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = await User.findOne({ username });
    if (!user || !user.passwordHash) {
      // Dummy compare to mitigate timing side-channel attack
      await bcrypt.compare(password, '$2a$12$e865f/9A16s5L6P1P1P1P1P1P1P1P1P1P1P1P1P1P1P1P1P1P1P1P');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    return createAuthResponse(res, user);
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      const { name: cookieName, options } = getCookieConfig();
      res.clearCookie(cookieName, { ...options, maxAge: undefined });
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    const csrfToken = generateCsrfToken(user._id.toString(), req.user.jti);

    return res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
      },
      csrfToken,
    });
  } catch (error) {
    console.error('Session restoration error:', error.message);
    return res.status(500).json({ error: 'Could not restore session' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { name: cookieName, options } = getCookieConfig();
  res.clearCookie(cookieName, { ...options, maxAge: undefined });
  // Also clear fallback names to be clean
  res.clearCookie('token', { ...options, maxAge: undefined });
  res.clearCookie('__Host-token', { ...options, maxAge: undefined });
  return res.json({ ok: true });
});

export default router;
