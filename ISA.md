---
task: "Blueprint v1.10.0 — Didaktika (P1×7 z pedagogického auditu)"
slug: 20260613-aria-blueprint-v1100
project: AriaEnglishTutor
effort: E3
effort_source: context-override
phase: complete
progress: 38/38
mode: interactive
started: 2026-06-13T00:00:00Z
updated: 2026-06-13T00:00:00Z
---

## Problem

Po v1.9.0 („Tutor s pamětí") appka pamatuje chyby a recykluje slovíčka, ale didaktické
smyčky jsou stále mělké: SRS je jen „7 dní fixně" (ne skutečné spaced repetition),
flashcards jdou jen EN→CZ (chybí produkční směr CZ→EN + audio + kontext), korekce v Live
audiu se čtou jako bloky místo přirozených recastů, scénáře jsou volný role-play bez úkolu,
změny nastavení za běžící Live session tiše nezaberou (bez upozornění), a chybí progrese
úrovně k cíli B1. Blueprint `BLUEPRINT_OPRAVY_2026-06-12.md` řez **v1.10.0 (P1×7)**.

## Vision

Aria učí didakticky správně: slovíčka se vrací v rostoucích intervalech (1/3/7/16/35/90 dní),
flashcards procvičují produkci (řekni slovo z překladu) s audiem i větou v kontextu, Aria
opravuje recastem ve toku řeči, scénáře mají splnitelný úkol s checklistem, uživatel vidí
postup k B1 a ví, kdy se přetestovat, a změny za běhu Live ho upozorní na nutný restart.

## Out of Scope

- **P2-16 / API klíč / CF Worker** — Tomův pokyn, vynecháno.
- Release v1.11.0 (P2 polish) — samostatný řez.
- Fonémový scoring výslovnosti, gamifikace, refaktoring App.tsx jako cíl.

## Principles

- Nová logika do `utils/`, App.tsx jen wiring (P1-9 sheet do ScenarioSelector).
- SRS pole verzovaná, migrace přes `migrateEntry` — anti-lavinová (dueAt z lastReviewedAt, ne now).
- Live `systemInstruction` immutable (⚡reconnect): P1-12, P1-9 mají reconnect značku.
- Drill/scoring bez Gemini callu kde to jde (free tier) — Web Speech API klient.
- `tsc --noEmit` + `bun run build` + commit per položka.

## Constraints

- Stack beze změny (React 19, @google/genai 2.6.0, free tier). Bez `@types/react` (tsc syntaktický).
- WSL host bez Interceptoru/agent-browseru → artefaktové ověření (tsc+build+grep+unit), UI browser-deferred.
- Zpětná kompatibilita: slovíčka z v1.9.0 musí přežít SRS migraci bez ztráty a bez due-laviny.

## Goal

Implementovat 7 P1 položek (P1-13 → P1-12 → P1-7 → P1-8 → P1-10 → P1-11 → P1-9) do
release v1.10.0, každou s čistým tsc+build a commitem. SRS s reálnými intervaly, produkční
flashcards CZ→EN s audiem+kontextem, recast korekce, task-based scénáře s checklistem,
progrese k B1, a restart-hint za běhu Live.

## Criteria

### P1-13 — UI hint: změny v Live vyžadují restart
- [x] ISC-1: `handleSettingsSave` při live-api + (level/strictness/translation changed) + isConnected → banner/toast
- [x] ISC-2: nabídka tlačítka „Restartovat teď" volá `restartSessionNow(newSettings)`
- [x] ISC-3: Anti: v legacy/reading módu se hint NEukazuje

### P1-12 — Recast korekce v audiu (⚡reconnect)
- [x] ISC-4: strictness blok 5–6 obsahuje audio recast směrnici (spoken conversation → recast)
- [x] ISC-5: strictness blok 7–8 obsahuje totéž
- [x] ISC-6: Anti: strictness 9–10 zůstává explicitní drill (beze změny)

### P1-7 — Skutečné SRS
- [x] ISC-7: `VocabularyEntry` má `srsLevel, dueAt, consecutiveCorrect` + `contextSentence?`
- [x] ISC-8: `SRS_INTERVALS_DAYS = [1,3,7,16,35,90]` konstanta
- [x] ISC-9: `migrateEntry` backfill: srsLevel mastered?2:0, consecutiveCorrect mastered?3:0
- [x] ISC-10: migrace `dueAt = (lastReviewedAt ?? addedAt) + INTERVALS[srsLevel]*DAY_MS` (NE now — anti-lavina)
- [x] ISC-11: `recordRecallResult` correct: consecutiveCorrect++, srsLevel=min(+1,5), dueAt=now+INTERVAL, mastered při ≥3
- [x] ISC-12: incorrect: consecutiveCorrect=0, srsLevel=max(0,-2) (lapse step-back, ne reset), dueAt=now
- [x] ISC-13: skip: jen lastReviewedAt, beze změny SRS
- [x] ISC-14: `isDueForRefresh` → `dueAt <= now` (nahrazuje fixních 7 dní)
- [x] ISC-15: `buildRecallQueue`: due (dueAt≤now vč. mastered) → learning ne-due → new; includeAllMastered zachován
- [x] ISC-16: Anti: mastered = 3 PO SOBĚ (consecutiveCorrect), ne kumulativní count

### P1-8 — Produkční flashcards CZ→EN + audio + kontext
- [x] ISC-17: recall mód má přepínač směru EN→CZ | CZ→EN | Mix (default Mix)
- [x] ISC-18: CZ→EN po flipu ukáže slovo + contextSentence (pokud je)
- [x] ISC-19: 🔊 tlačítko na kartě → speakManual(word) přes prop z App (ne nový import hooku)
- [x] ISC-20: `extractVocabFromTranscript` vrací i kontextovou větu pro contextSentence
- [x] ISC-21: `addVocabularyWordWithDefinition`/add ukládá contextSentence při prvním přidání

### P1-10 — Drill na practice sentences
- [x] ISC-22: NOVÝ `components/DrillSheet.tsx` — 3 věty z latestSummary.practiceSentences
- [x] ISC-23: per věta: speakManual(vzor) → mic → speech recognition přepis
- [x] ISC-24: scoring na úrovni slov (tokeny, normalizace), shoda ≥80% → ✅, max 2 pokusy
- [x] ISC-25: bez Gemini callu (Web Speech API klient, šetří free tier)
- [x] ISC-26: tlačítko v ProgressModal otevře drill

### P1-11 — Progrese úrovně + progress bar k B1
- [x] ISC-27: `levelUtils` `lessonsAtCurrentLevel(history, sinceLevelSetAt)`
- [x] ISC-28: `TARGET_LEVEL='B1'` konstanta + progress bar (pozice v LEVEL_ORDER vůči targetu)
- [x] ISC-29: re-test banner v ProgressModal po 10 lekcích na stejném levelu → TEST_ME + restart
- [x] ISC-30: `levelSetAt` timestamp do settings při změně levelu (migrace default now)

### P1-9 — Task-based scénáře (⚡reconnect)
- [x] ISC-31: `ScenarioTask` typ (goalCz, steps[], keyPhrases[]); `Scenario.task?`
- [x] ISC-32: 4 scénáře (restaurant, shopping, doctor, creo-training) mají task
- [x] ISC-33: `ScenarioSelector` pre-start sheet: cíl CZ + key phrases (🔊) + Start; bez tasku beze změny
- [x] ISC-34: prompt scenarioBlock append TASK FOR THIS SESSION (steps)
- [x] ISC-35: `generateSessionSummary` taskSteps → taskResults[]; ProgressModal checklist ✅/❌

### Global
- [x] ISC-36: Anti: slovíčka z v1.9.0 přežijí SRS migraci (žádná ztráta, žádná due-lavina)
- [x] ISC-37: `APP_VERSION` = v1.10.0 + RELEASE_HISTORY (česky), package.json 1.10.0
- [x] ISC-38: `tsc --noEmit` 0 + `bun run build` OK po každé položce

## Test Strategy

| isc | type | check | tool |
|-----|------|-------|------|
| ISC-1,2,3 | read | handleSettingsSave live-api guard + restart tlačítko | Read |
| ISC-4,5,6 | grep | recast směrnice v strictness blocích 5-6/7-8, 9-10 beze změny | Grep |
| ISC-7,8 | grep | VocabularyEntry SRS pole + INTERVALS konstanta | Grep |
| ISC-9,10,16,36 | bash | unit test migrateEntry: backfill + dueAt anti-lavina | Bash |
| ISC-11,12,13,14,15 | bash | unit test recordRecallResult cyklus | Bash |
| ISC-17,18,19,20,21 | read | recall směr přepínač + audio + contextSentence | Read |
| ISC-22..26 | read | DrillSheet flow + word-scoring + ProgressModal tlačítko | Read |
| ISC-27,28,29,30 | read | levelUtils progrese + bar + re-test banner | Read |
| ISC-31..35 | read | ScenarioTask + sheet + prompt + summary checklist | Read |
| ISC-37 | grep | v1.10.0 version | Grep |
| ISC-38 | bash | tsc + build | Bash |

## Features

| name | satisfies | depends_on | parallelizable |
|------|-----------|------------|----------------|
| P1-13-RestartHint | ISC-1,2,3 | — | false |
| P1-12-Recast | ISC-4,5,6 | — | false |
| P1-7-SRS | ISC-7..16,36 | — | false |
| P1-8-Flashcards | ISC-17..21 | P1-7 | false |
| P1-10-Drill | ISC-22..26 | — | false |
| P1-11-LevelProgress | ISC-27..30 | — | false |
| P1-9-TaskScenarios | ISC-31..35 | — | false |
| Release | ISC-37,38 | all | false |

## Decisions

- 2026-06-13: ISA navazuje na v1.9.0 (complete, 44/44 ISC — viz git historie ISA.md a commity feat(blueprint P0-*)).
- 2026-06-13: Aplikuji čerstvou gotcha — po advisor `cd ~/.claude` vždy prefix `cd <project>` u git/build.
- 2026-06-13: Delegation floor relaxován (show-your-math) — sdílené hot-path soubory (vocabularyUtils,
  VocabularyModal, constants, App) napříč položkami → sekvenční single-author bezpečnější než worktree merge.

### Historie (v1.9.0 a dřív, zhuštěno)

- 2026-06-13: **v1.9.0 „Tutor s pamětí"** — 7 P0 položek (poctivá metrika, reading exit, turn economy,
  recyklace slovíček, profil chyb, TEST_ME verdikt, denní cíl), 44/44 ISC, advisor ref-guard fix.
