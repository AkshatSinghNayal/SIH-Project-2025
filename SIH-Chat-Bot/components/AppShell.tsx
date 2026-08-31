import React, { useState } from 'react';
import type { ViewName } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  AnonIcon,
  ChatIcon,
  ClipboardIcon,
  CloseIcon,
  CommunityIcon,
  HomeIcon,
  LeafIcon,
  LifelineIcon,
  LogoMark,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  SparkIcon,
  UserIcon,
} from './icons';

interface NavItem {
  view: ViewName;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV: NavItem[] = [
  { view: 'home', label: 'Home', icon: HomeIcon },
  { view: 'chat', label: 'Talk to helloMind', icon: ChatIcon },
  { view: 'peer', label: 'Anonymous chat', icon: AnonIcon },
  { view: 'assessment', label: 'Check-in assessment', icon: ClipboardIcon },
  { view: 'personality', label: 'Personality tests', icon: SparkIcon },
  { view: 'tasks', label: 'Daily tasks', icon: LeafIcon },
  { view: 'community', label: 'Community', icon: CommunityIcon },
  { view: 'profile', label: 'Profile', icon: UserIcon },
  { view: 'settings', label: 'Settings', icon: SettingsIcon },
];

// Guests arrive for the assessment only — everything else waits behind a gentle door.
const GUEST_VIEWS: ViewName[] = ['assessment', 'resources'];

interface AppShellProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ activeView, onNavigate, children }) => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isGuest = !!user?.isGuest;
  const navItems = isGuest ? NAV.filter(i => GUEST_VIEWS.includes(i.view)) : NAV;

  const go = (view: ViewName) => {
    onNavigate(view);
    setDrawerOpen(false);
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-canvas border-r border-line-200">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <LogoMark className="w-8 h-8" />
        <span className="font-display text-xl font-semibold text-ink-900">helloMind</span>
        <button
          className="ml-auto md:hidden p-1 text-ink-600 hover:text-ink-900"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
        <ul className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activeView === item.view;
            return (
              <li key={item.view}>
                <button
                  onClick={() => go(item.view)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-soft text-left text-[15px] transition-colors duration-200 ${
                    active ? 'bg-sage-100 text-sage-700 font-medium' : 'text-ink-600 hover:bg-sage-50 hover:text-ink-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-sage-700' : 'text-ink-600'}`} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Always one tap from a human — never buried in settings */}
      <div className="px-4 pb-3">
        <button
          onClick={() => go('resources')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-soft border text-left transition-colors duration-200 ${
            activeView === 'resources'
              ? 'bg-coral-100 border-coral-500/40'
              : 'bg-surface border-coral-500/25 hover:border-coral-500/50'
          }`}
        >
          <LifelineIcon className="w-5 h-5 text-coral-500 flex-shrink-0" />
          <span className="text-sm leading-snug">
            Need to talk to someone now?
            <span className="block text-xs text-ink-600">Helplines, one tap away</span>
          </span>
        </button>
      </div>

      <div className="border-t border-line-200 px-4 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
              isGuest ? 'bg-dusk-100 text-dusk-700' : 'bg-sage-100 text-sage-700'
            }`}
            aria-hidden="true"
          >
            {user?.username.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm font-medium truncate">{user?.username}</span>
        </div>
        <button onClick={logout} className="btn-ghost px-2.5 py-2" aria-label="Sign out" title="Sign out">
          <LogoutIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  if (activeView === 'peer') {
    return (
      <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-canvas">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-shrink-0">{sidebar}</aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 bg-ink-900/30 z-40 transition-opacity md:hidden ${
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu"
      >
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-canvas border-b border-line-200">
          <button className="p-1.5 -ml-1.5 text-ink-900" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <MenuIcon className="w-6 h-6" />
          </button>
          <span className="font-display text-lg font-semibold text-ink-900">helloMind</span>
          <button
            onClick={() => go('resources')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral-100 text-coral-500 text-xs font-medium"
          >
            <LifelineIcon className="w-4 h-4" />
            Need to talk?
          </button>
        </header>

        <main
          className={`flex-1 min-h-0 ${activeView === 'chat' || activeView === 'peer' ? 'overflow-hidden' : 'overflow-y-auto'}`}
          key={activeView}
        >
          <div className={`animate-rise ${activeView === 'chat' || activeView === 'peer' ? 'h-full' : 'min-h-full'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
