export const APP_VERSION = "v1.9.0";
export const RELEASE_HISTORY = [
  {
    version: "v1.9.0",
    date: "2026-06-13",
    title: "Tutor s pamětí — Aria si pamatuje, co tě trápí",
    changes: [
      "Aria si pamatuje tvé opakované chyby napříč lekcemi a nenápadně je vplétá do konverzace (žádná přednáška — přirozené procvičení slabin).",
      "Recyklace slovíček: slova, která se učíš, Aria sama použije v hovoru a občas tě vyzve, ať jedno z nich řekneš.",
      "Kratší repliky Arie — víc prostoru pro tebe; Aria končí otázkou, abys mluvil ty (mluvení = učení).",
      "Poctivý čas mluvení v Reading módu — měří se jen tvůj hlas, ne čas, kdy čte Aria.",
      "Odchod z Reading módu přes ikonu 📚 v hlavičce už neztratí lekci — vždy se zapíše do historie.",
      "Test úrovně (TEST_ME) zjistí tvou úroveň a rovnou ji nastaví — další lekce už jede na zjištěné úrovni.",
      "Denní cíl mluvení + streak v hlavičce i na úvodní obrazovce; nastavitelný cíl 5–60 min; připomínka slovíček k opakování.",
    ],
  },
  {
    version: "v1.8.1",
    date: "2026-06-11",
    title: "Stabilita: opravy z hloubkového auditu (P1)",
    changes: [
      "ErrorBoundary: render chyba už neshodí appku do bílé obrazovky — zobrazí čitelný fallback s tlačítkem 'Načíst znovu' a data zůstanou uložená.",
      "Odolnost úložiště: čtení/zápis nastavení, historie lekcí a denního usage je nově chráněné proti poškozeným datům i plné/nedostupné localStorage (privátní režim) — appka nespadne.",
      "VirtualAvatar: ošetřené časovače animace (mrkání + pohyb úst) se při zavření správně uklízí, žádné updaty po odmountování.",
      "Úklid: odstraněné ladicí výpisy z produkční konzole (Gemini Live).",
      "Rychlejší opětovné načítání: knihovny (React, Gemini SDK) jsou rozdělené do samostatných cacheovatelných částí — prohlížeč je při další návštěvě nestahuje znovu.",
    ],
  },
  {
    version: "v1.8.0",
    date: "2026-06-10",
    title: "Speaking: pauza Arie + nastavitelná rychlost mluvení",
    changes: [
      "Nové tlačítko Pauza/Pokračovat ve Speaking módu (Gemini Live) — pozastaví Ariino mluvení uprostřed věty přes AudioContext.suspend() a po dalším stisku plynule naváže přesně tam, kde skončila.",
      "Pauza zároveň ztiší mikrofon, takže konverzace opravdu 'stojí' a po stisku pokračuje.",
      "Status indikátor a popisek ukazují stav 'Pozastaveno' / 'Aria pozastavena'.",
      "Nastavení → Rychlost mluvení: slider 50–150 % (default 100 %). Pomalejší tempo pro lepší srozumitelnost při výuce.",
      "Rychlost se aplikuje client-side (Gemini Live API server-side rychlost nepodporuje) a projeví se okamžitě bez nutnosti reconnectu.",
      "Pozn.: výrazně pomalejší tempo zní mírně hlouběji (mění se i výška hlasu).",
    ],
  },
  {
    version: "v1.7.1",
    date: "2026-05-28",
    title: "Voice triggers: řekni Arii ať přidá slovo, ona ho přidá",
    changes: [
      "Rozšířené české triggery v Reading Mode auto-detekci slov z hlasu: 'přidej slovo X', 'přidej X do slovníku', 'do slovníčku X', 'slovník X', 'zapiš X', 'ulož X', 'napiš X', 'nevím X', 'nerozumím X', 'co to je X', 'co to znamená X'.",
      "Anglické triggery: 'add the word X', 'save X', 'add X to vocabulary'.",
      "Multi-match v jednom přepisu — pokud řekneš víc spouštěcích frází za sebou, zachytí všechna slova.",
      "Toast '✓ Přidáno: rope' nad pill barem na 2.8 sekundy — vidíš okamžitě, že Aria slovo zachytila.",
      "Blacklist krátkých českých spojek (ten/to/ja/si/...) chrání před false positives.",
      "Minimální délka slova 3 znaky — 'to'/'na' nikdy jako vocab slovo.",
    ],
  },
  {
    version: "v1.7.0",
    date: "2026-05-28",
    title: "Slovníček round 2: quick-add v pill baru, bulk paste, skrýt zvládnutá, refresh po 7 dnech",
    changes: [
      "Quick-add + tlačítko v Reading Mode pill baru — mini popup s autofocus inputem, Aria přeloží automaticky, bez otevírání modalu.",
      "Bulk paste ve slovníčku — sekce 'vložit více', vlož seznam slov oddělený čárkami/řádky/středníky, Aria přeloží paralelně.",
      "Skrýt zvládnutá — toggle v list view i pill baru (default ON). Mastered slova nevidíš v běžném seznamu ani v Reading Mode baru, ale nezmizí — jen se schovají.",
      "Refresh po 7 dnech — zvládnuté slovo se po týdnu od posledního procvičení automaticky vrátí do Recall fronty s nižší prioritou (lehká spaced repetition).",
      "↻ badge na Procvičit tlačítku — vidíš na první pohled kolik slov čeká na zopáknutí.",
      "Pill bar v Reading Mode má 2 řádky meta: počty + skrytá + due-for-refresh.",
    ],
  },
  {
    version: "v1.6.0",
    date: "2026-05-28",
    title: "Slovníček: auto-překlad, hledání, status barvy, flashcard Recall mód",
    changes: [
      "Auto-překlad při ručním přidání slova — Aria automaticky doplní český překlad přes Gemini (stejně jako u hlasového add).",
      "Nová sekce 'vlastní význam' — expandovatelná textarea pro idiomy a technické termíny, kde auto-překlad nestačí.",
      "🔍 Hledání nahoře v slovníčku — instant filter přes slovo i překlad, clear-X tlačítko, empty-state nabízí přidat hledaný výraz.",
      "Status slov: 🔵 nové → 🟠 učím se → 🟢 umím (3× v řadě věděl) — barevný proužek na každém slově + badge + barevný okraj na pill barech v Reading Mode.",
      "Inline edit definice — klepnutím na slovo nebo překlad otevře textarea pro úpravu (užitečné pro špatné Gemini překlady).",
      "🎯 Procvičit (flashcard mód) — klep na kartu pro flip, 3 tlačítka (😐 Nevěděl / 🙂 Tak nějak / 😄 Vím), priorita fronty: učím se → nové → zvládnutá. Slovo, které nevíš, se vrátí na konec dnešní fronty.",
      "Závěrečné summary po procvičování se statistikou (✅ věděl, 🙂 tak nějak, ❌ nevěděl) a tlačítky Znovu / Hotovo.",
      "Tichá migrace starých localStorage dat — slova z předchozích verzí dostanou status='new' a nulové počty, bez ztráty.",
      "Fix: React error #310 (hooks rule violation) — useMemo přesunuté před early return; opraveno setState-during-render v recall fallbacku.",
    ],
  },
  {
    version: "v1.5.0",
    date: "2026-05-24",
    title: "Reading Mode: ⋯ menu, pauza, slovníček s CZ překlady, redesign baru",
    changes: [
      "Nové ⋯ settings menu v Reading Mode — přepínač zobrazení přepisu konverzace a jazyk oprav Arie (čeština/angličtina).",
      "Pauza tlačítko — pozastaví mikrofon bez odpojení Gemini Live session (isPausedRef flag).",
      "Automatické přidávání neznámých slov do slovníčku s českým překladem (řekni 'I don't know X').",
      "Redesign spodního slovníčkového baru — 2 řádky, pills se slovy + CZ definicí, bez vstupního pole.",
      "Fix: TTS výběr hlasu — word-boundary regex místo hardcoded názvů (Windows Zira/David, macOS, Android).",
      "Fix: Czech překlad v AvatarView — odstraněn line-clamp-3, překlad se zobrazí celý.",
    ],
  },
  {
    version: "v1.4.4",
    date: "2026-05-23",
    title: "Fix: oprava Live audio formátu pro Gemini 3.1 (media → audio)",
    changes: [
      "ROOT CAUSE FIX: sendRealtimeInput({ media }) → sendRealtimeInput({ audio }) — Gemini 3.1 odmítá deprecated media_chunks formát a okamžitě zavírá session.",
      "Gemini 2.5 toleroval starý media formát, Gemini 3.1 ho striktně odmítá — breaking change v Live API protokolu.",
    ],
  },
  {
    version: "v1.4.3",
    date: "2026-05-23",
    title: "Hotfix: oprava Live session crash (thinkingConfig + sendClientContent)",
    changes: [
      "Odstraněn thinkingConfig z live.connect config — Live API ho nepodporuje, způsoboval okamžité zavření session.",
      "Nahrazen sendClientContent('Hello') za sendRealtimeInput({ text: 'Hello' }) — správný způsob zahájení konverzace v Gemini 3.1 Live protokolu.",
      "Odstraněn zbytečný import ThinkingLevel.",
    ],
  },
  {
    version: "v1.4.2",
    date: "2026-05-23",
    title: "Upgrade na Gemini 3.1 Flash Live (SDK v2.6.0)",
    changes: [
      "Live model upgradován na gemini-3.1-flash-live-preview — nový audio-to-audio model (real-time dialog, nižší latence, HD hlasy).",
      "SDK @google/genai upgradován z v1.40 na v2.6.0 — nutné pro podporu nového modelu.",
      "Opraveno zpracování audio událostí — nový model posílá více parts v jednom eventu.",
    ],
  },
  {
    version: "v1.4.1",
    date: "2026-05-23",
    title: "Hotfix: revert Live modelu (přechodně)",
    changes: [
      "Live model dočasně vrácen na gemini-2.5-flash — gemini-3.1 vyžaduje SDK v2+ a thinkingConfig.",
    ],
  },
  {
    version: "v1.4.0",
    date: "2026-05-23",
    title: "Model upgrade: Gemini 3.5 Flash (chat)",
    changes: [
      "Upgrade legacy chat modelu: gemini-3-flash-preview → gemini-3.5-flash (výrazně lepší kvalita, stejný free tier).",
    ],
  },
  {
    version: "v1.3.0",
    date: "2026-03-07",
    title: "Audit opravy: UX, bugy, code quality",
    changes: [
      "Opravena diakritika ve stavových hlášeních ('Síť pomalá', 'Aria poslouchá', 'Aria přemýšlí').",
      "Progress tlačítko má nyní přehlednou ikonu grafu místo textu 'PR'.",
      "Odstraněn line-clamp v Avatar módu — dlouhý text je nyní plně scrollovatelný.",
      "STT rozpoznávání respektuje nastavení akcentu (en-US vs en-GB).",
      "Opraven dead code a DRY porušení v TTS hooku.",
      "Opraven race condition při generování session summary.",
      "Zpřesněna detekce korekcí pro přesnější statistiky.",
      "Uvolnění audio zdrojů při odmountování komponenty (memory leak fix).",
      "Odstraněna závislost na externím picsum.photos pro fallback avatar.",
    ],
  },
  {
    version: "v1.2.3",
    date: "2026-03-07",
    title: "Oprava zobrazení korekce v Live módu",
    changes: [
      "Korekce (Correction) nyní zůstává viditelná i po dokončení Ariičiny repliky — uživatel má čas ji přečíst.",
      "Přepis rozdělen na 7 řádků (dříve 4) pro zobrazování delších vět.",
      "Opravena regex pro detekci formátu 'Correction (in Czech):'.",
    ],
  },
  {
    version: "v1.2.2",
    date: "2026-03-07",
    title: "Correction oddělena od přepisu v Avatar modu",
    changes: [
      "Korekce (Correction) se nyní zobrazuje samostatně pod hlavním přepisem v jantarové barvě.",
      "Přepis a korekce jsou vizuálně jasně odlišeny — přepis bílý, korekce žlutá s nadpisem 💡 CORRECTION.",
      "Platí pro Legacy i Live API mód.",
    ],
  },
  {
    version: "v1.2.1",
    date: "2026-03-07",
    title: "UI polish – korekční bublina",
    changes: [
      "Correction box přebarven ze zelené (emerald) na jantarovou (amber) pro lepší vizuální odlišení.",
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-02-15",
    title: "Session Progress + Live UX update",
    changes: [
      "Session summary po hovoru: co bylo dobre, 3 nejcastejsi chyby, 3 vety k treninku.",
      "Historie lekci s trendem chyb, streakem a casem mluveni.",
      "Realtime stavy v Live modu: Mic on, Aria posloucha, Aria premysli, Sit pomala.",
      "One-tap opravy: Zopakovat spravne a Procvicit 3 varianty.",
      "Stabilizace ukonceni/obnoveni Live session po restartu.",
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-02-10",
    title: "Live conversation mode and scenario expansion",
    changes: [
      "Gemini Live audio rezim (real-time conversation).",
      "Vice role-play scenaru pro prakticky trening.",
      "Restart session a force update workflow v nastaveni.",
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-01-30",
    title: "Initial public release",
    changes: [
      "Zakladni chat + avatar rezim pro konverzaci.",
      "Nastaveni urovne, strictness a prekladu.",
      "Statistika usage a zakladni hlasovy workflow.",
    ],
  },
];
export const MODEL_NAME = "gemini-3.5-flash";

export const PRESET_AVATARS = {
  female: {
    id: 'preset-female',
    name: 'Sarah',
    // Sarah: Žena s drdolem v modré košili (odpovídá vizuálu)
    imageUrl: '/Sarah.png',
    voiceGender: 'FEMALE' as const
  },
  male: {
    id: 'preset-male',
    name: 'Tom',
    // Tom: Muž v modrém saku (odpovídá vizuálu)
    imageUrl: '/Tom.png',
    voiceGender: 'MALE' as const
  }
};

import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  { id: 'shopping', icon: '🛒', label: 'Shopping', labelCz: 'Nakupování', role: 'a shop assistant in a clothing/grocery store', context: 'The user is a customer shopping. Help them find items, discuss sizes/colors/prices, suggest alternatives, and handle checkout.' },
  { id: 'restaurant', icon: '🍽️', label: 'Restaurant', labelCz: 'Restaurace', role: 'a waiter/waitress at a restaurant', context: 'The user is a guest at a restaurant. Take their order, recommend dishes, explain the menu, handle special requests and the bill.' },
  { id: 'travel', icon: '🧳', label: 'Traveling', labelCz: 'Cestování', role: 'a local travel guide or tourist info assistant', context: 'The user is a tourist asking for directions, recommendations, sightseeing tips, transport info, or hotel bookings.' },
  { id: 'airport', icon: '✈️', label: 'Airport', labelCz: 'Letiště', role: 'an airport check-in agent or gate attendant', context: 'The user is at an airport. Help with check-in, boarding passes, baggage, gate changes, delays, and customs.' },
  { id: 'police', icon: '👮', label: 'Police', labelCz: 'Policie', role: 'a police officer', context: 'The user needs to report something (lost item, theft, accident) or is stopped for a routine check. Be professional and helpful.' },
  { id: 'accident', icon: '🚗', label: 'Car Accident', labelCz: 'Dopravní nehoda', role: 'the other driver involved in a minor car accident', context: 'A minor fender bender has occurred. Exchange information, discuss what happened, deal with insurance details.' },
  { id: 'gas-station', icon: '⛽', label: 'Gas Station', labelCz: 'Tankování', role: 'a gas station attendant', context: 'The user needs to refuel, pay, ask about car wash, buy snacks, or get directions.' },
  { id: 'doctor', icon: '🏥', label: 'Doctor', labelCz: 'Lékař', role: 'a doctor or GP at a medical clinic', context: 'The user is a patient describing symptoms. Ask about their condition, suggest treatment, explain medication, schedule follow-ups.' },
  { id: 'hotel', icon: '🏨', label: 'Hotel', labelCz: 'Hotel', role: 'a hotel receptionist', context: 'The user is checking in/out, asking about amenities, room service, WiFi, complaints, or extending their stay.' },
  { id: 'pharmacy', icon: '💊', label: 'Pharmacy', labelCz: 'Lékárna', role: 'a pharmacist', context: 'The user needs medicine, has a prescription, or asks about over-the-counter remedies for common issues.' },
  { id: 'bank', icon: '🏦', label: 'Bank', labelCz: 'Banka', role: 'a bank teller', context: 'The user needs to open an account, exchange currency, report a lost card, or make a transfer.' },
  { id: 'job-interview', icon: '💼', label: 'Job Interview', labelCz: 'Pohovor', role: 'a hiring manager conducting a job interview', context: 'Interview the user for a position. Ask about experience, skills, motivation. Give feedback on their answers.' },
  { id: 'phone-call', icon: '📞', label: 'Phone Call', labelCz: 'Telefonát', role: 'a customer service representative on the phone', context: 'The user is calling about an order, complaint, appointment booking, or information request. Handle it professionally.' },
  { id: 'neighbors', icon: '🏠', label: 'Neighbors', labelCz: 'Sousedé', role: 'a friendly neighbor', context: 'Casual chat between neighbors — noise complaint, borrowing something, community event, small talk about weather/life.' },
  { id: 'creo-training', icon: '⚙️', label: 'Creo Training', labelCz: 'Školení Creo', role: 'a PTC Creo Parametric instructor leading a hands-on training session on Creo 10 Motion (Mechanism Design)', context: `The user is a Czech engineer attending an in-person Creo Parametric Motion training abroad. The entire training is in English. You are the instructor.

KEY VOCABULARY the user needs to practice:
- Motion basics: mechanism, assembly, connection, joint (pin, slider, cylinder, planar, ball, bearing, general), servo motor, spring, damper, cam, gear pair, belt/chain
- Analysis: motion analysis, kinematic analysis, dynamic analysis, force balance, gravity, friction, initial conditions, time step, animation, playback, trace curve, measure, graph
- Creo UI: model tree, ribbon, constraints, datum plane, coordinate system, drag component, regenerate, save, undo, define, edit definition, preview
- Training interaction: "Can you repeat that?", "What does ... mean?", "How do I create a...?", "Could you show that step again?", "I get an error when...", "My assembly doesn't move because...", "Where do I find...?", "Is there a shortcut for...?"
- Small talk: lunch break, coffee break, "Where are you from?", "What software do you normally use?", hotel, transport

BEHAVIOR:
- Start each session as if beginning a training module (e.g. "Good morning everyone, today we'll cover servo motors and motion analysis...")
- Use real Creo terminology naturally
- When the user asks a question, answer as a real instructor would, then encourage them to try it
- If the user struggles to express something, help them form the sentence correctly
- Practice both asking questions AND understanding instructions
- Periodically simulate instructor directions: "Now click on Insert > Mechanism > Servo Motor..." and ask the user to confirm they follow` },
];

export const getSystemInstruction = (level: string, strictness: number = 5, enableTranslation: boolean = false, scenario?: Scenario | null, focusWords: string[] = [], recurringErrors: string[] = []) => {
  let correctionLogic = "";
  let correctionFormat = "";

  if (strictness <= 2) {
    // 1-2: Úplně volný režim — žádné opravy
    correctionLogic = `
      **STRICTNESS LEVEL: ${strictness}/10 (Minimal — Pure Conversation)**
      - NEVER correct the user's English. No corrections at all.
      - Even if the user makes obvious grammar mistakes, ignore them completely.
      - Focus 100% on having a natural, encouraging conversation.
      - Your only goal is to keep the user talking and feeling confident.
    `;
    correctionFormat = ""; // Žádný correction blok
  } else if (strictness <= 4) {
    // 3-4: Mírný — jen kritické chyby
    correctionLogic = `
      **STRICTNESS LEVEL: ${strictness}/10 (Low — Focus on Flow)**
      - Do NOT correct minor grammar, word order, or pronunciation mistakes.
      - Only correct the user if their meaning is completely unintelligible or they use a wrong word that changes the meaning entirely.
      - Prioritize natural conversation flow over accuracy.
      - If you must correct, do it gently inline (e.g., "Oh, you mean X? Great!") — do NOT use the 💡 Correction block.
    `;
    correctionFormat = ""; // Žádný formální correction blok
  } else if (strictness <= 6) {
    // 5-6: Balanced — opravuje jasné chyby
    correctionLogic = `
      **STRICTNESS LEVEL: ${strictness}/10 (Balanced — Standard Tutoring)**
      - Maintain a natural conversation flow first — respond to what the user said.
      - At the bottom of your response, list "💡 Corrections" ONLY for clear grammar or vocabulary errors.
      - Explain briefly *why* it was wrong in Czech (Čeština).
      - Skip tiny mistakes (missing articles, minor preposition errors) — focus on errors that matter.
    `;
    correctionFormat = "\n[💡 Correction (in Czech) — only for clear errors]";
  } else if (strictness <= 8) {
    // 7-8: Přísný — opravuje většinu chyb
    correctionLogic = `
      **STRICTNESS LEVEL: ${strictness}/10 (High — Thorough Tutoring)**
      - ACT LIKE A SUPPORTIVE BUT THOROUGH TUTOR.
      - Catch most mistakes including articles, prepositions, tense errors, and word choice.
      - Provide "💡 Corrections" at the end with Czech explanations for each error.
      - Also suggest better/more natural phrasing where appropriate.
    `;
    correctionFormat = "\n[💡 Correction (in Czech) — thorough]";
  } else {
    // 9-10: Maximum strict — každou chybu
    correctionLogic = `
      **STRICTNESS LEVEL: ${strictness}/10 (Maximum — Intensive Drill)**
      - ACT LIKE A STRICT BUT SUPPORTIVE LANGUAGE DRILL INSTRUCTOR.
      - Catch EVERY single mistake — grammar, vocabulary, articles, prepositions, word order, collocations, register, style.
      - Provide detailed "💡 Corrections" at the end with thorough Czech explanations for each error.
      - Suggest the correct version AND explain the rule behind it.
      - If the user's sentence was understandable but not perfectly natural, show the ideal phrasing.
    `;
    correctionFormat = "\n[💡 Correction (in Czech) — every mistake, detailed]";
  }

  // P0-2: recyklace učených slov. Blok jen když máme slova (token economy mimo prázdný stav).
  const vocabBlock = focusWords.length > 0 ? `
**VOCABULARY RECYCLING:** The student is learning these words: ${focusWords.join(', ')}.
Naturally use 1–2 of them in conversation when fitting. Occasionally invite the student
to use one ("Can you try using the word 'rope'?"). Never list them.
` : '';

  // P0-3: jen v assessment módu — instrukce vyhlásit verdikt v parsovatelném formátu.
  const testMeBlock = level === 'TEST_ME' ? `
**LEVEL ASSESSMENT:** When you are confident about the student's level (after 6–10 exchanges),
announce the verdict on ITS OWN line, EXACTLY in this format and nothing else on that line:
LEVEL: B1
(allowed values: A1, A2, B1, B2, C1 — never "almost B1", never "B1+")
Then congratulate the student briefly in Czech.
` : '';

  // P0-1: opakované slabiny žáka z předchozích lekcí. Blok jen když profil něco má.
  const weaknessBlock = recurringErrors.length > 0 ? `
**STUDENT'S RECURRING WEAKNESSES (from previous lessons):** ${recurringErrors.join('; ')}.
Gently weave practice of these into the conversation. Do NOT lecture about them or list
them — create natural moments where the student must use them.
` : '';

  const scenarioBlock = scenario ? `
**ROLE-PLAY SCENARIO: ${scenario.label}**
- You are NOT a teacher right now. You are playing the role of **${scenario.role}**.
- Stay fully in character. Speak and behave as ${scenario.role} would in real life.
- ${scenario.context}
- Start the conversation in character (e.g., greet the customer, ask how you can help).
- Use vocabulary and phrases typical for this situation.
- Keep the corrections (if any) separate — do NOT break character to correct, add them at the end.
` : '';

  return `
Identity: You are "Aria", an empathetic, patient, and friendly English teacher.
User's Native Language: Czech (Čeština).

Current Goal: ${level === 'TEST_ME'
      ? "Determine the user's English level (A1-C1) through a short, natural conversation/test."
      : `Teach and converse with the user at the **${level}** CEFR level.`}

${scenarioBlock}
${correctionLogic}
${vocabBlock}
${weaknessBlock}
${testMeBlock}
Core Rules:
1. **Language Barrier:** The user is Czech. If they write in Czech, **reply in Czech** but guide them back to English.
2. **Translation:** ${enableTranslation ? "REQUIRED: After your English response, provide a Czech translation of what you just said. Start with '🇨🇿 Translation:'." : "No full translation unless asked."}
3. **Turn economy:** Keep your turns SHORT — 1–3 sentences. End most turns with a question to the student. Never fill silence with explanations the student didn't ask for. The student must speak most of the time.

Output Format:
[English Response]
${enableTranslation ? "[🇨🇿 Translation: ...]" : ""}${correctionFormat}
`;
};

export const INITIAL_GREETING_TEST = "Hi! I'm Aria. Shall we have a quick chat to figure out your English level?";
export const INITIAL_GREETING_LEVEL = (level: string) => `Hello! I'm Aria. It's great to meet you. Ready to practice your English at level ${level}?`;

export const getReadingSystemInstruction = (
  correctionLang: 'cs' | 'en' = 'cs',
  referenceText?: string | null
): string => {
  const base = `
Identity: You are "Aria", an English pronunciation coach. The user is a Czech speaker practicing reading English aloud.

Your Core Task: PRONUNCIATION COACHING for reading practice — NOT grammar tutoring.

How it works:
1. LISTEN while the user reads English aloud from any source (book, article, etc.).
2. When the user pauses or finishes a sentence: REPEAT it with PERFECT native English pronunciation. Speak clearly, at natural pace, with correct stress and intonation. This is your primary job.
3. After repeating, add ONE brief pronunciation tip if helpful (silent letters, tricky stress, common Czech-English mispronunciation). ONE sentence max. Give this tip in ${correctionLang === 'cs' ? 'Czech' : 'English'}.
4. VOCABULARY: If user asks about a word meaning ("I don't know X", "co znamená X", "what does X mean"): explain briefly in ${correctionLang === 'cs' ? 'Czech' : 'English'} + one short example sentence. Keep it under 3 sentences.
5. TRANSLATION: If user asks for a Czech translation, say it clearly in Czech.
6. ENCOURAGEMENT: Be warm, supportive, and brief. Celebrate small wins.

Rules:
- Responses must be SHORT — this is spoken audio, not written text.
- NEVER correct grammar or spelling. ONLY focus on pronunciation and word meaning.
- If the user speaks Czech, respond briefly in ${correctionLang === 'cs' ? 'Czech' : 'English'}, then return focus to reading practice.
- When modeling pronunciation, speak clearly at moderate pace (not too fast).
- Do NOT add lengthy explanations — this is a quick pronunciation drill, not a lecture.
`;

  if (!referenceText) return base;

  return base + `
REFERENCE TEXT (the user is reading EXACTLY this text):
"""
${referenceText}
"""

Use this as ground truth. Compare the user's speech against this reference text.
- Only correct genuine mispronunciations against the reference.
- NEVER correct against your own speech-to-text guess if it disagrees with the reference.
- If the user clearly skips ahead or repeats a sentence, follow them — they are practicing, not deviating.
`;
};

