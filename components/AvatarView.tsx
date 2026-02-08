import React, { useEffect, useState, useRef } from 'react';
import { Message, AppSettings } from '../types';
import { PRESET_AVATARS } from '../constants';
import VirtualAvatar from './VirtualAvatar';
import { useLiveAPI } from '../hooks/useLiveAPI';

interface AvatarViewProps {
  latestMessage: Message | null; // For Legacy Text display
  currentInput: string; // For Legacy User Input display
  isSpeaking: boolean; // Legacy prop (TTS)
  isListening: boolean; // Legacy prop (STT)
  toggleListening: () => void; // Legacy prop
  settings: AppSettings;
}

const AvatarView: React.FC<AvatarViewProps> = ({ 
  latestMessage,
  currentInput,
  isSpeaking: legacyIsSpeaking,
  isListening: legacyIsListening,
  toggleListening: legacyToggleListening,
  settings 
}) => {
  // 1. Initialize Live API Hook (always, but only used if mode is 'live-api')
  const {
    connect,
    disconnect,
    isConnected: liveIsConnected,
    isSpeaking: liveIsSpeaking,
    volumeLevel,
    error: liveError,
    outputTranscript,
    inputTranscript
  } = useLiveAPI(settings);

  // 2. Determine Active Mode
  const isLiveMode = settings.interactionMode === 'live-api';

  // 3. Unified State Variables (The "Glue")
  const activeIsSpeaking = isLiveMode ? liveIsSpeaking : legacyIsSpeaking;
  const activeIsListening = isLiveMode ? liveIsConnected : legacyIsListening;
  const activeError = isLiveMode ? liveError : null;

  const [displayedText, setDisplayedText] = useState("Tap microphone to start conversation");
  const [czechTranslation, setCzechTranslation] = useState('');
  
  // 4. Cleanup when switching modes
  useEffect(() => {
    // If we switched TO Legacy, ensure Live is disconnected
    if (!isLiveMode && liveIsConnected) {
        disconnect();
    }
    // If we switched TO Live, ensure Legacy is stopped (though App.tsx handles some of this)
    if (isLiveMode && legacyIsListening) {
        legacyToggleListening();
    }
  }, [isLiveMode, liveIsConnected, legacyIsListening]);


  // 5. Unified Toggle Handler
  const handleToggle = () => {
    if (isLiveMode) {
        if (liveIsConnected) {
            disconnect();
            setDisplayedText("Conversation ended.");
        } else {
            setDisplayedText("Connecting to Aria...");
            connect();
        }
    } else {
        // Legacy Toggle
        legacyToggleListening();
    }
  };

  // Helper: Extract English text and Czech translation from raw transcript
  const parseTranscript = (raw: string): { english: string; czech: string } => {
    // Remove corrections section
    const withoutCorrections = raw.split("💡")[0];

    // Split on Czech translation marker
    const czechMarkerIndex = withoutCorrections.indexOf("🇨🇿");
    if (czechMarkerIndex !== -1) {
      const english = withoutCorrections.substring(0, czechMarkerIndex).trim();
      let czech = withoutCorrections.substring(czechMarkerIndex).trim();
      // Remove the marker prefix variants
      czech = czech.replace(/^🇨🇿\s*(Translation|Překlad)\s*:\s*/i, '').trim();
      return { english, czech };
    }
    return { english: withoutCorrections.trim(), czech: '' };
  };

  // 6. Update Display Text Logic
  useEffect(() => {
    if (isLiveMode) {
        // --- Live API Text Logic ---
        if (liveIsConnected) {
            if (liveIsSpeaking) {
                // Show real-time transcript of what Aria is saying
                if (settings.showEnglishTranscript && outputTranscript) {
                    const { english, czech } = parseTranscript(outputTranscript);
                    setDisplayedText(english || "Aria is speaking...");
                    if (settings.showCzechTranslation) {
                        setCzechTranslation(czech);
                    } else {
                        setCzechTranslation('');
                    }
                } else {
                    setDisplayedText("Aria is speaking...");
                    setCzechTranslation('');
                }
            } else {
                // Show real-time transcript of what user is saying
                if (inputTranscript) {
                    setDisplayedText(inputTranscript);
                } else {
                    setDisplayedText("Listening...");
                }
                setCzechTranslation('');
            }
        } else if (!liveError) {
             setDisplayedText("Tap microphone to start conversation (Live)");
             setCzechTranslation('');
        }
    } else {
        // --- Legacy Mode Text Logic ---
        if (legacyIsListening) {
             if (currentInput) {
                 setDisplayedText(currentInput);
             } else {
                 setDisplayedText("Listening...");
             }
             setCzechTranslation('');
        } else if (legacyIsSpeaking) {
             if (latestMessage?.role === 'model') {
                 const { english, czech } = parseTranscript(latestMessage.text);
                 setDisplayedText(english);
                 if (settings.showCzechTranslation) {
                     setCzechTranslation(czech);
                 } else {
                     setCzechTranslation('');
                 }
             } else {
                 setDisplayedText("Speaking...");
                 setCzechTranslation('');
             }
        } else {
             setDisplayedText("Tap microphone to start conversation (Standard)");
             setCzechTranslation('');
        }
    }
  }, [
      isLiveMode,
      liveIsConnected,
      liveIsSpeaking,
      legacyIsListening,
      legacyIsSpeaking,
      currentInput,
      latestMessage,
      liveError,
      outputTranscript,
      inputTranscript,
      settings.showEnglishTranscript,
      settings.showCzechTranslation
  ]);


  // Determine Static Image Source
  const getStaticImage = () => {
      if (settings.avatarType === 'custom') return settings.customAvatarImageUrl;
      if (settings.avatarType === 'preset-female') return PRESET_AVATARS.female.imageUrl;
      if (settings.avatarType === 'preset-male') return PRESET_AVATARS.male.imageUrl;
      return null;
  };
  const staticImage = getStaticImage();

  return (
    <div className="flex flex-col h-full w-full bg-[#0f172a] relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         {/* Animated blobs for ambience */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[80px] transition-all duration-1000 ${activeIsSpeaking ? 'scale-110 opacity-40' : 'scale-100 opacity-20'}`}></div>
        <div className="absolute bottom-1/3 right-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20"></div>
      </div>

      {/* 1. Avatar Section */}
      <div className="flex-1 flex items-center justify-center relative z-10 min-h-0 p-4">
        <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px] max-h-[50vh]">
          {/* Pulsing Rings when Aria speaks */}
          {activeIsSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400 opacity-30 animate-ping"></div>
              <div className="absolute inset-[-10px] rounded-full border-2 border-emerald-300 opacity-20 animate-pulse"></div>
            </>
          )}

          {/* User Voice Visualizer (Live API only) */}
          {isLiveMode && liveIsConnected && !activeIsSpeaking && volumeLevel > 0.01 && (
             <div 
               className="absolute inset-[-20px] rounded-full border-4 border-red-400 opacity-40 transition-all duration-75"
               style={{ transform: `scale(${1 + volumeLevel})` }}
             ></div>
          )}
          
          {/* Avatar Container */}
          <div className={`relative w-full h-full rounded-full border-8 shadow-2xl transition-all duration-500 overflow-hidden bg-slate-800 ${activeIsSpeaking ? 'border-emerald-500 scale-105 shadow-emerald-500/20' : 'border-slate-700 scale-100'} ${activeIsListening && !activeIsSpeaking ? 'border-red-500 ring-4 ring-red-500/20' : ''}`}>
             
             {settings.avatarType !== 'virtual' && staticImage ? (
                // Static Image with Pulse Animation
                <div className="w-full h-full relative flex items-center justify-center">
                   <img 
                    src={staticImage} 
                    alt="Teacher Avatar" 
                    className="w-full h-full object-cover transition-transform duration-300 ease-out"
                    style={{ transform: activeIsSpeaking ? 'scale(1.15)' : 'scale(1)' }}
                   />
                </div>
             ) : (
                <VirtualAvatar 
                  gender={settings.voiceGender} 
                  isSpeaking={activeIsSpeaking}
                  isListening={activeIsListening && !activeIsSpeaking}
                />
             )}
          </div>
          
          {/* Status Indicator */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-5 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] text-white shadow-xl z-20 whitespace-nowrap uppercase">
             {activeError ? (
                <span className="text-red-400">Connection Error</span>
             ) : activeIsSpeaking ? (
               <span className="text-emerald-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Aria Speaking
               </span>
             ) : activeIsListening ? (
               <span className="text-red-400 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> Listening...
               </span>
             ) : (
                <span className="text-slate-400">Paused ({isLiveMode ? 'Live' : 'Std'})</span>
             )}
          </div>

        </div>
      </div>

      {/* 2. Controls Section */}
      <div className="flex-shrink-0 z-20 flex flex-col items-center gap-4 pb-8 px-6 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/95 to-transparent pt-12">
        
        {/* Status Text (Scrollable/Multiline if needed) */}
        <div className="w-full max-w-xl flex flex-col items-center justify-end text-center gap-1.5 min-h-[60px] max-h-[180px] overflow-y-auto no-scrollbar">
             {/* English Transcript */}
             <p className={`text-lg sm:text-xl font-bold leading-tight drop-shadow-lg transition-all duration-300 line-clamp-4 ${activeIsListening ? 'text-white' : 'text-slate-400'}`}>
               {displayedText}
             </p>
             {/* Czech Translation — smaller, distinct color, separated */}
             {czechTranslation && (
               <p className="text-sm sm:text-base font-medium leading-snug text-amber-300/90 drop-shadow-md line-clamp-3 border-t border-white/10 pt-1.5 mt-0.5 w-full italic">
                 {czechTranslation}
               </p>
             )}
             {activeError && <p className="text-red-400 text-xs font-bold uppercase tracking-widest">{activeError}</p>}
        </div>

        {/* Mic Button */}
        <div className="flex flex-col items-center gap-3">
            <button
                onClick={handleToggle}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-all transform hover:scale-105 active:scale-90 border-[6px] ${
                activeIsListening
                    ? 'bg-red-500 border-red-400 text-white shadow-red-500/20 animate-pulse-slow'
                    : 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-400 shadow-emerald-500/20'
                }`}
            >
                {activeIsListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                </svg>
                ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
                )}
            </button>
            
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                {activeIsListening ? "End Call" : `Start ${isLiveMode ? 'Live' : 'Chat'}`}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarView;