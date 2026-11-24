/**
 * VoiceChat — Apple Siri–style instant voice conversation.
 *
 * Exactly like Siri:
 *  • One tap → mic opens immediately, no extra steps
 *  • User speaks → AI listens in real-time
 *  • Silence detected → auto-sends, AI speaks back
 *  • TTS finishes → mic reopens automatically
 *  • No text bubbles cluttering the UI — just the orb and what's being said
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAssistantService } from '../services/api';
import { stripMarkdownForSpeech } from '../hooks/useTextToSpeech';

interface VoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = 'listening' | 'thinking' | 'speaking' | 'error';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8002';
const SILENCE_MS = 1600; // silence before auto-send

const getSpeechRecognition = () =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const SPEECH_ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow the mic for this site in your browser settings.',
  'service-not-allowed': 'Speech service was blocked. Check browser microphone permissions.',
  'audio-capture': 'No microphone was found or it is already in use.',
  'network': 'Speech recognition needs a network connection. Check your internet.',
  'no-speech': 'No speech was detected.',
  'aborted': '',
};

// ── Cartesia TTS directly — fastest path, no extra round-trip ─────────────
async function speakWithCartesia(text: string, lang: string, token: string): Promise<void> {
  const clean = stripMarkdownForSpeech(text);
  if (!clean.trim()) return;

  // Split into sentences for faster first audio
  const sentences = clean.match(/[^.!?।]+[.!?।]*/g)?.filter(s => s.trim()) || [clean];

  for (const sentence of sentences) {
    try {
      const res = await fetch(`${API}/api/ai/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: sentence.trim(), language: lang }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch { /* skip failed sentence */ }
  }
}

// ── Language detection ─────────────────────────────────────────────────────
function detectLang(text: string): string {
  if ([...text].some(ch => ch >= '\u0900' && ch <= '\u097F')) return 'hi';
  const hi = new Set(['kya','hai','meri','mera','kab','kaise','bhai','yaar','nahi','theek','abhi','phir','karo','batao','mujhe','kitna','kaun']);
  if (text.toLowerCase().split(/\s+/).some(w => hi.has(w))) return 'hi';
  return 'en';
}

// ── Component ─────────────────────────────────────────────────────────────
export const VoiceChat: React.FC<VoiceChatProps> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<Phase>('listening');
  const [liveText, setLiveText] = useState('');   // what user is saying right now
  const [aiText, setAiText]   = useState('');     // last AI sentence being spoken
  const [convId, setConvId]   = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const voiceSupported = Boolean(getSpeechRecognition());

  const recRef        = useRef<any>(null);
  const silenceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef     = useRef(false);
  const speakingRef   = useRef(false);
  const thinkingSinceRef = useRef<number | null>(null);

  const token = localStorage.getItem('authToken') || '';

  // ── Create conversation once ─────────────────────────────────────────────
  const getConvId = useCallback(async (): Promise<number> => {
    if (convId) return convId;
    const c = await aiAssistantService.createConversation('Voice Chat') as any;
    setConvId(c.id);
    return c.id;
  }, [convId]);

  // ── Stop mic ─────────────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    try { recRef.current?.stop(); } catch {}
  }, []);

  // ── Send to AI + speak response ──────────────────────────────────────────
  const sendToAI = useCallback(async (text: string) => {
    if (!text.trim() || !activeRef.current) return;
    setPhase('thinking');
    thinkingSinceRef.current = Date.now();

    try {
      const id  = await getConvId();
      const res = await aiAssistantService.sendMessage(id.toString(), text) as any;
      const ans = res?.ai_message?.content || '';
      const lng = res?.ai_message?.tts_language || detectLang(text);

      if (!activeRef.current) return;
      thinkingSinceRef.current = null;
      setPhase('speaking');
      speakingRef.current = true;

      // Show the answer text long enough to be read even if audio playback
      // fails or the TTS service returns no audio.
      const answerShownAt = Date.now();
      setAiText(ans.slice(0, 120) + (ans.length > 120 ? '…' : ''));

      await speakWithCartesia(ans, lng, token);
      const remaining = 2500 - (Date.now() - answerShownAt);
      if (remaining > 0) await new Promise<void>(resolve => setTimeout(resolve, remaining));

      speakingRef.current = false;
      if (activeRef.current) {
        setLiveText('');
        setAiText('');
        setPhase('listening');
      }
    } catch (e: any) {
      speakingRef.current = false;
      thinkingSinceRef.current = null;
      if (activeRef.current) {
        setError(e?.message ? `Could not get an answer: ${e.message}` : 'Could not get an answer. Check your connection.');
        setPhase('error');
      }
    }
  }, [getConvId, token]);

  // ── Open mic ─────────────────────────────────────────────────────────────
  const openMic = useCallback(() => {
    if (!activeRef.current) return;
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('Voice input is not supported in this browser. Use Chrome or Edge, or type your question below.');
      setPhase('error');
      return;
    }
    setError(null);

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'hi-IN'; // supports Hindi + English bilingual

    let final = '';

    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      const full = (final + interim).trim();
      setLiveText(full);

      // Reset silence timer
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        rec.stop();
        if (full) sendToAI(full);
        else if (activeRef.current) openMic(); // restart if nothing heard
      }, SILENCE_MS);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' && activeRef.current) {
        setTimeout(() => activeRef.current && !speakingRef.current && openMic(), 200);
        return;
      }
      if (e.error === 'aborted') return;
      const message = SPEECH_ERRORS[e.error] || `Speech recognition failed: ${e.error}`;
      setError(message);
      setPhase('error');
    };

    rec.onend = () => {
      // If we ended without results and still active, restart
      if (activeRef.current && !final.trim() && !speakingRef.current && phase === 'listening') {
        setTimeout(() => activeRef.current && openMic(), 200);
      }
    };

    recRef.current = rec;
    setLiveText('');
    try { rec.start(); } catch {}
  // eslint-disable-next-line
  }, [phase, sendToAI]);

  // Type a question when speech input is unavailable or fails
  const submitTyped = useCallback(() => {
    const text = typedText.trim();
    if (!text) return;
    setTypedText('');
    setError(null);
    void sendToAI(text);
  }, [typedText, sendToAI]);

  const retryMic = useCallback(() => {
    setError(null);
    setTypedText('');
    setPhase('listening');
  }, []);

  // Never leave the user staring at "Thinking…" forever.
  useEffect(() => {
    if (phase !== 'thinking') return;
    const timer = setTimeout(() => {
      if (activeRef.current && thinkingSinceRef.current) {
        thinkingSinceRef.current = null;
        setError('The AI is taking too long to respond. Please try again or type your question.');
        setPhase('error');
      }
    }, 25000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Auto-open mic when phase becomes 'listening'
  useEffect(() => {
    if (phase === 'listening' && activeRef.current) openMic();
  // eslint-disable-next-line
  }, [phase]);

  // Start session when dialog opens
  useEffect(() => {
    if (isOpen) {
      activeRef.current = true;
      setLiveText('');
      setAiText('');
      setTypedText('');
      if (!voiceSupported) {
        setError('Voice input is not supported in this browser. Use Chrome or Edge, or type your question below.');
        setPhase('error');
      } else {
        setError(null);
        setPhase('listening');
      }
    } else {
      activeRef.current = false;
      stopMic();
    }
  }, [isOpen, stopMic, voiceSupported]);

  // Cleanup
  useEffect(() => () => {
    activeRef.current = false;
    stopMic();
  }, [stopMic]);

  if (!isOpen) return null;

  const orbClass =
    phase === 'listening' ? 'vc-orb vc-orb-listen' :
    phase === 'thinking'  ? 'vc-orb vc-orb-think'  :
    phase === 'speaking'  ? 'vc-orb vc-orb-speak'  :
    'vc-orb';

  const statusText =
    phase === 'listening' ? 'Listening…' :
    phase === 'thinking'  ? 'Thinking…'  :
    phase === 'speaking'  ? 'Speaking…'  :
    phase === 'error'     ? 'Voice input unavailable' : '';

  return (
    <div className="vc-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="vc-panel">

        {/* Close */}
        <button className="vc-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Orb */}
        <div className={orbClass}>
          <div className="vc-orb-ring vc-orb-ring-1" />
          <div className="vc-orb-ring vc-orb-ring-2" />
          <div className="vc-orb-ring vc-orb-ring-3" />
          <div className="vc-orb-core">
            {phase === 'listening' && <span className="vc-wave-icon">🎤</span>}
            {phase === 'thinking'  && <span className="vc-spin-icon">⟳</span>}
            {phase === 'speaking'  && <span className="vc-wave-icon">♪</span>}
          </div>
        </div>

        {/* Status */}
        <div className="vc-status">{statusText}</div>

        {/* Live transcript */}
        {liveText && (
          <div className="vc-transcript vc-user-text">"{liveText}"</div>
        )}

        {/* AI speaking text */}
        {aiText && (
          <div className="vc-transcript vc-ai-text">{aiText}</div>
        )}

        {/* Hint */}
        {!liveText && !aiText && phase === 'listening' && (
          <div className="vc-hint">Speak in Hindi, Hinglish, or English</div>
        )}

        {error && (
          <div className="vc-error" role="alert">
            <span className="vc-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {phase === 'error' && (
          <>
            <form
              className="vc-fallback"
              onSubmit={(e) => { e.preventDefault(); submitTyped(); }}
            >
              <input
                autoFocus
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your question instead…"
                aria-label="Type your question"
              />
              <button type="submit" disabled={!typedText.trim()}>Send</button>
            </form>
            {voiceSupported && (
              <button className="vc-retry" onClick={retryMic}>Try mic again</button>
            )}
          </>
        )}

        {/* End button */}
        <button className="vc-end-btn" onClick={onClose}>End</button>
      </div>
    </div>
  );
};

export default VoiceChat;
