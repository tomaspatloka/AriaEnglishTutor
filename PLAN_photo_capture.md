# Implementační plán — Photo Capture pro Reading mode

> Vytvořeno: 2026-05-27 | Plánovaná exekuce: 2026-05-28
> Verdikt feasibility studie: **GO (Fáze 1 MVP)** — viz konverzace 2026-05-27
> Tier: E3 | Odhad: 2.5–3.5 h focused work

---

## Pre-flight checklist (5 min, na začátku zítřejší session)

- [ ] `git pull` — sync s `origin/main` (možná nějaké drobnosti z mobilu)
- [ ] `git status` — clean working tree (PLAN_photo_capture.md může být untracked, OK)
- [ ] `bun install` — node_modules sync (rollup Linux binárka)
- [ ] `bun run build` — baseline OK
- [ ] `bun run dev` — dev server na :5173 (nebo co Vite hodí), otevřít v Chrome
- [ ] Manuální test current reading mode: tap „Reading Mode" → Live connect → řekni jednu větu → ARIA odpoví. Tohle je baseline pro regression check.
- [ ] Zkontrolovat `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` v `.env.local` (build warning to indikuje)

**Pokud cokoli z výše neprojde → STOP, vyřešit první, teprve potom kódovat.**

---

## Architektura — finální podoba (cíl plánu)

```
ReadingModeView
├── header: [📷 Foto] tlačítko
├── referenceText state (string | null)
├── isExtracting state (boolean)
├── PhotoCaptureSheet (modal, open/close)
│   ├── <input type="file" accept="image/*" capture="environment">
│   ├── preview <img>
│   ├── [Použít] [Znovu] [Zrušit]
│   └── → calls geminiService.extractReadingText(file)
└── useLiveAPI(settings, correctionLang, referenceText)
        └── getReadingSystemInstruction(correctionLang, referenceText)
                └── pokud referenceText → append "REFERENCE TEXT: ..." do instrukce
```

Klíčový princip: `referenceText` change → `useLiveAPI` reconnect → nová instrukce pro Gemini Live. Reading mode bez fotky = identicky jako dnes.

---

## Krok 1 — `extractReadingText` v geminiService (30 min)

**Cíl:** Funkce vezme `File` (obrázek), pošle do Gemini 3.5 Flash, vrátí extrahovaný text.

**Soubor:** `services/geminiService.ts` (append)

**Kostra:**

```ts
export const extractReadingText = async (imageFile: File): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1) Convert File → base64 (bez data:image/jpeg;base64, prefixu)
  const base64 = await fileToBase64(imageFile);

  // 2) Resize na max 1568px stranu pokud potřeba (Gemini doporučení, šetří tokeny)
  //    — Pro MVP přeskočit. Mobilní fotky jsou ~3-4MB, Gemini je vezme.
  //    — Pokud bude pomalé, doplnit v polish kroku.

  // 3) Multimodal request
  const result = await ai.models.generateContent({
    model: MODEL_NAME, // gemini-3.5-flash
    contents: [{
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: imageFile.type || 'image/jpeg',
            data: base64,
          },
        },
        {
          text: `Extract the main reading text from this photo of a printed page.
Rules:
- Return ONLY the extracted text, no preamble, no markdown.
- Preserve paragraph breaks with double newlines.
- Read top-to-bottom, left-to-right. If multiple columns, follow the main reading column.
- Ignore page numbers, footers, captions, ads.
- If the text is not in English, return it as-is (do not translate).
- If you cannot read the text (blurry, no text visible), return exactly: NO_TEXT_DETECTED`,
        },
      ],
    }],
  });

  incrementUsage();
  const text = result.text?.trim() || '';

  if (text === 'NO_TEXT_DETECTED' || !text) {
    throw new Error('Nepodařilo se přečíst text z fotky. Zkus jinou fotku nebo lepší osvětlení.');
  }

  return text;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:image/jpeg;base64," prefix
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
```

**Hotovo když:**
- `bun run build` projde
- Manuálně zavolat z dev console (importem nebo inline test) — vrátí string

