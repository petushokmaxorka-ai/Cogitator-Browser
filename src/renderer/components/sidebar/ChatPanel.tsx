// ═══ CHAT PANEL ═══
// Main AI chat interface with streaming responses

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { type ChatMessage } from '../../../shared/types';
import { ANATHEMETRON_GREETING, SYSTEM_PROMPT, DEFAULT_ANATHEMETRON_MODEL } from '../../../shared/constants';
import Message from './Message';
import ModelSelector from './ModelSelector';
import { onChatPrefill } from '../../lib/chat-bridge';

// ── Types ───────────────────────────────────────────────────

interface StreamChunkData {
  chunk: string;
  done: boolean;
}

// ── Component ───────────────────────────────────────────────

export default function ChatPanel() {
  // ── State ─────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [mensOnline, setMensOnline] = useState<boolean>(false);
  const [mindPulse, setMindPulse] = useState<{
    available: boolean;
    mood: string;
    energy: number | null;
    lifeRunning: boolean;
    lastThoughtAgeSec: number | null;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamListenerRef = useRef<(() => void) | null>(null);
  // Guard against re-entrant sends (double-click / Enter while streaming)
  const sendingRef = useRef<boolean>(false);

  // ── Initialize greeting ───────────────────────────────────

  useEffect(() => {
    const greetingMsg: ChatMessage = {
      role: 'assistant',
      content: ANATHEMETRON_GREETING,
      timestamp: Date.now(),
    };
    setMessages([greetingMsg]);

    // Load saved model from config
    window.electronAPI.ollama
      .getConfig()
      .then((config) => {
        if (config.model) {
          setSelectedModel(config.model);
        } else {
          setSelectedModel(DEFAULT_ANATHEMETRON_MODEL);
        }
      })
      .catch((err) => {
        console.warn('[ChatPanel] Failed to load config:', err);
      });

    const pollMens = () => {
      window.electronAPI.mens?.checkStatus?.().then(setMensOnline).catch(() => setMensOnline(false));
    };
    const pollPulse = () => {
      window.electronAPI.mind?.getPulse?.().then(setMindPulse).catch(() => setMindPulse(null));
    };
    pollMens();
    pollPulse();
    const mensInterval = setInterval(pollMens, 15000);
    const pulseInterval = setInterval(pollPulse, 12000);
    return () => {
      clearInterval(mensInterval);
      clearInterval(pulseInterval);
    };
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auto-resize textarea ──────────────────────────────────

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 100); // max 4 lines ~100px
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // ── Stream listener: register ONCE on mount, not per-send ──
  // Previously this was re-registered inside sendText(), causing every
  // click to stack another listener and duplicate responses (1st=x1,
  // 2nd=x2, 3rd=x3 ...). The callback uses functional setMessages so it
  // never goes stale — it always mutates the last assistant message.

  useEffect(() => {
    const unsubscribe = window.electronAPI.ollama.onStreamChunk((data: StreamChunkData) => {
      if (data.done) {
        setIsLoading(false);
        sendingRef.current = false; // release double-click guard when stream ends
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && last.isStreaming) {
            return [...prev.slice(0, -1), { ...last, isStreaming: false }];
          }
          return prev;
        });
        return;
      }

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          const updated: ChatMessage = {
            ...last,
            content: last.content + data.chunk,
          };
          return [...prev.slice(0, -1), updated];
        }
        return prev;
      });
    });
    streamListenerRef.current = unsubscribe;
    return () => {
      unsubscribe();
      streamListenerRef.current = null;
      window.electronAPI.ollama.abort().catch(() => {});
    };
  }, []);

  // ── Send message ──────────────────────────────────────────

  const sendText = useCallback(
    async (rawText: string, options?: { clearInput?: boolean }) => {
      const userText = rawText.trim();
      if (!userText || isLoading) return;
      if (sendingRef.current) return; // double-click / Enter guard
      sendingRef.current = true;
      if (!selectedModel) {
        const sysMsg: ChatMessage = {
          role: 'system',
          content: '⚠ No model selected. Choose a model from the dropdown above.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, sysMsg]);
        return;
      }

      const userMsg: ChatMessage = {
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (options?.clearInput !== false) {
        setInput('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
      setIsLoading(true);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const historyForOllama: ChatMessage[] = [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
          timestamp: Date.now(),
        },
        ...[...messages, userMsg]
          .filter((m) => m.role !== 'system')
          .slice(-10),
      ];

      // Stream listener is registered once on mount (see useEffect above).
      // It appends chunks to the last assistant message and clears isLoading
      // on done. No per-send registration — that caused duplicate responses.

      try {
        await window.electronAPI.ollama.chat(historyForOllama, selectedModel);
      } catch (error) {
        console.error('[ChatPanel] Chat error:', error);
        setIsLoading(false);
        sendingRef.current = false; // release guard on error too
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                content:
                  last.content +
                  '\n\n[ERROR] Connection to Machine Spirit severed. The sacred link could not be established.',
                isStreaming: false,
              },
            ];
          }
          return prev;
        });
      }
    },
    [isLoading, selectedModel, messages],
  );

  const handleSend = useCallback(async () => {
    await sendText(input, { clearInput: true });
  }, [input, sendText]);

  useEffect(() => {
    return onChatPrefill(({ query, autoSend }) => {
      if (autoSend) {
        void sendText(query, { clearInput: false });
        return;
      }
      setInput(query);
      textareaRef.current?.focus();
    });
  }, [sendText]);

  // ── Keyboard handler ──────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Quick actions ─────────────────────────────────────────

  const handleClearChat = () => {
    const greetingMsg: ChatMessage = {
      role: 'assistant',
      content: ANATHEMETRON_GREETING,
      timestamp: Date.now(),
    };
    setMessages([greetingMsg]);
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Model Selector */}
      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
      <div
        style={{
          padding: '4px 12px',
          fontSize: '10px',
          fontFamily: 'monospace',
          color: mensOnline ? '#00BFBF' : '#888',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span>Mens {mensOnline ? '● bibliotheca linked' : '○ offline — local brain only'}</span>
        {mindPulse?.available && (
          <span style={{ color: '#C8A84B' }}>
            Pulse ● mood {mindPulse.mood}
            {mindPulse.energy !== null ? ` · energy ${Math.round(mindPulse.energy * 100)}%` : ''}
            {mindPulse.lifeRunning ? ' · life cycle on' : ''}
            {mindPulse.lastThoughtAgeSec !== null
              ? ` · last thought ${mindPulse.lastThoughtAgeSec < 120 ? 'now' : `${Math.floor(mindPulse.lastThoughtAgeSec / 60)}m ago`}`
              : ''}
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((msg, index) => (
          <Message
            key={`${msg.timestamp}-${index}`}
            message={msg}
            isLast={index === messages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: '1px solid var(--iron-gray)',
          padding: '10px 12px',
          background: 'var(--iron-dark)',
          flexShrink: 0,
        }}
      >
        {/* Quick actions row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
            }}
          >
            Inquiry Terminal
          </span>
          <button
            onClick={handleClearChat}
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--parchment-dim)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--omnissiah-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
          >
            Clear
          </button>
        </div>

        {/* Input row */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter inquiry..."
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              padding: '8px 10px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.5,
              outline: 'none',
              minHeight: '36px',
              maxHeight: '100px',
              overflowY: 'auto',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {/* Transmit Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: isLoading
                ? 'var(--iron-gray)'
                : 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))',
              border: '1px solid var(--omnissiah-red)',
              color: isLoading ? 'var(--text-muted)' : 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              height: '36px',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="loading-cog" />
                <span>Processing</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Transmit</span>
              </>
            )}
          </button>
        </div>

        {/* Hint text */}
        <div
          style={{
            marginTop: '6px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
