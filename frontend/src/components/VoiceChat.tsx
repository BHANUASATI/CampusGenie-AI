/**
 * VoiceChat — Siri-style live voice conversation with CampusGenie.
 *
 * Flow:
 *   1. User taps mic → Speech recognition starts
 *   2. User speaks → transcript shown in real-time
 *   3. User stops → auto-send to AI
 *   4. AI responds → Cartesia TTS speaks the answer immediately
 *   5. TTS done → mic auto-opens again (continuous conversation)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAssistantService } from '../services/api';
import { useNeuralVoice } from '../hooks/useNeuralVoice';
import { stripMarkdownForSpeech } from '../hooks/useTextToSpeech';

interface VoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase =
  | 'idle'        // waiting to start
  | 'listening'   // mic open, hearing user
  | 'thinking'    // sent to AI, waiting response
  | 'speaking'    // TTS playing
  | 'error';

const SILENCE_TIMEOUT_MS = 1800; // auto-send after 1.8s silence

export const VoiceChat: React.FC<VoiceChatProps> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiText, setAiText] = useState('');
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false); // tracks if voice session is running

  const neuralVoice = useNeuralVoice();

  // ── Detect language for TTS ────────────────────────────────────────────────
  const detectLang = (text: string): string => {
    if (text.split('').some(ch => ch >= '\u0900' && ch <= '\u097F')) return 'hi';
    const hinglish = new Set(['kya','hai','meri','mera','kab','kaise','bhai','yaar','nahi','theek','abhi','phir','karo','batao']);
    if (text.toLowerCase().split(/\s+/).some(w => hinglish.has(w))) return 'hi';
    return 'en';
  };

  // ── Create/reuse conversation ──────────────────────────────────────────────
  const ensureConversation = useCallback(async (): Promise<number> => {
    if (conversationId) return conversationId;
    const conv = await aiAssistantService.createConversation('Voice Chat') as any;
    setConversationId(conv.id);
    return conv.id;
  }, [conversationId]);

  // ── Stop mic ───────────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
  }, []);

  // ── Send transcript to AI ──────────────────────────────────────────────────
  const sendToAI = useCallback(async (text: string) => {
    if (!text.trim()) { setPhase('idle'); return; }
    setPhase('thinking');
    setAiText('');
    try {
      const convId = await ensureConversation();
      const resp = await aiAssistantService.sendMessage(convId.toString(), text) as any;
      const answer = resp?.ai_message?.content || '';
      const lang = resp?.ai_message?.tts_language || detectLang(text);
      setAiText(answer);

      if (!activeRef.current) return;
      setPhase('speaking');

      const clean = stripMarkdownForSpeech(answer);
      if (neuralVoice.isSupported && clean) {
        await neuralVoice.speak(clean, lang);
      }

      if (activeRef.current) setPhase('listening');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setPhase('error');
    }
  }, [ensureConversation, neuralVoice]);

  // ── Start listening ────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!activeRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition not supported in this browser'); setPhase('error'); return; }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'hi-IN'; // supports both Hindi and English in multilingual mode

    let finalText = '';

    rec.onstart = () => setPhase('listening');

    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setTranscript(finalText + interim);

      // Reset silence timer on each result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        rec.stop();
        if ((finalText + interim).trim()) sendToAI(finalText + interim);
        else if (activeRef.current) startListening();
      }, SILENCE_TIMEOUT_MS);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' && activeRef.current) {
        startListening(); // restart silently on no-speech
        return;
      }
      setError(`Mic error: ${e.error}`);
      setPhase('error');
    };

    rec.onend = () => {
      // If no results fired (abrupt end), restart
      if (activeRef.current && phase === 'listening' && !finalText) {
        setTimeout(() => activeRef.current && startListening(), 300);
      }
    };

    recognitionRef.current = rec;
    setTranscript('');
    try { rec.start(); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sendToAI]);

  // ── Auto-start listening when speaking finishes ────────────────────────────
  useEffect(() => {
    if (phase === 'listening' && activeRef.current) {
      startListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Open / close session ───────────────────────────────────────────────────
  const startSession = () => {
    activeRef.current = true;
    setError('');
    setTranscript('');
    setAiText('');
    setPhase('listening');
  };

  const endSession = useCallback(() => {
    activeRef.current = false;
    stopListening();
    neuralVoice.stop?.();
    setPhase('idle');
    setTranscript('');
    setAiText('');
  }, [stopListening, neuralVoice]);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!isOpen) endSession();
    return () => { activeRef.current = false; stopListening(); };
  }, [isOpen, endSession, stopListening]);

  if (!isOpen) return null;

  // ── UI ─────────────────────────────────────────────────────────────────────
  const phaseLabel: Record<Phase, string> = {
    idle: 'Tap to start talking',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
    error: error || 'Something went wrong',
  };

  const pulseClass = phase === 'listening' ? 'vc-pulse-listen'
    : phase === 'speaking' ? 'vc-pulse-speak'
    : phase === 'thinking' ? 'vc-pulse-think'
    : '';

  return (
    <div className="vc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vc-panel">
        {/* Close */}
        <button className="vc-close" onClick={onClose}>✕</button>

        {/* Title */}
        <div className="vc-title">🎓 CampusGenie Voice</div>

        {/* Animated orb */}
        <div className={`vc-orb ${pulseClass}`} onClick={phase === 'idle' ? startSession : undefined}>
          {phase === 'idle' && <span className="vc-orb-icon">🎤</span>}
          {phase === 'listening' && <span className="vc-orb-icon vc-wave">●</span>}
          {phase === 'thinking' && <span className="vc-orb-icon vc-spin">⟳</span>}
          {phase === 'speaking' && <span className="vc-orb-icon vc-wave">♫</span>}
          {phase === 'error' && <span className="vc-orb-icon">⚠</span>}
        </div>

        {/* Status */}
        <div className="vc-status">{phaseLabel[phase]}</div>

        {/* Transcript */}
        {transcript && (
          <div className="vc-bubble vc-user">
            <span className="vc-bubble-label">You</span>
            {transcript}
          </div>
        )}

        {/* AI response */}
        {aiText && (
          <div className="vc-bubble vc-ai">
            <span className="vc-bubble-label">CampusGenie</span>
            {aiText.length > 200 ? aiText.slice(0, 200) + '…' : aiText}
          </div>
        )}

        {/* Controls */}
        <div className="vc-controls">
          {phase === 'idle' ? (
            <button className="vc-btn vc-btn-start" onClick={startSession}>
              Start Talking
            </button>
          ) : (
            <button className="vc-btn vc-btn-stop" onClick={endSession}>
              End
            </button>
          )}
        </div>

        {/* Hint */}
        <div className="vc-hint">
          {phase === 'listening' ? 'Speak naturally — Hindi, Hinglish, or English'
            : phase === 'speaking' ? 'Listening again after response…'
            : 'Tap Start to have a voice conversation'}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
