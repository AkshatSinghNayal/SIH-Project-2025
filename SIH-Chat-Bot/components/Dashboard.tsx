import React, { useMemo, useState } from 'react';
import { DAILY_TASKS, MOOD_PROMPTS } from '../content';
import { useAuth } from '../hooks/useAuth';
import { dateKey, getAssessmentHistory, getMoodToday, getMoods, getStreak, isTaskDoneToday, logMood } from '../services/storageService';
import type { ViewName } from '../types';
import { MOOD_COLORS, MOOD_LABELS, MoodFace } from './design';
import { AnonIcon, ArrowRightIcon, ChatIcon, CheckIcon, ClipboardIcon, CommunityIcon, LeafIcon, LifelineIcon, SparkIcon } from './icons';

interface DashboardProps {
  onNavigate: (view: ViewName) => void;
}

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Welcome back';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const taskOfTheDay = () => {
  const day = Math.floor(Date.now() / 86_400_000);
  return DAILY_TASKS[day % DAILY_TASKS.length];
};

const ActionCard: React.FC<{
  title: string;
  copy: string;
  meta: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
  tone: 'sage' | 'dusk' | 'honey';
}> = ({ title, copy, meta, icon: Icon, onClick, tone }) => {
  const tones = {
    sage: 'bg-sage-100 text-sage-700 group-hover:bg-sage-500 group-hover:text-white',
    dusk: 'bg-dusk-100 text-dusk-700 group-hover:bg-dusk-500 group-hover:text-white',
    honey: 'bg-honey-100 text-honey-500 group-hover:bg-honey-500 group-hover:text-white',
  };
  return (
    <button onClick={onClick} className="group card-soft flex min-h-[190px] flex-col p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-soft transition-colors ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <ArrowRightIcon className="h-4 w-4 text-ink-600 transition-transform group-hover:translate-x-1" />
      </div>
      <div className="mt-auto pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-600">{meta}</p>
        <h3 className="mt-1 font-display text-xl font-medium text-ink-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{copy}</p>
      </div>
    </button>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [mood, setMood] = useState(() => user ? getMoodToday(user.id) : undefined);
  const [rechecking, setRechecking] = useState(false);
  const allMoods = useMemo(() => user ? getMoods(user.id) : [], [user?.id, mood?.ts]);
  const assessments = useMemo(() => user ? getAssessmentHistory(user.id) : [], [user?.id]);
  const streak = useMemo(() => user ? getStreak(user.id) : 0, [user?.id, mood?.ts]);
  const task = useMemo(taskOfTheDay, []);
  const prompt = useMemo(() => MOOD_PROMPTS[new Date().getDate() % MOOD_PROMPTS.length], []);
  const taskDone = user ? isTaskDoneToday(user.id, task.id) : false;
  const moodByDate = new Map(allMoods.map(entry => [entry.date, entry]));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { date, key: dateKey(date.getTime()), mood: moodByDate.get(dateKey(date.getTime())) };
  });
  const weekLogged = week.filter(day => day.mood).length;

  const pickMood = (level: number) => {
    if (!user) return;
    setMood(logMood(user.id, level)[0]);
    setRechecking(false);
  };

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="mx-auto max-w-5xl px-4 pb-14 pt-7 sm:px-6 sm:pt-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-sage-700">{greeting()}, {user?.username}</p>
          <h1 className="mt-1 font-display text-3xl font-medium leading-tight text-ink-900 sm:text-4xl">Your space for today</h1>
          <p className="mt-2 text-sm text-ink-600">{today} · Start wherever feels most useful.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-line-200 bg-surface px-3.5 py-2 shadow-sm sm:self-auto">
          <span className={`h-2.5 w-2.5 rounded-full ${streak > 0 ? 'bg-honey-500' : 'bg-line-200'}`} />
          <span className="text-sm font-medium text-ink-900">{streak} day streak</span>
        </div>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="card-organic relative overflow-hidden p-6 sm:p-8" aria-labelledby="mood-heading">
          <span className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-sage-100/70 blur-3xl" aria-hidden="true" />
          <span className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-dusk-100/70 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Daily check-in</p><h2 id="mood-heading" className="mt-1 font-display text-2xl font-medium text-ink-900">{!mood || rechecking ? prompt : `Today feels ${MOOD_LABELS[mood.level - 1].toLowerCase()}`}</h2></div>
              {mood && !rechecking && <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-sage-700">Saved today</span>}
            </div>

            {!mood || rechecking ? (
              <>
                <p className="mt-2 text-sm text-ink-600">Choose what feels closest. You can update it later.</p>
                <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map(level => <button key={level} onClick={() => pickMood(level)} className="group flex min-w-0 flex-col items-center rounded-soft border border-line-200 bg-surface px-1 py-3 transition-all hover:-translate-y-0.5 hover:border-sage-500 hover:shadow-soft" aria-label={`Log mood: ${MOOD_LABELS[level - 1]}`}><MoodFace level={level} size={44} /><span className="mt-2 max-w-full truncate text-[10px] text-ink-600 sm:text-xs">{MOOD_LABELS[level - 1]}</span></button>)}
                </div>
                {rechecking && <button onClick={() => setRechecking(false)} className="btn-ghost mt-4 text-sm">Cancel update</button>}
              </>
            ) : (
              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                <MoodFace level={mood.level} size={78} className="flex-shrink-0" />
                <div className="flex-1"><p className="max-w-lg text-sm leading-relaxed text-ink-600">{mood.level >= 4 ? 'A steadier day is worth noticing. Protect it with one small thing that supports you.' : mood.level === 3 ? 'Being somewhere in the middle is real too. A small reset may help you understand what you need next.' : 'Thank you for naming it honestly. You do not need to carry a difficult day without support.'}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onNavigate('chat')} className="btn-primary py-2.5 text-sm"><ChatIcon className="h-4 w-4" />Talk it through</button><button onClick={() => setRechecking(true)} className="btn-ghost py-2.5 text-sm">Update mood</button></div></div>
              </div>
            )}
          </div>
        </section>

        <aside className="card-organic flex flex-col overflow-hidden bg-gradient-to-br from-honey-100 via-surface to-sage-50 p-6 text-ink-900 sm:p-7">
          <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-soft bg-surface text-sage-700 shadow-sm"><LeafIcon className="h-5 w-5" /></span>{taskDone && <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-700"><CheckIcon className="h-3.5 w-3.5" />Done</span>}</div>
          <div className="mt-auto pt-10"><p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-900">Recommended today · {task.minutes} min</p><h2 className="mt-2 font-display text-2xl font-medium leading-snug text-ink-900">{task.title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-600">One practical activity chosen for today. Short enough to start now.</p><button onClick={() => onNavigate('tasks')} className="btn-primary mt-6 w-full">{taskDone ? 'Review activity' : 'Start activity'}<ArrowRightIcon className="h-4 w-4" /></button></div>
        </aside>
      </div>

      <section className="mt-5 card-soft p-5 sm:p-6" aria-labelledby="week-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="sm:w-44"><p className="text-xs font-medium uppercase tracking-[0.16em] text-dusk-700">This week</p><h2 id="week-heading" className="mt-1 font-display text-xl text-ink-900">Your rhythm</h2><p className="mt-1 text-xs text-ink-600">{weekLogged} of 7 days checked in</p></div>
          <div className="grid flex-1 grid-cols-7 gap-2">
            {week.map(day => <div key={day.key} className="text-center"><span className="mb-2 block text-[10px] uppercase text-ink-600">{day.date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</span><span className="mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-soft border border-line-200" style={{ backgroundColor: day.mood ? `${MOOD_COLORS[day.mood.level - 1]}24` : '#F1F5F2' }} title={day.mood ? MOOD_LABELS[day.mood.level - 1] : 'No check-in'}>{day.mood ? <MoodFace level={day.mood.level} size={28} /> : <span className="h-1.5 w-1.5 rounded-full bg-line-200" />}</span></div>)}
          </div>
          <div className="flex gap-5 border-t border-line-200 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><div><p className="font-display text-2xl text-ink-900">{assessments.length}</p><p className="text-xs text-ink-600">assessments</p></div><div><p className="font-display text-2xl text-ink-900">{allMoods.length}</p><p className="text-xs text-ink-600">total check-ins</p></div></div>
        </div>
      </section>

      <section className="mt-11" aria-labelledby="support-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Support, your way</p><h2 id="support-heading" className="mt-1 font-display text-3xl font-medium text-ink-900">What would help right now?</h2></div><button onClick={() => onNavigate('tasks')} className="btn-ghost self-start text-sm sm:self-auto">View all daily tools<ArrowRightIcon className="h-4 w-4" /></button></div>

        <button onClick={() => onNavigate('chat')} className="group card-organic relative mt-6 flex w-full overflow-hidden bg-gradient-to-r from-sage-50 via-surface to-dusk-50 p-6 text-left transition-all hover:shadow-soft-lg sm:items-center sm:p-7">
          <span className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-dusk-100 blur-3xl" aria-hidden="true" />
          <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-organic bg-sage-500 text-white shadow-soft"><ChatIcon className="h-6 w-6" /></span>
          <span className="relative ml-5 flex-1"><span className="text-xs font-medium uppercase tracking-wider text-sage-700">AI companion · Available now</span><span className="mt-1 block font-display text-2xl text-ink-900">Talk to helloMind</span><span className="mt-1 block text-sm text-ink-600">Put what is on your mind into words and work through it one step at a time.</span></span>
          <span className="relative ml-4 hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface text-sage-700 shadow-sm transition-transform group-hover:translate-x-1 sm:flex"><ArrowRightIcon className="h-5 w-5" /></span>
        </button>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ActionCard title="Anonymous peer chat" copy="Connect one-to-one with another student without sharing your identity." meta="Live peer support" icon={AnonIcon} tone="dusk" onClick={() => onNavigate('peer')} />
          <ActionCard title="Take a check-in" copy="Reflect on the last two weeks and receive a clear, private summary." meta="About 2 minutes" icon={ClipboardIcon} tone="sage" onClick={() => onNavigate('assessment')} />
          <ActionCard title="Visit the community" copy="Share encouragement and read experiences from students across the community." meta="Shared student space" icon={CommunityIcon} tone="honey" onClick={() => onNavigate('community')} />
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-5 rounded-organic border border-coral-100 bg-gradient-to-r from-coral-100/40 to-surface p-6 sm:flex-row sm:items-center sm:p-7">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface text-coral-500 shadow-sm"><LifelineIcon className="h-5 w-5" /></span>
        <div className="flex-1"><h2 className="font-display text-xl text-ink-900">Need support from a real person?</h2><p className="mt-1 text-sm leading-relaxed text-ink-600">Free and confidential support options are always available. If you may be in immediate danger, contact local emergency services now.</p></div>
        <button onClick={() => onNavigate('resources')} className="btn-primary whitespace-nowrap">View support options<ArrowRightIcon className="h-4 w-4" /></button>
      </section>

      <p className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-ink-600"><SparkIcon className="h-3.5 w-3.5 text-dusk-500" />Your check-ins and activity stay private on this device.</p>
    </main>
  );
};

export default Dashboard;
