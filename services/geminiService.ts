import { GoogleGenAI, Chat } from "@google/genai";
import { MODEL_NAME, getSystemInstruction } from "../constants";
import { Message, Scenario, SessionSummary } from "../types";
import { incrementUsage } from "../utils/usageUtils";

let chatSession: Chat | null = null;

export const initializeChat = async (level: string = 'TEST_ME', strictness: number = 5, enableTranslation: boolean = false, scenario?: Scenario | null): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: getSystemInstruction(level, strictness, enableTranslation, scenario),
    },
    history: [],
  });
};

export const sendMessageToGemini = async (
  text: string
): Promise<string> => {
  if (!chatSession) {
    // Default fallback
    await initializeChat('TEST_ME', 5, false);
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session");
  }

  try {
    const result = await chatSession.sendMessage({ message: text });
    incrementUsage();
    return result.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const resetChat = () => {
  chatSession = null;
};

const oneShotUtility = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const utilityChat = ai.chats.create({
    model: MODEL_NAME,
    history: [],
    config: {
      systemInstruction: "You are a precise English tutoring utility. Return exactly the requested format.",
    },
  });
  const result = await utilityChat.sendMessage({ message: prompt });
  incrementUsage();
  return result.text || "";
};

const extractJson = (text: string): any | null => {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.substring(start, end + 1));
  } catch {
    return null;
  }
};

export const generateSessionSummary = async (messages: Message[]): Promise<SessionSummary> => {
  const transcript = messages
    .slice(-40)
    .map(m => `${m.role === 'user' ? 'USER' : 'ARIA'}: ${m.text}`)
    .join('\n');

  const prompt = `
Create a short Czech summary for an English lesson.
Return ONLY valid JSON:
{
  "strengths": ["...", "...", "..."],
  "commonErrors": ["...", "...", "..."],
  "practiceSentences": ["...", "...", "..."]
}

Rules:
- Exactly 3 items in each array
- strengths = what was good
- commonErrors = most frequent mistakes
- practiceSentences = short English drill sentences

Transcript:
${transcript}
`;

  const response = await oneShotUtility(prompt);
  const parsed = extractJson(response);

  if (
    parsed &&
    Array.isArray(parsed.strengths) &&
    Array.isArray(parsed.commonErrors) &&
    Array.isArray(parsed.practiceSentences)
  ) {
    return {
      strengths: parsed.strengths.slice(0, 3).map((x: any) => String(x)),
      commonErrors: parsed.commonErrors.slice(0, 3).map((x: any) => String(x)),
      practiceSentences: parsed.practiceSentences.slice(0, 3).map((x: any) => String(x)),
    };
  }

  return {
    strengths: [
      "Dobrá snaha komunikovat plynule.",
      "Aktivně reagujete na otázky.",
      "Používáte praktickou slovní zásobu.",
    ],
    commonErrors: [
      "Časté drobné chyby v časech.",
      "Místy chybí členy a předložky.",
      "Někdy nepřirozený slovosled.",
    ],
    practiceSentences: [
      "I went to work early this morning.",
      "Could you tell me where the station is?",
      "I have been learning English for two years.",
    ],
  };
};

export const generateRetrySentence = async (userSentence: string): Promise<string> => {
  const prompt = `
Fix this English sentence and return ONLY one corrected English sentence.
Sentence: ${userSentence}
`;
  const response = await oneShotUtility(prompt);
  const line = response.split('\n').map(s => s.trim()).find(Boolean);
  return (line || userSentence).replace(/^["'\-*\d.\s]+/, '').trim();
};

export const generatePracticeVariants = async (userSentence: string): Promise<string[]> => {
  const prompt = `
Generate 3 improved English practice variants of this sentence.
Return ONLY JSON:
{"variants":["...","...","..."]}
Sentence: ${userSentence}
`;
  const response = await oneShotUtility(prompt);
  const parsed = extractJson(response);
  if (parsed && Array.isArray(parsed.variants)) {
    return parsed.variants.slice(0, 3).map((x: any) => String(x).trim()).filter(Boolean);
  }

  return [
    `Could you repeat: ${userSentence}`,
    `A more natural version: ${userSentence}`,
    `Try saying it with better grammar: ${userSentence}`,
  ];
};