**Commit:**
```
feat(reading): add extractReadingText service using Gemini Vision

Multimodal Gemini 3.5 Flash call — File → base64 → inlineData part.
Returns extracted text or throws if no text detected.
```

---

## Krok 2 — `PhotoCaptureSheet` komponenta (45 min)

**Cíl:** Modal s photo input, preview, použít/znovu/zrušit. Volá extractReadingText, vrátí text parentu.

**Soubor:** `components/PhotoCaptureSheet.tsx` (nový)

**Kostra:**

```tsx
import React, { useRef, useState } from 'react';
import { extractReadingText } from '../services/geminiService';

interface PhotoCaptureSheetProps {
  open: boolean;
  onClose: () => void;
  onTextExtracted: (text: string) => void;
}

const PhotoCaptureSheet: React.FC<PhotoCaptureSheetProps> = ({ open, onClose, onTextExtracted }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  };

  const handleUse = async () => {
    if (!file) return;
    setIsExtracting(true);
    setError(null);
    try {
      const text = await extractReadingText(file);
      onTextExtracted(text);
      reset();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Něco se pokazilo.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setError(null);
    fileInputRef.current?.click();
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg max-w-md w-full p-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Vyfotit stránku</h2>

        {!previewUrl && (
          <>
            <p className="text-sm text-slate-300">
              Vyfoť stránku knihy nebo článku. ARIA pak bude vědět přesný text a opraví jen
              skutečné chyby ve výslovnosti.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="text-sm"
            />
          </>
        )}

        {previewUrl && (
          <>
            <img src={previewUrl} alt="náhled stránky" className="max-h-64 object-contain rounded" />
            {isExtracting && <div className="text-sm text-blue-300">⏳ Čtu text ze stránky...</div>}
            {error && <div className="text-sm text-red-400">⚠️ {error}</div>}
          </>
        )}

        <div className="flex gap-2 justify-end mt-2">
          {previewUrl && !isExtracting && (
            <>
              <button onClick={handleRetake} className="px-3 py-2 bg-slate-700 rounded">Znovu</button>
              <button onClick={handleUse} className="px-3 py-2 bg-blue-600 rounded">Použít</button>
            </>
          )}
          <button onClick={handleClose} disabled={isExtracting} className="px-3 py-2 bg-slate-800 rounded">
            Zrušit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCaptureSheet;
```

**Hotovo když:**
- Komponenta se v dev exportuje, build projde
- Vizuální test: dočasně importovat do `ReadingModeView`, otevřít `<PhotoCaptureSheet open={true} onClose={()=>{}} onTextExtracted={t=>console.log(t)}/>` → vyfotit → console.log vypíše text

**Commit:**
```
feat(reading): add PhotoCaptureSheet component

Modal with native camera input (<input capture>),
preview, Use/Retake/Cancel actions, loading + error states.
```

---

## Krok 3 — Reference text threading (20 min)

**Cíl:** `useLiveAPI` přijme volitelný `referenceText`, propíše ho přes `getReadingSystemInstruction`. Reconnect při změně.

**Soubory:**
- `constants.ts` — rozšířit `getReadingSystemInstruction`
- `hooks/useLiveAPI.ts` — přidat parametr, zařadit do deps

**Změna v `constants.ts`:**

```ts
export const getReadingSystemInstruction = (
  correctionLang: 'cs' | 'en' = 'cs',
  referenceText?: string | null
): string => {
  const base = `... (současný text) ...`;

  if (!referenceText) return base;

  return base + `

REFERENCE TEXT (the user is reading EXACTLY this text):
"""
${referenceText}
"""

Use this as ground truth. Compare the user's speech against this reference text.
- Only correct genuine mispronunciations against the reference.
- NEVER correct against your own speech-to-text guess if it disagrees with the reference.
- If the user clearly skips ahead or repeats a sentence, follow them — they are practicing, not deviating.`;
};
```

**Změna v `hooks/useLiveAPI.ts`:**
- Signature: `useLiveAPI(settings, correctionLang = 'cs', referenceText: string | null = null)`
- V `connect()` při sestavování `systemInstruction.parts[0].text` → předat `referenceText`
- Přidat `referenceText` do `useCallback` deps + do effectu, který spouští reconnect při změně klíčových props

