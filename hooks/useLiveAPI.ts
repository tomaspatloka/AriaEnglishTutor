import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AppSettings, Message } from '../types';
import { getSystemInstruction, getReadingSystemInstruction, SCENARIOS } from '../constants';
import { base64ToUint8Array, arrayBufferToBase64, convertFloat32ToInt16, decodeAudioData } from '../utils/audioUtils';
import { incrementUsage } from '../utils/usageUtils';
import { loadVocabulary, buildFocusWords } from '../utils/vocabularyUtils';

// Gemini 3.1 Flash Live — audio-to-audio model pro real-time dialog, free tier
const LIVE_MODEL = 'gemini-3.1-flash-live-preview';

interface UseLiveAPIReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  pause: () => void;
  resume: () => void;
  isPaused: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  networkSlow: boolean;
  volumeLevel: number;
  error: string | null;
  outputTranscript: string;
  inputTranscript: string;
  conversationLog: Message[];
}

export const useLiveAPI = (
  settings: AppSettings,
  correctionLang: 'cs' | 'en' = 'cs',
  referenceText: string | null = null
): UseLiveAPIReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [networkSlow, setNetworkSlow] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outputTranscript, setOutputTranscript] = useState('');
  const [inputTranscript, setInputTranscript] = useState('');
  const [conversationLog, setConversationLog] = useState<Message[]>([]);

  // Refs pro audio komponenty
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  // Rychlost mluvení Arie — client-side playbackRate (Live API nepodporuje server-side rate).
  // Čteno přes ref v onmessage, aby změna slideru zabrala bez reconnectu.
  const speechRateRef = useRef(settings.speechRate ?? 1.0);
  useEffect(() => {
    speechRateRef.current = settings.speechRate ?? 1.0;
  }, [settings.speechRate]);

  // Refs pro správu session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null);

  // Refs pro přehrávání audia
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isConnectingRef = useRef(false);
  const manualDisconnectRef = useRef(false);
  const connectStartedAtRef = useRef(0);
  const activeConnectionIdRef = useRef(0);
  const lastServerActivityRef = useRef(0);

  const mapLiveError = useCallback((e: any): string => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'No internet connection. Reconnect and try again.';
    }

    const raw = `${e?.message || e?.error?.message || e?.status || e?.toString?.() || ''}`.toLowerCase();

    if (raw.includes('notallowed') || raw.includes('permission') || raw.includes('denied')) {
      return 'Microphone access denied. Please allow microphone permission.';
    }
    if (raw.includes('notfound') || raw.includes('audio-capture') || raw.includes('no device')) {
      return 'No microphone device found. Check your audio input and retry.';
    }
    if (
      raw.includes('network') ||
      raw.includes('failed to fetch') ||
      raw.includes('connection') ||
      raw.includes('timeout')
    ) {
      return 'Live connection failed. Check your internet and try again.';
    }

    return 'Unable to start live conversation. Please retry.';
  }, []);

  const appendConversationChunk = useCallback((role: Message['role'], chunk: string) => {
    const cleanChunk = chunk.trim();
    if (!cleanChunk) return;

    setConversationLog((prev) => {
      if (prev.length === 0) {
        return [{
          id: `live_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          role,
          text: cleanChunk,
          timestamp: Date.now(),
        }];
      }

      const next = [...prev];
      const last = next[next.length - 1];
      if (last.role === role) {
        next[next.length - 1] = {
          ...last,
          text: `${last.text}${cleanChunk.startsWith(' ') ? '' : ' '}${cleanChunk}`.trim(),
        };
        return next;
      }

      next.push({
        id: `live_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        role,
        text: cleanChunk,
        timestamp: Date.now(),
      });
      return next;
    });
  }, []);

  // Cleanup funkce pro uvolnění zdrojů
  const cleanup = useCallback(() => {
    // 1. Zastavit nahrávání
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 2. Zastavit přehrávání (okamžité ticho)
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    audioSourcesRef.current.clear();

    // 3. Zavřít AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // 4. Uzavřít Session
    // Důležité: Pokud sessionPromise ještě běží, počkáme na ni
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try { session.close(); } catch (e) { }
      });
      sessionPromiseRef.current = null;
    }
    currentSessionRef.current = null;

    setIsConnected(false);
    setIsConnecting(false);
    isConnectingRef.current = false;
    setIsSpeaking(false);
    setNetworkSlow(false);
    setVolumeLevel(0);
    setOutputTranscript('');
    setInputTranscript('');
    nextStartTimeRef.current = 0;
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const connect = useCallback(async () => {
    if (isConnected || isConnectingRef.current) {
      return;
    }

    manualDisconnectRef.current = false;
    connectStartedAtRef.current = Date.now();
    const connectionId = connectStartedAtRef.current;
    activeConnectionIdRef.current = connectionId;

    cleanup(); // Ujistime se, ze zaciname s cistym stitem
    setConversationLog([]);
    setError(null);
    setIsConnecting(true);
    isConnectingRef.current = true;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // P0-2: slova k recyklaci do konverzace (jen pro konverzační mód, ne reading-výslovnost).
      // Spočítáno při connect z aktuálního slovníčku — systemInstruction je immutable (⚡reconnect).
      const focusWords = settings.interactionMode === 'reading' ? [] : buildFocusWords(loadVocabulary());

      // 1. Inicializace AudioContextu
      // Gemini posílá 24kHz, my nahráváme 16kHz. Browser to přeškáluje, pokud nastavíme kontexty správně.
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;

      // 2. Získání přístupu k mikrofonu
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      // 3. Výběr hlasu
      let voiceName = 'Kore';
      if (settings.voiceGender === 'MALE') {
        voiceName = settings.voiceAccent === 'UK' ? 'Fenrir' : 'Puck';
      } else {
        voiceName = settings.voiceAccent === 'UK' ? 'Zephyr' : 'Kore';
      }

      // 4. Připojení k Live API
      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO], // Chceme primárně audio
          systemInstruction: { parts: [{ text: settings.interactionMode === 'reading' ? getReadingSystemInstruction(correctionLang, referenceText) : getSystemInstruction(settings.level, settings.correctionStrictness, settings.showCzechTranslation, settings.activeScenario ? SCENARIOS.find(s => s.id === settings.activeScenario) : null, focusWords) }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (connectionId !== activeConnectionIdRef.current) return;
            setIsConnecting(false);
            isConnectingRef.current = false;
            setIsConnected(true);
            setNetworkSlow(false);
            lastServerActivityRef.current = Date.now();
            incrementUsage();

            // --- Nastavení Audio Input Pipeline ---
            // Musíme vytvořit separátní kontext pro vstup, abychom vynutili 16kHz
            const inputCtx = new AudioContext({ sampleRate: 16000 });
            inputAudioContextRef.current = inputCtx;
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;

            // Buffer size 4096 = cca 250ms latence zpracování, ale stabilnější
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              if (isPausedRef.current) {
                setVolumeLevel(0);
                return;
              }
              const inputData = e.inputBuffer.getChannelData(0);

              // Vizualizace hlasitosti (jednoduchý RMS)
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolumeLevel(Math.min(rms * 5, 1)); // Zesílíme pro vizuál

              // Konverze na PCM 16-bit
              const pcmData = convertFloat32ToInt16(inputData);
              const base64 = arrayBufferToBase64(pcmData.buffer as ArrayBuffer);

              // Odeslání do modelu — gemini-3.1 vyžaduje `audio` místo deprecated `media`
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: {
                    data: base64,
                    mimeType: 'audio/pcm;rate=16000'
                  }
                });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Aria začne konverzaci — posíláme text přes realtimeInput (Gemini 3.1 Live protokol)
            sessionPromise.then(session => {
              session.sendRealtimeInput({ text: 'Hello' });
            });
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (connectionId !== activeConnectionIdRef.current) return;
            const serverContent = msg.serverContent;
            lastServerActivityRef.current = Date.now();
            setNetworkSlow(false);

            // --- Zpracování transkripce ---
            const outputText = (serverContent as any)?.outputTranscription?.text;
            if (outputText) {
              setOutputTranscript(prev => prev + outputText);
              appendConversationChunk('model', outputText);
            }

            const inputText = (serverContent as any)?.inputTranscription?.text;
            if (inputText) {
              setInputTranscript(prev => prev + inputText);
              appendConversationChunk('user', inputText);
            }

            // Reset transcripts when a new model turn starts
            if (serverContent?.modelTurn) {
              // New model turn — reset input transcript (user finished speaking)
              if (serverContent.modelTurn.parts && serverContent.modelTurn.parts.length > 0) {
                // Only reset output on first audio chunk of a new turn
                const isFirstChunk = audioSourcesRef.current.size === 0;
                if (isFirstChunk) {
                  setOutputTranscript('');
                  setInputTranscript('');
                }
              }
            }

            // --- Zpracování Audia od modelu ---
            // Gemini 3.1: jeden event může obsahovat více parts (audio + transcript současně)
            const parts = serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              const audioData = part?.inlineData?.data;
              if (audioData && audioContextRef.current) {
                const ctx = audioContextRef.current;
                const buffer = await decodeAudioData(
                  base64ToUint8Array(audioData),
                  ctx
                );

                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);

                // Rychlost mluvení — JEDEN read ref per buffer (advisor #1):
                // stejná hodnota pro playbackRate i pro výpočet nextStartTime,
                // jinak by se buffery při pohybu slideru rozjely (drift/mezery).
                const rate = speechRateRef.current;
                source.playbackRate.value = rate;

                // Plánování přehrávání bez mezer (gapless)
                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime;
                }

                source.start(nextStartTimeRef.current);
                // Při rate < 1 trvá buffer déle (duration/rate), při rate > 1 kratší.
                nextStartTimeRef.current += buffer.duration / rate;

                audioSourcesRef.current.add(source);
                setIsSpeaking(true);

                source.onended = () => {
                  audioSourcesRef.current.delete(source);
                  if (audioSourcesRef.current.size === 0) {
                    setIsSpeaking(false);
                  }
                };
              }
            }

            // --- Klíčová vlastnost: PŘERUŠENÍ (Interruption) ---
            // Pokud model detekuje, že uživatel mluví, pošle interrupted: true.
            // My musíme okamžitě přestat přehrávat audio, aby to působilo přirozeně.
            if (serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) { }
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            if (connectionId !== activeConnectionIdRef.current) return;
            const wasManualDisconnect = manualDisconnectRef.current;
            manualDisconnectRef.current = false;
            setIsConnecting(false);
            isConnectingRef.current = false;
            setIsConnected(false);
            setIsSpeaking(false);
            setNetworkSlow(false);

            if (!wasManualDisconnect && Date.now() - connectStartedAtRef.current < 3000) {
              setError('Live session was closed immediately. Try again, or switch to Standard mode.');
            }
          },
          onerror: (e) => {
            console.error("Gemini Live Error", e);
            if (connectionId !== activeConnectionIdRef.current) return;
            setIsConnecting(false);
            isConnectingRef.current = false;
            setNetworkSlow(false);
            setError(mapLiveError(e));
            cleanup();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setIsConnecting(false);
      isConnectingRef.current = false;
      setNetworkSlow(false);
      setError(mapLiveError(e));
      setIsConnected(false);
    }
  }, [appendConversationChunk, cleanup, correctionLang, isConnected, mapLiveError, referenceText, settings]);

  // Cleanup on unmount — release MediaStream and AudioContext if component disappears
  useEffect(() => {
    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setNetworkSlow(false);
      return;
    }

    const interval = window.setInterval(() => {
      const silenceMs = Date.now() - lastServerActivityRef.current;
      if (silenceMs > 7000 && !isSpeaking) {
        setNetworkSlow(true);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isConnected, isSpeaking]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    cleanup();
  }, [cleanup]);

  const pause = useCallback(() => {
    // Guard: ignoruj, pokud už pauznuto (chrání před rychlým double-tapem, advisor #5)
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
    setVolumeLevel(0);
    // Zmraz output AudioContext → Aria okamžitě ztichne uprostřed věty.
    // suspend() zastaví hodiny kontextu, naplánované buffery se obnoví přesně tam, kde stály.
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'running') {
      ctx.suspend().catch(() => { /* context se zavírá/zavřel — bezpečně ignorovat */ });
    }
  }, []);

  const resume = useCallback(() => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    setIsPaused(false);
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
        .then(() => {
          // Po dlouhé pauze mohou být buffery naplánované "do minulosti" vůči
          // rozmrzlému currentTime → flushnuly by se naráz. Zarovnáme plánovač
          // na aktuální čas, aby další audio navázalo plynule (Forge/advisor #4).
          if (nextStartTimeRef.current < ctx.currentTime) {
            nextStartTimeRef.current = ctx.currentTime;
          }
        })
        .catch(() => { /* context se zavírá/zavřel — bezpečně ignorovat */ });
    }
  }, []);

  return {
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
    conversationLog
  };
};
