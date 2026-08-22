// ═══ BACKUP PANEL ═══
// Backup & Restore — Dark Mechanicus Interface
// Exports all browser data to AES-encrypted .json.enc file
// Import restores selected data categories

import { useState, useCallback, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  Lock,
  Unlock,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Shield,
  Clock,
  Bookmark,
  History,
  KeyRound,
  StickyNote,
  Settings,
  ShieldCheck,
  FileJson,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface BackupOptions {
  bookmarks: boolean;
  history: boolean;
  passwords: boolean;
  notes: boolean;
  settings: boolean;
  totp: boolean;
}

interface BackupData {
  version: string;
  timestamp: number;
  data: Record<string, string | null>;
}

const DEFAULT_OPTIONS: BackupOptions = {
  bookmarks: true,
  history: true,
  passwords: true,
  notes: true,
  settings: true,
  totp: true,
};

const STORAGE_KEYS: { key: string; option: keyof BackupOptions; label: string; icon: React.ReactNode }[] = [
  { key: 'cogitator_bookmarks', option: 'bookmarks', label: 'Bookmarks', icon: <Bookmark size={12} /> },
  { key: 'cogitator_history', option: 'history', label: 'History', icon: <History size={12} /> },
  { key: 'cogitator_vault', option: 'passwords', label: 'Passwords', icon: <KeyRound size={12} /> },
  { key: 'cogitator_notes', option: 'notes', label: 'Notes', icon: <StickyNote size={12} /> },
  { key: 'cogitator_settings', option: 'settings', label: 'Settings', icon: <Settings size={12} /> },
  { key: 'cogitator_totp', option: 'totp', label: 'TOTP Accounts', icon: <ShieldCheck size={12} /> },
];

// ── Simple AES-like encryption using Web Crypto ─────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Combine: salt(16) + iv(12) + ciphertext
  const result = new Uint8Array(16 + 12 + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, 16);
  result.set(new Uint8Array(ciphertext), 28);

  // Base64 encode
  return btoa(String.fromCharCode(...result));
}

