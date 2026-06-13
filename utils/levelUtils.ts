import { EnglishLevel, LessonHistoryEntry } from '../types';

// P0-3: prompt↔parser kontrakt. Verdikt TEST_ME musí přijít na VLASTNÍM řádku jako „LEVEL: B1".
// Kotveno na celý řádek (/m flag), aby konverzační zmínka („you're close to level B1")
// NEspustila falešný zápis (advisor fix). Povolené hodnoty: A1–C1 (ne C2 jako verdikt testu).
const LEVEL_RE = /^LEVEL:\s*(A1|A2|B1|B2|C1)\s*$/m;

export const extractLevelVerdict = (text: string): EnglishLevel | null =>
  (text.match(LEVEL_RE)?.[1] as EnglishLevel) ?? null;

// P1-11: progrese úrovně k cílovému B1.
export const LEVEL_ORDER: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const TARGET_LEVEL: EnglishLevel = 'B1';
export const RETEST_AFTER_LESSONS = 10;

// Počet lekcí absolvovaných od poslední změny úrovně.
export const lessonsAtCurrentLevel = (history: LessonHistoryEntry[], sinceLevelSetAt: number): number =>
  history.filter(h => h.endedAt >= sinceLevelSetAt).length;

// Postup k cíli v %: pozice úrovně v žebříčku + jemný příspěvek z lekcí na úrovni
// (10 lekcí = 1 segment). TEST_ME / mimo žebříček → 0 %. Na/nad cílem → 100 %.
export const levelProgressPercent = (
  current: EnglishLevel,
  lessonsAtLevel: number,
  target: EnglishLevel = TARGET_LEVEL
): number => {
  const ci = LEVEL_ORDER.indexOf(current);
  const ti = LEVEL_ORDER.indexOf(target);
  if (ti <= 0) return 0;
  if (ci < 0) return 0;            // TEST_ME / neznámá
  if (ci >= ti) return 100;
  const base = ci / ti;
  const withinLevel = (Math.min(lessonsAtLevel, RETEST_AFTER_LESSONS) / RETEST_AFTER_LESSONS) / ti;
  return Math.min(100, Math.round((base + withinLevel) * 100));
};

// Nabídnout re-test? Po RETEST_AFTER_LESSONS lekcích na stejné (ne-cílové, ne-assessment) úrovni.
export const shouldOfferRetest = (
  current: EnglishLevel,
  lessonsAtLevel: number
): boolean =>
  current !== 'TEST_ME' && lessonsAtLevel >= RETEST_AFTER_LESSONS && LEVEL_ORDER.indexOf(current) < LEVEL_ORDER.length - 1;
