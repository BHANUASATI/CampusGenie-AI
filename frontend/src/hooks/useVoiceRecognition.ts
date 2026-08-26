import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
}

interface VoiceRecognitionOptions {
  continuous?: boolean;
  lang?: string;
  interimResults?: boolean;
}

export const useVoiceRecognition = (options: VoiceRecognitionOptions = {}) => {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    transcript: '',
    isSupported: false,
    error: null,
  });

  const recognitionRef = useRef<any>(null);
  const {
    continuous = false,
    lang = 'en-US',
    interimResults = true,
  } = options;

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: true }));
      
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.lang = lang;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        setState(prev => ({ ...prev, isListening: true, error: null }));
      };

      recognition.onend = () => {
        setState(prev => ({ ...prev, isListening: false }));
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setState(prev => ({
          ...prev,
          transcript: finalTranscript || interimTranscript,
        }));
      };

      recognition.onerror = (event: any) => {
        let errorMessage = 'Speech recognition error occurred';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech was detected';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone was found';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission was denied';
            break;
          case 'network':
            errorMessage = 'Network error occurred';
            break;
          default:
            errorMessage = `Error: ${event.error}`;
        }

        setState(prev => ({
          ...prev,
          isListening: false,
          error: errorMessage,
        }));
      };

      recognitionRef.current = recognition;
    } else {
      setState(prev => ({ ...prev, isSupported: false }));
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, lang, interimResults]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !state.isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }, [state.isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '' }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
};