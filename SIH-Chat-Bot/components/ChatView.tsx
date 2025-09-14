import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import type { ChatSession, Message } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getStreamingChatbotResponse } from '../services/geminiService';
import { getChatsForUser, saveChatsForUser } from '../services/apiService';

const ChatView: React.FC = () => {
  const { user, logout } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Effect to load user chats from the mock API
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getChatsForUser(user.id)
        .then(chats => {
          if (chats && chats.length > 0) {
            setChatSessions(chats);
            setActiveChatId(chats[0].id);
          } else {
            // If no chats found, create a welcome chat for the new user.
            // This will trigger the save effect automatically.
            handleNewChat();
          }
        })
        .catch(error => {
          console.error("Failed to load chats:", error);
        })
        .finally(() => {
          setIsLoading(false);
          isInitialLoad.current = false;
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Effect to save chats to the mock API whenever they change
  useEffect(() => {
    if (isInitialLoad.current || !user) {
      return; // Don't save on initial load or if the user is not logged in.
    }
    
    saveChatsForUser(user.id, chatSessions).catch(error => {
        console.error("Failed to save chats:", error);
    });
  }, [chatSessions, user]);


  const handleNewChat = () => {
    const newChatId = `chat_${Date.now()}`;
    const welcomeMessage: Message = {
        role: 'model',
        text: "Hello! I'm here to listen and support you. What's on your mind today?",
        timestamp: Date.now(),
    }
    const newSession: ChatSession = {
      id: newChatId,
      title: 'New Conversation',
      messages: [welcomeMessage],
      createdAt: Date.now(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newChatId);
    setSidebarOpen(false); // Close sidebar on mobile after creating a new chat
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

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  }

  const handleSendMessage = async (messageText: string) => {
    if (!activeChatId) return;

    const userMessage: Message = { role: 'user', text: messageText, timestamp: Date.now() };
    
    // Optimistically add user message
     setChatSessions(prev =>
      prev.map(session =>
        session.id === activeChatId
          ? { ...session, messages: [...session.messages, userMessage] }
          : session
      )
    );
    
    // Create a placeholder for the bot's response and add it
    const botMessagePlaceholder: Message = { role: 'model', text: '...', timestamp: Date.now() };
    setChatSessions(prev =>
        prev.map(session =>
          session.id === activeChatId
            ? { ...session, messages: [...session.messages, botMessagePlaceholder] }
            : session
        )
    );

    try {
      const currentSession = chatSessions.find(s => s.id === activeChatId);
      if (!currentSession) return;
      
      const historyWithNewMessage = [...currentSession.messages, userMessage];
      const stream = await getStreamingChatbotResponse(activeChatId, historyWithNewMessage);

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setChatSessions(prev =>
          prev.map(session => {
            if (session.id === activeChatId) {
              const newMessages = [...session.messages];
              const lastMessage = newMessages[newMessages.length - 1];
              // Ensure we are updating the placeholder and not a user message
              if(lastMessage.role === 'model') {
                  newMessages[newMessages.length - 1] = { ...lastMessage, text: fullResponse };
              }
              return { ...session, messages: newMessages };
            }
            return session;
          })
        );
      }

      // Update title for new chats
      if (currentSession.messages.length < 2) { // 1 welcome msg
          setChatSessions(prev => prev.map(session => session.id === activeChatId ? {...session, title: messageText.substring(0, 25) + (messageText.length > 25 ? '...' : '')} : session));
      }

    } catch (error) {
      console.error("Error getting response from Gemini:", error);
      setChatSessions(prev =>
        prev.map(session => {
          if (session.id === activeChatId) {
            const newMessages = [...session.messages];
            newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], text: "Sorry, I encountered an error. Please try again." };
            return { ...session, messages: newMessages };
          }
          return session;
        })
      );
    }
  };

  const activeChat = chatSessions.find(session => session.id === activeChatId);

  return (
    <div className="flex h-screen w-screen bg-gray-800 text-white font-sans">
      <Sidebar
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onLogout={logout}
        username={user?.username || ''}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <main className="flex-1 flex flex-col relative">
        <ChatWindow
          chatSession={activeChat}
          onSendMessage={handleSendMessage}
          toggleSidebar={() => setSidebarOpen(prev => !prev)}
          isLoading={isLoading && !activeChat}
          username={user?.username || ''}
        />
      </main>
    </div>
  );
};

export default ChatView;