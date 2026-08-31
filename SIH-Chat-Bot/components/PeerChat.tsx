import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PeerProfile, ViewName } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getPeerProfile, savePeerProfile } from '../services/storageService';
import {
  connectPeerChat,
  type LivePeerMessage,
  type MatchedPeer,
  type PeerChatClient,
  type PeerConnectionStatus,
} from '../services/peerChatService';
import { PEER_GUIDELINES } from '../content';
import { BreathingCircle } from './design';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CloseIcon, FlagIcon, LockIcon, SendIcon } from './icons';

type DisplayMessage = LivePeerMessage & { reported?: boolean };

interface PeerChatProps {
  onNavigate?: (view: ViewName) => void;
}

const PersonaBadge: React.FC<{ name: string; from: string; to: string; size?: number }> = ({
  name, from, to, size = 32,
}) => (
  <span
    className="rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold shadow-sm"
    style={{ width: size, height: size, background: `linear-gradient(135deg, ${from}, ${to})` }}
    aria-hidden="true"
  >
    {name.split(' ').map(word => word[0]).join('').slice(0, 2)}
  </span>
);

const Guidelines: React.FC<{ onAccept: () => void; onExit?: () => void }> = ({ onAccept, onExit }) => (
  <div className="mx-auto flex min-h-full max-w-4xl items-center px-4 py-8 sm:px-6">
    <div className="card-organic grid w-full overflow-hidden lg:grid-cols-[0.8fr_1.2fr]">
      <div className="relative overflow-hidden bg-gradient-to-br from-dusk-50 to-sage-50 p-7 sm:p-9">
        {onExit && (
          <button
            onClick={onExit}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:text-ink-900"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Exit to helloMind</span>
          </button>
        )}
        <span className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-dusk-200/30 blur-3xl" aria-hidden="true" />
        <div className="relative"><span className="flex h-14 w-14 items-center justify-center rounded-organic bg-surface text-dusk-700 shadow-soft"><LockIcon className="h-6 w-6" /></span><p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-dusk-700">Anonymous peer chat</p><h1 className="mt-2 font-display text-3xl font-medium leading-tight text-ink-900">A conversation without profiles or pressure</h1><p className="mt-3 text-sm leading-relaxed text-ink-600">You will receive a random garden identity. Share only what feels comfortable.</p>
          <div className="mt-8 space-y-3 text-sm text-ink-600"><p className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-sage-700" />Random one-to-one matching</p><p className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-sage-700" />No permanent chat history</p><p className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-sage-700" />Leave or change person anytime</p></div>
        </div>
      </div>
      <div className="bg-surface p-7 sm:p-9">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Before entering</p><h2 className="mt-2 font-display text-2xl font-medium text-ink-900">Keep the room safe</h2><p className="mt-2 text-sm text-ink-600">These agreements apply to everyone in anonymous chat.</p>
        <ul className="my-7 space-y-4">{PEER_GUIDELINES.map((guideline, index) => <li key={guideline} className="flex items-start gap-3 text-sm leading-relaxed text-ink-900"><span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-dusk-100 text-xs font-semibold text-dusk-700">{index + 1}</span>{guideline}</li>)}</ul>
        <button onClick={onAccept} className="btn-primary w-full bg-dusk-500 hover:bg-dusk-700 active:bg-dusk-700">Enter anonymous chat<ArrowRightIcon className="h-4 w-4" /></button>
        <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-ink-600"><LockIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />Messages disappear from this interface when you leave.</p>
      </div>
    </div>
  </div>
);

const statusCopy = (status: PeerConnectionStatus, others: number, matchedPeer: MatchedPeer | null): string => {
  if (status === 'connecting') return 'Entering the room…';
  if (status === 'reconnecting') return 'Finding the room again…';
  if (status === 'disconnected') return 'You left the room';
  if (matchedPeer) return `Talking with ${matchedPeer.nickname}`;
  if (others === 0) return 'No one else is here right now';
  return 'Finding someone new…';
};

const PeerChat: React.FC<PeerChatProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PeerProfile | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<PeerConnectionStatus>('disconnected');
  const [online, setOnline] = useState(0);
  const [others, setOthers] = useState(0);
  const [matchedPeer, setMatchedPeer] = useState<MatchedPeer | null>(null);
  const [typingPeers, setTypingPeers] = useState<Record<string, string>>({});
  const [roomError, setRoomError] = useState('');
  const [roomNotice, setRoomNotice] = useState('');
  const [leftRoom, setLeftRoom] = useState(false);
  const clientRef = useRef<PeerChatClient | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) setProfile(getPeerProfile(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!profile?.seenGuidelines || leftRoom) return;
    setRoomError('');
    const client = connectPeerChat(profile, {
      onStatus: setStatus,
      onPresence: (nextOnline, nextOthers) => { setOnline(nextOnline); setOthers(nextOthers); },
      onMatched: peer => {
        setMatchedPeer(peer);
        setMessages([]);
        setTypingPeers({});
        setRoomNotice(`You’re now talking with ${peer.nickname}.`);
        setRoomError('');
      },
      onSearching: reason => {
        setMatchedPeer(null);
        setTypingPeers({});
        if (reason === 'next') setRoomNotice('Looking for someone different…');
      },
      onPeerLeft: reason => {
        setMatchedPeer(null);
        setTypingPeers({});
        setRoomNotice(reason === 'next' ? 'That student moved on. Finding someone new…' : 'That student left quietly. Finding someone new…');
      },
      onMessage: message => {
        setMessages(previous => previous.some(existing => existing.id === message.id) ? previous : [...previous, message]);
      },
      onTyping: (senderId, nickname, active) => {
        setTypingPeers(previous => {
          const next = { ...previous };
          if (active) next[senderId] = nickname;
          else delete next[senderId];
          return next;
        });
      },
      onError: setRoomError,
    });
    clientRef.current = client;
    return () => {
      client.disconnect();
      if (clientRef.current === client) clientRef.current = null;
      clearTimeout(typingTimer.current);
    };
  }, [profile?.seenGuidelines, profile?.nickname, leftRoom]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingPeers]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  const typingNames = useMemo(() => Object.values(typingPeers), [typingPeers]);
  const canChat = status === 'connected' && !!matchedPeer && !leftRoom;

  if (!user || !profile) return null;
  if (!profile.seenGuidelines) {
    return (
      <Guidelines
        onExit={() => onNavigate?.('home')}
        onAccept={() => {
          const updated = { ...profile, seenGuidelines: true };
          savePeerProfile(user.id, updated);
          setProfile(updated);
        }}
      />
    );
  }

  const send = (suggested?: string) => {
    const text = (suggested ?? input).trim();
    if (!text || !canChat) return;
    if (clientRef.current?.sendMessage(text)) {
      setInput('');
      clientRef.current.setTyping(false);
      clearTimeout(typingTimer.current);
    }
  };

  const updateInput = (value: string) => {
    setInput(value.slice(0, 1000));
    if (!canChat) return;
    clientRef.current?.setTyping(value.trim().length > 0);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => clientRef.current?.setTyping(false), 1200);
  };

  const report = (messageId: string) => {
    clientRef.current?.report(messageId);
    setMessages(previous => previous.map(message => message.id === messageId ? { ...message, reported: true } : message));
  };

  const leave = () => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    clearTimeout(typingTimer.current);
    setLeftRoom(true);
    setMessages([]);
    setTypingPeers({});
    setMatchedPeer(null);
    setInput('');
  };

  const exitRoom = () => {
    leave();
    onNavigate?.('home');
  };

  const nextPerson = () => {
    if (!matchedPeer) return;
    clientRef.current?.setTyping(false);
    clientRef.current?.next();
    setMatchedPeer(null);
    setMessages([]);
    setTypingPeers({});
    setInput('');
    setRoomNotice('Looking for someone different…');
  };

  const presenceText = statusCopy(status, others, matchedPeer);
  const starters = ['Hey, how is your day going?', 'I could use someone to listen.', 'What has been on your mind lately?'];

  return (
    <main className="h-full bg-canvas p-0 sm:p-4 lg:p-6">
      <div className="mx-auto flex h-full max-w-5xl overflow-hidden border-line-200 bg-surface sm:rounded-organic sm:border sm:shadow-soft-lg">
        <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-line-200 bg-gradient-to-b from-dusk-50 to-sage-50 p-5 lg:flex">
          <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-dusk-700">Anonymous space</p><h1 className="mt-1 font-display text-2xl text-ink-900">Peer chat</h1><p className="mt-2 text-sm leading-relaxed text-ink-600">A private, one-to-one conversation with another student.</p></div>
          <div className="mt-7 rounded-soft border border-dusk-200 bg-surface p-4"><p className="text-xs text-ink-600">You appear as</p><div className="mt-3 flex items-center gap-3"><PersonaBadge name={profile.nickname} from={profile.colorFrom} to={profile.colorTo} size={40} /><div className="min-w-0"><p className="truncate text-sm font-medium text-ink-900">{profile.nickname}</p><p className="text-xs text-ink-600">Garden identity</p></div></div></div>
          <div className="mt-5 space-y-3 text-xs text-ink-600"><p className="flex items-center gap-2"><LockIcon className="h-4 w-4 text-sage-700" />Messages are not saved</p><p className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-sage-500' : 'bg-honey-500 animate-pulse'}`} />{status === 'connected' ? `${online} online now` : 'Connecting to room'}</p><p className="flex items-center gap-2"><FlagIcon className="h-4 w-4 text-coral-500" />Report any unsafe message</p></div>
          <div className="mt-auto space-y-2 pt-6">
            {!leftRoom && matchedPeer && <button onClick={nextPerson} className="btn-secondary w-full text-sm"><ArrowRightIcon className="h-4 w-4" />Next person</button>}
            {leftRoom ? <button onClick={() => setLeftRoom(false)} className="btn-primary w-full text-sm">Rejoin room</button> : <button onClick={leave} className="btn-ghost w-full text-sm"><CloseIcon className="h-4 w-4" />Leave quietly</button>}
            <button onClick={exitRoom} className="btn-ghost w-full text-sm flex items-center justify-center gap-2 text-ink-600 hover:text-ink-900">
              <ArrowLeftIcon className="h-4 w-4" />
              Exit to helloMind
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center gap-3 border-b border-line-200 bg-surface px-4 py-3 sm:px-6">
            <button onClick={exitRoom} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-200 bg-canvas text-xs font-medium text-ink-600 hover:text-ink-900 hover:border-sage-500 transition-colors" title="Exit full screen anonymous chat">
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Exit</span>
            </button>
            {matchedPeer ? <PersonaBadge name={matchedPeer.nickname} from={matchedPeer.colorFrom} to={matchedPeer.colorTo} size={40} /> : <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-dusk-100"><LockIcon className="h-4 w-4 text-dusk-700" /><span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface ${status === 'connected' ? 'bg-sage-500' : 'bg-honey-500 animate-pulse'}`} /></span>}
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-medium text-ink-900">{matchedPeer?.nickname ?? 'Anonymous peer chat'}</h2>{matchedPeer && <span className="hidden rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-medium text-sage-700 sm:inline">Connected</span>}</div><p className="truncate text-xs text-ink-600">{presenceText}{status === 'connected' && !matchedPeer ? ` · ${online} online` : ''}</p></div>
            {!leftRoom && matchedPeer && <button onClick={nextPerson} className="btn-secondary px-3 py-2 text-xs lg:hidden" title="Find a different person"><ArrowRightIcon className="h-4 w-4" /><span className="hidden sm:inline">Next</span></button>}
            {!leftRoom && <button onClick={leave} className="btn-ghost px-2.5 py-2 lg:hidden" aria-label="Leave anonymous chat" title="Leave quietly"><CloseIcon className="h-4 w-4" /></button>}
          </header>

          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-dusk-50/70 to-canvas px-4 py-5 sm:px-7" aria-live="polite">
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 flex items-center justify-center gap-2 text-[11px] text-ink-600"><LockIcon className="h-3.5 w-3.5" />Live and anonymous · cleared when either person leaves</div>
              {roomError && <div className="mb-5 rounded-soft border border-coral-500/30 bg-coral-100 px-4 py-3 text-sm text-ink-900">{roomError}</div>}
              {roomNotice && !roomError && matchedPeer && <p className="mb-5 text-center text-xs text-ink-600">{roomNotice}</p>}

              {messages.length === 0 && <div className="flex min-h-[340px] flex-col items-center justify-center text-center animate-rise">
                {leftRoom ? (
                  <>
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-700"><LockIcon className="h-7 w-7" /></span>
                    <h3 className="mt-5 font-display text-2xl text-ink-900">Conversation ended</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-600">Nothing from that conversation was saved. Rejoin whenever you feel ready.</p>
                    <div className="mt-5 flex items-center gap-3">
                      <button onClick={() => setLeftRoom(false)} className="btn-primary">Rejoin the room</button>
                      <button onClick={exitRoom} className="btn-secondary">Exit to app</button>
                    </div>
                  </>
                ) : status === 'connecting' || status === 'reconnecting' ? <><BreathingCircle size={64} tone="dusk" /><h3 className="mt-5 font-display text-2xl text-ink-900">{presenceText}</h3><p className="mt-2 text-sm text-ink-600">Setting up a private live connection.</p></> : matchedPeer ? <><PersonaBadge name={matchedPeer.nickname} from={matchedPeer.colorFrom} to={matchedPeer.colorTo} size={64} /><h3 className="mt-5 font-display text-2xl text-ink-900">You matched with {matchedPeer.nickname}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-600">Be kind, protect your identity, and share only what feels comfortable.</p><div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">{starters.map(starter => <button key={starter} onClick={() => send(starter)} className="chip bg-surface px-3 py-2 text-xs">{starter}</button>)}</div></> : others === 0 ? <><span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-dusk-100"><LockIcon className="h-7 w-7 text-dusk-700" /><span className="absolute -right-1 top-1 h-4 w-4 rounded-full border-2 border-surface bg-honey-500 animate-pulse" /></span><h3 className="mt-5 font-display text-2xl text-ink-900">You are first in the room</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-600">Stay here if you would like. Matching starts automatically when another student comes online.</p><span className="mt-5 rounded-full border border-dusk-200 bg-surface px-4 py-2 text-xs font-medium text-dusk-700">Waiting for someone…</span></> : <><BreathingCircle size={64} tone="dusk" /><h3 className="mt-5 font-display text-2xl text-ink-900">Finding a new match</h3><p className="mt-2 max-w-sm text-sm text-ink-600">{others} other {others === 1 ? 'student is' : 'students are'} online.</p></>}
              </div>}

              {messages.map(message => {
                const mine = message.senderId === clientRef.current?.clientId;
                if (mine) return <div key={message.id} className="mb-4 flex justify-end animate-rise"><div className="max-w-[84%] sm:max-w-[72%]"><div className="whitespace-pre-wrap break-words rounded-[20px] rounded-br-sm bg-dusk-700 px-4 py-3 text-[15px] leading-relaxed text-white shadow-sm">{message.text}</div><p className="mt-1 text-right text-[10px] text-ink-600">You · {new Date(message.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p></div></div>;
                return <div key={message.id} className="mb-4 flex items-end gap-2 animate-rise">{!message.reported && <PersonaBadge name={message.nickname} from={message.colorFrom} to={message.colorTo} size={28} />}<div className="max-w-[84%] sm:max-w-[72%]">{message.reported ? <div className="rounded-soft border border-line-200 bg-surface px-4 py-3 text-sm italic text-ink-600">Message hidden. Thanks for helping keep this space safe.</div> : <><div className="group whitespace-pre-wrap break-words rounded-[20px] rounded-bl-sm border border-line-200 bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink-900 shadow-sm">{message.text}<button onClick={() => report(message.id)} className="ml-2 inline text-ink-600/40 transition-colors hover:text-coral-500" aria-label={`Report message from ${message.nickname}`} title="Report and hide"><FlagIcon className="inline h-3.5 w-3.5" /></button></div><p className="mt-1 text-[10px] text-ink-600">{message.nickname} · {new Date(message.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p></>}</div></div>;
              })}
              {typingNames.length > 0 && <div className="mb-3 flex items-center gap-2 animate-fade-in"><span className="flex gap-1 rounded-full border border-line-200 bg-surface px-3 py-2 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-dusk-500 animate-pulse" /><span className="h-1.5 w-1.5 rounded-full bg-dusk-500 animate-pulse" /><span className="h-1.5 w-1.5 rounded-full bg-dusk-500 animate-pulse" /></span><span className="text-xs text-ink-600">{typingNames[0]} is typing</span></div>}
              <div ref={endRef} />
            </div>
          </div>

          <form onSubmit={event => { event.preventDefault(); send(); }} className="border-t border-line-200 bg-surface px-4 py-3 sm:px-6 sm:py-4">
            <div className="mx-auto max-w-2xl">
              {!leftRoom && !canChat && <p className="mb-2 text-center text-xs text-ink-600">{status === 'connected' ? (others > 0 ? 'Finding a different person…' : 'Messages unlock when someone joins.') : 'Connecting securely…'}</p>}
              <div className={`flex items-end gap-2 rounded-[22px] border bg-canvas p-2 pl-4 transition-all focus-within:border-dusk-500 focus-within:ring-2 focus-within:ring-dusk-500/20 ${canChat ? 'border-line-200' : 'border-line-200 opacity-60'}`}><label htmlFor="peer-input" className="sr-only">Type your message</label><textarea id="peer-input" ref={textareaRef} rows={1} value={input} onChange={event => updateInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={canChat ? `Message ${matchedPeer?.nickname}…` : leftRoom ? 'Rejoin to start talking' : 'Waiting for a match…'} autoComplete="off" maxLength={1000} disabled={!canChat} className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed text-ink-900 placeholder:text-ink-600/60 focus:outline-none disabled:cursor-not-allowed" /><button type="submit" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-dusk-700 text-white transition-colors hover:bg-dusk-500 disabled:bg-dusk-200" disabled={!canChat || !input.trim()} aria-label="Send message"><SendIcon className="h-5 w-5" /></button></div>
              <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-ink-600"><span>Enter to send · Shift + Enter for a new line</span>{input.length > 800 && <span>{input.length}/1000</span>}</div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export default PeerChat;
