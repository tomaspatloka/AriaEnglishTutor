# Aria English Tutor — Blueprint

## 1. Přehled
- **Verze:** 1.3.0 (package.json: 1.2.0, constants.ts: v1.3.0)
- **Typ:** Web App (PWA-ready)
- **Stack:** React 19 + TypeScript + Vite 6, Gemini AI (@google/genai)
- **Deployment:** Lokální dev (Vite), produkční build do `dist/`
- **Datum auditu:** 2026-03-15

## 2. Architektura
Monolitická React SPA s jedním hlavním souborem `App.tsx` (844 řádků). Kód je rozdělen do logických složek:

- **Entry point:** `index.tsx` -> `App.tsx`
- **Komponenty:** `components/` — 8 komponent (AvatarView, InputArea, LevelSelector, MessageBubble, ProgressModal, ScenarioSelector, SettingsModal, VirtualAvatar)
- **Hooky:** `hooks/` — useLiveAPI, useSpeechRecognition, useTextToSpeech
- **Služby:** `services/geminiService.ts` — Gemini AI chat, session summary, retry, practice variants
- **Utility:** `utils/` — audioUtils, sessionHistoryUtils, settingsUtils, usageUtils
- **Typy:** `types.ts` — 67 řádků, čisté TypeScript interfaces
- **Konfigurace:** `constants.ts` — scénáře, system prompt, verze, avatary

## 3. Funkce
- AI konverzace s Gemini (chat + Live audio streaming)
- 14 role-play scénářů (nakupování, restaurace, letiště, lékař, pohovor...)
- CEFR level assessment (A1-C2 + TEST_ME auto-detect)
- Nastavitelná strictness korekce (1-10 škála, 5 úrovní chování)
- Text-to-Speech (Web Speech API, US/UK accent, male/female)
- Speech-to-Text (Web Speech Recognition API)
- Avatar mód (preset Sarah/Tom + custom upload + virtual)
- Session summary po konverzaci (strengths, errors, practice sentences)
- Lesson history + progress tracking (streak, trend, speaking time)
- One-tap korekce (Retry corrected, Practice 3 variants)
- API usage donut chart s denním limitem
- PWA install banner
- Dark/light theme (Tailwind)
- Český překlad na vyžádání (toggle v nastavení)

## 4. Datové úložiště
- **localStorage:** Nastavení (`aria_app_settings`), lesson history, usage stats, PWA dismissed flag
- **API:** Gemini AI (Google GenAI SDK) — API klíč v `.env.local` (process.env.API_KEY)
- **Žádná serverová DB** — vše client-side

## 5. Závislosti
| Knihovna | Verze | Účel |
|---|---|---|
| react | ^19.2.4 | UI framework |
| react-dom | ^19.2.4 | DOM rendering |
| @google/genai | ^1.40.0 | Gemini AI SDK |
| uuid | ^13.0.0 | Generování ID |
| vite | ^6.2.0 | Build tool |
| typescript | ~5.8.2 | Type system |
| @vitejs/plugin-react | ^5.0.0 | React HMR |

## 6. Aktuální stav
**Celkové hodnocení: 8/10 — Funkční, feature-rich aplikace s kvalitním UX**

Co funguje dobře:
- AI konverzace (Legacy i Live mód)
- Role-play scénáře (14 situací)
- Session summary a progress tracking
- Responzivní design, prémiový vzhled
- Audio pipeline (TTS + STT)

Známé problémy (z audit.md):
- App.tsx je monolitický (844 řádků)
- ScriptProcessorNode je deprecated (Live API audio)
- API klíč je ve frontendu (bezpečnostní riziko pro produkci)
- TTS voice selection je nespolehlivé napříč OS
- Žádné testy

## 7. Technický dluh / Issues
1. **P0 — Bezpečnost:** API klíč exposed v client-side kódu (potřeba backend proxy)
2. **P1 — Architektura:** App.tsx 844 řádků — rozdělit na Layout, Header, SessionProvider
3. **P1 — Audio:** Deprecated ScriptProcessorNode → migrace na AudioWorklet
4. **P1 — Kvalita:** Žádné unit/integration testy
5. **P2 — TTS:** Nespolehlivý výběr hlasů (hardcoded jména vs. dynamický seznam)
6. **P2 — State:** Globální `let chatSession` v services — není React-idiomatic
7. **P3 — i18n:** České řetězce hardcoded v kódu (chybí i18n systém)
8. **P3 — PWA:** Logika PWA install banneru přímo v App.tsx

## 8. Roadmap
1. **v1.4.0** — Refaktoring App.tsx (custom hooks: usePWA, useSession, useScenario)
2. **v1.5.0** — Backend proxy pro API klíč (Cloudflare Workers / Vercel Edge)
3. **v1.6.0** — AudioWorklet migrace, dynamický voice list
4. **v2.0.0** — React Context pro globální state, test suite, i18n
