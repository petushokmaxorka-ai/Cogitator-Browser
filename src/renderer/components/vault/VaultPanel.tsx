// ═══ VAULT PANEL ═══
// Cryptkeeper Password Vault — Dark Mechanicus style
// Main process: AES-256-GCM + PBKDF2 | Renderer: React UI
//
// States:
//   LOCKED   → Master password entry
//   SETUP    → Create new vault (first run)
//   UNLOCKED → Password list + CRUD operations

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Lock,
  LockOpen,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Edit3,
  Save,
  X,
  Shield,
  KeyRound,
  Globe,
  User,
  FileText,
  FolderOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Zap,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import StrengthIndicator from './StrengthIndicator';
import PasswordGenerator from './PasswordGenerator';
import BreachCheckPanel from './BreachCheckPanel';
import type {
  VaultPasswordEntry,
  VaultNewPasswordEntry,
  VaultFolder,
  VaultPasswordStrength,
} from '../../../shared/types';

type ViewState = 'locked' | 'setup' | 'unlocked' | 'edit' | 'add' | 'breach';

const FOLDERS: { id: VaultFolder; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'social', label: 'Social' },
  { id: 'banking', label: 'Banking' },
  { id: 'work', label: 'Work' },
];

// ── VaultPanel Component ──────────────────────────────────