**Hotovo když:**
- `bun run build` projde, žádné TS chyby
- Bez fotky reading mode funguje identicky (regression check — udělat ručně)

**Commit:**
```
feat(reading): thread referenceText through useLiveAPI

useLiveAPI now accepts optional referenceText. When present,
getReadingSystemInstruction appends a REFERENCE TEXT block instructing
the model to use it as ground truth. Zero-impact when null.
```

---

## Krok 4 — Integrace do `ReadingModeView` (30 min)

**Cíl:** Tlačítko 📷 v headeru, state pro `referenceText`, otevírání modalu, zobrazení Předlohy.

**Soubor:** `components/ReadingModeView.tsx`

**Klíčové změny:**

```tsx
import PhotoCaptureSheet from './PhotoCaptureSheet';

// uvnitř komponenty:
const [referenceText, setReferenceText] = useState<string | null>(null);
const [showPhotoSheet, setShowPhotoSheet] = useState(false);

// předat do hooku:
const { ... } = useLiveAPI(settings, correctionLanguage, referenceText);

// v JSX header — vedle Menu tlačítka:
<button onClick={() => setShowPhotoSheet(true)} title="Vyfotit stránku">📷</button>

// pokud je referenceText, zobrazit předlohu:
{referenceText && (
  <div className="bg-slate-800 rounded p-3 my-2 max-h-40 overflow-y-auto text-sm">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs text-slate-400">PŘEDLOHA Z FOTKY</span>
      <button onClick={() => setReferenceText(null)} className="text-xs text-red-400">
        Smazat
      </button>
    </div>
    <div className="whitespace-pre-wrap">{referenceText}</div>
  </div>
)}

// na konci komponenty:
<PhotoCaptureSheet
  open={showPhotoSheet}
  onClose={() => setShowPhotoSheet(false)}
  onTextExtracted={setReferenceText}
/>
```

**Hotovo když:**
- Tlačítko 📷 viditelné v headeru
- Tap otevře modal
- Po úspěšném extraktu se text zobrazí v kartě „Předloha"
- Tlačítko Smazat funguje (referenceText → null)
- `bun run build` projde

**Commit:**
```
feat(reading): integrate PhotoCaptureSheet into ReadingModeView

Adds 📷 button to header, manages referenceText state,
displays extracted text in PŘEDLOHA card with clear button.
```

---

## Krok 5 — Test na mobilu (15 min)

**Cíl:** Ověřit reálnou hodnotu funkce na cíleném zařízení (Android Chrome).

**Postup:**
1. `git push` na main → Cloudflare auto-deploy (~30s)
2. Otevřít live URL na mobilu (Android Chrome)
3. Reading mode → 📷 → vyfotit reálnou stránku knihy
4. Čekat na extract (3–5s)
5. Ověřit:
   - Text v Předloze odpovídá fotce (acceptable: ~95%)
   - Wake lock funguje (displej nezhasne po 30s)
   - Live se rekonnectne s novou instrukcí (sleduj console v Chrome Remote Debug)
6. Reálný čtecí test:
   - Přečíst správně 2-3 věty z předlohy → ARIA by NEMĚLA opravovat
   - Přečíst záměrně špatně 1 slovo → ARIA by MĚLA opravit
   - Porovnat s pre-foto chováním (více falešných oprav)

**Pokud test selže:**
- OCR špatný → upravit prompt v `extractReadingText`
- ARIA stále opravuje správné → posílit instrukci (dát instrukci výš v promptu, použít CAPS)
- Reconnect nefunguje → zkontrolovat `useEffect` deps v `useLiveAPI`

**Nic se necommituje** dokud test neprojde. Pokud projde:

**Commit:**
```
test(reading): manual mobile validation passed

Verified on Android Chrome: photo capture → OCR → ARIA respects
reference text, only corrects genuine mispronunciations.
```
(Tento commit je volitelný — pokud nepřidává kód, stačí říct v session report.)

---

## Krok 6 — Polish (20 min, optional)

Drobnosti které lze ponechat na jindy:

