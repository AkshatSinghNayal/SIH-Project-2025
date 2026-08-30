import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter, { requireAuth, requireCsrf } from '../auth.js';
import { Chat, Message, User } from '../models.js';

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);

  // Protected test endpoints
  app.get('/api/chats', requireAuth, async (req, res) => {
    const chats = await Chat.find({ userId: req.user.id });
    res.json(chats);
  });

  app.post('/api/chats', requireAuth, requireCsrf, async (req, res) => {
    const chat = await Chat.create({ userId: req.user.id, title: req.body.title });
    res.json(chat);
  });

  app.delete('/api/chats/:chatId', requireAuth, requireCsrf, async (req, res) => {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.user.id });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    await Chat.deleteOne({ _id: req.params.chatId });
    res.json({ ok: true });
  });

  app.get('/api/messages/:chatId', requireAuth, async (req, res) => {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.user.id });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const msgs = await Message.find({ chatId: req.params.chatId });
    res.json(msgs);
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Chat.deleteMany({});
  await Message.deleteMany({});
});

describe('JWT Authentication & Security Tests', () => {
  it('should register a valid user and set an HttpOnly cookie and return a CSRF token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'valid_user', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('valid_user');
    expect(res.body.user.passwordHash).toBeUndefined(); // Account-safe JSON response
    expect(res.body.csrfToken).toBeDefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = cookies[0];
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('Path=/');
  });

  it('should reject registration for invalid usernames', async () => {
    const resShort = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'password123' });
    expect(resShort.status).toBe(400);

    const resInvalidChar = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user@name!', password: 'password123' });
    expect(resInvalidChar.status).toBe(400);
  });

  it('should enforce password policy (min 8 chars, letter + number, max 72 bytes)', async () => {
    const resShort = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', password: 'pas1' });
    expect(resShort.status).toBe(400);

    const resNoNumber = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', password: 'passwordonly' });
    expect(resNoNumber.status).toBe(400);

    const resLong = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', password: 'a1'.repeat(40) });
    expect(resLong.status).toBe(400);
  });

  it('should reject duplicate username registration case-insensitively', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'uniqueUser', password: 'password123' });

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'UNIQUEUSER', password: 'password123' });

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.error).toContain('already taken');
  });

  it('should login successfully with valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', password: 'password123' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'password123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.username).toBe('loginuser');
    expect(loginRes.body.csrfToken).toBeDefined();
  });

  it('should prevent username enumeration by returning generic login errors', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'realuser', password: 'password123' });

    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'realuser', password: 'wrongpassword1' });

    const unknownUserRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'fakeuser', password: 'wrongpassword1' });

    expect(wrongPassRes.status).toBe(401);
    expect(unknownUserRes.status).toBe(401);
    expect(wrongPassRes.body.error).toBe('Invalid username or password');
    expect(unknownUserRes.body.error).toBe('Invalid username or password');
  });

  it('should restore session via GET /api/auth/me when valid cookie is passed', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'sessionuser', password: 'password123' });

    expect(regRes.status).toBe(200);
    const cookieHeader = regRes.headers['set-cookie']?.[0]?.split(';')?.[0];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieHeader);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe('sessionuser');
    expect(meRes.body.csrfToken).toBeDefined();
  });

  it('should logout cleanly and clear the cookie', async () => {
    const logoutRes = await request(app).post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.ok).toBe(true);
  });

  it('should require CSRF token for state-changing endpoints and reject missing/invalid CSRF tokens', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'csrfuser', password: 'password123' });

    expect(regRes.status).toBe(200);
    const cookieHeader = regRes.headers['set-cookie']?.[0]?.split(';')?.[0];
    const csrfToken = regRes.body.csrfToken;

    // Missing CSRF token -> 403
    const noCsrfRes = await request(app)
      .post('/api/chats')
      .set('Cookie', cookieHeader)
      .send({ title: 'My Chat' });
    expect(noCsrfRes.status).toBe(403);

    // Invalid CSRF token -> 403
    const badCsrfRes = await request(app)
      .post('/api/chats')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', 'invalid_csrf_token_1234567890123456789012345678901234567890123456789012345678901234')
      .send({ title: 'My Chat' });
    expect(badCsrfRes.status).toBe(403);

    // Valid CSRF token -> 200
    const validCsrfRes = await request(app)
      .post('/api/chats')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'My Chat' });
    expect(validCsrfRes.status).toBe(200);
    expect(validCsrfRes.body.title).toBe('My Chat');
  });

  it('should enforce resource ownership and prevent IDOR attacks between users', async () => {
    // User A registers & creates a chat
    const userAReg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user_a', password: 'password123' });
    expect(userAReg.status).toBe(200);
    const userACookie = userAReg.headers['set-cookie']?.[0]?.split(';')?.[0];
    const userACsrf = userAReg.body.csrfToken;

    const chatARes = await request(app)
      .post('/api/chats')
      .set('Cookie', userACookie)
      .set('X-CSRF-Token', userACsrf)
      .send({ title: "User A's Private Chat" });
    const chatAId = chatARes.body._id;

    // User B registers
    const userBReg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user_b', password: 'password123' });
    const userBCookie = userBReg.headers['set-cookie']?.[0]?.split(';')?.[0];
    const userBCsrf = userBReg.body.csrfToken;

    // User B attempts to read User A's messages -> 404 / Forbidden
    const userBReadRes = await request(app)
      .get(`/api/messages/${chatAId}`)
      .set('Cookie', userBCookie);
    expect(userBReadRes.status).toBe(404);

    // User B attempts to delete User A's chat -> 404 / Forbidden
    const userBDeleteRes = await request(app)
      .delete(`/api/chats/${chatAId}`)
      .set('Cookie', userBCookie)
      .set('X-CSRF-Token', userBCsrf);
    expect(userBDeleteRes.status).toBe(404);
  });
});
