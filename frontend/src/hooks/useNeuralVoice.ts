import { useState, useCallback, useRef, useEffect } from 'react';
import { aiAssistantService } from '../services/api';
import { stripMarkdownForSpeech, chunkForSpeech } from './useTextToSpeech';

/**
 * Neural spoken answers.
 *
 * The browser's `speechSynthesis` is kept in `useTextToSpeech` as a fallback, but
 * it cannot be made to sound conversational: it exposes only rate, pitch and
 * volume over the operating system's own compact voices, so a better voice name
 * cannot add the intonation and pacing that make speech sound like a person.
 * This hook asks the backend for a neural voice instead and plays the audio it
 * returns.
 *
 * If the backend cannot synthesise, `isSupported` stays false and the caller
 * uses the browser voice, so a synthesis outage costs quality and nothing more.
 */

export interface NeuralVoice {
  id: string;
  label: string;
  locale: string;
  gender: string;
}

interface NeuralVoiceState {
  /** A neural voice is reachable. When false, use the browser voice. */
  isSupported: boolean;
  /** Still asking the backend whether it can synthesise. */
  isChecking: boolean;
  isSpeaking: boolean;
  /** Backend-reported reason synthesis is unavailable, if any. */
  unavailableReason: string | null;
  voices: NeuralVoice[];
  currentVoice: string | null;
  provider: string | null;
}

/** How many chunks to keep synthesised ahead of the one playing. */
const PREFETCH_AHEAD = 1;

/** Voices the backend advertises, trimmed to the ones worth showing. */
const MAX_VOICES = 10;

export const useNeuralVoice = () => {
  const [state, setState] = useState<NeuralVoiceState>({
    isSupported: false,
    isChecking: true,
    isSpeaking: false,
    unavailableReason: null,
    voices: [],
    currentVoice: null,
    provider: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Object URLs for fetched chunks. Revoked on stop and on unmount; leaking them
  // pins the whole reply's audio in memory for the life of the tab.
  const urlsRef = useRef<string[]>([]);
  // Incremented by every speak()/stop(), so a reply in flight can tell it has
  // been superseded instead of starting to play over the new one.
  const tokenRef = useRef(0);
  // Chunks already fetched, so playback does not wait on the network twice.
  const bufferRef = useRef<Map<number, Blob>>(new Map());
  // Requests in flight, keyed by chunk, so a prefetch and playback asking for
  // the same chunk share one request instead of synthesising it twice.
  const pendingRef = useRef<Map<number, Promise<boolean>>>(new Map());
  const chunksRef = useRef<string[]>([]);

  const releaseUrls = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
  }, []);

  const stop = useCallback(() => {
    // Bump first so anything awaiting a fetch resolves into a no-op.
    tokenRef.current += 1;
    bufferRef.current.clear();
    pendingRef.current.clear();
    chunksRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      // Move off the element entirely, otherwise a later play() can resume a
      // stale source instead of the new reply's first chunk.
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    releaseUrls();
    setState((prev) => ({ ...prev, isSpeaking: false }));
  }, [releaseUrls]);

  // Ask the backend once, on mount.
  useEffect(() => {
    let active = true;

    aiAssistantService
      .getVoices()
      .then((data: any) => {
        if (!active) return;
        const voices: NeuralVoice[] = Array.isArray(data?.voices) ? data.voices : [];
        const available = Boolean(data?.available) && voices.length > 0;
        setState((prev) => ({
          ...prev,
          isChecking: false,
          isSupported: available,
          voices: voices.slice(0, MAX_VOICES),
          currentVoice: available ? data?.default ?? voices[0].id : null,
          provider: data?.provider ?? null,
          unavailableReason: available
            ? null
            : data?.available === false
              ? `Neural voice provider "${data?.provider ?? 'edge'}" is not configured on this deployment`
              : 'No voices available',
        }));
      })
      .catch((err: any) => {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          isChecking: false,
          isSupported: false,
          unavailableReason:
            err?.message ? `Neural voice unavailable: ${err.message}` : 'Neural voice unavailable',
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  // Stop on unmount, and on a voice change: audio already queued was synthesised
  // in the previous voice, so letting it finish would be wrong.
  useEffect(() => stop, [stop]);

  const setVoice = useCallback((voiceId: string) => {
    setState((prev) => ({ ...prev, currentVoice: voiceId }));
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!state.isSupported) return false;

      const clean = stripMarkdownForSpeech(text);
      const chunks = chunkForSpeech(clean);
      if (chunks.length === 0) return false;

      stop();

      const token = tokenRef.current;
      chunksRef.current = chunks;
      bufferRef.current.clear();
      pendingRef.current.clear();

      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      // Fetch one chunk ahead of playback. Without this there is an audible gap
      // at every sentence join while the next request completes. Concurrent
      // callers for the same chunk share one request, so a prefetch that is
      // still in flight is not duplicated when playback catches up with it.
      const fetchChunk = (index: number): Promise<boolean> => {
        if (token !== tokenRef.current) return Promise.resolve(false);
        if (bufferRef.current.has(index)) return Promise.resolve(true);

        const pending = pendingRef.current.get(index);
        if (pending) return pending;

        const request = (async () => {
          try {
            const { blob } = await aiAssistantService.speak(
              chunks[index],
              state.currentVoice ?? undefined
            );
            if (token !== tokenRef.current) return false;
            bufferRef.current.set(index, blob);
            return true;
          } catch {
            return false;
          } finally {
            pendingRef.current.delete(index);
          }
        })();

        pendingRef.current.set(index, request);
        return request;
      };

      // Start the first request before announcing that speech has begun, so the
      // UI does not claim to be talking before any audio exists.
      const firstOk = await fetchChunk(0);
      if (!firstOk) {
        if (token === tokenRef.current) {
          releaseUrls();
          setState((prev) => ({
            ...prev,
            isSpeaking: false,
            unavailableReason: 'Could not synthesise the spoken answer',
          }));
        }
        return false;
      }

      setState((prev) => ({ ...prev, isSpeaking: true, unavailableReason: null }));

      for (let index = 0; index < chunks.length; index++) {
        if (token !== tokenRef.current) return true;

        if (!bufferRef.current.has(index)) {
          const ok = await fetchChunk(index);
          if (!ok || token !== tokenRef.current) break;
        }

        // Warm the next chunk while this one plays.
        if (index + 1 < chunks.length) {
          void fetchChunk(index + 1);
        }

        const blob = bufferRef.current.get(index);
        if (!blob) break;

        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);

        const played = await new Promise<boolean>((resolve) => {
          const done = (ok: boolean) => {
            audio.onended = null;
            audio.onerror = null;
            resolve(ok);
          };
          audio.onended = () => done(true);
          audio.onerror = () => done(false);
          audio.src = url;
          audio.currentTime = 0;
          audio.play().catch(() => done(false));
        });

        bufferRef.current.delete(index);

        if (!played) break;
      }

      if (token === tokenRef.current) {
        releaseUrls();
        setState((prev) => ({ ...prev, isSpeaking: false }));
      }
      return true;
    },
    [state.isSupported, state.currentVoice, stop, releaseUrls]
  );

  return {
    ...state,
    speak,
    stop,
    setVoice,
  };
};