- 2026-05/06: v1.8.x — bug fixes (TTS, line-clamp), P1/P2 robustnost, vendor code-splitting.

## Changelog

- **conjectured:** `tsc 0` stačí jako důkaz, že SRS migrace nerozbije stará data.
  **refuted_by:** advisor — tsc hlídá jen místa, kde entry *konstruuješ*; deserializovaná
  localStorage data se nasypou do typu, ale pole tam za běhu chybí (undefined → NaN).
  **learned:** migrace povinných polí se testuje smazáním pole z reálného záznamu a reloadem,
  ne kompilátorem. Proto byl napsán unit test se starými daty bez SRS polí (11/11).
  **criterion_now:** ISC-9/10/36 ověřeny unit testem nad raw daty, ne tsc.

- **conjectured:** české typografické uvozovky „…" jdou volně psát do TS string literálů.
  **refuted_by:** `tsc TS1002 Unterminated string literal` — zavírací U+201C splynula vizuálně,
  ale ASCII `"` v textu ukončil JS string předčasně (release notes řádek 14).
  **learned:** v double-quote TS stringech s českým textem nepoužívat vnitřní `"` vůbec;
  přeformulovat nebo `'`. Chyba se projeví až při tsc, ne při psaní.
  **criterion_now:** release notes ověřeny tsc PŘED commitem (chyba zachycena, nezacommitnuta).

