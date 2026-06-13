# Implementační blueprint — opravy z pedagogického auditu

> Vytvořeno: 2026-06-12 | Zdroj: `AUDIT_PEDAGOGICKY_2026-06-12.html` (4 rozpojené smyčky, plán P0–P2)
> Tier: E3 návrh | Pokrývá 16 položek ve 3 release řezech | **Mimo scope: P2-16 (API klíč / CF Worker proxy) — na Tomův pokyn odloženo**
>
> Celkový odhad: v1.9.0 ≈ 6–8 h · v1.10.0 ≈ 10–13 h · v1.11.0 ≈ 3–4 h

---

## Pravidla pro celý blueprint

1. **Nová logika jde do `utils/` modulů, ne do App.tsx.** App.tsx jen volá. (Monolit ~966 řádků se nesmí dál nafukovat.)
2. **Všechny nové localStorage klíče jsou verzované** (`aria_*_v1`) a čtou se přes try/catch + shape-validaci (vzor `migrateEntry` ve `vocabularyUtils.ts:48`).
3. **Live API systemInstruction je immutable** — každá změna promptu se projeví až reconnectem. Položky, kterých se to týká, mají značku ⚡reconnect.
4. **Token budget promptových injekcí — účetnictví per blok** (free tier, advisor fix):

   | Blok | ~tokenů | Kdy v promptu |
   |------|---------|---------------|
   | Turn economy (P0-7) | 40 | vždy |
   | Profil chyb — 3 tagy+příklady (P0-1) | 45 | vždy (mimo reading) |
   | Slovíčka — 5 lemmat bez vět (P0-2) | 25 | vždy (mimo reading) |
   | **Hot-path součet** | **~110** | ✅ pod capem 120 |
   | Task blok (P1-9) | +35 | jen scénáře s taskem (~145 — vědomě přes cap, jen tyto sessions) |
   | TEST_ME formát (P0-3) | +30 | jen assessment session |
5. Po každé položce: `tsc --noEmit` čistý + `bun run build` OK, commit per položka (konvence `feat(blueprint P0-N): ...`).

---

## Pre-flight checklist (start implementační session)

- [ ] `git pull` + `git status` clean (BLUEPRINT_*.md untracked OK)
- [ ] `bun install` + `bun run build` — baseline OK
- [ ] `bun run dev` → smoke: Live connect → jedna věta → Aria odpoví (regression baseline)
- [ ] Reading mode smoke: connect → přečti větu → Aria zopakuje
- [ ] Slovníček: přidej slovo ručně → překlad se doplní

**Cokoli neprojde → STOP, vyřešit, pak teprve kódovat.**

---

## Datové modely — všechna nová/změněná schémata

### 1. `aria_learner_profile_v1` (NOVÝ) — paměť tutora

```ts
// utils/learnerProfileUtils.ts (NOVÝ soubor)
// UZAVŘENÁ TAXONOMIE — agregace jde přes tag, nikdy přes fuzzy match textu (advisor fix)
export const ERROR_TAGS = [
  'past-tense', 'present-perfect', 'articles', 'prepositions', 'word-order',
  'plurals', 'pronouns', 'vocabulary-choice', 'conditionals', 'question-formation',
  'pronunciation', 'other',
] as const;
type ErrorTag = typeof ERROR_TAGS[number];

interface LearnerError {
  tag: ErrorTag;       // klíč agregace — exact match
  example: string;     // poslední konkrétní příklad (pro prompt)
  count: number;       // kolikrát napříč sessions
  lastSeenAt: number;
}
interface LearnerProfile {
  errors: LearnerError[];   // max 12 (1 per tag), řazeno count desc
  updatedAt: number;
}
```

**Kontrakt se summary (rozhodnuto — reshape P0-1):** `generateSessionSummary` JSON dostane nové pole `"errorTags": [{"tag": "past-tense", "example": "I goed there"}]` (tag MUSÍ být z taxonomie, jinak 'other'). `commonErrors` (české stringy) zůstává beze změny pro zobrazení — žádný zásah do ProgressModal. Profil agreguje výhradně `errorTags`: stejný tag → `count++`, `example` přepsat nejnovějším. Decay: **wall-time** — při loadu zahoď položky s `lastSeenAt` > 30 dní (rozhodnutý clock).

### 2. `VocabularyEntry` — rozšíření pro SRS (migrace v `migrateEntry`)

