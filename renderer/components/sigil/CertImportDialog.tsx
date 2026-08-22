// ═══════════════════════════════════════════════════════════
// CertImportDialog — PKCS#12 Certificate Import
// COGITATOR BROWSER v2 | Dark Mechanicus Edition
//
// Modal dialog for importing .p12 / .pfx certificate files
// with password protection.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { Upload, Lock, Eye, EyeOff, X, Key } from 'lucide-react';

// ── Style Constants ───────────────────────────────────────

const STYLE = {
  voidBlack: '#000000',
  ironDark: '#1E1E1E',
  ironGray: '#2A2A2A',
  steelGray: '#3A3A3A',
  omnissiahRed: '#FF0000',
  omnissiahRedDim: '#8B0000',
  cogitatorGold: '#C8A84B',
  cogitatorGoldDim: '#8B7355',
  noosphereCyan: '#00BFBF',
  parchment: '#D4C5A0',
  parchmentDim: '#8B7D6B',
  sacredWhite: '#E8E8E8',
  fontMono: "'Courier New', 'Consolas', 'Monaco', monospace",
} as const;

const glowRed = '0 0 12px rgba(255, 0, 0, 0.5)';
const glowRedDim = '0 0 6px rgba(255, 0, 0, 0.2)';

// ── Props ─────────────────────────────────────────────────

interface CertImportDialogProps {
  onClose: () => void;
  onImportComplete: () => void;
}

// ═══ Component ════════════════════════════════════════════

export default function CertImportDialog({ onClose, onImportComplete }: CertImportDialogProps) {
  const [filePath, setFilePath] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────

  const handleBrowse = useCallback(async () => {
    const path = await window.electronAPI.sigil.openFileDialog({
      title: 'Select PKCS#12 Certificate File',
      filters: [
        { name: 'PKCS#12 Files', extensions: ['p12', 'pfx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (path) {
      setFilePath(path);
      setError(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!filePath) {
      setError('Please select a .p12 file');
      return;
    }
    if (!password) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const cert = await window.electronAPI.sigil.importP12(filePath, password);
      setSuccess(`Certificate imported: ${cert.name} (${cert.type.toUpperCase()})`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to import certificate');
    } finally {
      setLoading(false);
    }
  }, [filePath, password, onImportComplete, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleImport();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // ═══ Render ═══════════════════════════════════════════════

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: STYLE.fontMono,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: '380px',
          maxWidth: '90vw',
          background: STYLE.ironDark,
          border: `1px solid ${STYLE.ironGray}`,
          boxShadow: '0 0 30px rgba(0,0,0,0.8)',
        }}
      >
        {/* ── Header ────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: `1px solid ${STYLE.ironGray}`,
          }}
        >
          <div
            style={{
              color: STYLE.omnissiahRed,
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '0.15em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textShadow: glowRedDim,
            }}
          >
            <Upload size={14} />
            IMPORT CERTIFICATE
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: STYLE.parchmentDim,
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = STYLE.omnissiahRed;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = STYLE.parchmentDim;
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────── */}
        <div style={{ padding: '14px' }}>
          {/* File selection */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                color: STYLE.cogitatorGold,
                fontSize: '9px',
                letterSpacing: '0.1em',
                marginBottom: '5px',
                textTransform: 'uppercase',
              }}
            >
              PKCS#12 FILE (.p12 / .pfx)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                readOnly
                value={filePath}
                placeholder="Click BROWSE to select..."
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  background: STYLE.voidBlack,
                  border: `1px solid ${STYLE.ironGray}`,
                  color: filePath ? STYLE.sacredWhite : STYLE.parchmentDim,
                  fontFamily: STYLE.fontMono,
                  fontSize: '10px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleBrowse}
                style={{
                  padding: '7px 10px',
                  background: 'transparent',
                  border: `1px solid ${STYLE.steelGray}`,
                  color: STYLE.parchment,
                  fontFamily: STYLE.fontMono,
                  fontSize: '9px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = STYLE.cogitatorGold;
                  e.currentTarget.style.color = STYLE.cogitatorGold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = STYLE.steelGray;
                  e.currentTarget.style.color = STYLE.parchment;
                }}
              >
                BROWSE
              </button>
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                color: STYLE.cogitatorGold,
                fontSize: '9px',
                letterSpacing: '0.1em',
                marginBottom: '5px',
                textTransform: 'uppercase',
              }}
            >
              <Lock size={9} style={{ display: 'inline', marginRight: '4px' }} />
              PASSWORD
            </label>
            <div style={{ display: 'flex', gap: '6px', position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter PKCS#12 password..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  paddingRight: '32px',
                  background: STYLE.voidBlack,
                  border: `1px solid ${STYLE.ironGray}`,
                  color: STYLE.sacredWhite,
                  fontFamily: STYLE.fontMono,
                  fontSize: '10px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: STYLE.parchmentDim,
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
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
                padding: '8px',
                marginBottom: '12px',
                border: `1px solid ${STYLE.omnissiahRedDim}`,
                background: 'rgba(255,0,0,0.05)',
                color: STYLE.omnissiahRed,
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <X size={12} />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              style={{
                padding: '8px',
                marginBottom: '12px',
                border: `1px solid ${STYLE.noosphereCyan}`,
                background: 'rgba(0,191,191,0.05)',
                color: STYLE.noosphereCyan,
                fontSize: '10px',
              }}
            >
              {success}
            </div>
          )}

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: `2px solid ${STYLE.omnissiahRed}`,
              color: STYLE.omnissiahRed,
              fontFamily: STYLE.fontMono,
              fontSize: '11px',
              letterSpacing: '0.15em',
              fontWeight: 'bold',
              cursor: loading ? 'wait' : 'pointer',
              textTransform: 'uppercase',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255,0,0,0.1)';
                e.currentTarget.style.boxShadow = glowRed;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? (
              <>
                <Key size={14} className="spin" />
                IMPORTING...
              </>
            ) : (
              <>
                <Upload size={14} />
                IMPORT CERTIFICATE
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
