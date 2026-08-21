// ═══ SESSION PANEL ═══
// Session management — save, restore, and recover browsing sessions.
// The Machine Spirit remembers all paths walked through the Noosphere.

import { useState, useCallback, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Trash2,
  Plus,
  X,
  Check,
  Clock,
  FolderOpen,
  AlertTriangle,
  Globe,
  Pencil,
  Settings,
  Play,
  Zap,
} from 'lucide-react';
import { type SavedSession, type SessionConfig } from '../../../shared/types';
import Button from '../ui/Button';
import ScrollArea from '../ui/ScrollArea';

// ── Types ───────────────────────────────────────────────────

interface SessionPanelProps {
  tabs?: { id: string; url: string; title: string }[];
  onRestoreSession?: (urls: string[]) => void;
}

// ── LocalStorage Keys ───────────────────────────────────────

const SESSIONS_KEY = 'cogitator_sessions';
const CONFIG_KEY = 'cogitator_session_config';
const CRASH_SESSION_KEY = 'cogitator_crashed_session';

// ── Default Config ──────────────────────────────────────────

const DEFAULT_CONFIG: SessionConfig = {
  startupBehavior: 'restore',
  startupPages: ['about:blank'],
};

// ── Utility: Generate session ID ────────────────────────────

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Storage helpers ─────────────────────────────────────────

