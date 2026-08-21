// ═══════════════════════════════════════════════════════════
// Task Forge — Process Manager (Chrome Task Manager style)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { Cpu, Skull, RefreshCw } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface ProcessInfo {
  pid: number;
  name: string;
  type: 'browser' | 'renderer' | 'gpu' | 'utility' | 'tab';
  memory: number; // MB
  cpu: number; // %
  url?: string; // for tabs
}

type SortKey = 'name' | 'memory' | 'cpu' | 'pid' | 'type';
type SortDir = 'asc' | 'desc';

// ── Demo Data (offline preview — loaded on demand via DEMO button) ──

const MOCK_PROCESSES: ProcessInfo[] = [
  { pid: 1234, name: 'Cogitator Browser', type: 'browser', memory: 85, cpu: 2.5 },
  { pid: 1235, name: 'GPU Process', type: 'gpu', memory: 64, cpu: 1.2 },
  { pid: 1236, name: 'Tab: DuckDuckGo', type: 'tab', memory: 42, cpu: 0.8, url: 'https://duckduckgo.com' },
  { pid: 1237, name: 'Tab: GitHub', type: 'tab', memory: 78, cpu: 1.5, url: 'https://github.com' },
  { pid: 1238, name: 'AI Sidebar', type: 'renderer', memory: 56, cpu: 3.2 },
  { pid: 1239, name: 'Utility: Network Service', type: 'utility', memory: 12, cpu: 0.1 },
  { pid: 1240, name: 'AdBlocker', type: 'utility', memory: 8, cpu: 0.3 },
  { pid: 1241, name: 'Noosphere Search', type: 'tab', memory: 23, cpu: 0.5, url: 'http://localhost:8888' },
];

// ── Helpers ─────────────────────────────────────────────────

const getTypeColor = (type: ProcessInfo['type']): string => {
  switch (type) {
    case 'browser':
      return 'var(--noosphere-cyan)';
    case 'gpu':
      return 'var(--parchment)';
    case 'tab':
      return 'var(--sacred-white)';
    case 'renderer':
      return 'var(--cogitator-gold)';
    case 'utility':
      return 'var(--parchment-dim)';
    default:
      return 'var(--parchment)';
  }
};

const getTypeLabel = (type: ProcessInfo['type']): string => {
  switch (type) {
    case 'browser':
      return 'BROWSER';
    case 'gpu':
      return 'GPU';
    case 'tab':
      return 'TAB';
    case 'renderer':
      return 'RENDERER';
    case 'utility':
      return 'UTILITY';
    default:
      return 'UNKNOWN';
  }
};

const formatMemory = (mb: number): string => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
};

const formatCpu = (cpu: number): string => `${cpu.toFixed(1)}%`;

