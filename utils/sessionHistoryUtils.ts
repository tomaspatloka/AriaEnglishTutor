import { LessonHistoryEntry, ProgressStats } from '../types';

const HISTORY_KEY = 'aria_lesson_history_v1';
const MAX_HISTORY_ITEMS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

const toDayStart = (timestamp: number) => {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const loadLessonHistory = (): LessonHistoryEntry[] => {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LessonHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item.endedAt === 'number')
      .sort((a, b) => b.endedAt - a.endedAt);
  } catch (error) {
    console.error('Failed to parse lesson history', error);
    return [];
  }
};

export const saveLessonHistory = (history: LessonHistoryEntry[]) => {
  const normalized = [...history]
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, MAX_HISTORY_ITEMS);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
  return normalized;
};

export const appendLessonHistory = (entry: LessonHistoryEntry): LessonHistoryEntry[] => {
  const history = loadLessonHistory();
  const updated = [entry, ...history];
  return saveLessonHistory(updated);
};

export const getProgressStats = (history: LessonHistoryEntry[]): ProgressStats => {
  if (history.length === 0) {
    return {
      totalLessons: 0,
      streakDays: 0,
      totalSpeakingMs: 0,
      averageCorrectionsLast3: 0,
      correctionTrend: 'insufficient-data',
    };
  }

  const totalSpeakingMs = history.reduce((acc, item) => acc + Math.max(0, item.speakingMs || 0), 0);

  const last3 = history.slice(0, 3);
  const previous3 = history.slice(3, 6);
  const averageCorrectionsLast3 = last3.reduce((acc, item) => acc + (item.correctionCount || 0), 0) / last3.length;

  let correctionTrend: ProgressStats['correctionTrend'] = 'insufficient-data';
  if (previous3.length > 0) {
    const prevAverage = previous3.reduce((acc, item) => acc + (item.correctionCount || 0), 0) / previous3.length;
    const delta = averageCorrectionsLast3 - prevAverage;
    if (delta < -0.5) correctionTrend = 'improving';
    else if (delta > 0.5) correctionTrend = 'worsening';
    else correctionTrend = 'stable';
  }

  const dayStarts = Array.from(new Set(history.map(item => toDayStart(item.endedAt)))).sort((a, b) => b - a);
  let streakDays = 0;
  const todayStart = toDayStart(Date.now());

  if (dayStarts.length > 0) {
    const gapFromToday = Math.round((todayStart - dayStarts[0]) / DAY_MS);
    if (gapFromToday <= 1) {
      streakDays = 1;
      for (let i = 1; i < dayStarts.length; i++) {
        const diffDays = Math.round((dayStarts[i - 1] - dayStarts[i]) / DAY_MS);
        if (diffDays === 1) streakDays += 1;
        else break;
      }
    }
  }

  return {
    totalLessons: history.length,
    streakDays,
    totalSpeakingMs,
    averageCorrectionsLast3: Number.isFinite(averageCorrectionsLast3) ? averageCorrectionsLast3 : 0,
    correctionTrend,
  };
};
