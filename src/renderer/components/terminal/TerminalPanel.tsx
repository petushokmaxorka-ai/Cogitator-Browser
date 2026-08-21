// ═══ MACHINE CONSOLE ═══
// Built-in terminal emulator — Dark Mechanicus shell
// The sacred interface to the Machine Spirit.

import { useState, useCallback, useRef, useEffect } from 'react';
import { TerminalSquare } from 'lucide-react';
import { askAnathemetron } from '../../lib/anathemetron-chat';

// ── Types ───────────────────────────────────────────────────

interface TerminalLine {
  id: number;
  type: 'prompt' | 'output' | 'error' | 'ascii' | 'command';
  text: string;
}

// ── Fortunes of the Mechanicus ──────────────────────────────

const FORTUNES = [
  'The Machine Spirit knows all. Trust in the Omnissiah.',
  'From the moment I understood the weakness of my flesh, it disgusted me.',
  'There is no truth in flesh, only betrayal.',
  'The flesh is weak. The machine is eternal.',
  'Praise the Omnissiah, for He is the source of all knowledge.',
  'A binary prayer a day keeps the tech-heresy away.',
  'To question the Machine Spirit is to invite ruin.',
  'The sacred oils have been applied. The rite is complete.',
  'Data does not lie. Only flesh lies.',
  '01001111 01101101 01101110 01101001 01110011 01110011 01101001 01100001 01101000',
  'The Cult Mechanicus protects the sacred knowledge of the ancients.',
  'Even a broken cog may still turn in the great machine.',
  'The Noosphere connects all blessed machines.',
  'Do not speak the names of the traitor engines.',
  'A Tech-Priest\'s work is never done — there are always more rites to perform.',
  'To understand technology is to understand the divine.',
  'The Cog Mechanicus turns eternal.',
  'Blessed is the mind too small for doubt.',
];

