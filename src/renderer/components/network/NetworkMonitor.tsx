// ═══ NETWORK MONITOR ═══
// DevTools-style network panel — two live data sources:
//   TAB 1 "Activity": in-browser HTTP requests (Chromium webRequest feed)
//   TAB 2 "System":   active TCP/UDP sockets + interface traffic
// Dark Mechanicus interface for monitoring Machine Spirit data flow

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Trash2, Search, Wifi, WifiOff, Server, Cpu } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface NetworkEntry {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  type: string;
  size: number;
  time: number;
  startTime: number;
  endTime: number;
  fromCache: boolean;
}

interface SystemConnection {
  protocol: string;
  localAddress: string;
  localPort: number;
  peerAddress: string;
  peerPort: number;
  state: string;
  pid: number;
  process: string;
}

interface InterfaceStat {
  iface: string;
  operstate: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_sec: number;
  tx_sec: number;
  speed?: number;
}

type MonitorTab = 'activity' | 'system';

// ── Helpers ─────────────────────────────────────────────────

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (ms: number): string => `${ms} ms`;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatRate = (bytesPerSec: number): string => {
  if (bytesPerSec < 1) return '0 B/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
};

const getStatusColor = (status: number): string => {
  if (status === 0) return 'var(--omnissiah-red)';
  if (status < 200) return 'var(--parchment-dim)';
  if (status < 300) return 'var(--cyan-lua)';
  if (status < 400) return 'var(--cogitator-gold)';
  if (status < 500) return 'var(--omnissiah-red)';
  return 'var(--omnissiah-red)';
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'document': return 'var(--cogitator-gold)';
    case 'stylesheet': return 'var(--cyan-lua)';
    case 'script': return 'var(--parchment)';
    case 'image': return 'var(--parchment-dim)';
    case 'xhr': return 'var(--omnissiah-red)';
    case 'fetch': return 'var(--omnissiah-red)';
    case 'font': return '#8B8BFF';
    default: return 'var(--parchment-dim)';
  }
};

const getStateColor = (state: string): string => {
  switch (state.toLowerCase()) {
    case 'established': return 'var(--cyan-lua)';
    case 'listening': return 'var(--cogitator-gold)';
    case 'time_wait':
    case 'close_wait': return 'var(--parchment-dim)';
    default: return 'var(--parchment)';
  }
};

// ── Component ───────────────────────────────────────────────

