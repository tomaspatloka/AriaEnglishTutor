import { EnglishLevel } from '../types';

// P0-3: prompt↔parser kontrakt. Verdikt TEST_ME musí přijít na VLASTNÍM řádku jako „LEVEL: B1".
// Kotveno na celý řádek (/m flag), aby konverzační zmínka („you're close to level B1")
// NEspustila falešný zápis (advisor fix). Povolené hodnoty: A1–C1 (ne C2 jako verdikt testu).
const LEVEL_RE = /^LEVEL:\s*(A1|A2|B1|B2|C1)\s*$/m;

export const extractLevelVerdict = (text: string): EnglishLevel | null =>
  (text.match(LEVEL_RE)?.[1] as EnglishLevel) ?? null;