function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SavedSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function loadConfig(): SessionConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SessionConfig) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: SessionConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function loadCrashedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(CRASH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function clearCrashedSession() {
  localStorage.removeItem(CRASH_SESSION_KEY);
}

// ── Component ───────────────────────────────────────────────

export default function SessionPanel({ tabs, onRestoreSession }: SessionPanelProps) {
  // ── State ─────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SavedSession[]>(loadSessions);
  const [config, setConfig] = useState<SessionConfig>(loadConfig);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [crashedSession, setCrashedSession] = useState<SavedSession | null>(
    loadCrashedSession
  );
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // ── Persist sessions ──────────────────────────────────────
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // ── Save current session ──────────────────────────────────

  const handleSaveSession = useCallback(() => {
    if (!tabs || tabs.length === 0) return;

    const name =
      newSessionName.trim() || `Session ${formatDate(Date.now())}`;

    const session: SavedSession = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      tabs: tabs.map((t) => ({ url: t.url, title: t.title })),
    };

    setSessions((prev) => [session, ...prev]);
    setNewSessionName('');
    setShowSaveDialog(false);

    // Flash feedback
    setRestoredId(session.id);
    setTimeout(() => setRestoredId(null), 1500);
  }, [tabs, newSessionName]);

  // ── Restore session ───────────────────────────────────────

  const handleRestoreSession = useCallback(
    (session: SavedSession) => {
      if (onRestoreSession && session.tabs.length > 0) {
        const urls = session.tabs.map((t) => t.url);
        onRestoreSession(urls);
      }

      setRestoredId(session.id);
      setTimeout(() => setRestoredId(null), 1500);
    },
    [onRestoreSession]
  );

  // ── Delete session ────────────────────────────────────────

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Rename session ────────────────────────────────────────

  const handleStartRename = useCallback((session: SavedSession) => {
    setEditingId(session.id);
    setEditName(session.name);
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (!editName.trim() || !editingId) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === editingId ? { ...s, name: editName.trim() } : s
      )
    );
    setEditingId(null);
    setEditName('');
  }, [editName, editingId]);

  // ── Startup config ────────────────────────────────────────

  const handleConfigChange = useCallback(
    (behavior: SessionConfig['startupBehavior']) => {
      setConfig((prev) => ({ ...prev, startupBehavior: behavior }));
    },
    []
  );

  const handleAddStartupPage = useCallback(() => {
    if (!newPageUrl.trim()) return;
    let url = newPageUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setConfig((prev) => ({
      ...prev,
      startupPages: [...prev.startupPages, url],
    }));
    setNewPageUrl('');
    setShowAddPage(false);
  }, [newPageUrl]);

  const handleRemoveStartupPage = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      startupPages: prev.startupPages.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Crash recovery ────────────────────────────────────────

  const handleRecoverCrashedSession = useCallback(() => {
    if (crashedSession && onRestoreSession) {
      const urls = crashedSession.tabs.map((t) => t.url);
      onRestoreSession(urls);
      clearCrashedSession();
      setCrashedSession(null);
    }
  }, [crashedSession, onRestoreSession]);

  const handleDismissCrashRecovery = useCallback(() => {
    clearCrashedSession();
    setCrashedSession(null);
  }, []);

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
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOpen
            size={14}
            strokeWidth={1.5}
            style={{ color: 'var(--cogitator-gold)' }}
          />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Session Archive
          </span>
        </div>
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {sessions.length} saved
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div style={{ padding: '10px' }}>
          {/* ── Crash Recovery ──────────────────────────────── */}
          {crashedSession && (
            <div
              style={{
                padding: '10px',
                border: '1px solid var(--omnissiah-red)',
                background: 'rgba(255,0,0,0.05)',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{ color: 'var(--omnissiah-red)' }}
                />
                <span
                  style={{
                    color: 'var(--omnissiah-red)',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Crash Recovery
                </span>
              </div>
              <div
                style={{
                  color: 'var(--parchment-dim)',
                  fontSize: '10px',
                  marginBottom: '8px',
                  lineHeight: 1.5,
                }}
              >
                A crashed session was detected from{' '}
                {formatDate(crashedSession.createdAt)} with{' '}
                {crashedSession.tabs.length} tab
                {crashedSession.tabs.length !== 1 ? 's' : ''}.
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRecoverCrashedSession}
                  style={{ flex: 1 }}
                >
                  <Zap size={12} />
                  RECOVER
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissCrashRecovery}
                  style={{ flex: 1 }}
                >
                  <X size={12} />
                  DISMISS
                </Button>
              </div>
            </div>
          )}

          {/* ── Startup Options ─────────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              padding: '10px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <Settings
                size={12}
                style={{ color: 'var(--noosphere-cyan)' }}
              />
              <span
                style={{
                  color: 'var(--noosphere-cyan)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 'bold',
                }}
              >
                Startup Behavior
              </span>
            </div>

            {/* Radio options */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {(
                [
                  {
                    value: 'restore' as const,
                    label: 'Restore previous session',
                  },
                  { value: 'newtab' as const, label: 'Start with new tab' },
                  {
                    value: 'specific' as const,
                    label: 'Start with specific pages',
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'background 150ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="startup-behavior"
                    value={option.value}
                    checked={config.startupBehavior === option.value}
                    onChange={() => handleConfigChange(option.value)}
                    style={{
                      accentColor: 'var(--omnissiah-red)',
                      cursor: 'pointer',
                    }}
                  />
                  <span
                    style={{
                      color: 'var(--parchment)',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Specific pages list */}
            {config.startupBehavior === 'specific' && (
              <div
                style={{
                  marginTop: '8px',
                  paddingLeft: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {config.startupPages.map((page, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 6px',
                      background: 'var(--iron-dark)',
                    }}
                  >
                    <Globe size={10} style={{ color: 'var(--parchment-dim)' }} />
                    <span
                      style={{
                        color: 'var(--parchment)',
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {page}
                    </span>
                    <button
                      onClick={() => handleRemoveStartupPage(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--parchment-dim)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {showAddPage ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="https://..."
                      value={newPageUrl}
                      onChange={(e) => setNewPageUrl(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleAddStartupPage()
                      }
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: 'var(--void-black)',
                        border: '1px solid var(--iron-gray)',
                        color: 'var(--sacred-white)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleAddStartupPage}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--cogitator-gold)',
                        color: 'var(--cogitator-gold)',
                        cursor: 'pointer',
                        padding: '3px 6px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Check size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddPage(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      background: 'transparent',
                      border: '1px dashed var(--iron-gray)',
                      color: 'var(--parchment-dim)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      cursor: 'pointer',
                      marginTop: '4px',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                      e.currentTarget.style.color = 'var(--cogitator-gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--iron-gray)';
                      e.currentTarget.style.color = 'var(--parchment-dim)';
                    }}
                  >
                    <Plus size={10} />
                    Add page
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Save Current Session ────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              padding: '10px',
              marginBottom: '12px',
            }}
          >
            {showSaveDialog ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Session name..."
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSession()}
                  autoFocus
                  style={{
                    padding: '6px 10px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--sacred-white)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                  }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveSession}
                    disabled={!tabs || tabs.length === 0}
                    style={{ flex: 1 }}
                  >
                    <Check size={12} />
                    SAVE
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setNewSessionName('');
                    }}
                    style={{ flex: 1 }}
                  >
                    <X size={12} />
                    CANCEL
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="default"
                size="md"
                onClick={() => setShowSaveDialog(true)}
                disabled={!tabs || tabs.length === 0}
                style={{ width: '100%' }}
              >
                <Save size={14} />
                SAVE CURRENT SESSION
                {tabs && tabs.length > 0 && (
                  <span
                    style={{
                      marginLeft: '4px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    ({tabs.length} tabs)
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* ── Saved Sessions List ─────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              padding: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '10px',
              }}
            >
              <Clock
                size={12}
                style={{ color: 'var(--parchment-dim)' }}
              />
              <span
                style={{
                  color: 'var(--parchment-dim)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 'bold',
                }}
              >
                Saved Sessions
              </span>
            </div>

            {sessions.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px 16px',
                  gap: '8px',
                  color: 'var(--text-muted)',
                }}
              >
                <FolderOpen size={24} strokeWidth={1} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: '10px', textAlign: 'center' }}>
                  No saved sessions.
                  <br />
                  Save your current session to begin.
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {sessions.map((session) => {
                const isRestored = restoredId === session.id;
                const isEditing = editingId === session.id;

                return (
                  <div
                    key={session.id}
                    style={{
                      border: '1px solid var(--iron-gray)',
                      background:
                        isRestored
                          ? 'rgba(0,191,191,0.05)'
                          : 'var(--iron-dark)',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {/* Session header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '3px 6px',
                            background: 'var(--void-black)',
                            border: '1px solid var(--omnissiah-red)',
                            color: 'var(--sacred-white)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            outline: 'none',
                          }}
                          onBlur={handleConfirmRename}
                        />
                      ) : (
                        <span
                          style={{
                            flex: 1,
                            color: 'var(--sacred-white)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={session.name}
                        >
                          {session.name}
                        </span>
                      )}

                      {!isEditing && (
                        <>
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {session.tabs.length} tab
                            {session.tabs.length !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => handleStartRename(session)}
                            title="Rename"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--parchment-dim)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Pencil size={10} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Session meta & actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 10px 8px',
                        borderTop: '1px solid var(--iron-gray)',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '8px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {formatDate(session.createdAt)}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleRestoreSession(session)}
                          title="Restore session"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            background: 'transparent',
                            border: '1px solid var(--noosphere-cyan-dim)',
                            color: 'var(--noosphere-cyan)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--noosphere-cyan)';
                            e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--noosphere-cyan-dim)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Play size={8} />
                          RESTORE
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete session"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            background: 'transparent',
                            border: '1px solid var(--iron-gray)',
                            color: 'var(--parchment-dim)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--omnissiah-red)';
                            e.currentTarget.style.color = 'var(--omnissiah-red)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--iron-gray)';
                            e.currentTarget.style.color = 'var(--parchment-dim)';
                          }}
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                    </div>

                    {/* Tab preview */}
                    <div
                      style={{
                        maxHeight: '80px',
                        overflow: 'auto',
                        borderTop: '1px solid var(--iron-gray)',
                        padding: '4px 10px',
                      }}
                    >
                      {session.tabs.slice(0, 5).map((tab, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '2px 0',
                          }}
                        >
                          <Globe
                            size={8}
                            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                          />
                          <span
                            style={{
                              color: 'var(--parchment-dim)',
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={tab.url}
                          >
                            {tab.title || tab.url}
                          </span>
                        </div>
                      ))}
                      {session.tabs.length > 5 && (
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '8px',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 0',
                            paddingLeft: '14px',
                          }}
                        >
                          +{session.tabs.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Utility: save crash session before app closes
// ═══════════════════════════════════════════════════════════

export function saveCrashSession(
  tabs: { url: string; title: string }[]
) {
  const session: SavedSession = {
    id: `crash_${Date.now()}`,
    name: 'Crashed Session',
    createdAt: Date.now(),
    tabs,
  };
  localStorage.setItem(CRASH_SESSION_KEY, JSON.stringify(session));
}

// ═══════════════════════════════════════════════════════════
// Utility: get startup tabs based on config
// ═══════════════════════════════════════════════════════════

export function getStartupTabs(): string[] {
  const config = loadConfig();

  switch (config.startupBehavior) {
    case 'newtab':
      return ['about:blank'];
    case 'specific':
      return config.startupPages.length > 0
        ? config.startupPages
        : ['about:blank'];
    case 'restore':
    default: {
      // Try to restore last session
      const sessions = loadSessions();
      if (sessions.length > 0) {
        return sessions[0].tabs.map((t) => t.url);
      }
      return ['about:blank'];
    }
  }
}
