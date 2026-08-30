import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './ChatWindow';
import type { ChatSession, Message } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getStreamingChatbotResponse } from '../services/geminiService';
import { getChatsForUser, saveChatsForUser } from '../services/apiService';
import { PlusIcon, TrashIcon } from './icons';

interface ChatViewProps {
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ initialMessage, onInitialMessageConsumed }) => {
  const { user } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sentInitialMessage = useRef<string | null>(null);

  // Load this user's conversations
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    getChatsForUser(user.id)
      .then(chats => {
        if (chats && chats.length > 0) {
          setChatSessions(chats);
          setActiveChatId(chats[0].id);
        } else {
          handleNewChat();
        }
      })
      .catch(error => {
        console.error('Failed to load chats:', error);
      })
      .finally(() => {
        setIsLoading(false);
        isInitialLoad.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Save chats whenever they settle — debounced so a streaming reply writes once, not per character
  useEffect(() => {
    if (isInitialLoad.current || !user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveChatsForUser(user.id, chatSessions).catch(error => {
        console.error('Failed to save chats:', error);
      });
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [chatSessions, user?.id]);

  const handleNewChat = () => {
    const newChatId = `chat_${Date.now()}`;
    const welcomeMessage: Message = {
      role: 'model',
      text: "Hello! I'm here to listen and support you. What's on your mind today?",
      timestamp: Date.now(),
    };
    const newSession: ChatSession = {
      id: newChatId,
      title: 'New conversation',
      messages: [welcomeMessage],
      createdAt: Date.now(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newChatId);
  };

  const handleDeleteChat = (chatId: string) => {
    setChatSessions(prev => {
      const remainingSessions = prev.filter(session => session.id !== chatId);
      if (activeChatId === chatId) {
        setActiveChatId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
      }
      return remainingSessions;
    });
  };

  const handleSendMessage = async (messageText: string) => {
    if (!activeChatId) return;

    const currentSession = chatSessions.find(session => session.id === activeChatId);
    if (!currentSession) return;

    const userMessage: Message = { role: 'user', text: messageText, timestamp: Date.now() };

    // Optimistically add the user message plus a quiet placeholder for the reply
    const botPlaceholder: Message = { role: 'model', text: '', timestamp: Date.now() + 1 };
    const historyForCall = [...currentSession.messages, userMessage];

    setChatSessions(prev =>
      prev.map(session => {
        if (session.id !== activeChatId) return session;
        return { ...session, messages: [...session.messages, userMessage, botPlaceholder] };
      })
    );

    try {
      const stream = await getStreamingChatbotResponse(activeChatId, historyForCall);

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setChatSessions(prev =>
          prev.map(session => {
            if (session.id !== activeChatId) return session;
            const newMessages = [...session.messages];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'model') {
              newMessages[newMessages.length - 1] = { ...lastMessage, text: fullResponse };
            }
            return { ...session, messages: newMessages };
          })
        );
      }

      // Name the conversation after the first thing the student said
      if (currentSession.messages.length < 2) {
        setChatSessions(prev =>
          prev.map(s =>
            s.id === activeChatId
              ? { ...s, title: messageText.substring(0, 25) + (messageText.length > 25 ? '…' : '') }
              : s
          )
        );
      }
    } catch (error) {
      console.error('Error getting response from Gemini:', error);
      setChatSessions(prev =>
        prev.map(session => {
          if (session.id !== activeChatId) return session;
          const newMessages = [...session.messages];
          const last = newMessages[newMessages.length - 1];
          if (last.role === 'model') {
            newMessages[newMessages.length - 1] = {
              ...last,
              text: 'Sorry — that didn’t come through. Take a breath and try again?',
            };
          }
          return { ...session, messages: newMessages };
        })
      );
    }
  };

  // Assessment handoff: once a conversation is ready, send its structured
  // questions, answers, and result to helloMind exactly once.
  useEffect(() => {
    if (!initialMessage || !activeChatId || isLoading || sentInitialMessage.current === initialMessage) return;
    sentInitialMessage.current = initialMessage;
    onInitialMessageConsumed?.();
    void handleSendMessage(initialMessage);
  // handleSendMessage intentionally uses the current active conversation snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, activeChatId, isLoading]);

  const activeChat = chatSessions.find(session => session.id === activeChatId);

  return (
    <div className="flex flex-col h-full">
      {/* Conversations as a calm ribbon of chips */}
      <div className="border-b border-line-200 bg-canvas/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
          <button onClick={handleNewChat} className="btn-secondary py-2 px-3.5 text-sm flex-shrink-0">
            <PlusIcon className="w-4 h-4" />
            New chat
          </button>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1" role="list" aria-label="Previous chats">
            {isLoading ? (
              <span className="text-sm text-ink-600 px-1">Opening your conversations…</span>
            ) : (
              chatSessions.map(session => (
                <div key={session.id} role="listitem" className="flex-shrink-0">
                  <button
                    onClick={() => setActiveChatId(session.id)}
                    className={`group flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-full border text-sm whitespace-nowrap transition-colors ${
                      activeChatId === session.id
                        ? 'bg-sage-100 border-sage-200 text-sage-700'
                        : 'bg-surface border-line-200 text-ink-600 hover:border-sage-500 hover:text-ink-900'
                    }`}
                    title={session.title}
                  >
                    <span className="max-w-[140px] truncate">{session.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteChat(session.id);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          handleDeleteChat(session.id);
                        }
                      }}
                      aria-label={`Delete conversation: ${session.title}`}
                      className="p-1 rounded-full text-ink-600/50 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-coral-500 transition-opacity"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChatWindow
          chatSession={activeChat}
          onSendMessage={handleSendMessage}
          username={user?.username || ''}
          isLoading={isLoading && !activeChat}
        />
      </div>
    </div>
  );
};

export default ChatView;
