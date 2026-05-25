# Aria English Tutor — Aktuální stav aplikace

**Verze:** v1.4.4  
**Datum:** 2026-05-23  
**Deployment:** Cloudflare Pages  
**Stack:** React 19 + TypeScript + Vite 6 + Tailwind CSS + @google/genai v2.6.0

---

## Co aplikace dělá

Aria je AI anglický tutor pro české mluvčí. Konverzuje v angličtině, opravuje chyby, přizpůsobuje se úrovni uživatele. Funguje jako PWA — lze nainstalovat na telefon i desktop.

---

## Módy konverzace

### Live API (výchozí)
- Model: `gemini-3.1-flash-live-preview` — audio-to-audio real-time konverzace
- Uživatel mluví přímo, Aria okamžitě odpovídá hlasem
- Aria zahajuje konverzaci jako první (pošle "Hello" po připojení)
- Přerušení: uživatel může Ariu kdykoliv přerušit slovem
- Zobrazení: Avatar mód s real-time přepisem řeči (vstup + výstup)
- Detekce pomalé sítě (networkSlow stav po 7 sekundách ticha)

### Legacy (záložní)
- Model: `gemini-3.5-flash` — textový chat s STT/TTS
- STT: Web Speech API (prohlížeč), respektuje nastavení akcentu (en-US / en-GB)
- TTS: Web Speech API — přehraje odpověď Arie hlasem
- Zobrazení: Chat bubliny nebo Avatar mód

### Reading Mode
- Model: `gemini-3.1-flash-live-preview` — Live API se speciálním system promptem
- Uživatel čte nahlas anglický text (z knihy, článku...)
- Aria opakuje větu s perfektní výslovností + jeden výslovnostní tip
- Podpora dotazů na význam slov a překlad do češtiny
- Vocabulary list: automatická detekce neznámých slov z přepisu řeči
- Přístup: tlačítko 📚 v hlavičce

---

## Hlasové nastavení

| Parametr | Možnosti |
|----------|----------|
| Akcent | US (americká) / UK (britská) angličtina |
| Pohlaví | Female / Male |
| Hlasy (Live) | Female US: Kore, Female UK: Zephyr, Male US: Puck, Male UK: Fenrir |

---

## Úrovně angličtiny

`A1`, `A2`, `B1`, `B2`, `C1`, `C2`, `TEST_ME` (automatické zjištění úrovně testem)

---

## Opravy a přísnost

Škála 1–10 (nastavitelná):

| Rozsah | Chování |
|--------|---------|
| 1–2 | Žádné opravy — jen konverzace |
| 3–4 | Jen kritické chyby, inline a neformálně |
| 5–6 | Vyvážené — jasné chyby, blok "💡 Corrections" |
| 7–8 | Důkladné — articles, prepositions, časy |
| 9–10 | Maximum — každá chyba, podrobné vysvětlení |

---

## Role-play scénáře (15 situací)

Nakupování, restaurace, cestování, letiště, policie, dopravní nehoda, benzinka, lékař, hotel, lékárna, banka, pracovní pohovor, telefonát, sousedé, **Creo Parametric školení** (speciální pro CAD/technické prostředí).

---

## Avatary

- Preset Female (Sarah)
- Preset Male (Tom)  
- Vlastní fotka (URL)
- Virtuální avatar (SVG fallback)

---

## Progress a statistiky

- **Session summary** — po skončení hovoru: co šlo dobře, 3 nejčastější chyby, 3 tréninkové věty
- **Historie lekcí** — uložena v localStorage, zobrazena v Progress modálu
- **Statistiky:** celkový počet lekcí, streak dní, čas mluvení, průměr korekcí, trend (improving / stable / worsening)
- **API usage** — donut graf v hlavičce, denní limit požadavků

---

## PWA

- Instalovatelná na telefon (iOS/Android) i desktop
- Banner "Nainstalovat Aria" se zobrazí při první návštěvě
- Funguje bez instalace jako webová aplikace

---

## Uložená data (localStorage)

| Klíč | Obsah |
|------|-------|
| `aria_app_settings` | Nastavení aplikace (úroveň, hlas, mód…) |
| `aria_lesson_history` | Historie lekcí s summary |
| `aria_usage` | Počítadlo API požadavků (denní) |
| `aria_vocabulary` | Slovíček seznam (Reading Mode) |
| `aria_pwa_dismissed` | Zda uživatel odmítl PWA banner |

---

## Technická architektura

```
src/
  App.tsx                    — hlavní komponenta, routing módů
  constants.ts               — system prompty, scénáře, verze
  types.ts                   — TypeScript typy

  components/
    AvatarView.tsx            — Live API + Legacy avatar UI
    ReadingModeView.tsx       — Reading Mode UI + vocabulary
    VocabularyModal.tsx       — seznam slovíček, tisk, mazání
    ProgressModal.tsx         — statistiky, session summary
    ScenarioSelector.tsx      — výběr role-play scénáře
    SettingsModal.tsx         — nastavení aplikace
    MessageBubble.tsx         — chat bublina s korekcí
    InputArea.tsx             — textový vstup (legacy chat)
    LevelSelector.tsx         — výběr úrovně při prvním spuštění
    VirtualAvatar.tsx         — SVG animovaný avatar

  hooks/
    useLiveAPI.ts             — Gemini 3.1 Live WebSocket session
    useSpeechRecognition.ts   — Web Speech API STT
    useTextToSpeech.ts        — Web Speech API TTS

  services/
    geminiService.ts          — Gemini 3.5 Flash (legacy chat)

  utils/
    audioUtils.ts             — PCM konverze, base64, decode
    sessionHistoryUtils.ts    — lekce history CRUD + statistiky
    settingsUtils.ts          — load/save nastavení
    usageUtils.ts             — denní API limit počítadlo
    vocabularyUtils.ts        — slovíček CRUD + auto-detekce
```

---

## Known limitations

- API klíč je hardcoded v buildu (přes `process.env.API_KEY`) — vhodné jen pro osobní/školní použití
- Live API má denní kvótu na free tier Google AI
- Reading Mode vocabulary auto-detekce je heuristická (regex), ne 100% přesná
- Session summary funguje jen pro Legacy mód a Live mód se zaznamenaným přepisem
