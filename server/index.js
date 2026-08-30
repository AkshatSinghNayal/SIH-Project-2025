import 'dotenv/config';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { connectMongo } from './db.js';
import { Chat, Message } from './models.js';
import { SYSTEM_INSTRUCTION } from './systemPrompt.js';
import communityRouter from './community.js';
import authRouter, { requireAuth, requireCsrf } from './auth.js';

const app = express();
const PORT = process.env.PORT || 8787;

if (process.env.NODE_ENV === 'production') {
  const missingEnvs = [];
  if (!process.env.MONGODB_URI) missingEnvs.push('MONGODB_URI');
  if (!process.env.JWT_SECRET) missingEnvs.push('JWT_SECRET');
  if (!process.env.COMMUNITY_SESSION_SECRET) missingEnvs.push('COMMUNITY_SESSION_SECRET');
  if (missingEnvs.length > 0) {
    console.error(`FATAL: Missing required production environment variables: ${missingEnvs.join(', ')}`);
    process.exit(1);
  }
}

app.set('trust proxy', 1);

const corsEnv = process.env.CORS_ORIGIN || 'http://localhost:5173';
let corsOrigins;

if (corsEnv.trim() === '*') {
  corsOrigins = true;
} else {
  const list = corsEnv.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const expanded = new Set();
  list.forEach(origin => {
    expanded.add(origin);
    expanded.add(`${origin}/`);
  });
  corsOrigins = Array.from(expanded);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRouter);
app.use('/api/community', communityRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const getAiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'mock_key') return null;
  return new GoogleGenAI({ apiKey: key });
};

if (process.env.MONGODB_URI) {
  connectMongo(process.env.MONGODB_URI).catch(err => {
    console.error('Mongo connection failed:', err.message);
  });
}

const isValidObjectId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && id.length === 24;

