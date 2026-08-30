import React, { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dateKey, getAssessmentHistory, getMoods, getPersonalityHistory, getStreak } from '../services/storageService';
import type { AssessmentResult, MoodEntry } from '../types';
import { MOOD_COLORS, MOOD_LABELS, MoodFace } from './design';
import { CheckIcon, ClipboardIcon, LeafIcon, LockIcon, LogoutIcon } from './icons';

const DAY = 86_400_000;
const formatDate = (timestamp: number, short = false) => new Date(timestamp).toLocaleDateString(undefined, short
  ? { day: 'numeric', month: 'short' }
  : { day: 'numeric', month: 'short', year: 'numeric' });
const assessmentPercent = (item: AssessmentResult) => item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const ChartEmpty: React.FC<{ title: string; copy: string }> = ({ title, copy }) => (
  <div className="flex min-h-48 flex-col items-center justify-center rounded-soft border border-dashed border-line-200 bg-sage-50/60 px-6 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-sage-700 shadow-soft"><LeafIcon className="h-5 w-5" /></span>
    <p className="mt-3 font-medium text-ink-900">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-ink-600">{copy}</p>
  </div>
);

const KpiCard: React.FC<{
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: string;
  trend?: number | null;
}> = ({ label, value, detail, icon, tone, trend }) => (
  <article className="card-soft relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg">
    <div className="flex items-start justify-between gap-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-soft ${tone}`}>{icon}</span>
      {trend !== undefined && trend !== null && (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${trend > 0 ? 'bg-sage-100 text-sage-700' : trend < 0 ? 'bg-coral-100 text-coral-500' : 'bg-dusk-100 text-dusk-700'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}
        </span>
      )}
    </div>
    <p className="mt-5 text-xs font-medium uppercase tracking-wider text-ink-600">{label}</p>
    <p className="mt-1 font-display text-3xl font-medium text-ink-900">{value}</p>
    <p className="mt-1 text-xs text-ink-600">{detail}</p>
  </article>
);

const MoodTrend: React.FC<{ moods: MoodEntry[] }> = ({ moods }) => {
  const width = 720;
  const height = 250;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 38;
  const x = (index: number) => left + (index * (width - left - right)) / Math.max(1, moods.length - 1);
  const y = (level: number) => top + ((5 - level) / 4) * (height - top - bottom);
  const points = moods.map((mood, index) => `${x(index)},${y(mood.level)}`).join(' ');
  const area = `${left},${height - bottom} ${points} ${x(moods.length - 1)},${height - bottom}`;
  const labelIndexes = [...new Set([0, Math.floor((moods.length - 1) / 2), moods.length - 1])];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[560px]" role="img" aria-label="Mood score trend">
        <defs>
          <linearGradient id="mood-line-gradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8C7FA3" /><stop offset="100%" stopColor="#6E8F7C" /></linearGradient>
          <linearGradient id="mood-area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6E8F7C" stopOpacity="0.28" /><stop offset="100%" stopColor="#6E8F7C" stopOpacity="0.01" /></linearGradient>
        </defs>
        {[1, 2, 3, 4, 5].map(level => <g key={level}><line x1={left} x2={width - right} y1={y(level)} y2={y(level)} stroke="#E4E0D6" strokeDasharray="4 6" /><text x={left - 14} y={y(level) + 4} textAnchor="middle" fill="#5B6660" fontSize="11">{level}</text></g>)}
        <polygon points={area} fill="url(#mood-area-gradient)" />
        <polyline points={points} fill="none" stroke="url(#mood-line-gradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {moods.map((mood, index) => <g key={mood.date}><circle cx={x(index)} cy={y(mood.level)} r="7" fill="white" /><circle cx={x(index)} cy={y(mood.level)} r="4.5" fill={MOOD_COLORS[mood.level - 1]}><title>{`${formatDate(mood.ts)}: ${MOOD_LABELS[mood.level - 1]}`}</title></circle></g>)}
        {labelIndexes.map(index => <text key={index} x={x(index)} y={height - 10} textAnchor={index === 0 ? 'start' : index === moods.length - 1 ? 'end' : 'middle'} fill="#5B6660" fontSize="11">{formatDate(moods[index].ts, true)}</text>)}
      </svg>
    </div>
  );
};

