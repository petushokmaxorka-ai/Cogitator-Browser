// ═══ SITE SETTINGS PANEL ═══
// Per-site configuration and security inspection.
// The Machine Spirit grants or denies permissions as decreed.

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Lock,
  Unlock,
  Cookie,
  Image,
  Code,
  Ban,
  Fingerprint,
  Trash2,
  Plus,
  X,
  Check,
  AlertTriangle,
  ChevronRight,
  Eye,
  EyeOff,
  Settings,
} from 'lucide-react';
import { type SiteSetting, type SiteSecurityInfo } from '../../../shared/types';
import ScrollArea from '../ui/ScrollArea';

// ── Types ───────────────────────────────────────────────────

interface SiteSettingsPanelProps {
  activeTabUrl?: string;
}

// ── Constants ───────────────────────────────────────────────

const SETTINGS_STORAGE_KEY = 'cogitator_site_settings';
const WHITELIST_KEY = 'cogitator_site_whitelist';
const BLACKLIST_KEY = 'cogitator_site_blacklist';

// ── Storage Helpers ─────────────────────────────────────────

function loadAllSettings(): Record<string, SiteSetting> {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SiteSetting>) : {};
  } catch {
    return {};
  }
}

function saveAllSettings(settings: Record<string, SiteSetting>) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function loadWhitelist(): string[] {
  try {
    const raw = localStorage.getItem(WHITELIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveWhitelist(list: string[]) {
  localStorage.setItem(WHITELIST_KEY, JSON.stringify(list));
}

function loadBlacklist(): string[] {
  try {
    const raw = localStorage.getItem(BLACKLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveBlacklist(list: string[]) {
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(list));
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getDefaultSetting(hostname: string): SiteSetting {
  return {
    hostname,
    javascript: true,
    cookies: true,
    images: true,
    ads: true,
    fingerprint: true,
  };
}

// ── Toggle Component ────────────────────────────────────────

interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon: React.ReactNode;
  color?: string;
}

function Toggle({
  label,
  description,
  enabled,
  onChange,
  icon,
  color = 'var(--omnissiah-red)',
}: ToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: '1px solid var(--iron-gray)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color, display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <div>
          <div
            style={{
              color: 'var(--sacred-white)',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {label}
          </div>
          {description && (
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '8px',
                marginTop: '1px',
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        style={{
          position: 'relative',
          width: '36px',
          height: '18px',
          borderRadius: '9px',
          border: 'none',
          background: enabled ? color : 'var(--iron-gray)',
          cursor: 'pointer',
          transition: 'all 200ms ease',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '20px' : '2px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'var(--sacred-white)',
            transition: 'left 200ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────

export default function SiteSettingsPanel({ activeTabUrl }: SiteSettingsPanelProps) {
  // ── State ─────────────────────────────────────────────────
  const [settings, setSettings] = useState<Record<string, SiteSetting>>(
    loadAllSettings
  );
  const [whitelist, setWhitelist] = useState<string[]>(loadWhitelist);
  const [blacklist, setBlacklist] = useState<string[]>(loadBlacklist);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearedMessage, setClearedMessage] = useState<string | null>(null);

  // ── Derived state ─────────────────────────────────────────
  const hostname = activeTabUrl ? getHostname(activeTabUrl) : '';
  const isHttps = activeTabUrl?.startsWith('https://') ?? false;

  const currentSetting: SiteSetting = hostname
    ? settings[hostname] || getDefaultSetting(hostname)
    : getDefaultSetting('');

  const isWhitelisted = hostname ? whitelist.includes(hostname) : false;
  const isBlacklisted = hostname ? blacklist.includes(hostname) : false;

  const securityInfo: SiteSecurityInfo = {
    https: isHttps,
    connectionType: isHttps ? 'HTTPS/TLS 1.3' : 'HTTP (Insecure)',
    certificate: isHttps ? 'Valid certificate' : 'No certificate',
  };

  // ── Persist settings ──────────────────────────────────────
  useEffect(() => {
    saveAllSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveWhitelist(whitelist);
  }, [whitelist]);

  useEffect(() => {
    saveBlacklist(blacklist);
  }, [blacklist]);

  // ── Flash cleared message ─────────────────────────────────
  useEffect(() => {
    if (clearedMessage) {
      const timer = setTimeout(() => setClearedMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [clearedMessage]);

  // ── Handlers ──────────────────────────────────────────────

  const updateSetting = useCallback(
    (key: keyof SiteSetting, value: boolean) => {
      if (!hostname) return;
      setSettings((prev) => {
        const existing = prev[hostname] || getDefaultSetting(hostname);
        return {
          ...prev,
          [hostname]: { ...existing, [key]: value },
        };
      });
    },
    [hostname]
  );

  const handleAddToWhitelist = useCallback(() => {
    if (!hostname) return;
    setWhitelist((prev) =>
      prev.includes(hostname) ? prev : [...prev, hostname]
    );
    // Remove from blacklist if present
    setBlacklist((prev) => prev.filter((h) => h !== hostname));
    setClearedMessage('Site added to whitelist — all permissions granted');
  }, [hostname]);

  const handleRemoveFromWhitelist = useCallback(() => {
    if (!hostname) return;
    setWhitelist((prev) => prev.filter((h) => h !== hostname));
    setClearedMessage('Site removed from whitelist');
  }, [hostname]);

  const handleBlockSite = useCallback(() => {
    if (!hostname) return;
    setBlacklist((prev) =>
      prev.includes(hostname) ? prev : [...prev, hostname]
    );
    // Remove from whitelist if present
    setWhitelist((prev) => prev.filter((h) => h !== hostname));
    setClearedMessage('Site blocked — access denied');
  }, [hostname]);

  const handleUnblockSite = useCallback(() => {
    if (!hostname) return;
    setBlacklist((prev) => prev.filter((h) => h !== hostname));
    setClearedMessage('Site unblocked');
  }, [hostname]);

  const handleClearData = useCallback(() => {
    if (!hostname) return;
    // Remove site-specific settings
    setSettings((prev) => {
      const updated = { ...prev };
      delete updated[hostname];
      return updated;
    });
    setShowClearConfirm(false);
    setClearedMessage(`All data cleared for ${hostname}`);
  }, [hostname]);

  // ── Render: No active tab ─────────────────────────────────

  if (!activeTabUrl || !hostname) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          gap: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <Globe size={40} strokeWidth={1} style={{ opacity: 0.3 }} />
        <div
          style={{
            fontSize: '11px',
            textAlign: 'center',
            maxWidth: '200px',
            lineHeight: 1.5,
          }}
        >
          Navigate to a site to view and configure its permissions.
        </div>
      </div>
    );
  }

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
          <Shield
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
            Site Sigil
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div style={{ padding: '10px' }}>
          {/* ── Site Identity ───────────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              padding: '10px',
              marginBottom: '10px',
              background: 'var(--iron-dark)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}
            >
              <Globe
                size={16}
                strokeWidth={1.5}
                style={{ color: 'var(--noosphere-cyan)' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: 'var(--sacred-white)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={hostname}
                >
                  {hostname}
                </div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={activeTabUrl}
                >
                  {activeTabUrl}
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              }}
            >
              {isHttps ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    background: 'rgba(0,191,191,0.1)',
                    border: '1px solid var(--noosphere-cyan-dim)',
                    color: 'var(--noosphere-cyan)',
                    fontSize: '8px',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  <Lock size={8} />
                  HTTPS
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    background: 'rgba(255,0,0,0.1)',
                    border: '1px solid var(--omnissiah-red-dim)',
                    color: 'var(--omnissiah-red)',
                    fontSize: '8px',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  <Unlock size={8} />
                  HTTP
                </span>
              )}
              {isWhitelisted && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    background: 'rgba(200,168,75,0.1)',
                    border: '1px solid var(--cogitator-gold-dim)',
                    color: 'var(--cogitator-gold)',
                    fontSize: '8px',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  <ShieldCheck size={8} />
                  Whitelisted
                </span>
              )}
              {isBlacklisted && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    background: 'rgba(255,0,0,0.1)',
                    border: '1px solid var(--omnissiah-red-dim)',
                    color: 'var(--omnissiah-red)',
                    fontSize: '8px',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  <Ban size={8} />
                  Blocked
                </span>
              )}
            </div>
          </div>

          {/* ── Security Info ───────────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderBottom: '1px solid var(--iron-gray)',
              }}
            >
              {isHttps ? (
                <ShieldCheck
                  size={12}
                  style={{ color: 'var(--noosphere-cyan)' }}
                />
              ) : (
                <ShieldAlert
                  size={12}
                  style={{ color: 'var(--omnissiah-red)' }}
                />
              )}
              <span
                style={{
                  color: isHttps
                    ? 'var(--noosphere-cyan)'
                    : 'var(--omnissiah-red)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 'bold',
                }}
              >
                Security
              </span>
            </div>

            <div style={{ padding: '6px 10px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Protocol
                </span>
                <span
                  style={{
                    color: isHttps
                      ? 'var(--noosphere-cyan)'
                      : 'var(--omnissiah-red)',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {securityInfo.connectionType}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Certificate
                </span>
                <span
                  style={{
                    color: isHttps
                      ? 'var(--noosphere-cyan)'
                      : 'var(--parchment-dim)',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {securityInfo.certificate}
                </span>
              </div>
            </div>
          </div>

          {/* ── Permissions ─────────────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderBottom: '1px solid var(--iron-gray)',
              }}
            >
              <Settings
                size={12}
                style={{ color: 'var(--cogitator-gold)' }}
              />
              <span
                style={{
                  color: 'var(--cogitator-gold)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 'bold',
                }}
              >
                Permissions
              </span>
            </div>

            <Toggle
              label="JavaScript"
              description="Execute scripts"
              enabled={currentSetting.javascript}
              onChange={(v) => updateSetting('javascript', v)}
              icon={<Code size={14} />}
              color="var(--cogitator-gold)"
            />
            <Toggle
              label="Cookies"
              description="Store session data"
              enabled={currentSetting.cookies}
              onChange={(v) => updateSetting('cookies', v)}
              icon={<Cookie size={14} />}
              color="#D4A574"
            />
            <Toggle
              label="Images"
              description="Load visual assets"
              enabled={currentSetting.images}
              onChange={(v) => updateSetting('images', v)}
              icon={<Image size={14} />}
              color="var(--noosphere-cyan)"
            />
            <Toggle
              label="Ad Block"
              description="Block advertisements"
              enabled={currentSetting.ads}
              onChange={(v) => updateSetting('ads', v)}
              icon={<Ban size={14} />}
              color="var(--omnissiah-red)"
            />
            <Toggle
              label="Fingerprint"
              description="Protect browser fingerprint"
              enabled={currentSetting.fingerprint}
              onChange={(v) => updateSetting('fingerprint', v)}
              icon={<Fingerprint size={14} />}
              color="var(--noosphere-cyan)"
            />
          </div>

          {/* ── Actions ─────────────────────────────────────── */}
          <div
            style={{
              border: '1px solid var(--iron-gray)',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderBottom: '1px solid var(--iron-gray)',
              }}
            >
              <Settings
                size={12}
                style={{ color: 'var(--omnissiah-red)' }}
              />
              <span
                style={{
                  color: 'var(--omnissiah-red)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 'bold',
                }}
              >
                Actions
              </span>
            </div>

            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Clear data */}
              {showClearConfirm ? (
                <div
                  style={{
                    padding: '8px',
                    border: '1px solid var(--omnissiah-red-dim)',
                    background: 'rgba(255,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '6px',
                    }}
                  >
                    <AlertTriangle
                      size={12}
                      style={{ color: 'var(--omnissiah-red)' }}
                    />
                    <span
                      style={{
                        color: 'var(--omnissiah-red)',
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Confirm data purge?
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={handleClearData}
                      style={{
                        flex: 1,
                        padding: '5px',
                        background: 'var(--omnissiah-red)',
                        border: 'none',
                        color: 'white',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                      }}
                    >
                      PURGE
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      style={{
                        flex: 1,
                        padding: '5px',
                        background: 'transparent',
                        border: '1px solid var(--iron-gray)',
                        color: 'var(--parchment-dim)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    letterSpacing: '0.1em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                    e.currentTarget.style.color = 'var(--omnissiah-red)';
                    e.currentTarget.style.background = 'rgba(255,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={12} />
                  Clear Data for This Site
                </button>
              )}

              {/* Whitelist / Unwhitelist */}
              {isWhitelisted ? (
                <button
                  onClick={handleRemoveFromWhitelist}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid var(--cogitator-gold-dim)',
                    color: 'var(--cogitator-gold)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    letterSpacing: '0.1em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'rgba(200,168,75,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Shield size={12} />
                  Remove from Whitelist
                </button>
              ) : (
                <button
                  onClick={handleAddToWhitelist}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid var(--cogitator-gold-dim)',
                    color: 'var(--cogitator-gold)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    letterSpacing: '0.1em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'rgba(200,168,75,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <ShieldCheck size={12} />
                  Add to Whitelist
                </button>
              )}

              {/* Block / Unblock */}
              {isBlacklisted ? (
                <button
                  onClick={handleUnblockSite}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    letterSpacing: '0.1em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      'var(--noosphere-cyan)';
                    e.currentTarget.style.color = 'var(--noosphere-cyan)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                  }}
                >
                  <Check size={12} />
                  Unblock Site
                </button>
              ) : (
                <button
                  onClick={handleBlockSite}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid var(--omnissiah-red-dim)',
                    color: 'var(--omnissiah-red)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    letterSpacing: '0.1em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,0,0,0.05)';
                    e.currentTarget.style.boxShadow = 'var(--glow-red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Ban size={12} />
                  Block Site
                </button>
              )}
            </div>
          </div>

          {/* ── Cleared message ─────────────────────────────── */}
          {clearedMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px',
                border: '1px solid var(--noosphere-cyan-dim)',
                background: 'rgba(0,191,191,0.05)',
              }}
            >
              <Check
                size={12}
                style={{ color: 'var(--noosphere-cyan)', flexShrink: 0 }}
              />
              <span
                style={{
                  color: 'var(--noosphere-cyan)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {clearedMessage}
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Utility: Check if a site is blocked
// ═══════════════════════════════════════════════════════════

export function isSiteBlocked(hostname: string): boolean {
  try {
    const blacklist: string[] = JSON.parse(
      localStorage.getItem(BLACKLIST_KEY) || '[]'
    );
    return blacklist.includes(hostname);
  } catch {
    return false;
  }
}

export function isSiteWhitelisted(hostname: string): boolean {
  try {
    const whitelist: string[] = JSON.parse(
      localStorage.getItem(WHITELIST_KEY) || '[]'
    );
    return whitelist.includes(hostname);
  } catch {
    return false;
  }
}

export function getSiteSetting(hostname: string): SiteSetting {
  const all = loadAllSettings();
  return all[hostname] || getDefaultSetting(hostname);
}
