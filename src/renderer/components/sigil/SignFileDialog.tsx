// ═══════════════════════════════════════════════════════════
// SignFileDialog — File Signing Interface
// COGITATOR BROWSER v2 | Dark Mechanicus Edition
//
// UI for selecting a file and a certificate, then applying
// a digital signature. Shows hash, signature hex, and result.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import {
  FileText,
  FileSignature,
  Hash,
  Fingerprint,
  Clock,
  ChevronDown,
  Download,
  Copy,
  CheckCircle,
  AlertTriangle,
  PenTool,
  X,
} from 'lucide-react';
import type { Certificate, Signature, SigilConfig } from '../../../shared/types';

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
  noosphereCyanDim: '#007777',
  parchment: '#D4C5A0',
  parchmentDim: '#8B7D6B',
  sacredWhite: '#E8E8E8',
  fontMono: "'Courier New', 'Consolas', 'Monaco', monospace",
} as const;

const glowRed = '0 0 12px rgba(255, 0, 0, 0.5)';
const glowGold = '0 0 10px rgba(200, 168, 75, 0.3)';

// ── Props ─────────────────────────────────────────────────

interface SignFileDialogProps {
  certificates: Certificate[];
  config: SigilConfig | null;
  onSignComplete: () => void;
}

// ═══ Component ════════════════════════════════════════════

