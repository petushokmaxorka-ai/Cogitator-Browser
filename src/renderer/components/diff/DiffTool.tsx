// ═══════════════════════════════════════════════════════════════════════════════
// DIFF TOOL — Text Comparison Tool (Git Diff Style)
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  originalLineNum: number | null;
  modifiedLineNum: number | null;
  content: string;
  charDiffs?: { char: string; changed: boolean }[];
}

// ── Diff Algorithm (LCS-based) ───────────────────────────────────────────────

function computeDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  // Use a simple LCS (Longest Common Subsequence) approach
  const result: DiffLine[] = [];
  let origIdx = 0;
  let modIdx = 0;

  // Build LCS matrix
  const lcsMatrix: number[][] = [];
  for (let i = 0; i <= origLines.length; i++) {
    lcsMatrix[i] = new Array(modLines.length + 1).fill(0);
  }

  for (let i = 1; i <= origLines.length; i++) {
    for (let j = 1; j <= modLines.length; j++) {
      if (origLines[i - 1] === modLines[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1;
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1]);
      }
    }
  }

  // Backtrack to get diff
  const diffOps: { type: 'same' | 'add' | 'remove'; origIdx: number; modIdx: number }[] = [];

  let i = origLines.length;
  let j = modLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
      diffOps.unshift({ type: 'same', origIdx: i - 1, modIdx: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
      diffOps.unshift({ type: 'add', origIdx: -1, modIdx: j - 1 });
      j--;
    } else {
      diffOps.unshift({ type: 'remove', origIdx: i - 1, modIdx: -1 });
      i--;
    }
  }

  // Build result with character-level diff for changed lines
  for (const op of diffOps) {
    if (op.type === 'same') {
      result.push({
        type: 'unchanged',
        originalLineNum: op.origIdx + 1,
        modifiedLineNum: op.modIdx + 1,
        content: origLines[op.origIdx],
      });
    } else if (op.type === 'remove') {
      result.push({
        type: 'removed',
        originalLineNum: op.origIdx + 1,
        modifiedLineNum: null,
        content: origLines[op.origIdx],
      });
    } else if (op.type === 'add') {
      // Check if the previous operation was a remove (inline change)
      const prev = result[result.length - 1];
      if (prev && prev.type === 'removed') {
        // Compute character-level diff
        prev.charDiffs = computeCharDiff(prev.content, modLines[op.modIdx]);
        result.push({
          type: 'added',
          originalLineNum: null,
          modifiedLineNum: op.modIdx + 1,
          content: modLines[op.modIdx],
          charDiffs: computeCharDiff(modLines[op.modIdx], prev.content),
        });
      } else {
        result.push({
          type: 'added',
          originalLineNum: null,
          modifiedLineNum: op.modIdx + 1,
          content: modLines[op.modIdx],
        });
      }
    }
  }

  return result;
}

// Compute character-level differences between two strings
function computeCharDiff(a: string, b: string): { char: string; changed: boolean }[] {
  const result: { char: string; changed: boolean }[] = [];
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < a.length) {
      result.push({
        char: a[i],
        changed: i >= b.length || a[i] !== b[i],
      });
    }
  }

  return result;
}

// ── Default Content ──────────────────────────────────────────────────────────

const DEFAULT_ORIGINAL = `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  const increment = () => {
    setCount(count + 1);
  };
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Add</button>
    </div>
  );
}

export default Counter;`;

const DEFAULT_MODIFIED = `import { useState, useCallback } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  
  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
    setHistory((prev) => [...prev, count]);
  }, [count]);
  
  const decrement = useCallback(() => {
    setCount((prev) => prev - 1);
  }, []);
  
  return (
    <div className="counter">
      <h2>Counter Component</h2>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
      <p>History: {history.join(', ')}</p>
    </div>
  );
}

export default Counter;`;

// ── Component ────────────────────────────────────────────────────────────────

