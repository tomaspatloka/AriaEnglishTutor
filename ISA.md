---
task: "Blueprint v1.9.0 — Tutor s pamětí (P0×7 z pedagogického auditu)"
slug: 20260613-aria-blueprint-v190
project: AriaEnglishTutor
effort: E3
effort_source: classifier
phase: execute
progress: 18/44
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
- [ ] ISC-1: `App.tsx` `voiceActive` NEobsahuje `liveRuntimeState.isSpeaking` (čas Arie se nepočítá)
- [ ] ISC-2: useEffect dependency array pro voiceActive už nemá `liveRuntimeState.isSpeaking`
- [ ] ISC-3: `ReadingModeView` měří vlastní `userTalkingMs` přes ref (akumulace kdy `isUserTalking`)
- [ ] ISC-4: `onExit`/session objekt nese `userTalkingMs: number`
- [ ] ISC-5: `finalizeReadingSession` použije `session.userTalkingMs` pro `speakingMs` (ne `durationMs`)

### P0-6 — Exit z Reading přes header neztrácí session
- [ ] ISC-6: `ReadingModeView` má prop `onSessionUpdate(session)` a hlásí průběžně přes useEffect
- [ ] ISC-7: `App.tsx` drží `readingSessionRef` aktualizovaný z `onSessionUpdate`
- [ ] ISC-8: header `exitReadingMode()` použije `readingSessionRef.current` (ne MouseEvent argument)
- [ ] ISC-9: Anti: „← Zpět" cesta i header 📚 cesta obě vedou na finalizaci se stejnými daty

### P0-7 — Output-forcing prompt (⚡reconnect)
- [ ] ISC-10: `getSystemInstruction` Core Rules obsahuje „Turn economy" blok (krátké repliky, končit otázkou)
- [ ] ISC-11: blok platí pro všechny levely i scénáře (je v base prompt, ne v conditionalu)

### P0-2 — Recyklace slovíček do konverzace (⚡reconnect)
- [ ] ISC-12: `vocabularyUtils.ts` exportuje `buildFocusWords(entries, max=5): string[]` (jen lemma)
- [ ] ISC-13: `buildFocusWords` prioritizuje `learning` před `new`, slice max
- [ ] ISC-14: `getSystemInstruction` má nový param `focusWords: string[]` + VOCABULARY RECYCLING blok
- [ ] ISC-15: blok se vloží jen když `focusWords.length > 0` (token economy mimo prázdný stav)
- [ ] ISC-16: `useLiveAPI.ts` spočítá focusWords z `loadVocabulary()` při connect a předá do getSystemInstruction
- [ ] ISC-17: `geminiService.ts initializeChat` přijímá + předává focusWords (legacy cesta)
- [ ] ISC-18: `App.tsx` legacy init předává focusWords do initializeChat

### P0-1 — Profil chyb → system prompt (⚡reconnect)
- [ ] ISC-19: NOVÝ `utils/learnerProfileUtils.ts` s `ERROR_TAGS` uzavřenou taxonomií (12 tagů)
- [ ] ISC-20: `LearnerProfile`/`LearnerError` interface dle blueprintu §1, klíč `aria_learner_profile_v1`
- [ ] ISC-21: `mergeSummaryIntoProfile(errorTags)` — exact-tag agregace, count++, example přepis
- [ ] ISC-22: `getTopErrors(max=3)` — load → decay 30d wall-time → sort count desc → slice
- [ ] ISC-23: load/save přes try/catch + shape-validace neznámého tagu → 'other'
- [ ] ISC-24: `generateSessionSummary` prompt rozšířen o `errorTags` výčtem povolených tagů
- [ ] ISC-25: `SessionSummary` typ má `errorTags?: { tag: string; example: string }[]`
- [ ] ISC-26: parsing summary validuje tag proti taxonomii, neznámý → 'other', chybějící → []
- [ ] ISC-27: `App.tsx` oba finalizery volají `mergeSummaryIntoProfile(summary.errorTags ?? [])`
- [ ] ISC-28: `getSystemInstruction` param `recurringErrors: string[]` + WEAKNESSES blok
- [ ] ISC-29: Anti: reading mód profil NEinjektuje (getReadingSystemInstruction beze změny)

### P0-3 — TEST_ME zapisuje výsledek
- [ ] ISC-30: NOVÝ `utils/levelUtils.ts` `extractLevelVerdict(text): EnglishLevel | null`
- [ ] ISC-31: regex kotvený `/\bLEVEL:\s*(A1|A2|B1|B2|C1)\b/` (konverzační zmínka nespustí zápis)
- [ ] ISC-32: `constants.ts` TEST_ME-only prompt blok s formátem `LEVEL: B1` na vlastním řádku
- [ ] ISC-33: `App.tsx` extrakce běží jen když `settings.level === 'TEST_ME'` (guard)
- [ ] ISC-34: verdikt → `setSettings + saveSettings({ level })` + toast + header přestane „Assessment"
- [ ] ISC-35: Live cesta — useEffect nad model zprávami; Legacy cesta — po responseText v handleSend

### P0-4 — Streak + denní cíl + „co dnes"
- [ ] ISC-36: NOVÝ `utils/dailyGoalUtils.ts` `getTodayMinutes(history, liveMs)` + `getDailyGoal()`
- [ ] ISC-37: klíč `aria_daily_goal_v1` default 10, `todayMinutes` se NEukládá (počítá z historie)
- [ ] ISC-38: header chip `🔥 {streak} · {today}/{goal} min`, zezelená při splnění, klik → Progress
- [ ] ISC-39: idle obrazovka (AvatarView disconnected) ukazuje dnes/cíl + due slovíček count
- [ ] ISC-40: goal number input v SettingsModal (5–60 min)

### Global
- [ ] ISC-41: Anti: žádná nová logika nepřibyla do App.tsx mimo wiring (utils-first princip)
- [ ] ISC-42: `APP_VERSION` = v1.9.0 + RELEASE_HISTORY záznam (česky)
- [ ] ISC-43: `tsc --noEmit` 0 chyb po každé položce
- [ ] ISC-44: `bun run build` OK po každé položce

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

(zapisuje se v LEARN — konjektura/refutace/learning)

## Verification

(zapisuje se v EXECUTE/VERIFY — evidence per ISC)