const sortProcesses = (
  processes: ProcessInfo[],
  key: SortKey,
  dir: SortDir
): ProcessInfo[] => {
  const sorted = [...processes].sort((a, b) => {
    let cmp = 0;
    if (key === 'name') cmp = a.name.localeCompare(b.name);
    else if (key === 'pid') cmp = a.pid - b.pid;
    else if (key === 'memory') cmp = a.memory - b.memory;
    else if (key === 'cpu') cmp = a.cpu - b.cpu;
    else if (key === 'type') cmp = a.type.localeCompare(b.type);
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
};

// ── Component ───────────────────────────────────────────────

export function ProcessManager() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('memory');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [killedPids, setKilledPids] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Simulate process updates ──────────────────────────────

  const refreshProcesses = useCallback(async () => {
    try {
      const list = await window.electronAPI?.process?.list?.();
      if (!Array.isArray(list)) return;
      setProcesses(
        list.map((p: { pid: number; name: string; cpu: number; mem: number; command?: string }) => ({
          pid: p.pid,
          name: p.name,
          type: 'utility' as const,
          memory: Math.round(p.mem ?? 0),
          cpu: p.cpu ?? 0,
          url: p.command,
        })),
      );
    } catch (err) {
      console.warn('[ProcessManager]', err);
    }
  }, []);

  useEffect(() => {
    void refreshProcesses();
    intervalRef.current = setInterval(() => void refreshProcesses(), 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshProcesses]);

  // ── Sorting ───────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = sortProcesses(
    processes.filter((p) => !killedPids.has(p.pid)),
    sortKey,
    sortDir
  );

  // ── Kill process ──────────────────────────────────────────

  const handleKillProcess = () => {
    if (selectedPid === null) return;
    void window.electronAPI?.process?.kill?.(selectedPid).then(() => {
      setKilledPids((prev) => new Set(prev).add(selectedPid));
      setSelectedPid(null);
      void refreshProcesses();
    });
  };

  // ── Totals ────────────────────────────────────────────────

  const totalMemory = sorted.reduce((sum, p) => sum + p.memory, 0);
  const totalCpu = sorted.reduce((sum, p) => sum + p.cpu, 0);

  // ── Sort indicator ────────────────────────────────────────

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Render ────────────────────────────────────────────────

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cogitator-gold)',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          <Cpu size={16} />
          <span>TASK FORGE — Process Manager</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Demo data button (offline preview) */}
          <button
            onClick={() => setProcesses(MOCK_PROCESSES)}
            title="Load demo process list for offline preview"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--parchment-dim)';
              e.currentTarget.style.color = 'var(--parchment)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
          >
            <span>⚙ DEMO</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={refreshProcesses}
            title="Refresh now"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
              e.currentTarget.style.color = 'var(--cogitator-gold)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment)';
            }}
          >
            <RefreshCw size={12} />
            <span>REFRESH</span>
          </button>

          {/* Kill button */}
          <button
            onClick={handleKillProcess}
            disabled={selectedPid === null}
            title="End selected process"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background:
                selectedPid !== null
                  ? 'rgba(255, 0, 0, 0.15)'
                  : 'var(--iron-dark)',
              border:
                selectedPid !== null
                  ? '1px solid var(--omnissiah-red)'
                  : '1px solid var(--iron-gray)',
              color:
                selectedPid !== null
                  ? 'var(--omnissiah-red)'
                  : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              cursor: selectedPid !== null ? 'pointer' : 'not-allowed',
              opacity: selectedPid !== null ? 1 : 0.5,
              transition: 'all 150ms ease',
              textShadow:
                selectedPid !== null
                  ? '0 0 8px rgba(255, 0, 0, 0.5)'
                  : 'none',
              boxShadow:
                selectedPid !== null ? '0 0 12px rgba(255, 0, 0, 0.2)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedPid !== null) {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.25)';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPid !== null) {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.15)';
                e.currentTarget.style.boxShadow =
                  '0 0 12px rgba(255, 0, 0, 0.2)';
              }
            }}
          >
            <Skull size={12} />
            <span>⚔ END PROCESS</span>
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 80px 70px 60px 80px',
            gap: '4px',
            padding: '6px 12px',
            background: 'var(--iron-dark)',
            borderBottom: '1px solid var(--iron-gray)',
            position: 'sticky',
            top: 0,
            zIndex: 2,
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: 'var(--cogitator-gold)',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          <div
            onClick={() => handleSort('name')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              userSelect: 'none',
            }}
          >
            <SortArrow col="name" />
            <span>Process</span>
          </div>
          <div
            onClick={() => handleSort('memory')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              userSelect: 'none',
              justifyContent: 'flex-end',
            }}
          >
            <SortArrow col="memory" />
            <span>Memory</span>
          </div>
          <div
            onClick={() => handleSort('cpu')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              userSelect: 'none',
              justifyContent: 'flex-end',
            }}
          >
            <SortArrow col="cpu" />
            <span>CPU</span>
          </div>
          <div
            onClick={() => handleSort('pid')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              userSelect: 'none',
              justifyContent: 'flex-end',
            }}
          >
            <SortArrow col="pid" />
            <span>PID</span>
          </div>
          <div
            onClick={() => handleSort('type')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              userSelect: 'none',
              justifyContent: 'flex-end',
            }}
          >
            <SortArrow col="type" />
            <span>Type</span>
          </div>
        </div>

        {/* Table Body */}
        {sorted.length === 0 ? (
          <div
            style={{
              padding: '40px 12px',
              textAlign: 'center',
              color: 'var(--parchment-dim)',
              fontSize: '12px',
            }}
          >
            No active processes
          </div>
        ) : (
          sorted.map((proc) => {
            const isSelected = selectedPid === proc.pid;
            return (
              <div
                key={proc.pid}
                onClick={() => setSelectedPid(proc.pid)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 80px 70px 60px 80px',
                  gap: '4px',
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--iron-gray)',
                  borderLeft: isSelected
                    ? '2px solid var(--omnissiah-red)'
                    : '2px solid transparent',
                  background: isSelected
                    ? 'var(--steel-gray)'
                    : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 100ms ease',
                  fontSize: '11px',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--iron-dark)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {/* Process Name */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      color: getTypeColor(proc.type),
                      fontWeight: isSelected ? 'bold' : 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={proc.name}
                  >
                    {proc.name}
                  </span>
                  {proc.url && (
                    <span
                      style={{
                        color: 'var(--parchment-dim)',
                        fontSize: '9px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={proc.url}
                    >
                      {proc.url}
                    </span>
                  )}
                </div>

                {/* Memory */}
                <div
                  style={{
                    color: 'var(--parchment)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatMemory(proc.memory)}
                </div>

                {/* CPU */}
                <div
                  style={{
                    color:
                      proc.cpu > 3
                        ? 'var(--omnissiah-red)'
                        : proc.cpu > 1
                          ? 'var(--cogitator-gold)'
                          : 'var(--parchment)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCpu(proc.cpu)}
                </div>

                {/* PID */}
                <div
                  style={{
                    color: 'var(--parchment-dim)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {proc.pid}
                </div>

                {/* Type */}
                <div
                  style={{
                    textAlign: 'right',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '2px',
                      background: `${getTypeColor(proc.type)}15`,
                      color: getTypeColor(proc.type),
                      fontSize: '9px',
                      letterSpacing: '0.06em',
                      fontWeight: 'bold',
                    }}
                  >
                    {getTypeLabel(proc.type)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer (Totals) ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 80px 70px 60px 80px',
          gap: '4px',
          padding: '8px 12px',
          borderTop: '1px solid var(--iron-gray)',
          background: 'var(--iron-dark)',
          flexShrink: 0,
          fontSize: '10px',
          letterSpacing: '0.08em',
          color: 'var(--cogitator-gold)',
          fontWeight: 'bold',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ color: 'var(--parchment-dim)' }}>
            {sorted.length} PROCESSES
          </span>
        </div>
        <div
          style={{
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--parchment)',
          }}
        >
          {formatMemory(totalMemory)}
        </div>
        <div
          style={{
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            color:
              totalCpu > 10
                ? 'var(--omnissiah-red)'
                : 'var(--parchment)',
          }}
        >
          {formatCpu(totalCpu)}
        </div>
        <div />
        <div />
      </div>
    </div>
  );
}

export default ProcessManager;
