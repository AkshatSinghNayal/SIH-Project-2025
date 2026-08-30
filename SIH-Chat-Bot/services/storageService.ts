import type {
  AppSettings,
  AssessmentResult,
  DailyFocusPlan,
  MoodEntry,
  PeerProfile,
  PersonalityResult,
  TaskReflection,
} from '../types';
import { NICKNAME_ADJECTIVES, NICKNAME_PLANTS } from '../content';

const NS = 'hellomind';

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn('Could not save to local storage.');
  }
};

export const dateKey = (ts: number = Date.now()): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ---------------------------- moods ---------------------------- */

export const getMoods = (userId: string): MoodEntry[] =>
  readJSON<MoodEntry[]>(`${NS}:moods:${userId}`, []);

export const logMood = (userId: string, level: number): MoodEntry[] => {
  const moods = getMoods(userId).filter(m => m.date !== dateKey());
  const entry: MoodEntry = { level, date: dateKey(), ts: Date.now() };
  writeJSON(`${NS}:moods:${userId}`, [entry, ...moods]);
  return [entry, ...moods];
};

export const getMoodToday = (userId: string): MoodEntry | undefined =>
  getMoods(userId).find(m => m.date === dateKey());

/* ------------------------- task streaks ------------------------- */

export const getTaskCompletions = (userId: string): Record<string, string> =>
  readJSON<Record<string, string>>(`${NS}:tasks:${userId}`, {});

const getTaskCompletionDays = (userId: string): string[] =>
  readJSON<string[]>(`${NS}:task-days:${userId}`, []);

export const completeTask = (userId: string, taskId: string): Record<string, string> => {
  const done = getTaskCompletions(userId);
  done[taskId] = dateKey();
  writeJSON(`${NS}:tasks:${userId}`, done);
  const days = new Set([...getTaskCompletionDays(userId), dateKey()]);
  writeJSON(`${NS}:task-days:${userId}`, [...days].sort().reverse());
  return done;
};

export const isTaskDoneToday = (userId: string, taskId: string): boolean =>
  getTaskCompletions(userId)[taskId] === dateKey();

export const getDailyFocusPlan = (userId: string): DailyFocusPlan | null => {
  const plan = readJSON<DailyFocusPlan | null>(`${NS}:focus-plan:${userId}`, null);
  return plan?.date === dateKey() ? plan : null;
};

export const saveDailyFocusPlan = (userId: string, plan: Omit<DailyFocusPlan, 'date'>): DailyFocusPlan => {
  const saved = { ...plan, date: dateKey() };
  writeJSON(`${NS}:focus-plan:${userId}`, saved);
  return saved;
};

export const getTaskReflection = (userId: string, taskId: string): TaskReflection | null => {
  const reflection = readJSON<TaskReflection | null>(`${NS}:task-reflection:${userId}:${taskId}`, null);
  return reflection?.date === dateKey() ? reflection : null;
};

export const saveTaskReflection = (userId: string, taskId: string, rating: TaskReflection['rating']): TaskReflection => {
  const reflection = { date: dateKey(), rating };
  writeJSON(`${NS}:task-reflection:${userId}:${taskId}`, reflection);
  return reflection;
};

/**
 * Streak = consecutive days (ending today or yesterday) on which the student
 * logged a mood or completed a task. Counted quietly — a small honey dot, nothing louder.
 */
export const getStreak = (userId: string): number => {
  const days = new Set<string>([
    ...getMoods(userId).map(m => m.date),
    ...Object.values(getTaskCompletions(userId)),
    ...getTaskCompletionDays(userId),
  ]);
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1); // today isn't logged yet — streak can still be alive from yesterday
  }
  while (days.has(dateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

/* -------------------------- assessments ------------------------- */

export const getAssessmentHistory = (userId: string): AssessmentResult[] =>
  readJSON<AssessmentResult[]>(`${NS}:assessment:${userId}`, []);

export const saveAssessmentResult = (userId: string, result: AssessmentResult): AssessmentResult[] => {
  const history = [result, ...getAssessmentHistory(userId)];
  writeJSON(`${NS}:assessment:${userId}`, history);
  return history;
};

export const getPersonalityHistory = (userId: string): PersonalityResult[] =>
  readJSON<PersonalityResult[]>(`${NS}:personality:${userId}`, []);

export const savePersonalityResult = (userId: string, result: PersonalityResult): PersonalityResult[] => {
  const history = [result, ...getPersonalityHistory(userId)];
  writeJSON(`${NS}:personality:${userId}`, history);
  return history;
};

export const getHiddenPostIds = (userId: string): string[] => readJSON<string[]>(`${NS}:hidden:${userId}`, []);

export const hidePost = (userId: string, postId: string): string[] => {
  const hidden = [...getHiddenPostIds(userId), postId];
  writeJSON(`${NS}:hidden:${userId}`, hidden);
  return hidden;
};

/* ------------------------- anonymous peer ------------------------ */

export const getPeerProfile = (userId: string): PeerProfile => {
  const existing = readJSON<PeerProfile | null>(`${NS}:peer:${userId}`, null);
  if (existing) return existing;

  const a = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const p = NICKNAME_PLANTS[Math.floor(Math.random() * NICKNAME_PLANTS.length)];
  const palettes: [string, string][] = [
    ['#8C7FA3', '#665A7D'],
    ['#6E8F7C', '#4E6B5B'],
    ['#E4A94F', '#D98168'],
    ['#8C7FA3', '#4E6B5B'],
  ];
  const [from, to] = palettes[Math.floor(Math.random() * palettes.length)];
  const profile: PeerProfile = { nickname: `${a} ${p}`, colorFrom: from, colorTo: to, seenGuidelines: false };
  writeJSON(`${NS}:peer:${userId}`, profile);
  return profile;
};

export const savePeerProfile = (userId: string, profile: PeerProfile): void =>
  writeJSON(`${NS}:peer:${userId}`, profile);

/* ---------------------------- settings --------------------------- */

export const getSettings = (userId: string): AppSettings =>
  readJSON<AppSettings>(`${NS}:settings:${userId}`, { notificationTone: 'gentle', shareWithCounselor: false });

export const saveSettings = (userId: string, settings: AppSettings): void =>
  writeJSON(`${NS}:settings:${userId}`, settings);

/* ------------------------- data deletion ------------------------- */

/** Plain-language "delete everything" — wipes every helloMind key on this device. */
export const deleteAllLocalData = (): void => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(`${NS}:`) || key.startsWith('chats_'))) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
};

/** Removes only one profile's private on-device records, leaving other profiles untouched. */
export const deleteUserLocalData = (userId: string): void => {
  const exactKeys = [
    `${NS}:moods:${userId}`,
    `${NS}:tasks:${userId}`,
    `${NS}:task-days:${userId}`,
    `${NS}:focus-plan:${userId}`,
    `${NS}:assessment:${userId}`,
    `${NS}:personality:${userId}`,
    `${NS}:hidden:${userId}`,
    `${NS}:peer:${userId}`,
    `${NS}:settings:${userId}`,
    `chats_${userId}`,
  ];
  exactKeys.forEach(key => localStorage.removeItem(key));

  const reflectionPrefix = `${NS}:task-reflection:${userId}:`;
  const reflectionKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith(reflectionPrefix)) reflectionKeys.push(key);
  }
  reflectionKeys.forEach(key => localStorage.removeItem(key));
};
