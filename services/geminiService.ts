import { GoogleGenAI, Chat, Content } from "@google/genai";
import { MODEL_NAME, getSystemInstruction } from "../constants";
import { Message } from "../types";

let chatSession: Chat | null = null;

export const initializeChat = async (level: string = 'TEST_ME', strictness: number = 5, enableTranslation: boolean = false): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: getSystemInstruction(level, strictness, enableTranslation),
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
    return result.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const resetChat = () => {
  chatSession = null;
};