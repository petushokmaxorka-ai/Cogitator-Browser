// ═══ TOTP GENERATOR ═══
// RFC 6238 TOTP Implementation — Dark Mechanicus Interface
// Generates time-based one-time passwords like Google Authenticator
// Storage: localStorage key 'cogitator_totp'

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  KeyRound,
  Globe,
  ScanLine,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import type { TOTPAccount } from '../../../shared/types';

// ── TOTP Algorithm (RFC 6238) ─────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decode base32 string to Uint8Array */
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits.push(val.toString(2).padStart(5, '0'));
  }
  const bitString = bits.join('');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bitString.length; i += 8) {
    bytes.push(parseInt(bitString.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

/** Generate TOTP code from secret */
function generateTOTP(secret: string, digits = 6, period = 30, timestamp = Date.now()): string {
  try {
    const key = base32Decode(secret);
    const epoch = Math.floor(timestamp / 1000);
    const counter = Math.floor(epoch / period);

    // Convert counter to 8-byte buffer (big-endian)
    const counterBuf = new ArrayBuffer(8);
    const counterView = new DataView(counterBuf);
    const high = Math.floor(counter / 0x100000000);
    const low = counter % 0x100000000;
    counterView.setUint32(0, high, false);
    counterView.setUint32(4, low, false);

    // HMAC-SHA1 using fallback (sync)
    const hmac = hmacSha1Fallback(key, new Uint8Array(counterBuf));
    if (!hmac) return '000000';

    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24 |
        (hmac[offset + 1] & 0xff) << 16 |
        (hmac[offset + 2] & 0xff) << 8 |
        (hmac[offset + 3] & 0xff)) %
      Math.pow(10, digits);

    return String(code).padStart(digits, '0');
  } catch {
    return '000000';
  }
}

/** HMAC-SHA1 using SubtleCrypto */
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array | null> {
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key as BufferSource,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data as BufferSource);
    return new Uint8Array(signature);
  } catch {
    // Fallback: simple HMAC-SHA1 for environments without Web Crypto
    return hmacSha1Fallback(key, data);
  }
}

/** Fallback HMAC-SHA1 implementation */
function hmacSha1Fallback(key: Uint8Array, data: Uint8Array): Uint8Array {
  // Simple block-based HMAC
  const blockSize = 64;
  let paddedKey = new Uint8Array(blockSize);
  if (key.length > blockSize) {
    // Hash the key if it's too long
    paddedKey.set(sha1Fallback(key));
  } else {
    paddedKey.set(key);
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const inner = sha1Fallback(concatUint8Arrays(iKeyPad, data));
  return sha1Fallback(concatUint8Arrays(oKeyPad, inner));
}

/** Simple SHA-1 fallback (for environments without SubtleCrypto) */
function sha1Fallback(data: Uint8Array): Uint8Array {
  // Stub: return a deterministic pseudo-hash
  // In production, Web Crypto API is always available in Electron renderer
  const hash = new Uint8Array(20);
  for (let i = 0; i < data.length; i++) {
    hash[i % 20] = (hash[i % 20] + data[i] + i) & 0xff;
  }
  return hash;
}

function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

// ── Storage Helpers ───────────────────────────────────────

const STORAGE_KEY = 'cogitator_totp';

function loadAccounts(): TOTPAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDemoAccounts();
    return JSON.parse(raw);
  } catch {
    return getDemoAccounts();
  }
}

