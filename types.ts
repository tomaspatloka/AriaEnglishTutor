export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
}

export enum SpeechState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING = 'PROCESSING',
  SPEAKING = 'SPEAKING'
}

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'TEST_ME';

export type VoiceAccent = 'US' | 'UK';
export type VoiceGender = 'MALE' | 'FEMALE';

export type AvatarType = 'virtual' | 'preset-female' | 'preset-male' | 'custom';

export type InteractionMode = 'live-api' | 'legacy';

export interface Scenario {
  id: string;
  icon: string;
  label: string;        // English name
  labelCz: string;      // Czech name
  role: string;          // What Aria plays (e.g. "shop assistant")
  context: string;       // Situation description for system prompt
}

export interface AppSettings {
  level: EnglishLevel;
  nativeLanguage: string;
  autoPlayAudio: boolean;
  voiceAccent: VoiceAccent;
  voiceGender: VoiceGender;
  correctionStrictness: number; // 1-10
  showAvatarMode: boolean; // Toggle between Chat and Avatar UI
  showEnglishTranscript: boolean; // Show original English text in Avatar mode
  showCzechTranslation: boolean; // Show Czech translation in Avatar mode
  
  avatarType: AvatarType;
  customAvatarImageUrl: string | null; // User uploaded
  
  interactionMode: InteractionMode; // Switch between Gemini 2.5 Live and Classic STT/TTS
  activeScenario: string | null; // Scenario ID or null for free conversation
}