export default function SignFileDialog({
  certificates,
  config: _config,
  onSignComplete,
}: SignFileDialogProps) {
  const [filePath, setFilePath] = useState('');
  const [selectedCertId, setSelectedCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Signature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [detached, setDetached] = useState(true);

  // ── Handlers ────────────────────────────────────────────

  const handleBrowseFile = useCallback(async () => {
    const path = await window.electronAPI.sigil.openFileDialog({
      title: 'Select File to Sign',
    });
    if (path) {
      setFilePath(path);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleSign = useCallback(async () => {
    if (!filePath) {
      setError('Select a file first');
      return;
    }
    if (!selectedCertId) {
      setError('Select a certificate');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Update detached signature config
      await window.electronAPI.sigil.setConfig({ detachedSignature: detached });

      const sig = await window.electronAPI.sigil.signFile(filePath, selectedCertId);
      setResult(sig);
      onSignComplete();
    } catch (err: any) {
      setError(err.message || 'Signing failed');
    } finally {
      setLoading(false);
    }
  }, [filePath, selectedCertId, detached, onSignComplete]);

  const handleCopyHash = useCallback(() => {
    if (result?.hashHex) {
      navigator.clipboard.writeText(result.hashHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [result]);

  const handleSaveSigFile = useCallback(() => {
    if (!result) return;
    const sigData = {
      algorithm: result.algorithm,
      hash: result.hashHex,
      signature: result.signatureHex,
      certificate: result.certificateName,
      date: result.signDate,
      fileName: result.fileName,
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(sigData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.fileName}.sig`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const selectedCert = certificates.find((c) => c.id === selectedCertId);

  // ═══ Render ═══════════════════════════════════════════════

  return (
    <div>
      {/* ── File Selection ──────────────────────────────── */}
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            color: STYLE.cogitatorGold,
            fontSize: '9px',
            letterSpacing: '0.1em',
            marginBottom: '4px',
            textTransform: 'uppercase',
          }}
        >
          <FileText size={10} style={{ display: 'inline', marginRight: '4px' }} />
          TARGET FILE
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            readOnly
            value={filePath}
            placeholder="Click BROWSE to select file..."
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
            onClick={handleBrowseFile}
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

      {/* ── Certificate Selection ───────────────────────── */}
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            color: STYLE.cogitatorGold,
            fontSize: '9px',
            letterSpacing: '0.1em',
            marginBottom: '4px',
            textTransform: 'uppercase',
          }}
        >
          <PenTool size={10} style={{ display: 'inline', marginRight: '4px' }} />
          SIGNING CERTIFICATE
        </label>
        {certificates.length === 0 ? (
          <div
            style={{
              padding: '8px',
              border: `1px dashed ${STYLE.omnissiahRedDim}`,
              color: STYLE.omnissiahRed,
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={12} />
            No certificates available. Import or generate one first.
          </div>
        ) : (
          <>
            <div
              style={{
                position: 'relative',
              }}
            >
              <select
                value={selectedCertId}
                onChange={(e) => {
                  setSelectedCertId(e.target.value);
                  setError(null);
                }}
                style={{
                  width: '100%',
                  padding: '7px 28px 7px 8px',
                  background: STYLE.voidBlack,
                  border: `1px solid ${selectedCertId ? STYLE.noosphereCyan : STYLE.ironGray}`,
                  color: selectedCertId ? STYLE.sacredWhite : STYLE.parchmentDim,
                  fontFamily: STYLE.fontMono,
                  fontSize: '10px',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">-- SELECT CERTIFICATE --</option>
                {certificates.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.name} ({cert.type.toUpperCase()}) — {cert.subject}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: STYLE.parchmentDim,
                }}
              />
            </div>
            {selectedCert && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '6px 8px',
                  border: `1px solid ${STYLE.ironGray}`,
                  background: STYLE.voidBlack,
                  fontSize: '9px',
                  color: STYLE.parchmentDim,
                }}
              >
                <div>
                  <span style={{ color: STYLE.cogitatorGoldDim }}>SUBJECT:</span>{' '}
                  {selectedCert.subject}
                </div>
                <div>
                  <span style={{ color: STYLE.cogitatorGoldDim }}>THUMBPRINT:</span>{' '}
                  <span style={{ color: STYLE.noosphereCyan, fontFamily: STYLE.fontMono }}>
                    {selectedCert.thumbprint.slice(0, 16)}...
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Options ─────────────────────────────────────── */}
      <div
        style={{
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: STYLE.parchmentDim,
            fontSize: '10px',
            cursor: 'pointer',
            fontFamily: STYLE.fontMono,
          }}
        >
          <input
            type="checkbox"
            checked={detached}
            onChange={(e) => setDetached(e.target.checked)}
            style={{
              accentColor: STYLE.omnissiahRed,
              width: '12px',
              height: '12px',
            }}
          />
          DETACHED SIGNATURE (.sig file)
        </label>
      </div>

      {/* ── Error ───────────────────────────────────────── */}
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

      {/* ── Apply Sigil Button ──────────────────────────── */}
      <button
        onClick={handleSign}
        disabled={loading || certificates.length === 0}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: `2px solid ${STYLE.omnissiahRed}`,
          color: STYLE.omnissiahRed,
          fontFamily: STYLE.fontMono,
          fontSize: '12px',
          letterSpacing: '0.2em',
          fontWeight: 'bold',
          cursor: loading || certificates.length === 0 ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          transition: 'all 150ms ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          opacity: loading || certificates.length === 0 ? 0.5 : 1,
          textShadow: '0 0 5px rgba(255,0,0,0.3)',
        }}
        onMouseEnter={(e) => {
          if (!loading && certificates.length > 0) {
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
            <FileSignature size={16} className="pulse" />
            APPLYING SIGIL...
          </>
        ) : (
          <>
            <PenTool size={16} />
            APPLY SIGIL
          </>
        )}
      </button>

      {/* ── Result ──────────────────────────────────────── */}
      {result && (
        <div
          style={{
            marginTop: '16px',
            border: `1px solid ${STYLE.noosphereCyan}`,
            background: 'rgba(0,191,191,0.03)',
          }}
        >
          {/* Result header */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: `1px solid ${STYLE.ironGray}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={14} color={STYLE.noosphereCyan} />
            <span
              style={{
                color: STYLE.noosphereCyan,
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
              }}
            >
              FILE SIGNED SUCCESSFULLY
            </span>
          </div>

          {/* Result details */}
          <div style={{ padding: '10px' }}>
            {/* File name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <FileText size={12} color={STYLE.cogitatorGold} />
              <span style={{ color: STYLE.sacredWhite, fontSize: '11px', fontWeight: 'bold' }}>
                {result.fileName}
              </span>
            </div>

            {/* Grid of details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '4px 10px',
                fontSize: '10px',
                marginBottom: '10px',
              }}
            >
              <span style={{ color: STYLE.cogitatorGoldDim }}>ALGORITHM</span>
              <span style={{ color: STYLE.noosphereCyan }}>{result.algorithm}</span>

              <span style={{ color: STYLE.cogitatorGoldDim }}>CERTIFICATE</span>
              <span style={{ color: STYLE.parchment }}>{result.certificateName}</span>

              <span style={{ color: STYLE.cogitatorGoldDim }}>TIMESTAMP</span>
              <span style={{ color: STYLE.parchment }}>{formatDate(result.signDate)}</span>

              <span style={{ color: STYLE.cogitatorGoldDim }}>
                <Hash size={9} style={{ display: 'inline' }} /> HASH
              </span>
              <span
                style={{
                  color: STYLE.noosphereCyan,
                  fontFamily: STYLE.fontMono,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {result.hashHex}
              </span>

              <span style={{ color: STYLE.cogitatorGoldDim }}>
                <Fingerprint size={9} style={{ display: 'inline' }} /> SIGNATURE
              </span>
              <span
                style={{
                  color: STYLE.parchmentDim,
                  fontFamily: STYLE.fontMono,
                  fontSize: '9px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {result.signatureHex.slice(0, 48)}...
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopyHash}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '6px',
                  background: 'transparent',
                  border: `1px solid ${STYLE.steelGray}`,
                  color: copied ? STYLE.noosphereCyan : STYLE.parchment,
                  fontFamily: STYLE.fontMono,
                  fontSize: '9px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = STYLE.cogitatorGold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = STYLE.steelGray;
                }}
              >
                {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
                {copied ? 'COPIED' : 'COPY HASH'}
              </button>
              <button
                onClick={handleSaveSigFile}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '6px',
                  background: 'transparent',
                  border: `1px solid ${STYLE.cogitatorGold}`,
                  color: STYLE.cogitatorGold,
                  fontFamily: STYLE.fontMono,
                  fontSize: '9px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(200,168,75,0.1)';
                  e.currentTarget.style.boxShadow = glowGold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Download size={10} />
                SAVE .SIG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
