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

/* ---------------------------------------------------------------------------
   Choosing a voice
   ---------------------------------------------------------------------------
   This is most of the problem. `speechSynthesis.getVoices()` returns 180
   entries on macOS and they are NOT ordered by quality — they come back in
   whatever order the platform enumerated them. The old code took
   `voices.find(v => v.lang === 'en-US')`, which on macOS resolves to "Albert",
   the first novelty voice in the list. That is the flat, obviously synthetic
   read people were hearing.

   Two tiers are treated specially:

   - Names on NOVELTY_VOICES are macOS's deliberately silly voices (Boing,
     Bubbles, Cellos, Trinoids, Wobble, Zarvox, …). Never auto-select one.
   - Names on PREMIUM_VOICES are the natural ones that ship with each platform
     (Samantha, Alex, Karen, Daniel, Moira, Google/Microsoft neural voices).
     Prefer these above everything else.

   Everything not on either list is scored on a plain-English name, since the
   enumerator alone is no guide to quality.
   ------------------------------------------------------------------------- */

const NOVELTY_VOICES = new Set([
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'eddy',
  'flo', 'fred', 'good news', 'grandma', 'grandpa', 'jester', 'junior', 'organ',
  'ralph', 'reed', 'rocko', 'sandy', 'shelley', 'superstar', 'trinoids',
  'whisper', 'wobble', 'zarvox', 'bubbles', 'pipe organ', 'bad_news',
]);

const PREMIUM_VOICES = new Set([
  // macOS
  'samantha', 'alex', 'nicky', 'ava', 'serena', 'karen', 'daniel', 'moira',
  'tessa', 'fiona', 'allison', 'tom', 'oliver',
  // Windows / Edge neural
  'aria', 'guy', 'jenny', 'michelle', 'zira', 'david', 'mark',
  // Chrome / Google
  'google uk english male', 'google uk english female',
  'google us english', 'google india english',
]);

/**
 * macOS appends a parenthesised descriptor to several voices — "Samantha
 * (Premium)", but also "Eddy (English (United States))". The descriptor is the
 * single most reliable signal of quality the API exposes, so it is parsed out
 * and scored rather than left inside the name.
 */
const qualityFromName = (voice: SpeechSynthesisVoice) => {
  const name = voice.name.toLowerCase();
  return {
    premium: /premium|enhanced|neural|natural/.test(name),
    novelty: /novelty|compact/.test(name),
  };
};

/**
 * Name with any parenthesised qualifier removed.
 *
 * This is what the blacklists are keyed on. Comparing whole names silently
 * failed for every suffixed voice, which let "Eddy (English (United States))",
 * "Grandma (English (United States))" and friends through as if they were
 * ordinary voices — macOS registers them as novelty, and they sound like it.
 */
const baseVoiceName = (voice: SpeechSynthesisVoice) =>
  voice.name.toLowerCase().split('(')[0].trim();

const scoreVoice = (voice: SpeechSynthesisVoice, lang: string) => {
  const name = voice.name.toLowerCase();
  const base = baseVoiceName(voice);
  const { premium, novelty } = qualityFromName(voice);

  // A Premium/Enhanced/Neural marker upgrades a base name that would otherwise
  // read as novelty — macOS ships Shelley in both a novelty and a premium
  // flavour, distinguished only by the suffix. Trust the marker.
  if (novelty || (NOVELTY_VOICES.has(base) && !premium)) return -100;

  let score = 0;
  if (PREMIUM_VOICES.has(base)) score += 60;
  if (premium) score += 45;

  // Exact language match beats a language variant beats anything else.
  const voiceLang = voice.lang.replace('_', '-');
  if (voiceLang.toLowerCase() === lang.toLowerCase()) score += 25;
  else if (voiceLang.split('-')[0] === lang.split('-')[0]) score += 10;

  if (voice.localService) score += 8;
  if (voice.default) score += 4;

  return score;
};

/** Best available voice for a language, or null when the list is still empty. */
export const pickBestVoice = (
  voices: SpeechSynthesisVoice[],
  lang: string,
  exclude: SpeechSynthesisVoice[] = []
): SpeechSynthesisVoice | null => {
  const excluded = new Set(exclude.map(v => v.voiceURI));
  const pool = voices.filter(v => !excluded.has(v.voiceURI));
  if (pool.length === 0) return null;

  const ranked = [...pool].sort(
    (a, b) => scoreVoice(b, lang) - scoreVoice(a, lang)
  );
  // Only take a novelty voice when there is genuinely nothing else installed.
  const best = ranked[0];
  return scoreVoice(best, lang) < 0 ? null : best;
};