export default function DiffTool() {
  // ═══ State ═══
  const [original, setOriginal] = useState(DEFAULT_ORIGINAL);
  const [modified, setModified] = useState(DEFAULT_MODIFIED);
  const [showDiff, setShowDiff] = useState(true);

  // ═══ Derived ═══
  const diffLines = useMemo(() => computeDiff(original, modified), [original, modified]);

  const stats = useMemo(() => {
    const added = diffLines.filter((l) => l.type === 'added').length;
    const removed = diffLines.filter((l) => l.type === 'removed').length;
    const unchanged = diffLines.filter((l) => l.type === 'unchanged').length;
    return { added, removed, unchanged };
  }, [diffLines]);

  // ═══ Handlers ═══
  function handleCopyDiff() {
    const lines = diffLines.map((l) => {
      const prefix = l.type === 'added' ? '+' : l.type === 'removed' ? '-' : ' ';
      return `${prefix}${l.content}`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
  }

  function handleSavePatch() {
    const lines = diffLines.map((l) => {
      const prefix = l.type === 'added' ? '+' : l.type === 'removed' ? '-' : ' ';
      return `${prefix}${l.content}`;
    });
    const patch = `--- original\n+++ modified\n@@ -1,${stats.unchanged + stats.removed} +1,${stats.unchanged + stats.added} @@\n${lines.join('\n')}`;

    const blob = new Blob([patch], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'changes.patch';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setOriginal('');
    setModified('');
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
      {/* ═══ Toolbar ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          borderBottom: '1px solid #1E1E1E',
          background: '#111111',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setShowDiff((v) => !v)}
          style={{
            padding: '3px 12px',
            background: showDiff ? 'rgba(255, 0, 0, 0.15)' : '#1E1E1E',
            border: showDiff ? '1px solid #FF0000' : '1px solid #333',
            color: showDiff ? '#FF0000' : '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Compare
        </button>
        <button
          onClick={handleCopyDiff}
          style={{
            padding: '3px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          Copy
        </button>
        <button
          onClick={handleSavePatch}
          style={{
            padding: '3px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          Save .patch
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '3px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          Clear
        </button>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
          <span style={{ color: '#4ade80' }}>+{stats.added} added</span>
          <span style={{ color: '#f87171' }}>-{stats.removed} removed</span>
          <span style={{ color: '#555' }}>{stats.unchanged} unchanged</span>
        </div>
      </div>

      {/* ═══ Input Panels ═══ */}
      <div
        style={{
          display: 'flex',
          height: '35%',
          minHeight: '100px',
          borderBottom: '1px solid #1E1E1E',
          flexShrink: 0,
        }}
      >
        {/* Original */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #1E1E1E',
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              color: '#f87171',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              background: '#111',
              borderBottom: '1px solid #1E1E1E',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>-</span>
            <span>Original</span>
          </div>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            style={{
              flex: 1,
              background: '#000000',
              border: 'none',
              color: '#D4C5A0',
              fontFamily: 'inherit',
              fontSize: '11px',
              padding: '8px',
              outline: 'none',
              resize: 'none',
              lineHeight: '1.6',
            }}
            spellCheck={false}
          />
        </div>

        {/* Modified */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '4px 12px',
              color: '#4ade80',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              background: '#111',
              borderBottom: '1px solid #1E1E1E',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>+</span>
            <span>Modified</span>
          </div>
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            style={{
              flex: 1,
              background: '#000000',
              border: 'none',
              color: '#D4C5A0',
              fontFamily: 'inherit',
              fontSize: '11px',
              padding: '8px',
              outline: 'none',
              resize: 'none',
              lineHeight: '1.6',
            }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* ═══ Diff View ═══ */}
      {showDiff && (
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#000000',
          }}
        >
          {/* Diff Header */}
          <div
            style={{
              padding: '6px 12px',
              color: '#C8A84B',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              background: '#111',
              borderBottom: '1px solid #1E1E1E',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            ⚙ Unified Diff
          </div>

          {/* Diff Lines */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {diffLines.map((line, i) => {
              const bgColor =
                line.type === 'added'
                  ? 'rgba(74, 222, 128, 0.08)'
                  : line.type === 'removed'
                    ? 'rgba(248, 113, 113, 0.08)'
                    : 'transparent';
              const borderLeft =
                line.type === 'added'
                  ? '2px solid #4ade80'
                  : line.type === 'removed'
                    ? '2px solid #f87171'
                    : '2px solid transparent';
              const prefixColor =
                line.type === 'added' ? '#4ade80' : line.type === 'removed' ? '#f87171' : '#555';

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    background: bgColor,
                    borderLeft,
                    fontSize: '11px',
                    lineHeight: '20px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {/* Line Numbers */}
                  <span
                    style={{
                      width: '40px',
                      textAlign: 'right',
                      paddingRight: '8px',
                      color: '#555',
                      fontSize: '10px',
                      userSelect: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {line.originalLineNum ?? ''}
                  </span>
                  <span
                    style={{
                      width: '40px',
                      textAlign: 'right',
                      paddingRight: '8px',
                      color: '#555',
                      fontSize: '10px',
                      userSelect: 'none',
                      borderRight: '1px solid #1A1A1A',
                      flexShrink: 0,
                    }}
                  >
                    {line.modifiedLineNum ?? ''}
                  </span>

                  {/* Prefix */}
                  <span
                    style={{
                      width: '16px',
                      textAlign: 'center',
                      color: prefixColor,
                      fontWeight: 'bold',
                      userSelect: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </span>

                  {/* Content with char-level diff */}
                  <span
                    style={{
                      flex: 1,
                      paddingLeft: '4px',
                      color:
                        line.type === 'added'
                          ? '#4ade80'
                          : line.type === 'removed'
                            ? '#f87171'
                            : '#D4C5A0',
                      whiteSpace: 'pre',
                      overflow: 'hidden',
                    }}
                  >
                    {line.charDiffs ? (
                      line.charDiffs.map((cd, ci) => (
                        <span
                          key={ci}
                          style={{
                            background: cd.changed
                              ? line.type === 'added'
                                ? 'rgba(74, 222, 128, 0.3)'
                                : 'rgba(248, 113, 113, 0.3)'
                              : 'transparent',
                            fontWeight: cd.changed ? 'bold' : 'normal',
                          }}
                        >
                          {cd.char === ' ' ? '\u00A0' : cd.char}
                        </span>
                      ))
                    ) : (
                      <span>{line.content || ' '}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
