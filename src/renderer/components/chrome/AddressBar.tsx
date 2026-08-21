// ═══ ADDRESS BAR ═══
// URL input with Noosphere indicator, AI toggle, Bookmark star, Reader Mode,
// and Smart Omnibox Quick Answers (calculator, currency, timer, etc.).
// Where the sacred addresses of the Machine God are entered.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Cog, Star, BookOpen, Copy, Check, Mic, MicOff, Columns, Bookmark, Camera, PictureInPicture } from 'lucide-react';
import { useQuickAnswer, type QuickAnswer } from '../../hooks/useQuickAnswer';
import Tooltip from '../ui/Tooltip';

// ── Types ──────────────────────────────────────────────────
interface AddressBarProps {
  url: string;
  title: string;
  favicon: string;
  onNavigate: (url: string) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isReadable?: boolean;
  onToggleReaderMode?: () => void;
  readerModeActive?: boolean;
  onVoiceSearch?: () => void;
  isVoiceListening?: boolean;
  voiceTranscript?: string;
  voiceSupported?: boolean;
  // ═══ Bookmark Tree Toggle ═══
  bookmarkTreeOpen?: boolean;
  onToggleBookmarkTree?: () => void;
  // ═══ Split View Toggle ═══
  splitViewEnabled?: boolean;
  onToggleSplitView?: () => void;
  // ═══ Screenshot Tool ═══
  onScreenshot?: () => void;
  // ═══ PiP Toggle ═══
  pipActive?: boolean;
  pipAvailable?: boolean;
  onTogglePiP?: () => void;
  /** Open Chat sidebar with omnibox AI query; autoSend=false prefills only */
  onOpenAiChat?: (query: string, autoSend?: boolean) => void;
}

// ── Quick Answer Type Labels ───────────────────────────────

const QUICK_ANSWER_LABELS: Record<string, { label: string; icon: string }> = {
  calculator: { label: 'CALC', icon: '\u03A3' },
  currency: { label: 'FX', icon: '\u0024' },
  unit: { label: 'UNIT', icon: '\u{1F4CF}' },
  timer: { label: 'TIMER', icon: '\u23F1' },
  weather: { label: 'WX', icon: '\u2600' },
  random: { label: 'RAND', icon: '\u{1F3B2}' },
  hash: { label: 'HASH', icon: '\u{1F510}' },
  base64: { label: 'B64', icon: '\u{1F4DD}' },
  ip: { label: 'IP', icon: '\u{1F4E1}' },
  whois: { label: 'WHOIS', icon: '\u{1F50E}' },
  timezone: { label: 'TIME', icon: '\u{1F550}' },
  define: { label: 'DEF', icon: '\u{1F4D6}' },
  ai: { label: 'AI', icon: '\u25C9' },
};

