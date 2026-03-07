import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AppSettings, Message } from '../types';
import { getSystemInstruction, SCENARIOS } from '../constants';
import { base64ToUint8Array, arrayBufferToBase64, convertFloat32ToInt16, decodeAudioData } from '../utils/audioUtils';
import { incrementUsage } from '../utils/usageUtils';

// Používáme model podporující nativní audio streamování
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

interface UseLiveAPIReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  networkSlow: boolean;
  volumeLevel: number; // Pro vizualizaci hlasitosti
  error: string | null;
  outputTranscript: string; // Real-time transcript of Aria's speech
  inputTranscript: string; // Real-time transcript of user's speech
  conversationLog: Message[];
}

export const useLiveAPI = (settings: AppSettings): UseLiveAPIReturn => {
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
          systemInstruction: { parts: [{ text: getSystemInstruction(settings.level, settings.correctionStrictness, settings.showCzechTranslation, settings.activeScenario ? SCENARIOS.find(s => s.id === settings.activeScenario) : null) }] },
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
            console.log("Gemini Live Connected 🟢");

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

              // Odeslání do modelu
              // Důležité: Používáme sessionPromise z uzávěru (closure)
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64
                  }
                });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
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
            const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              const buffer = await decodeAudioData(
                base64ToUint8Array(audioData),
                ctx
              );

              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);

              // Plánování přehrávání bez mezer (gapless)
              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;

              audioSourcesRef.current.add(source);
              setIsSpeaking(true);

              source.onended = () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                  setIsSpeaking(false);
                }
              };
            }

            // --- Klíčová vlastnost: PŘERUŠENÍ (Interruption) ---
            // Pokud model detekuje, že uživatel mluví, pošle interrupted: true.
            // My musíme okamžitě přestat přehrávat audio, aby to působilo přirozeně.
            if (serverContent?.interrupted) {
              console.log("Interrupted by user! 🛑");
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
            console.log("Gemini Live Closed");
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
  }, [appendConversationChunk, cleanup, isConnected, mapLiveError, settings]);

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

  return {
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
    conversationLog
  };
};
