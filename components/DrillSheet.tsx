import React, { useEffect, useRef, useState } from 'react';
import { VoiceAccent } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { scoreSentence, missingTokens, PASS_THRESHOLD, MAX_ATTEMPTS } from '../utils/drillUtils';

interface DrillSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sentences: string[];
  voiceAccent: VoiceAccent;
  onSpeak: (text: string) => void; // speakManual z App (hlas dle settings)
}

// P1-10: drill na practice sentences ze session summary. Vzor přehraje TTS, žák zopakuje,
// scoring na úrovni slov (drillUtils), bez Gemini callu. Max 2 pokusy per věta.
// Pozn.: Web Speech API je prakticky Chrome-only a audio jde na Google servery — není offline.
const DrillSheet: React.FC<DrillSheetProps> = ({ isOpen, onClose, sentences, voiceAccent, onSpeak }) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition(voiceAccent);
  const [idx, setIdx] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<{ score: number; missing: string[] } | null>(null);
  const [done, setDone] = useState(false);
  const prevListeningRef = useRef(false);

  useEffect(() => {
    if (isOpen) { setIdx(0); setAttempts(0); setResults([]); setFeedback(null); setDone(false); }
  }, [isOpen]);

  const current = sentences[idx];

  const advance = (passed: boolean) => {
    setResults(prev => [...prev, passed]);
    setFeedback(null);
    setAttempts(0);
    resetTranscript();
    if (idx + 1 >= sentences.length) setDone(true);
    else setIdx(i => i + 1);
  };

  // Vyhodnocení po zastavení poslechu (náběžná→sestupná hrana isListening).
  useEffect(() => {
    if (prevListeningRef.current && !isListening && transcript.trim() && current && !done) {
      const score = scoreSentence(transcript, current);
      if (score >= PASS_THRESHOLD) {
        advance(true);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setFeedback({ score, missing: missingTokens(transcript, current) });
        if (nextAttempts >= MAX_ATTEMPTS) setTimeout(() => advance(false), 1200);
      }
    }
    prevListeningRef.current = isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript]);

  if (!isOpen) return null;

  const passCount = results.filter(Boolean).length;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-16 bottom-16 z-[201] max-w-xl mx-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <p className="text-white font-black text-sm">🗣️ Procvičit věty</p>
          {!done && <p className="text-slate-500 text-[10px]">{idx + 1} / {sentences.length}</p>}
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition" aria-label="Zavřít">✕</button>
        </div>

        {done || !current ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-5xl">{passCount === sentences.length ? '🎉' : '👍'}</p>
            <p className="text-white font-black text-xl">{passCount} / {sentences.length} vět zvládnuto</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-400 transition active:scale-95">Hotovo</button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
            <div className="w-full max-w-sm bg-gradient-to-br from-slate-800 to-slate-700 border border-white/10 rounded-2xl px-6 py-7 text-center">
              <p className="text-white font-bold text-xl leading-snug">{current}</p>
              <button
                onClick={() => onSpeak(current)}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-blue-300 rounded-full text-xs font-bold hover:bg-white/20 transition active:scale-95"
              >
                🔊 Přehrát vzor
              </button>
            </div>

            {feedback && (
              <div className="text-center">
                <p className="text-amber-300 text-sm font-bold">Skóre {Math.round(feedback.score * 100)} % — zkus znovu</p>
                {feedback.missing.length > 0 && (
                  <p className="text-slate-400 text-xs mt-1">Chybí: <span className="text-amber-200 font-semibold">{feedback.missing.join(', ')}</span></p>
                )}
                <p className="text-slate-600 text-[10px] mt-1">Pokus {attempts}/{MAX_ATTEMPTS}</p>
              </div>
            )}

            <button
              onClick={() => { if (isListening) { stopListening(); } else { resetTranscript(); setFeedback(null); startListening(); } }}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl border-[5px] transition transform active:scale-90 ${
                isListening ? 'bg-red-500 border-red-400 animate-pulse' : 'bg-blue-600 border-blue-500 hover:bg-blue-500'
              }`}
              aria-label={isListening ? 'Zastavit' : 'Mluvit'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-white">
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            </button>
            <p className="text-slate-500 text-xs">{isListening ? 'Poslouchám — řekni větu' : 'Klepni a zopakuj větu'}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default DrillSheet;
