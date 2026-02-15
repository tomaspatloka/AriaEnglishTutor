import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  hasRecognitionSupport: boolean;
  error: string | null;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null); // Type 'any' used because SpeechRecognition types vary by browser
  const [hasSupport, setHasSupport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapRecognitionError = useCallback((code?: string) => {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone access denied. Please allow microphone permission and try again.';
      case 'audio-capture':
        return 'No microphone was found. Check your input device and try again.';
      case 'network':
        return 'Speech recognition network error. Check your internet connection.';
      case 'no-speech':
        return 'No speech detected. Try speaking a bit louder and closer to the microphone.';
      case 'aborted':
        return null;
      default:
        return 'Speech recognition failed. Please try again.';
    }
  }, []);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setHasSupport(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Stop after one sentence/phrase for chat style
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Target language is English

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
             // Optional: Handle interim results if needed
             // setTranscript(prev => prev + event.results[i][0].transcript);
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          setError(null);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setError(mapRecognitionError(event?.error));
      };
    } else {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
    }
  }, [mapRecognitionError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition is unavailable in this browser.');
      return;
    }

    if (!isListening) {
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (e: any) {
        console.error("Error starting recognition:", e);
        const fallbackCode = typeof e?.name === 'string' ? e.name.toLowerCase() : undefined;
        if (fallbackCode?.includes('notallowed')) {
          setError('Microphone access denied. Please allow microphone permission and try again.');
        } else {
          setError('Could not start microphone recognition. Please retry.');
        }
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    hasRecognitionSupport: hasSupport,
    error,
  };
};
