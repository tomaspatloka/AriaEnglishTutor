import { VocabularyEntry, VocabularyStatus } from '../types';

const VOCAB_KEY = 'aria_vocabulary';

const MASTERED_THRESHOLD = 3;

const VOCAB_PATTERNS = [
  /i (?:don't|do not) know (?:the (?:word|meaning of) )?["']?(\w[\w-]*)["']?/i,
  /what (?:does|is) ["']?(\w[\w-]*)["']? mean/i,
  /(?:the )?meaning of ["']?(\w[\w-]*)["']?/i,
  /(?:translate|translation of?) ["']?(\w[\w-]*)["']?/i,
  /co (?:znamená|je) ["']?(\w[\w-]*)["']?/i,
  /neznám (?:slovo )?["']?(\w[\w-]*)["']?/i,
  /["'](\w[\w-]*)["']\s*(?:co to|what does|what is)/i,
];

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
    const match = pattern.exec(transcript);
    if (match?.[1]) {
      words.push(match[1]);
    }
  }
  return [...new Set(words)];
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

// Priorita pro recall: learning > new > mastered (mastered jen pokud includeMastered)
export const buildRecallQueue = (
  entries: VocabularyEntry[],
  includeMastered: boolean
): VocabularyEntry[] => {
  const learning = entries.filter(e => e.status === 'learning');
  const fresh = entries.filter(e => e.status === 'new');
  const mastered = includeMastered ? entries.filter(e => e.status === 'mastered') : [];
  return [...learning, ...fresh, ...mastered];
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
