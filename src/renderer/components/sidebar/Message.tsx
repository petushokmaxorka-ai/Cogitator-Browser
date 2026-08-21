// ═══ MESSAGE ═══
// Individual chat message with markdown-like rendering

import { useEffect, useRef } from 'react';
import { type ChatMessage } from '../../../shared/types';

// ── Types ───────────────────────────────────────────────────

interface MessageProps {
  message: ChatMessage;
  isLast: boolean;
}

// ── Helpers: Simple Markdown Parser ─────────────────────────

/**
 * Parse simple markdown: bold, inline code, code blocks, links
 * Returns array of React elements
 */
function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  let keyIdx = 0;

  const getKey = () => `msg-${keyIdx++}`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block start/end (```)
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        result.push(
          <pre
            key={getKey()}
            style={{
              background: 'var(--iron-dark)',
              borderLeft: '2px solid var(--noosphere-cyan)',
              padding: '12px',
              margin: '8px 0',
              overflowX: 'auto' as const,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--sacred-white)',
              lineHeight: 1.5,
            }}
          >
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        // Start code block
        codeBlockLang = line.slice(3).trim();
        if (codeBlockLang) {
          result.push(
            <div
              key={getKey()}
              style={{
                color: 'var(--noosphere-cyan-dim)',
                fontSize: 'var(--font-size-xs)',
                marginTop: '8px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              [{codeBlockLang}]
            </div>
          );
        }
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      result.push(<div key={getKey()} style={{ height: '8px' }} />);
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      result.push(
        <hr
          key={getKey()}
          style={{
            border: 'none',
            borderTop: '1px solid var(--iron-gray)',
            margin: '12px 0',
          }}
        />
      );
      continue;
    }

    // Parse inline formatting on the line
    const parsedLine = parseInlineFormatting(line, getKey);
    result.push(
      <p
        key={getKey()}
        style={{
          margin: '2px 0',
          lineHeight: 1.6,
          wordBreak: 'break-word' as const,
        }}
      >
        {parsedLine}
      </p>
    );
  }

  // If still in code block at end, flush it
  if (inCodeBlock && codeBlockContent.length > 0) {
    result.push(
      <pre
        key={getKey()}
        style={{
          background: 'var(--iron-dark)',
          borderLeft: '2px solid var(--noosphere-cyan)',
          padding: '12px',
          margin: '8px 0',
          overflowX: 'auto' as const,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--sacred-white)',
          lineHeight: 1.5,
        }}
      >
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return result;
}

/**
 * Parse inline: bold **text**, inline `code`, and [links](url)
 */
function parseInlineFormatting(
  text: string,
  getKey: () => string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Combined regex for **bold**, `code`, [text](url)
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      nodes.push(
        <span key={getKey()}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    if (match[1]) {
      // **bold**
      nodes.push(
        <strong
          key={getKey()}
          style={{ color: 'var(--cogitator-gold)', fontWeight: 'bold' }}
        >
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // `inline code`
      nodes.push(
        <code
          key={getKey()}
          style={{
            background: 'rgba(0, 191, 191, 0.1)',
            border: '1px solid rgba(0, 191, 191, 0.2)',
            padding: '1px 4px',
            borderRadius: '2px',
            color: 'var(--noosphere-cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.95em',
          }}
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // [link text](url)
      nodes.push(
        <a
          key={getKey()}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--noosphere-cyan)',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
          onClick={(e) => {
            // Open in browser if electron, otherwise normal
            if (window.electronAPI) {
              e.preventDefault();
                              window.electronAPI.tabs?.create?.(match[7]);
            }
          }}
        >
          {match[6]}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    nodes.push(<span key={getKey()}>{text.slice(lastIndex)}</span>);
  }

  // If no matches at all, return the whole text
  if (nodes.length === 0) {
    return [<span key={getKey()}>{text}</span>];
  }

  return nodes;
}

// ── Component ───────────────────────────────────────────────

export default function Message({ message, isLast }: MessageProps) {
  const isAssistant = message.role === 'assistant';
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.isStreaming && isLast;

  const messageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll streaming messages into view
  useEffect(() => {
    if (isStreaming && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [message.content, isStreaming]);

  // ── Render: System Message ────────────────────────────────
  if (isSystem) {
    return (
      <div
        ref={messageRef}
        style={{
          borderLeft: '2px solid var(--omnissiah-red)',
          paddingLeft: '12px',
          margin: '8px 0',
          color: 'var(--parchment-dim)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-mono)',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}
      >
        {message.content}
      </div>
    );
  }

  // ── Render: Assistant / User Message ──────────────────────
  return (
    <div
      ref={messageRef}
      className="animate-fade-in"
      style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '12px',
        padding: '8px',
        borderRadius: '2px',
        background: isAssistant
          ? 'rgba(200, 168, 75, 0.04)'
          : isUser
            ? 'rgba(0, 191, 191, 0.04)'
            : 'transparent',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          flexShrink: 0,
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          marginTop: '2px',
        }}
      >
        {isAssistant ? (
          <span style={{ color: 'var(--omnissiah-red)' }}>⚙</span>
        ) : (
          <span style={{ color: 'var(--noosphere-cyan)' }}>◉</span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + Timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              color: isAssistant
                ? 'var(--cogitator-gold)'
                : 'var(--noosphere-cyan)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
            }}
          >
            {isAssistant ? 'ANATHEMETRON' : 'TECH-PRIEST'}
          </span>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {new Date(message.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>

        {/* Message Body */}
        <div
          className="terminal-message"
          style={{
            color: 'var(--sacred-white)',
            fontSize: 'var(--font-size-base)',
            lineHeight: 1.6,
            wordBreak: 'break-word' as const,
          }}
        >
          {parseMarkdown(message.content)}
          {/* Streaming cursor */}
          {isStreaming && (
            <span
              className="cursor-blink"
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
    </div>
  );
}

// ── Cursor blink animation ──────────────────────────────────
// Injected once via style tag in component scope
const cursorStyle = document.createElement('style');
cursorStyle.textContent = `
  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;
if (!document.getElementById('msg-cursor-style')) {
  cursorStyle.id = 'msg-cursor-style';
  document.head.appendChild(cursorStyle);
}
