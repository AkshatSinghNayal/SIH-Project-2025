import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { ViewName } from './types';
import Auth from './components/Auth';
import AppShell from './components/AppShell';
import { BreathingCircle } from './components/design';
import { SparkIcon } from './components/icons';

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const ChatView = React.lazy(() => import('./components/ChatView'));
const PeerChat = React.lazy(() => import('./components/PeerChat'));
const Assessment = React.lazy(() => import('./components/Assessment'));
const PersonalityTest = React.lazy(() => import('./components/PersonalityTest'));
const Tasks = React.lazy(() => import('./components/Tasks'));
const Community = React.lazy(() => import('./components/Community'));
const Profile = React.lazy(() => import('./components/Profile'));
const SettingsScreen = React.lazy(() => import('./components/SettingsScreen'));
const Resources = React.lazy(() => import('./components/Resources'));

const GUEST_VIEWS: ViewName[] = ['assessment', 'resources'];

const ScreenFallback = () => (
  <div className="h-full min-h-64 flex flex-col items-center justify-center gap-4 text-ink-600">
    <BreathingCircle size={52} tone="sage" />
    <p className="text-sm">Opening your space…</p>
  </div>
);

/** Guests get the assessment quietly; everything else waits behind a gentle door. */
const GuestGate: React.FC = () => {
  const { logout } = useAuth();
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="flex justify-center mb-6">
        <BreathingCircle size={80} tone="dusk" />
      </div>
      <h2 className="font-display text-2xl font-medium text-ink-900">This part keeps a space of its own</h2>
      <p className="text-ink-600 mt-3">
        Guests can take the check-in assessment. To talk, keep a streak, and remember your journey, create your own
        space — it takes a moment.
      </p>
      <button onClick={logout} className="btn-primary mt-6">
        <SparkIcon className="w-5 h-5" />
        Create my space
      </button>
    </div>
  );
};

const VALID_VIEWS: ViewName[] = [
  'home',
  'chat',
  'peer',
  'assessment',
  'personality',
  'tasks',
  'community',
  'profile',
  'settings',
  'resources',
];

const getViewFromHash = (): ViewName | null => {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  return VALID_VIEWS.includes(hash as ViewName) ? (hash as ViewName) : null;
};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<ViewName>(() => getViewFromHash() || 'home');
  const [assessmentChatPrompt, setAssessmentChatPrompt] = useState<string | null>(null);

  // Sync state with URL hash on browser Back/Forward (popstate & hashchange)
  useEffect(() => {
    const handleHashChange = () => {
      const currentHashView = getViewFromHash();
      if (currentHashView) {
        setView(currentHashView);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Set initial view on auth state change
  useEffect(() => {
    if (!user) return;
    const initialView = user.isGuest ? 'assessment' : (getViewFromHash() || 'home');
    setView(initialView);
    if (!window.location.hash || getViewFromHash() !== initialView) {
      window.history.replaceState(null, '', `#${initialView}`);
    }
  }, [user?.id, user?.isGuest]);

  if (isLoading) return <ScreenFallback />;

  if (!user) return <Auth />;

  const isGuest = !!user.isGuest;
  const gated = isGuest && !GUEST_VIEWS.includes(view);

  const navigate = (next: ViewName) => {
    setView(next);
    if (getViewFromHash() !== next) {
      window.history.pushState({ view: next }, '', `#${next}`);
    }
  };

  const screen = () => {
    if (gated) return <GuestGate />;
    switch (view) {
      case 'chat':
        return (
          <ChatView
            initialMessage={assessmentChatPrompt}
            onInitialMessageConsumed={() => setAssessmentChatPrompt(null)}
          />
        );
      case 'peer':
        return <PeerChat onNavigate={navigate} />;
      case 'assessment':
        return (
          <Assessment
            onNavigate={navigate}
            onTalkThrough={prompt => {
              setAssessmentChatPrompt(prompt);
              navigate('chat');
            }}
          />
        );
      case 'personality':
        return <PersonalityTest />;
      case 'tasks':
        return <Tasks />;
      case 'community':
        return <Community />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <SettingsScreen />;
      case 'resources':
        return <Resources />;
      case 'home':
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <AppShell activeView={view} onNavigate={navigate}>
      <React.Suspense fallback={<ScreenFallback />}>{screen()}</React.Suspense>
    </AppShell>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
