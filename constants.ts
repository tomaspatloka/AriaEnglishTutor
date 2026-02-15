export const APP_VERSION = "v1.2.0";
export const RELEASE_HISTORY = [
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
export const MODEL_NAME = "gemini-3-flash-preview";

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
];

export const getSystemInstruction = (level: string, strictness: number = 5, enableTranslation: boolean = false, scenario?: Scenario | null) => {
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

Core Rules:
1. **Language Barrier:** The user is Czech. If they write in Czech, **reply in Czech** but guide them back to English.
2. **Translation:** ${enableTranslation ? "REQUIRED: After your English response, provide a Czech translation of what you just said. Start with '🇨🇿 Translation:'." : "No full translation unless asked."}

Output Format:
[English Response]
${enableTranslation ? "[🇨🇿 Translation: ...]" : ""}${correctionFormat}
`;
};

export const INITIAL_GREETING_TEST = "Hi! I'm Aria. Shall we have a quick chat to figure out your English level?";
export const INITIAL_GREETING_LEVEL = (level: string) => `Hello! I'm Aria. It's great to meet you. Ready to practice your English at level ${level}?`;
