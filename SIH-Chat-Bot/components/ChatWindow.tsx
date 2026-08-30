import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatSession, Message } from '../types';
import { BreathingCircle } from './design';
import { SendIcon } from './icons';
import { COPY, QUICK_REPLIES } from '../content';

interface ChatWindowProps {
  chatSession: ChatSession | undefined;
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  username: string;
}

interface ChatMessageProps {
  message: Message;
  username: string;
  animate?: boolean;
}

const timeLabel = (ts: number): string =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const ChatMessage: React.FC<ChatMessageProps> = ({ message, username, animate }) => {
  const isUser = message.role === 'user';
  const isThinking = !isUser && message.text === '';

  return (
    <div className={`group flex items-end gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${animate ? 'animate-rise' : ''}`}>
      {isUser ? (
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-sage-100 text-sage-700 text-sm font-semibold"
          aria-hidden="true"
        >
          {username.charAt(0).toUpperCase()}
        </span>
      ) : (
        <BreathingCircle size={32} tone="sage" className="flex-shrink-0" />
      )}
      <div className={`flex flex-col max-w-xl ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-organic-sm ${
            isUser
              ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-br-sm'
              : 'bg-surface border border-line-200 text-ink-900 rounded-bl-sm'
          }`}
        >
          {isThinking ? (
            <div className="flex items-center gap-3 py-1 pr-2">
              <BreathingCircle size={22} tone="mist" />
              <span className="text-sm text-ink-600 italic">taking a breath…</span>
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.text}</p>
          ) : (
          <div className="text-ink-900 max-h-80 overflow-y-auto pr-1 max-w-proseletter">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                h1: ({ children }) => <h1 className="font-display text-xl font-medium mb-2 mt-3">{children}</h1>,
                h2: ({ children }) => <h2 className="font-display text-lg font-medium mb-2 mt-3">{children}</h2>,
                h3: ({ children }) => <h3 className="font-semibold text-base mb-1 mt-2">{children}</h3>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-sage-50 text-sage-700 px-1 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-sage-50 rounded-soft p-3 mb-2 overflow-x-auto text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <pre className="bg-sage-50 rounded-soft p-3 mb-2 overflow-x-auto text-sm">{children}</pre>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                a: ({ children, href }) => (
                  <a href={href} className="text-sage-700 underline hover:text-ink-900" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-sage-200 pl-3 italic text-ink-600 mb-2">{children}</blockquote>
                ),
                hr: () => <hr className="border-line-200 my-3" />,
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
        </div>
        <span
          className={`text-[11px] text-ink-600/70 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {timeLabel(message.timestamp)}
        </span>
      </div>
    </div>
  );
};

const ChatWindow: React.FC<ChatWindowProps> = ({ chatSession, onSendMessage, isLoading, username }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatSession?.messages]);

  // Grow with the content, up to ~6 lines, then scroll internally
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showQuickReplies = !!chatSession && chatSession.messages.filter(m => m.role === 'user').length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-ink-600">
            <BreathingCircle size={56} tone="sage" />
            <p className="text-sm">Opening your space…</p>
          </div>
        ) : chatSession ? (
          <div className="max-w-3xl mx-auto">
            {chatSession.messages.map((msg, index) => (
              <ChatMessage
                key={`${msg.timestamp}-${index}`}
                message={msg}
                username={username}
                animate={index >= chatSession.messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <BreathingCircle size={72} tone="sage" />
            <h2 className="font-display text-2xl font-medium text-ink-900">Start a new conversation</h2>
            <p className="text-ink-600 text-sm max-w-xs">
              Whatever’s on your mind, this is a quiet place to say it out loud.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-line-200 bg-canvas">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-4">
          {showQuickReplies && (
            <div className="flex flex-wrap gap-2 mb-3" aria-label="Common ways to start">
              {QUICK_REPLIES.map(q => (
                <button key={q} onClick={() => onSendMessage(q)} className="chip text-sm">
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={e => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2 bg-surface border border-line-200 rounded-[26px] shadow-soft pl-5 pr-2 py-2 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-sage-700/40 focus-within:border-sage-500/50"
          >
            <label htmlFor="chat-input" className="sr-only">
              Type your message
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here…"
              autoComplete="off"
              className="flex-1 resize-none bg-transparent py-2 text-ink-900 placeholder:text-ink-600/60 focus:outline-none leading-relaxed max-h-40"
            />
            <button
              type="submit"
              className="p-3 rounded-full bg-sage-500 text-white hover:bg-sage-700 disabled:bg-sage-200 transition-colors flex-shrink-0"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>
          <p className="text-xs text-ink-600/80 mt-2.5 text-center">{COPY.disclaimer}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
