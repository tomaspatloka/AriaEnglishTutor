import { Message, InteractionMode } from '../types';

// P2-14: ring buffer přepisů lekcí pro zpětné prohlížení. Max 10 lekcí × max 50 zpráv.
// Klíč spárován s LessonHistoryEntry.id, aby ProgressModal našel přepis k lekci.

const KEY = 'aria_transcripts_v1';
const MAX_TRANSCRIPTS = 10;
const MAX_MESSAGES = 50;

export interface StoredTranscript {
  id: string;
  endedAt: number;
  mode: InteractionMode;
  messages: Message[];
}

export const loadTranscripts = (): StoredTranscript[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: any) =>
      t && typeof t.id === 'string' && typeof t.endedAt === 'number' && Array.isArray(t.messages)
    );
  } catch {
    return [];
  }
};

// Uloží přepis (nejnovější první), ořízne na MAX. Při QuotaExceeded postupně evictuje
// nejstarší a zkouší znovu; pokud i tak selže, tiše přeskočí (přepis je nice-to-have).
export const saveTranscript = (entry: StoredTranscript): void => {
  const trimmed: StoredTranscript = { ...entry, messages: entry.messages.slice(-MAX_MESSAGES) };
  let list = [trimmed, ...loadTranscripts().filter(t => t.id !== entry.id)].slice(0, MAX_TRANSCRIPTS);

  const persist = (items: StoredTranscript[]): boolean => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); return true; }
    catch { return false; }
  };

  if (persist(list)) return;
  while (list.length > 1) {
    list = list.slice(0, -1); // zahoď nejstarší
    if (persist(list)) return;
  }
  // i jediný záznam neprošel → vzdej to bez vyhození výjimky
};

export const getTranscript = (id: string): StoredTranscript | undefined =>
  loadTranscripts().find(t => t.id === id);
