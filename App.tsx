import React, { useState, useEffect, useRef } from 'react';
import { Message, EnglishLevel, AppSettings, Scenario } from './types';
import { INITIAL_GREETING_TEST, INITIAL_GREETING_LEVEL, PRESET_AVATARS, APP_VERSION, SCENARIOS } from './constants';
import ScenarioSelector from './components/ScenarioSelector';
import { initializeChat, sendMessageToGemini } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import LevelSelector from './components/LevelSelector';
import SettingsModal from './components/SettingsModal';
import AvatarView from './components/AvatarView';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { getUsageStats } from './utils/usageUtils';
import { loadSettings, saveSettings } from './utils/settingsUtils';

const DEFAULT_SETTINGS: AppSettings = {
  level: 'TEST_ME',
  nativeLanguage: 'cs',
  autoPlayAudio: true,
  voiceAccent: 'US',
  voiceGender: 'FEMALE',
  correctionStrictness: 5,
  showAvatarMode: true,
  showEnglishTranscript: true,
  showCzechTranslation: false,
  avatarType: 'preset-female',
  customAvatarImageUrl: null,
  interactionMode: 'live-api',
  activeScenario: null,
};

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 9);

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // App State
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(DEFAULT_SETTINGS));
  const [showLevelSelector, setShowLevelSelector] = useState(() => !localStorage.getItem('aria_app_settings'));
  const [showSettings, setShowSettings] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showApiInfo, setShowApiInfo] = useState(false);

  const [usage, setUsage] = useState(getUsageStats());

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Detect if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    if (isStandalone) return; // Already installed — never show banner

    // Check if user dismissed banner before
    const dismissed = localStorage.getItem('aria_pwa_dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('aria_pwa_dismissed', '1');
  };

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
    saveSettings(newSettings);
    setShowLevelSelector(false);

    setIsLoading(true);
    await initializeChat(level, newSettings.correctionStrictness, newSettings.showCzechTranslation, activeScenario);

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

  // Auto-init for persisted settings
  useEffect(() => {
    if (!showLevelSelector && messages.length === 0) {
      const initPersistentSession = async () => {
        setIsLoading(true);
        await initializeChat(settings.level, settings.correctionStrictness, settings.showCzechTranslation, activeScenario);

        const greetingText = settings.level === 'TEST_ME'
          ? INITIAL_GREETING_TEST
          : INITIAL_GREETING_LEVEL(settings.level);

        setMessages([{
          id: generateId(),
          role: 'model',
          text: greetingText,
          timestamp: Date.now()
        }]);
        setIsLoading(false);
      };
      initPersistentSession();
    }
  }, [showLevelSelector, messages.length, settings.level, settings.correctionStrictness, settings.showCzechTranslation]);

  const handleSettingsSave = async (newSettings: AppSettings) => {
    const prevLevel = settings.level;
    const prevStrictness = settings.correctionStrictness;
    const prevTranslation = settings.showCzechTranslation;

    setSettings(newSettings);
    saveSettings(newSettings);

    // If critical learning parameters changed while in conversation, notify AI
    // Only relevant for Legacy mode or if we implement chat updates in Live mode later
    const levelChanged = prevLevel !== newSettings.level;
    const strictnessChanged = prevStrictness !== newSettings.correctionStrictness;
    const translationChanged = prevTranslation !== newSettings.showCzechTranslation;

    if (newSettings.interactionMode === 'legacy' && (levelChanged || strictnessChanged || translationChanged) && !showLevelSelector && messages.length > 0) {
      setIsLoading(true);
      try {
        const strictnessLabel = newSettings.correctionStrictness <= 2 ? "Minimal (No corrections)" : newSettings.correctionStrictness <= 4 ? "Low (Critical only)" : newSettings.correctionStrictness <= 6 ? "Balanced" : newSettings.correctionStrictness <= 8 ? "High (Thorough)" : "Maximum (Every mistake)";
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

  const handleScenarioSelect = (scenario: Scenario | null) => {
    const newSettings = { ...settings, activeScenario: scenario?.id || null };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Resolve active scenario object from ID
  const activeScenario = settings.activeScenario
    ? SCENARIOS.find(s => s.id === settings.activeScenario) || null
    : null;

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

      <ScenarioSelector
        isOpen={showScenarios}
        onClose={() => setShowScenarios(false)}
        activeScenarioId={settings.activeScenario}
        onSelect={handleScenarioSelect}
      />

      {/* Header */}
      <header className="bg-primary px-4 py-3 text-white shadow-md z-10 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
            <img src={getHeaderImage()} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-300 rounded-full border-2 border-primary"></div>
        </div>
        <div className="flex-1 overflow-hidden">
          <h1 className="font-black text-lg leading-tight truncate text-white">Aria <span className="text-[11px] font-bold text-emerald-200 ml-0.5">{APP_VERSION}</span></h1>
          <p className="text-[13px] font-semibold text-white/80 truncate">
            {settings.level === 'TEST_ME' ? 'Assessment' : `Level ${settings.level}`} • {activeScenario ? `${activeScenario.icon} ${activeScenario.label}` : (settings.showAvatarMode ? 'Avatar' : 'Chat')}
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

          {/* API Usage Donut Chart */}
          <div className="relative">
            <button
              onClick={() => setShowApiInfo(!showApiInfo)}
              className="relative w-10 h-10 shrink-0 cursor-pointer active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" />
                <circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke={usage.percent > 90 ? '#f87171' : usage.percent > 70 ? '#fb923c' : '#6ee7b7'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${usage.percent * 0.88} 88`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{Math.round(usage.percent)}</span>
            </button>

            {/* API Info Popup */}
            {showApiInfo && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setShowApiInfo(false)} />
                <div className="fixed top-16 right-4 z-[101] w-72 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl p-4 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-white">API Usage</h3>
                    <button onClick={() => setShowApiInfo(false)} className="text-white/40 hover:text-white/80 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                  <div className={`text-2xl font-black mb-2 ${usage.percent > 90 ? 'text-red-400' : usage.percent > 70 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {Math.round(usage.percent)}% využito
                  </div>
                  <div className="text-xs text-white/60 mb-3">
                    {usage.current} / {usage.limit} požadavků dnes
                  </div>
                  <div className="space-y-2 text-[11px] text-white/70 leading-relaxed">
                    <p>Toto ukazuje <span className="text-white font-semibold">denní využití API tokenů</span> pro komunikaci s AI.</p>
                    <p>Aplikace běží na <span className="text-amber-300 font-semibold">testovacím (free) plánu</span> s denním limitem {usage.limit} požadavků.</p>
                    <p>Po vyčerpání limitu se AI funkce <span className="text-red-400 font-semibold">dočasně vypnou</span>. Limit se automaticky resetuje následující den.</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-white/40 text-center">
                    Resetuje se každý den o půlnoci
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowScenarios(true)}
            className={`p-2 rounded-full transition-all active:scale-95 ${activeScenario ? 'bg-amber-400/20 ring-2 ring-amber-400/40' : 'bg-white/10 hover:bg-white/20'}`}
            title="Scenarios"
          >
            <span className="text-lg leading-none">{activeScenario ? activeScenario.icon : '🎭'}</span>
          </button>

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

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 safe-bottom">
          <div className="max-w-md mx-auto bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-[0_-4px_30px_rgba(16,185,129,0.15)] p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-emerald-400">
                <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">Nainstalovat Aria</p>
              <p className="text-slate-400 text-[11px]">Rychlejší přístup z plochy telefonu</p>
            </div>
            <button onClick={handleInstall} className="px-4 py-2 bg-emerald-500 text-white text-xs font-black rounded-xl hover:bg-emerald-400 active:scale-95 transition-all shrink-0 uppercase tracking-wider">
              Install
            </button>
            <button onClick={dismissInstall} className="p-1.5 text-slate-500 hover:text-white transition shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;