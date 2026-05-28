import { VocabularyEntry, VocabularyStatus } from '../types';

const VOCAB_KEY = 'aria_vocabulary';

const MASTERED_THRESHOLD = 3;
const REFRESH_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// Triggery pro auto-detekci slov z přepisu hlasu (jen anglické cílové slovo přes \w = ASCII).
// Cíl: pokrýt přirozené české/anglické formulace během čtení.
const VOCAB_PATTERNS = [
  // —— Anglicky ——
  /i (?:don't|do not) know (?:the (?:word|meaning of) )?["']?(\w[\w-]{2,})["']?/i,
  /what (?:does|is) ["']?(\w[\w-]{2,})["']? mean/i,
  /(?:the )?meaning of ["']?(\w[\w-]{2,})["']?/i,
  /(?:translate|translation of?) ["']?(\w[\w-]{2,})["']?/i,
  /add (?:the )?(?:word )?["']?(\w[\w-]{2,})["']?(?: to (?:my )?(?:vocab|vocabulary|dictionary))?/i,
  /save (?:the )?(?:word )?["']?(\w[\w-]{2,})["']?/i,

  // —— Česky — vysvětlení („co znamená / co je / co to") ——
  /co (?:znamená|je|to (?:znamená|je)) ["']?(\w[\w-]{2,})["']?/i,
  /co to (?:je |znamená )?["']?(\w[\w-]{2,})["']?/i,

  // —— Česky — neznalost („neznám / nevím / nerozumím") ——
  /(?:neznám|nevím|nerozumím)(?:\s+(?:to|tomu|slovo|slovu|tomu slovu))?\s+["']?(\w[\w-]{2,})["']?/i,

  // —— Česky — explicitní „přidej / zapiš / ulož" ——
  /(?:přidej|pridej|zapiš|zapis|ulož|uloz|napiš|napis)(?:\s+(?:si|mi))?(?:\s+(?:slovo|to slovo))?\s+["']?(\w[\w-]{2,})["']?(?:\s+(?:do (?:slovníku|slovniku|slovníčku|slovnicku)|do mého slovníku))?/i,

  // —— Česky — „do slovníku / do slovníčku X" (i obrácené pořadí) ——
  /(?:slovník|slovnik|slovníček|slovnicek|do slovníku|do slovniku|do slovníčku|do slovnicku)\s+["']?(\w[\w-]{2,})["']?/i,

  // —— Česky — „slovo X do slovníku" ——
  /slovo\s+["']?(\w[\w-]{2,})["']?\s+do\s+(?:slovníku|slovniku|slovníčku|slovnicku)/i,

  // —— Uvozovkové uvedení („X" co to znamená) ——
  /["'](\w[\w-]{2,})["']\s*(?:co to|what does|what is)/i,
];

// Blacklist — krátká / běžná česká slova, která se NESMÍ přidat jako "english vocab"
const TRIGGER_BLACKLIST = new Set([
  'ten', 'ta', 'to', 'tu', 'co', 'je', 'si', 'mi', 'do', 'pro', 'tak', 'jak', 'kdy',
  'kde', 'koho', 'cemu', 'cim', 'cim', 'koho', 'cele', 'celé', 'cela', 'celá',
  'slovo', 'slova', 'mas', 'mam', 'jsem', 'jsi', 'byl', 'byla', 'bylo', 'mel', 'mela',
  'have', 'has', 'the', 'and', 'but', 'for', 'you', 'are', 'was', 'not', 'with',
]);

const migrateEntry = (raw: any): VocabularyEntry | null => {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || typeof raw.word !== 'string') return null;
  const status: VocabularyStatus =
    raw.status === 'learning' || raw.status === 'mastered' ? raw.status : 'new';
  return {
    id: raw.id,
    word: raw.word,
    addedAt: typeof raw.addedAt === 'number' ? raw.addedAt : Date.now(),
    definition: typeof raw.definition === 'string' ? raw.definition : undefined,
    status,
    correctCount: typeof raw.correctCount === 'number' ? raw.correctCount : 0,
    incorrectCount: typeof raw.incorrectCount === 'number' ? raw.incorrectCount : 0,
    lastReviewedAt: typeof raw.lastReviewedAt === 'number' ? raw.lastReviewedAt : undefined,
  };
};

export const loadVocabulary = (): VocabularyEntry[] => {
  try {
    const raw = localStorage.getItem(VOCAB_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateEntry).filter((e): e is VocabularyEntry => e !== null);
  } catch {
    return [];
  }
};

export const saveVocabulary = (entries: VocabularyEntry[]): void => {
  localStorage.setItem(VOCAB_KEY, JSON.stringify(entries));
};

export const addVocabularyWord = (word: string, definition?: string): VocabularyEntry[] => {
  const entries = loadVocabulary();
  const normalized = word.toLowerCase().trim();
  if (!normalized || entries.some(e => e.word.toLowerCase() === normalized)) return entries;
  const newEntry: VocabularyEntry = {
    id: Math.random().toString(36).substring(2, 9),
    word: word.trim(),
    addedAt: Date.now(),
    definition,
    status: 'new',
    correctCount: 0,
    incorrectCount: 0,
  };
  const updated = [newEntry, ...entries];
  saveVocabulary(updated);
  return updated;
};

export const removeVocabularyWord = (id: string): VocabularyEntry[] => {
  const entries = loadVocabulary().filter(e => e.id !== id);
  saveVocabulary(entries);
  return entries;
};

export const clearVocabulary = (): void => {
  localStorage.removeItem(VOCAB_KEY);
};

export const updateVocabularyDefinition = (id: string, definition: string): VocabularyEntry[] => {
  const entries = loadVocabulary().map(e =>
    e.id === id ? { ...e, definition: definition.trim() || undefined } : e
  );
  saveVocabulary(entries);
  return entries;
};

export const addVocabularyWordWithDefinition = async (
  word: string,
  getDefinition: () => Promise<string>,
  onUpdate: (entries: VocabularyEntry[]) => void
): Promise<void> => {
  const afterAdd = addVocabularyWord(word);
  onUpdate(afterAdd);
  try {
    const definition = await getDefinition();
    if (!definition) return;
    const withDef = loadVocabulary().map(e =>
      e.word.toLowerCase() === word.toLowerCase() ? { ...e, definition } : e
    );
    saveVocabulary(withDef);
    onUpdate(withDef);
  } catch {
    // word stays in vocab without definition
  }
};

export const extractVocabFromTranscript = (transcript: string): string[] => {
  const words: string[] = [];
  for (const pattern of VOCAB_PATTERNS) {
    // Použijeme globální variantu pro vícenásobné match v jednom přepisu
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = globalPattern.exec(transcript)) !== null) {
      const w = m[1];
      if (!w) continue;
      const lower = w.toLowerCase();
      if (lower.length < 3) continue;
      if (TRIGGER_BLACKLIST.has(lower)) continue;
      words.push(w);
    }
  }
  return [...new Set(words.map(w => w.toLowerCase()))];
};

// ─── Recall mode helpers ─────────────────────────────────────────────

type RecallResult = 'correct' | 'incorrect' | 'skip';

export const recordRecallResult = (id: string, result: RecallResult): VocabularyEntry[] => {
  const entries = loadVocabulary().map(e => {
    if (e.id !== id) return e;
    const next: VocabularyEntry = { ...e, lastReviewedAt: Date.now() };
    if (result === 'correct') {
      next.correctCount = e.correctCount + 1;
      // 3 v řadě (streak ~ correctCount - incorrectCount za poslední běh)
      // Zjednodušení: mastered = correctCount >= 3 a correctCount > incorrectCount
      if (next.correctCount >= MASTERED_THRESHOLD && next.correctCount > next.incorrectCount) {
        next.status = 'mastered';
      } else if (e.status === 'new') {
        next.status = 'learning';
      }
    } else if (result === 'incorrect') {
      next.incorrectCount = e.incorrectCount + 1;
      next.status = 'learning';
    }
    return next;
  });
  saveVocabulary(entries);
  return entries;
};

// Zvládnuté slovo, které čeká na refresh (lastReviewedAt + 7d ≤ now).
// Mastered slova s neexistujícím lastReviewedAt jsou považována za hraniční (raději ne — preference: refresh).
export const isDueForRefresh = (entry: VocabularyEntry, now: number = Date.now()): boolean => {
  if (entry.status !== 'mastered') return false;
  if (!entry.lastReviewedAt) return true;
  return now - entry.lastReviewedAt >= REFRESH_AFTER_DAYS * DAY_MS;
};

export const countDueForRefresh = (entries: VocabularyEntry[]): number => {
  const now = Date.now();
  return entries.reduce((acc, e) => acc + (isDueForRefresh(e, now) ? 1 : 0), 0);
};

// Priorita: learning > new > mastered-due-for-refresh > (volitelně) všechna ostatní mastered
export const buildRecallQueue = (
  entries: VocabularyEntry[],
  includeAllMastered: boolean
): VocabularyEntry[] => {
  const now = Date.now();
  const learning = entries.filter(e => e.status === 'learning');
  const fresh = entries.filter(e => e.status === 'new');
  const masteredDue = entries.filter(e => e.status === 'mastered' && isDueForRefresh(e, now));
  const masteredRest = includeAllMastered
    ? entries.filter(e => e.status === 'mastered' && !isDueForRefresh(e, now))
    : [];
  return [...learning, ...fresh, ...masteredDue, ...masteredRest];
};

// Bulk add — z volně formátovaného textu (čárky / nové řádky / středníky / mezery), s autopřekladem.
// Vrací počet skutečně přidaných slov (duplicity ignoruje).
export const addManyVocabularyWords = async (
  rawInput: string,
  getDefinition: (word: string) => Promise<string>,
  onUpdate: (entries: VocabularyEntry[]) => void
): Promise<number> => {
  const tokens = rawInput
    .split(/[,;\n\r]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 64);
  if (tokens.length === 0) return 0;

  // 1. Optimisticky přidat všechna slova (deduplikace v addVocabularyWord)
  const existingBefore = loadVocabulary();
  const existingNames = new Set(existingBefore.map(e => e.word.toLowerCase()));
  const toAdd = tokens.filter(w => !existingNames.has(w.toLowerCase()));
  if (toAdd.length === 0) return 0;

  let current = existingBefore;
  for (const w of toAdd) {
    current = addVocabularyWord(w);
  }
  onUpdate(current);

  // 2. Přeložit po jednom (paralelně — Gemini rate limit zvládne pár souběžných requestů)
  await Promise.all(toAdd.map(async (w) => {
    try {
      const def = await getDefinition(w);
      if (!def) return;
      const after = loadVocabulary().map(e =>
        e.word.toLowerCase() === w.toLowerCase() ? { ...e, definition: def } : e
      );
      saveVocabulary(after);
      onUpdate(after);
    } catch {
      // slovo zůstane bez překladu
    }
  }));

  return toAdd.length;
};

export const statusLabel = (status: VocabularyStatus): string => {
  switch (status) {
    case 'new': return 'nové';
    case 'learning': return 'učím se';
    case 'mastered': return 'umím';
  }
};

export const statusColors = (status: VocabularyStatus): {
  bar: string;
  badgeBg: string;
  badgeText: string;
  pillBorder: string;
} => {
  switch (status) {
    case 'new':
      return {
        bar: 'bg-blue-400',
        badgeBg: 'bg-blue-500/15',
        badgeText: 'text-blue-300',
        pillBorder: 'border-blue-400/40',
      };
    case 'learning':
      return {
        bar: 'bg-amber-400',
        badgeBg: 'bg-amber-500/15',
        badgeText: 'text-amber-300',
        pillBorder: 'border-amber-400/40',
      };
    case 'mastered':
      return {
        bar: 'bg-emerald-400',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-300',
        pillBorder: 'border-emerald-400/40',
      };
  }
};
