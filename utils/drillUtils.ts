// P1-10: scoring drillu na úrovni SLOV (ne znaků) — STT zřídka trefí interpunkci/velikost
// písmen, takže porovnáváme množinu normalizovaných tokenů. Bez Gemini callu (free tier).

const normalize = (s: string): string[] =>
  s.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

// Podíl cílových tokenů, které žák skutečně řekl (token-level recall). 0–1.
export const scoreSentence = (spoken: string, target: string): number => {
  const targetTokens = normalize(target);
  if (targetTokens.length === 0) return 0;
  const said = new Set(normalize(spoken));
  const hit = targetTokens.filter(tok => said.has(tok)).length;
  return hit / targetTokens.length;
};

// Tokeny cíle, které žák NEřekl (pro zvýraznění „zkus znovu").
export const missingTokens = (spoken: string, target: string): string[] => {
  const said = new Set(normalize(spoken));
  return [...new Set(normalize(target))].filter(tok => !said.has(tok));
};

export const PASS_THRESHOLD = 0.8; // ≥80 % cílových slov → ✅
export const MAX_ATTEMPTS = 2;
