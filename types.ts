export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'TEST_ME';

export type VoiceAccent = 'US' | 'UK';
export type VoiceGender = 'MALE' | 'FEMALE';

export type AvatarType = 'virtual' | 'preset-female' | 'preset-male' | 'custom';

export type InteractionMode = 'live-api' | 'legacy' | 'reading';

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
  speechRate: number; // Aria speaking rate, client-side playbackRate. 0.5–1.5, 1.0 = normal
  levelSetAt?: number; // P1-11: timestamp poslední změny úrovně (pro progresi/re-test)
}

export interface SessionSummary {
  strengths: string[];
  commonErrors: string[];
  practiceSentences: string[];
  // P0-1: strojově zpracovatelné tagy chyb (uzavřená taxonomie) pro learner profile.
  // commonErrors (české stringy) zůstává pro zobrazení; errorTags jsou pro agregaci.
  errorTags?: { tag: string; example: string }[];
}

export interface LessonHistoryEntry {
  id: string;
  endedAt: number;
  mode: InteractionMode;
  durationMs: number;
  speakingMs: number;
  correctionCount: number;
  summary: SessionSummary;
}

export type VocabularyStatus = 'new' | 'learning' | 'mastered';

export interface VocabularyEntry {
  id: string;
  word: string;
  addedAt: number;
  definition?: string;
  status: VocabularyStatus;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt?: number;
  // P1-7 SRS (spaced repetition):
  srsLevel: number;           // 0–5, index do SRS_INTERVALS_DAYS; default 0
  dueAt: number;              // timestamp příštího opakování; default odvozen v migraci
  consecutiveCorrect: number; // streak správných odpovědí per slovo; default 0
  // P1-8:
  contextSentence?: string;   // věta, ve které se slovo objevilo
}

export interface RecallSessionResult {
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
}

export interface ProgressStats {
  totalLessons: number;
  streakDays: number;
  totalSpeakingMs: number;
  averageCorrectionsLast3: number;
  correctionTrend: 'improving' | 'worsening' | 'stable' | 'insufficient-data';
}
