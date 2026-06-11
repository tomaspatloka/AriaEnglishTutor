---
task: "Opravit bugy z auditu — TTS, line-clamp, console.log"
slug: 20260524-aria-bug-fixes
project: AriaEnglishTutor
effort: E3
effort_source: classifier
phase: complete
progress: 34/34
mode: interactive
started: 2026-05-24T00:00:00Z
updated: 2026-05-24T00:00:00Z
---

## Problem

Audit aplikace AriaEnglishTutor (v1.x) odhalil tři konkrétní bugy:

1. **TTS voice selection je nespolehlivá** (`useTextToSpeech.ts:46–48`) — výběr hlasu je postaven na hardcoded jménech „Samantha", „Daniel", „Google US English Male". Na Windows 11 tato jména neexistují → TTS padá na fallback bez genderové preference. Uživatel nastaví „Female US" a dostane náhodný hlas podle OS.

2. **Czech translation je oříznutá** (`AvatarView.tsx:347`) — `line-clamp-3` limituje zobrazení českého překladu na 3 řádky. Delší překlady jsou neviditelné a uživatel nemůže přečíst celý text.

3. **console.log leaká do produkce** (`useTextToSpeech.ts:54`) — každý výběr hlasu loguje selected voice do browser console. Informace zbytečně znečišťuje debug výstup v produkčním provozu.

## Vision

Výsledek: uživatel na Windows 11 (nebo Androidu) nastaví „Female US" a aplikace skutečně vybere ženský anglický hlas, ne náhodný fallback. Český překlad od Arie je čitelný celý, bez ořezání. Browser console je čistý — žádné TTS logy v produkci. Tři konkrétní bugy zmizely, nic jiného se nezměnilo.

## Out of Scope

Refaktoring App.tsx (800+ řádků) není součástí tohoto tasku — pouze targeted bug fixes. Migrace ScriptProcessorNode na AudioWorklet není součástí tohoto tasku. Backend proxy pro API klíč není součástí tohoto tasku. i18n refaktoring není součástí tohoto tasku. Žádné nové funkce, žádné změny v AI logice, žádné změny v Live API.

## Constraints

- Zachovat zpětnou kompatibilitu `useTextToSpeech` API — žádná změna exportovaných funkcí.
- Zachovat strukturu `AvatarView.tsx` — změnit pouze CSS class na Czech translation.
- Nevkládat nové závislosti.
- Kód musí projít TypeScript kompilací bez nových chyb.

## Goal

Opravit tři identifikované bugy v `useTextToSpeech.ts` a `AvatarView.tsx`: (1) nahradit hardcoded hlasová jména jazykovým filtrem s gender-keyword heuristikou, (2) odstranit `line-clamp-3` na českém překladu, (3) odstranit produkční `console.log`. Žádné jiné soubory nesmí být změněny.

## Criteria