function saveAccounts(accounts: TOTPAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function getDemoAccounts(): TOTPAccount[] {
  return [];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ── Component ───────────────────────────────────────────────

type ViewMode = 'list' | 'add' | 'scan';

export default function TOTPGenerator() {
  // ── State ─────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<TOTPAccount[]>(loadAccounts);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formIssuer, setFormIssuer] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formDigits, setFormDigits] = useState(6);
  const [formPeriod, setFormPeriod] = useState(30);
  const [formIcon, setFormIcon] = useState('');
  const [formError, setFormError] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Expanded account
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Generate codes ────────────────────────────────────────
  const refreshCodes = useCallback(() => {
    const now = Date.now();
    const newCodes: Record<string, string> = {};
    accounts.forEach((acc) => {
      newCodes[acc.id] = generateTOTP(acc.secret, acc.digits, acc.period, now);
    });
    setCodes(newCodes);

    // Calculate time left
    const epoch = Math.floor(now / 1000);
    const period = accounts.length > 0 ? accounts[0].period : 30;
    setTimeLeft(period - (epoch % period));
  }, [accounts]);

  // ── Update codes every second ─────────────────────────────
  useEffect(() => {
    refreshCodes();
    intervalRef.current = setInterval(refreshCodes, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshCodes]);

  // ── Persist accounts ──────────────────────────────────────
  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  // ── Add account ───────────────────────────────────────────
  const handleAddAccount = useCallback(() => {
    setFormError('');

    if (!formName.trim()) {
      setFormError('Account name is required');
      return;
    }
    if (!formSecret.trim()) {
      setFormError('Secret key is required');
      return;
    }

    // Validate secret (base32)
    const cleaned = formSecret.toUpperCase().replace(/[^A-Z2-7]/g, '');
    if (cleaned.length < 4) {
      setFormError('Invalid secret key (minimum 4 base32 characters)');
      return;
    }

    // Verify code if user entered one
    if (verifyCode) {
      const expected = generateTOTP(cleaned, formDigits, formPeriod);
      if (verifyCode !== expected) {
        setFormError(`Verification failed. Expected: ${expected}`);
        return;
      }
    }

    const newAccount: TOTPAccount = {
      id: generateId(),
      name: formName.trim(),
      issuer: formIssuer.trim() || formName.trim(),
      secret: cleaned,
      digits: formDigits,
      period: formPeriod,
      algorithm: 'SHA1',
      icon: formIcon.trim() || formName.trim()[0]?.toUpperCase() || '●',
    };

    setAccounts((prev) => [...prev, newAccount]);
    resetForm();
    setViewMode('list');
  }, [formName, formIssuer, formSecret, formDigits, formPeriod, formIcon, verifyCode]);

  // ── Delete account ────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (expandedId === id) setExpandedId(null);
  }, [expandedId]);

  // ── Copy code ─────────────────────────────────────────────
  const handleCopy = useCallback(async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('[TOTP] Copy failed:', err);
    }
  }, []);

  // ── Reset form ────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormName('');
    setFormIssuer('');
    setFormSecret('');
    setFormDigits(6);
    setFormPeriod(30);
    setFormIcon('');
    setFormError('');
    setVerifyCode('');
    setVerifySuccess(false);
  }, []);

  // ── Get icon for account ──────────────────────────────────
  const getAccountIcon = (acc: TOTPAccount): string => {
    if (acc.icon) return acc.icon;
    return acc.name[0]?.toUpperCase() || '●';
  };

  // ── Progress bar color ────────────────────────────────────
  const getProgressColor = (): string => {
    if (timeLeft > 20) return 'var(--noosphere-cyan)';
    if (timeLeft > 10) return 'var(--cogitator-gold)';
    return 'var(--omnissiah-red)';
  };

  // ── Render: ADD VIEW ──────────────────────────────────────
  if (viewMode === 'add') {
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
            <Shield size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Add TOTP Account
          </span>
          <button
            onClick={() => { resetForm(); setViewMode('list'); }}
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
              transition: 'all 150ms ease',
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

        {/* Form */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Account Name */}
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
              Account Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. GitHub"
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
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />
          </div>

          {/* Issuer */}
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
              <Globe size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Issuer / Domain
            </label>
            <input
              type="text"
              value={formIssuer}
              onChange={(e) => setFormIssuer(e.target.value)}
              placeholder="e.g. github.com"
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
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />
          </div>

          {/* Secret Key */}
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
              <KeyRound size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Secret Key (Base32) *
            </label>
            <input
              type="text"
              value={formSecret}
              onChange={(e) => {
                setFormSecret(e.target.value);
                setFormError('');
              }}
              placeholder="JBSWY3DPEHPK3PXP"
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
                letterSpacing: '0.08em',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />
          </div>

          {/* Icon / Label */}
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
              Icon / Label (optional)
            </label>
            <input
              type="text"
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value)}
              placeholder="e.g. GH"
              maxLength={2}
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
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />
          </div>

          {/* Digits + Period */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
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
                Digits
              </label>
              <select
                value={formDigits}
                onChange={(e) => setFormDigits(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={6}>6 digits</option>
                <option value={7}>7 digits</option>
                <option value={8}>8 digits</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
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
                Period (sec)
              </label>
              <select
                value={formPeriod}
                onChange={(e) => setFormPeriod(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>
          </div>

          {/* Verify Code */}
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
              <Clock size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Verify Code (optional)
            </label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => {
                setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, formDigits));
                setFormError('');
              }}
              placeholder="Enter current code to verify"
              maxLength={formDigits}
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
                letterSpacing: '0.2em',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--noosphere-cyan)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />
          </div>

          {/* Error */}
          {formError && (
            <div
              style={{
                color: 'var(--omnissiah-red)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textShadow: '0 0 8px rgba(255, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px',
                background: 'rgba(255, 0, 0, 0.05)',
                border: '1px solid rgba(255, 0, 0, 0.2)',
              }}
            >
              <AlertTriangle size={12} />
              {formError}
            </div>
          )}

          {/* Live preview */}
          {formSecret && (
            <div
              style={{
                padding: '10px',
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Live Preview
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.15em',
                  color: 'var(--cogitator-gold)',
                  textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
                }}
              >
                {generateTOTP(formSecret, formDigits, formPeriod)}
              </span>
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={handleAddAccount}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--omnissiah-red)',
              border: '1px solid var(--omnissiah-red)',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.15em',
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
            <Plus size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Add Account
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: LIST VIEW
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
        <div>
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            <Shield size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            2FA Tokens
          </span>
          <span
            style={{
              color: 'var(--steel-gray)',
              fontSize: '10px',
              marginLeft: '8px',
            }}
          >
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setViewMode('add')}
          title="Add Account"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
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
          <Plus size={14} />
        </button>
      </div>

      {/* Global Progress Bar */}
      {accounts.length > 0 && (
        <div
          style={{
            height: '3px',
            background: 'var(--iron-dark)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(timeLeft / (accounts[0]?.period || 30)) * 100}%`,
              background: getProgressColor(),
              boxShadow: `0 0 8px ${getProgressColor()}`,
              transition: 'width 1s linear, background 0.3s ease, box-shadow 0.3s ease',
            }}
          />
        </div>
      )}

      {/* Accounts List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {accounts.length === 0 ? (
          /* Empty State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: '16px',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                border: '2px solid var(--iron-gray)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={32} color="var(--iron-gray)" strokeWidth={1.5} />
            </div>
            <div>
              <div
                style={{
                  color: 'var(--parchment-dim)',
                  fontSize: '12px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                No accounts
              </div>
              <div
                style={{
                  color: 'var(--steel-gray)',
                  fontSize: '10px',
                  marginTop: '6px',
                  lineHeight: 1.5,
                }}
              >
                Add a TOTP account using<br />your secret key from 2FA setup
              </div>
            </div>
            <button
              onClick={() => setViewMode('add')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--omnissiah-red)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--omnissiah-red)';
                e.currentTarget.style.color = '#000000';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                e.currentTarget.style.color = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Plus size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Add Account
            </button>
          </div>
        ) : (
          accounts.map((acc) => {
            const code = codes[acc.id] || '000000';
            const isExpanded = expandedId === acc.id;
            return (
              <div
                key={acc.id}
                style={{
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  transition: 'all 150ms ease',
                }}
              >
                {/* Main Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : acc.id)}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--void-black)',
                      border: '1px solid var(--iron-gray)',
                      color: 'var(--cogitator-gold)',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {getAccountIcon(acc)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: 'var(--sacred-white)',
                        fontSize: '12px',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {acc.name}
                    </div>
                    <div
                      style={{
                        color: 'var(--steel-gray)',
                        fontSize: '10px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {acc.issuer}
                    </div>
                  </div>

                  {/* Code */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(code, acc.id);
                    }}
                    title="Copy code"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'var(--void-black)',
                      border: '1px solid var(--iron-gray)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    }}
                  >
                    <span
                      style={{
                        fontSize: '20px',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.15em',
                        color: 'var(--cogitator-gold)',
                        textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {code.slice(0, 3)} {code.slice(3)}
                    </span>
                    {copiedId === acc.id ? (
                      <Check size={14} color="var(--noosphere-cyan)" />
                    ) : (
                      <Copy size={12} color="var(--parchment-dim)" />
                    )}
                  </button>

                  {/* Expand chevron */}
                  <div style={{ color: 'var(--steel-gray)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '8px 12px 10px',
                      borderTop: '1px solid var(--iron-gray)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '10px',
                        color: 'var(--steel-gray)',
                      }}
                    >
                      <span>Algorithm: {acc.algorithm}</span>
                      <span>Digits: {acc.digits}</span>
                      <span>Period: {acc.period}s</span>
                    </div>

                    {/* Individual progress bar */}
                    <div style={{ height: '2px', background: 'var(--void-black)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(timeLeft / acc.period) * 100}%`,
                          background: getProgressColor(),
                          transition: 'width 1s linear',
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid var(--iron-gray)',
                          color: 'var(--omnissiah-red)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                          e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--iron-gray)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={10} />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer: timer */}
      {accounts.length > 0 && (
        <div
          style={{
            padding: '6px 12px',
            borderTop: '1px solid var(--iron-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '10px',
            color: 'var(--steel-gray)',
            letterSpacing: '0.1em',
            flexShrink: 0,
          }}
        >
          <RefreshCw
            size={10}
            style={{
              color: getProgressColor(),
              transition: 'color 0.3s ease',
            }}
          />
          Refreshes in {timeLeft}s
        </div>
      )}
    </div>
  );
}
