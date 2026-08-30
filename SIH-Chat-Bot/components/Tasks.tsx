import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DailyTask as Task, TaskNeed } from '../content';
import { DAILY_TASKS } from '../content';
import type { DailyFocusPlan, TaskReflection } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  completeTask,
  getDailyFocusPlan,
  getStreak,
  getTaskReflection,
  isTaskDoneToday,
  saveDailyFocusPlan,
  saveTaskReflection,
} from '../services/storageService';
import { BreathingCircle, SectionHeading } from './design';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookIcon,
  CheckIcon,
  CloseIcon,
  LeafIcon,
  PlayIcon,
  SparkIcon,
  WindIcon,
} from './icons';

const KIND_META: Record<Task['kind'], { icon: React.FC<{ className?: string }>; label: string; tone: string }> = {
  breathe: { icon: WindIcon, label: 'Guided breathing', tone: 'bg-sage-100 text-sage-700' },
  lesson: { icon: BookIcon, label: 'Micro-course', tone: 'bg-dusk-100 text-dusk-700' },
  tip: { icon: LeafIcon, label: 'Small practice', tone: 'bg-honey-100 text-honey-500' },
};

const NEED_META: Record<TaskNeed, { label: string; prompt: string }> = {
  calm: { label: 'Calm my body', prompt: 'When your body needs a softer signal' },
  focus: { label: 'Help me focus', prompt: 'When starting feels harder than doing' },
  rest: { label: 'Rest better', prompt: 'When your mind needs a gentler landing' },
  learn: { label: 'Understand myself', prompt: 'When knowing why would help' },
};

interface BreathPattern {
  phases: { label: string; secs: number; scale: number }[];
  cycles: number;
}

const BREATH_PATTERNS: Record<string, BreathPattern> = {
  't-breathe-478': {
    phases: [
      { label: 'Breathe in', secs: 4, scale: 1.12 },
      { label: 'Hold gently', secs: 7, scale: 1.12 },
      { label: 'Breathe out slowly', secs: 8, scale: 0.88 },
    ],
    cycles: 3,
  },
  't-breathe-box': {
    phases: [
      { label: 'Breathe in', secs: 4, scale: 1.12 },
      { label: 'Hold', secs: 4, scale: 1.12 },
      { label: 'Breathe out', secs: 4, scale: 0.88 },
      { label: 'Hold', secs: 4, scale: 0.88 },
    ],
    cycles: 4,
  },
};

