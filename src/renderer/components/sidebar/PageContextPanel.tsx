// ═══ PAGE CONTEXT PANEL ═══
// Display current page info and send AI action requests

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Languages,
  Code2,
  Sparkles,
  Loader2,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { type Tab, type ChatMessage, type PageInfo } from '../../../shared/types';
import { SYSTEM_PROMPT } from '../../../shared/constants';

// ── Types ───────────────────────────────────────────────────

interface PageContextPanelProps {
  activeTab: Tab | null;
}

interface StreamChunkData {
  chunk: string;
  done: boolean;
}

// ── Component ───────────────────────────────────────────────

export default function PageContextPanel({ activeTab }: PageContextPanelProps) {
  // ── State ─────────────────────────────────────────────────
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionResult, setActionResult] = useState<string>('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // ── Load model config ─────────────────────────────────────

  useEffect(() => {
    window.electronAPI.ollama
      .getConfig()
      .then((config) => {
        if (config.model) {
          setSelectedModel(config.model);
        }
      })
      .catch(() => {});
  }, []);

  // ── Fetch page info when tab changes ──────────────────────

  useEffect(() => {
    const fetchPageInfo = async () => {
      if (!activeTab) {
        setPageInfo(null);
        return;
      }

      try {
        const info = await window.electronAPI.page.getInfo();
        setPageInfo(info);
        setActionResult('');
        setActiveAction(null);
      } catch (error) {
        console.error('[PageContext] Failed to get page info:', error);
        // Fall back to activeTab data
        setPageInfo({
          title: activeTab.title,
          url: activeTab.url,
          content: '',
        });
      }
    };

    fetchPageInfo();
  }, [activeTab]);

  // ── Send AI action ────────────────────────────────────────

  const sendAIAction = useCallback(
    async (action: string, prompt: string) => {
      if (!selectedModel) {
        setActionResult(
          '⚠ No model selected. Configure a model in Settings or the AI panel first.'
        );
        return;
      }

      setIsLoading(true);
      setActionResult('');
      setActiveAction(action);

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
          timestamp: Date.now(),
        },
        {
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
        },
      ];

      let resultText = '';

      // Setup stream listener
      window.electronAPI.ollama.onStreamChunk((data: StreamChunkData) => {
        if (data.done) {
          setIsLoading(false);
          setActionResult(resultText);
          return;
        }
        resultText += data.chunk;
        setActionResult(resultText);
      });

      try {
        await window.electronAPI.ollama.chat(messages, selectedModel);
      } catch (error) {
        console.error('[PageContext] AI action error:', error);
        setIsLoading(false);
        setActionResult(
          '[ERROR] Failed to commune with the Machine Spirit. Ensure Ollama is running.'
        );
      }
    },
    [selectedModel, pageInfo]
  );

  // ── Action handlers ───────────────────────────────────────

  const handleSummarize = () => {
    if (!pageInfo) return;
    const prompt = `Проанализируй страницу и дай краткое содержание (2-3 абзаца):

**Название:** ${pageInfo.title}
**URL:** ${pageInfo.url}

**Содержимое:**
${pageInfo.content?.slice(0, 8000) || 'No content extracted'}

Ответь на языке оригинала страницы.`;

    sendAIAction('summarize', prompt);
  };

  const handleTranslate = () => {
    if (!pageInfo) return;
    const prompt = `Переведи заголовок и краткое содержание этой страницы на русский язык:

**Название:** ${pageInfo.title}
**URL:** ${pageInfo.url}

**Содержимое:**
${pageInfo.content?.slice(0, 8000) || 'No content extracted'}

Сначала дай перевод заголовка, затем краткое содержание.`;

    sendAIAction('translate', prompt);
  };

  const handleAnalyzeCode = () => {
    if (!pageInfo) return;
    const prompt = `Проанализируй код или техническое содержимое этой страницы:

**Название:** ${pageInfo.title}
**URL:** ${pageInfo.url}

**Содержимое:**
${pageInfo.content?.slice(0, 8000) || 'No content extracted'}

Если это код:
1. Определи язык программирования
2. Объясни, что делает код
3. Укажи потенциальные проблемы или улучшения

Если это не код, кратко объясни техническую суть.`;

    sendAIAction('analyze', prompt);
  };

  // ── Render ────────────────────────────────────────────────

  if (!activeTab) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px 20px',
          gap: '16px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          color: 'var(--parchment-dim)',
        }}
      >
        <AlertTriangle size={32} style={{ color: 'var(--omnissiah-red-dim)' }} />
        <div>
          <div
            style={{
              color: 'var(--parchment-dim)',
              marginBottom: '8px',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            No Active Page
          </div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            Open a tab to access page analysis functions
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        gap: '12px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="mech-header">
        <FileText size={14} style={{ color: 'var(--cogitator-gold)' }} />
        <span>Page Analysis</span>
      </div>

      {/* Page Info Card */}
      <div
        className="mech-panel"
        style={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Page Title */}
        <div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              marginBottom: '4px',
            }}
          >
            Title
          </div>
          <div
            style={{
              color: 'var(--sacred-white)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'bold',
              lineHeight: 1.4,
              wordBreak: 'break-word' as const,
            }}
          >
            {pageInfo?.title || activeTab.title || 'Untitled'}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--iron-gray)' }} />

        {/* Page URL */}
        <div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              marginBottom: '4px',
            }}
          >
            URL
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--noosphere-cyan)',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-mono)',
              wordBreak: 'break-all' as const,
            }}
          >
            <Globe size={12} />
            <span>{pageInfo?.url || activeTab.url}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--iron-gray)' }} />

        {/* Content length indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>
            Content:{' '}
            <span style={{ color: 'var(--parchment)' }}>
              {pageInfo?.content
                ? `${pageInfo.content.length.toLocaleString()} chars`
                : '—'}
            </span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            marginBottom: '4px',
          }}
        >
          Actions
        </div>

        {/* Summarize */}
        <button
          onClick={handleSummarize}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background:
              activeAction === 'summarize'
                ? 'rgba(200, 168, 75, 0.1)'
                : 'var(--iron-dark)',
            border: '1px solid',
            borderColor:
              activeAction === 'summarize'
                ? 'var(--cogitator-gold)'
                : 'var(--iron-gray)',
            color: 'var(--parchment)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
              e.currentTarget.style.boxShadow = 'var(--glow-gold)';
              e.currentTarget.style.color = 'var(--sacred-white)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeAction !== 'summarize') {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.color = 'var(--parchment)';
            }
          }}
        >
          <Sparkles
            size={16}
            style={{
              color: 'var(--cogitator-gold)',
              flexShrink: 0,
            }}
          />
          <div>
            <div>summarize</div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '10px',
                textTransform: 'none' as const,
                letterSpacing: 'normal',
              }}
            >
              Extract key points from page
            </div>
          </div>
        </button>

        {/* Translate */}
        <button
          onClick={handleTranslate}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background:
              activeAction === 'translate'
                ? 'rgba(0, 191, 191, 0.1)'
                : 'var(--iron-dark)',
            border: '1px solid',
            borderColor:
              activeAction === 'translate'
                ? 'var(--noosphere-cyan)'
                : 'var(--iron-gray)',
            color: 'var(--parchment)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
              e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
              e.currentTarget.style.color = 'var(--sacred-white)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeAction !== 'translate') {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.color = 'var(--parchment)';
            }
          }}
        >
          <Languages
            size={16}
            style={{
              color: 'var(--noosphere-cyan)',
              flexShrink: 0,
            }}
          />
          <div>
            <div>translate</div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '10px',
                textTransform: 'none' as const,
                letterSpacing: 'normal',
              }}
            >
              Translate content to Russian
            </div>
          </div>
        </button>

        {/* Analyze Code */}
        <button
          onClick={handleAnalyzeCode}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background:
              activeAction === 'analyze'
                ? 'rgba(255, 0, 0, 0.1)'
                : 'var(--iron-dark)',
            border: '1px solid',
            borderColor:
              activeAction === 'analyze'
                ? 'var(--omnissiah-red)'
                : 'var(--iron-gray)',
            color: 'var(--parchment)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
              e.currentTarget.style.color = 'var(--sacred-white)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeAction !== 'analyze') {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.color = 'var(--parchment)';
            }
          }}
        >
          <Code2
            size={16}
            style={{
              color: 'var(--omnissiah-red)',
              flexShrink: 0,
            }}
          />
          <div>
            <div>analyze code</div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '10px',
                textTransform: 'none' as const,
                letterSpacing: 'normal',
              }}
            >
              Explain code and suggest fixes
            </div>
          </div>
        </button>
      </div>

      {/* Divider */}
      {actionResult && (
        <div
          className="mech-divider"
          style={{ fontSize: 'var(--font-size-xs)' }}
        >
          <span style={{ color: 'var(--steel-gray)' }}>◈</span>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !actionResult && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '40px 20px',
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <Loader2 size={24} className="loading-cog" />
          <span>Communing with the Machine Spirit...</span>
        </div>
      )}

      {/* Action Result */}
      {(actionResult || isLoading) && (
        <div
          className="mech-panel"
          style={{
            padding: '12px',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {/* Result header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: 'var(--cogitator-gold)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
            }}
          >
            {isLoading && <Loader2 size={12} className="loading-cog" />}
            <span>
              {activeAction === 'summarize' && 'Summary'}
              {activeAction === 'translate' && 'Translation'}
              {activeAction === 'analyze' && 'Code Analysis'}
            </span>
          </div>

          {/* Result content */}
          <div
            className="terminal-message"
            style={{
              color: 'var(--sacred-white)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word' as const,
            }}
          >
            {actionResult || (
              <span style={{ color: 'var(--parchment-dim)' }}>
                Awaiting response from the Noosphere...
              </span>
            )}
            {isLoading && (
              <span
                style={{
                  color: 'var(--omnissiah-red)',
                  marginLeft: '2px',
                  animation: 'cursorBlink 1s step-end infinite',
                }}
              >
                ▌
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
