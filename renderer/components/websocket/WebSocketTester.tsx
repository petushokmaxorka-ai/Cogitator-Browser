// ═══ WEBSOCKET TESTER ═══
// WebSocket connection testing interface — Machine Spirit communion diagnostics
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace

import { useState, useRef, useCallback, useEffect } from 'react';
import { Plug, Unplug, Send, Trash2, Download, RotateCcw } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface WSMessage {
  id: string;
  direction: 'sent' | 'received';
  timestamp: string;
  data: string;
}

interface MessageTemplate {
  name: string;
  data: string;
}

// ── Constants ────────────────────────────────────────────────

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  { name: 'ping', data: '{"type":"ping"}' },
  { name: 'hello', data: '{"type":"hello","payload":"greetings from the Omnissiah"}' },
  { name: 'subscribe', data: '{"type":"subscribe","channel":"sacred-data-stream"}' },
  { name: 'raw ping', data: 'ping' },
  { name: 'raw hello', data: 'hello' },
];

const STORAGE_KEY_URL = 'cogitator-ws-url';
const STORAGE_KEY_LOG = 'cogitator-ws-log';
const STORAGE_KEY_AUTO = 'cogitator-ws-autoreconnect';

// ── Helpers ──────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

// ── Component ────────────────────────────────────────────────

