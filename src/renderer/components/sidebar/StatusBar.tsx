// ═══ STATUS BAR ═══
// Bottom status bar showing Ollama connection and active model

import { useState, useEffect } from 'react';

// ── Types ───────────────────────────────────────────────────

interface StatusBarProps {
  model: string;
}

// ── Component ───────────────────────────────────────────────

export default function StatusBar({ model }: StatusBarProps) {
  const [isOnline, setIsOnline] = useState<boolean>(false);

  // Check Ollama status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electronAPI.ollama.checkStatus();
        setIsOnline(status);
      } catch {
        setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'var(--iron-dark)',
        borderTop: '1px solid var(--iron-gray)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-xs)',
        flexShrink: 0,
      }}
    >
      {/* Model display */}
      <span style={{ color: 'var(--parchment-dim)' }}>
        MODEL:
        <span
          style={{
            color: model ? 'var(--parchment)' : 'var(--text-muted)',
            marginLeft: '4px',
          }}
        >
          {model || 'None'}
        </span>
      </span>

      {/* Divider */}
      <span style={{ color: 'var(--iron-gray)' }}>│</span>

      {/* Ollama Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ color: 'var(--parchment-dim)' }}>OLLAMA:</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: isOnline ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)',
            textShadow: isOnline
              ? '0 0 6px rgba(0, 191, 191, 0.4)'
              : '0 0 6px rgba(255, 0, 0, 0.3)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
            }}
          >
            ●
          </span>
          <span
            style={{
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </span>
      </div>

      {/* Divider */}
      <span style={{ color: 'var(--iron-gray)' }}>│</span>

      {/* Version */}
      <span style={{ color: 'var(--text-muted)' }}>v2.0</span>
    </div>
  );
}
