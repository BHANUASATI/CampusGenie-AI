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

  const recRef        = useRef<any>(null);
  const silenceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef     = useRef(false);
  const speakingRef   = useRef(false);

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

    try {
      const id  = await getConvId();
      const res = await aiAssistantService.sendMessage(id.toString(), text) as any;
      const ans = res?.ai_message?.content || '';
      const lng = res?.ai_message?.tts_language || detectLang(text);

      if (!activeRef.current) return;
      setPhase('speaking');
      speakingRef.current = true;

      // Show first 80 chars of what AI is saying
      setAiText(ans.slice(0, 120) + (ans.length > 120 ? '…' : ''));

      await speakWithCartesia(ans, lng, token);

      speakingRef.current = false;
      if (activeRef.current) {
        setLiveText('');
        setAiText('');
        setPhase('listening');
      }
    } catch (e: any) {
      speakingRef.current = false;
      if (activeRef.current) setPhase('listening'); // recover silently
    }
  }, [getConvId, token]);

  // ── Open mic ─────────────────────────────────────────────────────────────
  const openMic = useCallback(() => {
    if (!activeRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

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
      }
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

  // Auto-open mic when phase becomes 'listening'
  useEffect(() => {
    if (phase === 'listening' && activeRef.current) openMic();
  // eslint-disable-next-line
  }, [phase]);

  // Start session when dialog opens
  useEffect(() => {
    if (isOpen) {
      activeRef.current = true;
      setPhase('listening');
      setLiveText('');
      setAiText('');
    } else {
      activeRef.current = false;
      stopMic();
    }
  }, [isOpen, stopMic]);

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
    phase === 'speaking'  ? 'Speaking…'  : '';

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

        {/* End button */}
        <button className="vc-end-btn" onClick={onClose}>End</button>
      </div>
    </div>
  );
};

export default VoiceChat;
