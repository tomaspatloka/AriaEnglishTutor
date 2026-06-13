// P0-1: paměť tutora — agreguje opakované chyby žáka napříč sessions a injektuje je do
// system promptu, aby Aria nenápadně vplétala procvičení slabin do konverzace.
// UZAVŘENÁ TAXONOMIE — agregace jde přes exact-tag match, NIKDY přes fuzzy match textu.

export const ERROR_TAGS = [
  'past-tense', 'present-perfect', 'articles', 'prepositions', 'word-order',
  'plurals', 'pronouns', 'vocabulary-choice', 'conditionals', 'question-formation',
  'pronunciation', 'other',
] as const;
export type ErrorTag = typeof ERROR_TAGS[number];

export interface LearnerError {
  tag: ErrorTag;       // klíč agregace — exact match
  example: string;     // poslední konkrétní příklad (pro prompt)
  count: number;       // kolikrát napříč sessions
  lastSeenAt: number;
}
export interface LearnerProfile {
  errors: LearnerError[];   // max 12 (1 per tag), řazeno count desc
  updatedAt: number;
}

const PROFILE_KEY = 'aria_learner_profile_v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const DECAY_DAYS = 30;
const MAX_ERRORS = 12; // 1 per tag

const isErrorTag = (t: any): t is ErrorTag =>
  typeof t === 'string' && (ERROR_TAGS as readonly string[]).includes(t);

const loadProfile = (): LearnerProfile => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { errors: [], updatedAt: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.errors)) return { errors: [], updatedAt: 0 };
    const errors: LearnerError[] = parsed.errors
      .filter((e: any) => e && isErrorTag(e.tag) && typeof e.count === 'number')
      .map((e: any) => ({
        tag: e.tag as ErrorTag,
        example: typeof e.example === 'string' ? e.example : '',
        count: e.count as number,
        lastSeenAt: typeof e.lastSeenAt === 'number' ? e.lastSeenAt : 0,
      }));
    return { errors, updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0 };
  } catch {
    return { errors: [], updatedAt: 0 };
  }
};

const saveProfile = (profile: LearnerProfile): void => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // quota / private mode — profil je nice-to-have, neshazuj app
  }
};

// Wall-time decay: zahoď chyby starší DECAY_DAYS (od posledního výskytu) — rozhodnutý clock.
const applyDecay = (errors: LearnerError[], now: number): LearnerError[] =>
  errors.filter(e => now - e.lastSeenAt < DECAY_DAYS * DAY_MS);

// Agregace summary do profilu: stejný tag → count++, example přepsat nejnovějším. Exact-tag,
// neznámý tag → 'other'. Volá se po každém úspěšném generateSessionSummary (oba finalizery).
export const mergeSummaryIntoProfile = (errorTags: { tag: string; example: string }[]): void => {
  if (!Array.isArray(errorTags) || errorTags.length === 0) return;
  const now = Date.now();
  const profile = loadProfile();
  const byTag = new Map<ErrorTag, LearnerError>();
  for (const e of profile.errors) byTag.set(e.tag, e);

  for (const incoming of errorTags) {
    const tag: ErrorTag = isErrorTag(incoming?.tag) ? incoming.tag : 'other';
    const example = typeof incoming?.example === 'string' ? incoming.example : '';
    const existing = byTag.get(tag);
    if (existing) {
      existing.count += 1;
      if (example) existing.example = example;
      existing.lastSeenAt = now;
    } else {
      byTag.set(tag, { tag, example, count: 1, lastSeenAt: now });
    }
  }

  const merged = applyDecay([...byTag.values()], now)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ERRORS);
  saveProfile({ errors: merged, updatedAt: now });
};

// Top N opakovaných chyb (po decay), seřazené dle count desc. Pro injekci do promptu.
export const getTopErrors = (max = 3): LearnerError[] => {
  const now = Date.now();
  return applyDecay(loadProfile().errors, now)
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
};

// Čitelné stringy pro prompt: „past-tense (e.g. I goed there)".
export const getRecurringErrorStrings = (max = 3): string[] =>
  getTopErrors(max).map(e => (e.example ? `${e.tag} (e.g. ${e.example})` : e.tag));
