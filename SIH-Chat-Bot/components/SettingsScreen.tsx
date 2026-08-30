import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { deleteUserLocalData, getAssessmentHistory, getMoods, getPersonalityHistory } from '../services/storageService';
import { ChatIcon, CheckIcon, CommunityIcon, LockIcon, LogoutIcon, SparkIcon, TrashIcon, UserIcon } from './icons';

const getChatCount = (userId: string): number => {
  try {
    const value = JSON.parse(localStorage.getItem(`chats_${userId}`) || '[]');
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
};

const Metric: React.FC<{ value: number; label: string; icon: React.ReactNode; tone: string }> = ({ value, label, icon, tone }) => (
  <div className="card-soft p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-soft ${tone}`}>{icon}</span><span className="font-display text-2xl text-ink-900">{value}</span></div>
    <p className="mt-3 text-xs font-medium text-ink-600">{label}</p>
  </div>
);

const DataRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  copy: string;
  badge: string;
  badgeTone: string;
}> = ({ icon, title, copy, badge, badgeTone }) => (
  <div className="flex items-start gap-4 border-b border-line-200 py-5 last:border-0">
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-soft bg-sage-50 text-sage-700">{icon}</span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium text-ink-900">{title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeTone}`}>{badge}</span></div><p className="mt-1 text-sm leading-relaxed text-ink-600">{copy}</p></div>
  </div>
);

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [counts, setCounts] = useState(() => user ? ({
    moods: getMoods(user.id).length,
    assessments: getAssessmentHistory(user.id).length,
    chats: getChatCount(user.id),
    portraits: getPersonalityHistory(user.id).length,
  }) : { moods: 0, assessments: 0, chats: 0, portraits: 0 });
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!user) return null;

  const clearProfileData = () => {
    deleteUserLocalData(user.id);
    setCounts({ moods: 0, assessments: 0, chats: 0, portraits: 0 });
    setDeleted(true);
    setConfirming(false);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="card-organic relative overflow-hidden bg-gradient-to-br from-surface via-sage-50 to-dusk-50 p-6 sm:p-8">
        <span className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-dusk-200/30 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-organic bg-surface text-sage-700 shadow-soft"><UserIcon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Account controls</p><h1 className="mt-1 font-display text-3xl font-medium text-ink-900 sm:text-4xl">Settings & privacy</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">See what helloMind stores, understand where information goes, and stay in control of this profile.</p></div>
          <button onClick={logout} className="btn-secondary self-start whitespace-nowrap sm:self-center"><LogoutIcon className="h-4 w-4" />Sign out</button>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Saved data summary">
        <Metric value={counts.moods} label="Mood entries" icon={<SparkIcon className="h-4 w-4" />} tone="bg-sage-100 text-sage-700" />
        <Metric value={counts.assessments} label="Check-ins" icon={<CheckIcon className="h-4 w-4" />} tone="bg-dusk-100 text-dusk-700" />
        <Metric value={counts.chats} label="AI conversations" icon={<ChatIcon className="h-4 w-4" />} tone="bg-honey-100 text-honey-500" />
        <Metric value={counts.portraits} label="Self-portraits" icon={<UserIcon className="h-4 w-4" />} tone="bg-coral-100 text-coral-500" />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card-organic p-5 sm:p-7" aria-labelledby="data-heading">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Data map</p><h2 id="data-heading" className="mt-1 font-display text-2xl text-ink-900">What goes where</h2><p className="mt-1 text-sm text-ink-600">A plain-language view of how each part of helloMind works.</p>
          <div className="mt-3">
            <DataRow icon={<LockIcon className="h-5 w-5" />} title="Personal activity" badge="On this device" badgeTone="bg-sage-100 text-sage-700" copy="Mood entries, assessments, daily activities, personality results, and saved AI chat history stay in this browser’s local storage." />
            <DataRow icon={<SparkIcon className="h-5 w-5" />} title="AI companion" badge="Sent for a reply" badgeTone="bg-honey-100 text-ink-900" copy="The message you send and relevant conversation context are transmitted to the configured AI service so it can respond. Your account name is not included by the chat client." />
            <DataRow icon={<CommunityIcon className="h-5 w-5" />} title="Community" badge="Shared globally" badgeTone="bg-dusk-100 text-dusk-700" copy="Community posts and support counts are stored by the helloMind server so other students can see them. Clearing this device does not delete published community posts." />
            <DataRow icon={<ChatIcon className="h-5 w-5" />} title="Anonymous peer chat" badge="Live only" badgeTone="bg-coral-100 text-coral-500" copy="Messages are relayed live to your matched peer and are not added to your saved chat history. The conversation disappears from this interface when you leave." />
          </div>
        </section>

        <div className="space-y-6">
          <section className="card-organic overflow-hidden" aria-labelledby="account-heading">
            <div className="bg-gradient-to-r from-sage-50 to-dusk-50 p-5 sm:p-6"><p className="text-xs font-medium uppercase tracking-[0.16em] text-dusk-700">Current profile</p><div className="mt-4 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface font-display text-xl text-ink-900 shadow-sm">{user.username.charAt(0).toUpperCase()}</span><div className="min-w-0"><h2 id="account-heading" className="truncate font-medium text-ink-900">{user.username}</h2><p className="text-xs text-ink-600">{user.isGuest ? 'Temporary guest session' : 'Local helloMind profile'}</p></div></div></div>
            <div className="space-y-4 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><span className="text-sm text-ink-600">Session</span><span className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-700"><span className="h-2 w-2 rounded-full bg-sage-500" />Active</span></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-ink-600">Storage</span><span className="text-xs font-medium text-ink-900">This browser</span></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-ink-600">Community identity</span><span className="text-xs font-medium text-ink-900">Signed session token</span></div></div>
          </section>

          <section className="card-organic p-5 sm:p-6" aria-labelledby="accessibility-heading">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Accessibility</p><h2 id="accessibility-heading" className="mt-1 font-display text-xl text-ink-900">Motion preference</h2><div className="mt-4 flex items-center gap-3 rounded-soft bg-sage-50 p-4"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${reducedMotion ? 'bg-sage-500 text-white' : 'bg-surface text-sage-700'}`}><CheckIcon className="h-4 w-4" /></span><div><p className="text-sm font-medium text-ink-900">{reducedMotion ? 'Reduced motion is active' : 'Gentle motion is active'}</p><p className="mt-0.5 text-xs text-ink-600">Automatically follows your device setting.</p></div></div>
          </section>
        </div>
      </div>

      <section className="mt-6 card-organic overflow-hidden border-coral-500/25" aria-labelledby="delete-heading">
        <div className="flex flex-col gap-5 bg-gradient-to-r from-coral-100/40 to-surface p-6 sm:flex-row sm:items-center sm:p-7">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface text-coral-500 shadow-sm"><TrashIcon className="h-5 w-5" /></span>
          <div className="flex-1"><h2 id="delete-heading" className="font-display text-xl text-ink-900">Clear this profile’s device data</h2><p className="mt-1 text-sm leading-relaxed text-ink-600">Permanently removes this profile’s moods, assessments, tasks, personality results, AI chat history, settings, and anonymous identity from this browser. Published community posts remain on the server.</p></div>
          {!deleted && !confirming && <button onClick={() => setConfirming(true)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-soft border border-coral-500/40 bg-surface px-4 py-2.5 text-sm font-medium text-coral-500 transition-colors hover:bg-coral-100"><TrashIcon className="h-4 w-4" />Clear device data</button>}
          {deleted && <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-sage-100 px-4 py-2 text-sm font-medium text-sage-700"><CheckIcon className="h-4 w-4" />Profile data cleared</span>}
        </div>
        {confirming && <div className="border-t border-coral-100 bg-surface p-5 sm:px-7"><p className="text-sm font-medium text-ink-900">Are you sure? This local data cannot be recovered.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={clearProfileData} className="inline-flex items-center gap-2 rounded-soft bg-coral-500 px-4 py-2.5 text-sm font-medium text-white">Yes, permanently clear it</button><button onClick={() => setConfirming(false)} className="btn-secondary py-2.5 text-sm">Keep my data</button></div></div>}
      </section>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-ink-600">helloMind is a wellbeing support tool, not a medical service. For urgent or clinical support, use the human-support resources available in the navigation.</p>
    </main>
  );
};

export default SettingsScreen;