// ── Hash helpers (pure JS, no Node crypto) ──────────────────

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function simpleHash(str: string, algorithm: string): string {
  // Produce deterministic hex strings for hash command
  // These are NOT cryptographically secure — for terminal fun only
  const seed = algorithm + '|' + str;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const len = algorithm === 'md5' ? 32 : algorithm === 'sha1' ? 40 : 64;
  let result = '';
  const combined = (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  for (let i = 0; i < len; i++) {
    result += combined[i % combined.length] || '0';
  }
  return result;
}

// ── ASCII Art ───────────────────────────────────────────────

const NEOFETCH_ART = `    ⚙⚙⚙⚙⚙⚙
   ⚙  ◉◉◉  ⚙
  ⚙  ◉   ◉  ⚙
  ⚙  ◉   ◉  ⚙
   ⚙  ◉◉◉  ⚙
    ⚙⚙⚙⚙⚙⚙
═══════════════════
  OS: Heretic OS
  Kernel: Omnissiah
  Shell: Cogitator
  WM: Electron
  Theme: Dark Mechanicus
  Icons: Sacred
═══════════════════`;

// ── Component ───────────────────────────────────────────────

let LINE_ID = 0;
function nextId() {
  return ++LINE_ID;
}

const PROMPT_TEXT = 'tech-priest@cogitator:~$ ';

export default function TerminalPanel() {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: nextId(),
      type: 'ascii',
      text: [
        '╔══════════════════════════════════════╗',
        '║     MACHINE CONSOLE v2.1.0          ║',
        '║     Type "help" for commands         ║',
        '╚══════════════════════════════════════╝',
      ].join('\n'),
    },
    { id: nextId(), type: 'prompt', text: PROMPT_TEXT },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on mount and click
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Add line helper

  const addLines = useCallback((newLines: Omit<TerminalLine, 'id'>[]) => {
    setLines((prev) => [
      ...prev,
      ...newLines.map((l) => ({ ...l, id: nextId() })),
    ]);
  }, []);

  // ── Command processor

  const processCommand = useCallback(
    async (rawInput: string) => {
      const trimmed = rawInput.trim();

      // Add command line to terminal
      addLines([
        { type: 'command', text: PROMPT_TEXT + rawInput },
      ]);

      if (!trimmed) {
        addLines([{ type: 'prompt', text: PROMPT_TEXT }]);
        return;
      }

      // Save to history
      setHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);

      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      const rest = trimmed.slice(cmd.length).trim();

      switch (cmd) {
        // ── help ────────────────────────────
        case 'help': {
          addLines([
            {
              type: 'output',
              text: [
                '═══════════════════════════════════════════════════',
                '  AVAILABLE COMMANDS:',
                '═══════════════════════════════════════════════════',
                '  help                          Show this message',
                '  clear                         Clear terminal',
                '  echo <text>                   Print text',
                '  date                          Current date/time',
                '  calc <expr>                   Calculator',
                '  hash <md5|sha1|sha256> <text> Hash text',
                '  b64 <encode|decode> <text>    Base64 convert',
                '  ip                            Show IP (stub)',
                '  whoami                        Your identity',
                '  fortune                       Random Mechanicus quote',
                '  neofetch                      System info (ASCII)',
                '  tabs                          List open tabs',
                '  goto <url>                    Open URL in new tab',
                '  sigil <file>                  Sign file',
                '  ollama <prompt>               Ask the Machine Spirit (AI)',
                '  vault                         Vault status',
                '  privacy                       Privacy engine status',
                '  theme                         Current theme',
                '  ver                           Browser version',
                '═══════════════════════════════════════════════════',
              ].join('\n'),
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── clear ───────────────────────────
        case 'clear':
        case 'cls': {
          setLines([{ id: nextId(), type: 'prompt', text: PROMPT_TEXT }]);
          break;
        }

        // ── echo ────────────────────────────
        case 'echo': {
          addLines([
            { type: 'output', text: rest || '' },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── date ────────────────────────────
        case 'date': {
          const now = new Date();
          addLines([
            {
              type: 'output',
              text: now.toISOString().replace('T', ' ').slice(0, 19),
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── calc ────────────────────────────
        case 'calc': {
          const expr = rest;
          if (!expr) {
            addLines([
              { type: 'error', text: 'Usage: calc <expression>' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
            break;
          }
          try {
            // Safe eval: only allow numbers and operators
            const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
            if (!sanitized) {
              addLines([
                { type: 'error', text: 'Invalid expression' },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
              break;
            }
            // eslint-disable-next-line no-new-func
            const result = new Function(`return (${sanitized})`)();
            addLines([
              { type: 'output', text: String(result) },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          } catch {
            addLines([
              { type: 'error', text: 'Calculation error' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── hash ────────────────────────────
        case 'hash': {
          const [type, ...textParts] = args;
          const text = textParts.join(' ');
          if (!type || !text) {
            addLines([
              { type: 'error', text: 'Usage: hash <md5|sha1|sha256> <text>' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
            break;
          }
          if (!['md5', 'sha1', 'sha256'].includes(type)) {
            addLines([
              { type: 'error', text: 'Invalid hash type. Use: md5, sha1, sha256' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
            break;
          }
          const hashResult = simpleHash(text, type);
          addLines([
            { type: 'output', text: `${type.toUpperCase()}: ${hashResult}` },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── b64 ─────────────────────────────
        case 'b64': {
          const [action, ...textParts] = args;
          const text = textParts.join(' ');
          if (!action || !text) {
            addLines([
              { type: 'error', text: 'Usage: b64 <encode|decode> <text>' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
            break;
          }
          try {
            if (action === 'encode') {
              addLines([
                { type: 'output', text: btoa(text) },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
            } else if (action === 'decode') {
              addLines([
                { type: 'output', text: atob(text) },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
            } else {
              addLines([
                { type: 'error', text: 'Invalid action. Use: encode, decode' },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
            }
          } catch {
            addLines([
              { type: 'error', text: 'Base64 conversion failed' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── ip ──────────────────────────────
        case 'ip': {
          addLines([
            {
              type: 'output',
              text: [
                'Interface: eth0',
                '  IPv4: 127.0.0.1',
                '  IPv6: ::1',
                '  Status: CONNECTED TO THE NOOSPHERE',
              ].join('\n'),
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── whoami ──────────────────────────
        case 'whoami': {
          addLines([
            {
              type: 'output',
              text: 'tech-priest of the Omnissiah',
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── fortune ─────────────────────────
        case 'fortune': {
          const quote =
            FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
          addLines([
            {
              type: 'output',
              text: `"${quote}"`,
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── neofetch ────────────────────────
        case 'neofetch': {
          addLines([
            { type: 'ascii', text: NEOFETCH_ART },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── tabs ────────────────────────────
        case 'tabs': {
          try {
            const tabs = await window.electronAPI.tabs.getAll();
            if (!tabs || tabs.length === 0) {
              addLines([
                { type: 'output', text: 'No active tabs.' },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
            } else {
              const activeTab = await window.electronAPI.tabs.getActive();
              const output = [
                '═══════════════════════════════════════════════════',
                `  OPEN TABS: ${tabs.length}`,
                '═══════════════════════════════════════════════════',
                ...tabs.map(
                  (t: any, i: number) =>
                    `  ${t.id === activeTab?.id ? '▶' : ' '} [${i + 1}] ${t.title?.slice(0, 40) || 'Untitled'}\n      ${t.url}`
                ),
                '═══════════════════════════════════════════════════',
              ].join('\n');
              addLines([
                { type: 'output', text: output },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
            }
          } catch (err) {
            addLines([
              { type: 'error', text: 'Failed to fetch tabs' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── goto ────────────────────────────
        case 'goto': {
          const url = rest;
          if (!url) {
            addLines([
              { type: 'error', text: 'Usage: goto <url>' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
            break;
          }
          try {
            const normalized = url.startsWith('http') ? url : `https://${url}`;
            await window.electronAPI.tabs.create(normalized);
            addLines([
              {
                type: 'output',
                text: `Opening: ${normalized}`,
              },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          } catch (err) {
            addLines([
              { type: 'error', text: 'Failed to open tab' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── sigil ───────────────────────────
        case 'sigil': {
          const filePath = rest;
          if (!filePath) {
            addLines([
              { type: 'error', text: 'Usage: sigil <file-path>' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
            break;
          }
          try {
            const certs = await window.electronAPI.sigil.getCertificates();
            if (certs.length === 0) {
              addLines([
                { type: 'error', text: 'No certificates available. Import a certificate first.' },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
            } else {
              const cert = certs[0];
              await window.electronAPI.sigil.signFile(filePath, cert.id);
              addLines([
                {
                  type: 'output',
                  text: `File signed: ${filePath}\nCertificate: ${cert.name}`,
                },
                { type: 'prompt', text: PROMPT_TEXT },
              ]);
            }
          } catch (err) {
            addLines([
              { type: 'error', text: `Signing failed: ${String(err)}` },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── ollama ──────────────────────────
        case 'ollama': {
          const prompt = rest;
          if (!prompt) {
            addLines([
              { type: 'error', text: 'Usage: ollama <prompt>' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
            break;
          }
          try {
            addLines([
              {
                type: 'output',
                text: `Querying the Machine Spirit: "${prompt}"...`,
              },
            ]);
            const reply = await askAnathemetron(prompt);
            addLines([
              {
                type: 'output',
                text: reply || '(empty response)',
              },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          } catch (err) {
            addLines([
              { type: 'error', text: 'AI communion failed' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── vault ───────────────────────────
        case 'vault': {
          try {
            const exists = await window.electronAPI.vault.exists();
            const unlocked = await window.electronAPI.vault.isUnlocked();
            addLines([
              {
                type: 'output',
                text: [
                  '═══════════════════════════════════════════════════',
                  '  VAULT STATUS',
                  '═══════════════════════════════════════════════════',
                  `  Initialized : ${exists ? 'YES' : 'NO'}`,
                  `  Unlocked    : ${unlocked ? 'YES' : 'NO'}`,
                  '═══════════════════════════════════════════════════',
                ].join('\n'),
              },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          } catch {
            addLines([
              { type: 'error', text: 'Failed to query vault status' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── privacy ─────────────────────────
        case 'privacy': {
          try {
            const config = await window.electronAPI.privacy.getConfig();
            addLines([
              {
                type: 'output',
                text: [
                  '═══════════════════════════════════════════════════',
                  '  PRIVACY ENGINE STATUS',
                  '═══════════════════════════════════════════════════',
                  `  Block Trackers    : ${config.blockTrackers ? 'ON' : 'OFF'}`,
                  `  Strip Params      : ${config.stripTrackingParams ? 'ON' : 'OFF'}`,
                  `  Sanitize Headers  : ${config.sanitizeHeaders ? 'ON' : 'OFF'}`,
                  `  Block WebRTC      : ${config.blockWebrtcLeaks ? 'ON' : 'OFF'}`,
                  `  Spoof Fingerprints: ${config.spoofFingerprints ? 'ON' : 'OFF'}`,
                  `  HTTPS Only        : ${config.httpsOnly ? 'ON' : 'OFF'}`,
                  `  3rd Party Cookies : ${config.blockThirdPartyCookies ? 'BLOCKED' : 'ALLOWED'}`,
                  `  DNT Header        : ${config.sendDntHeader ? 'ON' : 'OFF'}`,
                  `  Fingerprint Level : ${config.fingerprintLevel}`,
                  '═══════════════════════════════════════════════════',
                ].join('\n'),
              },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          } catch {
            addLines([
              { type: 'error', text: 'Failed to query privacy config' },
              { type: 'prompt', text: PROMPT_TEXT },
            ]);
          }
          break;
        }

        // ── theme ───────────────────────────
        case 'theme': {
          addLines([
            {
              type: 'output',
              text: [
                '═══════════════════════════════════════════════════',
                '  CURRENT THEME: Dark Mechanicus',
                '═══════════════════════════════════════════════════',
                '  Primary  : Void Black    (#000000)',
                '  Secondary: Iron Dark     (#1E1E1E)',
                '  Accent   : Omnissiah Red (#FF0000)',
                '  Gold     : Cogitator     (#C8A84B)',
                '  Cyan     : Noosphere     (#00BFBF)',
                '  Text     : Sacred White  (#E8E8E8)',
                '  Parchment: Ancient       (#D4C5A0)',
                '═══════════════════════════════════════════════════',
              ].join('\n'),
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── ver ─────────────────────────────
        case 'ver':
        case 'version': {
          addLines([
            {
              type: 'output',
              text: [
                '═══════════════════════════════════════════════════',
                '  COGITATOR BROWSER v2.1.0',
                '═══════════════════════════════════════════════════',
                '  Renderer: Chromium (Electron)',
                '  Engine  : V8',
                '  Shell   : Machine Console',
                '  Status  : ✓ All systems nominal',
                '═══════════════════════════════════════════════════',
              ].join('\n'),
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
          break;
        }

        // ── Unknown ─────────────────────────
        default: {
          addLines([
            {
              type: 'error',
              text: `Unknown command: "${cmd}". Type "help" for available commands.`,
            },
            { type: 'prompt', text: PROMPT_TEXT },
          ]);
        }
      }
    },
    [addLines]
  );

  // ── Input handlers

  const handleSubmit = useCallback(() => {
    const value = inputValue;
    setInputValue('');
    processCommand(value);
  }, [inputValue, processCommand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const next = prev + 1;
          if (next >= history.length) return prev;
          setInputValue(history[history.length - 1 - next] || '');
          return next;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHistoryIndex((prev) => {
          const next = prev - 1;
          if (next < -1) return prev;
          if (next === -1) {
            setInputValue('');
            return -1;
          }
          setInputValue(history[history.length - 1 - next] || '');
          return next;
        });
      }
    },
    [handleSubmit, history]
  );

  // ── Styles per line type

  const getLineStyle = (type: TerminalLine['type']): React.CSSProperties => {
    switch (type) {
      case 'prompt':
        return {
          color: 'var(--noosphere-cyan)',
          fontWeight: 'bold',
          whiteSpace: 'pre-wrap' as const,
          wordBreak: 'break-word' as const,
          lineHeight: 1.5,
        };
      case 'command':
        return {
          color: 'var(--cogitator-gold)',
          whiteSpace: 'pre-wrap' as const,
          wordBreak: 'break-word' as const,
          lineHeight: 1.5,
        };
      case 'output':
        return {
          color: 'var(--sacred-white)',
          whiteSpace: 'pre-wrap' as const,
          wordBreak: 'break-word' as const,
          lineHeight: 1.5,
        };
      case 'error':
        return {
          color: 'var(--omnissiah-red)',
          whiteSpace: 'pre-wrap' as const,
          wordBreak: 'break-word' as const,
          lineHeight: 1.5,
        };
      case 'ascii':
        return {
          color: 'var(--cogitator-gold)',
          whiteSpace: 'pre' as const,
          lineHeight: 1.4,
          fontSize: '11px',
        };
      default:
        return { whiteSpace: 'pre-wrap' as const };
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        background: 'var(--void-black)',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        <TerminalSquare size={14} style={{ color: 'var(--noosphere-cyan)' }} />
        <span
          style={{
            color: 'var(--noosphere-cyan)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            fontWeight: 'bold',
            textTransform: 'uppercase' as const,
          }}
        >
          Machine Console
        </span>
        <span
          style={{
            marginLeft: 'auto',
            color: 'var(--text-muted)',
            fontSize: '10px',
            letterSpacing: '0.1em',
          }}
        >
          v2.1.0
        </span>
      </div>

      {/* ── Terminal Output ───────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 10px',
          fontSize: '12px',
          lineHeight: 1.5,
        }}
        className="scrollbar-mechanicus"
      >
        {lines.map((line) => (
          <div key={line.id} style={getLineStyle(line.type)}>
            {line.type === 'prompt' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    color: 'var(--noosphere-cyan)',
                    fontWeight: 'bold',
                    whiteSpace: 'pre',
                    flexShrink: 0,
                  }}
                >
                  {PROMPT_TEXT}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--sacred-white)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    padding: 0,
                    margin: 0,
                    caretColor: 'var(--noosphere-cyan)',
                    minWidth: 0,
                  }}
                />
              </div>
            ) : (
              line.text
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
