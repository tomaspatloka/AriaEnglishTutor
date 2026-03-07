import { useState, useCallback, useEffect, useRef } from 'react';
import { AppSettings, VoiceAccent, VoiceGender } from '../types';

export const useTextToSpeech = (settings: AppSettings) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setSupported(true);

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };

      loadVoices();
      
      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Update selected voice based on settings
  useEffect(() => {
    if (availableVoices.length === 0) return;

    const targetLang = settings.voiceAccent === 'US' ? 'en-US' : 'en-GB';
    
    // 1. Filter by Language (Accent)
    const accentVoices = availableVoices.filter(v => v.lang.includes(targetLang));
    
    // Fallback to any English if exact region not found
    const englishVoices = accentVoices.length > 0 ? accentVoices : availableVoices.filter(v => v.lang.includes('en'));

    // 2. Filter by Gender (Best Effort - Browser voices don't standardly expose gender)
    // We look for keywords in the voice name.
    let bestMatch: SpeechSynthesisVoice | undefined;

    if (settings.voiceGender === 'FEMALE') {
      bestMatch = englishVoices.find(v => v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Google US English'));
    } else {
      bestMatch = englishVoices.find(v => v.name.toLowerCase().includes('male') || v.name.includes('Daniel') || v.name.includes('Google UK English Male'));
    }

    // 3. Fallback to first available English voice if no gender match found
    selectedVoiceRef.current = bestMatch || englishVoices[0] || availableVoices[0];

    console.log(`Selected Voice: ${selectedVoiceRef.current?.name} (${selectedVoiceRef.current?.lang})`);

  }, [availableVoices, settings.voiceAccent, settings.voiceGender]);

  // Shared utterance builder — single source of truth for TTS playback
  const buildAndSpeak = useCallback((text: string) => {
    const textToSpeak = text.split(/💡|🇨🇿/)[0].trim();
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
      utterance.lang = selectedVoiceRef.current.lang;
    } else {
      utterance.lang = settings.voiceAccent === 'US' ? 'en-US' : 'en-GB';
    }
    utterance.rate = 0.95;
    utterance.pitch = settings.voiceGender === 'FEMALE' ? 1.1 : 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [settings.voiceAccent, settings.voiceGender]);

  const speak = useCallback((text: string) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    if (!settings.autoPlayAudio) return;
    buildAndSpeak(text);
  }, [supported, settings.autoPlayAudio, buildAndSpeak]);

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [supported]);

  const speakManual = useCallback((text: string) => {
    // Force speak even if autoplay is off
    if (!supported) return;
    window.speechSynthesis.cancel();
    buildAndSpeak(text);
  }, [supported, buildAndSpeak]);

  return { speak, stop, isSpeaking, supported, speakManual };
};