```ts
interface VocabularyEntry {
  // ...stávající pole beze změny...
  srsLevel: number;          // 0–5, index do INTERVALS; default 0
  dueAt: number;             // timestamp příštího opakování; default Date.now()
  consecutiveCorrect: number; // streak per slovo; default 0
  contextSentence?: string;  // věta, ve které se slovo objevilo (P1-8)
}
const SRS_INTERVALS_DAYS = [1, 3, 7, 16, 35, 90];
```

**Migrace — backfill je povinný a anti-lavinový (advisor fix):** stará entry bez `srsLevel` → `srsLevel: status === 'mastered' ? 2 : 0`, `consecutiveCorrect: status === 'mastered' ? 3 : 0`, a **`dueAt: (lastReviewedAt ?? addedAt) + SRS_INTERVALS_DAYS[srsLevel] * DAY_MS`** — odvozeno z posledního opakování, NE `Date.now()`, jinak se první den po upgradu vysype celý slovník do due fronty najednou. **Lapse (rozhodnuto):** špatná odpověď = step-back `srsLevel = max(0, srsLevel - 2)`, `consecutiveCorrect = 0`, `dueAt = now` — ne tvrdý reset na nulu (35denní slovo po jednom zaváhání nepadá na den 1). Due se porovnává timestampem, ne kalendářním dnem (žádný dvojí posun při opakování týž den).

### 3. `aria_daily_goal_v1` (NOVÝ) — denní cíl

```ts
interface DailyGoal { minutesTarget: number }  // default 10
```
`todayMinutes` se NEukládá — počítá se z `lessonHistory` (entries s `endedAt` dnes) + běžící session (`getCurrentSpeakingMs`).

### 4. `aria_transcripts_v1` (NOVÝ, P2-14) — ring buffer přepisů

```ts
interface StoredTranscript { id: string; endedAt: number; mode: InteractionMode; messages: Message[] }
// max 10 položek, max ~50 zpráv per session (slice(-50)); při QuotaExceeded zahodit nejstarší a zkusit znovu
```

### 5. `Scenario` — rozšíření o task (P1-9)

```ts
interface ScenarioTask {
  goalCz: string;        // „Objednej jídlo, zeptej se na alergeny, požádej o účet"
  steps: string[];       // ["order a meal", "ask about allergens", "ask for the bill"]
  keyPhrases: string[];  // 3–5 frází k ukázání před startem
}
interface Scenario { /* stávající */ task?: ScenarioTask }
```

---

## RELEASE v1.9.0 — „Tutor s pamětí" (P0, ~6–8 h)

**Pořadí dle závislostí:** P0-5 → P0-6 → P0-7 → P0-2 → P0-1 → P0-3 → P0-4
(quick-fixes první = okamžitá hodnota; prompt změny pohromadě; UI nakonec, protože čte data z předchozích)

### P0-5 — Poctivá metrika mluvení (~30 min)

**Soubory:** `App.tsx` (řádky ~172–182, ~224), `ReadingModeView.tsx`, `types.ts`
**Změny:**
- `App.tsx:173`: `voiceActive = isListening || liveRuntimeState.isUserTalking` — **vyhodit `liveRuntimeState.isSpeaking`** (čas Arie se nepočítá žákovi).
- Reading: `ReadingModeView` si měří vlastní `userTalkingMs` (interval, kdy `isUserTalking === true`, akumulace přes ref stejným vzorem jako `voiceActiveStartedAtRef` v App.tsx:172) a předá ho v session objektu: `onExit({ messages, startedAt, userTalkingMs })`. `finalizeReadingSession` použije `speakingMs: session.userTalkingMs` místo `durationMs`.
**Verifikace:** ručně — 2min session, kde Aria mluví většinu času → „Cas mluveni" musí být výrazně < 2 min. `tsc` čistý.

### P0-6 — Exit z Reading přes header neztrácí session (~30 min)

**Soubory:** `App.tsx` (~197–206, 818), `ReadingModeView.tsx`
**Mechanismus (rozhodnuto):** vzor `onLiveStateChange` z AvatarView — `ReadingModeView` dostane prop `onSessionUpdate(session)` a hlásí průběžně `{ messages: conversationLog, startedAt, userTalkingMs }` (useEffect nad `conversationLog`). App drží `readingSessionRef`; `exitReadingMode()` z headeru použije `readingSessionRef.current` místo argumentu. „← Zpět" cesta zůstává (předá totéž).
**Verifikace:** reading session → 2 věty → exit přes 📚 ikonu v headeru → záznam v Progress historii existuje (mode 📖).

