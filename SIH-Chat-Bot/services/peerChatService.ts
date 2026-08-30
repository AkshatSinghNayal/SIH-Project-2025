import type { PeerProfile } from '../types';

export type PeerConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface LivePeerMessage {
  type: 'message';
  id: string;
  senderId: string;
  nickname: string;
  colorFrom: string;
  colorTo: string;
  text: string;
  ts: number;
}

export interface MatchedPeer {
  nickname: string;
  colorFrom: string;
  colorTo: string;
}

interface PeerChatHandlers {
  onStatus: (status: PeerConnectionStatus) => void;
  onPresence: (online: number, others: number) => void;
  onMatched: (peer: MatchedPeer) => void;
  onSearching: (reason: string) => void;
  onPeerLeft: (reason: string) => void;
  onMessage: (message: LivePeerMessage) => void;
  onTyping: (senderId: string, nickname: string, active: boolean) => void;
  onError: (message: string) => void;
}

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
};

const peerSocketUrl = (): string => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = configuredBase || window.location.origin;
  const url = new URL(base, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/peer';
  url.search = '';
  url.hash = '';
  return url.toString();
};

export interface PeerChatClient {
  clientId: string;
  sendMessage: (text: string) => boolean;
  setTyping: (active: boolean) => void;
  report: (messageId: string) => void;
  next: () => void;
  disconnect: () => void;
}

export const connectPeerChat = (profile: PeerProfile, handlers: PeerChatHandlers): PeerChatClient => {
  let clientId = createId();
  let socket: WebSocket | null = null;
  let stopped = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  const send = (payload: object): boolean => {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  };

  const connect = () => {
    if (stopped) return;
    handlers.onStatus(reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

    try {
      socket = new WebSocket(peerSocketUrl());
    } catch {
      handlers.onError('Could not open the anonymous room.');
      return;
    }

    socket.addEventListener('open', () => {
      reconnectAttempt = 0;
      send({
        type: 'join',
        clientId,
        nickname: profile.nickname,
        colorFrom: profile.colorFrom,
        colorTo: profile.colorTo,
      });
    });

    socket.addEventListener('message', event => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (data.type === 'ready') {
        clientId = String(data.clientId || clientId);
        handlers.onStatus('connected');
      } else if (data.type === 'presence') {
        handlers.onPresence(Number(data.online) || 0, Number(data.others) || 0);
      } else if (data.type === 'matched') {
        handlers.onMatched(data.peer as unknown as MatchedPeer);
      } else if (data.type === 'searching') {
        handlers.onSearching(String(data.reason || 'searching'));
      } else if (data.type === 'peer_left') {
        handlers.onPeerLeft(String(data.reason || 'disconnected'));
      } else if (data.type === 'message') {
        handlers.onMessage(data as unknown as LivePeerMessage);
      } else if (data.type === 'typing') {
        handlers.onTyping(String(data.senderId || ''), String(data.nickname || 'Someone'), data.active === true);
      } else if (data.type === 'error') {
        handlers.onError(String(data.message || 'Something interrupted the room.'));
      }
    });

    socket.addEventListener('close', () => {
      handlers.onPresence(0, 0);
      handlers.onSearching('reconnecting');
      if (stopped) {
        handlers.onStatus('disconnected');
        return;
      }
      handlers.onStatus('reconnecting');
      reconnectAttempt += 1;
      const delay = Math.min(10_000, 750 * 2 ** Math.min(reconnectAttempt, 4));
      reconnectTimer = setTimeout(connect, delay);
    });

    socket.addEventListener('error', () => socket?.close());
  };

  connect();

  return {
    get clientId() { return clientId; },
    sendMessage: text => send({ type: 'message', id: `message_${createId()}`, text }),
    setTyping: active => { send({ type: 'typing', active }); },
    report: messageId => { send({ type: 'report', messageId }); },
    next: () => { send({ type: 'next' }); },
    disconnect: () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Left quietly');
      }
      handlers.onPresence(0, 0);
      handlers.onStatus('disconnected');
    },
  };
};
