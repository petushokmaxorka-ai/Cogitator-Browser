// ═══ BREACH CHECK PANEL ═══
// Password breach detection via Have I Been Pwned API.
// k-Anonymity model: only first 5 chars of SHA-1 hash are sent.
// "The Omnissiah sees all leaks. None shall remain hidden."

import { useState, useCallback, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  ScanLine,
} from 'lucide-react';
import type { VaultPasswordEntry } from '../../../shared/types';

// ── Types ───────────────────────────────────────────────────

interface BreachResult {
  password: string;
  title: string;
  id: string;
  count: number;
  safe: boolean;
}

interface BreachCheckPanelProps {
  passwords: Omit<VaultPasswordEntry, 'password'>[];
}

// ── Have I Been Pwned API Check ───────────────────────────

async function checkPasswordBreach(password: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const sha1Buffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(sha1Buffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}`,
    {
      headers: {
        'Add-Padding': 'true',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HIBP API error: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const [lineSuffix, count] = line.split(':');
    if (lineSuffix?.trim() === suffix) {
      return parseInt(count.trim(), 10);
    }
  }

  return 0; // Not found = not breached
}

// ── Component ───────────────────────────────────────────────

export default function BreachCheckPanel({ passwords }: BreachCheckPanelProps) {
  // ── State ─────────────────────────────────────────────────
  const [checkPassword, setCheckPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [singleResult, setSingleResult] = useState<BreachResult | null>(null);
  const [batchResults, setBatchResults] = useState<BreachResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isBatchChecking, setIsBatchChecking] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showBatch, setShowBatch] = useState(false);

  // ── Single password check ────────────────────────────────

  const handleCheckSingle = useCallback(async () => {
    if (!checkPassword.trim()) return;

    setIsChecking(true);
    setError(null);
    setSingleResult(null);

    try {
      const count = await checkPasswordBreach(checkPassword);
      setSingleResult({
        password: checkPassword,
        title: 'Manual Check',
        id: 'manual',
        count,
        safe: count === 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Breach check failed: ${msg}`);
    } finally {
      setIsChecking(false);
    }
  }, [checkPassword]);

  // ── Batch check all vault passwords ──────────────────────

  const handleCheckAll = useCallback(async () => {
    if (passwords.length === 0) return;

    setIsBatchChecking(true);
    setError(null);
    setBatchResults([]);
    setBatchProgress(0);
    setShowBatch(true);

    const results: BreachResult[] = [];

    for (let i = 0; i < passwords.length; i++) {
      const entry = passwords[i];
      try {
        // Fetch full entry to get actual password
        const full = await window.electronAPI.vault.getPassword(entry.id);
        if (full && full.password) {
          const count = await checkPasswordBreach(full.password);
          results.push({
            password: full.password,
            title: full.title,
            id: full.id,
            count,
            safe: count === 0,
          });
        }
      } catch {
        // Skip entries that fail to load or check
      }
      setBatchProgress(Math.round(((i + 1) / passwords.length) * 100));
    }

    setBatchResults(results);
    setIsBatchChecking(false);
  }, [passwords]);

  // ── Clear results ────────────────────────────────────────

  const handleClear = useCallback(() => {
    setCheckPassword('');
    setSingleResult(null);
    setBatchResults([]);
    setError(null);
    setShowBatch(false);
  }, []);

  // ── Status helpers ───────────────────────────────────────

  const breachedCount = batchResults.filter((r) => !r.safe).length;
  const safeCount = batchResults.filter((r) => r.safe).length;

  // ── Render ───────────────────────────────────────────────

  return (
    <div style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--iron-gray)',
        }}
      >
        <ShieldAlert
          size={14}
          strokeWidth={1.5}
          style={{ color: 'var(--omnissiah-red)' }}
        />
        <span
          style={{
            color: 'var(--omnissiah-red)',
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          Breach Check
        </span>
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '8px',
            letterSpacing: '0.08em',
          }}
        >
          Have I Been Pwned (k-Anon)
        </span>
      </div>

      {/* ── Single Password Input ─────────────────────────── */}
      <div style={{ marginBottom: '10px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '9px',
            color: 'var(--parchment-dim)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          Check Password
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={checkPassword}
              onChange={(e) => {
                setCheckPassword(e.target.value);
                setError(null);
                setSingleResult(null);
              }}
              placeholder="Enter password to check..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCheckSingle();
              }}
              style={{
                width: '100%',
                padding: '8px 32px 8px 10px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 150ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
              }}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
              }}
            >
              {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <button
            onClick={handleCheckSingle}
            disabled={!checkPassword.trim() || isChecking}
            style={{
              padding: '8px 14px',
              background: 'var(--omnissiah-red)',
              border: '1px solid var(--omnissiah-red)',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              opacity: !checkPassword.trim() || isChecking ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (checkPassword.trim() && !isChecking) {
                e.currentTarget.style.background = '#ff3333';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 0, 0, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isChecking ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Search size={12} />
            )}
            CHECK
          </button>
        </div>
      </div>

      {/* ── Check All Button ──────────────────────────────── */}
      {passwords.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={handleCheckAll}
            disabled={isBatchChecking}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              border: '1px solid var(--noosphere-cyan)',
              color: 'var(--noosphere-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: isBatchChecking ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isBatchChecking) {
                e.currentTarget.style.background = 'rgba(0, 191, 191, 0.08)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 191, 191, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ScanLine size={12} />
            CHECK ALL PASSWORDS ({passwords.length})
          </button>
        </div>
      )}

      {/* ── Progress Bar ──────────────────────────────────── */}
      {isBatchChecking && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                color: 'var(--noosphere-cyan)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Scanning vault...
            </span>
            <span
              style={{
                color: 'var(--noosphere-cyan)',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {batchProgress}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '3px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${batchProgress}%`,
                height: '100%',
                background: 'var(--noosphere-cyan)',
                transition: 'width 200ms ease',
                boxShadow: '0 0 6px var(--noosphere-cyan)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '8px',
            border: '1px solid var(--omnissiah-red-dim)',
            background: 'rgba(255, 0, 0, 0.05)',
            marginBottom: '10px',
          }}
        >
          <AlertTriangle
            size={12}
            style={{ color: 'var(--omnissiah-red)', flexShrink: 0, marginTop: '1px' }}
          />
          <span
            style={{
              color: 'var(--omnissiah-red)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.4,
            }}
          >
            {error}
          </span>
        </div>
      )}

      {/* ── Single Result ─────────────────────────────────── */}
      {singleResult && (
        <div
          style={{
            padding: '10px',
            border: `1px solid ${
              singleResult.safe ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)'
            }`,
            background: singleResult.safe
              ? 'rgba(0, 191, 191, 0.05)'
              : 'rgba(255, 0, 0, 0.05)',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {singleResult.safe ? (
              <ShieldCheck
                size={18}
                style={{ color: 'var(--noosphere-cyan)' }}
              />
            ) : (
              <ShieldAlert
                size={18}
                style={{
                  color: 'var(--omnissiah-red)',
                  filter: 'drop-shadow(0 0 6px rgba(255, 0, 0, 0.6))',
                }}
              />
            )}
            <div>
              <div
                style={{
                  color: singleResult.safe
                    ? 'var(--noosphere-cyan)'
                    : 'var(--omnissiah-red)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {singleResult.safe
                  ? '✓ SAFE — Not found in breaches'
                  : `✗ FOUND IN ${singleResult.count.toLocaleString()} BREACHES`}
              </div>
              {!singleResult.safe && (
                <div
                  style={{
                    color: 'var(--parchment-dim)',
                    fontSize: '9px',
                    marginTop: '2px',
                  }}
                >
                  This password has been compromised. Change it immediately.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Results Summary ─────────────────────────── */}
      {showBatch && !isBatchChecking && batchResults.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                color: 'var(--cogitator-gold)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 'bold',
              }}
            >
              Scan Results
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span
                style={{
                  color: 'var(--noosphere-cyan)',
                  fontSize: '9px',
                }}
              >
                Safe: {safeCount}
              </span>
              <span
                style={{
                  color: 'var(--omnissiah-red)',
                  fontSize: '9px',
                }}
              >
                Breached: {breachedCount}
              </span>
            </div>
          </div>

          {/* ── Results Table ─────────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 70px',
                padding: '6px 8px',
                background: 'var(--void-black)',
                borderBottom: '1px solid var(--iron-gray)',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              <span
                style={{
                  color: 'var(--parchment-dim)',
                  fontSize: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                Title
              </span>
              <span
                style={{
                  color: 'var(--parchment-dim)',
                  fontSize: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  textAlign: 'center',
                }}
              >
                Breaches
              </span>
              <span
                style={{
                  color: 'var(--parchment-dim)',
                  fontSize: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  textAlign: 'center',
                }}
              >
                Status
              </span>
            </div>

            {/* Table Rows */}
            {batchResults.map((result) => (
              <div
                key={result.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 70px',
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--iron-gray)',
                  background: result.safe
                    ? 'transparent'
                    : 'rgba(255, 0, 0, 0.04)',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: result.safe
                      ? 'var(--sacred-white)'
                      : 'var(--omnissiah-red)',
                    fontSize: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={result.title}
                >
                  {result.title}
                </span>
                <span
                  style={{
                    color: result.safe
                      ? 'var(--noosphere-cyan)'
                      : 'var(--omnissiah-red)',
                    fontSize: '10px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {result.count === 0 ? '—' : result.count.toLocaleString()}
                </span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {result.safe ? (
                    <CheckCircle2
                      size={14}
                      style={{ color: 'var(--noosphere-cyan)' }}
                    />
                  ) : (
                    <ShieldAlert
                      size={14}
                      style={{
                        color: 'var(--omnissiah-red)',
                        filter: 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.5))',
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Clear results button ──────────────────────── */}
          <button
            onClick={handleClear}
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
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
            <X size={10} />
            Clear Results
          </button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────── */}
      {!singleResult && !showBatch && !isChecking && !error && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 8px',
            gap: '8px',
            color: 'var(--text-muted)',
          }}
        >
          <ShieldCheck size={24} strokeWidth={1} style={{ opacity: 0.4 }} />
          <span
            style={{
              fontSize: '9px',
              textAlign: 'center',
              lineHeight: 1.5,
              maxWidth: '220px',
            }}
          >
            Check passwords against Have I Been Pwned database.
            <br />
            Uses k-Anonymity — your password is never sent.
          </span>
        </div>
      )}
    </div>
  );
}
