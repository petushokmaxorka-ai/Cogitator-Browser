// ═══ PASSWORD GENERATOR ═══
// Secure password generator modal — Dark Mechanicus style
// Crypto-secure randomness via main process IPC

import React, { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Copy,
  Check,
  X,
  Shield,
  Sliders,
} from 'lucide-react';
import StrengthIndicator from './StrengthIndicator';
import type { VaultPasswordStrength } from '../../../shared/types';

// ── Types ──────────────────────────────────────────────────

interface PasswordGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onUsePassword: (password: string) => void;
}

interface GenOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}

// ── Component ──────────────────────────────────────────────

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  isOpen,
  onClose,
  onUsePassword,
}) => {
  // ── State ───────────────────────────────────────────────
  const [password, setPassword] = useState('');
  const [options, setOptions] = useState<GenOptions>({
    length: 20,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: true,
  });
  const [strength, setStrength] = useState<VaultPasswordStrength>('weak');
  const [entropy, setEntropy] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Generate password ───────────────────────────────────
  const generate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await window.electronAPI.vault.generatePassword(
        options.length,
        options.useSymbols,
        options.useNumbers,
        options.useUppercase,
        options.useLowercase
      );
      setPassword(result);

      const strengthResult = await window.electronAPI.vault.checkStrength(result);
      setStrength(strengthResult);

      const entropyResult = await window.electronAPI.vault.calculateEntropy(result);
      setEntropy(entropyResult);
    } catch (err) {
      console.error('[GENERATOR] Failed to generate password:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  // Auto-generate on open or options change
  useEffect(() => {
    if (isOpen) {
      generate();
    }
  }, [isOpen, options.length, options.useUppercase, options.useLowercase, options.useNumbers, options.useSymbols, generate]);

  // ── Handlers ────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[GENERATOR] Failed to copy:', err);
    }
  }, [password]);

  const handleUsePassword = useCallback(() => {
    if (password) {
      onUsePassword(password);
      onClose();
    }
  }, [password, onUsePassword, onClose]);

  const toggleOption = useCallback(
    (key: keyof Omit<GenOptions, 'length'>) => {
      setOptions((prev) => {
        // Prevent unchecking all options
        const next = { ...prev, [key]: !prev[key] };
        const hasAny =
          next.useUppercase || next.useLowercase || next.useNumbers || next.useSymbols;
        if (!hasAny) return prev;
        return next;
      });
    },
    []
  );

  const handleLengthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 8 && val <= 64) {
      setOptions((prev) => ({ ...prev, length: val }));
    }
  }, []);

  // ── Option checkbox component ───────────────────────────

  const OptionCheckbox: React.FC<{
    label: string;
    checked: boolean;
    onChange: () => void;
  }> = ({ label, checked, onChange }) => (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        padding: '6px 10px',
        border: `1px solid ${checked ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
        background: checked ? 'rgba(255, 0, 0, 0.08)' : 'var(--void-black)',
        transition: 'all 150ms ease',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: checked ? 'var(--sacred-white)' : 'var(--parchment-dim)',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '14px',
          height: '14px',
          border: `1px solid ${checked ? 'var(--omnissiah-red)' : 'var(--steel-gray)'}`,
          background: checked ? 'var(--omnissiah-red)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 150ms ease',
        }}
      >
        {checked && <Check size={10} strokeWidth={3} color="#000000" />}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: 'none' }}
      />
      {label}
    </label>
  );

  // ── Render ──────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: 'var(--font-mono)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '420px',
          maxWidth: '90vw',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 80px rgba(255, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--iron-gray)',
            background: 'var(--void-black)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={14} color="var(--omnissiah-red)" />
            <span
              style={{
                color: 'var(--cogitator-gold)',
                fontSize: '12px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase' as const,
                fontWeight: 'bold',
              }}
            >
              Password Forge
            </span>
          </div>
          <button
            onClick={onClose}
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

        {/* ── Generated Password Display ──────────────── */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--iron-gray)',
          }}
        >
          <div
            style={{
              background: 'var(--void-black)',
              border: '1px solid var(--steel-gray)',
              padding: '12px 14px',
              fontSize: '18px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.12em',
              color: 'var(--noosphere-cyan)',
              textShadow: '0 0 10px rgba(0, 191, 191, 0.3)',
              wordBreak: 'break-all',
              lineHeight: 1.4,
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              userSelect: 'all',
              position: 'relative',
            }}
          >
            {password}
          </div>

          {/* Strength indicator */}
          <div style={{ marginTop: '10px' }}>
            <StrengthIndicator
              strength={strength}
              entropy={entropy}
              showLabel={true}
              showEntropy={true}
            />
          </div>
        </div>

        {/* ── Options ─────────────────────────────────── */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--iron-gray)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Length slider */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--parchment-dim)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                }}
              >
                Length
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--sacred-white)',
                  fontWeight: 'bold',
                }}
              >
                {options.length}
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={options.length}
              onChange={handleLengthChange}
              style={{
                width: '100%',
                accentColor: 'var(--omnissiah-red)',
                height: '3px',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Character set toggles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <OptionCheckbox
              label="Uppercase"
              checked={options.useUppercase}
              onChange={() => toggleOption('useUppercase')}
            />
            <OptionCheckbox
              label="Lowercase"
              checked={options.useLowercase}
              onChange={() => toggleOption('useLowercase')}
            />
            <OptionCheckbox
              label="Numbers"
              checked={options.useNumbers}
              onChange={() => toggleOption('useNumbers')}
            />
            <OptionCheckbox
              label="Symbols"
              checked={options.useSymbols}
              onChange={() => toggleOption('useSymbols')}
            />
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────── */}
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
            background: 'var(--void-black)',
          }}
        >
          <button
            onClick={generate}
            disabled={isGenerating}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
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
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <RefreshCw size={12} />
            Regenerate
          </button>

          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              background: copied ? 'rgba(0, 191, 191, 0.15)' : 'var(--iron-dark)',
              border: `1px solid ${copied ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
              color: copied ? 'var(--noosphere-cyan)' : 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
                e.currentTarget.style.color = 'var(--sacred-white)';
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment)';
              }
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleUsePassword}
            style={{
              flex: 1.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
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
            <Sliders size={12} />
            Use This
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordGenerator;