- [x] ISC-1: `useTextToSpeech.ts` neobsahuje `v.name.includes('Samantha')` jako standalone voice check
- [x] ISC-2: `useTextToSpeech.ts` neobsahuje `v.name.includes('Daniel')` jako standalone voice check
- [x] ISC-3: `useTextToSpeech.ts` neobsahuje string "Google US English"
- [x] ISC-4: `useTextToSpeech.ts` neobsahuje string "Google UK English Male"
- [x] ISC-5: Gender-výběr filtruje hlasy primárně pomocí `lang` kódu (en-US / en-GB)
- [x] ISC-6: Female heuristika hledá v `name` slova: female, woman, zira, hazel, susan, karen, moira, samantha, fiona, victoria (case-insensitive)
- [x] ISC-7: Male heuristika hledá v `name` slova: male, man, david, james, daniel, george, oliver, rishi (case-insensitive)
- [x] ISC-8: Fallback na první dostupný hlas daného jazyka pokud žádná gender heuristika neprojde
- [x] ISC-9: Fallback na první dostupný anglický hlas pokud ani jazykový filtr neprojde
- [x] ISC-10: `useTextToSpeech.ts` neobsahuje `console.log` volání
- [x] ISC-11: `AvatarView.tsx` neobsahuje `line-clamp-3` na elementu s českým překladem
- [x] ISC-12: Czech translation element má `overflow-y-auto` nebo je bez height limit
- [x] ISC-13: Exportované funkce `speak`, `stop`, `isSpeaking`, `supported`, `speakManual` jsou stále přítomny
- [x] ISC-14: Hook `useTextToSpeech` stále přijímá `settings: AppSettings` jako jediný parametr
- [x] ISC-15: `buildAndSpeak` respektuje `settings.voiceAccent` pro nastavení `utterance.lang`
- [x] ISC-16: `utterance.rate = 0.95` zůstává zachováno
- [x] ISC-17: `utterance.pitch` nastavení pro FEMALE (1.1) a MALE (0.9) zůstává zachováno
- [x] ISC-18: `utterance.onstart`, `utterance.onend`, `utterance.onerror` handlery zůstávají zachovány
- [x] ISC-19: `speak()` stále respektuje `settings.autoPlayAudio` flag
- [x] ISC-20: `speakManual()` stále přeskakuje `autoPlayAudio` guard (force-speak)
- [x] ISC-21: `window.speechSynthesis.cancel()` voláno před každým `speak()` i `speakManual()`
- [x] ISC-22: `speechSynthesis.onvoiceschanged` event listener zůstává registrován
- [x] ISC-23: `loadVoices()` je volán ihned po inicializaci (synchronní load pro hlasy dostupné hned)
- [x] ISC-24: TypeScript — žádné nové `ts` chyby v upravených souborech (ověřitelné `tsc --noEmit`)
- [x] ISC-25: `AvatarView.tsx` — ostatní CSS třídy na czech translation elementu zůstávají nezměněny (barva, font, border-t, padding)
- [x] ISC-26: `AvatarView.tsx` — podmínka `{czechTranslation && (…)}` zůstává nezměněna
- [x] ISC-27: Žádné jiné soubory mimo `useTextToSpeech.ts` a `AvatarView.tsx` nejsou změněny (blueprint.md pre-existing)
- [x] ISC-28: Anti: Žádný hardcoded OS-specific voice name nezůstal ve voice selection logice
- [x] ISC-29: Anti: `useTextToSpeech.ts` neobsahuje žádný `console.log`, `console.warn` ani `console.error` mimo try/catch error handling
- [x] ISC-30: Anti: `line-clamp-*` CSS třída neaplikována na Czech translation element v AvatarView
- [x] ISC-31: Anti: Refaktoring App.tsx nebo jiné soubory nebyly provedeny (scope creep)
- [x] ISC-32: Anti: Hook API (vstupy, výstupy) se nezměnilo — žádné breaking changes
- [x] ISC-33: Gender heuristika je case-insensitive (word-boundary RegExp s flag `i`)
- [x] ISC-34: Heuristická keywordová lista je expandovatelná (definovaná jako array, ne inline podmínky)

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | grep | `rg "Samantha" useTextToSpeech.ts` | no match | Grep |
| ISC-2 | grep | `rg "Daniel" useTextToSpeech.ts` | no match | Grep |
| ISC-3 | grep | `rg "Google US English" useTextToSpeech.ts` | no match | Grep |
| ISC-4 | grep | `rg "Google UK English" useTextToSpeech.ts` | no match | Grep |
| ISC-5 | read | lang-based filter present in code | present | Read |
| ISC-6 | read | female keywords array present | ≥6 items | Read |
| ISC-7 | read | male keywords array present | ≥5 items | Read |
| ISC-8 | read | fallback to `englishVoices[0]` | present | Read |
| ISC-9 | read | fallback to `availableVoices[0]` | present | Read |
| ISC-10 | grep | `rg "console.log" useTextToSpeech.ts` | no match | Grep |
| ISC-11 | grep | `rg "line-clamp-3" AvatarView.tsx` | no match | Grep |
| ISC-12 | read | czech translation element structure | overflow or no clamp | Read |
| ISC-13 | grep | all 5 exports present | 5/5 | Grep |
| ISC-14 | read | hook signature unchanged | present | Read |
| ISC-15 | read | voiceAccent used for utterance.lang | present | Read |
| ISC-16 | grep | `utterance.rate = 0.95` | present | Grep |
| ISC-17 | grep | pitch 1.1 and 0.9 | 2 matches | Grep |
| ISC-18 | grep | onstart, onend, onerror | 3 matches | Grep |
| ISC-19 | read | autoPlayAudio guard in speak() | present | Read |
| ISC-20 | read | speakManual bypasses autoPlayAudio | present | Read |
| ISC-21 | grep | `cancel()` in speak and speakManual | 2 matches | Grep |
| ISC-22 | grep | `onvoiceschanged` | present | Grep |
| ISC-23 | read | loadVoices() called immediately | present | Read |
| ISC-24 | bash | `tsc --noEmit` exits 0 | exit 0 | Bash |
| ISC-25 | read | other classes on czech element unchanged | present | Read |
| ISC-26 | grep | `{czechTranslation &&` in AvatarView | present | Grep |
| ISC-27 | bash | `git diff --name-only` shows only 2 files | ≤2 files | Bash |
| ISC-28 | grep | no hardcoded voice names | no match | Grep |
| ISC-29 | grep | no console.log/warn/error in selection | no match | Grep |
| ISC-30 | grep | no line-clamp on czech element | no match | Grep |
| ISC-31 | bash | git diff --name-only | only 2 files | Bash |
| ISC-32 | read | hook signature identical | unchanged | Read |
| ISC-33 | grep | `toLowerCase()` in gender heuristic | present | Grep |
| ISC-34 | read | keyword arrays defined | array literals | Read |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| TTS-VoiceSelection | Nahradit hardcoded jména lang+keyword heuristikou | ISC-1,2,3,4,5,6,7,8,9,28,33,34 | — | false |
| TTS-CleanLog | Odstranit console.log z useTextToSpeech.ts | ISC-10,29 | — | true |
| AvatarView-Czech | Odstranit line-clamp-3 z Czech translation elementu | ISC-11,12,25,30 | — | true |
| Regression | Ověřit zachování API, chování, TypeScript | ISC-13,14,15,16,17,18,19,20,21,22,23,24,26,27,31,32 | TTS-VoiceSelection,TTS-CleanLog,AvatarView-Czech | false |