// ── Component ──────────────────────────────────────────────
const AddressBar: React.FC<AddressBarProps> = ({
  url,
  title: _title,
  favicon: _favicon,
  onNavigate,
  onToggleSidebar,
  sidebarOpen,
  isBookmarked,
  onToggleBookmark,
  isReadable = false,
  onToggleReaderMode,
  readerModeActive = false,
  onVoiceSearch,
  isVoiceListening = false,
  voiceTranscript = '',
  voiceSupported = false,
  bookmarkTreeOpen = false,
  onToggleBookmarkTree,
  splitViewEnabled = false,
  onToggleSplitView,
  onScreenshot,
  pipActive = false,
  pipAvailable = false,
  onTogglePiP,
  onOpenAiChat,
}) => {
  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Quick answer detection hook
  const { answer, detect, setAnswer, isComputing, copyResult } = useQuickAnswer();

  // Show dropdown when we have a quick answer and input is focused
  const showDropdown = isFocused && !!answer && inputValue.trim().length > 1;
  const answerPending =
    isComputing ||
    answer?.result === 'Computing...' ||
    answer?.result === 'Загрузка…';

  const isAiAnswer = answer?.type === 'ai';
  const aiPrompt = isAiAnswer ? answer.detail ?? '' : '';

  const aiSyncRef = useRef<string>('');

  const openAiInSidebar = useCallback(
    (autoSend = true) => {
      if (!aiPrompt || !onOpenAiChat) return;
      onOpenAiChat(aiPrompt, autoSend);
      if (autoSend) {
        setAnswer(null);
        inputRef.current?.blur();
      }
    },
    [aiPrompt, onOpenAiChat, setAnswer],
  );

  // Omnibox AI → sidebar prefill (unified chat-bridge)
  useEffect(() => {
    if (!isFocused || answer?.type !== 'ai' || !answer.detail || !onOpenAiChat) return;
    const prompt = answer.detail;
    if (aiSyncRef.current === prompt) return;
    const timer = window.setTimeout(() => {
      aiSyncRef.current = prompt;
      onOpenAiChat(prompt, false);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [answer, isFocused, onOpenAiChat]);

  useEffect(() => {
    if (!isFocused) {
      aiSyncRef.current = '';
    }
  }, [isFocused]);

  // Sync input value when URL changes externally
  useEffect(() => {
    if (!isFocused) {
      setInputValue(url);
      setAnswer(null);
    }
  }, [url, isFocused, setAnswer]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Quick Answer Detection ───────────────────────────────

  // Detect quick answers when input changes
  useEffect(() => {
    if (inputValue.trim().length > 1) {
      detect(inputValue);
    } else {
      setAnswer(null);
    }
  }, [inputValue, detect, setAnswer]);

  // ── Voice Search: update input with transcript ──────────
  useEffect(() => {
    if (voiceTranscript && isVoiceListening) {
      setInputValue(voiceTranscript);
    }
  }, [voiceTranscript, isVoiceListening]);

  // ── Handlers ─────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // If we have a quick answer, copy result and optionally navigate
      if (answer?.result && !answerPending) {
        copyResult().then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });

        if (answer.type === 'ai') {
          openAiInSidebar(true);
          return;
        }

        // For timer, weather, whois, ip — just copy, don't navigate
        if (answer.type === 'timer' || answer.type === 'weather' || answer.type === 'ip' || answer.type === 'whois' || answer.type === 'timezone' || answer.type === 'define' || answer.type === 'unit') {
          return;
        }

        // For others, also navigate to show result
        // (continue to normal submit)
      }

      if (inputValue.trim()) {
        onNavigate(inputValue.trim());
        inputRef.current?.blur();
        setAnswer(null);
      }
    },
    [inputValue, onNavigate, answer, answerPending, copyResult, setAnswer, openAiInSidebar]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInputValue(url);
        setAnswer(null);
        inputRef.current?.blur();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (answer && !answerPending) {
          copyResult().then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });

          if (answer.type === 'ai') {
            openAiInSidebar(true);
            return;
          }

          // For non-copy-only types, also navigate
          if (answer.type !== 'timer' && answer.type !== 'weather' && answer.type !== 'ip' && answer.type !== 'whois' && answer.type !== 'timezone' && answer.type !== 'define' && answer.type !== 'unit') {
            onNavigate(inputValue.trim());
            inputRef.current?.blur();
            setAnswer(null);
          }
        } else {
          // Normal navigation when no quick answer
          onNavigate(inputValue.trim());
          inputRef.current?.blur();
          setAnswer(null);
        }
      }
    },
    [url, answer, answerPending, copyResult, onNavigate, inputValue, setAnswer, openAiInSidebar]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Select all text on focus
    inputRef.current?.select();
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't blur if clicking inside the dropdown
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    setInputValue(url);
    // Delay clearing answer to allow click events
    setTimeout(() => setAnswer(null), 200);
  }, [url, setAnswer]);

  const handleCopyResult = useCallback(async () => {
    const success = await copyResult();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyResult]);

  const handleApplyResult = useCallback(() => {
    if (answer?.result && answer.result !== 'Computing...') {
      setInputValue(answer.result);
      setAnswer(null);
      // Focus back on input
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [answer, setAnswer]);

  // ── Render ───────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className={[
        'flex items-center flex-1 gap-0',
        'h-9 mx-1',
        'bg-[var(--void-black)]',
        'border',
        isFocused
          ? 'border-[var(--cogitator-gold)] shadow-[0_0_8px_rgba(200,168,110,0.3),inset_0_0_4px_rgba(200,168,110,0.08)]'
          : 'border-[var(--cogitator-gold-dim)]',
        'transition-all duration-150',
        'relative',
      ].join(' ')}
      style={{ zIndex: showDropdown ? 100 : undefined }}
    >
      {/* Noosphere globe icon */}
      <div className="flex items-center justify-center w-8 h-full flex-shrink-0">
        <Globe
          size={14}
          strokeWidth={1.5}
          className="text-[var(--noosphere-cyan)]"
        />
      </div>

      {/* PDF Document Indicator */}
      {url.endsWith('.pdf') || url.includes('.pdf?') ? (
        <div
          className={[
            'flex-1 h-full flex items-center',
            'font-mono text-[12px]',
            'text-[var(--cogitator-gold)]',
            'overflow-hidden',
          ].join(' ')}
        >
          <span style={{ marginRight: 6, fontSize: 14 }}>📄</span>
          <span
            style={{
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: 10,
              textShadow: '0 0 6px rgba(200, 168, 75, 0.3)',
            }}
          >
            PDF Document — {(() => {
              try {
                const fileName = new URL(url).pathname.split('/').pop() || '';
                return decodeURIComponent(fileName);
              } catch {
                return url;
              }
            })()}
          </span>
        </div>
      ) : (
        /* URL Input */
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Enter the Noosphere… (? вопрос — Anathemetron)"
          className={[
            'flex-1 h-full',
            'bg-transparent',
            'text-[var(--sacred-white)]',
            'font-mono text-[12px]',
            'placeholder:text-[var(--text-muted)]',
            'focus:outline-none',
          ].join(' ')}
          spellCheck={false}
          autoComplete="off"
        />
      )}

      {/* Security/Protocol indicator */}
      {url.startsWith('https://') && !isFocused && (
        <div className="flex items-center gap-1 pr-2 flex-shrink-0">
          <span className="text-[9px] font-mono text-[var(--noosphere-cyan)] uppercase tracking-wider">
            Secure
          </span>
        </div>
      )}

      {/* Reader Mode Toggle \u2014 visible when page is readable */}
      {isReadable && onToggleReaderMode && (
        <Tooltip
          content={readerModeActive ? 'Close Reader Mode' : 'Reader Mode'}
          position="bottom"
          delay={300}
        >
          <button
            type="button"
            onClick={onToggleReaderMode}
            className={[
              'flex items-center justify-center',
              'h-full px-2',
              'border-l border-[var(--iron-gray)]',
              'transition-all duration-150',
              readerModeActive
                ? 'text-[var(--cogitator-gold)] bg-[rgba(200,168,75,0.05)]'
                : 'text-[var(--text-muted)] hover:text-[var(--cogitator-gold)]',
              'bg-transparent',
              'cursor-pointer',
              'flex-shrink-0',
            ].join(' ')}
          >
            <BookOpen
              size={14}
              strokeWidth={1.5}
              className={readerModeActive ? 'drop-shadow-[0_0_4px_rgba(200,168,75,0.5)]' : ''}
            />
          </button>
        </Tooltip>
      )}

      {/* Bookmark Toggle */}
      <Tooltip
        content={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
        position="bottom"
        delay={300}
      >
        <button
          type="button"
          onClick={onToggleBookmark}
          className={[
            'flex items-center justify-center',
            'h-full px-2',
            'border-l border-[var(--iron-gray)]',
            'transition-all duration-150',
            isBookmarked
              ? 'text-[var(--cogitator-gold)]'
              : 'text-[var(--text-muted)] hover:text-[var(--cogitator-gold)]',
            isBookmarked ? 'drop-shadow-[0_0_4px_rgba(200,168,75,0.5)]' : '',
            'bg-transparent',
            'cursor-pointer',
            'flex-shrink-0',
          ].join(' ')}
        >
          <Star
            size={14}
            strokeWidth={1.5}
            fill={isBookmarked ? 'var(--cogitator-gold)' : 'none'}
          />
        </button>
      </Tooltip>

      {/* ═══ PiP Toggle ═══ */}
      {pipAvailable && onTogglePiP && (
        <Tooltip
          content={pipActive ? 'Close Picture-in-Picture' : 'Picture-in-Picture'}
          position="bottom"
          delay={300}
        >
          <button
            type="button"
            onClick={onTogglePiP}
            className={[
              'flex items-center justify-center',
              'h-full px-2',
              'border-l border-[var(--iron-gray)]',
              'transition-all duration-150',
              pipActive
                ? 'text-[var(--noosphere-cyan)] bg-[rgba(0,191,191,0.05)]'
                : 'text-[var(--text-muted)] hover:text-[var(--noosphere-cyan)]',
              'bg-transparent',
              'cursor-pointer',
              'flex-shrink-0',
            ].join(' ')}
          >
            <PictureInPicture
              size={14}
              strokeWidth={1.5}
              className={pipActive ? 'drop-shadow-[0_0_4px_rgba(0,191,191,0.5)]' : ''}
            />
          </button>
        </Tooltip>
      )}

      {/* ═══ Screenshot Toggle ═══ */}
      {onScreenshot && (
        <Tooltip
          content="Screenshot (Ctrl+Shift+S)"
          position="bottom"
          delay={300}
        >
          <button
            type="button"
            onClick={onScreenshot}
            className={[
              'flex items-center justify-center',
              'h-full px-2',
              'border-l border-[var(--iron-gray)]',
              'transition-all duration-150',
              'text-[var(--text-muted)] hover:text-[var(--noosphere-cyan)]',
              'bg-transparent',
              'cursor-pointer',
              'flex-shrink-0',
            ].join(' ')}
          >
            <Camera size={14} strokeWidth={1.5} />
          </button>
        </Tooltip>
      )}

      {/* ═══ Voice Search Toggle ═══ */}
      {voiceSupported && onVoiceSearch && (
        <Tooltip
          content={isVoiceListening ? 'Stop Listening' : 'Voice Search'}
          position="bottom"
          delay={300}
        >
          <button
            type="button"
            onClick={onVoiceSearch}
            className={[
              'flex items-center justify-center',
              'h-full px-2',
              'border-l border-[var(--iron-gray)]',
              'transition-all duration-150',
              'bg-transparent',
              'cursor-pointer',
              'flex-shrink-0',
              isVoiceListening
                ? 'text-[var(--omnissiah-red)] animate-pulse'
                : 'text-[var(--text-muted)] hover:text-[var(--noosphere-cyan)]',
            ].join(' ')}
            style={isVoiceListening ? {
              animationDuration: '1s',
              textShadow: '0 0 8px rgba(255, 0, 0, 0.6)',
            } : undefined}
          >
            {isVoiceListening ? (
              <MicOff size={14} strokeWidth={1.5} />
            ) : (
              <Mic size={14} strokeWidth={1.5} />
            )}
          </button>
        </Tooltip>
      )}

      {/* ═══ Split View Toggle ═══ */}
      {onToggleSplitView && (
        <Tooltip
          content={splitViewEnabled ? 'Close Split View' : 'Split View'}
          position="bottom"
          delay={300}
        >
          <button
            type="button"
            onClick={onToggleSplitView}
            className={[
              'flex items-center justify-center',
              'h-full px-2',
              'border-l border-[var(--iron-gray)]',
              'transition-all duration-150',
              splitViewEnabled
                ? 'text-[var(--noosphere-cyan)] bg-[rgba(0,191,191,0.05)]'
                : 'text-[var(--text-muted)] hover:text-[var(--noosphere-cyan)]',
              'bg-transparent',
              'cursor-pointer',
              'flex-shrink-0',
            ].join(' ')}
          >
            <Columns
              size={14}
              strokeWidth={1.5}
              className={splitViewEnabled ? 'drop-shadow-[0_0_4px_rgba(0,191,191,0.5)]' : ''}
            />
          </button>
        </Tooltip>
      )}

      {/* ═══ Bookmark Tree Toggle ═══ */}
      {onToggleBookmarkTree && (
        <Tooltip
          content={bookmarkTreeOpen ? 'Close Library' : 'Library of Forge'}
          position="bottom"
          delay={300}
        >
          <button
            type="button"
            onClick={onToggleBookmarkTree}
            className={[
              'flex items-center justify-center',
              'h-full px-2',
              'border-l border-[var(--iron-gray)]',
              'transition-all duration-150',
              bookmarkTreeOpen
                ? 'text-[var(--cogitator-gold)] bg-[rgba(200,168,75,0.05)]'
                : 'text-[var(--text-muted)] hover:text-[var(--cogitator-gold)]',
              'bg-transparent',
              'cursor-pointer',
              'flex-shrink-0',
            ].join(' ')}
          >
            <Bookmark
              size={14}
              strokeWidth={1.5}
              className={bookmarkTreeOpen ? 'drop-shadow-[0_0_4px_rgba(200,168,75,0.5)]' : ''}
            />
          </button>
        </Tooltip>
      )}

      {/* AI Sidebar Toggle */}
      <Tooltip
        content={sidebarOpen ? 'Close Sidebar' : 'Open AI Sidebar'}
        position="bottom"
        delay={300}
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          className={[
            'flex items-center gap-1',
            'h-full px-2.5',
            'font-mono text-[10px] uppercase tracking-wider',
            'border-l border-[var(--iron-gray)]',
            'transition-all duration-150',
            sidebarOpen
              ? 'text-[var(--omnissiah-red)] bg-[rgba(255,0,0,0.05)] shadow-[inset_0_0_8px_rgba(255,0,0,0.1)]'
              : 'text-[var(--parchment)] hover:text-[var(--omnissiah-red)] hover:bg-[rgba(255,0,0,0.05)]',
          ].join(' ')}
        >
          <Cog
            size={12}
            strokeWidth={1.5}
            className={sidebarOpen ? 'animate-spin' : ''}
            style={
              sidebarOpen
                ? { animationDuration: '3s' }
                : undefined
            }
          />
          <span>AI</span>
        </button>
      </Tooltip>

      {/* ═══ Quick Answer Dropdown ═══ */}
      {showDropdown && answer && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--omnissiah-red)',
            boxShadow: '0 4px 20px rgba(255, 0, 0, 0.15), 0 0 10px rgba(255, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Quick answer header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderBottom: '1px solid var(--iron-gray)',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'var(--cogitator-gold)',
              }}
            >
              {QUICK_ANSWER_LABELS[answer.type]?.icon} {' '}
              {QUICK_ANSWER_LABELS[answer.type]?.label || answer.type}
            </span>
            {answer.detail && (
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--parchment-dim)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {answer.detail}
              </span>
            )}
          </div>

          {/* Result display */}
          <div style={{ padding: '12px 10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontSize: answer.type === 'ai' || answer.result.length > 40 ? 'var(--font-size-xs)' : 'var(--font-size-lg)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'bold',
                  color: 'var(--cogitator-gold)',
                  textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
                  wordBreak: 'break-word',
                  flex: 1,
                  maxHeight: answer.type === 'ai' ? '140px' : undefined,
                  overflowY: answer.type === 'ai' ? 'auto' : undefined,
                  whiteSpace: answer.type === 'ai' ? 'pre-wrap' : undefined,
                }}
              >
                {isComputing && (answer.type === 'hash' || answer.type === 'ai' || answer.result === 'Загрузка…') ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="loading-cog" style={{ fontSize: '12px' }}>\u2699</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--parchment-dim)' }}>
                      {answer.type === 'ai'
                        ? 'Anathemetron думает…'
                        : answer.type === 'hash'
                          ? 'Computing hash...'
                          : 'Запрос…'}
                    </span>
                  </span>
                ) : (
                  answer.result
                )}
              </span>

              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {/* Copy button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopyResult();
                }}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: copied ? 'rgba(0, 191, 191, 0.1)' : 'transparent',
                  border: `1px solid ${copied ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
                  color: copied ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!copied) {
                    e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                    e.currentTarget.style.color = 'var(--cogitator-gold)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copied) {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                  }
                }}
              >
                {copied ? (
                  <>
                    <Check size={10} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={10} />
                    Copy
                  </>
                )}
              </button>

              {/* Open in Chat for AI answers */}
              {answer.type === 'ai' && onOpenAiChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openAiInSidebar(true);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={!aiPrompt}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(255, 0, 0, 0.08)',
                    border: '1px solid var(--omnissiah-red)',
                    color: 'var(--omnissiah-red)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: aiPrompt ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                  }}
                >
                  Chat
                </button>
              )}

              {/* Apply/Use button for applicable types */}
              {(answer.type === 'calculator' || answer.type === 'currency' || answer.type === 'unit' || answer.type === 'base64') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleApplyResult();
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                    e.currentTarget.style.color = 'var(--omnissiah-red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                  }}
                >
                  Use
                </button>
              )}
            </div>
            </div>

            {(answer.type === 'ai' || answer.type === 'whois' || answer.type === 'define') && answer.detail && answer.detail.length > 40 && !answerPending && (
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--parchment-dim)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--iron-gray)',
                }}
              >
                {answer.detail}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div
            style={{
              padding: '4px 10px',
              borderTop: '1px solid var(--iron-gray)',
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {isAiAnswer
              ? 'Enter — копировать и открыть Chat · ? / ai: / // — Anathemetron'
              : 'Enter to copy · Esc to close'}
          </div>
        </div>
      )}
    </form>
  );
};

export default AddressBar;