### P0-7 — Output-forcing prompt (~20 min) ⚡reconnect

**Soubory:** `constants.ts` (`getSystemInstruction`)
**Změna:** nový blok do Core Rules (platí pro všechny levely, módy konverzace i scénáře):

```
3. **Turn economy:** Keep your turns SHORT — 1–3 sentences. End most turns
   with a question to the student. Never fill silence with explanations the
   student didn't ask for. The student must speak most of the time.
```

**Verifikace:** Live session 5 výměn → Ariiny repliky vizuálně ≤ 3 věty, končí otázkou.

### P0-2 — Recyklace slovíček do konverzace (~45 min) ⚡reconnect

**Soubory:** `vocabularyUtils.ts` (nová fn), `constants.ts`, `App.tsx` + `useLiveAPI.ts` (předání parametru)
**Nová funkce:**

```ts
// vocabularyUtils.ts — v1.9 VERZE: bez dueAt (SRS pole přijdou až v P1-7/v1.10!)
// Advisor fix fázového konfliktu: v1.9 prioritizuje jen podle statusu.
export const buildFocusWords = (entries: VocabularyEntry[], max = 5): string[] => {
  const learning = entries.filter(e => e.status === 'learning');
  const fresh = entries.filter(e => e.status === 'new');
  return [...learning, ...fresh].slice(0, max).map(e => e.word); // jen lemma, bez vět (tokeny)
};
// P1-7 (v1.10) tuto funkci upgraduje: due (dueAt <= now) dostanou přednost před learning.
```

**Prompt blok** (v `getSystemInstruction`, nový parametr `focusWords: string[]`):

```
**VOCABULARY RECYCLING:** The student is learning these words: {words}.
Naturally use 1–2 of them in conversation when fitting. Occasionally invite
the student to use one ("Can you try using the word 'rope'?"). Never list them.
```

**Předání:** `App.tsx` → `initializeChat(..., focusWords)`; `useLiveAPI.ts:238` → `getSystemInstruction(..., focusWords)` (hook už dostává settings; focusWords spočítat při `connect()` z `loadVocabulary()` — žádný nový prop drilling).
**Verifikace:** přidej 3 slova → nová Live session → Aria některé použije/vyzve (manuální smoke, 2 pokusy).

### P0-1 — Profil chyb → system prompt (~2 h) ⚡reconnect

**Soubory:** `utils/learnerProfileUtils.ts` (NOVÝ), `services/geminiService.ts` (summary kontrakt), `types.ts`, `App.tsx` (finalizeSession + finalizeReadingSession), `constants.ts`, `useLiveAPI.ts`
**Krok 1 — summary kontrakt:** `generateSessionSummary` prompt rozšířit o `"errorTags": [{"tag": "...", "example": "..."}]` s výčtem povolených tagů (ERROR_TAGS z Datové modely §1); validace: neznámý tag → 'other', chybějící pole → prázdné pole (žádný pád). `SessionSummary` typ: `errorTags?: { tag: string; example: string }[]`.
**Krok 2 — profil:**

```ts
// utils/learnerProfileUtils.ts
export const mergeSummaryIntoProfile = (errorTags: { tag: string; example: string }[]): void => { /* exact-tag agregace dle §1 */ };
export const getTopErrors = (max = 3): LearnerError[] => { /* load → decay 30d wall-time → sort count desc → slice */ };
```

- `App.tsx`: po každém úspěšném `generateSessionSummary` (oba finalizery) → `mergeSummaryIntoProfile(summary.errorTags ?? [])`.
- `getSystemInstruction` nový parametr `recurringErrors: string[]`; blok:

```
**STUDENT'S RECURRING WEAKNESSES (from previous lessons):** {errors}.
Gently weave practice of these into the conversation. Do NOT lecture about
them or list them — create natural moments where the student must use them.
```

- Reading mode: profil se NEinjektuje (výslovnostní kouč, ne gramatika).
**Verifikace:** uměle ulož profil se 2 chybami → nová session → `console` network payload obsahuje blok (dev) / Aria stáčí konverzaci k tématu (smoke). `tsc` čistý.

