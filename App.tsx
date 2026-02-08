import React, { useState, useEffect, useRef } from 'react';
import { Message, EnglishLevel, AppSettings } from './types';
import { INITIAL_GREETING_TEST, INITIAL_GREETING_LEVEL, PRESET_AVATARS, APP_VERSION } from './constants';
import { initializeChat, sendMessageToGemini } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import LevelSelector from './components/LevelSelector';
import SettingsModal from './components/SettingsModal';
import AvatarView from './components/AvatarView';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { getUsageStats } from './utils/usageUtils';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 9);

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // App State
  const [showLevelSelector, setShowLevelSelector] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] = useState<AppSettings>({
    level: 'TEST_ME',
    nativeLanguage: 'cs',
    autoPlayAudio: true,
    voiceAccent: 'US',
    voiceGender: 'FEMALE',
    correctionStrictness: 5,
    showAvatarMode: true, // Default to Avatar Mode
    showEnglishTranscript: true, // Default ON
    showCzechTranslation: false, // Default OFF
    avatarType: 'preset-female', // Default to Sarah (Preset Female)
    customAvatarImageUrl: null,
    interactionMode: 'live-api', // Default to the new Live API
  });

  const [usage, setUsage] = useState(getUsageStats());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  // Pass settings to TTS hook
  const { speak, stop: stopSpeaking, isSpeaking, speakManual } = useTextToSpeech(settings);

  // Handle Speech Transcript
  useEffect(() => {
    if (transcript) {
      if (settings.showAvatarMode && settings.interactionMode === 'legacy') {
        // In Legacy Avatar mode, transcript updates input text
      }
      setInputText(transcript);
    }
  }, [transcript, settings.showAvatarMode, settings.interactionMode]);

  // Special logic for Avatar Mode (LEGACY ONLY): Auto-send when listening stops
  const prevListeningRef = useRef(isListening);
  useEffect(() => {
    if (settings.interactionMode === 'legacy') {
      if (prevListeningRef.current && !isListening && settings.showAvatarMode && inputText.trim()) {
        handleSend();
      }
      prevListeningRef.current = isListening;
    }
  }, [isListening, settings.showAvatarMode, inputText, settings.interactionMode]);


  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, settings.showAvatarMode]);

  // Listen for usage updates
  useEffect(() => {
    const handleUsageUpdate = () => {
      setUsage(getUsageStats());
    };
    window.addEventListener('aria-usage-updated', handleUsageUpdate);
    return () => window.removeEventListener('aria-usage-updated', handleUsageUpdate);
  }, []);

  const handleLevelSelect = async (level: EnglishLevel) => {
    const newSettings = { ...settings, level };
    setSettings(newSettings);
    setShowLevelSelector(false);

    setIsLoading(true);
    await initializeChat(level, newSettings.correctionStrictness, newSettings.showCzechTranslation);

    const greetingText = level === 'TEST_ME'
      ? INITIAL_GREETING_TEST
      : INITIAL_GREETING_LEVEL(level);

    setMessages([{
      id: generateId(),
      role: 'model',
      text: greetingText,
      timestamp: Date.now()
    }]);

    setIsLoading(false);
  };

  const handleSettingsSave = async (newSettings: AppSettings) => {
    const prevLevel = settings.level;
    const prevStrictness = settings.correctionStrictness;
    const prevTranslation = settings.showCzechTranslation;

    setSettings(newSettings);

    // If critical learning parameters changed while in conversation, notify AI
    // Only relevant for Legacy mode or if we implement chat updates in Live mode later
    const levelChanged = prevLevel !== newSettings.level;
    const strictnessChanged = prevStrictness !== newSettings.correctionStrictness;
    const translationChanged = prevTranslation !== newSettings.showCzechTranslation;

    if (newSettings.interactionMode === 'legacy' && (levelChanged || strictnessChanged || translationChanged) && !showLevelSelector && messages.length > 0) {
      setIsLoading(true);
      try {
        const strictnessLabel = newSettings.correctionStrictness <= 3 ? "Low (Flow)" : newSettings.correctionStrictness <= 7 ? "Balanced" : "High (Strict)";
        const prompt = `[SYSTEM UPDATE]: 
         1. Level: ${newSettings.level}. 
         2. Strictness: ${newSettings.correctionStrictness}/10 (${strictnessLabel}).
         3. Translation Requested: ${newSettings.showCzechTranslation ? "YES" : "NO"}.
         
         Adjust style immediately. If Translation is YES, append '🇨🇿 Translation:' with Czech translation.`;

        const responseText = await sendMessageToGemini(prompt);

        const aiMessage: Message = {
          id: generateId(),
          role: 'model',
          text: responseText,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, aiMessage]);
        speak(responseText);

      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText;
    setInputText('');
    resetTranscript();
    stopSpeaking();

    const newMessage: Message = {
      id: generateId(),
      role: 'user',
      text: userText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(userText);

      const aiMessage: Message = {
        id: generateId(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
      speak(responseText);

    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isSpeaking) stopSpeaking();

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeakerClick = (text: string) => {
    speakManual(text);
  };

  // Helper to determine the image to show in header
  const getHeaderImage = () => {
    if (settings.avatarType === 'custom' && settings.customAvatarImageUrl) {
      return settings.customAvatarImageUrl;
    }
    if (settings.avatarType === 'preset-female') {
      return PRESET_AVATARS.female.imageUrl;
    }
    if (settings.avatarType === 'preset-male') {
      return PRESET_AVATARS.male.imageUrl;
    }
    // Default Virtual Avatar Fallback (Picsum or internal asset)
    return "https://picsum.photos/id/64/200/200";
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-chatbg overflow-hidden relative">

      {showLevelSelector && (
        <LevelSelector onSelect={handleLevelSelect} />
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentSettings={settings}
        onSave={handleSettingsSave}
      />

      {/* Header */}
      <header className="bg-primary px-4 py-3 text-white shadow-md z-10 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
            <img src={getHeaderImage()} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-300 rounded-full border-2 border-primary"></div>
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-tight">Aria <span className="text-[10px] font-normal opacity-70">{APP_VERSION}</span></h1>
          <p className="text-xs text-emerald-100 opacity-90">
            {settings.level === 'TEST_ME' ? 'Assessment' : `Level ${settings.level}`} • {settings.showAvatarMode ? 'Avatar' : 'Chat'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Visualizer in header (only for Legacy mode since Live mode has full avatar) */}
          {isSpeaking && !settings.showAvatarMode && settings.interactionMode === 'legacy' && (
            <div className="flex items-center gap-1 mr-2">
              <span className="animate-bounce bg-white w-1 h-1 rounded-full"></span>
              <span className="animate-bounce delay-75 bg-white w-1 h-1 rounded-full"></span>
              <span className="animate-bounce delay-150 bg-white w-1 h-1 rounded-full"></span>
            </div>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.819l1.019-.372c.115-.043.283-.032.45.083.312.214.641.405.985.57.182.088.277.228.297.348l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.372a1.875 1.875 0 002.282-.819l.922-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.819l-1.02.372c-.114.043-.282.032-.45-.083a7.491 7.491 0 00-.985-.57c-.182-.088-.277-.228-.297-.348l-.178-1.072a1.875 1.875 0 00-1.85-1.567h-1.844zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area - Swaps based on mode */}
      <main className={`flex-1 overflow-y-auto no-scrollbar ${settings.showAvatarMode ? 'pb-0' : 'p-4 sm:p-6 pb-24'}`}>

        {settings.showAvatarMode ? (
          <AvatarView
            latestMessage={messages[messages.length - 1] || null}
            currentInput={inputText}
            isSpeaking={isSpeaking} // Legacy
            isListening={isListening} // Legacy
            toggleListening={toggleListening} // Legacy
            settings={settings}
          />
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col">
            {!showLevelSelector && messages.length === 0 && (
              <div className="text-center mt-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} onClick={() => msg.role === 'model' && handleSpeakerClick(msg.text)}>
                <MessageBubble message={msg} />
              </div>
            ))}

            {isLoading && messages.length > 0 && (
              <div className="flex justify-start mb-4">
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area - Only show in Chat Mode OR Legacy Avatar Mode fallback (though design hides it usually) */}
      {!settings.showAvatarMode && (
        <InputArea
          inputText={inputText}
          setInputText={setInputText}
          onSend={handleSend}
          isListening={isListening}
          toggleListening={toggleListening}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default App;