## Verification

- ISC-1,2,3: Read — `handleSettingsSave` live-api+isConnected → `restartHint`; banner s „Restartovat teď" → `restartSessionNow`; legacy/reading nezobrazí.
- ISC-4,5,6: Grep — `rg -c "prefer short RECASTS" constants.ts` = 2 (strictness 5-6, 7-8); 9-10 blok beze změny.
- ISC-7,8: Grep — VocabularyEntry srsLevel/dueAt/consecutiveCorrect/contextSentence; `SRS_INTERVALS_DAYS = [1,3,7,16,35,90]`.
- ISC-9..16,36: **Unit test 11/11** — migrace mastered→srsLevel2/cc3/dueAt=lastReviewed+7d, new→dueAt=addedAt+1d (anti-lavina, různá dueAt); recall 3×correct→mastered/srsLevel3, incorrect→lapse 3→1/cc0/due-now.
- ISC-17,18,19,20,21: Read — recallDirection přepínač EN→CZ/CZ→EN/Mix; CZ→EN flip word+contextSentence; 🔊 onSpeak prop; extractVocabFromTranscript {word,sentence}[]; addVocabularyWord contextSentence.
- ISC-22..26: **Unit test 7/7** word-scoring (přesná=1, interpunkce ignor, 0.8 threshold, prázdné=0, missingTokens); DrillSheet flow + ProgressModal tlačítko.
- ISC-27,28,29,30: Read — lessonsAtCurrentLevel, levelProgressPercent, shouldOfferRetest≥10, TARGET_LEVEL='B1' bar, levelSetAt při změně úrovně (3 cesty + migrace default).
- ISC-31..35: Read+Grep — ScenarioTask typ; 4 scénáře `goalCz:` (grep=4); pre-start sheet; TASK FOR THIS SESSION prompt (grep=1); generateSessionSummary taskSteps→taskResults (iteruje přes taskSteps, chybějící=false — advisor-safe); ProgressModal checklist.
- ISC-37: Grep — v1.10.0 v constants + bundlu; package.json 1.10.0.
- ISC-38: Bash — tsc 0 + build OK po každé položce (8 commitů).

**Doctrine:** Rule 1 — UI ISC browser-DEFERRED (WSL bez Interceptoru/agent-browseru), kód+build verified; behaviorální ověření promptů (recast, task vedení) chce Tomův live smoke. Rule 2 — advisor volán, potvrdil že migrace/lapse/taskCompleted guards jsou JIŽ pokryté + otestované; grep ověřil 3 volající extractVocabFromTranscript. Rule 2a (Cato) — E3, neaplikuje se. Rule 3 — žádný konflikt.

**Vychytáno v této session:** (1) cwd-reset po advisor `cd ~/.claude` → ref-guard/release commit málem do špatného repa, opraveno; (2) české uvozovky v TS stringu rozbily tsc, zachyceno před commitem.