### P0-3 — TEST_ME zapisuje výsledek (~1,5 h)

**Soubory:** `constants.ts` (TEST_ME prompt), `utils/levelUtils.ts` (NOVÝ, parser), `App.tsx`
**Prompt změna** (jen pro `level === 'TEST_ME'`):

```
When you are confident about the student's level (after 6–10 exchanges), announce
the verdict on ITS OWN line, EXACTLY in this format and nothing else on that line:
LEVEL: B1
(allowed values: A1, A2, B1, B2, C1 — never "almost B1", never "B1+")
Then congratulate the student briefly in Czech.
```

**Prompt↔parser kontrakt (advisor fix):** regex kotvit na začátek řádku — `/^LEVEL:\s*(A1|A2|B1|B2|C1)\s*$/m` — aby konverzační zmínka („you're close to level B1") nespustila falešný zápis. **Prerekvizita ověřena:** output transcript JE k dispozici (`outputAudioTranscription: {}` v useLiveAPI.ts:243 → `conversationLog`). **Fallback bez verdiktu:** po 12+ výměnách bez matche ukázat hint „Zeptej se: What is my level?"; když ani pak ne, žádný zápis — dnešní stav, žádné zhoršení.

**Parser:**

```ts
// utils/levelUtils.ts
const LEVEL_RE = /\bLEVEL:\s*(A1|A2|B1|B2|C1)\b/;
export const extractLevelVerdict = (text: string): EnglishLevel | null =>
  (text.match(LEVEL_RE)?.[1] as EnglishLevel) ?? null;
```

**Napojení (guard: jen když `settings.level === 'TEST_ME'`):**
- Legacy: v `handleSend` po přijetí `responseText`.
- Live: useEffect nad `liveRuntimeState.conversationMessages` (model zprávy) — stejný vzor jako vocab extrakce v `App.tsx:326–341`.
- Akce: `setSettings + saveSettings({ level })` → toast „🎉 Tvoje úroveň: B1" (nový lehký toast — vzor `addedToast` z ReadingModeView.tsx:33–41) → header přestane ukazovat „Assessment".
**Edge cases (rozhodnuto):** parser běží jen v TEST_ME módu → žádné false-positive mimo test; Aria řekne LEVEL jednou — pokud STT transcript slovo zkomolí, žák dokončí test znova (accept, no retry logika v MVP).
**Verifikace:** TEST_ME session → po verdiktu `localStorage.aria_app_settings` obsahuje nový level + header ukazuje „Level B1".

### P0-4 — Streak + denní cíl + „co dnes" na hlavní obrazovce (~1,5–2 h)

**Soubory:** `utils/dailyGoalUtils.ts` (NOVÝ), `App.tsx` (header), `AvatarView.tsx` (idle stav)
**Kostra:**

```ts
// utils/dailyGoalUtils.ts
export const getTodayMinutes = (history: LessonHistoryEntry[], liveMs: number): number => { /* endedAt dnes → sum speakingMs + liveMs */ };
export const getDailyGoal = (): number => { /* aria_daily_goal_v1, default 10 */ };
```

- **Header chip** (vedle usage donutu): `🔥 {streak} · {today}/{goal} min` — barva: šedá → zelená při splnění. Klik otevře Progress modal (existující).
- **Idle obrazovka** (AvatarView, disconnected stav, `displayedText` oblast): místo pouhého „Tap microphone to start" přidat řádek: `Dnes {today}/{goal} min · 🔥 {streak} · ↻ {dueCount} slovíček k opakování` + při `dueCount > 0` sekundární tlačítko „🎯 Procvičit slovíčka" (otevře VocabularyModal recall).
- Streak: existující `getProgressStats(lessonHistory).streakDays` — žádná nová logika.
- Goal nastavení: jednoduchý number input v SettingsModal (sekce Progress, 5–60 min).
**Přiznaný constraint (z auditu):** žádné push notifikace — bez backendu nejdou; toto je pasivní cue.
**Verifikace:** po 1 session dnes header ukazuje nenulové minuty; po splnění cíle zezelená; idle obrazovka ukazuje due count odpovídající slovníčku.

### ✅ Verifikační blok v1.9.0 (před release)

- [ ] `tsc --noEmit` 0 chyb, `bun run build` OK
- [ ] Smoke: Live konverzace end-to-end + summary se uloží + profil chyb roste (localStorage inspect)
- [ ] Smoke: TEST_ME → level uložen → další session už učí na levelu
- [ ] Smoke: reading exit oběma cestami ukládá historii
- [ ] Regression: slovíčka z v1.8.1 přežila migraci (srsLevel doplněn)
- [ ] `APP_VERSION` = v1.9.0 + release notes do `RELEASE_HISTORY` (česky, vzor constants.ts:2)

---

## RELEASE v1.10.0 — „Didaktika" (P1, ~10–13 h)

**Pořadí:** P1-13 → P1-12 → P1-7 → P1-8 → P1-10 → P1-11 → P1-9 (od nejlevnějších; P1-9 poslední — největší a sahá na App.tsx)

### P1-13 — UI hint: změny v Live vyžadují restart (~30 min)

**Soubory:** `App.tsx` (`handleSettingsSave`, ~396–439)
**Změna:** if `interactionMode === 'live-api'` && (levelChanged || strictnessChanged || translationChanged) && `liveRuntimeState.isConnected` → toast/banner „⚡ Změny se projeví po novém spuštění konverzace" + nabídka tlačítka „Restartovat teď" (volá existující `restartSessionNow`). Vzor textace: Reading menu „Platí od příštího spuštění" (ReadingModeView.tsx:268).
**Verifikace:** za běžící Live změň strictness → banner se ukáže; restart → nová přísnost se projevuje.

### P1-12 — Recast korekce v audiu (~45 min) ⚡reconnect

**Soubory:** `constants.ts` (strictness bloky 5–6 a 7–8)
**Změna:** do obou bloků přidat audio-směrnici (platí jen pro konverzaci, ne pro psaný chat — Gemini Live ji dostává tak jako tak; legacy chat ji ignoruje díky formulaci):

```
- IN SPOKEN CONVERSATION: prefer short RECASTS woven into your reply
  ("Oh, you *went* there yesterday? Nice!") instead of reading correction
  blocks aloud. Save detailed Czech explanations for the session summary.
```

Strictness 9–10 zůstává explicitní drill (záměr).
**Pozn.:** correctionCount regex (App.tsx:245) bude v Live chytat méně „💡 Correction" bloků → metrika trendu se posune; akceptováno — přesnější zdroj chyb je nyní learner profile (P0-1). Poznamenat do release notes.
**Verifikace:** strictness 6, Live, řekni chybnou větu → Aria opraví recastem v toku, ne blokem.

### P1-7 — Skutečné SRS (~2 h)

**Soubory:** `vocabularyUtils.ts` (recordRecallResult, isDueForRefresh, buildRecallQueue, migrateEntry), `VocabularyModal.tsx` (badge counts)
**Logika (rozhodnuto):**

```ts
// correct:  consecutiveCorrect++; srsLevel = min(srsLevel+1, 5);
//           dueAt = now + SRS_INTERVALS_DAYS[srsLevel]*DAY_MS;
//           status: consecutiveCorrect >= 3 ? 'mastered' : 'learning'
// incorrect: consecutiveCorrect = 0; srsLevel = 0; dueAt = now (dnes znovu); status 'learning'
// skip: bez změny srs, jen lastReviewedAt
```

- `isDueForRefresh` → `dueAt <= now` (nahrazuje fixních 7 dní).
- `buildRecallQueue`: due (dueAt ≤ now, vč. mastered) → learning ne-due → new; `includeAllMastered` zachovat.
- Mastered = 3 **po sobě jdoucí** správně (consecutiveCorrect) — opravuje rozpor s release notes v1.6.0.
**Verifikace:** unit-ish přes konzoli: slovo correct 3× → mastered, dueAt +16d; pak incorrect → learning, dueAt dnes. Migrace: staré entry dostaly srsLevel/dueAt (localStorage inspect).

### P1-8 — Produkční flashcards CZ→EN + audio + kontext (~2 h)

**Soubory:** `VocabularyModal.tsx` (recall view), `vocabularyUtils.ts` (contextSentence), `ReadingModeView.tsx`/`App.tsx` (předání věty při auto-add)
**Změny:**
- Recall mód: přepínač směru `EN→CZ | CZ→EN | Mix` (default Mix; produkční směr ukazuje definition, žák říká/píše slovo). U CZ→EN po flipu zobraz slovo + `contextSentence` (pokud je).
- 🔊 tlačítko na kartě → `speakManual(entry.word)` (hook `useTextToSpeech` už existuje — VocabularyModal ho dostane přes prop z App, NE novým importem hooku, ať hraje stejný hlas dle settings).
- `extractVocabFromTranscript` vrací nově `{ word, sentence }[]` — sentence = celá matchnutá výpověď (transcript slice ±60 znaků kolem matche); `addVocabularyWordWithDefinition` ukládá `contextSentence` při prvním přidání.
**Verifikace:** přidej slovo hlasem v reading → entry má contextSentence; recall v CZ→EN směru funguje; 🔊 přehraje slovo.

### P1-10 — Drill na practice sentences (~1,5 h)

**Soubory:** `components/DrillSheet.tsx` (NOVÝ), `ProgressModal.tsx` (tlačítko), `geminiService.ts` (eval fn)
**Flow (rozhodnuto — bez Live, levné):** modal s 3 větami ze `latestSummary.practiceSentences`. Per věta: 1) `speakManual(sentence)` přehraje vzor, 2) žák klikne mic → `useSpeechRecognition` přepíše, 3) **scoring na úrovni slov, ne znaků (advisor fix):** normalizace (lowercase, bez interpunkce, číslovky slovem) → shoda tokenů ≥ 80 % → ✅; jinak zvýraznit rozdílná slova a „zkus znovu" (max 2 pokusy, pak dál). Bez Gemini callu (šetří free tier). **Pozn.:** Web Speech API je prakticky Chrome-only a audio posílá na Google servery — mimo Gemini kvótu, ale není to offline; v UI neprezentovat jako offline funkci.
**Verifikace:** summary → Procvičit → 3 věty projdou flow; výsledek se ukáže (3/3).