const MoodDistribution: React.FC<{ moods: MoodEntry[] }> = ({ moods }) => {
  const counts = MOOD_LABELS.map((_, index) => moods.filter(mood => mood.level === index + 1).length);
  const total = moods.length;
  let cursor = 0;
  const stops = counts.map((count, index) => {
    const start = cursor;
    cursor += total ? (count / total) * 100 : 0;
    return `${MOOD_COLORS[index]} ${start}% ${cursor}%`;
  }).join(', ');
  const mostCommon = total ? counts.indexOf(Math.max(...counts)) : -1;

  return (
    <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-36 w-36 flex-shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label="Mood distribution donut chart">
        <span className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-surface shadow-sm"><strong className="font-display text-2xl font-medium text-ink-900">{total}</strong><span className="text-[10px] uppercase tracking-wider text-ink-600">entries</span></span>
      </div>
      <div className="w-full space-y-2.5">
        {MOOD_LABELS.map((label, index) => <div key={label} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MOOD_COLORS[index] }} /><span className="flex-1 text-ink-600">{label}</span><span className="font-medium tabular-nums text-ink-900">{total ? Math.round((counts[index] / total) * 100) : 0}%</span></div>)}
        {mostCommon >= 0 && <p className="border-t border-line-200 pt-3 text-xs text-ink-600">Most logged: <span className="font-medium text-ink-900">{MOOD_LABELS[mostCommon]}</span></p>}
      </div>
    </div>
  );
};

const ActivityHeatmap: React.FC<{ moods: MoodEntry[] }> = ({ moods }) => {
  const moodByDate = new Map(moods.map(mood => [mood.date, mood]));
  const days = Array.from({ length: 28 }, (_, index) => {
    const timestamp = Date.now() - (27 - index) * DAY;
    return { timestamp, key: dateKey(timestamp), mood: moodByDate.get(dateKey(timestamp)) };
  });
  return (
    <div>
      <div className="mt-5 grid grid-cols-7 gap-2" role="img" aria-label="Mood check-in activity for the last 28 days">
        {days.map(day => <span key={day.key} className="aspect-square rounded-md border border-line-200 transition-transform hover:scale-110" style={{ backgroundColor: day.mood ? MOOD_COLORS[day.mood.level - 1] : '#F1F5F2', opacity: day.mood ? 0.9 : 1 }} title={`${formatDate(day.timestamp)}${day.mood ? `: ${MOOD_LABELS[day.mood.level - 1]}` : ': no mood check-in'}`} />)}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-ink-600"><span>4 weeks ago</span><span>Today</span></div>
    </div>
  );
};

