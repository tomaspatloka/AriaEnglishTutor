import React, { useEffect, useRef, useState } from 'react';
import { AppSettings, VocabularyEntry } from '../types';
import { useLiveAPI } from '../hooks/useLiveAPI';
import VocabularyModal from './VocabularyModal';
import { addVocabularyWord, extractVocabFromTranscript, loadVocabulary } from '../utils/vocabularyUtils';

interface ReadingModeViewProps {
  settings: AppSettings;
  onExit: () => void;
}

const ReadingModeView: React.FC<ReadingModeViewProps> = ({ settings, onExit }) => {
  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isSpeaking,
    networkSlow,
    volumeLevel,
    error,
    outputTranscript,
    inputTranscript,
    conversationLog,
  } = useLiveAPI(settings);

  const [vocabList, setVocabList] = useState<VocabularyEntry[]>(() => loadVocabulary());
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [manualWord, setManualWord] = useState('');
  const processedInputLengthRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-detect vocabulary from user's speech
  useEffect(() => {
    if (!inputTranscript) {
      processedInputLengthRef.current = 0;
      return;
    }
    const newText = inputTranscript.slice(processedInputLengthRef.current);
    processedInputLengthRef.current = inputTranscript.length;
    if (!newText.trim()) return;
    const detected = extractVocabFromTranscript(newText);
    if (detected.length === 0) return;
    let updated = vocabList;
    for (const word of detected) {
      updated = addVocabularyWord(word);
    }
    setVocabList(updated);
  }, [inputTranscript]);

  // Auto-scroll conversation
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationLog]);

  const handleToggle = () => {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleExit = () => {
    if (isConnected || isConnecting) disconnect();
    onExit();
  };

  const handleAddManualWord = () => {
    const trimmed = manualWord.trim();
    if (!trimmed) return;
    const updated = addVocabularyWord(trimmed);
    setVocabList(updated);
    setManualWord('');
  };

  const isUserTalking = isConnected && !isSpeaking && volumeLevel > 0.03;

  const getStatusText = () => {
    if (error) return null;
    if (isConnecting) return 'Připojování...';
    if (isSpeaking) return outputTranscript || 'Aria čte...';
    if (isConnected) {
      if (inputTranscript) return inputTranscript;
      return 'Čti nahlas — Aria poslouchá';
    }
    return 'Stiskni tlačítko a začni číst nahlas';
  };

  const statusText = getStatusText();

  return (
    <div className="flex flex-col h-full bg-[#0a0f1e] relative overflow-hidden">

      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] transition-all duration-1000 ${isSpeaking ? 'opacity-50 scale-110' : 'opacity-20 scale-100'}`} />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-indigo-700 rounded-full mix-blend-screen filter blur-[80px] opacity-20" />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-10 relative">
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <div>
            <p className="text-white font-black text-sm leading-none">Reading Mode</p>
            <p className="text-blue-400 text-[10px] font-semibold mt-0.5">Výslovnostní trénink</p>
          </div>
        </div>
        <button
          onClick={handleExit}
          className="px-3 py-1.5 bg-white/10 text-white/70 text-xs font-bold rounded-full hover:bg-white/20 transition active:scale-95"
        >
          ← Zpět
        </button>
      </div>

      {/* Waveform / status area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 z-10 relative min-h-0">

        {/* Mic button with visualizer */}
        <div className="relative flex items-center justify-center">
          {(isConnected || isConnecting) && (
            <>
              <div className={`absolute inset-0 rounded-full border-4 ${isSpeaking ? 'border-blue-400' : 'border-red-400'} opacity-30 animate-ping`} />
              {isUserTalking && (
                <div
                  className="absolute inset-[-16px] rounded-full border-4 border-red-300 opacity-50 transition-all duration-75"
                  style={{ transform: `scale(${1 + volumeLevel * 0.8})` }}
                />
              )}
            </>
          )}
          <button
            onClick={handleToggle}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-90 border-[6px] ${
              isConnecting
                ? 'bg-amber-500 border-amber-400 animate-pulse'
                : isSpeaking
                ? 'bg-blue-500 border-blue-400 shadow-blue-500/30'
                : isConnected
                ? 'bg-red-500 border-red-400 shadow-red-500/30'
                : 'bg-blue-600 border-blue-500 hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            {isConnected || isConnecting ? (
              isSpeaking ? (
                /* Speaker icon when Aria is speaking */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
                </svg>
              ) : (
                /* Stop icon when listening */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                  <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                </svg>
              )
            ) : (
              /* Mic icon when disconnected */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            )}
          </button>
        </div>

        {/* Status label */}
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-center">
          {isConnecting ? (
            <span className="text-amber-300">Připojování...</span>
          ) : isSpeaking ? (
            <span className="text-blue-400">Aria čte</span>
          ) : isConnected ? (
            <span className="text-red-400">Aria poslouchá</span>
          ) : (
            <span className="text-slate-500">Spustit</span>
          )}
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {networkSlow && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Síť pomalá
            </span>
          )}
        </div>

        {/* Transcript area */}
        <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20">
              <p className="text-red-400 text-xs font-bold">{error}</p>
            </div>
          )}
          <div className="max-h-44 overflow-y-auto no-scrollbar p-4 space-y-3">
            {conversationLog.length === 0 ? (
              <p className="text-slate-600 text-sm text-center italic">
                {isConnected ? 'Začni číst nahlas... Aria poslouchá.' : 'Přepis konverzace se zobrazí zde.'}
              </p>
            ) : (
              conversationLog.slice(-8).map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white/5 text-slate-300'
                      : 'bg-blue-500/20 text-blue-100 border border-blue-400/20'
                  }`}>
                    {msg.role === 'model' && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">Aria</p>
                    )}
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
          {/* Status text overlay at bottom of transcript */}
          {statusText && isConnected && (
            <div className="border-t border-white/5 px-4 py-2">
              <p className={`text-xs leading-relaxed ${isSpeaking ? 'text-blue-300' : 'text-slate-400'}`}>
                {statusText}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vocabulary section */}
      <div className="shrink-0 bg-slate-900/80 border-t border-white/10 px-4 py-3 z-10 relative">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Slovníček ({vocabList.length})
          </p>
          <button
            onClick={() => setShowVocabModal(true)}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
          >
            Vše a tisk →
          </button>
        </div>

        {/* Recent words */}
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
          {vocabList.length === 0 && (
            <p className="text-slate-600 text-xs italic">Řekni "I don't know the word X" — Aria ho zapíše</p>
          )}
          {vocabList.slice(0, 6).map(entry => (
            <span key={entry.id} className="bg-blue-500/15 text-blue-300 border border-blue-400/25 rounded-full px-3 py-0.5 text-xs font-semibold">
              {entry.word}
            </span>
          ))}
          {vocabList.length > 6 && (
            <span className="text-slate-500 text-xs px-1 py-0.5">+{vocabList.length - 6}</span>
          )}
        </div>

        {/* Manual add */}
        <div className="flex gap-2">
          <input
            type="text"
            value={manualWord}
            onChange={e => setManualWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddManualWord()}
            placeholder="+ Přidat slovo..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-400/40"
          />
          <button
            onClick={handleAddManualWord}
            disabled={!manualWord.trim()}
            className="px-3 py-1.5 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-xl border border-blue-400/30 hover:bg-blue-500/30 disabled:opacity-30 transition active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      <VocabularyModal
        isOpen={showVocabModal}
        onClose={() => setShowVocabModal(false)}
        vocabList={vocabList}
        onVocabChange={setVocabList}
      />
    </div>
  );
};

export default ReadingModeView;