### P1-11 — Progrese úrovně + progress bar k B1 (~1,5 h)

**Soubory:** `utils/levelUtils.ts` (rozšíření), `ProgressModal.tsx`
**Logika:**

```ts
const LEVEL_ORDER = ['A1','A2','B1','B2','C1'];
export const lessonsAtCurrentLevel = (history, sinceLevelSetAt): number => {...}
// nabídka re-testu: každých 10 lekcí na stejném levelu → banner v ProgressModal:
// „10 lekcí na A2 — otestovat posun?" → tlačítko přepne level na TEST_ME + restart (P0-3 parser dožene zbytek)
```

- Progress bar: cíl z TELOS = B1 (konstanta `TARGET_LEVEL = 'B1'`, později nastavitelná v Settings). Bar = pozice current levelu v LEVEL_ORDER vůči targetu + mezikroky z lekcí (např. 10 lekcí = 1 segment).
- Ukládat `levelSetAt` timestamp do settings při každé změně levelu (migrace: default now).
**Verifikace:** po nastavení levelu se bar vykreslí; po 10. lekci se objeví banner re-testu.

### P1-9 — Task-based scénáře (~3–4 h) ⚡reconnect

**Soubory:** `types.ts` (ScenarioTask), `constants.ts` (4 scénáře + prompt), `ScenarioSelector.tsx` (pre-start sheet), `geminiService.ts` (summary rozšíření), `ProgressModal.tsx` (checklist)
**Rozsah MVP (rozhodnuto):** tasky jen pro 4 scénáře: restaurant, shopping, doctor, creo-training. Ostatní zůstávají volný role-play.
**Změny:**
1. `SCENARIOS`: přidat `task` dle Datové modely §5 (goalCz, steps EN, keyPhrases).
2. `ScenarioSelector`: po výběru scénáře s taskem ukázat sheet: cíl česky + key phrases (s 🔊 přehráním) + „Start". Bez tasku → chování beze změny.
3. Prompt (scenarioBlock v `getSystemInstruction`): append

