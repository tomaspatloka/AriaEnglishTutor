# Aria English Tutor — Blueprint budoucího vývoje

**Aktualizováno:** 2026-05-23 (vychází z v1.4.4)

---

## PRIORITA 1 — Základní bezpečnost a stabilita

### B1 — Backend proxy pro API klíč
**Proč:** API klíč je součástí buildu — kdokoliv ho může vytáhnout z DevTools.  
**Co:** Cloudflare Worker nebo Pages Function jako proxy. Klient volá `/api/chat`, worker přidá klíč a přepošle na Google.  
**Dopad:** Aplikaci lze bezpečně sdílet s kýmkoliv.

### B2 — Ephemeral token pro Live API
**Proč:** Google doporučuje pro klientský Live API přístup krátkodobé tokeny místo přímého klíče.  
**Co:** Server (Cloudflare Worker) vygeneruje ephemeral token přes Google Token Exchange API, klient ho použije pro `ai.live.connect()`.  
**Závisí na:** B1

### B3 — Automatický fallback modelu
**Proč:** Google deprecuje modely bez varování (stalo se s `gemini-2.0-flash-live-001`).  
**Co:** Pokud se `gemini-3.1-flash-live-preview` nepřipojí → automaticky zkusí `gemini-2.5-flash-native-audio-preview`. Indikátor v UI: "Připojeno na [model]".

---

## PRIORITA 2 — Nové výukové funkce

### B4 — Vocabulary flashcards (spaced repetition)
**Proč:** Aktuální slovníček v Reading Mode je jen pasivní seznam slov.  
**Co:**
- Flashcard mód: anglické slovo → flip → český překlad + příkladová věta
- Jednoduchý spaced repetition algoritmus (SM-2 nebo lightweight varianta)
- Denní výzva: "Procvič 10 slovíček z posledních lekcí"
- Export jako PDF nebo CSV pro tisk

### B5 — Pronunciation scoring
**Proč:** Uživatel neví, jak moc správně vyslovuje — Aria jen opakuje, nehodnotí.  
**Co:**
- Word-level confidence z Live API přepisu
- Zobrazení skóre výslovnosti 0–100% per slovo v přepisu
- Zvýraznění špatně vyslovených slov (červená) vs. správných (zelená)

### B6 — Listening comprehension mode
**Proč:** Chybí mód zaměřený na poslouchání — všechny současné módy předpokládají, že uživatel mluví.  
**Co:**
- Aria přečte krátký text nebo příběh (3–5 vět)
- Uživatel odpoví na 2–3 otázky o obsahu (hlasem nebo textem)
- Aria zkontroluje porozumění a vysvětlí, co bylo špatně

### B7 — Writing practice mode
**Proč:** Aplikace je zaměřena na mluvení, ale písemná angličtina je jiná dovednost.  
**Co:**
- Aria zadá téma nebo situaci (e-mail, krátký text, popis obrázku)
- Uživatel napíše 3–5 vět
- Aria opraví gramatiku, pravopis, styl — stejná strictness škála jako u mluvení

### B8 — Gamification
**Proč:** Udržení motivace je hlavní problém dlouhodobého učení.  
**Co:**
- XP za každou dokončenou lekci (bonus za streak)
- Odznaky: první Live session, 7-day streak, 50 opravených chyb, nový scénář...
- Weekly challenge: "Procvič 5 různých scénářů tento týden"
- Jednoduché levely: Beginner → Intermediate → Advanced → Fluent

---

## PRIORITA 3 — Pokročilé funkce

### B9 — Vlastní scénáře (uživatelsky definované)
**Proč:** 15 předpřipravených scénářů nestačí pro specifické potřeby (technické obory, koníčky).  
**Co:**
- Formulář: název scénáře, ikona, role Arie, popis situace
- Uložení v localStorage nebo exportovatelné jako JSON soubor
- Sdílení scénáře přes URL (base64 encoded parametr)

### B10 — Progress grafy a analytika
**Proč:** Aktuální statistiky jsou textové — chybí vizualizace trendů v čase.  
**Co:**
- Čárový graf chybovosti posledních 30 dní (Chart.js nebo Recharts)
- GitHub-style heatmapa aktivity
- Breakdown nejčastějších chyb: articles / prepositions / tenses / word choice
- Poměr čas mluvení vs. čas poslouchání per lekce

### B11 — Export a sdílení
**Co:**
- Export session summary jako PDF (browser print API)
- Export celé lesson history jako CSV nebo JSON
- Sdílení session summary jako screenshot (html2canvas)

### B12 — Video mód v Live API
**Proč:** Gemini 3.1 Live API podporuje video vstup — Aria může "vidět" prostředí.  
**Co:**
- Kamera zapnuta → Aria komentuje vizuální kontext
- Ukázat jídelní lístek → Aria pomůže přečíst a objednat v angličtině
- Ukázat text → Aria pomůže s výslovností vizuálně sledovaného textu
- Ukázat předmět → Aria ho pojmenuje a vytvoří z toho konverzaci

### B13 — Offline mód (základní)
**Co:**
- Service Worker s cache pro statické assety (JS, CSS, obrázky)
- Offline stránka místo prázdné obrazovky
- Vocabulary list dostupný offline (je v localStorage, jen UI potřebuje cache)

### B14 — Uživatelské účty a cloud sync
**Proč:** Změna zařízení = ztráta veškerých dat z localStorage.  
**Co:**
- Google Sign-In (OAuth)
- Sync nastavení, vocabulary, lesson history do cloudu (Cloudflare KV nebo D1)
- Funguje cross-device (mobil + počítač sdílí pokrok)
**Závisí na:** B1, Cloudflare Workers backend

---

## Technický dluh

| ID | Popis | Priorita |
|----|-------|----------|
| TD1 | `ScriptProcessorNode` je deprecated → migrovat na `AudioWorkletProcessor` | P1 |
| TD2 | `process.env.API_KEY` v klientském kódu → viz B1 | P0 |
| TD3 | `useLiveAPI.ts` je velký hook (450 řádků) → zvážit rozdělení | P2 |
| TD4 | Vocabulary auto-detekce (regex heuristika) → nahradit Gemini dotazem | P2 |
| TD5 | Globální `let chatSession` v `geminiService.ts` není React-idiomatic | P2 |
| TD6 | Žádné testy — přidat unit testy alespoň pro utils funkce | P2 |
| TD7 | České řetězce hardcoded v kódu — chybí i18n systém | P3 |

---

## Verze roadmap (orientační)

| Verze | Hlavní přidaná hodnota |
|-------|----------------------|
| v1.5.0 | Reading Mode polish + Vocabulary flashcards (B4) |
| v1.6.0 | Backend proxy + ephemeral token (B1, B2) + model fallback (B3) |
| v2.0.0 | Pronunciation scoring + Progress grafy (B5, B10) |
| v2.5.0 | Gamification + vlastní scénáře + Listening mode (B6, B8, B9) |
| v3.0.0 | Uživatelské účty + cloud sync + Video mód (B12, B14) |