## Decisions

- 2026-05-24: ISA scaffold — projekt AriaEnglishTutor, první project ISA. Scope omezen na tři identifikované bugy z auditu. Architektonické issues (App.tsx, ScriptProcessorNode) odloženy jako Out of Scope.
- 2026-06-11: Pokračování P1 oprav z hloubkového auditu (10. 6.). **Plný audit report se ze session logů nedochoval** — přežily jen fragmenty (Advisor: teardown / ErrorBoundary / deploy; plán začínal „1. ⚡ Triviální"). Rekonstrukce z živého kódu potvrdila 2 reálné P1: (1) 3× produkční `console.log` v `useLiveAPI.ts` → odstraněno (commit feb1380); (2) chybějící ErrorBoundary → přidán `components/ErrorBoundary.tsx`, obален `<App/>` v `index.tsx` (commit f4fcc74). **Teardown NEopraven záměrně** — `cleanup()` v useLiveAPI (MediaStream stop, AudioContext close, session close) i `useWakeLock` jsou korektní; žádný skutečný leak → fabrikovat opravu working kódu by porušilo zákaz úprav funkčního kódu. Verifikace: `tsc --noEmit` 0 chyb, `vite build` OK (60 modulů, 1.95s). Zjištění mimo scope: projekt nemá `@types/react` → celý React je typově `any` (tsc validuje jen syntakticky).
- 2026-06-11 (pokr.): Re-audit zbývajících P1. Třetí reálný P1 opraven: `usageUtils.ts` měl 3× localStorage a 0× try/catch + nechráněný `JSON.parse` na hot-path (`incrementUsage` při každém připojení Arie, `getUsageStats` při renderu). Přidán bezpečný read (try/catch + `isValidUsage` shape-validace) a `safeSet` wrapper proti quota/private-mode pádu (commit 6e78954). API klíč v client bundlu **odložen na jindy** (Tomovo rozhodnutí). `tsc` 0 chyb, `vite build` OK. Zbývající nižší priorita (nefixed, čeká na rozhodnutí): VirtualAvatar setTimeout v rAF řetězci bez cleanup, `settingsUtils`/`sessionHistoryUtils` getItem/setItem mimo try, bundle 653 kB bez code-splittingu, verze package.json 1.7.1 ≠ APP_VERSION v1.8.0.
- 2026-06-11 (P2 dávka, „pokračuj co je nejlepší"): Dotaženy 3 nízkorizikové položky → release **v1.8.1**. (1) localStorage hardening v `settingsUtils` + `sessionHistoryUtils` — getItem/setItem nově v try/catch, pád při plné kvótě / privátním režimu eliminován (commit 89b77ad). (2) `VirtualAvatar` — časovače blink (`setTimeout 200`) i mouth (`setTimeout 100` v rAF) se nově uklízí v cleanupu, žádný setState po unmountu (commit c564425). (3) Verze srovnána: `package.json` 1.7.1 → 1.8.1 = `APP_VERSION` v1.8.1 + release notes (commit 001d56c). Verifikace: `tsc` 0 chyb, `vite build` OK. **Záměrně odloženo:** bundle code-splitting (deploy-adjacent, vyšší riziko) a API klíč v client bundlu (Tomovo rozhodnutí). Tím je doménová „bug/robustnost" část auditu vyčerpaná; zbývají jen architektura (perf) a security (API klíč).
