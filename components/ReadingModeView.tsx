import React, { useEffect, useRef, useState } from 'react';
import { AppSettings, VocabularyEntry, Message } from '../types';
import { useLiveAPI } from '../hooks/useLiveAPI';
import { addVocabularyWordWithDefinition, extractVocabFromTranscript } from '../utils/vocabularyUtils';
import { translateWord } from '../services/geminiService';
import PhotoCaptureSheet from './PhotoCaptureSheet';

interface ReadingModeViewProps {
  settings: AppSettings;
  onExit: (session?: { messages: Message[]; startedAt: number }) => void;
  vocabList: VocabularyEntry[];
  onVocabChange: (entries: VocabularyEntry[]) => void;
  onOpenVocabModal: () => void;
}

const ReadingModeView: React.FC<ReadingModeViewProps> = ({ settings, onExit, vocabList, onVocabChange, onOpenVocabModal }) => {
  // F1 — Settings menu state
  const [showMenu, setShowMenu] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [correctionLanguage, setCorrectionLanguage] = useState<'cs' | 'en'>('cs');
  const menuRef = useRef<HTMLDivElement>(null);

  // v1.6 — Photo capture: referenční text z fotky stránky
  const [referenceText, setReferenceText] = useState<string | null>(null);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  const {
    connect,
    disconnect,
    pause,
    resume,
    isPaused,
    isConnected,
    isConnecting,
    isSpeaking,
    networkSlow,
    volumeLevel,
    error,
    outputTranscript,
    inputTranscript,
    conversationLog,
  } = useLiveAPI(settings, correctionLanguage, referenceText);

  const processedInputLengthRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  // Začátek čtecí session — pro progress zápis (audit P1). Set při prvním connectu.
  const readingStartedAtRef = useRef<number>(0);

  // Zaznamenej start session jakmile se Live spojení poprvé naváže
  useEffect(() => {
    if (isConnected && readingStartedAtRef.current === 0) {
      readingStartedAtRef.current = Date.now();
    }
  }, [isConnected]);

  // Close menu on outside click or Escape — only attach listeners while open
  useEffect(() => {
    if (!showMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showMenu]);

  // F3 — Auto-detect vocabulary from user's speech + CZ definition
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

    for (const word of detected) {
      addVocabularyWordWithDefinition(
        word,
        () => translateWord(word),
        onVocabChange
      );
    }
  }, [inputTranscript]);

  // Auto-scroll conversation
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationLog]);

  const handleToggle = () => {
    // While paused the mic button is rendered as disabled (opacity-60, cursor-default).
    // Guard the handler too so a click can't silently tear down a live, paused session.
    if (isPaused) return;
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleExit = () => {
    if (isConnected || isConnecting) disconnect();
    // Předej čtecí log + čas startu nahoru, ať App vytvoří progress zápis (mode='reading').
    const session = conversationLog.length > 0 && readingStartedAtRef.current > 0
      ? { messages: conversationLog, startedAt: readingStartedAtRef.current }
      : undefined;
    onExit(session);
  };

  const isUserTalking = isConnected && !isSpeaking && !isPaused && volumeLevel > 0.03;

  const getStatusText = () => {
    if (error) return null;
    if (isPaused) return '⏸ Pozastaveno — Aria nereaguje';
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
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-30 relative">
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <div>
            <p className="text-white font-black text-sm leading-none">Reading Mode</p>
            <p className="text-blue-400 text-[10px] font-semibold mt-0.5">Výslovnostní trénink</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* F1 — Settings menu button */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition text-lg font-bold leading-none ${showMenu ? 'bg-white/10 text-white' : ''}`}
              aria-label="Nastavení"
            >
              ···
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 z-50 bg-slate-800 border border-white/10 rounded-xl shadow-2xl p-1 min-w-[210px]">
                {/* Toggle: Přepis konverzace */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={showTranscript}
                  aria-label="Přepis konverzace"
                  onClick={() => setShowTranscript(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer gap-3 text-left"
                >
                  <span className="block">
                    <span className="block text-sm text-white font-semibold">Přepis konverzace</span>
                    <span className="block text-[10px] text-slate-500">Zobrazit/skrýt chat log</span>
                  </span>
                  <span className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${showTranscript ? 'bg-blue-500' : 'bg-slate-600'}`}>
                    <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${showTranscript ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                </button>

                <div className="my-1 border-t border-white/5" />

                {/* Toggle: Jazyk oprav — immutable mid-session (Gemini Live systemInstruction) */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={correctionLanguage === 'cs'}
                  aria-label="Opravy v češtině"
                  disabled={isConnected || isConnecting}
                  onClick={() => setCorrectionLanguage(v => v === 'cs' ? 'en' : 'cs')}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left ${(isConnected || isConnecting) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}`}
                >
                  <span className="block">
                    <span className="block text-sm text-white font-semibold">Opravy v češtině</span>
                    <span className="block text-[10px] text-slate-500">
                      {(isConnected || isConnecting) ? 'Platí od příštího spuštění' : 'Aria vysvětluje česky / anglicky'}
                    </span>
                  </span>
                  <span className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${correctionLanguage === 'cs' ? 'bg-blue-500' : 'bg-slate-600'}`}>
                    <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${correctionLanguage === 'cs' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* v1.6 — Photo capture button. Disabled while connected (matches correctionLanguage UX). */}
          <button
            onClick={() => setShowPhotoSheet(true)}
            disabled={isConnected || isConnecting}
            aria-label="Vyfotit stránku"
            title={(isConnected || isConnecting) ? 'Nejprve ukonči poslech' : 'Vyfotit stránku'}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition text-lg leading-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/60"
          >
            📷
          </button>

          <button
            onClick={handleExit}
            className="px-3 py-1.5 bg-white/10 text-white/70 text-xs font-bold rounded-full hover:bg-white/20 transition active:scale-95"
          >
            ← Zpět
          </button>
        </div>
      </div>

      {/* v1.6 — PŘEDLOHA z fotky */}
      {referenceText && (
        <div className="mx-4 mb-2 bg-slate-800/80 border border-blue-400/20 rounded-xl p-3 z-10 relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">📖 Předloha z fotky</span>
            <button
              onClick={() => setReferenceText(null)}
              disabled={isConnected || isConnecting}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title={(isConnected || isConnecting) ? 'Nejprve ukonči poslech' : 'Smazat předlohu'}
            >
              Smazat
            </button>
          </div>
          <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto no-scrollbar">
            {referenceText}
          </div>
        </div>
      )}

      {/* Waveform / status area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 z-10 relative min-h-0">

        {/* Mic + Pause buttons row */}
        <div className="flex items-center gap-4">
          {/* F2 — Pause button */}
          {(isConnected && !isConnecting) && (
            <button
              onClick={isPaused ? resume : pause}
              className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all transform hover:scale-105 active:scale-90 ${
                isPaused
                  ? 'bg-amber-500 border-amber-400 shadow-amber-500/30 shadow-lg'
                  : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
              }`}
              aria-label={isPaused ? 'Pokračovat' : 'Pozastavit'}
            >
              {isPaused ? (
                /* Play icon */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              ) : (
                /* Pause icon */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/70">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}

          {/* Main mic button */}
          <div className="relative flex items-center justify-center">
            {(isConnected || isConnecting) && !isPaused && (
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
              disabled={isPaused}
              aria-label={
                isPaused
                  ? 'Pozastaveno — nejprve pokračuj'
                  : isConnected || isConnecting
                  ? 'Ukončit poslech'
                  : 'Spustit poslech'
              }
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-90 border-[6px] ${
                isConnecting
                  ? 'bg-amber-500 border-amber-400 animate-pulse'
                  : isPaused
                  ? 'bg-slate-700 border-slate-600 opacity-60 cursor-default'
                  : isSpeaking
                  ? 'bg-blue-500 border-blue-400 shadow-blue-500/30'
                  : isConnected
                  ? 'bg-red-500 border-red-400 shadow-red-500/30'
                  : 'bg-blue-600 border-blue-500 hover:bg-blue-500 shadow-blue-600/30'
              }`}
            >
              {isConnected || isConnecting ? (
                isSpeaking ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                  </svg>
                )
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Status label */}
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-center">
          {isConnecting ? (
            <span className="text-amber-300">Připojování...</span>
          ) : isPaused ? (
            <span className="text-amber-400">⏸ Pozastaveno</span>
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
          {networkSlow && !isPaused && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Síť pomalá
            </span>
          )}
        </div>

        {/* F1 — Transcript area (toggleable) */}
        {showTranscript && (
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
            {statusText && isConnected && (
              <div className="border-t border-white/5 px-4 py-2">
                <p className={`text-xs leading-relaxed ${isPaused ? 'text-amber-400' : isSpeaking ? 'text-blue-300' : 'text-slate-400'}`}>
                  {statusText}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* v1.6 — Photo capture modal */}
      <PhotoCaptureSheet
        open={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
        onTextExtracted={setReferenceText}
      />

      {/* F4 — Redesigned vocabulary bar */}
      <div className="shrink-0 bg-slate-900/80 border-t border-white/10 px-4 py-2.5 z-10 relative">
        {/* Row 1: Word pills with CZ definitions */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 min-h-[30px]">
          {vocabList.length === 0 ? (
            <p className="text-slate-600 text-xs italic whitespace-nowrap">
              Řekni „I don't know the word X" — Aria ho zapíše
            </p>
          ) : (
            <>
              {vocabList.slice(0, 5).map(entry => (
                <button
                  key={entry.id}
                  onClick={() => onOpenVocabModal()}
                  title={entry.definition ? `${entry.word} · ${entry.definition}` : entry.word}
                  className="shrink-0 flex items-center gap-1 max-w-[180px] bg-blue-500/15 text-blue-300 border border-blue-400/25 rounded-full px-3 py-0.5 text-xs font-semibold hover:bg-blue-500/25 transition active:scale-95"
                >
                  <span className="whitespace-nowrap">{entry.word}</span>
                  {entry.definition && (
                    <span className="text-blue-400/60 font-normal truncate">· {entry.definition}</span>
                  )}
                </button>
              ))}
              {vocabList.length > 5 && (
                <span className="shrink-0 text-slate-500 text-xs px-1">+{vocabList.length - 5}</span>
              )}
            </>
          )}
        </div>

        {/* Row 2: Label + open modal button */}
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
            Slovníček
          </p>
          <button
            onClick={() => onOpenVocabModal()}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 text-blue-300 text-xs font-bold rounded-full border border-blue-400/25 hover:bg-blue-500/25 transition active:scale-95"
          >
            📚 {vocabList.length} {vocabList.length === 1 ? 'slovo' : vocabList.length < 5 ? 'slova' : 'slov'} →
          </button>
        </div>
      </div>

    </div>
  );
};

export default ReadingModeView;
