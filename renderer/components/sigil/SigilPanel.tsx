// ═══════════════════════════════════════════════════════════
// Sigil Panel — Digital Signature Control Center
// COGITATOR BROWSER v2 | Dark Mechanicus Edition
//
// Main panel for managing certificates, signing files,
// verifying signatures, and viewing signature history.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  Upload,
  Trash2,
  FileSignature,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Shield,
  Plus,
  Key,
  Fingerprint,
  Hash,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  FileText,
  Lock,
  Unlock,
} from 'lucide-react';
import type { Certificate, Signature, SigilConfig, VerifyResult } from '../../../shared/types';
import CertImportDialog from './CertImportDialog';
import SignFileDialog from './SignFileDialog';

// ── Sub-Tab Type ──────────────────────────────────────────

type SigilSubTab = 'certs' | 'sign' | 'history' | 'verify';

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

const glowRed = '0 0 10px rgba(255, 0, 0, 0.4)';
const glowGold = '0 0 10px rgba(200, 168, 75, 0.3)';
const glowCyan = '0 0 10px rgba(0, 191, 191, 0.3)';

// ═══ SigilPanel Component ═════════════════════════════════

export default function SigilPanel() {
  const [activeTab, setActiveTab] = useState<SigilSubTab>('certs');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [config, setConfig] = useState<SigilConfig | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyFile, setVerifyFile] = useState('');
  const [verifySigFile, setVerifySigFile] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCert, setExpandedCert] = useState<string | null>(null);

  // ── Load data ───────────────────────────────────────────

  const loadCertificates = useCallback(async () => {
    try {
      const certs = await window.electronAPI.sigil.getCertificates();
      setCertificates(certs);
    } catch (err) {
      console.error('[Sigil] Failed to load certificates:', err);
    }
  }, []);

  const loadSignatures = useCallback(async () => {
    try {
      const sigs = await window.electronAPI.sigil.getSignatures();
      setSignatures(sigs);
    } catch (err) {
      console.error('[Sigil] Failed to load signatures:', err);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await window.electronAPI.sigil.getConfig();
      setConfig(cfg);
    } catch (err) {
      console.error('[Sigil] Failed to load config:', err);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
    loadSignatures();
    loadConfig();
  }, [loadCertificates, loadSignatures, loadConfig]);

  // ── Handlers ────────────────────────────────────────────

  const handleDeleteCert = async (id: string) => {
    if (!window.confirm('Delete this certificate and its keys?')) return;
    await window.electronAPI.sigil.deleteCert(id);
    await loadCertificates();
  };

  const handleSelectVerifyFile = async () => {
    const path = await window.electronAPI.sigil.openFileDialog({
      title: 'Select File to Verify',
    });
    if (path) setVerifyFile(path);
  };

  const handleSelectSigFile = async () => {
    const path = await window.electronAPI.sigil.openSigFileDialog({
      title: 'Select Signature File',
    });
    if (path) setVerifySigFile(path);
  };

  const handleVerify = async () => {
    if (!verifyFile) return;
    setLoading(true);
    setVerifyResult(null);
    try {
      let result: VerifyResult;
      if (verifySigFile) {
        result = await window.electronAPI.sigil.verifySigFile(verifyFile, verifySigFile);
      } else {
        result = await window.electronAPI.sigil.verify(verifyFile, '');
      }
      setVerifyResult(result);
    } catch (err: any) {
      setVerifyResult({ valid: false, message: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSelfSigned = async () => {
    const name = window.prompt('Enter certificate name:');
    if (!name) return;
    setLoading(true);
    try {
      await window.electronAPI.sigil.generateSelfSigned(name);
      await loadCertificates();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSignature = async (id: string) => {
    await window.electronAPI.sigil.deleteSignature(id);
    await loadSignatures();
  };

  const formatDate = (ts: number | string) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const isExpired = (validTo: string) => {
    return new Date(validTo) < new Date();
  };

  // ── Sub-tab buttons ─────────────────────────────────────

  const tabs: { id: SigilSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'certs', label: 'CERTIFICATES', icon: <Shield size={12} /> },
    { id: 'sign', label: 'SIGN FILE', icon: <FileSignature size={12} /> },
    { id: 'history', label: 'HISTORY', icon: <Clock size={12} /> },
    { id: 'verify', label: 'VERIFY', icon: <FileCheck size={12} /> },
  ];

  // ═══ Render ═══════════════════════════════════════════════

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: STYLE.voidBlack,
        fontFamily: STYLE.fontMono,
        color: STYLE.parchment,
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: `1px solid ${STYLE.ironGray}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: STYLE.omnissiahRed,
            fontSize: '13px',
            letterSpacing: '0.2em',
            fontWeight: 'bold',
            textShadow: glowRed,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <PenTool size={16} />
          SIGIL ENGINE
        </div>
        <div
          style={{
            color: STYLE.parchmentDim,
            fontSize: '9px',
            letterSpacing: '0.15em',
            marginTop: '3px',
          }}
        >
          DIGITAL SIGNATURE CRYPTOGRAPHIC MODULE
        </div>
      </div>

      {/* ── Sub-Tab Bar ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${STYLE.ironGray}`,
          flexShrink: 0,
          background: STYLE.ironDark,
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setVerifyResult(null);
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '7px 4px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? `2px solid ${STYLE.omnissiahRed}`
                  : '2px solid transparent',
                color: isActive ? STYLE.omnissiahRed : STYLE.parchmentDim,
                fontFamily: STYLE.fontMono,
                fontSize: '9px',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                textTransform: 'uppercase',
                textShadow: isActive ? glowRed : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = STYLE.parchment;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = STYLE.parchmentDim;
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '10px',
        }}
      >
        {/* ═══ CERTIFICATES TAB ═══ */}
        {activeTab === 'certs' && (
          <div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setShowImport(true)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px',
                  background: 'transparent',
                  border: `1px solid ${STYLE.omnissiahRed}`,
                  color: STYLE.omnissiahRed,
                  fontFamily: STYLE.fontMono,
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,0,0,0.1)';
                  e.currentTarget.style.boxShadow = glowRed;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Upload size={12} />
                IMPORT .p12
              </button>
              <button
                onClick={handleGenerateSelfSigned}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px',
                  background: 'transparent',
                  border: `1px solid ${STYLE.noosphereCyan}`,
                  color: STYLE.noosphereCyan,
                  fontFamily: STYLE.fontMono,
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,191,191,0.1)';
                  e.currentTarget.style.boxShadow = glowCyan;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Key size={12} />
                GENERATE TEST
              </button>
            </div>

            {/* Certificate count */}
            <div
              style={{
                color: STYLE.parchmentDim,
                fontSize: '9px',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              {certificates.length} CERTIFICATE{certificates.length !== 1 ? 'S' : ''} IN SIGIL VAULT
            </div>

            {/* Certificate list */}
            {certificates.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  color: STYLE.parchmentDim,
                  fontSize: '10px',
                  border: `1px dashed ${STYLE.ironGray}`,
                }}
              >
                <Shield size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <div>NO CERTIFICATES</div>
                <div style={{ fontSize: '9px', marginTop: '4px' }}>
                  Import a .p12 file or generate a self-signed certificate
                </div>
              </div>
            ) : (
              certificates.map((cert) => (
                <div
                  key={cert.id}
                  style={{
                    border: `1px solid ${STYLE.ironGray}`,
                    marginBottom: '8px',
                    background: STYLE.ironDark,
                    transition: 'border-color 150ms ease',
                  }}
                >
                  {/* Cert header row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      gap: '8px',
                    }}
                    onClick={() =>
                      setExpandedCert(expandedCert === cert.id ? null : cert.id)
                    }
                  >
                    {expandedCert === cert.id ? (
                      <ChevronUp size={12} color={STYLE.cogitatorGold} />
                    ) : (
                      <ChevronDown size={12} color={STYLE.parchmentDim} />
                    )}
                    <Shield
                      size={14}
                      color={
                        isExpired(cert.validTo)
                          ? STYLE.omnissiahRed
                          : cert.hasPrivateKey
                          ? STYLE.noosphereCyan
                          : STYLE.cogitatorGold
                      }
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: STYLE.sacredWhite,
                          fontSize: '11px',
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cert.name}
                      </div>
                      <div
                        style={{
                          color: STYLE.parchmentDim,
                          fontSize: '9px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cert.subject}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      {/* Type badge */}
                      <span
                        style={{
                          padding: '1px 5px',
                          border: `1px solid ${STYLE.ironGray}`,
                          fontSize: '8px',
                          letterSpacing: '0.08em',
                          color: STYLE.parchmentDim,
                          textTransform: 'uppercase',
                        }}
                      >
                        {cert.type}
                      </span>
                      {/* Expiry indicator */}
                      {isExpired(cert.validTo) ? (
                        <AlertTriangle size={12} color={STYLE.omnissiahRed} aria-label="Expired" />
                      ) : (
                        <CheckCircle size={12} color={STYLE.noosphereCyan} aria-label="Valid" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCert(cert.id);
                        }}
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
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded cert details */}
                  {expandedCert === cert.id && (
                    <div
                      style={{
                        padding: '8px 10px 10px 30px',
                        borderTop: `1px solid ${STYLE.ironGray}`,
                        fontSize: '10px',
                      }}
                    >
                      <DetailRow label="SUBJECT" value={cert.subject} />
                      <DetailRow label="ISSUER" value={cert.issuer} />
                      <DetailRow label="SERIAL" value={cert.serialNumber} />
                      <DetailRow label="THUMBPRINT" value={cert.thumbprint} />
                      <DetailRow
                        label="VALID FROM"
                        value={formatDate(cert.validFrom)}
                      />
                      <DetailRow
                        label="VALID TO"
                        value={formatDate(cert.validTo)}
                        highlight={isExpired(cert.validTo) ? 'expired' : undefined}
                      />
                      <DetailRow
                        label="PRIVATE KEY"
                        value={cert.hasPrivateKey ? 'PRESENT' : 'ABSENT'}
                        highlight={cert.hasPrivateKey ? 'ok' : 'warn'}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ SIGN FILE TAB ═══ */}
        {activeTab === 'sign' && (
          <SignFileDialog
            certificates={certificates}
            config={config}
            onSignComplete={loadSignatures}
          />
        )}

        {/* ═══ HISTORY TAB ═══ */}
        {activeTab === 'history' && (
          <div>
            <div
              style={{
                color: STYLE.parchmentDim,
                fontSize: '9px',
                letterSpacing: '0.1em',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}
            >
              {signatures.length} SIGNATURE{signatures.length !== 1 ? 'S' : ''} IN LOG
            </div>

            {signatures.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  color: STYLE.parchmentDim,
                  fontSize: '10px',
                  border: `1px dashed ${STYLE.ironGray}`,
                }}
              >
                <FileSignature size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <div>NO SIGNATURES</div>
                <div style={{ fontSize: '9px', marginTop: '4px' }}>
                  Sign a file to see the record here
                </div>
              </div>
            ) : (
              [...signatures].reverse().map((sig) => (
                <div
                  key={sig.id}
                  style={{
                    border: `1px solid ${STYLE.ironGray}`,
                    marginBottom: '8px',
                    padding: '8px 10px',
                    background: STYLE.ironDark,
                    fontSize: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                    }}
                  >
                    <FileText size={12} color={STYLE.cogitatorGold} />
                    <span
                      style={{
                        color: STYLE.sacredWhite,
                        fontWeight: 'bold',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sig.fileName}
                    </span>
                    <button
                      onClick={() => handleDeleteSignature(sig.id)}
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
                      <X size={10} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: '2px 8px',
                      color: STYLE.parchmentDim,
                      fontSize: '9px',
                    }}
                  >
                    <span style={{ color: STYLE.cogitatorGoldDim }}>CERT:</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sig.certificateName}
                    </span>
                    <span style={{ color: STYLE.cogitatorGoldDim }}>DATE:</span>
                    <span>{formatDate(sig.signDate)}</span>
                    <span style={{ color: STYLE.cogitatorGoldDim }}>ALGO:</span>
                    <span>{sig.algorithm}</span>
                    <span style={{ color: STYLE.cogitatorGoldDim }}>HASH:</span>
                    <span
                      style={{
                        fontFamily: STYLE.fontMono,
                        color: STYLE.noosphereCyan,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sig.hashHex.slice(0, 24)}...
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ VERIFY TAB ═══ */}
        {activeTab === 'verify' && (
          <div>
            {/* File selection */}
            <div style={{ marginBottom: '10px' }}>
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
                ORIGINAL FILE
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={verifyFile}
                  placeholder="Click BROWSE to select file..."
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: STYLE.voidBlack,
                    border: `1px solid ${STYLE.ironGray}`,
                    color: verifyFile ? STYLE.sacredWhite : STYLE.parchmentDim,
                    fontFamily: STYLE.fontMono,
                    fontSize: '10px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSelectVerifyFile}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    border: `1px solid ${STYLE.steelGray}`,
                    color: STYLE.parchment,
                    fontFamily: STYLE.fontMono,
                    fontSize: '9px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
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

            {/* Signature file selection */}
            <div style={{ marginBottom: '14px' }}>
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
                <FileSignature size={10} style={{ display: 'inline', marginRight: '4px' }} />
                SIGNATURE FILE (.sig) — OPTIONAL
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={verifySigFile}
                  placeholder="Optional: select .sig file..."
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: STYLE.voidBlack,
                    border: `1px solid ${STYLE.ironGray}`,
                    color: verifySigFile ? STYLE.sacredWhite : STYLE.parchmentDim,
                    fontFamily: STYLE.fontMono,
                    fontSize: '10px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSelectSigFile}
                  style={{
                    padding: '6px 10px',
                    background: 'transparent',
                    border: `1px solid ${STYLE.steelGray}`,
                    color: STYLE.parchment,
                    fontFamily: STYLE.fontMono,
                    fontSize: '9px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
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

            {/* Verify button */}
            <button
              onClick={handleVerify}
              disabled={!verifyFile || loading}
              style={{
                width: '100%',
                padding: '10px',
                background: verifyFile ? 'transparent' : STYLE.ironDark,
                border: `1px solid ${verifyFile ? STYLE.noosphereCyan : STYLE.ironGray}`,
                color: verifyFile ? STYLE.noosphereCyan : STYLE.parchmentDim,
                fontFamily: STYLE.fontMono,
                fontSize: '11px',
                letterSpacing: '0.15em',
                cursor: verifyFile ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase',
                fontWeight: 'bold',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (verifyFile) {
                  e.currentTarget.style.background = 'rgba(0,191,191,0.1)';
                  e.currentTarget.style.boxShadow = glowCyan;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? (
                <>
                  <Clock size={14} />
                  VERIFYING...
                </>
              ) : (
                <>
                  <FileCheck size={14} />
                  VERIFY SIGNATURE
                </>
              )}
            </button>

            {/* Result */}
            {verifyResult && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  border: `1px solid ${verifyResult.valid ? STYLE.noosphereCyan : STYLE.omnissiahRed}`,
                  background: verifyResult.valid
                    ? 'rgba(0,191,191,0.05)'
                    : 'rgba(255,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  {verifyResult.valid ? (
                    <CheckCircle size={18} color={STYLE.noosphereCyan} />
                  ) : (
                    <AlertTriangle size={18} color={STYLE.omnissiahRed} />
                  )}
                  <span
                    style={{
                      color: verifyResult.valid ? STYLE.noosphereCyan : STYLE.omnissiahRed,
                      fontWeight: 'bold',
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {verifyResult.valid ? 'SIGNATURE VALID' : 'SIGNATURE INVALID'}
                  </span>
                </div>
                <div
                  style={{
                    color: STYLE.parchmentDim,
                    fontSize: '10px',
                    lineHeight: '1.5',
                  }}
                >
                  {verifyResult.message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Import Dialog ─────────────────────────────────── */}
      {showImport && (
        <CertImportDialog
          onClose={() => setShowImport(false)}
          onImportComplete={loadCertificates}
        />
      )}
    </div>
  );
}

// ═══ DetailRow Helper ═════════════════════════════════════

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'ok' | 'warn' | 'expired';
}) {
  const valueColor =
    highlight === 'ok'
      ? STYLE.noosphereCyan
      : highlight === 'expired' || highlight === 'warn'
      ? STYLE.omnissiahRed
      : STYLE.parchment;

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '2px 0',
      }}
    >
      <span style={{ color: STYLE.cogitatorGoldDim, minWidth: '90px', flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          color: valueColor,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}
