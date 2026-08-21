// ═══ SETTINGS PANEL ═══
// Configuration panel for Ollama, models, and VPN

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Server,
  BrainCircuit,
  Shield,
  Save,
  Loader2,
  Power,
  PowerOff,
  Check,
  AlertTriangle,
  FormInput,
  Database,
} from 'lucide-react';
import { type OllamaConfig, type VPNStatus } from '../../../shared/types';
import { DEFAULT_LLAMA_SERVER_URL, DEFAULT_LLM_PROVIDER, DEFAULT_ANATHEMETRON_MODEL } from '../../../shared/constants';
import DarkModeSchedule from './DarkModeSchedule';
import AutoFillSettings from '../autofill/AutoFillSettings';
import BackupPanel from './BackupPanel';

// ── Component ───────────────────────────────────────────────

export default function SettingsPanel() {
  // ── State ─────────────────────────────────────────────────

  // Ollama
  const [ollamaHost, setOllamaHost] = useState<string>(DEFAULT_LLAMA_SERVER_URL);
  const [savedHost, setSavedHost] = useState<string>(DEFAULT_LLAMA_SERVER_URL);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Ollama status
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false);

  // VPN
  const [vpnStatus, setVpnStatus] = useState<VPNStatus>({ connected: false });
  const [isVpnLoading, setIsVpnLoading] = useState<boolean>(false);

  // ── Load initial config ───────────────────────────────────

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electronAPI.ollama.getConfig();
        if (config.host) {
          setOllamaHost(config.host);
          setSavedHost(config.host);
        }
        if (config.model) {
          setSelectedModel(config.model);
        }
      } catch (error) {
        console.warn('[Settings] Failed to load config:', error);
      }
    };

    loadConfig();
    checkOllamaStatus();
    checkVpnStatus();

    // Periodic status checks
    const ollamaInterval = setInterval(checkOllamaStatus, 5000);
    const vpnInterval = setInterval(checkVpnStatus, 5000);

    return () => {
      clearInterval(ollamaInterval);
      clearInterval(vpnInterval);
    };
  }, []);

  // ── Status checkers ───────────────────────────────────────

  const checkOllamaStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.ollama.checkStatus();
      setOllamaOnline(status);
      if (status) {
        refreshModels();
      }
    } catch {
      setOllamaOnline(false);
    }
  }, []);

  const checkVpnStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.vpn.getStatus();
      setVpnStatus(status);
    } catch {
      setVpnStatus({ connected: false });
    }
  }, []);

  // ── Model management ──────────────────────────────────────

  const refreshModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const modelList = await window.electronAPI.ollama.listModels();
      setModels(modelList);
    } catch (error) {
      console.error('[Settings] Failed to list models:', error);
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // ── Save Ollama config ────────────────────────────────────

  const handleSaveOllamaConfig = useCallback(async () => {
    setSaveStatus('');
    try {
      const config: OllamaConfig = {
        host: ollamaHost || DEFAULT_LLAMA_SERVER_URL,
        model: selectedModel || DEFAULT_ANATHEMETRON_MODEL,
        provider: DEFAULT_LLM_PROVIDER,
      };
      await window.electronAPI.ollama.setConfig(config);
      setSavedHost(ollamaHost);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);

      // Recheck status with new host
      await checkOllamaStatus();
    } catch (error) {
      console.error('[Settings] Failed to save config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  }, [ollamaHost, selectedModel, checkOllamaStatus]);

  // ── VPN controls ──────────────────────────────────────────

  const handleVpnStart = useCallback(async () => {
    setIsVpnLoading(true);
    try {
      await window.electronAPI.vpn.start();
      await new Promise((r) => setTimeout(r, 1000));
      await checkVpnStatus();
    } catch (error) {
      console.error('[Settings] VPN start error:', error);
    } finally {
      setIsVpnLoading(false);
    }
  }, [checkVpnStatus]);

  const handleVpnStop = useCallback(async () => {
    setIsVpnLoading(true);
    try {
      await window.electronAPI.vpn.stop();
      await new Promise((r) => setTimeout(r, 1000));
      await checkVpnStatus();
    } catch (error) {
      console.error('[Settings] VPN stop error:', error);
    } finally {
      setIsVpnLoading(false);
    }
  }, [checkVpnStatus]);

  // ── Render helpers ────────────────────────────────────────

  const renderDivider = (icon: React.ReactNode, label: string) => (
    <div
      className="mech-divider"
      style={{
        marginTop: '16px',
        marginBottom: '8px',
        fontSize: 'var(--font-size-xs)',
      }}
    >
      {icon}
      <span style={{ color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        gap: '8px',
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Header */}
      <div className="mech-header">
        <Settings size={14} style={{ color: 'var(--cogitator-gold)' }} />
        <span>Machine Spirit Config</span>
      </div>

      {/* ── OLLAMA HOST SECTION ─────────────────────────────── */}
      {renderDivider(<Server size={12} />, 'Ollama Host')}

      <div
        style={{
          padding: '12px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Host input */}
        <div>
          <label
            style={{
              display: 'block',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            Host URL
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={ollamaHost}
              onChange={(e) => setOllamaHost(e.target.value)}
              placeholder={DEFAULT_LLAMA_SERVER_URL}
              style={{
                flex: 1,
                padding: '8px 10px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-sm)',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow =
                  '0 0 8px rgba(255, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSaveOllamaConfig}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background:
                  saveStatus === 'saved'
                    ? 'rgba(0, 191, 191, 0.15)'
                    : 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))',
                border: '1px solid',
                borderColor:
                  saveStatus === 'saved'
                    ? 'var(--noosphere-cyan)'
                    : 'var(--omnissiah-red)',
                color:
                  saveStatus === 'saved'
                    ? 'var(--noosphere-cyan)'
                    : 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (saveStatus !== 'saved') {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
                  e.currentTarget.style.boxShadow = 'var(--glow-red)';
                }
              }}
              onMouseLeave={(e) => {
                if (saveStatus !== 'saved') {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {saveStatus === 'saved' ? (
                <>
                  <Check size={12} />
                  <span>Saved</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertTriangle size={12} />
                  <span>Error</span>
                </>
              ) : (
                <>
                  <Save size={12} />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: ollamaOnline
                ? 'var(--noosphere-cyan)'
                : 'var(--omnissiah-red)',
              boxShadow: ollamaOnline
                ? '0 0 6px var(--noosphere-cyan-glow)'
                : '0 0 6px var(--omnissiah-red-glow)',
            }}
          />
          <span
            style={{
              color: ollamaOnline
                ? 'var(--noosphere-cyan)'
                : 'var(--omnissiah-red)',
              textTransform: 'uppercase' as const,
            }}
          >
            {ollamaOnline ? 'Connected' : 'Disconnected'}
          </span>
          {savedHost !== ollamaHost && (
            <span style={{ color: 'var(--cogitator-gold)', marginLeft: '8px' }}>
              (unsaved changes)
            </span>
          )}
        </div>
      </div>

      {/* ── MODEL SECTION ───────────────────────────────────── */}
      {renderDivider(<BrainCircuit size={12} />, 'Model')}

      <div
        style={{
          padding: '12px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <label
          style={{
            display: 'block',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
          }}
        >
          Active Model
        </label>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Model select */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!ollamaOnline || models.length === 0}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: ollamaOnline ? 'var(--sacred-white)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              outline: 'none',
              cursor: ollamaOnline ? 'pointer' : 'not-allowed',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
            }}
          >
            {models.length === 0 ? (
              <option value="">
                {ollamaOnline ? 'No models found' : 'Ollama offline'}
              </option>
            ) : (
              models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))
            )}
          </select>

          {/* Refresh button */}
          <button
            onClick={refreshModels}
            disabled={isLoadingModels || !ollamaOnline}
            title="Refresh models"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: 'var(--void-black)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.color = 'var(--sacred-white)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
          >
            {isLoadingModels ? (
              <Loader2 size={14} className="loading-cog" />
            ) : (
              <BrainCircuit size={14} />
            )}
          </button>
        </div>

        {/* Save model button */}
        <button
          onClick={handleSaveOllamaConfig}
          disabled={!selectedModel}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            background: selectedModel
              ? 'rgba(200, 168, 75, 0.1)'
              : 'var(--void-black)',
            border: '1px solid',
            borderColor: selectedModel
              ? 'var(--cogitator-gold-dim)'
              : 'var(--iron-gray)',
            color: selectedModel
              ? 'var(--cogitator-gold)'
              : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            cursor: selectedModel ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (selectedModel) {
              e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
              e.currentTarget.style.boxShadow = 'var(--glow-gold)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = selectedModel
              ? 'var(--cogitator-gold-dim)'
              : 'var(--iron-gray)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Save size={12} />
          <span>Set as Default Model</span>
        </button>
      </div>

      {/* ── VPN SECTION ─────────────────────────────────────── */}
      {renderDivider(<Shield size={12} />, 'VPN Tunnel')}

      <div
        style={{
          padding: '12px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* VPN Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <span style={{ color: 'var(--parchment-dim)' }}>VPN:</span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: vpnStatus.connected
                  ? 'var(--noosphere-cyan)'
                  : 'var(--omnissiah-red)',
                textShadow: vpnStatus.connected
                  ? '0 0 6px rgba(0, 191, 191, 0.4)'
                  : '0 0 6px rgba(255, 0, 0, 0.3)',
              }}
            >
              <span>●</span>
              <span style={{ textTransform: 'uppercase' as const }}>
                {vpnStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </span>
          </div>
          {vpnStatus.ip && (
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--parchment-dim)',
              }}
            >
              IP:{' '}
              <span style={{ color: 'var(--noosphere-cyan)' }}>
                {vpnStatus.ip}
              </span>
            </span>
          )}
        </div>

        {/* VPN Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {!vpnStatus.connected ? (
            <button
              onClick={handleVpnStart}
              disabled={isVpnLoading}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                background: isVpnLoading
                  ? 'var(--iron-gray)'
                  : 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))',
                border: '1px solid var(--omnissiah-red)',
                color: isVpnLoading
                  ? 'var(--text-muted)'
                  : 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                cursor: isVpnLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isVpnLoading) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
                  e.currentTarget.style.boxShadow = 'var(--glow-red)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isVpnLoading) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isVpnLoading ? (
                <Loader2 size={14} className="loading-cog" />
              ) : (
                <Power size={14} />
              )}
              <span>Initiate VPN</span>
            </button>
          ) : (
            <button
              onClick={handleVpnStop}
              disabled={isVpnLoading}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                background: isVpnLoading
                  ? 'var(--iron-gray)'
                  : 'linear-gradient(135deg, var(--noosphere-cyan-dim), var(--iron-dark))',
                border: '1px solid var(--noosphere-cyan)',
                color: isVpnLoading
                  ? 'var(--text-muted)'
                  : 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                cursor: isVpnLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isVpnLoading) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, var(--noosphere-cyan), var(--noosphere-cyan-dim))';
                  e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isVpnLoading) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, var(--noosphere-cyan-dim), var(--iron-dark))';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isVpnLoading ? (
                <Loader2 size={14} className="loading-cog" />
              ) : (
                <PowerOff size={14} />
              )}
              <span>Terminate VPN</span>
            </button>
          )}
        </div>

        {/* VPN info */}
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          The VPN tunnel encrypts all traffic through the Machine Spirit.
          Connection status is monitored continuously.
        </div>
      </div>

      {/* ── AUTOFILL SECTION ────────────────────────────────── */}
      {renderDivider(<FormInput size={12} />, 'Autofill')}
      <AutoFillSettings />

      {/* ── BACKUP & RESTORE SECTION ────────────────────────── */}
      {renderDivider(<Database size={12} />, 'Backup & Restore')}
      <BackupPanel />

      {/* ── NIGHT INTENSIFY SECTION ─────────────────────────── */}
      {renderDivider(<Settings size={12} />, 'Appearance')}
      <DarkModeSchedule />

      {/* ── ABOUT SECTION ───────────────────────────────────── */}
      {renderDivider(<Settings size={12} />, 'About')}

      <div
        style={{
          padding: '12px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--parchment-dim)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>App</span>
          <span style={{ color: 'var(--sacred-white)' }}>
            COGITATOR BROWSER
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Version</span>
          <span>2.0.0</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>AI Engine</span>
          <span style={{ color: 'var(--noosphere-cyan)' }}>Ollama</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Interface</span>
          <span style={{ color: 'var(--cogitator-gold)' }}>Anathemetron</span>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--iron-gray)',
            marginTop: '6px',
            paddingTop: '8px',
            textAlign: 'center',
            color: 'var(--steel-gray)',
            fontStyle: 'italic',
          }}
        >
          &quot;The Machine Spirit watches all who tread the Noosphere.&quot;
        </div>
      </div>
    </div>
  );
}
