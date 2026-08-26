import { useState, useCallback, useRef, useEffect } from 'react';

interface TextToSpeechState {
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
  currentVoice: SpeechSynthesisVoice | null;
  availableVoices: SpeechSynthesisVoice[];
}

interface TextToSpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export const useTextToSpeech = (options: TextToSpeechOptions = {}) => {
  const [state, setState] = useState<TextToSpeechState>({
    isSpeaking: false,
    isSupported: false,
    error: null,
    currentVoice: null,
    availableVoices: [],
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const {
    voice: preferredVoice,
    rate = 1,
    pitch = 1,
    volume = 1,
    lang = 'en-US',
  } = options;

  useEffect(() => {
    // Check if browser supports Speech Synthesis
    if ('speechSynthesis' in window) {
      setState(prev => ({ ...prev, isSupported: true }));

      // Load available voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setState(prev => ({
          ...prev,
          availableVoices: voices,
          currentVoice: voices.find(v => v.lang === lang) || voices[0] || null,
        }));
      };

      // Load voices immediately if available
      loadVoices();

      // Some browsers load voices asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      setState(prev => ({ ...prev, isSupported: false }));
    }

    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang]);

  const speak = useCallback((text: string, overrideOptions?: TextToSpeechOptions) => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Text-to-speech is not supported in this browser' }));
      return;
    }

    if (!text.trim()) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Apply options
    utterance.rate = overrideOptions?.rate ?? rate;
    utterance.pitch = overrideOptions?.pitch ?? pitch;
    utterance.volume = overrideOptions?.volume ?? volume;
    utterance.lang = overrideOptions?.lang ?? lang;

    // Set voice
    const selectedVoice = overrideOptions?.voice 
      ? state.availableVoices.find(v => v.name === overrideOptions.voice)
      : (preferredVoice 
          ? state.availableVoices.find(v => v.name === preferredVoice)
          : state.currentVoice);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, error: null }));
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    };

    utterance.onerror = (event: any) => {
      let errorMessage = 'Speech synthesis error occurred';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Speech synthesis permission was denied';
          break;
        case 'canceled':
          errorMessage = 'Speech was canceled';
          break;
        case 'interrupted':
          errorMessage = 'Speech was interrupted';
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      setState(prev => ({
        ...prev,
        isSpeaking: false,
        error: errorMessage,
      }));
    };

    window.speechSynthesis.speak(utterance);
  }, [state.isSupported, state.availableVoices, state.currentVoice, preferredVoice, rate, pitch, volume, lang]);

  const stop = useCallback(() => {
    if (state.isSpeaking) {
      window.speechSynthesis.cancel();
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, [state.isSpeaking]);

  const pause = useCallback(() => {
    if (state.isSpeaking) {
      window.speechSynthesis.pause();
    }
  }, [state.isSpeaking]);

  const resume = useCallback(() => {
    if (state.isSpeaking === false && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setState(prev => ({ ...prev, isSpeaking: true }));
    }
  }, [state.isSpeaking]);

  const setVoice = useCallback((voiceName: string) => {
    const voice = state.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      setState(prev => ({ ...prev, currentVoice: voice }));
    }
  }, [state.availableVoices]);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    setVoice,
  };
};