```
**TASK FOR THIS SESSION:** The student must accomplish: {steps}.
Guide the situation so these naturally come up. Do not check them off aloud.
```

4. `generateSessionSummary`: nový volitelný parametr `taskSteps` → JSON přidá `"taskCompleted": [true,false,...]`; `SessionSummary` typ rozšířit o `taskResults?: { step: string; done: boolean }[]`. ProgressModal vykreslí checklist ✅/❌.
**Verifikace:** restaurant task session → summary obsahuje checklist; scénář bez tasku beze změny chování.

### ✅ Verifikační blok v1.10.0

- [ ] `tsc` + build čisté; migrace slovíček znovu ověřena (z v1.9.0 dat)
- [ ] SRS cyklus: correct→interval roste, incorrect→reset (konzole + UI badge ↻)
- [ ] Drill + task checklist end-to-end smoke
- [ ] `APP_VERSION` v1.10.0 + release notes

---

## RELEASE v1.11.0 — „Polish" (P2 minus API, ~3–4 h)

### P2-14 — Přepisy lekcí + prohlížení (~2 h)

**Soubory:** `utils/transcriptUtils.ts` (NOVÝ — ring buffer dle Datové modely §4), `App.tsx` (oba finalizery ukládají), `ProgressModal.tsx` (detail lekce rozbalí přepis `<details>`)
**Kvóta:** try/catch na setItem; při QuotaExceeded shift nejstarší a retry 1×; pokud i tak selže, přeskočit (přepis je nice-to-have).
**Verifikace:** po session jde v Progress historii rozbalit přepis; 11. session vytlačí nejstarší.