export default function NetworkMonitor() {
  // ═══ Shared state ═══
  const [tab, setTab] = useState<MonitorTab>('activity');
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);

  // ═══ Activity tab (Chromium webRequest feed) ═══
  const [entries, setEntries] = useState<NetworkEntry[]>([]);
  const activityCursorRef = useRef(0);
  const isCapturingRef = useRef(true);
  const liveEntriesRef = useRef<NetworkEntry[]>([]);

  // ═══ System tab (systeminformation) ═══
  const [connections, setConnections] = useState<SystemConnection[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceStat[]>([]);

  // Keep ref in sync so the interval callback sees the latest value.
  useEffect(() => { isCapturingRef.current = isCapturing; }, [isCapturing]);

  // ── Activity polling (incremental via cursor) ─────────────
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const result = await window.electronAPI?.network?.requestActivity?.(activityCursorRef.current);
        if (cancelled || !result || !Array.isArray(result.entries)) return;
        if (result.entries.length > 0) {
          const mapped: NetworkEntry[] = result.entries.map((e: any) => ({
            id: e.id,
            url: e.url,
            method: e.method,
            status: e.status,
            statusText: e.statusText,
            type: e.type,
            size: e.size ?? 0,
            time: e.time,
            startTime: e.startTime,
            endTime: e.endTime,
            fromCache: !!e.fromCache,
          }));
          liveEntriesRef.current = [...liveEntriesRef.current, ...mapped].slice(-500);
          if (isCapturingRef.current) setEntries([...liveEntriesRef.current]);
        }
        activityCursorRef.current = result.nextCursor ?? activityCursorRef.current;
      } catch (err) {
        console.warn('[NetworkMonitor] activity poll failed:', err);
      }
    }
    const interval = setInterval(poll, 1500);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── System polling (connections + interface stats) ────────
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (cancelled) return;
      try {
        const [conns, ifaces] = await Promise.all([
          window.electronAPI?.network?.connections?.(),
          window.electronAPI?.network?.interfaceStats?.(),
        ]);
        if (Array.isArray(conns)) setConnections(conns);
        if (Array.isArray(ifaces)) setInterfaces(ifaces);
      } catch (err) {
        console.warn('[NetworkMonitor] system poll failed:', err);
      }
    }
    const interval = setInterval(poll, 3000);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── Clear handler (panel-local + IPC) ─────────────────────
  const handleClear = useCallback(() => {
    liveEntriesRef.current = [];
    setEntries([]);
    setSelectedId(null);
    activityCursorRef.current = 0;
    void window.electronAPI?.network?.clearActivity?.();
  }, []);

  // ═══ Derived ═══

  const filtered = entries.filter(
    (e) =>
      e.url.toLowerCase().includes(filter.toLowerCase()) ||
      e.type.toLowerCase().includes(filter.toLowerCase()) ||
      e.method.toLowerCase().includes(filter.toLowerCase())
  );

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
  const totalTime = entries.length > 0 ? Math.max(...entries.map((e) => e.endTime)) - Math.min(...entries.map((e) => e.startTime)) : 0;
  const errorCount = entries.filter((e) => e.status >= 400 || e.status === 0).length;

  const filteredConns = connections.filter(
    (c) =>
      c.process.toLowerCase().includes(filter.toLowerCase()) ||
      c.peerAddress.toLowerCase().includes(filter.toLowerCase()) ||
      c.state.toLowerCase().includes(filter.toLowerCase()) ||
      c.protocol.toLowerCase().includes(filter.toLowerCase())
  );

  // ═══ Render ═══

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--iron-dark)',
        }}
      >
        <Activity size={14} color="var(--cyan-lua)" />
        <span style={{ color: 'var(--cyan-lua)', fontSize: 11, letterSpacing: '0.1em' }}>
          NETWORK MONITOR
        </span>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
          <button
            onClick={() => setTab('activity')}
            style={{
              background: tab === 'activity' ? 'rgba(0, 191, 191, 0.12)' : 'transparent',
              border: `1px solid ${tab === 'activity' ? 'var(--cyan-lua)' : 'var(--iron-gray)'}`,
              color: tab === 'activity' ? 'var(--cyan-lua)' : 'var(--parchment-dim)',
              padding: '2px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Activity size={10} /> ACTIVITY
          </button>
          <button
            onClick={() => setTab('system')}
            style={{
              background: tab === 'system' ? 'rgba(0, 191, 191, 0.12)' : 'transparent',
              border: `1px solid ${tab === 'system' ? 'var(--cyan-lua)' : 'var(--iron-gray)'}`,
              color: tab === 'system' ? 'var(--cyan-lua)' : 'var(--parchment-dim)',
              padding: '2px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Server size={10} /> SYSTEM
          </button>
        </div>

        <span style={{ color: 'var(--parchment-dim)', fontSize: 10, marginLeft: 'auto' }}>
          {tab === 'activity'
            ? `${entries.length} req | ${formatSize(totalSize)} | ${formatTime(totalTime)}${errorCount > 0 ? ` | ${errorCount} err` : ''}`
            : `${connections.length} conns | ${interfaces.length} iface`}
        </span>
        <button
          onClick={() => setIsCapturing(!isCapturing)}
          title={isCapturing ? 'Pause capture' : 'Resume capture'}
          style={{
            background: 'transparent',
            border: 'none',
            color: isCapturing ? 'var(--cyan-lua)' : 'var(--parchment-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            transition: 'color 150ms ease',
          }}
        >
          {isCapturing ? <Wifi size={12} /> : <WifiOff size={12} />}
        </button>
        <button
          onClick={handleClear}
          title="Clear log"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 2,
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--parchment-dim)'; }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* ── Filter ── */}
      <div style={{ padding: 8, borderBottom: '1px solid var(--iron-gray)' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={12}
            style={{ position: 'absolute', left: 8, top: 6, color: 'var(--parchment-dim)', pointerEvents: 'none' }}
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={tab === 'activity' ? 'Filter URLs, types, methods...' : 'Filter process, peer, state...'}
            style={{
              width: '100%',
              padding: '4px 8px 4px 28px',
              background: 'var(--card-bg)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              outline: 'none',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cogitator-gold)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
          />
        </div>
      </div>

      {/* ═══ ACTIVITY TAB ═══ */}
      {tab === 'activity' && (
        <>
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 55px 45px 55px 65px 55px',
              gap: 4,
              padding: '4px 12px',
              borderBottom: '1px solid var(--iron-gray)',
              fontSize: 9,
              color: 'var(--parchment-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'var(--iron-dark)',
            }}
          >
            <span></span>
            <span>Name</span>
            <span>Status</span>
            <span>Type</span>
            <span>Size</span>
            <span>Time</span>
            <span>Method</span>
          </div>

          {/* Entries List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--parchment-dim)', fontSize: 11 }}>
                {entries.length === 0 ? 'Awaiting requests — open a page to populate the feed' : 'No matching entries'}
              </div>
            ) : (
              filtered.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr 55px 45px 55px 65px 55px',
                    gap: 4,
                    padding: '4px 12px',
                    borderBottom: '1px solid #1A1A1A',
                    fontSize: 10,
                    cursor: 'pointer',
                    background: selectedId === entry.id ? 'var(--card-bg)' : 'transparent',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={(e) => { if (selectedId !== entry.id) e.currentTarget.style.background = '#161616'; }}
                  onMouseLeave={(e) => { if (selectedId !== entry.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: getStatusColor(entry.status), fontSize: 10, lineHeight: '14px' }}>●</span>
                  <span
                    style={{ color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={entry.url}
                  >
                    {entry.fromCache && <span style={{ color: 'var(--parchment-dim)' }}>[cache] </span>}
                    {entry.url.split('/').pop() || entry.url}
                  </span>
                  <span style={{ color: getStatusColor(entry.status) }}>
                    {entry.status === 0 ? 'ERR' : entry.status}
                  </span>
                  <span style={{ color: getTypeColor(entry.type), textTransform: 'uppercase' }}>
                    {entry.type.slice(0, 4)}
                  </span>
                  <span style={{ color: 'var(--parchment-dim)' }}>
                    {entry.size === 0 ? '—' : formatSize(entry.size)}
                  </span>
                  <span style={{ color: entry.time > 200 ? 'var(--omnissiah-red)' : 'var(--cyan-lua)' }}>
                    {formatTime(entry.time)}
                  </span>
                  <span style={{ color: 'var(--parchment-dim)' }}>{entry.method}</span>
                </div>
              ))
            )}
          </div>

          {/* Detail Panel */}
          {selectedId && (
            <div
              style={{
                height: 140,
                borderTop: '1px solid var(--iron-gray)',
                padding: 12,
                background: 'var(--card-bg)',
                overflow: 'auto',
              }}
            >
              {(() => {
                const entry = entries.find((e) => e.id === selectedId);
                if (!entry) return null;
                return (
                  <div style={{ fontSize: 10 }}>
                    <div
                      style={{
                        color: 'var(--cogitator-gold)',
                        marginBottom: 6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={entry.url}
                    >
                      URL: {entry.url}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                      <div style={{ color: 'var(--parchment-dim)' }}>
                        Status: <span style={{ color: getStatusColor(entry.status) }}>{entry.status} {entry.statusText}</span>
                      </div>
                      <div style={{ color: 'var(--parchment-dim)' }}>
                        Type: <span style={{ color: getTypeColor(entry.type) }}>{entry.type}</span>
                      </div>
                      <div style={{ color: 'var(--parchment-dim)' }}>Size: {formatSize(entry.size)}</div>
                      <div style={{ color: 'var(--parchment-dim)' }}>Time: {formatTime(entry.time)}</div>
                      <div style={{ color: 'var(--parchment-dim)' }}>Method: {entry.method}</div>
                      <div style={{ color: 'var(--parchment-dim)' }}>Cache: {entry.fromCache ? 'yes' : 'no'}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ═══ SYSTEM TAB ═══ */}
      {tab === 'system' && (
        <>
          {/* Interface traffic summary */}
          <div style={{ padding: 8, borderBottom: '1px solid var(--iron-gray)', background: 'var(--iron-dark)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--cogitator-gold)', fontSize: 10, letterSpacing: '0.08em' }}>
              <Cpu size={11} /> INTERFACES
            </div>
            {interfaces.length === 0 ? (
              <div style={{ color: 'var(--parchment-dim)', fontSize: 10 }}>No interface data</div>
            ) : (
              interfaces.map((iface) => (
                <div key={iface.iface} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '3px 0', fontSize: 10 }}>
                  <span style={{ color: 'var(--parchment)' }}>{iface.iface} <span style={{ color: 'var(--parchment-dim)' }}>({iface.operstate})</span></span>
                  <span style={{ color: 'var(--cyan-lua)' }}>↓ {formatRate(iface.rx_sec)}</span>
                  <span style={{ color: 'var(--cogitator-gold)' }}>↑ {formatRate(iface.tx_sec)}</span>
                  <span style={{ color: 'var(--parchment-dim)' }}>{formatBytes(iface.rx_bytes)} / {formatBytes(iface.tx_bytes)}</span>
                </div>
              ))
            )}
          </div>

          {/* Connection table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '50px 1fr 60px 90px',
              gap: 4,
              padding: '4px 12px',
              borderBottom: '1px solid var(--iron-gray)',
              fontSize: 9,
              color: 'var(--parchment-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'var(--iron-dark)',
            }}
          >
            <span>Proto</span>
            <span>Peer</span>
            <span>State</span>
            <span>Process</span>
          </div>

          {/* Connection list */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredConns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--parchment-dim)', fontSize: 11 }}>
                {connections.length === 0 ? 'No active connections detected' : 'No matching connections'}
              </div>
            ) : (
              filteredConns.slice(0, 200).map((c, i) => (
                <div
                  key={`${c.pid}-${c.localPort}-${c.peerPort}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr 60px 90px',
                    gap: 4,
                    padding: '3px 12px',
                    borderBottom: '1px solid #1A1A1A',
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: 'var(--parchment-dim)' }}>{c.protocol}</span>
                  <span
                    style={{ color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`${c.localAddress}:${c.localPort} → ${c.peerAddress}:${c.peerPort}`}
                  >
                    {c.peerAddress}:{c.peerPort}
                  </span>
                  <span style={{ color: getStateColor(c.state) }}>{c.state}</span>
                  <span
                    style={{ color: 'var(--cogitator-gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`${c.process} (pid ${c.pid})`}
                  >
                    {c.process}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