const sanitizeHistory = (rawHistory) => {
  if (!Array.isArray(rawHistory)) return [];
  const valid = rawHistory.filter(
    h => h && typeof h.text === 'string' && h.text.trim() && (h.role === 'user' || h.role === 'model')
  );

  const formatted = [];
  let expectedRole = 'user';
  for (const msg of valid) {
    if (msg.role === expectedRole) {
      formatted.push({ role: msg.role, parts: [{ text: msg.text.trim() }] });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
  }

  // Gemini API requires chat history to end with a model turn before sending a new user message
  if (formatted.length > 0 && formatted[formatted.length - 1].role === 'user') {
    formatted.pop();
  }

  return formatted;
};

// POST /api/chat/stream { model?, history: [{role,text}], message: string, chatId?: string }
app.post('/api/chat/stream', requireAuth, requireCsrf, async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn('Streaming failed: GEMINI_API_KEY is not configured or set to mock_key');
      return res.status(503).json({ error: 'Gemini is not configured. Please set GEMINI_API_KEY in environment variables.' });
    }

    const { model, history = [], message, chatId } = req.body || {};
    const userId = req.user.id;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    let targetChatId = null;
    if (chatId && process.env.MONGODB_URI && isValidObjectId(chatId)) {
      const existingChat = await Chat.findOne({ _id: chatId, userId });
      if (existingChat) {
        targetChatId = chatId;
      }
    }

    const sanitizedHistory = sanitizeHistory(history);

    const envModel = process.env.GEMINI_MODEL;
    // Candidates list in order of preference (excluding deprecated/404 names)
    const modelCandidates = Array.from(new Set([
      (envModel && envModel.startsWith('gemini') && !envModel.includes('latest')) ? envModel : null,
      (typeof model === 'string' && model.startsWith('gemini') && !model.includes('latest')) ? model : null,
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-1.5-pro',
    ].filter(Boolean)));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let stream = null;
    let lastError = null;

    for (const candidateModel of modelCandidates) {
      try {
        console.log(`[CHAT STREAM] Attempting model '${candidateModel}'...`);
        const chatInstance = ai.chats.create({
          model: candidateModel,
          config: { systemInstruction: SYSTEM_INSTRUCTION },
          history: sanitizedHistory,
        });
        stream = await chatInstance.sendMessageStream({ message });
        console.log(`[CHAT STREAM] Success streaming with model '${candidateModel}'`);
        break;
      } catch (err) {
        console.warn(`[CHAT STREAM] Model '${candidateModel}' failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!stream) {
      throw lastError || new Error('All Gemini model candidates failed');
    }

    for await (const chunk of stream) {
      const text = chunk?.text ?? '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.end();

    // Persist messages if Mongo is connected and targetChatId is valid
    if (process.env.MONGODB_URI && userId && targetChatId) {
      try {
        const now = Date.now();
        await Message.create({ chatId: targetChatId, role: 'user', text: message, timestamp: now });
        const hist = chat.getHistory(true);
        const last = hist[hist.length - 1];
        const botText = last?.parts?.map(p => p.text).join('') || '';
        if (botText) await Message.create({ chatId: targetChatId, role: 'model', text: botText, timestamp: Date.now() });
      } catch (err) {
        console.error('Persist stream messages failed:', err?.message);
      }
    }
  } catch (e) {
    console.error('Streaming endpoint error:', e?.status, e?.message || e, e);
    if (!res.headersSent) {
      res.status(500).json({ error: e?.message || 'stream failed' });
    } else {
      res.end();
    }
  }
});

// Create a chat
app.post('/api/chats', requireAuth, requireCsrf, async (req, res) => {
  try {
    const { title } = req.body || {};
    const userId = req.user.id;
    if (!process.env.MONGODB_URI) return res.status(501).json({ error: 'db disabled' });
    if (!title) return res.status(400).json({ error: 'title required' });
    const chat = await Chat.create({ userId, title });
    res.json(chat);
  } catch (e) { res.status(500).json({ error: 'create failed' }); }
});

// List chats for authenticated user
app.get('/api/chats', requireAuth, async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) return res.json([]);
    const userId = req.user.id;
    const chats = await Chat.find({ userId }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (e) { res.status(500).json({ error: 'list failed' }); }
});

// List chats with parameter (ownership check)
app.get('/api/chats/:userId', requireAuth, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!process.env.MONGODB_URI) return res.json([]);
    const chats = await Chat.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (e) { res.status(500).json({ error: 'list failed' }); }
});

// Delete chat and its messages (ownership check)
app.delete('/api/chats/:chatId', requireAuth, requireCsrf, async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) return res.status(501).json({ error: 'db disabled' });
    const { chatId } = req.params;
    const userId = req.user.id;
    if (!isValidObjectId(chatId)) return res.status(400).json({ error: 'Invalid chat ID' });
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    await Message.deleteMany({ chatId });
    await Chat.deleteOne({ _id: chatId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'delete failed' }); }
});

// Get messages for a chat (ownership check)
app.get('/api/messages/:chatId', requireAuth, async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) return res.json([]);
    const { chatId } = req.params;
    const userId = req.user.id;
    if (!isValidObjectId(chatId)) return res.status(400).json({ error: 'Invalid chat ID' });
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const msgs = await Message.find({ chatId }).sort({ timestamp: 1 });
    res.json(msgs);
  } catch (e) { res.status(500).json({ error: 'messages failed' }); }
});

const server = http.createServer(app);

/* ------------------------------------------------------------------ */
/* Ephemeral anonymous peer room                                      */
/* ------------------------------------------------------------------ */

const peerServer = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
const participants = new Map();
const connectionsByIp = new Map();
const MAX_CONNECTIONS_PER_IP = 10;
const MESSAGE_LIMIT = 1000;

const cleanText = (value, max) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '';

const sendJson = (socket, payload) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
};

const broadcastPresence = () => {
  const online = participants.size;
  const waiting = [...participants.values()].filter(participant => !participant.partner).length;
  for (const [socket, participant] of participants) {
    sendJson(socket, {
      type: 'presence',
      online,
      others: Math.max(0, online - 1),
      matched: !!participant.partner,
      waiting,
    });
  }
};

const matchWaitingParticipants = () => {
  const waiting = [...participants.entries()].filter(([socket, participant]) =>
    !participant.partner && socket.readyState === WebSocket.OPEN
  );

  // Fisher-Yates keeps allocation random without sorting on an unstable comparator.
  for (let index = waiting.length - 1; index > 0; index--) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [waiting[index], waiting[swapWith]] = [waiting[swapWith], waiting[index]];
  }

  while (waiting.length > 1) {
    const [firstSocket, first] = waiting.shift();
    const candidateIndex = waiting.findIndex(([, candidate]) =>
      candidate.id !== first.lastPartnerId && first.id !== candidate.lastPartnerId
    );
    if (candidateIndex === -1) continue;

    const [[secondSocket, second]] = waiting.splice(candidateIndex, 1);
    first.partner = secondSocket;
    second.partner = firstSocket;
    first.lastPartnerId = second.id;
    second.lastPartnerId = first.id;
    sendJson(firstSocket, {
      type: 'matched',
      peer: { nickname: second.nickname, colorFrom: second.colorFrom, colorTo: second.colorTo },
    });
    sendJson(secondSocket, {
      type: 'matched',
      peer: { nickname: first.nickname, colorFrom: first.colorFrom, colorTo: first.colorTo },
    });
  }
  broadcastPresence();
};

const returnToMatching = (socket, reason) => {
  const participant = participants.get(socket);
  if (!participant) return;
  const partnerSocket = participant.partner;
  participant.partner = null;
  sendJson(socket, { type: 'searching', reason });

  if (partnerSocket) {
    const partner = participants.get(partnerSocket);
    if (partner) {
      partner.partner = null;
      sendJson(partnerSocket, { type: 'peer_left', reason });
      sendJson(partnerSocket, { type: 'searching', reason: 'peer_left' });
    }
  }
  matchWaitingParticipants();
};

const removeParticipant = socket => {
  const participant = participants.get(socket);
  if (!participant) return;
  const partnerSocket = participant.partner;
  participants.delete(socket);
  const nextIpCount = Math.max(0, (connectionsByIp.get(participant.ip) || 1) - 1);
  if (nextIpCount === 0) connectionsByIp.delete(participant.ip);
  else connectionsByIp.set(participant.ip, nextIpCount);
  if (partnerSocket) {
    const partner = participants.get(partnerSocket);
    if (partner) {
      partner.partner = null;
      sendJson(partnerSocket, { type: 'peer_left', reason: 'disconnected' });
      sendJson(partnerSocket, { type: 'searching', reason: 'peer_left' });
    }
  }
  matchWaitingParticipants();
};

peerServer.on('connection', (socket, request) => {
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });

  const ip = request.socket.remoteAddress || 'unknown';
  const joinDeadline = setTimeout(() => {
    if (!participants.has(socket)) socket.close(1008, 'Join required');
  }, 10_000);

  socket.on('message', raw => {
    let event;
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return sendJson(socket, { type: 'error', message: 'Invalid message format' });
    }

    if (event.type === 'join') {
      if (participants.has(socket)) return;
      const requestedId = cleanText(event.clientId, 80);
      const idInUse = [...participants.values()].some(participant => participant.id === requestedId);
      const id = requestedId && !idInUse ? requestedId : randomUUID();
      const nickname = cleanText(event.nickname, 40);
      const colorFrom = /^#[0-9a-f]{6}$/i.test(event.colorFrom) ? event.colorFrom : '#8C7FA3';
      const colorTo = /^#[0-9a-f]{6}$/i.test(event.colorTo) ? event.colorTo : '#665A7D';
      if (!nickname) return socket.close(1008, 'Invalid identity');
      if ((connectionsByIp.get(ip) || 0) >= MAX_CONNECTIONS_PER_IP) {
        return socket.close(1008, 'Too many connections');
      }

      clearTimeout(joinDeadline);
      participants.set(socket, {
        id, nickname, colorFrom, colorTo, ip, sentAt: [], partner: null, lastPartnerId: null,
      });
      connectionsByIp.set(ip, (connectionsByIp.get(ip) || 0) + 1);
      sendJson(socket, { type: 'ready', clientId: id });
      sendJson(socket, { type: 'searching', reason: 'joined' });
      matchWaitingParticipants();
      return;
    }

    const sender = participants.get(socket);
    if (!sender) return sendJson(socket, { type: 'error', message: 'Join the room first' });

    if (event.type === 'message') {
      const text = cleanText(event.text, MESSAGE_LIMIT);
      if (!text) return;
      const partnerSocket = sender.partner;
      if (!partnerSocket || !participants.has(partnerSocket)) {
        return sendJson(socket, { type: 'error', message: 'Still looking for someone new.' });
      }

      const now = Date.now();
      sender.sentAt = sender.sentAt.filter(ts => now - ts < 10_000);
      if (sender.sentAt.length >= 8) {
        return sendJson(socket, { type: 'error', message: 'Please slow down for a moment.' });
      }
      sender.sentAt.push(now);

      const message = {
        type: 'message',
        id: cleanText(event.id, 100) || `peer_${now}`,
        senderId: sender.id,
        nickname: sender.nickname,
        colorFrom: sender.colorFrom,
        colorTo: sender.colorTo,
        text,
        ts: now,
      };
      sendJson(socket, message);
      sendJson(partnerSocket, message);
      return;
    }

    if (event.type === 'typing') {
      if (sender.partner) {
        sendJson(sender.partner, {
          type: 'typing', senderId: sender.id, nickname: sender.nickname, active: event.active === true,
        });
      }
      return;
    }

    if (event.type === 'next') {
      returnToMatching(socket, 'next');
      return;
    }

    if (event.type === 'report') {
      const messageId = cleanText(event.messageId, 100);
      if (messageId) {
        const reportedPeer = sender.partner ? participants.get(sender.partner) : null;
        console.warn(JSON.stringify({
          event: 'peer_message_reported', messageId, reporterId: sender.id,
          reportedPeerId: reportedPeer?.id, reportedAt: Date.now(),
        }));
        sendJson(socket, { type: 'report_ack', messageId });
      }
    }
  });

  socket.on('close', () => {
    clearTimeout(joinDeadline);
    removeParticipant(socket);
  });
  socket.on('error', () => removeParticipant(socket));
});

const heartbeat = setInterval(() => {
  for (const socket of peerServer.clients) {
    if (socket.isAlive === false) {
      removeParticipant(socket);
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30_000);
heartbeat.unref();

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  if (pathname !== '/ws/peer') return socket.destroy();

  const origin = request.headers.origin;
  let sameHostOrigin = false;
  try {
    sameHostOrigin = !!origin && new URL(origin).host === request.headers.host;
  } catch {}
  const originAllowed = corsOrigins === true || !origin || sameHostOrigin || corsOrigins.includes(origin);
  const ip = request.socket.remoteAddress || 'unknown';
  if (!originAllowed || (connectionsByIp.get(ip) || 0) >= MAX_CONNECTIONS_PER_IP) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    return socket.destroy();
  }

  peerServer.handleUpgrade(request, socket, head, ws => peerServer.emit('connection', ws, request));
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

const shutdown = () => {
  for (const socket of peerServer.clients) socket.close(1001, 'Server restarting');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
