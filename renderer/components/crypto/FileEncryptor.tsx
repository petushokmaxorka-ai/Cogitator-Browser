// ═══ FILE ENCRYPTOR ═══
// Sacred Cryptographic Engine — encrypts and decrypts files using AES-256-CBC.
// Uses Web Crypto API (browser-side, no server needed).

import React, { useState, useCallback, useRef } from 'react';
import { Lock, Unlock, FileKey, Shield, Eye, EyeOff, Hash, FileCheck } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Crypto Engine (Web Crypto API)
// ═══════════════════════════════════════════════════════════════════════════════

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptFile(file: ArrayBuffer, password: string): Promise<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, file);
  // Prepend salt + iv to encrypted data
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  return result.buffer;
}

async function decryptFile(data: ArrayBuffer, password: string): Promise<ArrayBuffer> {
  const arr = new Uint8Array(data);
  const salt = arr.slice(0, 16);
  const iv = arr.slice(16, 32);
  const encrypted = arr.slice(32);
  const key = await deriveKey(password, salt);
  return crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, encrypted);
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

const FileEncryptor: React.FC = () => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ message: string; hash: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ──────────────────────────────────────────────

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError(null);
    // Compute hash
    sha256(selected.slice(0, selected.size) as unknown as ArrayBuffer).catch(() => '');
  }, []);

  const handleEncrypt = useCallback(async () => {
    if (!file || !password) {
      setError('Select file and enter password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const fileData = await file.arrayBuffer();
      const hash = await sha256(fileData);
      const encrypted = await encryptFile(fileData, password);

      clearInterval(progressInterval);
      setProgress(100);

      // Create download
      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.enc`;
      a.click();
      URL.revokeObjectURL(url);

      setResult({
        message: `Encrypted: ${file.name}.enc (${formatBytes(encrypted.byteLength)})`,
        hash: hash,
        filename: `${file.name}.enc`,
      });
    } catch (err) {
      setError('Encryption failed: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [file, password, confirmPassword]);

  const handleDecrypt = useCallback(async () => {
    if (!file || !password) {
      setError('Select .enc file and enter password');
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const fileData = await file.arrayBuffer();
      const decrypted = await decryptFile(fileData, password);

      clearInterval(progressInterval);
      setProgress(100);

      // Strip .enc extension
      const originalName = file.name.endsWith('.enc') ? file.name.slice(0, -4) : `decrypted-${file.name}`;

      // Create download
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(url);

      const hash = await sha256(decrypted);
      setResult({
        message: `Decrypted: ${originalName} (${formatBytes(decrypted.byteLength)})`,
        hash: hash,
        filename: originalName,
      });
    } catch (err) {
      setError('Decryption failed: wrong password or corrupted file');
    } finally {
      setIsProcessing(false);
    }
  }, [file, password]);

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = password && confirmPassword && password !== confirmPassword;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
          }}
        >
          <Shield size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          ═══ File Encryptor ═══
        </div>
        <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', marginTop: '2px' }}>
          AES-256-CBC // WEB CRYPTO API // SACRED CIPHER
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--iron-gray)', flexShrink: 0 }}>
        {([
          { value: 'encrypt' as const, label: 'ENCRYPT', icon: <Lock size={12} /> },
          { value: 'decrypt' as const, label: 'DECRYPT', icon: <Unlock size={12} /> },
        ]).map((m) => (
          <button
            key={m.value}
            onClick={() => {
              setMode(m.value);
              setFile(null);
              setResult(null);
              setError(null);
              setProgress(0);
              setPassword('');
              setConfirmPassword('');
            }}
            style={{
              flex: 1,
              padding: '8px',
              background: mode === m.value ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: mode === m.value ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
              color: mode === m.value ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              textShadow: mode === m.value ? '0 0 8px rgba(255, 0, 0, 0.4)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Algorithm Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            color: 'var(--noosphere-cyan)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <FileKey size={10} />
          Algorithm: AES-256-CBC + PBKDF2 (100k iterations)
        </div>

        {/* File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
        <button
          onClick={handleSelectFile}
          style={{
            padding: '10px',
            background: 'transparent',
            border: '1px solid var(--cogitator-gold)',
            color: 'var(--cogitator-gold)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(200, 168, 75, 0.1)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(200, 168, 75, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {mode === 'encrypt' ? (
            <Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          ) : (
            <Unlock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          )}
          {mode === 'encrypt' ? 'SELECT FILE' : 'SELECT .ENC FILE'}
        </button>

        {/* File Info */}
        {file && (
          <div
            style={{
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              padding: '10px',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <FileCheck size={12} style={{ color: 'var(--noosphere-cyan)' }} />
              <span style={{ color: 'var(--sacred-white)', fontWeight: 'bold', wordBreak: 'break-all' }}>{file.name}</span>
            </div>
            <div style={{ color: 'var(--parchment-dim)', fontSize: '10px' }}>
              Size: <span style={{ color: 'var(--noosphere-cyan)' }}>{formatBytes(file.size)}</span>
              {' | '}
              Type: <span style={{ color: 'var(--cogitator-gold)' }}>{file.type || 'unknown'}</span>
            </div>
          </div>
        )}

        {/* Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Password
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter sacred passphrase..."
              style={{
                flex: 1,
                padding: '8px 10px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                cursor: 'pointer',
              }}
              title={showPassword ? 'Hide' : 'Show'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Confirm Password (encrypt only) */}
        {mode === 'encrypt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm sacred passphrase..."
              style={{
                padding: '8px 10px',
                background: 'var(--void-black)',
                border: `1px solid ${passwordsMatch ? 'var(--noosphere-cyan)' : passwordsMismatch ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                outline: 'none',
              }}
              onFocus={(e) => {
                if (!passwordsMatch && !passwordsMismatch) {
                  e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
                }
              }}
              onBlur={(e) => {
                if (!passwordsMatch && !passwordsMismatch) {
                  e.currentTarget.style.borderColor = 'var(--iron-gray)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            />
            {passwordsMatch && (
              <div style={{ fontSize: '10px', color: 'var(--noosphere-cyan)' }}>Passwords match</div>
            )}
            {passwordsMismatch && (
              <div style={{ fontSize: '10px', color: 'var(--omnissiah-red)' }}>Passwords do not match</div>
            )}
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div
            style={{
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              padding: '10px',
            }}
          >
            <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
              {mode === 'encrypt' ? 'ENCRYPTING' : 'DECRYPTING'} SACRED DATA...
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: mode === 'encrypt' ? 'var(--omnissiah-red)' : 'var(--noosphere-cyan)',
                  transition: 'width 0.1s ease',
                  boxShadow: `0 0 8px ${mode === 'encrypt' ? 'rgba(255,0,0,0.4)' : 'rgba(0,191,191,0.4)'}`,
                }}
              />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--parchment-dim)', textAlign: 'right', marginTop: '4px' }}>
              {progress}%
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
          disabled={isProcessing || !file || !password || (mode === 'encrypt' && !passwordsMatch)}
          style={{
            padding: '12px',
            background:
              file && password && (mode === 'decrypt' || passwordsMatch)
                ? mode === 'encrypt'
                  ? 'rgba(255, 0, 0, 0.1)'
                  : 'rgba(0, 191, 191, 0.1)'
                : 'transparent',
            border: `1px solid ${mode === 'encrypt' ? 'var(--omnissiah-red)' : 'var(--noosphere-cyan)'}`,
            color:
              file && password && (mode === 'decrypt' || passwordsMatch)
                ? mode === 'encrypt'
                  ? 'var(--omnissiah-red)'
                  : 'var(--noosphere-cyan)'
                : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.15em',
            cursor:
              file && password && (mode === 'decrypt' || passwordsMatch) ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase',
            opacity: file && password && (mode === 'decrypt' || passwordsMatch) ? 1 : 0.4,
            transition: 'all 0.15s',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            if (file && password && (mode === 'decrypt' || passwordsMatch)) {
              e.currentTarget.style.boxShadow = `0 0 16px ${mode === 'encrypt' ? 'rgba(255,0,0,0.3)' : 'rgba(0,191,191,0.3)'}`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {mode === 'encrypt' ? (
            <><Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />ENCRYPT FILE</>
          ) : (
            <><Unlock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />DECRYPT FILE</>
          )}
        </button>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(255, 0, 0, 0.08)',
              border: '1px solid var(--omnissiah-red)',
              padding: '10px',
              color: 'var(--omnissiah-red)',
              fontSize: 'var(--font-size-xs)',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            style={{
              background: 'rgba(0, 191, 191, 0.05)',
              border: '1px solid var(--noosphere-cyan)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                color: 'var(--noosphere-cyan)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileCheck size={14} />
              {result.message}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                wordBreak: 'break-all',
              }}
            >
              <Hash size={10} />
              SHA-256: <span style={{ color: 'var(--cogitator-gold)' }}>{result.hash.substring(0, 32)}...</span>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div
          style={{
            borderTop: '1px solid var(--iron-gray)',
            paddingTop: '10px',
            fontSize: '10px',
            color: 'var(--parchment-dim)',
            lineHeight: 1.5,
          }}
        >
          <Shield size={10} style={{ display: 'inline', marginRight: '4px', color: 'var(--noosphere-cyan)' }} />
          All encryption is performed locally in your browser using the Web Crypto API.
          No data is sent to any server. PBKDF2 uses 100,000 iterations for key derivation.
          Store your password safely — it cannot be recovered.
        </div>
      </div>
    </div>
  );
};

export default FileEncryptor;
