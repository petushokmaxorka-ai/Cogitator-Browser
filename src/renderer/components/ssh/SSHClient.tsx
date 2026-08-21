// ═══ SSH CLIENT ═══
// Secure Shell terminal interface — Machine Spirit remote communion
// TODO: integrate node-ssh for production use

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Terminal,
  Wifi,
  WifiOff,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  KeyRound,
  Lock,
  Play,
  CircleDot,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface SSHConnection {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: number;
}

// ── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_ssh_connections';

// ── Real SSH Engine via IPC ─────────────────────────────────

async function sshTestConnection(
  host: string,
  port: number,
  username: string,
  authType: 'password' | 'key',
  secret: string,
): Promise<void> {
  const result = await window.electronAPI?.ssh?.connect?.({
    host,
    port,
    username,
    authType,
    secret,
  });
  if (!result?.success) throw new Error('SSH connection failed');
}

async function sshExecuteCommand(command: string): Promise<string> {
  return (await window.electronAPI?.ssh?.exec?.(command)) ?? '';
}

async function sshDisconnect(): Promise<void> {
  await window.electronAPI?.ssh?.disconnect?.();
}

// ── Storage Helpers ─────────────────────────────────────────

function loadConnections(): SSHConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConnections(conns: SSHConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conns));
}

function generateId(): string {
  return 'ssh_' + Math.random().toString(36).slice(2, 11);
}

// ── Component ───────────────────────────────────────────────