export const VaultPanel: React.FC = () => {
  // ── State ───────────────────────────────────────────────
  const [viewState, setViewState] = useState<ViewState>('locked');
  const [passwords, setPasswords] = useState<Omit<VaultPasswordEntry, 'password'>[]>([]);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<VaultFolder | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultPasswordEntry | null>(null);
  const [vaultExists, setVaultExists] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedForms, setDetectedForms] = useState<VaultPasswordEntry[]>([]);
  const [showDetected, setShowDetected] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formFolder, setFormFolder] = useState<VaultFolder>('general');
  const [formStrength, setFormStrength] = useState<VaultPasswordStrength>('weak');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Check vault status on mount ─────────────────────────
  useEffect(() => {
    checkVaultStatus();
  }, []);

  const checkVaultStatus = useCallback(async () => {
    try {
      const exists = await window.electronAPI.vault.exists();
      setVaultExists(exists);
      if (!exists) {
        setViewState('setup');
      }
    } catch (err) {
      console.error('[VAULT] Failed to check vault status:', err);
    }
  }, []);

  // ── Load passwords ──────────────────────────────────────
  const loadPasswords = useCallback(async () => {
    try {
      const result = await window.electronAPI.vault.getPasswords();
      setPasswords(result);
    } catch (err) {
      console.error('[VAULT] Failed to load passwords:', err);
    }
  }, []);

  // ── Unlock vault ────────────────────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!masterPassword) {
      setError('Enter master password');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const success = await window.electronAPI.vault.unlock(masterPassword);
      if (success) {
        setViewState('unlocked');
        setMasterPassword('');
        await loadPasswords();
      } else {
        setError('Invalid master password');
      }
    } catch (err) {
      setError('Unlock failed');
    } finally {
      setIsLoading(false);
    }
  }, [masterPassword, loadPasswords]);

  // ── Setup vault (first run) ─────────────────────────────
  const handleSetup = useCallback(async () => {
    if (!masterPassword) {
      setError('Enter master password');
      return;
    }
    if (masterPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (masterPassword.length < 8) {
      setError('Minimum 8 characters');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const success = await window.electronAPI.vault.unlock(masterPassword);
      if (success) {
        setViewState('unlocked');
        setMasterPassword('');
        setConfirmPassword('');
        await loadPasswords();
      } else {
        setError('Failed to create vault');
      }
    } catch (err) {
      setError('Setup failed');
    } finally {
      setIsLoading(false);
    }
  }, [masterPassword, confirmPassword, loadPasswords]);

  // ── Lock vault ──────────────────────────────────────────
  const handleLock = useCallback(async () => {
    await window.electronAPI.vault.lock();
    setViewState('locked');
    setPasswords([]);
    setExpandedId(null);
    setShowPassword({});
  }, []);

  // ── Add password ────────────────────────────────────────
  const handleAdd = useCallback(async () => {
    if (!formTitle || !formPassword) {
      setError('Title and password are required');
      return;
    }
    try {
      const entry: VaultNewPasswordEntry = {
        title: formTitle,
        url: formUrl,
        username: formUsername,
        password: formPassword,
        notes: formNotes,
        folder: formFolder,
        favicon: '',
      };
      await window.electronAPI.vault.addPassword(entry);
      resetForm();
      setViewState('unlocked');
      await loadPasswords();
    } catch (err) {
      setError('Failed to add password');
    }
  }, [formTitle, formUrl, formUsername, formPassword, formNotes, formFolder, loadPasswords]);

  // ── Update password ─────────────────────────────────────
  const handleUpdate = useCallback(async () => {
    if (!editingEntry) return;
    try {
      await window.electronAPI.vault.updatePassword(editingEntry.id, {
        title: formTitle,
        url: formUrl,
        username: formUsername,
        password: formPassword,
        notes: formNotes,
        folder: formFolder,
      });
      resetForm();
      setViewState('unlocked');
      setEditingEntry(null);
      await loadPasswords();
    } catch (err) {
      setError('Failed to update password');
    }
  }, [editingEntry, formTitle, formUrl, formUsername, formPassword, formNotes, formFolder, loadPasswords]);

  // ── Delete password ─────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await window.electronAPI.vault.deletePassword(id);
        if (expandedId === id) setExpandedId(null);
        await loadPasswords();
      } catch (err) {
        console.error('[VAULT] Failed to delete:', err);
      }
    },
    [expandedId, loadPasswords]
  );

  // ── Copy to clipboard ───────────────────────────────────
  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      console.error('[VAULT] Copy failed:', err);
    }
  }, []);

  // ── Toggle password visibility ──────────────────────────
  const toggleShowPassword = useCallback(
    (id: string) => {
      setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    []
  );

  // ── Password strength check ─────────────────────────────
  const checkFormStrength = useCallback(async (pwd: string) => {
    if (!pwd) {
      setFormStrength('weak');
      return;
    }
    const result = await window.electronAPI.vault.checkStrength(pwd);
    setFormStrength(result);
  }, []);

  // ── Form helpers ────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormUrl('');
    setFormUsername('');
    setFormPassword('');
    setFormNotes('');
    setFormFolder('general');
    setFormStrength('weak');
    setError('');
  }, []);

  const startAdd = useCallback(() => {
    resetForm();
    setViewState('add');
  }, [resetForm]);

  const startEdit = useCallback(
    async (entry: Omit<VaultPasswordEntry, 'password'>) => {
      try {
        const full = await window.electronAPI.vault.getPassword(entry.id);
        if (full) {
          setEditingEntry(full);
          setFormTitle(full.title);
          setFormUrl(full.url);
          setFormUsername(full.username);
          setFormPassword(full.password);
          setFormNotes(full.notes);
          setFormFolder(full.folder);
          setViewState('edit');
          checkFormStrength(full.password);
        }
      } catch (err) {
        console.error('[VAULT] Failed to load entry for edit:', err);
      }
    },
    [checkFormStrength]
  );

  const cancelForm = useCallback(() => {
    resetForm();
    setViewState('unlocked');
    setEditingEntry(null);
  }, [resetForm]);

  // ── Generator callback ──────────────────────────────────
  const handleUseGeneratedPassword = useCallback((password: string) => {
    setFormPassword(password);
    checkFormStrength(password);
  }, [checkFormStrength]);

  // ── Filter passwords ────────────────────────────────────
  const filteredPasswords = passwords.filter((p) => {
    const matchesFolder = selectedFolder === 'all' || p.folder === selectedFolder;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.url.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q);
    return matchesFolder && matchesSearch;
  });

  // ── Keyboard shortcut ───────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (viewState === 'locked') handleUnlock();
        else if (viewState === 'setup') handleSetup();
        else if (viewState === 'add') handleAdd();
        else if (viewState === 'edit') handleUpdate();
      }
      if (e.key === 'Escape') {
        if (viewState === 'add' || viewState === 'edit') cancelForm();
      }
    },
    [viewState, handleUnlock, handleSetup, handleAdd, handleUpdate, cancelForm]
  );

  // ── Detect login forms on current page ──────────────────
  const handleDetectForms = useCallback(async () => {
    try {
      // Get active tab info
      const activeTab = await window.electronAPI.tabs.getActive();
      if (!activeTab?.url) return;

      // Search vault for matching passwords
      const matches = await window.electronAPI.vault.getPasswordsForUrl(activeTab.url);
      setDetectedForms(matches);
      setShowDetected(true);
    } catch (err) {
      console.error('[VAULT] Form detection failed:', err);
    }
  }, []);

  // ═════════════════════════════════════════════════════════
  //  RENDER: LOCKED STATE
  // ═════════════════════════════════════════════════════════

  if (viewState === 'locked') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          fontFamily: 'var(--font-mono)',
          gap: '20px',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Lock icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            border: '2px solid var(--iron-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <Lock size={40} color="var(--omnissiah-red)" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '16px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            fontWeight: 'bold',
            textShadow: '0 0 12px rgba(200, 168, 75, 0.3)',
          }}
        >
          Cryptkeeper Vault
        </div>
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: '10px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
          }}
        >
          AES-256-GCM / PBKDF2-SHA256
        </div>

        {/* Password input */}
        <div style={{ width: '100%', maxWidth: '280px', marginTop: '12px' }}>
          <input
            type="password"
            placeholder="Enter Master Password"
            value={masterPassword}
            onChange={(e) => {
              setMasterPassword(e.target.value);
              setError('');
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'var(--void-black)',
              border: `1px solid ${error ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              letterSpacing: '0.05em',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 150ms ease',
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = 'var(--iron-gray)';
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              color: 'var(--omnissiah-red)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              textShadow: '0 0 8px rgba(255, 0, 0, 0.3)',
            }}
          >
            {error}
          </div>
        )}

        {/* Unlock button */}
        <button
          onClick={handleUnlock}
          disabled={isLoading}
          style={{
            width: '100%',
            maxWidth: '280px',
            padding: '12px',
            background: 'var(--omnissiah-red)',
            border: '1px solid var(--omnissiah-red)',
            color: '#000000',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            opacity: isLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#ff3333';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--omnissiah-red)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isLoading ? '◈ Unlocking...' : 'UNLOCK'}
        </button>

        {/* Hint */}
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            textAlign: 'center',
            marginTop: '8px',
          }}
        >
          Press ENTER to unlock
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: SETUP STATE
  // ═════════════════════════════════════════════════════════

  if (viewState === 'setup') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          fontFamily: 'var(--font-mono)',
          gap: '16px',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Shield icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            border: '2px solid var(--cogitator-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <Shield size={40} color="var(--cogitator-gold)" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '16px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            fontWeight: 'bold',
            textShadow: '0 0 12px rgba(200, 168, 75, 0.3)',
          }}
        >
          Initialize Vault
        </div>
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textAlign: 'center',
            maxWidth: '260px',
            lineHeight: 1.5,
          }}
        >
          Create a master password to encrypt your vault.
          If you forget it, your data will be lost forever.
        </div>

        {/* Inputs */}
        <div style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          <input
            type="password"
            placeholder="Master Password"
            value={masterPassword}
            onChange={(e) => {
              setMasterPassword(e.target.value);
              setError('');
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'var(--void-black)',
              border: `1px solid ${error ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 150ms ease',
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = 'var(--iron-gray)';
            }}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'var(--void-black)',
              border: `1px solid ${error ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
              color: 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 150ms ease',
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = 'var(--iron-gray)';
            }}
          />

          {/* Strength indicator for master password */}
          {masterPassword && (
            <StrengthIndicator
              strength={formStrength}
              showEntropy={false}
              showLabel={true}
            />
          )}
        </div>

        {/* Update strength when master password changes */}
        {masterPassword && (() => {
          window.electronAPI.vault.checkStrength(masterPassword).then(setFormStrength);
          return null;
        })()}

        {/* Error */}
        {error && (
          <div
            style={{
              color: 'var(--omnissiah-red)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              textShadow: '0 0 8px rgba(255, 0, 0, 0.3)',
            }}
          >
            {error}
          </div>
        )}

        {/* Create button */}
        <button
          onClick={handleSetup}
          disabled={isLoading}
          style={{
            width: '100%',
            maxWidth: '280px',
            padding: '12px',
            background: 'var(--cogitator-gold)',
            border: '1px solid var(--cogitator-gold)',
            color: '#000000',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            opacity: isLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#D4B85A';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(200, 168, 75, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--cogitator-gold)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isLoading ? '◈ Creating...' : 'CREATE VAULT'}
        </button>

        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            textAlign: 'center',
          }}
        >
          AES-256-GCM encryption / PBKDF2 100k iterations
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: FORM (Add / Edit)
  // ═════════════════════════════════════════════════════════

  if (viewState === 'add' || viewState === 'edit') {
    const isEdit = viewState === 'edit';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
        }}
        onKeyDown={handleKeyDown}
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
              textTransform: 'uppercase' as const,
              fontWeight: 'bold',
            }}
          >
            {isEdit ? 'Edit Entry' : 'Add Password'}
          </span>
          <button
            onClick={cancelForm}
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
          {/* Title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}
            >
              Title *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. GitHub"
              autoFocus={!isEdit}
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
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
              }}
            />
          </div>

          {/* URL */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}
            >
              URL
            </label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Globe
                size={12}
                style={{
                  position: 'absolute',
                  left: '10px',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 28px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
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
            </div>
          </div>

          {/* Username */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}
            >
              Username
            </label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <User
                size={12}
                style={{
                  position: 'absolute',
                  left: '10px',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="username or email"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 28px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
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
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}
            >
              Password *
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <KeyRound
                  size={12}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type={showPassword['form'] ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => {
                    setFormPassword(e.target.value);
                    checkFormStrength(e.target.value);
                  }}
                  placeholder="password"
                  style={{
                    width: '100%',
                    padding: '10px 32px 10px 28px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--sacred-white)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
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
                  onClick={() => toggleShowPassword('form')}
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
                  {showPassword['form'] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {/* Generator button */}
              <button
                onClick={() => setShowGenerator(true)}
                title="Generate password"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  background: 'var(--void-black)',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--cogitator-gold)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                  e.currentTarget.style.boxShadow = 'var(--glow-gold)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--iron-gray)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Sparkles size={14} />
              </button>
            </div>
            {/* Strength indicator */}
            {formPassword && (
              <div style={{ marginTop: '6px' }}>
                <StrengthIndicator strength={formStrength} showEntropy={false} />
              </div>
            )}
          </div>

          {/* Folder */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}
            >
              Folder
            </label>
            <select
              value={formFolder}
              onChange={(e) => setFormFolder(e.target.value as VaultFolder)}
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
                boxSizing: 'border-box',
              }}
            >
              {FOLDERS.map((f) => (
                <option key={f.id} value={f.id} style={{ background: '#1E1E1E' }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                marginBottom: '4px',
              }}
            >
              Notes
            </label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.4,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                color: 'var(--omnissiah-red)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textShadow: '0 0 8px rgba(255, 0, 0, 0.3)',
                padding: '4px 0',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 12px',
            borderTop: '1px solid var(--iron-gray)',
            background: 'var(--void-black)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={cancelForm}
            style={{
              flex: 1,
              padding: '10px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.color = 'var(--sacred-white)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment)';
            }}
          >
            <X size={12} style={{ marginRight: '4px' }} />
            Cancel
          </button>
          <button
            onClick={isEdit ? handleUpdate : handleAdd}
            style={{
              flex: 1.5,
              padding: '10px',
              background: 'var(--omnissiah-red)',
              border: '1px solid var(--omnissiah-red)',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff3333';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 0, 0, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Save size={12} style={{ marginRight: '4px' }} />
            {isEdit ? 'UPDATE' : 'SAVE'}
          </button>
        </div>

        {/* Password Generator Modal */}
        {showGenerator && (
          <PasswordGenerator
            isOpen={showGenerator}
            onClose={() => setShowGenerator(false)}
            onUsePassword={handleUseGeneratedPassword}
          />
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: BREACH CHECK STATE
  // ═════════════════════════════════════════════════════════

  if (viewState === 'breach') {
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
            padding: '8px 12px',
            borderBottom: '1px solid var(--iron-gray)',
            background: 'var(--void-black)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={12} color="var(--omnissiah-red)" />
            <span
              style={{
                color: 'var(--omnissiah-red)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                fontWeight: 'bold',
              }}
            >
              Breach Check
            </span>
          </div>
          <button
            onClick={() => setViewState('unlocked')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              padding: 0,
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
            <Unlock size={12} />
          </button>
        </div>
        {/* Breach check panel */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <BreachCheckPanel passwords={passwords} />
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: UNLOCKED STATE
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
      {/* ── Header ────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          background: 'var(--void-black)',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LockOpen size={12} color="var(--noosphere-cyan)" />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              fontWeight: 'bold',
            }}
          >
            Cryptkeeper
          </span>
          <span
            style={{
              color: 'var(--text-muted)',
              fontSize: '9px',
              letterSpacing: '0.08em',
            }}
          >
            {passwords.length} entries
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Breach check button */}
          <button
            onClick={() => setViewState('breach')}
            title="Breach check"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--omnissiah-red)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ShieldAlert size={12} />
          </button>
          {/* Detect forms button */}
          <button
            onClick={handleDetectForms}
            title="Detect login forms"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--noosphere-cyan)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
              e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Zap size={12} />
          </button>
          {/* Lock button */}
          <button
            onClick={handleLock}
            title="Lock vault"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--omnissiah-red)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Lock size={12} />
          </button>
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <Search size={12} color="var(--text-muted)" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search vault..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
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
            <X size={12} />
          </button>
        )}
        {/* Add button */}
        <button
          onClick={startAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            background: 'var(--omnissiah-red)',
            border: '1px solid var(--omnissiah-red)',
            color: '#000000',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ff3333';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--omnissiah-red)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus size={11} />
          ADD
        </button>
      </div>

      {/* ── Folder Filter ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          padding: '4px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setSelectedFolder('all')}
          style={{
            padding: '4px 10px',
            background: selectedFolder === 'all' ? 'rgba(255, 0, 0, 0.12)' : 'transparent',
            border: `1px solid ${selectedFolder === 'all' ? 'var(--omnissiah-red)' : 'transparent'}`,
            color: selectedFolder === 'all' ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          All ({passwords.length})
        </button>
        {FOLDERS.map((f) => {
          const count = passwords.filter((p) => p.folder === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFolder(f.id)}
              style={{
                padding: '4px 10px',
                background:
                  selectedFolder === f.id ? 'rgba(255, 0, 0, 0.12)' : 'transparent',
                border: `1px solid ${selectedFolder === f.id ? 'var(--omnissiah-red)' : 'transparent'}`,
                color:
                  selectedFolder === f.id ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Detected Forms Banner ─────────────────────── */}
      {showDetected && detectedForms.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(0, 191, 191, 0.08)',
            borderBottom: '1px solid var(--noosphere-cyan)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                color: 'var(--noosphere-cyan)',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                fontWeight: 'bold',
              }}
            >
              <Zap size={10} style={{ display: 'inline', marginRight: '4px' }} />
              Matching passwords for this site
            </span>
            <button
              onClick={() => setShowDetected(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--parchment-dim)',
                cursor: 'pointer',
              }}
            >
              <X size={10} />
            </button>
          </div>
          {detectedForms.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                marginBottom: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={10} color="var(--parchment-dim)" />
                <span style={{ color: 'var(--sacred-white)', fontSize: '11px' }}>
                  {entry.username}
                </span>
              </div>
              <button
                onClick={() => handleCopy(entry.password, `detected-${entry.id}`)}
                style={{
                  padding: '3px 8px',
                  background: 'var(--noosphere-cyan-dim)',
                  border: '1px solid var(--noosphere-cyan)',
                  color: '#000000',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {copiedField === `detected-${entry.id}` ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Password List ─────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '4px 0',
        }}
      >
        {filteredPasswords.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '120px',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: '11px',
              letterSpacing: '0.1em',
            }}
          >
            <Shield size={24} strokeWidth={1} />
            <span>
              {searchQuery ? 'No matches found' : 'Vault is empty'}
            </span>
            {!searchQuery && (
              <button
                onClick={startAdd}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                <Plus size={10} style={{ display: 'inline', marginRight: '4px' }} />
                Add first password
              </button>
            )}
          </div>
        ) : (
          filteredPasswords.map((entry) => (
            <PasswordListItem
              key={entry.id}
              entry={entry}
              isExpanded={expandedId === entry.id}
              showPassword={!!showPassword[entry.id]}
              copiedField={copiedField}
              onToggleExpand={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onTogglePassword={() => toggleShowPassword(entry.id)}
              onCopy={(text, field) => handleCopy(text, field)}
              onEdit={() => startEdit(entry)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
//  PasswordListItem — Individual entry in the list
// ═══════════════════════════════════════════════════════════

interface PasswordListItemProps {
  entry: Omit<VaultPasswordEntry, 'password'>;
  isExpanded: boolean;
  showPassword: boolean;
  copiedField: string | null;
  onToggleExpand: () => void;
  onTogglePassword: () => void;
  onCopy: (text: string, field: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PasswordListItem: React.FC<PasswordListItemProps> = ({
  entry,
  isExpanded,
  showPassword,
  copiedField,
  onToggleExpand,
  onTogglePassword,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const [fullEntry, setFullEntry] = useState<VaultPasswordEntry | null>(null);

  // Load full entry when expanded
  useEffect(() => {
    if (isExpanded && !fullEntry) {
      window.electronAPI.vault.getPassword(entry.id).then((result) => {
        if (result) setFullEntry(result);
      });
    }
  }, [isExpanded, entry.id, fullEntry]);

  const actualPassword = fullEntry?.password || '••••••••';
  const displayPassword = showPassword ? actualPassword : '••••••••';
  const folderColors: Record<VaultFolder, string> = {
    general: 'var(--parchment-dim)',
    social: '#8B7DBB',
    banking: '#7BB87B',
    work: '#B8A07B',
  };

  return (
    <div
      style={{
        borderBottom: '1px solid var(--iron-gray)',
        transition: 'all 150ms ease',
      }}
    >
      {/* Collapsed row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          cursor: 'pointer',
          background: isExpanded ? 'rgba(255, 0, 0, 0.04)' : 'transparent',
        }}
      >
        {/* Expand icon */}
        {isExpanded ? (
          <ChevronDown size={12} color="var(--text-muted)" />
        ) : (
          <ChevronRight size={12} color="var(--text-muted)" />
        )}

        {/* Favicon placeholder */}
        <div
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            flexShrink: 0,
            fontSize: '10px',
          }}
        >
          {entry.favicon ? (
            <img src={entry.favicon} alt="" style={{ width: '14px', height: '14px' }} />
          ) : (
            <Globe size={12} color="var(--text-muted)" />
          )}
        </div>

        {/* Title + username */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: 'var(--sacred-white)',
              fontSize: '11px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.title}
          </div>
          <div
            style={{
              color: 'var(--parchment-dim)',
              fontSize: '9px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.username}
          </div>
        </div>

        {/* Folder badge */}
        <span
          style={{
            fontSize: '8px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: folderColors[entry.folder],
            border: `1px solid ${folderColors[entry.folder]}33`,
            padding: '1px 5px',
            flexShrink: 0,
          }}
        >
          {entry.folder}
        </span>

        {/* Masked password */}
        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.15em',
            flexShrink: 0,
            minWidth: '50px',
            textAlign: 'right',
          }}
        >
          ••••••••
        </span>
      </div>

      {/* Expanded details */}
      {isExpanded && fullEntry && (
        <div
          style={{
            padding: '8px 12px 12px',
            background: 'var(--void-black)',
            borderTop: '1px solid var(--iron-gray)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* URL */}
          {entry.url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={11} color="var(--text-muted)" />
              <span
                style={{
                  color: 'var(--noosphere-cyan)',
                  fontSize: '10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {entry.url}
              </span>
            </div>
          )}

          {/* Username */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={11} color="var(--text-muted)" />
            <span
              style={{
                color: 'var(--sacred-white)',
                fontSize: '11px',
                flex: 1,
              }}
            >
              {fullEntry.username}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(fullEntry.username, `user-${entry.id}`);
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: copiedField === `user-${entry.id}` ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '8px',
                fontFamily: 'var(--font-mono)',
                transition: 'all 150ms ease',
              }}
            >
              {copiedField === `user-${entry.id}` ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={11} color="var(--text-muted)" />
            <span
              style={{
                color: showPassword ? 'var(--omnissiah-red)' : 'var(--text-muted)',
                fontSize: showPassword ? '12px' : '11px',
                letterSpacing: showPassword ? '0.1em' : '0.15em',
                flex: 1,
                fontFamily: 'var(--font-mono)',
                wordBreak: 'break-all',
              }}
            >
              {displayPassword}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePassword();
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                cursor: 'pointer',
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showPassword ? <EyeOff size={10} /> : <Eye size={10} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(actualPassword, `pass-${entry.id}`);
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: copiedField === `pass-${entry.id}` ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '8px',
                fontFamily: 'var(--font-mono)',
                transition: 'all 150ms ease',
              }}
            >
              {copiedField === `pass-${entry.id}` ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Notes */}
          {fullEntry.notes && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <FileText size={11} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span
                style={{
                  color: 'var(--parchment)',
                  fontSize: '10px',
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {fullEntry.notes}
              </span>
            </div>
          )}

          {/* Meta info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '4px',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '8px' }}>
              {new Date(fullEntry.modifiedAt).toLocaleDateString()}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                title="Edit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  background: 'transparent',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
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
                <Edit3 size={10} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
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
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultPanel;
