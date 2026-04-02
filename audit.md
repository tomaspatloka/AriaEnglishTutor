# 🔍 Audit aplikace Aria English Tutor (v1.2.3)

Tento dokument obsahuje výsledky technické analýzy a uživatelského testování aplikace Aria English Tutor. Audit se zaměřuje na architekturu, výkon, bezpečnost a uživatelskou zkušenost (UX).

---

## 1. Architektura a Struktura Kódu

### 🧱 Aktuální stav
Projekt využívá moderní stack (React 19, Vite, TypeScript). Rozdělení na `components`, `hooks`, `services` a `utils` je správné a přehledné.

### ⚠️ Problémy a Rizika
*   **Monolitické `App.tsx`**: Soubor má přes 800 řádků a obsahuje příliš mnoho zodpovědností (správa session, PWA, globální state, UI layout). To ztěžuje údržbu a testování.
*   **Globální stav v Services**: V `services/geminiService.ts` je proměnná `chatSession` uložena jako globální `let`. To může vést k nekonzistencím při re-renderování nebo v budoucích rozšířeních aplikace.
*   **Provázanost s PWA**: Logika pro instalaci a banner je přímo v hlavní komponentě `App`, což zbytečně nafukuje kód.

### ✅ Doporučení
- [ ] **Refaktoring App.tsx**: Rozdělit na menší komponenty (`Layout`, `Header`, `SessionProvider`).
- [ ] **Vlastní Hooky**: Vyčlenit logiku PWA do `usePWA.ts` a logiku session do `useSession.ts`.
- [ ] **React Context**: Pro globální nastavení a historii využít Context API místo přímého importu utilit v každé komponentě.

---

## 2. Technická Implementace (Audio & AI)

### 🎙️ Audio Pipeline
Aplikace používá Gemini Live API se streamováním audia, což je technologický "edge" projektu.

### ⚠️ Problémy a Rizika
*   **Zastaralý ScriptProcessorNode**: V `useLiveAPI.ts` je použit `ScriptProcessorNode`, který je v moderních prohlížečích označen jako **deprecated**. Běží v hlavním vlákně (main thread) a může způsobovat praskání zvuku při náročném UI renderování.
*   **Selektor Hlasů v TTS**: Hook `useTextToSpeech.ts` hledá hlasy podle jmen (např. "Samantha"). To je nespolehlivé napříč OS (Windows/Android/iOS/macOS).
*   **API Key Security**: API klíč je ve frontendu (`process.env.API_KEY`). To je v pořádku pro lokální demo, ale v produkci je klíč zneužitelný kýmkoliv, kdo si otevře DevTools.

### ✅ Doporučení
- [ ] **AudioWorklet**: Přechod ze `ScriptProcessorNode` na `AudioWorklet` pro stabilnější audio v separátním vlákně.
- [ ] **Dynamic Voice List**: Umožnit uživateli vybrat si reálně dostupný hlas ze seznamu v systému (s tlačítkem "Test Play").
- [ ] **Backend Proxy**: Skrýt API klíč za jednoduchou serverless funkci (např. Vercel/Cloudflare Workers).

---

## 3. UI/UX (Uživatelské rozhraní)

### ✨ Design
Vzhled je prémiový, animace v `AvatarView` působí živě a moderně. Aplikace dobře reaguje na mobilní zobrazení (h-100dvh).

### ⚠️ Problémy a Rizika
*   **Omezení Textu**: V `AvatarView` je text omezen na 7 řádků (`line-clamp-7`). Pokud AI vysvětluje delší koncept, text se ořízne a uživatel ho nemůže přečíst.
*   **Live vs Legacy Zmatení**: Pro běžného uživatele nemusí být jasný rozdíl mezi "Live" a "Standard" módem hned z úvodní obrazovky.
*   **Zpětná vazba sítě**: Když je síť pomalá, aplikace sice napíše "Sit pomala", ale mohl by tam být výraznější vizuální indikátor (např. změna barvy aurory kolem avatara).

### ✅ Doporučení
- [ ] **Scrollable Transcript**: Přidat možnost scrollování nebo "maximalizace" textu v AvatarView.
- [ ] **Indikátor latence**: Přidat vizuální metriku (např. ping v ms nebo signál) pro informování uživatele o kvalitě Live připojení.
- [ ] **Tooltips**: Přidat nápovědy k přepínačům v nastavení, vysvětlující výhody jednotlivých módů.

---

## 4. Lokalizace a Rozšiřitelnost

### ⚠️ Aktuální omezení
Kód obsahuje české řetězce napevno v `constants.ts` a v promptu AI.

### ✅ Doporučení
- [ ] **i18n Ready**: I když zůstanete u češtiny, oddělení textů do JSON souboru (např. `locales/cs.json`) výrazně pročistí kód a umožní snadné přidání dalších jazyků v budoucnu.

---

## 🏁 Akční Plan (Priority)

1.  **Vysoká**: Refaktoring `App.tsx` (čitelnost a udržitelnost).
2.  **Vysoká**: Stabilizace TTS (robustní výběr hlasu).
3.  **Střední**: Implementace AudioWorkletu (výkon).
4.  **Střední**: Scrollovatelný přepis v AvatarView (UX).

---
*Zpracoval: AI Antigravity Team (Google DeepMind)*