/**
 * The short list worth offering in a picker: the good voices first, novelty
 * excluded. Capped so the dropdown stays usable on a machine with 180 voices.
 *
 * Restricted to the requested language's family. Every other natural voice on
 * the machine still scores above zero — it is simply a good voice for some
 * other language — and offering "Alice · it-IT" next to English answers invites
 * the reader to pick a voice that cannot pronounce the text. If a machine has
 * no voices for this language at all, the ranked list is returned anyway rather
 * than showing an empty dropdown.
 */
export const curatedVoices = (
  voices: SpeechSynthesisVoice[],
  lang: string,
  limit = 12
): SpeechSynthesisVoice[] => {
  const ranked = voices
    .filter(v => scoreVoice(v, lang) > 0)
    .sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));

  const targetFamily = lang.split('-')[0].toLowerCase();
  const sameLanguage = ranked.filter(
    v => v.lang.replace('_', '-').split('-')[0].toLowerCase() === targetFamily
  );

  return (sameLanguage.length > 0 ? sameLanguage : ranked).slice(0, limit);
};

/* ---------------------------------------------------------------------------
   Turning a markdown answer into something worth listening to
   ---------------------------------------------------------------------------
   The assistant answers in markdown — `**bold**`, `•` bullets, `#` headings,
   emoji, inline backticks. Handed straight to `speak()` the synthesiser reads
   the punctuation aloud: "asterisk asterisk Study Tips asterisk asterisk",
   "bullet bullet Active Recall". That, more than any voice setting, is why the
   output sounded unclear.

   So the reply is flattened to prose first. Meaning is kept, markup is not.
   ------------------------------------------------------------------------- */