- [ ] Loading skeleton v Předloze místo `⏳ Čtu text...`
- [ ] Toast „Předloha uložena" po úspěšném extraktu
- [ ] Indikátor v headeru když je `referenceText` aktivní (badge ●)
- [ ] Resize fotky před uploadem (canvas → max 1568px) pokud bude pomalé
- [ ] Disclaimer v modalu: „Funguje nejlépe s tištěným textem"
- [ ] Persist referenceText do `sessionStorage` (přežije F5)

**Commit (per change):**
```
polish(reading): <konkretní vec>
```

---

## Final — push & verifikace (10 min)

- [ ] `bun run build` — final OK
- [ ] `git log --oneline -10` — všechny commits přítomné
- [ ] `git push` → Cloudflare deploy
- [ ] Final smoke test na mobilu
- [ ] Update `ISA.md` v repu — buď přepsat na nový task „Photo capture", nebo nový soubor `ISA_photo_capture.md` (do diskuze zítra)
- [ ] Smazat `PLAN_photo_capture.md` (nebo nechat jako historický artefakt — preference)

---

## Acceptance criteria — celá funkce hotová když:

- [ ] AC-1: Tap 📷 v reading módu otevře fotoaparát mobilu
- [ ] AC-2: Vyfocení → preview s tlačítky Použít/Znovu/Zrušit
- [ ] AC-3: Tap Použít → spinner → extracted text v Předloze do 5 s
- [ ] AC-4: Reading session funguje s referenčním textem (ARIA porovnává)
- [ ] AC-5: Test: přečteno správně → ARIA neopraví (3/3 zkušebních vět)
- [ ] AC-6: Test: záměrná chyba → ARIA opraví (3/3 zkušebních chyb)
- [ ] AC-7: Tlačítko Smazat předlohu vrátí mode do pre-foto stavu
- [ ] AC-8: Bez fotky reading mode = identicky jako dnes (zero regression)
- [ ] AC-9: `bun run build` zelený, žádné nové TS chyby
- [ ] AC-10: Funguje na Cloudflare deploy z Android Chrome (PWA)

---

## Rollback strategie

**Per-step:** každý krok je samostatný commit → `git revert <hash>` vrátí pouze ten krok bez ovlivnění ostatních.

**Pokud test na mobilu (Krok 5) totálně selže:**
- Nepushovat krok 4 (integrace), nechat krok 1-3 v `main` jako infrastruktura — neaktivované, neviditelné pro uživatele
- Vrátit se k tomu jindy s upraveným promptem / přístupem

**Pokud Gemini Vision vrací konzistentně špatný text:**
- Plán B: Tesseract.js (offline, +2MB bundle). Bude vyžadovat samostatný feasibility re-check.

**Pokud Live API přestane reagovat na referenceText:**
- Možná jsme blízko limitu system instruction (~10k tokens). Zkrátit referenceText na první N znaků (např. 3000).

---

## Časový souhrn

| Krok | Trvání | Kumulativně |
|------|--------|-------------|
| Pre-flight | 5 min | 0:05 |
| 1. Service | 30 min | 0:35 |
| 2. Component | 45 min | 1:20 |
| 3. Threading | 20 min | 1:40 |
| 4. Integrace | 30 min | 2:10 |
| 5. Test mobil | 15 min | 2:25 |
| 6. Polish | 20 min | 2:45 |
| Final push | 10 min | 2:55 |

**Realistický odhad: 3 h focused work** (s drobnými detours typu „proč to nereaguje" počítej 3.5 h).

---

## Co NEDĚLAT zítra (anti-scope)

- ❌ Refaktoring `App.tsx` (800+ řádků zůstává) — to je jiný task
- ❌ Highlight current sentence ve čteném textu — Fáze 2, ne MVP
- ❌ Multi-page knihovna — Fáze 3, defer
- ❌ Backend proxy pro API key — ne, browser-direct Gemini call zůstává
- ❌ Tesseract jako záloha — implementovat až jako Plán B kdyby Gemini selhal
- ❌ Vlastní kamera UI (getUserMedia) — `<input capture>` stačí pro MVP
- ❌ i18n / nové překlady — všechno česky v UI, jak je teď