async function decryptData(encrypted: string, password: string): Promise<string | null> {
  try {
    const data = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const ciphertext = data.slice(28);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

// ── Component ───────────────────────────────────────────────

type BackupView = 'main' | 'exporting' | 'importing';

export default function BackupPanel() {
  // ── State ─────────────────────────────────────────────────
  const [view, setView] = useState<BackupView>('main');
  const [options, setOptions] = useState<BackupOptions>({ ...DEFAULT_OPTIONS });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toggle option ─────────────────────────────────────────
  const toggleOption = useCallback((key: keyof BackupOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Select all ────────────────────────────────────────────
  const selectAll = useCallback(() => {
    setOptions({ bookmarks: true, history: true, passwords: true, notes: true, settings: true, totp: true });
  }, []);

  const deselectAll = useCallback(() => {
    setOptions({ bookmarks: false, history: false, passwords: false, notes: false, settings: false, totp: false });
  }, []);

  // ── Create backup ─────────────────────────────────────────
  const handleCreateBackup = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!password) {
      setError('Enter encryption password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const selectedOptions = Object.entries(options).filter(([, v]) => v);
    if (selectedOptions.length === 0) {
      setError('Select at least one data category');
      return;
    }

    setIsProcessing(true);
    setView('exporting');
    setStatus('Collecting data...');
    setProgress(10);

    try {
      // Collect data
      const data: Record<string, string | null> = {};
      for (const item of STORAGE_KEYS) {
        if (options[item.option]) {
          data[item.key] = localStorage.getItem(item.key);
          setStatus(`Collecting: ${item.label}...`);
        }
      }

      const backup: BackupData = {
        version: 'cogitator-v2',
        timestamp: Date.now(),
        data,
      };

      setProgress(40);
      setStatus('Encrypting...');

      const jsonStr = JSON.stringify(backup);
      const encrypted = await encryptData(jsonStr, password);

      setProgress(80);
      setStatus('Creating file...');

      // Download
      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `cogitator-backup-${new Date().toISOString().slice(0, 10)}.json.enc`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus('Backup complete');
      setSuccess('Backup created and downloaded successfully');

      setTimeout(() => {
        setView('main');
        setIsProcessing(false);
        setPassword('');
        setConfirmPassword('');
        setProgress(0);
        setStatus('');
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Backup failed: ' + (err as Error).message);
      setIsProcessing(false);
      setView('main');
    }
  }, [password, confirmPassword, options]);

  // ── Restore backup ────────────────────────────────────────
  const handleRestoreBackup = useCallback(async (encryptedData: string) => {
    setError('');
    setSuccess('');

    if (!importPassword) {
      setError('Enter decryption password');
      return;
    }

    setIsProcessing(true);
    setView('importing');
    setStatus('Decrypting...');
    setProgress(20);

    try {
      const decrypted = await decryptData(encryptedData, importPassword);
      if (!decrypted) {
        setError('Decryption failed: wrong password or corrupted file');
        setIsProcessing(false);
        setView('main');
        return;
      }

      setProgress(50);
      setStatus('Parsing backup...');

      const backup: BackupData = JSON.parse(decrypted);

      if (!backup.version || !backup.data) {
        setError('Invalid backup file format');
        setIsProcessing(false);
        setView('main');
        return;
      }

      setProgress(60);
      setStatus('Restoring data...');

      // Restore selected categories
      let restoredCount = 0;
      for (const item of STORAGE_KEYS) {
        if (options[item.option] && backup.data[item.key] !== undefined) {
          if (backup.data[item.key] !== null) {
            localStorage.setItem(item.key, backup.data[item.key]);
          } else {
            localStorage.removeItem(item.key);
          }
          restoredCount++;
          setStatus(`Restoring: ${item.label}...`);
        }
      }

      setProgress(100);
      setStatus('Restore complete');
      setSuccess(`Restored ${restoredCount} categories from backup`);

      setTimeout(() => {
        setView('main');
        setIsProcessing(false);
        setImportPassword('');
        setProgress(0);
        setStatus('');
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Restore failed: ' + (err as Error).message);
      setIsProcessing(false);
      setView('main');
    }
  }, [importPassword, options]);

  // ── Handle file upload ────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleRestoreBackup(content);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);

    e.target.value = '';
  }, [handleRestoreBackup]);

  // ── Render option checkbox ────────────────────────────────
  const renderOption = (item: typeof STORAGE_KEYS[0]) => (
    <label
      key={item.key}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        background: options[item.option] ? 'rgba(200, 168, 75, 0.08)' : 'var(--void-black)',
        border: `1px solid ${options[item.option] ? 'var(--cogitator-gold-dim)' : 'var(--iron-gray)'}`,
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}
    >
      <input
        type="checkbox"
        checked={options[item.option]}
        onChange={() => toggleOption(item.option)}
        style={{
          accentColor: 'var(--cogitator-gold)',
          cursor: 'pointer',
        }}
      />
      <span style={{ color: 'var(--parchment-dim)', fontSize: '11px' }}>{item.icon}</span>
      <span
        style={{
          flex: 1,
          fontSize: '11px',
          color: options[item.option] ? 'var(--sacred-white)' : 'var(--parchment-dim)',
          letterSpacing: '0.05em',
        }}
      >
        {item.label}
      </span>
    </label>
  );

  // ═════════════════════════════════════════════════════════
  //  RENDER: EXPORTING / IMPORTING PROGRESS
  // ═════════════════════════════════════════════════════════

  if (view === 'exporting' || view === 'importing') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          gap: '20px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            border: '2px solid',
            borderColor: isProcessing ? 'var(--cogitator-gold)' : 'var(--noosphere-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isProcessing ? '0 0 20px rgba(200, 168, 75, 0.2)' : '0 0 20px rgba(0, 191, 191, 0.3)',
          }}
        >
          {isProcessing ? (
            <Loader2 size={28} className="loading-cog" color="var(--cogitator-gold)" />
          ) : (
            <Check size={28} color="var(--noosphere-cyan)" />
          )}
        </div>

        {/* Status */}
        <div
          style={{
            color: isProcessing ? 'var(--cogitator-gold)' : 'var(--noosphere-cyan)',
            fontSize: '13px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textShadow: isProcessing
              ? '0 0 8px rgba(200, 168, 75, 0.3)'
              : '0 0 8px rgba(0, 191, 191, 0.3)',
          }}
        >
          {view === 'exporting' ? 'Creating Backup' : 'Restoring Backup'}
        </div>

        <div style={{ color: 'var(--steel-gray)', fontSize: '10px', letterSpacing: '0.1em' }}>
          {status}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '240px',
            height: '4px',
            background: 'var(--iron-dark)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: isProcessing ? 'var(--cogitator-gold)' : 'var(--noosphere-cyan)',
              boxShadow: isProcessing
                ? '0 0 8px rgba(200, 168, 75, 0.4)'
                : '0 0 8px rgba(0, 191, 191, 0.4)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ color: 'var(--steel-gray)', fontSize: '10px' }}>{progress}%</div>

        {/* Success message */}
        {success && (
          <div
            style={{
              color: 'var(--noosphere-cyan)',
              fontSize: '11px',
              textAlign: 'center',
              letterSpacing: '0.08em',
            }}
          >
            {success}
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: MAIN VIEW
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
          <Database size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Backup & Restore
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
        {/* Success */}
        {success && (
          <div
            style={{
              padding: '10px',
              background: 'rgba(0, 191, 191, 0.08)',
              border: '1px solid var(--noosphere-cyan)',
              color: 'var(--noosphere-cyan)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Check size={12} />
            {success}
          </div>
        )}

        {/* ── DATA SELECTION ─────────────────────────────── */}
        <div>
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
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Select Data Categories
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={selectAll}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              <button
                onClick={deselectAll}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                None
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {STORAGE_KEYS.map(renderOption)}
          </div>
        </div>

        {/* ── CREATE BACKUP ──────────────────────────────── */}
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
          <div
            style={{
              fontSize: '10px',
              color: 'var(--cogitator-gold)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Lock size={10} />
            Create Backup
          </div>

          {/* Password */}
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
              Encryption Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Min 8 characters"
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

          {/* Confirm */}
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
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="Repeat password"
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBackup();
              }}
            />
          </div>

          <button
            onClick={handleCreateBackup}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
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
            <Download size={14} />
            Create Backup
          </button>
        </div>

        {/* ── RESTORE BACKUP ─────────────────────────────── */}
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
          <div
            style={{
              fontSize: '10px',
              color: 'var(--noosphere-cyan)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Unlock size={10} />
            Restore from Backup
          </div>

          {/* Decrypt password */}
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
              Decryption Password
            </label>
            <input
              type="password"
              value={importPassword}
              onChange={(e) => { setImportPassword(e.target.value); setError(''); }}
              placeholder="Enter backup password"
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
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--noosphere-cyan)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json.enc,.enc,.json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0, 191, 191, 0.1)',
              border: '1px solid var(--noosphere-cyan)',
              color: 'var(--noosphere-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 191, 191, 0.2)';
              e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 191, 191, 0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Upload size={14} />
            Select Backup File
          </button>
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

        {/* Info */}
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
          <div style={{ color: 'var(--parchment-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Encryption Details
          </div>
          Algorithm: <span style={{ color: 'var(--noosphere-cyan)' }}>AES-256-GCM</span> with{' '}
          <span style={{ color: 'var(--cogitator-gold)' }}>PBKDF2-SHA256</span> (100k iterations)
          <br />
          Salt: 16 bytes | IV: 12 bytes | Key: 256 bits
          <br />
          File format: <code style={{ color: 'var(--cogitator-gold)' }}>.json.enc</code>
        </div>
      </div>
    </div>
  );
}