export default function SSHClient() {
  // ── State ─────────────────────────────────────────────────
  const [connections, setConnections] = useState<SSHConnection[]>(loadConnections);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSaved, setShowSaved] = useState(false);
  const [sessionLog, setSessionLog] = useState<TerminalLine[]>([]);

  // Connection form
  const [formLabel, setFormLabel] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formPort, setFormPort] = useState('22');
  const [formUser, setFormUser] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAuthType, setFormAuthType] = useState<'password' | 'key'>('password');

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // ── Save connections ──────────────────────────────────────
  useEffect(() => {
    saveConnections(connections);
  }, [connections]);

  // ── Terminal output helpers ───────────────────────────────
  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    const line: TerminalLine = {
      id: generateId(),
      type,
      text,
      timestamp: Date.now(),
    };
    setLines((prev) => [...prev, line]);
    setSessionLog((prev) => [...prev, line]);
  }, []);

  const clearTerminal = useCallback(() => {
    setLines([]);
  }, []);

  // ── Connection handlers ───────────────────────────────────
  const handleConnect = useCallback(async () => {
    if (!formHost || !formUser) return;
    setIsConnecting(true);
    addLine('system', `> Connecting to ${formHost}:${formPort} as ${formUser}...`);

    try {
      await sshTestConnection(
        formHost,
        parseInt(formPort),
        formUser,
        formAuthType,
        formPassword,
      );
      setIsConnected(true);
      setIsConnecting(false);
      addLine('system', `> Connected to ${formHost}`);
      addLine('output', '');
    } catch (err) {
      setIsConnected(false);
      setIsConnecting(false);
      const msg = err instanceof Error ? err.message : 'Connection failed';
      addLine('error', `> ${msg}`);
    }
  }, [formHost, formPort, formUser, formAuthType, formPassword, addLine]);

  const handleDisconnect = useCallback(async () => {
    await sshDisconnect();
    setIsConnected(false);
    setActiveConnectionId(null);
    addLine('system', '> Disconnected');
  }, [addLine]);

  const handleSaveConnection = useCallback(() => {
    if (!formHost || !formUser) return;
    const conn: SSHConnection = {
      id: generateId(),
      label: formLabel || `${formUser}@${formHost}`,
      host: formHost,
      port: parseInt(formPort) || 22,
      username: formUser,
      authType: formAuthType,
      password: formAuthType === 'password' ? formPassword : undefined,
    };
    setConnections((prev) => [...prev, conn]);
    setFormLabel('');
  }, [formLabel, formHost, formPort, formUser, formAuthType, formPassword]);

  const handleLoadConnection = useCallback((conn: SSHConnection) => {
    setFormLabel(conn.label);
    setFormHost(conn.host);
    setFormPort(String(conn.port));
    setFormUser(conn.username);
    setFormAuthType(conn.authType);
    if (conn.password) setFormPassword(conn.password);
    setActiveConnectionId(conn.id);
  }, []);

  const handleDeleteConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (activeConnectionId === id) setActiveConnectionId(null);
  }, [activeConnectionId]);

  // ── Command execution ─────────────────────────────────────
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || !isConnected) return;

      const command = input.trim();
      addLine('input', `$ ${command}`);
      setInput('');
      setHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);

      if (command === 'clear') {
        clearTerminal();
        return;
      }
      if (command === 'exit') {
        handleDisconnect();
        return;
      }

      const response = await sshExecuteCommand(command);
      if (response) {
        response.split('\n').forEach((line) => {
          addLine('output', line);
        });
      }
    },
    [input, isConnected, addLine, clearTerminal, handleDisconnect]
  );

  // ── Keyboard handlers ─────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const newIndex = Math.min(prev + 1, history.length - 1);
          if (newIndex >= 0) {
            setInput(history[history.length - 1 - newIndex]);
          }
          return newIndex;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const newIndex = Math.max(prev - 1, -1);
          if (newIndex >= 0) {
            setInput(history[history.length - 1 - newIndex]);
          } else {
            setInput('');
          }
          return newIndex;
        });
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const partial = input.trim();
        if (!partial) return;
        addLine('output', 'Tab completion requires remote shell context');
      }
    },
    [history, historyIndex, input, addLine]
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000000',
        fontFamily: "'Courier New', 'Consolas', monospace",
        fontSize: '12px',
        color: '#E8E8E8',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <Terminal size={14} style={{ color: '#C8A84B' }} />
        <span
          style={{
            color: '#C8A84B',
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            fontSize: '11px',
            textTransform: 'uppercase',
          }}
        >
          SSH Terminal
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isConnected ? (
            <CircleDot size={12} style={{ color: '#00BFBF' }} />
          ) : (
            <CircleDot size={12} style={{ color: '#555' }} />
          )}
          <span
            style={{
              color: isConnected ? '#00BFBF' : '#555',
              fontSize: '10px',
              letterSpacing: '0.08em',
            }}
          >
            {isConnected ? 'CONNECTED' : isConnecting ? 'CONNECTING...' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* ── Connection Bar ────────────────────────────────── */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
          background: '#111111',
        }}
      >
        {/* Row 1: Host, User, Auth */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Saved connections dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSaved(!showSaved)}
              style={{
                padding: '4px 8px',
                background: '#1E1E1E',
                border: '1px solid #2A2A2A',
                color: '#E8E8E8',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                minWidth: '100px',
              }}
            >
              <span>{activeConnectionId ? connections.find(c => c.id === activeConnectionId)?.label || 'Select' : 'Select...'}</span>
              {showSaved ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showSaved && connections.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#1E1E1E',
                  border: '1px solid #2A2A2A',
                  borderTop: 'none',
                  zIndex: 100,
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    style={{
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #222',
                    }}
                    onClick={() => { handleLoadConnection(conn); setShowSaved(false); }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#2A2A2A'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '10px' }}>{conn.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteConnection(conn.id); }}
                      style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            placeholder="hostname"
            value={formHost}
            onChange={(e) => setFormHost(e.target.value)}
            style={{
              flex: 1,
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
              minWidth: 0,
            }}
          />
          <input
            placeholder="port"
            value={formPort}
            onChange={(e) => setFormPort(e.target.value)}
            style={{
              width: '50px',
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
            }}
          />
          <input
            placeholder="user"
            value={formUser}
            onChange={(e) => setFormUser(e.target.value)}
            style={{
              width: '80px',
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
            }}
          />
          <button
            onClick={() => setFormAuthType(formAuthType === 'password' ? 'key' : 'password')}
            title={formAuthType === 'password' ? 'Password auth' : 'Key auth'}
            style={{
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: formAuthType === 'password' ? '#C8A84B' : '#00BFBF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {formAuthType === 'password' ? <Lock size={12} /> : <KeyRound size={12} />}
          </button>
          <input
            type="password"
            placeholder={formAuthType === 'password' ? 'password' : 'private key'}
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            style={{
              width: '100px',
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
            }}
          />
          <button
            onClick={handleConnect}
            disabled={isConnecting || isConnected || !formHost || !formUser}
            style={{
              padding: '4px 12px',
              background: isConnected ? '#00BFBF' : '#FF0000',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold',
              fontSize: '10px',
              letterSpacing: '0.1em',
              cursor: isConnecting || isConnected ? 'not-allowed' : 'pointer',
              opacity: isConnecting || isConnected ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isConnecting ? (
              <Wifi size={12} />
            ) : isConnected ? (
              <Wifi size={12} />
            ) : (
              <WifiOff size={12} />
            )}
            {isConnecting ? '...' : isConnected ? 'CONN' : 'CONNECT'}
          </button>
          {isConnected && (
            <button
              onClick={handleDisconnect}
              style={{
                padding: '4px 8px',
                background: '#1E1E1E',
                border: '1px solid #2A2A2A',
                color: '#FF0000',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              DISC
            </button>
          )}
        </div>

        {/* Row 2: Label + Save */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            placeholder="label (optional)"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            style={{
              flex: 1,
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
            }}
          />
          <button
            onClick={handleSaveConnection}
            disabled={!formHost || !formUser}
            style={{
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#C8A84B',
              fontSize: '10px',
              cursor: !formHost || !formUser ? 'not-allowed' : 'pointer',
              opacity: !formHost || !formUser ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Save size={10} />
            SAVE
          </button>
          <button
            onClick={() => {
              setFormLabel(''); setFormHost(''); setFormPort('22');
              setFormUser(''); setFormPassword(''); setFormAuthType('password');
              setActiveConnectionId(null);
            }}
            style={{
              padding: '4px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#555',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={10} />
            NEW
          </button>
        </div>
      </div>

      {/* ── Terminal Output ───────────────────────────────── */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '10px 12px',
          background: '#000000',
          fontSize: '12px',
          lineHeight: '1.5',
        }}
      >
        {lines.length === 0 && (
          <div style={{ color: '#555', fontSize: '11px', fontStyle: 'italic' }}>
            {'// Machine Spirit awaits communion...'}
            <br />
            {'// Enter connection details and press CONNECT'}
            <br />
            {'// Use "help" for available commands'}
          </div>
        )}
        {lines.map((line) => (
          <div
            key={line.id}
            style={{
              color:
                line.type === 'input'
                  ? '#C8A84B'
                  : line.type === 'error'
                    ? '#FF0000'
                    : line.type === 'system'
                      ? '#00BFBF'
                      : '#E8E8E8',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {line.text}
          </div>
        ))}
        {isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <span style={{ color: '#C8A84B' }}>$</span>
            <span
              style={{
                width: '7px',
                height: '14px',
                background: '#C8A84B',
                animation: 'blink 1s step-end infinite',
                display: 'inline-block',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Input Bar ─────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          padding: '8px 12px',
          borderTop: '1px solid #2A2A2A',
          background: '#111111',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        <span style={{ color: '#C8A84B', fontSize: '12px', lineHeight: '24px' }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
          placeholder={isConnected ? 'Enter command...' : 'Connect to enter commands'}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#E8E8E8',
            fontSize: '12px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!isConnected || !input.trim()}
          style={{
            padding: '2px 8px',
            background: 'transparent',
            border: '1px solid #2A2A2A',
            color: isConnected ? '#C8A84B' : '#555',
            fontSize: '10px',
            cursor: !isConnected ? 'not-allowed' : 'pointer',
          }}
        >
          <Play size={10} />
        </button>
      </form>

      {/* ── Session Log Info ──────────────────────────────── */}
      {sessionLog.length > 0 && (
        <div
          style={{
            padding: '4px 12px',
            borderTop: '1px solid #222',
            background: '#000000',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#555',
            flexShrink: 0,
          }}
        >
          <span>Log: {sessionLog.length} entries</span>
          <button
            onClick={() => setSessionLog([])}
            style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }}
          >
            CLEAR LOG
          </button>
        </div>
      )}

      {/* Blink cursor animation */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
