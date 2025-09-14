import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { connectMongo } from './db.js';
import { Chat, Message } from './models.js';

const app = express();
const PORT = process.env.PORT || 8787;

const corsEnv = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigins = corsEnv.trim() === '*'
  ? true
  : corsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins, credentials: false }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

const requireEnv = (name) => {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
};

const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
if (process.env.MONGODB_URI) {
  connectMongo(process.env.MONGODB_URI).catch(err => {
    console.error('Mongo connection failed:', err.message);
  });
}

// POST /api/chat/stream { model?, history: [{role,text}], message: string }
app.post('/api/chat/stream', async (req, res) => {
  try {
  const { model = 'gemini-2.5-flash', history = [], message, chatId, userId } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // curate history to start with a user message and ensure correct format
    const curated = Array.isArray(history) ? history.filter(h => h && typeof h.text === 'string' && (h.role === 'user' || h.role === 'model')) : [];
    let start = 0;
    while (start < curated.length && curated[start].role === 'model') start++;
    const prior = start > 0 ? curated.slice(start) : curated;

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: 'You are a supportive AI assistant for students. Keep responses concise and empathetic.',
      },
      history: prior.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await chat.sendMessageStream({ message });
    for await (const chunk of stream) {
      const text = chunk?.text ?? '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.end();

    // Persist messages if Mongo is connected and chat context provided
    if (process.env.MONGODB_URI && userId && chatId) {
      try {
        const now = Date.now();
        await Message.create({ chatId, role: 'user', text: message, timestamp: now });
        // Last chunk already streamed; fetch curated history from chat and save the model message end state
        const hist = chat.getHistory(true);
        const last = hist[hist.length - 1];
        const botText = last?.parts?.map(p => p.text).join('') || '';
        if (botText) await Message.create({ chatId, role: 'model', text: botText, timestamp: Date.now() });
      } catch (err) {
        console.error('Persist stream messages failed:', err?.message);
      }
    }
  } catch (e) {
    console.error('Streaming error:', e?.status, e?.message);
    if (!res.headersSent) res.status(500).json({ error: 'stream failed' });
    else res.end();
  }
});

// Create a chat
app.post('/api/chats', async (req, res) => {
  try {
    const { userId, title } = req.body || {};
    if (!process.env.MONGODB_URI) return res.status(501).json({ error: 'db disabled' });
    if (!userId || !title) return res.status(400).json({ error: 'userId and title required' });
    const chat = await Chat.create({ userId, title });
    res.json(chat);
  } catch (e) { res.status(500).json({ error: 'create failed' }); }
});

// List chats
app.get('/api/chats/:userId', async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) return res.json([]);
    const { userId } = req.params;
    const chats = await Chat.find({ userId }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (e) { res.status(500).json({ error: 'list failed' }); }
});

// Delete chat and its messages
app.delete('/api/chats/:chatId', async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) return res.status(501).json({ error: 'db disabled' });
    const { chatId } = req.params;
    await Message.deleteMany({ chatId });
    await Chat.deleteOne({ _id: chatId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'delete failed' }); }
});

// Get messages for a chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) return res.json([]);
    const { chatId } = req.params;
    const msgs = await Message.find({ chatId }).sort({ timestamp: 1 });
    res.json(msgs);
  } catch (e) { res.status(500).json({ error: 'messages failed' }); }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