export default function WebSocketTester(): JSX.Element {
  const [url, setUrl] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY_URL) || 'ws://localhost:8080'; }
    catch { return 'ws://localhost:8080'; }
  });
  const [message, setMessage] = useState<string>('');
  const [history, setHistory] = useState<WSMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOG);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY_AUTO) === 'true'; }
    catch { return false; }
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // ── Persist history ───────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(history)); }
    catch { /* storage full */ }
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_AUTO, String(autoReconnect)); }
    catch { /* */ }
  }, [autoReconnect]);

  // ── Auto-scroll ───────────────────────────────────────────

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // ── WebSocket Handlers ────────────────────────────────────

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const addMessage = useCallback((direction: WSMessage['direction'], data: string) => {
    const entry: WSMessage = {
      id: generateId(),
      direction,
      timestamp: formatTimestamp(),
      data,
    };
    setHistory((prev) => [...prev, entry]);
  }, []);

  const connect = useCallback(() => {
    cleanup();
    setConnecting(true);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        addMessage('received', '[SYSTEM] Connection established — Machine Spirit communion active');
      };

      ws.onmessage = (event) => {
        addMessage('received', event.data);
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        addMessage('received', '[SYSTEM] Connection severed — Machine Spirit communion lost');
        wsRef.current = null;

        if (autoReconnect) {
          reconnectTimerRef.current = setTimeout(() => {
            addMessage('received', '[SYSTEM] Attempting auto-reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        setConnecting(false);
        addMessage('received', '[SYSTEM] Connection error — heretek interference detected');
      };
    } catch (err) {
      setConnecting(false);
      addMessage('received', `[SYSTEM] Failed to initiate: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [url, autoReconnect, cleanup, addMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    addMessage('received', '[SYSTEM] Disconnected by Tech-Priest command');
  }, [addMessage]);

  const sendMessage = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addMessage('received', '[SYSTEM] No active communion channel — connect first');
      return;
    }
    if (!message.trim()) return;

    wsRef.current.send(message.trim());
    addMessage('sent', message.trim());
    setMessage('');
  }, [message, addMessage]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY_LOG); }
    catch { /* */ }
  }, []);

  const exportLog = useCallback(() => {
    const log = history.map((m) => `[${m.timestamp}] ${m.direction === 'sent' ? 'SEND' : 'RECV'} ${m.data}`).join('\n');
    const blob = new Blob([log], { type: 'text/plain' });
    const url2 = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url2;
    a.download = `cogitator-ws-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url2);
  }, [history]);

  const handleTemplateChange = useCallback((name: string) => {
    setSelectedTemplate(name);
    const tmpl = MESSAGE_TEMPLATES.find((t) => t.name === name);
    if (tmpl) setMessage(tmpl.data);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      sendMessage();
    }
  }, [sendMessage]);

  // ── Cleanup on unmount ────────────────────────────────────

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--parchment)',
        overflow: 'hidden',
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '8px',
            textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
          }}
        >
          ◆ WebSocket Tester
        </div>

        {/* URL Input */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); try { localStorage.setItem(STORAGE_KEY_URL, e.target.value); } catch { /* */ } }}
            placeholder="ws://localhost:8080"
            disabled={connected || connecting}
            style={{
              flex: 1,
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              borderRadius: '2px',
              padding: '6px 8px',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              outline: 'none',
            }}
          />
          {!connected ? (
            <button
              onClick={connect}
              disabled={connecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: connecting ? 'var(--iron-gray)' : 'var(--omnissiah-red)',
                border: 'none',
                borderRadius: '2px',
                color: '#000000',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: connecting ? 'wait' : 'pointer',
                opacity: connecting ? 0.6 : 1,
              }}
            >
              <Plug size={12} />
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          ) : (
            <button
              onClick={disconnect}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: 'var(--iron-gray)',
                border: 'none',
                borderRadius: '2px',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <Unplug size={12} />
              Disconnect
            </button>
          )}
        </div>

        {/* Status + Auto-reconnect */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: connected ? '#00ff00' : connecting ? '#C8A84B' : '#FF0000',
                boxShadow: connected
                  ? '0 0 8px #00ff00'
                  : connecting
                    ? '0 0 8px #C8A84B'
                    : '0 0 8px #FF0000',
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--parchment-dim)', letterSpacing: '0.08em' }}>
              {connected ? 'Connected — Machine Spirit communion active' : connecting ? 'Establishing link...' : 'Disconnected — no signal'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--parchment-dim)' }}>
            <input
              type="checkbox"
              checked={autoReconnect}
              onChange={(e) => setAutoReconnect(e.target.checked)}
              style={{ accentColor: 'var(--omnissiah-red)' }}
            />
            <span>Auto-reconnect</span>
          </label>
        </div>
      </div>

      {/* ═══ SEND AREA ═══ */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 'bold' }}>
            SEND
          </span>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              borderRadius: '2px',
              padding: '3px 6px',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">— Template —</option>
            {MESSAGE_TEMPLATES.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='{ "type": "hello" }'
          rows={3}
          style={{
            width: '100%',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            borderRadius: '2px',
            padding: '8px',
            color: 'var(--parchment)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button
            onClick={sendMessage}
            disabled={!connected}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 12px',
              background: connected ? 'var(--mechanicus-teal)' : 'var(--iron-gray)',
              border: 'none',
              borderRadius: '2px',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: connected ? 'pointer' : 'not-allowed',
              opacity: connected ? 1 : 0.5,
            }}
          >
            <Send size={10} />
            Send
          </button>
        </div>
      </div>

      {/* ═══ MESSAGE HISTORY ═══ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          fontSize: '11px',
        }}
      >
        {history.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--parchment-dim)',
              fontSize: '11px',
              marginTop: '20px',
              opacity: 0.5,
            }}
          >
            No messages — establish communion to begin transmission
          </div>
        )}
        {history.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: '4px',
              padding: '4px 6px',
              borderLeft: `2px solid ${msg.direction === 'sent' ? 'var(--cogitator-gold)' : 'var(--mechanicus-teal)'}`,
              background: 'rgba(10, 10, 10, 0.5)',
              wordBreak: 'break-all',
            }}
          >
            <span
              style={{
                color: msg.direction === 'sent' ? 'var(--cogitator-gold)' : 'var(--mechanicus-teal)',
                fontWeight: 'bold',
                marginRight: '6px',
              }}
            >
              {msg.direction === 'sent' ? '←' : '→'} {msg.timestamp}
            </span>
            <span style={{ color: 'var(--parchment)' }}>{msg.data}</span>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* ═══ FOOTER ACTIONS ═══ */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 12px',
          borderTop: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={disconnect}
          disabled={!connected && !connecting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            background: 'transparent',
            border: '1px solid var(--omnissiah-red)',
            borderRadius: '2px',
            color: 'var(--omnissiah-red)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: (connected || connecting) ? 'pointer' : 'not-allowed',
            opacity: (connected || connecting) ? 1 : 0.3,
          }}
        >
          <Unplug size={10} />
          Disconnect
        </button>
        <button
          onClick={clearHistory}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            borderRadius: '2px',
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={10} />
          Clear
        </button>
        <button
          onClick={exportLog}
          disabled={history.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            borderRadius: '2px',
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: history.length > 0 ? 'pointer' : 'not-allowed',
            opacity: history.length > 0 ? 1 : 0.3,
          }}
        >
          <Download size={10} />
          Export
        </button>
        {autoReconnect && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <RotateCcw size={10} style={{ color: 'var(--cogitator-gold)', animation: 'spin 2s linear infinite' }} />
            <span style={{ color: 'var(--cogitator-gold)', fontSize: '9px', marginLeft: '4px', letterSpacing: '0.08em' }}>AUTO</span>
          </div>
        )}
      </div>
    </div>
  );
}
