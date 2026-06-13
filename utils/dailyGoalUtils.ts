import { LessonHistoryEntry } from '../types';

// P0-4: denní cíl mluvení + dnešní progres. todayMinutes se NEukládá — počítá se z
// lessonHistory (single source of truth) + běžící session, aby nemohl rozejít stav.

const GOAL_KEY = 'aria_daily_goal_v1';
const DEFAULT_GOAL = 10;
const MIN_GOAL = 5;
const MAX_GOAL = 60;

const isSameDay = (a: number, b: number): boolean => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
};

// Dnešní minuty: suma speakingMs z dnešních lekcí + běžící session (liveMs v ms).
export const getTodayMinutes = (history: LessonHistoryEntry[], liveMs: number = 0): number => {
  const now = Date.now();
  const todayMs = history.reduce(
    (acc, e) => acc + (isSameDay(e.endedAt, now) ? Math.max(0, e.speakingMs) : 0),
    0
  );
  return Math.round((todayMs + Math.max(0, liveMs)) / 60000);
};

export const getDailyGoal = (): number => {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (!raw) return DEFAULT_GOAL;
    const parsed = JSON.parse(raw);
    const v = typeof parsed?.minutesTarget === 'number' ? parsed.minutesTarget : DEFAULT_GOAL;
    return Math.min(MAX_GOAL, Math.max(MIN_GOAL, v));
  } catch {
    return DEFAULT_GOAL;
  }
};

export const setDailyGoal = (minutes: number): void => {
  try {
    const clamped = Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round(minutes)));
    localStorage.setItem(GOAL_KEY, JSON.stringify({ minutesTarget: clamped }));
  } catch {
    // quota / private mode — cíl je nice-to-have, neshazuj app
  }
};

export const DAILY_GOAL_BOUNDS = { min: MIN_GOAL, max: MAX_GOAL, default: DEFAULT_GOAL };