const AssessmentChart: React.FC<{ assessments: AssessmentResult[] }> = ({ assessments }) => {
  const items = assessments.slice(0, 7).reverse();
  return (
    <div className="mt-6">
      <div className="flex h-52 items-end gap-3 border-b border-line-200 px-1 sm:gap-5">
        {items.map((item, index) => {
          const value = assessmentPercent(item);
          return <div key={`${item.ts}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="mb-2 text-xs font-medium tabular-nums text-ink-600 opacity-0 transition-opacity group-hover:opacity-100">{value}%</span><div className="relative mx-auto w-full max-w-10 overflow-hidden rounded-t-lg bg-sage-100" style={{ height: `${Math.max(10, value)}%` }}><span className="absolute inset-0 bg-gradient-to-t from-sage-500 to-dusk-500" /></div><span className="mt-2 truncate text-[10px] text-ink-600">{formatDate(item.ts, true)}</span></div>;
        })}
      </div>
      <p className="mt-3 text-xs text-ink-600">Each bar shows the assessment score as a percentage of its maximum. It is a reflection signal, not a diagnosis.</p>
    </div>
  );
};

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const moods = useMemo(() => user ? getMoods(user.id) : [], [user?.id]);
  const assessments = useMemo(() => user ? getAssessmentHistory(user.id) : [], [user?.id]);
  const personality = useMemo(() => user ? getPersonalityHistory(user.id) : [], [user?.id]);
  const streak = useMemo(() => user ? getStreak(user.id) : 0, [user?.id]);
  const [range, setRange] = useState<14 | 30>(14);
  const [downloaded, setDownloaded] = useState(false);

  if (!user) return null;

  const now = Date.now();
  const rangeMoods = moods.filter(mood => mood.ts >= now - range * DAY).reverse();
  const currentPeriod = moods.filter(mood => mood.ts >= now - 7 * DAY).map(mood => mood.level);
  const previousPeriod = moods.filter(mood => mood.ts < now - 7 * DAY && mood.ts >= now - 14 * DAY).map(mood => mood.level);
  const currentAverage = average(currentPeriod);
  const previousAverage = average(previousPeriod);
  const moodTrend = currentAverage !== null && previousAverage !== null ? currentAverage - previousAverage : null;
  const activeDays = new Set(moods.filter(mood => mood.ts >= now - 30 * DAY).map(mood => mood.date)).size;
  const assessmentAverage = average(assessments.map(assessmentPercent));
  const latestPersonality = personality[0];

  const downloadSummary = () => {
    const summary = {
      title: 'My helloMind wellness summary', generatedAt: new Date().toISOString(),
      profile: { name: user.username, streakDays: streak, activeDaysLast30: activeDays },
      moodAnalytics: { averageLast7Days: currentAverage, entries: moods.map(mood => ({ date: mood.date, level: mood.level, label: MOOD_LABELS[mood.level - 1] })) },
      assessments: assessments.map(item => ({ date: new Date(item.ts).toISOString(), reflection: item.band, percent: assessmentPercent(item), skipped: item.skipped })),
      latestPersonality: latestPersonality ? { date: new Date(latestPersonality.ts).toISOString(), traits: latestPersonality.traits, responseConfidence: latestPersonality.responseConfidence } : null,
      note: 'This personal reflection is not a diagnosis or a substitute for professional care.',
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hellomind-summary-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="card-organic relative overflow-hidden bg-gradient-to-br from-surface via-sage-50 to-dusk-50 p-6 text-ink-900 sm:p-8">
        <span className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-dusk-500/25 blur-3xl" aria-hidden="true" />
        <span className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-honey-500/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-organic bg-surface font-display text-2xl font-medium text-ink-900 shadow-soft">{user.username.charAt(0).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sage-100 px-2.5 py-1 text-xs font-medium text-ink-900">Personal analytics</span>{user.isGuest && <span className="rounded-full bg-honey-100 px-2.5 py-1 text-xs font-medium text-ink-900">Guest</span>}</div><h1 className="mt-2 truncate font-display text-3xl font-medium text-ink-900 sm:text-4xl">{user.username}'s profile</h1><p className="mt-1 text-sm text-ink-600">Progress and patterns from your private activity.</p></div>
          <div className="flex gap-2"><button onClick={downloadSummary} className="inline-flex items-center gap-2 rounded-soft border border-line-200 bg-surface px-4 py-2.5 text-sm font-medium text-ink-900 shadow-sm transition-colors hover:bg-sage-50">{downloaded ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}{downloaded ? 'Downloaded' : 'Export'}</button><button onClick={logout} className="inline-flex h-10 w-10 items-center justify-center rounded-soft border border-line-200 bg-surface text-ink-900 shadow-sm transition-colors hover:bg-sage-50" aria-label="Sign out"><LogoutIcon className="h-4 w-4" /></button></div>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key profile metrics">
        <KpiCard label="Current streak" value={`${streak} day${streak === 1 ? '' : 's'}`} detail="Mood or daily activity" icon={<LeafIcon className="h-5 w-5" />} tone="bg-honey-100 text-honey-500" />
        <KpiCard label="7-day mood" value={currentAverage === null ? '—' : `${currentAverage.toFixed(1)} / 5`} detail="Compared with prior week" trend={moodTrend} icon={<MoodFace level={Math.round(currentAverage ?? 3)} size={27} />} tone="bg-sage-100 text-sage-700" />
        <KpiCard label="Active days" value={`${activeDays} / 30`} detail="Mood check-ins this month" icon={<CheckIcon className="h-5 w-5" />} tone="bg-dusk-100 text-dusk-700" />
        <KpiCard label="Assessment avg." value={assessmentAverage === null ? '—' : `${Math.round(assessmentAverage)}%`} detail={`${assessments.length} completed check-in${assessments.length === 1 ? '' : 's'}`} icon={<ClipboardIcon className="h-5 w-5" />} tone="bg-coral-100 text-coral-500" />
      </section>

      <section className="mt-5 card-organic p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Mood analytics</p><h2 className="mt-1 font-display text-2xl text-ink-900">Mood trend</h2><p className="mt-1 text-sm text-ink-600">Your logged mood scores over time.</p></div><div className="inline-flex self-start rounded-soft bg-sage-50 p-1" aria-label="Chart date range">{([14, 30] as const).map(days => <button key={days} onClick={() => setRange(days)} className={`rounded-[12px] px-3 py-1.5 text-xs font-medium transition-colors ${range === days ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'}`}>{days} days</button>)}</div></div>
        <div className="mt-5">{rangeMoods.length >= 2 ? <MoodTrend moods={rangeMoods} /> : <ChartEmpty title="Not enough data for a trend yet" copy="Log your mood on at least two different days to unlock this graph." />}</div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card-organic p-5 sm:p-7"><p className="text-xs font-medium uppercase tracking-[0.16em] text-dusk-700">Composition</p><h2 className="mt-1 font-display text-2xl text-ink-900">Mood distribution</h2><p className="mt-1 text-sm text-ink-600">How your last {range} days are distributed.</p>{rangeMoods.length ? <MoodDistribution moods={rangeMoods} /> : <div className="mt-5"><ChartEmpty title="No mood entries in this period" copy="Your distribution will appear after a mood check-in." /></div>}</section>
        <section className="card-organic p-5 sm:p-7"><p className="text-xs font-medium uppercase tracking-[0.16em] text-sage-700">Consistency</p><h2 className="mt-1 font-display text-2xl text-ink-900">28-day activity</h2><p className="mt-1 text-sm text-ink-600">Each colored square is a mood check-in.</p><ActivityHeatmap moods={moods} /><div className="mt-5 flex flex-wrap gap-3 border-t border-line-200 pt-4">{MOOD_LABELS.map((label, index) => <span key={label} className="inline-flex items-center gap-1.5 text-[10px] text-ink-600"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: MOOD_COLORS[index] }} />{label}</span>)}</div></section>
      </div>

      <div className="mt-5">
        <section className="card-organic p-5 sm:p-7"><p className="text-xs font-medium uppercase tracking-[0.16em] text-coral-500">Check-ins</p><div className="flex items-end justify-between gap-3"><div><h2 className="mt-1 font-display text-2xl text-ink-900">Assessment history</h2><p className="mt-1 text-sm text-ink-600">Your latest seven results.</p></div><span className="font-display text-2xl text-ink-900">{assessments.length}</span></div>{assessments.length ? <AssessmentChart assessments={assessments} /> : <div className="mt-5"><ChartEmpty title="No assessment history yet" copy="Complete a check-in to begin tracking reflection scores." /></div>}</section>
      </div>

      <section className="mt-5 flex flex-col gap-4 rounded-organic border border-line-200 bg-sage-50 p-5 sm:flex-row sm:items-center sm:p-6"><span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-sage-700"><LockIcon className="h-5 w-5" /></span><div className="flex-1"><h2 className="font-medium text-ink-900">Private analytics</h2><p className="mt-0.5 text-sm text-ink-600">This dashboard is built from data saved on your device. Nothing is automatically shared with a counsellor.</p></div><button onClick={downloadSummary} className="btn-secondary whitespace-nowrap">{downloaded ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}{downloaded ? 'Downloaded' : 'Download data'}</button></section>
    </main>
  );
};

export default Profile;
