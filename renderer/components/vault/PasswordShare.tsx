// ═══ PASSWORD SHARE ═══
// One-Time Secure Password Link — Dark Mechanicus Interface
// Generates ephemeral links for secure password transmission
// Links expire after 1 hour or first view (burn-after-reading)

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Share2,
  Link,
  Copy,
  Check,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Shield,
  X,
  ExternalLink,
  Lock,
  Unlock,
  Timer,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface SharedPassword {
  id: string;
  encrypted: string;
  createdAt: number;
  expiresAt: number;
  viewed: boolean;
}

// ── Storage Helpers ─────────────────────────────────────────

const SHARE_PREFIX = 'cogitator_share_';
const SHARE_INDEX_KEY = 'cogitator_share_index';

function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loadShareIndex(): string[] {
  try {
    const raw = localStorage.getItem(SHARE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveShareIndex(ids: string[]): void {
  localStorage.setItem(SHARE_INDEX_KEY, JSON.stringify(ids));
}

function createShareEntry(password: string): { id: string; link: string } {
  const id = generateId();
  const encrypted = btoa(password);
  const now = Date.now();
  const entry: SharedPassword = {
    id,
    encrypted,
    createdAt: now,
    expiresAt: now + 3600000, // 1 hour
    viewed: false,
  };

  localStorage.setItem(`${SHARE_PREFIX}${id}`, JSON.stringify(entry));

  // Update index
  const index = loadShareIndex();
  index.push(id);
  saveShareIndex(index);

  return { id, link: `cogitator://share/${id}` };
}

function getShareEntry(id: string): SharedPassword | null {
  try {
    const raw = localStorage.getItem(`${SHARE_PREFIX}${id}`);
    if (!raw) return null;
    const entry: SharedPassword = JSON.parse(raw);

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(`${SHARE_PREFIX}${id}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function markShareViewed(id: string): void {
  try {
    const raw = localStorage.getItem(`${SHARE_PREFIX}${id}`);
    if (!raw) return;
    const entry: SharedPassword = JSON.parse(raw);
    entry.viewed = true;
    localStorage.setItem(`${SHARE_PREFIX}${id}`, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

function deleteShare(id: string): void {
  localStorage.removeItem(`${SHARE_PREFIX}${id}`);
  const index = loadShareIndex();
  saveShareIndex(index.filter((i) => i !== id));
}

/** Decode a share link and return the password (one-time view) */
function decodeShare(linkOrId: string): { password: string; viewed: boolean } | null {
  // Extract ID from cogitator://share/ID or just use the ID
  const id = linkOrId.replace(/^cogitator:\/\/share\//, '').trim();
  if (!id) return null;

  const entry = getShareEntry(id);
  if (!entry) return null;

  if (entry.viewed) {
    // Already viewed — burn after reading
    deleteShare(id);
    return null;
  }

  try {
    const password = atob(entry.encrypted);
    markShareViewed(id);

    // Auto-delete after first view (burn after reading)
    setTimeout(() => deleteShare(id), 100);

    return { password, viewed: false };
  } catch {
    return null;
  }
}

// ── Time formatting ─────────────────────────────────────────

function formatTimeLeft(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired';

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ── Component ───────────────────────────────────────────────

type ShareView = 'create' | 'receive' | 'active';

export default function PasswordShare() {
  // ── State ─────────────────────────────────────────────────
  const [view, setView] = useState<ShareView>('create');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [link, setLink] = useState('');
  const [shareId, setShareId] = useState('');
  const [timeLeft, setTimeLeft] = useState('59:00');
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState('');

  // Receive view state
  const [receiveInput, setReceiveInput] = useState('');
  const [receivedPassword, setReceivedPassword] = useState('');
  const [showReceived, setShowReceived] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  // Active shares list
  const [activeShares, setActiveShares] = useState<{ id: string; createdAt: number; expiresAt: number }[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimeRef = useRef<number>(0);

  // ── Timer for countdown ───────────────────────────────────
  useEffect(() => {
    if (view === 'active' && expiryTimeRef.current > 0) {
      timerRef.current = setInterval(() => {
        const formatted = formatTimeLeft(expiryTimeRef.current);
        setTimeLeft(formatted);
        if (formatted === 'Expired') {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [view]);

  // ── Load active shares ────────────────────────────────────
  useEffect(() => {
    const index = loadShareIndex();
    const shares: { id: string; createdAt: number; expiresAt: number }[] = [];
    index.forEach((id) => {
      const entry = getShareEntry(id);
      if (entry && !entry.viewed) {
        shares.push({ id: entry.id, createdAt: entry.createdAt, expiresAt: entry.expiresAt });
      }
    });
    setActiveShares(shares);
  }, [view]);

  // ── Generate link ─────────────────────────────────────────
  const handleGenerateLink = useCallback(() => {
    setError('');
    if (!password.trim()) {
      setError('Enter a password to share');
      return;
    }

    const result = createShareEntry(password);
    setLink(result.link);
    setShareId(result.id);
    expiryTimeRef.current = Date.now() + 3600000;
    setTimeLeft('59:00');
    setView('active');
  }, [password]);

  // ── Copy link ─────────────────────────────────────────────
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch (err) {
      console.error('[SHARE] Copy failed:', err);
    }
  }, [link]);

  // ── Receive password ──────────────────────────────────────
  const handleReceive = useCallback(() => {
    setReceiveError('');
    setReceivedPassword('');

    if (!receiveInput.trim()) {
      setReceiveError('Enter a share link or ID');
      return;
    }

    const result = decodeShare(receiveInput.trim());
    if (!result) {
      setReceiveError('Invalid, expired, or already viewed link');
      return;
    }

    setReceivedPassword(result.password);
    setShowReceived(false);
  }, [receiveInput]);

  // ── Delete share ──────────────────────────────────────────
  const handleDeleteShare = useCallback((id: string) => {
    deleteShare(id);
    setActiveShares((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ═════════════════════════════════════════════════════════
  //  RENDER: CREATE VIEW
  // ═════════════════════════════════════════════════════════

  if (view === 'create') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid var(--iron-gray)',
            background: 'var(--void-black)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            <Share2 size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Password Share
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {activeShares.length > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--steel-gray)',
                  padding: '4px 8px',
                  border: '1px solid var(--iron-gray)',
                }}
              >
                {activeShares.length} active
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(200, 168, 75, 0.15)',
                border: '1px solid var(--cogitator-gold)',
                color: 'var(--cogitator-gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Send
            </button>
            <button
              onClick={() => setView('receive')}
              style={{
                flex: 1,
                padding: '8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
                e.currentTarget.style.color = 'var(--noosphere-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              <Unlock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Receive
            </button>
          </div>

          {/* Password input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              <Shield size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Password to Share
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 150ms ease',
                  letterSpacing: '0.05em',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateLink();
                }}
              />
              <button
                onClick={() => setShowPassword((p) => !p)}
                title={showPassword ? 'Hide' : 'Show'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--iron-gray)';
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                color: 'var(--omnissiah-red)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px',
                background: 'rgba(255, 0, 0, 0.05)',
                border: '1px solid rgba(255, 0, 0, 0.2)',
              }}
            >
              <AlertTriangle size={12} />
              {error}
            </div>
          )}

          {/* Info box */}
          <div
            style={{
              padding: '10px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              fontSize: '10px',
              color: 'var(--steel-gray)',
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: 'var(--cogitator-gold)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Security Info
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>One-time link — password can only be viewed once</li>
              <li>Link expires after 1 hour</li>
              <li>Password is base64-encoded in localStorage</li>
              <li>Copy the link and send it to the recipient</li>
            </ul>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateLink}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--omnissiah-red)',
              border: '1px solid var(--omnissiah-red)',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              marginTop: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff3333';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Link size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Generate One-Time Link
          </button>

          {/* Active shares list */}
          {activeShares.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--parchment-dim)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  paddingBottom: '4px',
                  borderBottom: '1px solid var(--iron-gray)',
                }}
              >
                Active Shares
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--iron-dark)',
                      border: '1px solid var(--iron-gray)',
                      fontSize: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <Link size={10} color="var(--noosphere-cyan)" />
                      <span style={{ color: 'var(--steel-gray)', fontFamily: 'var(--font-mono)' }}>
                        {share.id.slice(0, 8)}...
                      </span>
                      <span style={{ color: 'var(--steel-gray)' }}>
                        <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        {' '}{formatTimeLeft(share.expiresAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      title="Revoke"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--omnissiah-red)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: RECEIVE VIEW
  // ═════════════════════════════════════════════════════════

  if (view === 'receive') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid var(--iron-gray)',
            background: 'var(--void-black)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            <Unlock size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Receive Password
          </span>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setView('create')}
              style={{
                flex: 1,
                padding: '8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
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
              <Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Send
            </button>
            <button
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(0, 191, 191, 0.15)',
                border: '1px solid var(--noosphere-cyan)',
                color: 'var(--noosphere-cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <Unlock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Receive
            </button>
          </div>

          {/* Link input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              <Link size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Share Link or ID
            </label>
            <input
              type="text"
              value={receiveInput}
              onChange={(e) => {
                setReceiveInput(e.target.value);
                setReceiveError('');
              }}
              placeholder="cogitator://share/..."
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 150ms ease',
                letterSpacing: '0.05em',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--noosphere-cyan)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleReceive();
              }}
            />
          </div>

          {/* Error */}
          {receiveError && (
            <div
              style={{
                color: 'var(--omnissiah-red)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px',
                background: 'rgba(255, 0, 0, 0.05)',
                border: '1px solid rgba(255, 0, 0, 0.2)',
              }}
            >
              <AlertTriangle size={12} />
              {receiveError}
            </div>
          )}

          <button
            onClick={handleReceive}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--noosphere-cyan)',
              border: '1px solid var(--noosphere-cyan)',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00d4d4';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 191, 191, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--noosphere-cyan)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Unlock size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Retrieve Password
          </button>

          {/* Received password */}
          {receivedPassword && (
            <div
              style={{
                marginTop: '8px',
                padding: '16px',
                background: 'var(--iron-dark)',
                border: '1px solid var(--noosphere-cyan)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10px',
                  color: 'var(--noosphere-cyan)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                <Check size={12} />
                Password Retrieved (burned)
              </div>

              <div
                style={{
                  padding: '12px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '16px',
                  letterSpacing: '0.1em',
                  color: 'var(--cogitator-gold)',
                  textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
                  wordBreak: 'break-all',
                }}
              >
                {showReceived ? receivedPassword : '•'.repeat(Math.min(receivedPassword.length, 24))}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setShowReceived((p) => !p)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
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
                  {showReceived ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showReceived ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(receivedPassword);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
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
                  <Copy size={12} />
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: ACTIVE LINK VIEW
  // ═════════════════════════════════════════════════════════

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          background: 'var(--void-black)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          <Link size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Active Share Link
        </span>
        <button
          onClick={() => { setView('create'); setPassword(''); setLink(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            background: 'transparent',
            border: '1px solid transparent',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            e.currentTarget.style.color = 'var(--omnissiah-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = 'var(--parchment-dim)';
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Success icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            border: '2px solid var(--noosphere-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 191, 191, 0.3)',
          }}
        >
          <Shield size={32} color="var(--noosphere-cyan)" strokeWidth={1.5} />
        </div>

        {/* Link display */}
        <div
          style={{
            width: '100%',
            padding: '14px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            wordBreak: 'break-all',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--sacred-white)',
            letterSpacing: '0.05em',
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          {link}
        </div>

        {/* Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: timeLeft === 'Expired' ? 'var(--omnissiah-red)' : 'var(--noosphere-cyan)',
            textShadow: timeLeft === 'Expired'
              ? '0 0 8px rgba(255, 0, 0, 0.3)'
              : '0 0 8px rgba(0, 191, 191, 0.3)',
            letterSpacing: '0.15em',
          }}
        >
          <Timer size={16} />
          <span>Expires in {timeLeft}</span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyLink}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 24px',
            background: copiedLink
              ? 'rgba(0, 191, 191, 0.2)'
              : 'rgba(200, 168, 75, 0.1)',
            border: `1px solid ${copiedLink ? 'var(--noosphere-cyan)' : 'var(--cogitator-gold)'}`,
            color: copiedLink ? 'var(--noosphere-cyan)' : 'var(--cogitator-gold)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            width: '100%',
            maxWidth: '280px',
          }}
          onMouseEnter={(e) => {
            if (!copiedLink) {
              e.currentTarget.style.background = 'rgba(200, 168, 75, 0.2)';
              e.currentTarget.style.boxShadow = 'var(--glow-gold)';
            }
          }}
          onMouseLeave={(e) => {
            if (!copiedLink) {
              e.currentTarget.style.background = 'rgba(200, 168, 75, 0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {copiedLink ? <Check size={16} /> : <Copy size={16} />}
          {copiedLink ? 'Copied!' : 'Copy Link'}
        </button>

        {/* Warning */}
        <div
          style={{
            padding: '10px',
            background: 'rgba(255, 0, 0, 0.05)',
            border: '1px solid rgba(255, 0, 0, 0.2)',
            fontSize: '10px',
            color: 'var(--omnissiah-red)',
            lineHeight: 1.5,
            textAlign: 'center',
            maxWidth: '280px',
          }}
        >
          <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          This link is one-time use. Once opened, the password will be permanently deleted.
        </div>
      </div>
    </div>
  );
}