### P2-15 — UI konzistence (~1,5 h)

**Soubory:** `LevelSelector.tsx`, `ProgressModal.tsx`, `App.tsx` (header), `AvatarView.tsx`
**Změny (checklist):**
- [ ] LevelSelector: přidat C2 (sync se SettingsModal) — `levels` pole `LevelSelector.tsx:8`
- [ ] ProgressModal: diakritika — „Zlepšení", „Zhoršení", „Stabilní", „Nedostatek dat", „Čas mluvení", „dnů", „Poslední lekce" (trendLabel + labels)
- [ ] Header ikony: sjednotit na SVG (🎭→ masky SVG, 📖/📚 — slovníček dostane odlišnou knihu s A/B glyfem nebo „Aa"; reading otevřená kniha) + `title` česky
- [ ] Stavové texty v AvatarView česky: „Klepni na mikrofon a začni" (EN texty jen tam, kde jsou učební obsah)
- [ ] „Paused (Live/Std)" idle label → „Připraveno (Live/Std)" — kolize se skutečnou pauzou
**Verifikace:** vizuální projití všech obrazovek (mobil šířka 360 px) — bez useknutých textů.

### ✅ Verifikační blok v1.11.0

- [ ] `tsc` + build + smoke všech 3 módů
- [ ] `APP_VERSION` v1.11.0 + release notes

---

## Rizika & mitigace

| Riziko | Dopad | Mitigace |
|--------|-------|----------|
| Prompt injekce zhorší konverzaci (Aria „vyučuje" místo mluví) | střední | Formulace „weave naturally, do NOT lecture"; cap 3 chyby + 5 slov; smoke test po P0-1/2 |
| Token růst promptu na free tier | nízký | Součet injekcí ~120 tokenů (profil ~45 + slovíčka ~35 + turn economy ~40); měřitelné v network tabu |
| TEST_ME verdikt se nepropíše (STT zkomolí „LEVEL: B1") | nízký | Pevný formát + standalone věta; guard jen v TEST_ME; fallback = ruční volba (dnešní stav, žádné zhoršení) |
| Migrace slovíček rozbije stará data | vysoký dopad, nízká pst. | Vše přes `migrateEntry` defaulty; testovat s reálným exportem localStorage před release |
| localStorage kvóta (přepisy) | nízký | Ring buffer 10×50 zpráv ≈ stovky kB; retry-with-evict |
| Recast snižuje correctionCount → trend metrika skočí | kosmetický | Poznámka v release notes; dlouhodobý zdroj = learner profile |
| App.tsx dál roste | střední | Pravidlo §1: nová logika v utils/; App.tsx jen wiring (P1-9 sheet jde do ScenarioSelector) |

## Co tento blueprint záměrně neřeší

- **P2-16 / API klíč v bundlu / CF Worker proxy** — na Tomův pokyn ignorováno; jediná zmínka zde.
- Push notifikace (bez backendu nejdou — pasivní cue v P0-4 je náhrada).
- Fonémový scoring výslovnosti, gamifikace, refaktoring App.tsx jako samostatný cíl (viz audit, sekce 08).

---

*Blueprint vychází z auditu `AUDIT_PEDAGOGICKY_2026-06-12.html`; evidence file:line odkazuje na stav v1.8.1 (commit 598a4c4). Při implementaci v pozdějším stavu repa ověřit čísla řádků.*
