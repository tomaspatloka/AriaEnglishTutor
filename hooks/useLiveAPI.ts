import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AppSettings } from '../types';
import { getSystemInstruction } from '../constants';
import { base64ToUint8Array, arrayBufferToBase64, convertFloat32ToInt16, decodeAudioData } from '../utils/audioUtils';
import { incrementUsage } from '../utils/usageUtils';

// Používáme model podporující nativní audio streamování
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

interface UseLiveAPIReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isSpeaking: boolean;
  volumeLevel: number; // Pro vizualizaci hlasitosti
  error: string | null;
}

export const useLiveAPI = (settings: AppSettings): UseLiveAPIReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs pro audio komponenty
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Refs pro správu session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null);

  // Refs pro přehrávání audia
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Cleanup funkce pro uvolnění zdrojů
  const cleanup = useCallback(() => {
    // 1. Zastavit nahrávání
    if (processorRef.current) {
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
    setIsSpeaking(false);
    setVolumeLevel(0);
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    cleanup(); // Ujistíme se, že začínáme s čistým štítem

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
          systemInstruction: { parts: [{ text: getSystemInstruction(settings.level, settings.correctionStrictness, settings.showCzechTranslation) }] },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          // Pro tuto verzi vypínáme transkripci pro snížení latence, 
          // pokud ji nepotřebujeme nutně v UI v reálném čase.
          inputAudioTranscription: {},
          // outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            incrementUsage();
            console.log("Gemini Live Connected 🟢");

            // --- Nastavení Audio Input Pipeline ---
            // Musíme vytvořit separátní kontext pro vstup, abychom vynutili 16kHz
            const inputCtx = new AudioContext({ sampleRate: 16000 });
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
            const serverContent = msg.serverContent;

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
            console.log("Gemini Live Closed 🔴");
            setIsConnected(false);
            setIsSpeaking(false);
          },
          onerror: (e) => {
            console.error("Gemini Live Error", e);
            setError("Connection Error");
            cleanup();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start live session");
      setIsConnected(false);
    }
  }, [cleanup, settings]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    volumeLevel,
    error
  };
};