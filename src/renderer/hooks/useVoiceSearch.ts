// ═══ VOICE SEARCH HOOK ═══
// Web Speech API integration for voice-driven omnibox navigation.
// Uses the browser's SpeechRecognition API (webkit prefix for Chromium).
// Part of the Dark Mechanicus vocal cogitation interface.

import { useState, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────
export interface VoiceSearchState {
  /** Whether the speech recognizer is currently listening */
  isListening: boolean;
  /** The transcribed speech text */
  transcript: string;
  /** Error message if recognition failed */
  error: string | null;
  /** Whether the SpeechRecognition API is available in this browser */
  supported: boolean;
}

// ── Speech Recognition Error Map ───────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  'no-speech': 'No speech detected — speak louder, tech-priest',
  'audio-capture': 'Audio capture failed — check your vox-caster',
  'not-allowed': 'Microphone access denied — grant permission in Omnissiah settings',
  'network': 'Network error — Noosphere connection lost',
  'aborted': 'Voice search aborted',
  'language-not-supported': 'Language not supported by the Machine Spirit',
};

// ── Hook ───────────────────────────────────────────────────
/**
 * useVoiceSearch — Manages the Web Speech API for voice-driven navigation.
 *
 * Provides:
 * - `startListening()` — Begins speech recognition
 * - `stopListening()` — Stops recognition
 * - `reset()` — Clears transcript and errors
 * - `isListening` — Whether mic is active
 * - `transcript` — Current recognized text
 * - `error` — Any recognition error
 * - `supported` — Whether the API is available
 */
export function useVoiceSearch() {
  const [state, setState] = useState<VoiceSearchState>({
    isListening: false,
    transcript: '',
    error: null,
    supported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
  });

  const recognitionRef = useRef<any>(null);

  // ── Start Listening ────────────────────────────────────
  const startListening = useCallback((lang: string = 'ru-RU') => {
    if (!state.supported) {
      setState((s) => ({ ...s, error: 'Voice search not supported by this cogitator' }));
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors from stopping
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((s) => ({ ...s, error: 'Speech Recognition API unavailable' }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    // ── Event Handlers ───────────────────────────────────
    recognition.onstart = () => {
      setState((s) => ({
        ...s,
        isListening: true,
        error: null,
        transcript: '',
      }));
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setState((s) => ({ ...s, transcript }));
    };

    recognition.onerror = (event: any) => {
      const errorMessage = ERROR_MESSAGES[event.error] || `Speech error: ${event.error}`;
      setState((s) => ({
        ...s,
        isListening: false,
        error: errorMessage,
      }));
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, isListening: false }));
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      setState((s) => ({
        ...s,
        error: `Failed to start: ${err?.message || 'Unknown error'}`,
      }));
    }
  }, [state.supported]);

  // ── Stop Listening ─────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setState((s) => ({ ...s, isListening: false }));
  }, []);

  // ── Reset State ────────────────────────────────────────
  const reset = useCallback(() => {
    // Stop any active recognition before resetting
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setState((s) => ({
      ...s,
      transcript: '',
      error: null,
      isListening: false,
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    reset,
  };
}

// Default export for convenience
export default useVoiceSearch;
