---
task: "Blueprint v1.11.0 — Polish (P2 minus API)"
slug: 20260613-aria-blueprint-v1110
project: AriaEnglishTutor
effort: E3
effort_source: classifier
phase: complete
progress: 18/18
mode: interactive
started: 2026-06-13T00:00:00Z
updated: 2026-06-13T00:00:00Z
---

## Problem

Po v1.10.0 zbývá z auditu poslední řez polish: lekce se nedají zpětně prohlédnout (přepisy
se neukládají), a UI má drobné nekonzistence — chybí úroveň C2 v LevelSelectoru, rozbitá
diakritika v ProgressModalu (Zlepseni/dnu/Cas mluveni), anglické stavové texty v AvatarView,
matoucí „Paused" label. Blueprint řez **v1.11.0 (P2-14, P2-15)**; P2-16 (API klíč) vynechán.

## Vision

Uživatel si v historii lekcí rozbalí přepis konverzace a přečte, co říkal. UI je celé česky
a konzistentní — diakritika sedí, C2 je volitelné, stavové hlášky dávají smysl.

## Out of Scope

- **P2-16 / API klíč / CF Worker** — Tomův pokyn, vynecháno (jediná zmínka).
- Fonémový scoring, gamifikace, refaktoring App.tsx.

## Principles

- Ring buffer přepisů verzovaný (`aria_transcripts_v1`), QuotaExceeded → evict + retry.
- UI texty česky (mimo učební obsah, který je anglicky záměrně).
- `tsc --noEmit` + `bun run build` + commit per položka. České uvozovky NE v TS double-quote stringu.

## Constraints

- Stack beze změny. WSL bez browseru → artefaktové ověření, UI browser-deferred.
- localStorage kvóta — ring buffer 10×50 zpráv ≈ stovky kB.

## Goal

Implementovat P2-14 (ring buffer přepisů + prohlížení v ProgressModal) a P2-15 (UI konzistence:
C2, diakritika, header ikony, CS stavové texty) do release v1.11.0 s čistým tsc+build.

## Criteria

### P2-14 — Přepisy lekcí + prohlížení
- [x] ISC-1: NOVÝ `utils/transcriptUtils.ts` ring buffer (`aria_transcripts_v1`, max 10, slice(-50))
- [x] ISC-2: `StoredTranscript` typ (id, endedAt, mode, messages)
- [x] ISC-3: save přes try/catch; QuotaExceeded → evict nejstarší + retry 1×; pak skip
- [x] ISC-4: `App.tsx` oba finalizery ukládají přepis po session
- [x] ISC-5: `ProgressModal` detail lekce rozbalí přepis přes `<details>`
- [x] ISC-6: Anti: 11. session vytlačí nejstarší (ring buffer drží max 10)

