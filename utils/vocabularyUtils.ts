import { VocabularyEntry } from '../types';

const VOCAB_KEY = 'aria_vocabulary';

const VOCAB_PATTERNS = [
  /i (?:don't|do not) know (?:the (?:word|meaning of) )?["']?(\w[\w-]*)["']?/i,
  /what (?:does|is) ["']?(\w[\w-]*)["']? mean/i,
  /(?:the )?meaning of ["']?(\w[\w-]*)["']?/i,
  /(?:translate|translation of?) ["']?(\w[\w-]*)["']?/i,
  /co (?:znamená|je) ["']?(\w[\w-]*)["']?/i,
  /neznám (?:slovo )?["']?(\w[\w-]*)["']?/i,
  /["'](\w[\w-]*)["']\s*(?:co to|what does|what is)/i,
];

export const loadVocabulary = (): VocabularyEntry[] => {
  try {
    const raw = localStorage.getItem(VOCAB_KEY);
    return raw ? JSON.parse(raw) : [];
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
