---
task: "Blueprint v1.11.0 — Polish (P2 minus API)"
slug: 20260613-aria-blueprint-v1110
project: AriaEnglishTutor
effort: E3
effort_source: classifier
phase: observe
progress: 0/18
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
- [ ] ISC-1: NOVÝ `utils/transcriptUtils.ts` ring buffer (`aria_transcripts_v1`, max 10, slice(-50))
- [ ] ISC-2: `StoredTranscript` typ (id, endedAt, mode, messages)
- [ ] ISC-3: save přes try/catch; QuotaExceeded → evict nejstarší + retry 1×; pak skip
- [ ] ISC-4: `App.tsx` oba finalizery ukládají přepis po session
- [ ] ISC-5: `ProgressModal` detail lekce rozbalí přepis přes `<details>`
- [ ] ISC-6: Anti: 11. session vytlačí nejstarší (ring buffer drží max 10)

### P2-15 — UI konzistence
- [ ] ISC-7: `LevelSelector` přidá C2 (sync se SettingsModal levels)
- [ ] ISC-8: `ProgressModal` diakritika — Zlepšení, Zhoršení, Stabilní, Nedostatek dat
- [ ] ISC-9: `ProgressModal` Čas mluvení, dnů, Poslední lekce, Session shrnutí
- [ ] ISC-10: `AvatarView` stavové texty česky („Klepni na mikrofon a začni")
- [ ] ISC-11: „Paused (Live/Std)" → „Připraveno (Live/Std)" (kolize se skutečnou pauzou)
- [ ] ISC-12: Anti: anglický učební obsah (transcript, correction) zůstává anglicky

### Global
- [ ] ISC-13: `APP_VERSION` = v1.11.0 + RELEASE_HISTORY (česky), package.json 1.11.0
- [ ] ISC-14: `tsc --noEmit` 0 + `bun run build` OK po každé položce
- [ ] ISC-15: Anti: žádná regrese existujících přepisů/historie z v1.10.0
- [ ] ISC-16: ring buffer save nehodí výjimku ven (graceful při plné kvótě)
- [ ] ISC-17: ProgressModal `<details>` se renderuje jen když přepis existuje
- [ ] ISC-18: transcriptUtils load přes try/catch + shape-validace (poškozená data → [])

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

(LEARN)

## Verification

(EXECUTE/VERIFY)
