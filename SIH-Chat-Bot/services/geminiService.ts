import { GoogleGenAI, Chat } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';
import type { Message } from '../types';

const USE_REMOTE = import.meta.env.VITE_USE_REMOTE_API === 'true';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Local SDK path (dev only)
let ai: GoogleGenAI | null = null;
let chatInstances: Record<string, Chat> = {};

if (!USE_REMOTE) {
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string | undefined;
    if (!apiKey) {
        console.warn('GEMINI_API_KEY not set in client. For production use the backend proxy.');
    } else {
        ai = new GoogleGenAI({ apiKey });
    }
}

const getChatInstance = (chatId: string, history: Message[]): Chat => {
    if (!ai) throw new Error('Local SDK not initialized');
    if (chatInstances[chatId]) return chatInstances[chatId];

    const prior = history.slice(0, -1);
    let startIdx = 0;
    while (startIdx < prior.length && prior[startIdx].role === 'model') startIdx++;
    const curated = startIdx > 0 ? prior.slice(startIdx) : prior;
    const geminiHistory = curated.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: SYSTEM_INSTRUCTION },
        history: geminiHistory,
    });
    chatInstances[chatId] = chat;
    return chat;
};

export const getStreamingChatbotResponse = async (chatId: string, history: Message[]) => {
    const lastMessage = history[history.length - 1];
    if (lastMessage.role !== 'user') throw new Error('Last message must be user');

    if (USE_REMOTE) {
        // Stream via backend SSE
        const resp = await fetch(`${API_BASE}/api/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                history,
                message: lastMessage.text,
            }),
        });
        if (!resp.ok || !resp.body) throw new Error('Backend stream failed');

        // Convert SSE to async generator of { text }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        async function* parseSSE() {
            let buffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let idx;
                while ((idx = buffer.indexOf('\n\n')) !== -1) {
                    const chunk = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);
                    if (chunk.startsWith('data: ')) {
                        const payload = chunk.slice(6);
                        try { const obj = JSON.parse(payload); yield { text: obj.text || '' }; } catch {}
                    }
                }
            }
            if (buffer.length) {
                if (buffer.startsWith('data: ')) {
                    const payload = buffer.slice(6);
                    try { const obj = JSON.parse(payload); yield { text: obj.text || '' }; } catch {}
                }
            }
        }
        return parseSSE();
    }

    // Local SDK path
    if (!ai) throw new Error('Gemini SDK not configured on client');
    const chat = getChatInstance(chatId, history);
    return chat.sendMessageStream({ message: lastMessage.text });
};
