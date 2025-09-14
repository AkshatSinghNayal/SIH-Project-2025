import React, { useState, useRef, useEffect } from 'react';
import type { ChatSession, Message } from '../types';
import SendIcon from './icons/SendIcon';
import MenuIcon from './icons/MenuIcon';
import LogoIcon from './icons/LogoIcon';

interface ChatWindowProps {
  chatSession: ChatSession | undefined;
  onSendMessage: (message: string) => void;
  toggleSidebar: () => void;
  isLoading?: boolean;
  username: string;
}

interface ChatMessageProps {
    message: Message;
    username: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, username }) => {
    const isUser = message.role === 'user';
    const isThinking = message.role === 'model' && message.text === '...';
    
    return (
        <div className={`flex items-end gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                {isUser ? (
                    <span className="text-sm font-bold">{username.charAt(0).toUpperCase()}</span>
                ) : (
                    <LogoIcon className="w-5 h-5 text-indigo-400" />
                )}
            </div>
            <div 
              className={`max-w-xl px-4 py-3 rounded-2xl ${isUser ? 'bg-indigo-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'} ${isThinking ? 'animate-pulse' : ''}`}
            >
                <p className="text-white whitespace-pre-wrap">{message.text}</p>
            </div>
        </div>
    );
};

const ChatWindow: React.FC<ChatWindowProps> = ({ chatSession, onSendMessage, toggleSidebar, isLoading, username }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatSession?.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-700">
            <button onClick={toggleSidebar} className="text-white">
                <MenuIcon className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold truncate">
                {chatSession?.title || 'helloMind'}
            </h1>
            <div className="w-6"></div> {/* Spacer */}
        </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p>Loading chats...</p>
            </div>
          </div>
        ) : chatSession ? (
          <div>
            {chatSession.messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} username={username} />
            ))}
             <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <h2 className="text-2xl font-semibold">helloMind</h2>
              <p>Select a chat or start a new one to begin.</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
          />
          <button
            type="submit"
            className="p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors"
            disabled={!input.trim()}
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;