import React from 'react';
import type { ChatSession } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import LogoutIcon from './icons/LogoutIcon';
import LogoIcon from './icons/LogoIcon';

interface SidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onLogout: () => void;
  username: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  chatSessions,
  activeChatId,
  isOpen,
  setIsOpen,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onLogout,
  username
}) => {
  return (
    <>
        {/* Overlay for mobile */}
        <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsOpen(false)}
        ></div>

        <div 
            className={`flex flex-col h-full bg-gray-900 text-white transform transition-transform duration-300 ease-in-out z-40
                        w-72 md:w-80 md:relative md:translate-x-0 
                        ${isOpen ? 'translate-x-0' : '-translate-x-full'} absolute md:static`}
        >
            <div className="p-4">
                <div className="flex items-center gap-3 mb-6">
                    <LogoIcon className="w-8 h-8 text-indigo-400" />
                    <span className="text-2xl font-bold text-white">helloMind</span>
                </div>
                <button
                    onClick={onNewChat}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span className="font-semibold">New Chat</span>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Previous Chats
                </h2>
                <ul className="space-y-2">
                {chatSessions.map(session => (
                    <li key={session.id}>
                    <button
                        onClick={() => onSelectChat(session.id)}
                        className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-md transition-colors group ${
                        activeChatId === session.id
                            ? 'bg-gray-700'
                            : 'hover:bg-gray-800'
                        }`}
                    >
                        <span className="truncate text-sm">{session.title}</span>
                        <TrashIcon
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(session.id);
                        }}
                        className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity flex-shrink-0"
                        />
                    </button>
                    </li>
                ))}
                </ul>
            </div>

            <div className="border-t border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold truncate">{username}</span>
                    </div>
                    <button onClick={onLogout} className="text-gray-400 hover:text-white flex-shrink-0">
                        <LogoutIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    </>
  );
};

export default Sidebar;