const BreathingExercise: React.FC<{ task: Task; onComplete: () => void }> = ({ task, onComplete }) => {
  const pattern = BREATH_PATTERNS[task.id];
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(pattern.phases[0].secs);
  const [cycle, setCycle] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setSecondsLeft(seconds => {
        if (seconds > 1) return seconds - 1;
        const nextPhase = (phaseIndex + 1) % pattern.phases.length;
        if (nextPhase === 0 && cycle >= pattern.cycles) {
          setRunning(false);
          onComplete();
          return 0;
        }
        if (nextPhase === 0) setCycle(value => value + 1);
        setPhaseIndex(nextPhase);
        return pattern.phases[nextPhase].secs;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [running, phaseIndex, cycle, pattern, onComplete]);

  const reset = () => {
    setRunning(false);
    setPhaseIndex(0);
    setSecondsLeft(pattern.phases[0].secs);
    setCycle(1);
  };

  const phase = pattern.phases[phaseIndex];
  const secondsPerCycle = pattern.phases.reduce((sum, item) => sum + item.secs, 0);
  const previousPhaseSeconds = pattern.phases.slice(0, phaseIndex).reduce((sum, item) => sum + item.secs, 0);
  const elapsed = (cycle - 1) * secondsPerCycle + previousPhaseSeconds + (phase.secs - secondsLeft);
  const progress = Math.min(100, (elapsed / (secondsPerCycle * pattern.cycles)) * 100);

  return (
    <div className="text-center py-4">
      <div className="h-2 rounded-full bg-sage-100 overflow-hidden mb-7" aria-label={`${Math.round(progress)}% complete`}>
        <span className="block h-full bg-gradient-to-r from-sage-500 to-dusk-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <BreathingCircle size={180} tone={running ? 'sage' : 'mist'} className="absolute transition-transform duration-1000 ease-in-out" />
          <div className="relative z-10 text-center transition-transform duration-1000" style={{ transform: `scale(${running ? phase.scale : 1})` }}>
            <p className="font-display text-xl text-ink-900">{running ? phase.label : 'Ready?'}</p>
            <p className="text-3xl font-display text-sage-700 mt-1">{running ? secondsLeft : '—'}</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-ink-600">Round {cycle} of {pattern.cycles} · stop if you feel uncomfortable</p>
      <div className="flex justify-center gap-2 mt-5">
        <button onClick={() => setRunning(value => !value)} className="btn-primary py-2.5 px-5">
          <PlayIcon className="w-4 h-4" />{running ? 'Pause' : progress > 0 ? 'Continue' : 'Begin'}
        </button>
        {progress > 0 && <button onClick={reset} className="btn-ghost py-2.5 px-4">Restart</button>}
      </div>
    </div>
  );
};

const CompletionReflection: React.FC<{
  selected?: TaskReflection['rating'];
  onSelect: (rating: TaskReflection['rating']) => void;
}> = ({ selected, onSelect }) => (
  <div className="mt-6 pt-5 border-t border-line-200">
    <p className="text-sm font-medium text-ink-900 text-center">How did this land?</p>
    <div className="grid grid-cols-3 gap-2 mt-3">
      {([
        ['helped', 'A little lighter'],
        ['same', 'About the same'],
        ['hard', 'Still difficult'],
      ] as const).map(([value, label]) => (
        <button key={value} onClick={() => onSelect(value)} className={`rounded-soft border px-2 py-2.5 text-xs transition-colors ${selected === value ? 'bg-sage-100 border-sage-500 text-sage-700 font-medium' : 'bg-surface border-line-200 text-ink-600 hover:border-sage-500'}`}>
          {label}
        </button>
      ))}
    </div>
    {selected === 'hard' && <p className="text-xs text-ink-600 text-center mt-3">That is useful information too. You do not have to force this tool to fit.</p>}
  </div>
);

const TaskDetail: React.FC<{
  task: Task;
  doneToday: boolean;
  reflection?: TaskReflection['rating'];
  onBack: () => void;
  onDone: () => void;
  onReflect: (rating: TaskReflection['rating']) => void;
}> = ({ task, doneToday, reflection, onBack, onDone, onReflect }) => {
  const [completed, setCompleted] = useState(doneToday);
  const [checked, setChecked] = useState<number[]>([]);
  const meta = KIND_META[task.kind];
  const itemCount = task.kind === 'lesson' ? task.paragraphs?.length ?? 0 : task.steps?.length ?? 0;
  const allChecked = itemCount > 0 && checked.length === itemCount;

  const finish = () => {
    onDone();
    setCompleted(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={onBack} className="btn-ghost px-2 py-1 mb-4 -ml-2 text-sm"><ArrowLeftIcon className="w-4 h-4" />Back to daily tools</button>
      <div className="card-organic p-6 sm:p-8 animate-rise overflow-hidden relative">
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-sage-50" aria-hidden="true" />
        <div className="relative">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${meta.tone}`}><meta.icon className="w-3.5 h-3.5" />{meta.label} · {task.minutes} min</span>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink-900 mt-4 leading-tight">{task.title}</h1>
          <p className="text-ink-600 mt-2 max-w-proseletter">{task.summary}</p>

          <div className="my-7">
            {completed ? (
              <div className="text-center py-5 animate-rise">
                <span className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-sage-100 text-sage-700"><CheckIcon className="w-8 h-8" /></span>
                <p className="font-display text-xl text-ink-900 mt-4">Complete for today</p>
                <p className="text-sm text-ink-600 mt-2 max-w-sm mx-auto">{task.takeaway}</p>
                {task.kind === 'breathe' && <button onClick={() => setCompleted(false)} className="btn-ghost mt-4 text-sm">Do another round</button>}
                <CompletionReflection selected={reflection} onSelect={onReflect} />
              </div>
            ) : task.kind === 'breathe' ? (
              <BreathingExercise task={task} onComplete={finish} />
            ) : task.kind === 'lesson' ? (
              <div className="space-y-3">
                {task.paragraphs?.map((paragraph, index) => {
                  const read = checked.includes(index);
                  return (
                    <button key={index} onClick={() => setChecked(previous => read ? previous.filter(item => item !== index) : [...previous, index])} className={`w-full text-left rounded-soft border p-4 sm:p-5 transition-colors ${read ? 'bg-sage-50 border-sage-200' : 'bg-surface border-line-200 hover:border-sage-500'}`}>
                      <div className="flex gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${read ? 'bg-sage-500 text-white' : 'bg-canvas border border-line-200 text-ink-600'}`}>{read ? <CheckIcon className="w-4 h-4" /> : index + 1}</span>
                        <p className="text-ink-900 leading-relaxed">{paragraph}</p>
                      </div>
                    </button>
                  );
                })}
                <p className="text-xs text-ink-600 text-center">Tap each section after reading it · {checked.length} of {itemCount}</p>
              </div>
            ) : (
              <ol className="space-y-3">
                {task.steps?.map((step, index) => {
                  const done = checked.includes(index);
                  return (
                    <li key={index}>
                      <button onClick={() => setChecked(previous => done ? previous.filter(item => item !== index) : [...previous, index])} className={`w-full flex items-start gap-3 text-left rounded-soft border p-4 transition-all ${done ? 'bg-sage-50 border-sage-200 text-ink-600' : 'bg-surface border-line-200 text-ink-900 hover:border-sage-500'}`}>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${done ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-700'}`}>{done ? <CheckIcon className="w-4 h-4" /> : index + 1}</span>
                        <span className={done ? 'line-through decoration-sage-500/50' : ''}>{step}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {task.kind !== 'breathe' && !completed && (
            <button onClick={finish} disabled={!allChecked} className="btn-primary w-full"><CheckIcon className="w-5 h-5" />{allChecked ? 'Complete for today' : `Finish ${itemCount - checked.length} more ${itemCount - checked.length === 1 ? 'step' : 'steps'}`}</button>
          )}
          {task.takeaway && !completed && task.kind !== 'breathe' && <p className="text-xs text-ink-600 text-center mt-3">{task.takeaway}</p>}
        </div>
      </div>
    </div>
  );
};

const FocusSprint: React.FC = () => {
  const [minutes, setMinutes] = useState(5);
  const [remaining, setRemaining] = useState(5 * 60);
  const [intention, setIntention] = useState('');
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + remaining * 1000;
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) { setRunning(false); setFinished(true); clearInterval(interval); }
    }, 250);
    return () => clearInterval(interval);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectMinutes = (value: number) => { setMinutes(value); setRemaining(value * 60); setRunning(false); setFinished(false); };
  const reset = () => { setRemaining(minutes * 60); setRunning(false); setFinished(false); };
  const progress = 1 - remaining / (minutes * 60);
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="text-center">
      <p className="text-sm text-ink-600">Choose one thing. Until the bell, everything else can wait.</p>
      <input value={intention} onChange={event => setIntention(event.target.value.slice(0, 100))} disabled={running} className="input-calm mt-4 text-center" placeholder="What is the one thing?" />
      <div className="flex justify-center gap-2 mt-4">
        {[5, 15, 25].map(value => <button key={value} onClick={() => selectMinutes(value)} disabled={running} className={`chip py-1.5 ${minutes === value ? 'bg-dusk-100 border-dusk-500 text-dusk-700' : ''}`}>{value} min</button>)}
      </div>
      <div className="relative w-40 h-40 mx-auto mt-5 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#EAE6F1" strokeWidth="7" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#8C7FA3" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} className="transition-all duration-500" />
        </svg>
        <div className="relative"><p className="font-display text-3xl text-ink-900">{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</p><p className="text-xs text-ink-600 mt-1">{finished ? 'You showed up' : running ? intention : 'focus sprint'}</p></div>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {!finished && <button onClick={() => setRunning(value => !value)} disabled={!intention.trim()} className="btn-primary py-2.5"><PlayIcon className="w-4 h-4" />{running ? 'Pause' : remaining < minutes * 60 ? 'Continue' : 'Start'}</button>}
        {(remaining < minutes * 60 || finished) && <button onClick={reset} className="btn-ghost py-2.5">Reset</button>}
      </div>
    </div>
  );
};

const GROUNDING_STEPS = [
  { count: 5, sense: 'see', prompt: 'Look slowly. Name five things you can see.' },
  { count: 4, sense: 'feel', prompt: 'Notice four things you can physically feel.' },
  { count: 3, sense: 'hear', prompt: 'Listen for three sounds, including quiet ones.' },
  { count: 2, sense: 'smell', prompt: 'Notice two scents—or remember two familiar ones.' },
  { count: 1, sense: 'taste', prompt: 'Notice one taste, or imagine a familiar one.' },
];

const GroundingTool: React.FC = () => {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const done = step >= GROUNDING_STEPS.length;
  const current = GROUNDING_STEPS[Math.min(step, GROUNDING_STEPS.length - 1)];

  const add = () => {
    const value = input.trim();
    if (!value || done) return;
    const next = [...items, value];
    setItems(next);
    setInput('');
    if (next.length >= current.count) { setItems([]); setTimeout(() => setStep(value => value + 1), 180); }
  };

  if (done) return (
    <div className="text-center py-5"><span className="inline-flex w-16 h-16 rounded-full bg-sage-100 text-sage-700 items-center justify-center"><CheckIcon className="w-8 h-8" /></span><h3 className="font-display text-xl text-ink-900 mt-4">You are here, in this moment</h3><p className="text-sm text-ink-600 mt-2">Notice whether anything shifted—even one percent counts.</p><button onClick={() => { setStep(0); setItems([]); }} className="btn-ghost mt-4">Start again</button></div>
  );

  return (
    <div>
      <div className="flex gap-1.5 mb-5">{GROUNDING_STEPS.map((item, index) => <span key={item.sense} className={`h-2 flex-1 rounded-full ${index < step ? 'bg-sage-500' : index === step ? 'bg-dusk-500' : 'bg-dusk-100'}`} />)}</div>
      <p className="text-xs uppercase tracking-wide text-dusk-700 font-semibold">Step {step + 1} of 5 · {current.sense}</p>
      <h3 className="font-display text-xl text-ink-900 mt-2">{current.prompt}</h3>
      <p className="text-sm text-ink-600 mt-2">Nothing needs to be special. Ordinary details work.</p>
      <form onSubmit={event => { event.preventDefault(); add(); }} className="flex gap-2 mt-5">
        <input value={input} onChange={event => setInput(event.target.value.slice(0, 80))} className="input-calm" placeholder={`Something you can ${current.sense}…`} autoFocus />
        <button type="submit" disabled={!input.trim()} className="btn-primary px-4">Add</button>
      </form>
      <div className="flex flex-wrap gap-2 mt-3 min-h-8">{items.map((item, index) => <span key={`${item}-${index}`} className="chip bg-sage-50 text-xs py-1.5"><CheckIcon className="w-3 h-3" />{item}</span>)}</div>
      <p className="text-xs text-ink-600 mt-3">{items.length} of {current.count} noticed</p>
    </div>
  );
};

const NextStepPlanner: React.FC<{ userId: string }> = ({ userId }) => {
  const [plan, setPlan] = useState<DailyFocusPlan | null>(() => getDailyFocusPlan(userId));
  const [task, setTask] = useState(plan?.task ?? '');
  const [nextStep, setNextStep] = useState(plan?.nextStep ?? '');

  const save = () => setPlan(saveDailyFocusPlan(userId, { task: task.trim(), nextStep: nextStep.trim(), done: false }));
  const toggleDone = () => { if (plan) setPlan(saveDailyFocusPlan(userId, { task: plan.task, nextStep: plan.nextStep, done: !plan.done })); };

  if (plan) return (
    <div className="text-center">
      <span className={`inline-flex w-14 h-14 rounded-full items-center justify-center ${plan.done ? 'bg-sage-500 text-white' : 'bg-honey-100 text-honey-500'}`}>{plan.done ? <CheckIcon className="w-7 h-7" /> : <LeafIcon className="w-7 h-7" />}</span>
      <p className="text-xs text-ink-600 mt-4">The bigger thing</p><h3 className="font-display text-xl text-ink-900">{plan.task}</h3>
      <div className="rounded-soft bg-sage-50 border border-sage-200 p-4 mt-4 text-left"><p className="text-xs text-sage-700 font-medium">Only the next visible step</p><p className={`text-ink-900 mt-1 ${plan.done ? 'line-through text-ink-600' : ''}`}>{plan.nextStep}</p></div>
      <div className="flex justify-center gap-2 mt-5"><button onClick={toggleDone} className="btn-primary py-2.5">{plan.done ? 'Undo' : 'I did the next step'}</button><button onClick={() => setPlan(null)} className="btn-ghost py-2.5">Edit</button></div>
    </div>
  );

  return (
    <div><p className="text-sm text-ink-600">Turn an overwhelming task into one action you can physically see yourself doing.</p><label className="label-calm mt-4">What feels too big?</label><input value={task} onChange={event => setTask(event.target.value.slice(0, 120))} className="input-calm" placeholder="Prepare for the economics exam" /><label className="label-calm mt-4">What is the smallest visible next step?</label><input value={nextStep} onChange={event => setNextStep(event.target.value.slice(0, 120))} className="input-calm" placeholder="Open chapter 3 and write the first heading" /><button onClick={save} disabled={!task.trim() || !nextStep.trim()} className="btn-primary w-full mt-5">Save today’s next step</button></div>
  );
};

type ToolName = 'focus' | 'ground' | 'plan';

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskNeed | 'all'>('all');
  const [activeTool, setActiveTool] = useState<ToolName | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>(() => user ? DAILY_TASKS.filter(task => isTaskDoneToday(user.id, task.id)).map(task => task.id) : []);
  const [reflections, setReflections] = useState<Record<string, TaskReflection['rating']>>(() => {
    if (!user) return {};
    return Object.fromEntries(DAILY_TASKS.map(task => [task.id, getTaskReflection(user.id, task.id)?.rating]).filter(([, rating]) => rating));
  });
  const recommended = useMemo(() => DAILY_TASKS[Math.floor(Date.now() / 86400000) % DAILY_TASKS.length], []);
  const visibleTasks = filter === 'all' ? DAILY_TASKS : DAILY_TASKS.filter(task => task.need === filter);
  const streak = user ? getStreak(user.id) : 0;

  if (!user) return null;

  const complete = (taskId: string) => {
    if (doneIds.includes(taskId)) return;
    completeTask(user.id, taskId);
    setDoneIds(previous => [...previous, taskId]);
  };

  const reflect = (taskId: string, rating: TaskReflection['rating']) => {
    saveTaskReflection(user.id, taskId, rating);
    setReflections(previous => ({ ...previous, [taskId]: rating }));
  };

  if (selected) return <TaskDetail task={selected} doneToday={doneIds.includes(selected.id)} reflection={reflections[selected.id]} onBack={() => setSelected(null)} onDone={() => complete(selected.id)} onReflect={rating => reflect(selected.id, rating)} />;

  const tools: { id: ToolName; title: string; sub: string; icon: React.FC<{ className?: string }>; tone: string }[] = [
    { id: 'focus', title: 'Focus sprint', sub: 'A distraction-light 5, 15, or 25 minute timer', icon: PlayIcon, tone: 'bg-dusk-100 text-dusk-700' },
    { id: 'ground', title: '5-4-3-2-1 reset', sub: 'Use your senses to return attention to the present', icon: WindIcon, tone: 'bg-sage-100 text-sage-700' },
    { id: 'plan', title: 'Make it smaller', sub: 'Turn one overwhelming task into a visible next step', icon: LeafIcon, tone: 'bg-honey-100 text-honey-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeading title="A small thing can change the next hour" sub="Choose what you need—not what you think you should need." className="mb-0" />
        <div className="flex items-center gap-3 text-sm"><span className="chip bg-surface"><span className="w-2 h-2 rounded-full bg-honey-500" />{streak} day streak</span><span className="chip bg-surface">{doneIds.length}/{DAILY_TASKS.length} today</span></div>
      </div>

      <section className="mt-7 card-organic overflow-hidden bg-gradient-to-br from-sage-50 via-surface to-dusk-50">
        <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative"><BreathingCircle size={88} tone={doneIds.includes(recommended.id) ? 'sage' : 'mist'} /><span className="absolute inset-0 flex items-center justify-center text-sage-700">{doneIds.includes(recommended.id) ? <CheckIcon className="w-7 h-7" /> : <SparkIcon className="w-6 h-6" />}</span></div>
          <div className="flex-1"><p className="text-xs uppercase tracking-wide text-sage-700 font-semibold">Suggested for today · {recommended.minutes} min</p><h2 className="font-display text-2xl text-ink-900 mt-1">{recommended.title}</h2><p className="text-sm text-ink-600 mt-1 max-w-xl">{recommended.summary}</p></div>
          <button onClick={() => setSelected(recommended)} className={doneIds.includes(recommended.id) ? 'btn-secondary' : 'btn-primary'}>{doneIds.includes(recommended.id) ? 'Visit again' : 'Start gently'}<ArrowRightIcon className="w-4 h-4" /></button>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading title="Tools for right now" sub="Three private, interactive tools. Nothing here is sent anywhere." />
        <div className="grid sm:grid-cols-3 gap-3">
          {tools.map(tool => <button key={tool.id} onClick={() => setActiveTool(tool.id)} className={`card-soft p-5 text-left hover:shadow-soft-lg hover:-translate-y-0.5 transition-all ${activeTool === tool.id ? 'ring-2 ring-dusk-500/40' : ''}`}><span className={`inline-flex w-10 h-10 rounded-soft items-center justify-center ${tool.tone}`}><tool.icon className="w-5 h-5" /></span><p className="font-medium text-ink-900 mt-3">{tool.title}</p><p className="text-sm text-ink-600 mt-1 leading-snug">{tool.sub}</p></button>)}
        </div>
        {activeTool && (
          <div className="card-organic p-6 sm:p-8 mt-4 animate-rise relative">
            <button onClick={() => setActiveTool(null)} className="absolute right-4 top-4 btn-ghost p-2" aria-label="Close tool"><CloseIcon className="w-4 h-4" /></button>
            <h3 className="font-display text-xl text-ink-900 mb-5 pr-10">{tools.find(tool => tool.id === activeTool)?.title}</h3>
            {activeTool === 'focus' ? <FocusSprint /> : activeTool === 'ground' ? <GroundingTool /> : <NextStepPlanner userId={user.id} />}
          </div>
        )}
      </section>

      <section className="mt-11">
        <SectionHeading title="Browse the library" sub="Short enough to use between classes. Filter by what would help most." />
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filter daily tasks">
          <button onClick={() => setFilter('all')} className={`chip whitespace-nowrap ${filter === 'all' ? 'bg-sage-100 border-sage-500 text-sage-700' : ''}`}>Everything</button>
          {(Object.keys(NEED_META) as TaskNeed[]).map(need => <button key={need} onClick={() => setFilter(need)} className={`chip whitespace-nowrap ${filter === need ? 'bg-sage-100 border-sage-500 text-sage-700' : ''}`}>{NEED_META[need].label}</button>)}
        </div>
        {filter !== 'all' && <p className="text-sm text-ink-600 mt-2">{NEED_META[filter].prompt}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {visibleTasks.map(task => {
            const meta = KIND_META[task.kind];
            const done = doneIds.includes(task.id);
            return (
              <button key={task.id} onClick={() => setSelected(task)} className={`card-organic p-5 text-left transition-all hover:shadow-soft-lg hover:-translate-y-0.5 flex flex-col min-h-[220px] ${done ? 'bg-sage-50' : ''}`}>
                <div className="flex items-center justify-between"><span className={`inline-flex w-10 h-10 items-center justify-center rounded-soft ${meta.tone}`}><meta.icon className="w-5 h-5" /></span>{done && <span className="inline-flex items-center gap-1 text-xs text-sage-700 font-medium"><CheckIcon className="w-4 h-4" />Done</span>}</div>
                <p className="text-xs text-ink-600 mt-4">{meta.label} · {task.minutes} min</p><p className="font-display text-lg text-ink-900 mt-1 leading-snug">{task.title}</p><p className="text-sm text-ink-600 mt-2 leading-snug flex-1">{task.summary}</p><span className="inline-flex items-center gap-1 text-sm text-sage-700 mt-4">Open <ArrowRightIcon className="w-3.5 h-3.5" /></span>
              </button>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-ink-600 text-center mt-10">These tools support everyday wellbeing; they are not a substitute for professional care when things feel unmanageable.</p>
    </div>
  );
};

export default Tasks;
