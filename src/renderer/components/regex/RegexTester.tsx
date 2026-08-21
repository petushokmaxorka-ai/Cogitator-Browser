// ═══════════════════════════════════════════════════════════════════════════════
// REGEX TESTER — Regular Expression Testing Tool
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface RegexMatch {
  text: string;
  index: number;
  length: number;
  groups: string[];
}

interface RegexFlag {
  id: string;
  label: string;
  description: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FLAGS: RegexFlag[] = [
  { id: 'g', label: 'g', description: 'Global — find all matches' },
  { id: 'i', label: 'i', description: 'Ignore case — case-insensitive' },
  { id: 'm', label: 'm', description: 'Multiline — ^ and $ match line breaks' },
  { id: 's', label: 's', description: 'DotAll — dot matches newlines' },
  { id: 'u', label: 'u', description: 'Unicode — treat as Unicode' },
  { id: 'y', label: 'y', description: 'Sticky — match from lastIndex only' },
];

const CHEAT_SHEET: { pattern: string; desc: string }[] = [
  { pattern: '.', desc: 'Any character (except newline)' },
  { pattern: '\\d', desc: 'Digit [0-9]' },
  { pattern: '\\D', desc: 'Non-digit' },
  { pattern: '\\w', desc: 'Word [a-zA-Z0-9_]' },
  { pattern: '\\W', desc: 'Non-word' },
  { pattern: '\\s', desc: 'Whitespace' },
  { pattern: '\\S', desc: 'Non-whitespace' },
  { pattern: '\\n', desc: 'Newline' },
  { pattern: '\\t', desc: 'Tab' },
  { pattern: '^', desc: 'Start of string' },
  { pattern: '$', desc: 'End of string' },
  { pattern: '\\b', desc: 'Word boundary' },
  { pattern: '|', desc: 'Alternation (OR)' },
  { pattern: '()', desc: 'Capturing group' },
  { pattern: '(?:)', desc: 'Non-capturing group' },
  { pattern: '(?=)', desc: 'Positive lookahead' },
  { pattern: '(?!)', desc: 'Negative lookahead' },
  { pattern: '*', desc: '0 or more' },
  { pattern: '+', desc: '1 or more' },
  { pattern: '?', desc: '0 or 1' },
  { pattern: '{n}', desc: 'Exactly n' },
  { pattern: '{n,}', desc: 'n or more' },
  { pattern: '{n,m}', desc: 'Between n and m' },
  { pattern: '[abc]', desc: 'Character class' },
  { pattern: '[^abc]', desc: 'Negated class' },
  { pattern: '[a-z]', desc: 'Range' },
  { pattern: '\\1', desc: 'Backreference' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function RegexTester() {
  // ═══ State ═══
  const [pattern, setPattern] = useState('[a-zA-Z]+');
  const [activeFlags, setActiveFlags] = useState<Set<string>>(new Set(['g']));
  const [testString, setTestString] = useState(
    'Hello world 123 test\nThe quick brown fox jumps over 13 lazy dogs.\nRegex testing @#$ with patterns.'
  );
  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceText, setReplaceText] = useState('[$&]');
  const [error, setError] = useState<string | null>(null);

  // ═══ Derived: Compile Regex ═══
  const regex = useMemo(() => {
    if (!pattern) return null;
    try {
      const flags = Array.from(activeFlags).sort().join('');
      const re = new RegExp(pattern, flags);
      setError(null);
      return re;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid regex');
      return null;
    }
  }, [pattern, activeFlags]);

  // ═══ Derived: Matches ═══
  const matches = useMemo<RegexMatch[]>(() => {
    if (!regex || !testString) return [];
    const results: RegexMatch[] = [];

    try {
      if (activeFlags.has('g')) {
        let match: RegExpExecArray | null;
        const re = new RegExp(regex.source, Array.from(activeFlags).sort().join(''));
        // Prevent infinite loop on zero-length matches
        let lastIndex = -1;
        while ((match = re.exec(testString)) !== null) {
          if (match.index === lastIndex) {
            re.lastIndex++;
            lastIndex = re.lastIndex;
            continue;
          }
          lastIndex = match.index;
          results.push({
            text: match[0],
            index: match.index,
            length: match[0].length,
            groups: match.slice(1),
          });
        }
      } else {
        const match = regex.exec(testString);
        if (match) {
          results.push({
            text: match[0],
            index: match.index,
            length: match[0].length,
            groups: match.slice(1),
          });
        }
      }
    } catch {
      // Silently handle exec errors
    }

    return results;
  }, [regex, testString, activeFlags]);

  // ═══ Derived: Replace Result ═══
  const replaceResult = useMemo(() => {
    if (!regex || !replaceMode) return null;
    try {
      // For replace, we need 'g' flag to replace all
      const flags = Array.from(activeFlags).sort().join('');
      const re = new RegExp(regex.source, flags.includes('g') ? flags : flags + 'g');
      return testString.replace(re, replaceText);
    } catch {
      return null;
    }
  }, [regex, testString, replaceMode, replaceText, activeFlags]);

  // ═══ Derived: Highlighted Text ═══
  const highlightedText = useMemo(() => {
    if (!matches.length || !testString) {
      return testString;
    }

    const elements: JSX.Element[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      // Text before match
      if (match.index > lastIndex) {
        elements.push(
          <span key={`pre-${match.index}`}>
            {testString.slice(lastIndex, match.index)}
          </span>
        );
      }
      // Highlighted match
      elements.push(
        <span
          key={`match-${match.index}`}
          style={{
            background: 'rgba(0, 191, 191, 0.25)',
            borderBottom: '2px solid #00BFBF',
            color: '#00BFBF',
          }}
        >
          {match.text}
        </span>
      );
      lastIndex = match.index + match.length;
    }

    // Remaining text
    if (lastIndex < testString.length) {
      elements.push(
        <span key={`post-${lastIndex}`}>{testString.slice(lastIndex)}</span>
      );
    }

    return elements;
  }, [matches, testString]);

  // ═══ Handlers ═══
  function toggleFlag(flagId: string) {
    setActiveFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) next.delete(flagId);
      else next.add(flagId);
      return next;
    });
  }

  function handleCopyPattern() {
    const flags = Array.from(activeFlags).sort().join('');
    navigator.clipboard.writeText(`/${pattern}/${flags}`);
  }

  function handleCopyMatches() {
    const text = matches.map((m) => m.text).join('\n');
    navigator.clipboard.writeText(text);
  }

  // ═══ Render ═══
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000000',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
    >
      {/* ═══ Pattern Input ═══ */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #1E1E1E',
          background: '#111111',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: '#C8A84B',
            fontSize: '10px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚙</span>
          <span>Regex Pattern</span>
          {error && (
            <span style={{ color: '#FF0000', marginLeft: '8px' }}>✗ {error}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#FF0000', fontSize: '16px' }}>/</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern..."
            style={{
              flex: 1,
              background: '#000000',
              border: error ? '1px solid #FF0000' : '1px solid #333',
              color: '#D4C5A0',
              fontFamily: 'inherit',
              fontSize: '14px',
              padding: '6px 10px',
              outline: 'none',
              boxShadow: error ? '0 0 8px rgba(255, 0, 0, 0.15)' : 'none',
            }}
          />
          <span style={{ color: '#FF0000', fontSize: '16px' }}>/</span>
          {/* Flags */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {FLAGS.map((flag) => (
              <button
                key={flag.id}
                onClick={() => toggleFlag(flag.id)}
                title={flag.description}
                style={{
                  padding: '4px 8px',
                  background: activeFlags.has(flag.id) ? 'rgba(255, 0, 0, 0.15)' : '#1E1E1E',
                  border: activeFlags.has(flag.id) ? '1px solid #FF0000' : '1px solid #333',
                  color: activeFlags.has(flag.id) ? '#FF0000' : '#8B7D6B',
                  fontFamily: 'inherit',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 100ms ease',
                }}
              >
                {flag.label}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: '6px',
            color: '#555',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>
            /{pattern}/
            {Array.from(activeFlags)
              .sort()
              .join('')}
          </span>
          <button
            onClick={handleCopyPattern}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8B7D6B',
              cursor: 'pointer',
              fontSize: '9px',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
            }}
          >
            [copy]
          </button>
        </div>
      </div>

      {/* ═══ Test String ═══ */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #1E1E1E',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: '#C8A84B',
            fontSize: '10px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          ⚙ Test String
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}
        >
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter text to test against..."
            style={{
              flex: 1,
              height: '80px',
              background: '#000000',
              border: '1px solid #333',
              color: '#D4C5A0',
              fontFamily: 'inherit',
              fontSize: '12px',
              padding: '8px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
        {/* Highlighted preview */}
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            background: '#0D0D0D',
            border: '1px solid #1A1A1A',
            color: '#8B7D6B',
            fontSize: '12px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: '24px',
          }}
        >
          {highlightedText}
        </div>
      </div>

      {/* ═══ Replace Mode Toggle ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderBottom: '1px solid #1E1E1E',
          background: '#111',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setReplaceMode((v) => !v)}
          style={{
            padding: '3px 10px',
            background: replaceMode ? 'rgba(255, 0, 0, 0.15)' : '#1E1E1E',
            border: replaceMode ? '1px solid #FF0000' : '1px solid #333',
            color: replaceMode ? '#FF0000' : '#8B7D6B',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Replace Mode
        </button>
        {replaceMode && (
          <>
            <span style={{ color: '#C8A84B', fontSize: '10px' }}>WITH:</span>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replacement..."
              style={{
                flex: 1,
                background: '#000000',
                border: '1px solid #333',
                color: '#D4C5A0',
                fontFamily: 'inherit',
                fontSize: '11px',
                padding: '3px 8px',
                outline: 'none',
              }}
            />
            <span style={{ color: '#8B7D6B', fontSize: '9px' }}>$& = full match</span>
          </>
        )}
      </div>

      {/* ═══ Replace Result ═══ */}
      {replaceMode && replaceResult !== null && (
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #1E1E1E',
            background: '#0D0D0D',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              color: '#00BFBF',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            ⚙ Replace Result
          </div>
          <pre
            style={{
              margin: 0,
              color: '#D4C5A0',
              fontSize: '11px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {replaceResult}
          </pre>
        </div>
      )}

      {/* ═══ Matches List ═══ */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px',
          borderBottom: '1px solid #1E1E1E',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              color: '#C8A84B',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            ⚙ Matches ({matches.length})
          </span>
          {matches.length > 0 && (
            <button
              onClick={handleCopyMatches}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8B7D6B',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
              }}
            >
              [copy all]
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div
            style={{
              color: '#555',
              fontSize: '11px',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            No matches found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {matches.map((match, i) => (
              <div
                key={`${match.index}-${i}`}
                style={{
                  padding: '6px 10px',
                  background: '#0D0D0D',
                  border: '1px solid #1A1A1A',
                  borderLeft: '2px solid #00BFBF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#00BFBF', fontSize: '10px' }}>
                    Match {i + 1}
                  </span>
                  <span style={{ color: '#555', fontSize: '9px' }}>
                    pos {match.index}–{match.index + match.length}
                  </span>
                </div>
                <span
                  style={{
                    color: '#D4C5A0',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  &quot;{match.text}&quot;
                </span>
                {match.groups.length > 0 && match.groups.some(Boolean) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {match.groups.map(
                      (group, gi) =>
                        group !== undefined && (
                          <span key={gi} style={{ color: '#C8A84B', fontSize: '10px' }}>
                            Group {gi + 1}: &quot;{group}&quot;
                          </span>
                        )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Cheat Sheet ═══ */}
      <div
        style={{
          maxHeight: '140px',
          overflow: 'auto',
          padding: '10px 12px',
          background: '#0D0D0D',
          borderTop: '1px solid #1E1E1E',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: '#C8A84B',
            fontSize: '10px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          ⚙ Cheat Sheet
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '3px',
          }}
        >
          {CHEAT_SHEET.map((item) => (
            <div
              key={item.pattern}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 6px',
              }}
            >
              <code
                style={{
                  color: '#FF0000',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(255, 0, 0, 0.05)',
                  padding: '1px 4px',
                  border: '1px solid rgba(255, 0, 0, 0.15)',
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                {item.pattern}
              </code>
              <span style={{ color: '#8B7D6B', fontSize: '9px' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