export const stripMarkdownForSpeech = (raw: string): string => {
  if (!raw) return '';

  let text = raw;

  // Fenced code blocks: unreadable as prose, and long enough to stall the
  // synthesiser. Replace with a marker rather than deleting silently.
  text = text.replace(/```[\s\S]*?```/g, ' code omitted. ');
  // Inline code keeps its text, loses the backticks.
  text = text.replace(/`([^`]+)`/g, '$1');

  // Images before links, or ![alt](src) is read as a link.
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  // Links read as their label.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Bare URLs: read the host, drop the path and query noise.
  text = text.replace(/https?:\/\/\S+/g, (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return ' ';
    }
  });

  // Emphasis. Handle **/__ first so the single-character rule does not eat it.
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(?!\s)(.*?)(?<!\s)\1/g, '$2');
  // Strikethrough.
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Headings: keep the words, drop the hashes, and mark them as a section so
  // the pause between sections is audible.
  text = text.replace(/^\s{0,3}#{1,6}\s*(.*)$/gm, '$1. ');

  // List markers at the start of a line become sentence breaks, so each bullet
  // is spoken as its own thought instead of running together.
  text = text.replace(/^\s*[-*+•‣▪·]\s+/gm, ' ');
  // Ordered list markers.
  text = text.replace(/^\s*\d+[.)]\s+/gm, ' ');
  // Blockquote bars.
  text = text.replace(/^\s*>\s?/gm, '');
  // Horizontal rules.
  text = text.replace(/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/gm, ' ');

  // Emoji and pictographs. The backend decorates headings heavily (📚 ⏰ 🎓);
  // left in place some synthesisers read them as words, others skip them
  // mid-phrase and leave an unnatural gap.
  text = text.replace(
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}\u{2B50}]/gu,
    ''
  );
  // Variation selectors and zero-width joiners left behind by the emoji pass.
  text = text.replace(/[\uFE0E\uFE0F\u200D]/g, '');

  // Markdown table pipes and separator rows.
  text = text.replace(/^\s*\|?[\s:|-]+\|\s*$/gm, ' ');
  text = text.replace(/\|/g, ' ');

  // Newlines and runs of whitespace collapse to a single space. `intl`
  // segmenters below rely on sentence punctuation, not line breaks.
  text = text.replace(/\s+/g, ' ').trim();

  // A colon that ended a heading now reads as a lead-in, not a dangling label.
  text = text.replace(/\s+([.,;:!?])/g, '$1');

  return text;
};

/**
 * Split into speakable chunks on sentence boundaries.
 *
 * Two reasons, both practical. Chrome silently truncates any single utterance
 * after roughly fifteen seconds, so a long answer used to stop mid-sentence.
 * And one utterance per sentence lets the synthesiser reset between thoughts,
 * which is what makes it sound like reading rather than a single flat drone.
 *
 * The 180-character default is a speech-rate budget, not a style choice: at the
 * synthesiser's usual ~150 words per minute that is roughly twelve seconds,
 * which leaves headroom under Chrome's cut-off. At 240 characters a chunk ran
 * to about sixteen seconds and the tail of long answers was being dropped.
 *
 * Chunks are capped as well: an over-long "sentence" (a table row, a run with
 * no punctuation) is broken on word boundaries instead of being handed over
 * whole and clipped.
 */
export const chunkForSpeech = (text: string, maxChars = 180): string[] => {
  if (!text) return [];

  const sentences = text.match(/[^.!?…]+[.!?…]+["'”’)\]]*\s*|[^.!?…]+$/g) ?? [text];

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;

    if (current && (current + ' ' + piece).length > maxChars) {
      chunks.push(current.trim());
      current = '';
    }

    if (piece.length > maxChars) {
      // No usable punctuation — break on words so nothing gets clipped.
      const words = piece.split(' ');
      let partial = '';
      for (const word of words) {
        if (partial && (partial + ' ' + word).length > maxChars) {
          chunks.push(partial.trim());
          partial = '';
        }
        partial += (partial ? ' ' : '') + word;
      }
      current = partial;
    } else {
      current += (current ? ' ' : '') + piece;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

/**
 * How long to let a chunk have before advancing the queue without `onend`.
 *
 * Sized from the chunk's word count at the synthesiser's usual ~150 words per
 * minute, with a quarter again as slack for a slow engine or a late first word,
 * and a floor for an utterance the engine never starts at all.
 *
 * Advancing early is safe — `speechSynthesis.speak()` queues rather than
 * interrupts, so the next chunk waits its turn instead of talking over this
 * one. Missing the deadline is not: the rest of the reply is never heard.
 */
export const speechDeadlineMs = (text: string, rate: number): number => {
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordsPerSecond = 2.5 * Math.max(rate, 0.1);
  const estimate = (words / wordsPerSecond) * 1000;
  return Math.max(estimate * 1.25 + 1500, 4000);
};

/* ── Hook ────────────────────────────────────────────────────────────────── */

export const useTextToSpeech = (options: TextToSpeechOptions = {}) => {
  const [state, setState] = useState<TextToSpeechState>({
    isSpeaking: false,
    isSupported: false,
    error: null,
    currentVoice: null,
    availableVoices: [],
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Chunks for the reply currently being read, and how far through we are.
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef(0);
  // Guards against a new reply racing an old reply's cancel-and-speak pair.
  const speakTokenRef = useRef(0);
  // Chrome drops an utterance that is spoken in the same tick as cancel().
  const startTimerRef = useRef<number | null>(null);
  // Per-chunk timer that advances the queue when `onend` never arrives.
  const watchdogRef = useRef<number | null>(null);

  const {
    voice: preferredVoice,
    rate = 1,
    pitch = 1,
    volume = 1,
    lang = 'en-US',
  } = options;

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      setState(prev => ({
        ...prev,
        availableVoices: voices,
        // Rank rather than take list order. An explicit `voice` option still
        // wins, and is resolved in speak().
        currentVoice: pickBestVoice(voices, lang) ?? prev.currentVoice,
      }));
    };

    loadVoices();

    // `addEventListener` rather than assigning `onvoiceschanged`, which would
    // clobber any handler something else on the page had already installed.
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    // Chrome and Safari populate the list asynchronously and can fire
    // `voiceschanged` before this effect runs, so poll briefly as well.
    const attempts = [120, 400, 900, 1800];
    const timers = attempts.map(ms => window.setTimeout(loadVoices, ms));

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      timers.forEach(clearTimeout);
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang]);

  /** Resolve the voice for this utterance: explicit option, then ranked pick. */
  const resolveVoice = useCallback(
    (overrideVoice?: string): SpeechSynthesisVoice | null => {
      const { availableVoices, currentVoice } = state;
      if (overrideVoice || preferredVoice) {
        const wanted = overrideVoice ?? preferredVoice!;
        const byName = availableVoices.find(v => v.name === wanted);
        if (byName) return byName;
      }
      return currentVoice ?? pickBestVoice(availableVoices, lang);
    },
    [state.availableVoices, state.currentVoice, preferredVoice, lang]
  );

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  /** Speak one chunk, then advance to the next on completion. */
  const speakChunk = useCallback(
    (token: number) => {
      if (token !== speakTokenRef.current) return;

      const chunk = queueRef.current[queueIndexRef.current];
      if (chunk === undefined) {
        queueRef.current = [];
        queueIndexRef.current = 0;
        setState(prev => ({ ...prev, isSpeaking: false }));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utteranceRef.current = utterance;

      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = lang;

      const voice = resolveVoice();
      if (voice) {
        utterance.voice = voice;
        // Adopt the voice's language only when it is the same language family
        // as the content. Copying `voice.lang` unconditionally meant that
        // choosing an Italian voice from the picker handed an English answer
        // to an Italian synthesiser, which is unintelligible rather than merely
        // accented.
        const voiceFamily = voice.lang.replace('_', '-').split('-')[0].toLowerCase();
        if (voiceFamily === lang.split('-')[0].toLowerCase()) {
          utterance.lang = voice.lang || lang;
        }
      }

      // `onend` is the normal way on to the next chunk, but it is not reliable.
      // When Chrome throttles speech in a background tab it keeps reporting
      // `speaking === true` and then simply never fires the event, so every
      // chunk after the first went unheard — the reply was silently truncated
      // to its opening sentence.
      //
      // The fix is a deadline rather than a check on `speaking`. That sounds
      // risky — advancing while audio is still in flight sounds like it would
      // talk over itself — but `speechSynthesis.speak()` appends to a queue and
      // never interrupts what is playing. Handing over the next chunk early
      // therefore cannot cause overlap or a clipped word; the engine just
      // reaches it in order once it has finished. And trusting `speaking`
      // instead would defeat the whole point, since that is precisely the flag
      // that stays stuck high in the failure this exists to cover.
      let settled = false;
      const advance = () => {
        if (settled) return;
        settled = true;
        clearWatchdog();
        if (token !== speakTokenRef.current) return;
        queueIndexRef.current += 1;
        speakChunk(token);
      };

      // Slack over the estimate covers a slow engine and a late first word;
      // the floor covers an utterance the engine never starts at all.
      watchdogRef.current = window.setTimeout(advance, speechDeadlineMs(chunk, rate));

      utterance.onstart = () => {
        setState(prev => ({ ...prev, isSpeaking: true, error: null }));
      };

      utterance.onend = advance;

      utterance.onerror = (event: any) => {
        // A stale token means this reply was deliberately superseded or
        // stopped, and `stop()`/`speak()` have already tidied up.
        if (token !== speakTokenRef.current) return;

        if (event.error === 'canceled' || event.error === 'interrupted') {
          // Not something this hook asked for: another cancel() reached the
          // engine, or the OS interrupted playback mid-utterance. Discarding
          // the rest of the queue here turned a momentary glitch into a reply
          // that stopped mid-sentence, so carry on to the next chunk instead.
          advance();
          return;
        }

        clearWatchdog();
        queueRef.current = [];
        queueIndexRef.current = 0;
        setState(prev => ({
          ...prev,
          isSpeaking: false,
          error:
            event.error === 'not-allowed'
              ? 'Speech synthesis permission was denied'
              : `Error: ${event.error}`,
        }));
      };

      window.speechSynthesis.speak(utterance);
    },
    [rate, pitch, volume, lang, resolveVoice, clearWatchdog]
  );

  const speak = useCallback(
    (text: string, overrideOptions?: TextToSpeechOptions) => {
      if (!state.isSupported) {
        setState(prev => ({
          ...prev,
          error: 'Text-to-speech is not supported in this browser',
        }));
        return;
      }

      if (!text.trim()) return;

      // Stop whatever is playing and invalidate its queue.
      speakTokenRef.current += 1;
      const token = speakTokenRef.current;
      clearWatchdog();
      window.speechSynthesis.cancel();
      if (startTimerRef.current !== null) {
        clearTimeout(startTimerRef.current);
      }

      const clean = stripMarkdownForSpeech(text);
      const chunks = chunkForSpeech(clean);
      if (chunks.length === 0) return;

      queueRef.current = chunks;
      queueIndexRef.current = 0;

      // Chrome/Safari silently discard an utterance queued in the same tick as
      // a cancel(), so the first chunk waits a beat. Without this the very
      // first reply after switching voice mode on is simply not spoken.
      startTimerRef.current = window.setTimeout(() => {
        startTimerRef.current = null;
        speakChunk(token);
      }, 60);
    },
    [state.isSupported, speakChunk, clearWatchdog]
  );

  const stop = useCallback(() => {
    // Invalidate first, so the in-flight chunk's onend cannot advance the queue.
    speakTokenRef.current += 1;
    queueRef.current = [];
    queueIndexRef.current = 0;
    clearWatchdog();
    if (startTimerRef.current !== null) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    window.speechSynthesis.cancel();
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, [clearWatchdog]);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, []);

  const setVoice = useCallback(
    (voiceName: string) => {
      setState(prev => {
        const voice = prev.availableVoices.find(v => v.name === voiceName);
        return voice ? { ...prev, currentVoice: voice } : prev;
      });
    },
    []
  );

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    setVoice,
  };
};