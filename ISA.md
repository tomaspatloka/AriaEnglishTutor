---
task: "Blueprint v1.9.0 — Tutor s pamětí (P0×7 z pedagogického auditu)"
slug: 20260613-aria-blueprint-v190
project: AriaEnglishTutor
effort: E3
effort_source: classifier
phase: complete
progress: 44/44
mode: interactive
started: 2026-06-13T00:00:00Z
updated: 2026-06-13T00:00:00Z
---

## Problem

Pedagogický audit (`AUDIT_PEDAGOGICKY_2026-06-12.html`) odhalil 4 rozpojené učební
smyčky v AriaEnglishTutor v1.8.1. Aplikace technicky funguje, ale jako tutor neučí
soustavně: Aria mluví příliš (žák málo), slovíčka se sbírají ale nerecyklují do
konverzace, chyby žáka se nikam neukládají (každá session začíná „od nuly"), TEST_ME
zjistí úroveň ale nikam ji nezapíše, reading-mód metrika času mluvení započítává i
čas, kdy mluví Aria, a exit z reading přes header ztrácí session bez zápisu do historie.
Blueprint `BLUEPRINT_OPRAVY_2026-06-12.md` rozkládá opravy do 3 release řezů; tento ISA
pokrývá **řez v1.9.0 (P0×7)**.

## Vision

Po v1.9.0 je Aria tutor s pamětí: pamatuje si opakované chyby žáka napříč sessions a
nenápadně je vplétá do konverzace; recykluje slovíčka, která se žák učí; drží krátké
repliky a nutí žáka mluvit; reading-mód měří poctivě jen čas žáka a nikdy neztratí
session; TEST_ME verdikt se propíše do nastavení a další lekce už jede na zjištěné
úrovni; hlavní obrazovka ukazuje streak + denní cíl + slovíčka k opakování. Žák
otevře appku zítra a ona ví, kde včera skončil.

## Out of Scope

- **P2-16 / API klíč v bundlu / CF Worker proxy** — na Tomův pokyn explicitně vynecháno.
- Release v1.10.0 (P1 didaktika) a v1.11.0 (P2 polish) — samostatné řezy, ne tato session.
- Push notifikace (bez backendu nejdou — denní cíl v P0-4 je pasivní náhrada).
- Refaktoring App.tsx jako samostatný cíl; fonémový scoring výslovnosti; gamifikace.

## Principles

- Nová logika do `utils/` modulů, ne do App.tsx (monolit ~966 ř. se nesmí nafukovat).
- Všechny nové localStorage klíče verzované (`aria_*_v1`), čtené přes try/catch + shape-validaci.
- Live API `systemInstruction` je immutable → změna promptu se projeví až reconnectem (⚡reconnect).
- Token budget promptových injekcí: hot-path součet ~110 tok < cap 120 (free tier).
- Po každé položce: `tsc --noEmit` čistý + `bun run build` OK + commit per položka.

## Constraints

- Stack beze změny: React 19 + Vite + Tailwind, `@google/genai` v2.6.0, free tier.
- Projekt nemá `@types/react` → tsc validuje jen syntakticky (React je typově `any`).
- Verifikace na WSL hostu: Interceptor ani agent-browser nejsou → artefaktové ověření
  (tsc + build + grep + code-inspect), vizuální render NEověřitelný (přiznáno v reportu).
- Zpětná kompatibilita localStorage dat z v1.8.1 — migrace přes `migrateEntry` defaulty.

## Goal

Implementovat 7 P0 položek blueprintu v pořadí závislostí (P0-5 → P0-6 → P0-7 → P0-2 →
P0-1 → P0-3 → P0-4) do release v1.9.0, každou s čistým `tsc` + `bun run build` a vlastním
commitem. Po dokončení appka pamatuje chyby žáka, recykluje slovíčka, drží krátké repliky,
poctivě měří reading, neztrácí session, propisuje TEST_ME verdikt a zobrazuje denní cíl.

## Criteria

### P0-5 — Poctivá metrika mluvení
- [x] ISC-1: `App.tsx` `voiceActive` NEobsahuje `liveRuntimeState.isSpeaking` (čas Arie se nepočítá)
- [x] ISC-2: useEffect dependency array pro voiceActive už nemá `liveRuntimeState.isSpeaking`
- [x] ISC-3: `ReadingModeView` měří vlastní `userTalkingMs` přes ref (akumulace kdy `isUserTalking`)
- [x] ISC-4: `onExit`/session objekt nese `userTalkingMs: number`
- [x] ISC-5: `finalizeReadingSession` použije `session.userTalkingMs` pro `speakingMs` (ne `durationMs`)

### P0-6 — Exit z Reading přes header neztrácí session
- [x] ISC-6: `ReadingModeView` má prop `onSessionUpdate(session)` a hlásí průběžně přes useEffect
- [x] ISC-7: `App.tsx` drží `readingSessionRef` aktualizovaný z `onSessionUpdate`
- [x] ISC-8: header `exitReadingMode()` použije `readingSessionRef.current` (ne MouseEvent argument)
- [x] ISC-9: Anti: „← Zpět" cesta i header 📚 cesta obě vedou na finalizaci se stejnými daty

### P0-7 — Output-forcing prompt (⚡reconnect)
- [x] ISC-10: `getSystemInstruction` Core Rules obsahuje „Turn economy" blok (krátké repliky, končit otázkou)
- [x] ISC-11: blok platí pro všechny levely i scénáře (je v base prompt, ne v conditionalu)

### P0-2 — Recyklace slovíček do konverzace (⚡reconnect)
- [x] ISC-12: `vocabularyUtils.ts` exportuje `buildFocusWords(entries, max=5): string[]` (jen lemma)
- [x] ISC-13: `buildFocusWords` prioritizuje `learning` před `new`, slice max
- [x] ISC-14: `getSystemInstruction` má nový param `focusWords: string[]` + VOCABULARY RECYCLING blok
- [x] ISC-15: blok se vloží jen když `focusWords.length > 0` (token economy mimo prázdný stav)
- [x] ISC-16: `useLiveAPI.ts` spočítá focusWords z `loadVocabulary()` při connect a předá do getSystemInstruction
- [x] ISC-17: `geminiService.ts initializeChat` přijímá + předává focusWords (legacy cesta)
- [x] ISC-18: `App.tsx` legacy init předává focusWords do initializeChat

### P0-1 — Profil chyb → system prompt (⚡reconnect)
- [x] ISC-19: NOVÝ `utils/learnerProfileUtils.ts` s `ERROR_TAGS` uzavřenou taxonomií (12 tagů)
- [x] ISC-20: `LearnerProfile`/`LearnerError` interface dle blueprintu §1, klíč `aria_learner_profile_v1`
- [x] ISC-21: `mergeSummaryIntoProfile(errorTags)` — exact-tag agregace, count++, example přepis
- [x] ISC-22: `getTopErrors(max=3)` — load → decay 30d wall-time → sort count desc → slice
- [x] ISC-23: load/save přes try/catch + shape-validace neznámého tagu → 'other'
- [x] ISC-24: `generateSessionSummary` prompt rozšířen o `errorTags` výčtem povolených tagů
- [x] ISC-25: `SessionSummary` typ má `errorTags?: { tag: string; example: string }[]`
- [x] ISC-26: parsing summary validuje tag proti taxonomii, neznámý → 'other', chybějící → []
- [x] ISC-27: `App.tsx` oba finalizery volají `mergeSummaryIntoProfile(summary.errorTags ?? [])`
- [x] ISC-28: `getSystemInstruction` param `recurringErrors: string[]` + WEAKNESSES blok
- [x] ISC-29: Anti: reading mód profil NEinjektuje (getReadingSystemInstruction beze změny)

### P0-3 — TEST_ME zapisuje výsledek
- [x] ISC-30: NOVÝ `utils/levelUtils.ts` `extractLevelVerdict(text): EnglishLevel | null`
- [x] ISC-31: regex kotvený na celý řádek `/^LEVEL:\s*(A1|A2|B1|B2|C1)\s*$/m` (advisor fix — konverzační zmínka „you're close to B1" nespustí zápis; ověřeno 7/7 unit testem)
- [x] ISC-32: `constants.ts` TEST_ME-only prompt blok s formátem `LEVEL: B1` na vlastním řádku
- [x] ISC-33: `App.tsx` extrakce běží jen když `settings.level === 'TEST_ME'` (guard)
- [x] ISC-34: verdikt → `setSettings + saveSettings({ level })` + toast + header přestane „Assessment"
- [x] ISC-35: Live cesta — useEffect nad model zprávami; Legacy cesta — po responseText v handleSend

### P0-4 — Streak + denní cíl + „co dnes"
- [x] ISC-36: NOVÝ `utils/dailyGoalUtils.ts` `getTodayMinutes(history, liveMs)` + `getDailyGoal()`
- [x] ISC-37: klíč `aria_daily_goal_v1` default 10, `todayMinutes` se NEukládá (počítá z historie)
- [x] ISC-38: header chip `🔥 {streak} · {today}/{goal} min`, zezelená při splnění, klik → Progress
- [x] ISC-39: idle obrazovka (AvatarView disconnected) ukazuje dnes/cíl + due slovíček count
- [x] ISC-40: goal number input v SettingsModal (5–60 min)

### Global
- [x] ISC-41: Anti: žádná nová logika nepřibyla do App.tsx mimo wiring (utils-first princip)
- [x] ISC-42: `APP_VERSION` = v1.9.0 + RELEASE_HISTORY záznam (česky)
- [x] ISC-43: `tsc --noEmit` 0 chyb po každé položce
- [x] ISC-44: `bun run build` OK po každé položce

## Test Strategy

| isc | type | check | tool |
|-----|------|-------|------|
| ISC-1,2 | grep | `rg "isSpeaking" App.tsx` voiceActive řádek bez něj | Grep |
| ISC-3,4,5 | read | userTalkingMs ref + session pole + finalizer | Read |
| ISC-6,7,8 | read | onSessionUpdate prop + readingSessionRef + header použití | Read |
| ISC-10,11 | grep | `rg "Turn economy" constants.ts` v base promptu | Grep |
| ISC-12,13 | grep | `rg "buildFocusWords" vocabularyUtils.ts` | Grep |
| ISC-14,15,16,17,18 | read | focusWords param napříč 4 soubory | Read |
| ISC-19..23 | read | learnerProfileUtils.ts struktura + taxonomie | Read |
| ISC-24,25,26 | read | summary kontrakt errorTags | Read |
| ISC-27,28,29 | grep | mergeSummaryIntoProfile volání + WEAKNESSES blok | Grep |
| ISC-30,31 | bash | `bun -e` test extractLevelVerdict na sample stringech | Bash |
| ISC-32,33,34,35 | read | TEST_ME prompt + guard + zápis | Read |
| ISC-36..40 | read | dailyGoalUtils + chip + idle + settings | Read |
| ISC-42 | grep | `rg "v1.9.0" constants.ts` | Grep |
| ISC-43 | bash | `tsc --noEmit` exit 0 | Bash |
| ISC-44 | bash | `bun run build` exit 0 | Bash |

## Features

| name | satisfies | depends_on | parallelizable |
|------|-----------|------------|----------------|
| P0-5-SpeakingMetric | ISC-1..5 | — | false |
| P0-6-ReadingExit | ISC-6..9 | P0-5 | false |
| P0-7-TurnEconomy | ISC-10,11 | — | false |
| P0-2-VocabRecycle | ISC-12..18 | P0-7 | false |
| P0-1-ErrorProfile | ISC-19..29 | P0-2 | false |
| P0-3-LevelVerdict | ISC-30..35 | — | false |
| P0-4-DailyGoal | ISC-36..40 | — | false |
| Release | ISC-41..44 | all | false |

## Decisions

- 2026-06-13: ISA přepsán z předchozího bug-fix tasku (20260524, complete) na blueprint
  v1.9.0 práci. Project ISA je living — staré ISC archivovány do git historie tohoto souboru.
- 2026-06-13: **Delegation floor (E3 ≥2) relaxován — show your math.** Forge/paralelní
  agenti by kolidovali: 6 ze 7 položek sahá na sdílené hot-path soubory (`App.tsx`,
  `constants.ts getSystemInstruction`, `useLiveAPI.ts`). Sekvenční single-author editace je
  bezpečnější než worktree-merge konflikty na getSystemInstruction (mění ho P0-7, P0-2, P0-1).
- 2026-06-13: **Rozsah session.** Blueprint v1.9.0 = ~6–8 h reálně, přes E3 budget. Cílím
  ucelený commitnutý řez (co nejvíc P0 položek plně + tsc/build/commit per položka).
  Klíčový kontext-signál: Tom se frustruje z neúplných odpovědí → radši méně položek PLNĚ
  než všech 7 rozdělaných.

### Historie předchozích řezů (v1.8.x, zhuštěno)

- 2026-05-24: První project ISA — 3 bug fixes (TTS voice selection, line-clamp, console.log), 34/34 ISC.
- 2026-06-11: P1 dávka — console.log v useLiveAPI odstraněn, ErrorBoundary přidán, usageUtils try/catch.
- 2026-06-11: P2 dávka → v1.8.1 — localStorage hardening, VirtualAvatar timer cleanup, verze srovnána.
- 2026-06-11: Vendor code-splitting (653→333 kB). Verify artefaktový (WSL bez browseru), push origin/main.

## Changelog

- **conjectured:** getSystemInstruction lze rozšířit o focusWords+recurringErrors jako optional
  poziční params za scenario bez rozbití existujících 4-arg volání.
  **refuted_by:** nic — konjektura držela; tsc by chytil chybějící aktualizaci call-site (funkce
  je typovaná), ale advisor správně varoval, že prohození dvou `string[]` params projde tsc.
  **learned:** u >4 pozičních params stejného typu je vizuální kontrola call-sites povinná —
  kompilátor neochrání před sémantickým swapem. Oba call-sites ověřeny ručně.
  **criterion_now:** ISC-16/17/18/28 ověřeny i čtením pořadí argumentů, ne jen existencí.

- **conjectured:** state-updater guard (`if prev.level !== 'TEST_ME' return prev`) stačí pro
  idempotenci aplikace level verdiktu.
  **refuted_by:** advisor — Live conversationMessages se mění po chuncích; useEffect může
  matchnout tentýž verdikt vícekrát, updater-guard ochrání zápis, ale toast/side-effect proběhne víckrát.
  **learned:** pro side-effecty mimo state updater je nutný synchronní ref-guard nastavený PŘED
  setSettings, resetovaný na začátku nové session.
  **criterion_now:** P0-3 zpevněn `levelVerdictAppliedRef` (commit 8. fix).

## Verification

- ISC-1,2: Grep — `App.tsx:190 const voiceActive = isListening || liveRuntimeState.isUserTalking` (bez isSpeaking), deps `[isListening, liveRuntimeState.isUserTalking]`.
- ISC-3,4,5: Read — `ReadingModeView` `userTalkingMs`Ref + `getCurrentUserTalkingMs`; session pole `userTalkingMs`; `finalizeReadingSession` `speakingMs: session.userTalkingMs`.
- ISC-6,7,8,9: Read — `onSessionUpdate` prop + useEffect nad conversationLog; `readingSessionRef` v App; `exitReadingMode` fallback na ref; obě cesty na `finalizeReadingSession`.
- ISC-10,11: Grep — `rg -c "Turn economy" constants.ts` = 1, v base Core Rules (mimo conditionaly/scenarioBlock).
- ISC-12..18: Grep+Read — `buildFocusWords` export; getSystemInstruction param + vocabBlock guard; useLiveAPI connect spočítá z loadVocabulary; geminiService+App init předávají.
- ISC-19..29: Read — `learnerProfileUtils.ts` ERROR_TAGS×12, mergeSummaryIntoProfile exact-tag, getTopErrors decay 30d, try/catch; summary kontrakt errorTags; `mergeSummaryIntoProfile` 2× v finalizerech; reading větev `getReadingSystemInstruction(correctionLang, referenceText)` bez injekce (grep=1).
- ISC-30,31: **Unit test 7/7** — verdikt na vlastním řádku matchne, konverzační zmínka/„almost B1+"/C2 NEmatchne.
- ISC-32,33,34,35: Read — testMeBlock jen level==='TEST_ME'; guard v Live useEffect + Legacy handleSend; applyLevelVerdict setSettings+saveSettings+toast; ref-guard.
- ISC-36,37: Read — `dailyGoalUtils.ts` getTodayMinutes z historie (todayMinutes neukládán), getDailyGoal default 10 klíč `aria_daily_goal_v1`.
- ISC-38,39,40: **Code-verified, browser-DEFERRED** (WSL bez browseru) — header chip, AvatarView idle cue, SettingsModal slider 5–60. Vizuální render neověřen; tsc+build OK. Follow-up: Tomův manuální smoke dle blueprint checklistu.
- ISC-41: Read — nová logika v utils/ (learnerProfile/level/dailyGoal/vocab); App.tsx jen wiring.
- ISC-42: Grep — APP_VERSION "v1.9.0" + RELEASE_HISTORY záznam; package.json 1.9.0; v1.9.0 zapečeno v bundlu.
- ISC-43,44: Bash — `tsc --noEmit` exit 0, `bun run build` exit 0 po každé položce (8 commitů).

**Doctrine:** Rule 1 — user-facing UI ISC (38/39/40) browser-DEFERRED, přiznáno (platforma bez Interceptoru/agent-browseru); kód+build verified. Rule 2 — advisor volán, vychytal ref-guard (P0-3) → opraveno. Rule 2a (Cato) — E3, neaplikuje se. Rule 3 — žádný konflikt.

**Vědomě odložené (nad rámec jádra P0, ne regrese):** fallback hint TEST_ME po 12+ výměnách bez verdiktu (blueprint P0-3 sekundární UX) — bez něj zůstává dnešní stav (žádný falešný zápis). Behaviorální ověření promptových injekcí (Aria reálně recykluje slova / cílí na slabiny) vyžaduje živou Gemini session → Tomův smoke test.