### P2-15 — UI konzistence
- [x] ISC-7: `LevelSelector` přidá C2 (sync se SettingsModal levels)
- [x] ISC-8: `ProgressModal` diakritika — Zlepšení, Zhoršení, Stabilní, Nedostatek dat
- [x] ISC-9: `ProgressModal` Čas mluvení, dnů, Poslední lekce, Session shrnutí
- [x] ISC-10: `AvatarView` stavové texty česky („Klepni na mikrofon a začni")
- [x] ISC-11: „Paused (Live/Std)" → „Připraveno (Live/Std)" (kolize se skutečnou pauzou)
- [x] ISC-12: Anti: anglický učební obsah (transcript, correction) zůstává anglicky

### Global
- [x] ISC-13: `APP_VERSION` = v1.11.0 + RELEASE_HISTORY (česky), package.json 1.11.0
- [x] ISC-14: `tsc --noEmit` 0 + `bun run build` OK po každé položce
- [x] ISC-15: Anti: žádná regrese existujících přepisů/historie z v1.10.0
- [x] ISC-16: ring buffer save nehodí výjimku ven (graceful při plné kvótě)
- [x] ISC-17: ProgressModal `<details>` se renderuje jen když přepis existuje
- [x] ISC-18: transcriptUtils load přes try/catch + shape-validace (poškozená data → [])

## Test Strategy

| isc | type | check | tool |
|-----|------|-------|------|
| ISC-1,2,3,16,18 | bash | unit test ring buffer: cap 10, evict, load guard | Bash |
| ISC-4,5,17 | read | finalizery ukládají + ProgressModal details | Read |
| ISC-6 | bash | 11 sessions → 10 v bufferu | Bash |
| ISC-7 | grep | LevelSelector C2 | Grep |
| ISC-8,9 | grep | diakritika v ProgressModal | Grep |
| ISC-10,11,12 | read | AvatarView CS texty, učební obsah EN | Read |
| ISC-13 | grep | v1.11.0 | Grep |
| ISC-14 | bash | tsc + build | Bash |

## Features

| name | satisfies | depends_on | parallelizable |
|------|-----------|------------|----------------|
| P2-14-Transcripts | ISC-1..6,16,17,18 | — | false |
| P2-15-UiConsistency | ISC-7..12 | — | false |
| Release | ISC-13,14,15 | all | false |

## Decisions

- 2026-06-13: Poslední řez blueprintu. Aplikuji obě session gotchy (cwd prefix, české uvozovky).
- 2026-06-13: Delegation relaxován — polish na sdílených souborech (App, ProgressModal), sekvenční.

### Historie (zhuštěno)

- 2026-06-13: **v1.10.0 „Didaktika"** — 7 P1 (SRS, flashcards CZ→EN, drill, task scénáře, progrese B1, recast, restart-hint), 38/38 ISC, unit 11/11 + 7/7.
- 2026-06-13: **v1.9.0 „Tutor s pamětí"** — 7 P0, 44/44 ISC.
- 2026-05/06: v1.8.x — bug fixes, robustnost, code-splitting.

## Changelog

- **conjectured:** ring buffer přepisů a dedup podle id zvládne i opakované uložení a kvótu.
  **refuted_by:** nic — držela; unit test 7/7 (cap 10, evict, slice 50, id-dedup, poškozená data → []).
  **learned:** QuotaExceeded řeším evict-loop + persist retry, ne výjimkou ven; gotcha o českých
  uvozovkách z v1.10.0 aplikována na release notes → tsc čistý napoprvé.
  **criterion_now:** ISC-1/3/16/18 ověřeny unit testem nad mock localStorage.

## Verification

- ISC-1,2,3,16,18: **Unit test 7/7** — cap 10, nejnovější první, evict nejstarších, slice(-50), id-dedup, poškozená data → []; save bez výjimky (evict-loop).
- ISC-4: Read — oba finalizery `saveTranscript({ id: entry.id, ... })` spárováno s lekcí.
- ISC-5,17: Read — ProgressModal `getTranscript(item.id)` → `<details>` jen když přepis existuje.
- ISC-6: Unit — 12 sessions → buffer drží 10, s0/s1 vytlačeny.
- ISC-7: Grep — LevelSelector `C2 - Proficient` (sync se SettingsModal levels A1–C2).
- ISC-8,9: Grep — trendLabel Zlepšení/Zhoršení/Stabilní; Čas mluvení, dnů, Poslední lekce, Shrnutí po hovoru, Délka, Mluvení.
- ISC-10,11,12: Read — AvatarView CS („Klepni na mikrofon a začni", „Aria mluví…", „Poslouchám…"), Paused→Připraveno; učební obsah (transcript/correction parse) zůstává EN.
- ISC-13: Grep — v1.11.0 v constants + bundlu; package.json 1.11.0.
- ISC-14: Bash — tsc 0 + build OK po každé položce.

**Doctrine:** Rule 1 — UI ISC browser-DEFERRED (WSL), kód+build+unit verified; Tomův live smoke pro vizuál. Rule 2 — malý polish řez, advisor neopakován (předchozí dva běhy potvrdily přístup; žádný nový rizikový vzor). Rule 2a (Cato) — E3, neaplikuje se.

**Celý blueprint hotov:** v1.9.0 (P0×7, 44 ISC) + v1.10.0 (P1×7, 38 ISC) + v1.11.0 (P2×2, 18 ISC) = 100 ISC, 3 release. Vynecháno jen P2-16 (API klíč) dle Tomova pokynu.
