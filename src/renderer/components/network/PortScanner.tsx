// ═══ PORT SCANNER ═══
// Network port scanner — nmap-style interface for the Omnissiah
// Backend: real TCP connect scan via IPC (network-tools.ts, net.connect)

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Radar,
  Play,
  Square,
  Shield,
  ShieldAlert,
  ShieldOff,
  Target,
  Activity,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface PortResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service: string;
  responseTime: number;
}

// ── Constants ───────────────────────────────────────────────

const COMMON_PORTS: Record<number, string> = {
  20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'Telnet',
  25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP-CLIENT',
  80: 'HTTP', 110: 'POP3', 119: 'NNTP', 123: 'NTP',
  135: 'MS-RPC', 139: 'NetBIOS', 143: 'IMAP', 161: 'SNMP',
  389: 'LDAP', 443: 'HTTPS', 445: 'SMB', 514: 'Syslog',
  587: 'SMTP-SSL', 636: 'LDAPS', 993: 'IMAPS', 995: 'POP3S',
  1433: 'MSSQL', 1521: 'Oracle', 3306: 'MySQL', 3389: 'RDP',
  5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis',
  8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 9000: 'Portainer',
  9200: 'Elasticsearch', 27017: 'MongoDB',
};

const DEFAULT_QUICK_PORTS = [22, 80, 443, 3306, 5432, 6379, 8080, 3000];

// ── Component ───────────────────────────────────────────────

export default function PortScanner() {
  const [host, setHost] = useState('localhost');
  const [portFrom, setPortFrom] = useState('1');
  const [portTo, setPortTo] = useState('1024');
  const [useCommonPorts, setUseCommonPorts] = useState(false);
  const [quickPorts, setQuickPorts] = useState<number[]>(DEFAULT_QUICK_PORTS);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<PortResult[]>([]);
  const [scanStats, setScanStats] = useState({ open: 0, closed: 0, filtered: 0, total: 0, elapsed: 0 });
  const [showFilters, setShowFilters] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed' | 'filtered'>('all');
  const [sortBy, setSortBy] = useState<'port' | 'status'>('port');
  const abortRef = useRef(false);

  // ── Computed ──────────────────────────────────────────────
  const portsToScan = useCallback((): number[] => {
    if (useCommonPorts) {
      return quickPorts;
    }
    const from = parseInt(portFrom) || 1;
    const to = parseInt(portTo) || 1024;
    return Array.from({ length: Math.min(to - from + 1, 65535) }, (_, i) => from + i);
  }, [useCommonPorts, quickPorts, portFrom, portTo]);

  const filteredResults = results
    .filter((r) => filterStatus === 'all' || r.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'port') return a.port - b.port;
      const order = { open: 0, filtered: 1, closed: 2 };
      return order[a.status] - order[b.status];
    });

  // ── Handlers ──────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    const ports = portsToScan();
    if (ports.length === 0 || isScanning) return;

    setIsScanning(true);
    setResults([]);
    setProgress(0);
    abortRef.current = false;

    const startTime = Date.now();
    try {
      if (useCommonPorts) {
        let completed = 0;
        const scanResults: PortResult[] = [];
        for (const port of ports) {
          if (abortRef.current) break;
          const openPorts = await window.electronAPI?.network?.scanPorts?.(host, port, port);
          completed++;
          setProgress(Math.round((completed / ports.length) * 100));
          const r = (openPorts ?? [])[0];
          if (r) {
            scanResults.push({
              port: r.port,
              status: r.status as PortResult['status'],
              service: r.service || COMMON_PORTS[r.port] || 'Unknown',
              responseTime: Date.now() - startTime,
            });
          }
        }
        setResults(scanResults);
        setScanStats({
          open: scanResults.filter((r) => r.status === 'open').length,
          closed: scanResults.filter((r) => r.status === 'closed').length,
          filtered: scanResults.filter((r) => r.status === 'filtered').length,
          total: ports.length,
          elapsed: Date.now() - startTime,
        });
      } else {
        const from = Math.min(...ports);
        const to = Math.max(...ports);
        const openPorts = await window.electronAPI?.network?.scanPorts?.(host, from, to);
        const scanResults: PortResult[] = (openPorts ?? []).map((r: { port: number; status: string; service?: string }) => ({
          port: r.port,
          status: r.status as PortResult['status'],
          service: r.service || COMMON_PORTS[r.port] || 'Unknown',
          responseTime: Date.now() - startTime,
        }));
        setResults(scanResults);
        setScanStats({
          open: scanResults.length,
          closed: ports.length - scanResults.length,
          filtered: 0,
          total: ports.length,
          elapsed: Date.now() - startTime,
        });
      }
    } catch (err) {
      console.warn('[PortScanner]', err);
    }
    setIsScanning(false);
    setProgress(100);
  }, [host, portsToScan, isScanning, useCommonPorts]);

  const handleAbort = useCallback(() => {
    abortRef.current = true;
    setIsScanning(false);
  }, []);

  const handleClear = useCallback(() => {
    setResults([]);
    setProgress(0);
    setScanStats({ open: 0, closed: 0, filtered: 0, total: 0, elapsed: 0 });
  }, []);

  const toggleQuickPort = useCallback((port: number) => {
    setQuickPorts((prev) =>
      prev.includes(port) ? prev.filter((p) => p !== port) : [...prev, port]
    );
  }, []);

  // ── Status badge ──────────────────────────────────────────
  const StatusIcon = ({ status }: { status: PortResult['status'] }) => {
    switch (status) {
      case 'open':
        return <ShieldAlert size={12} style={{ color: '#FF0000' }} />;
      case 'filtered':
        return <Shield size={12} style={{ color: '#C8A84B' }} />;
      case 'closed':
        return <ShieldOff size={12} style={{ color: '#555' }} />;
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000000',
        fontFamily: "'Courier New', 'Consolas', monospace",
        fontSize: '12px',
        color: '#E8E8E8',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <Radar size={14} style={{ color: '#FF0000' }} />
        <span
          style={{
            color: '#FF0000',
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            fontSize: '11px',
            textTransform: 'uppercase',
          }}
        >
          Port Scanner
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isScanning && (
            <>
              <Zap size={12} style={{ color: '#FF0000', animation: 'pulse 0.5s infinite' }} />
              <span style={{ color: '#FF0000', fontSize: '10px' }}>SCANNING...</span>
            </>
          )}
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #2A2A2A',
          flexShrink: 0,
          background: '#111111',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Row 1: Host + Range + Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Globe size={12} style={{ color: '#555' }} />
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="hostname / IP"
            style={{
              flex: 1,
              padding: '5px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
            }}
          />
          <Target size={12} style={{ color: '#555' }} />
          <input
            value={portFrom}
            onChange={(e) => setPortFrom(e.target.value)}
            placeholder="from"
            type="number"
            min={1}
            max={65535}
            disabled={useCommonPorts}
            style={{
              width: '60px',
              padding: '5px 8px',
              background: useCommonPorts ? '#151515' : '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: useCommonPorts ? '#555' : '#E8E8E8',
              fontSize: '11px',
            }}
          />
          <span style={{ color: '#555' }}>—</span>
          <input
            value={portTo}
            onChange={(e) => setPortTo(e.target.value)}
            placeholder="to"
            type="number"
            min={1}
            max={65535}
            disabled={useCommonPorts}
            style={{
              width: '60px',
              padding: '5px 8px',
              background: useCommonPorts ? '#151515' : '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: useCommonPorts ? '#555' : '#E8E8E8',
              fontSize: '11px',
            }}
          />
          {!isScanning ? (
            <button
              onClick={handleScan}
              disabled={!host}
              style={{
                padding: '5px 14px',
                background: '#FF0000',
                border: 'none',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '10px',
                letterSpacing: '0.12em',
                cursor: !host ? 'not-allowed' : 'pointer',
                opacity: !host ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Play size={10} />
              SCAN
            </button>
          ) : (
            <button
              onClick={handleAbort}
              style={{
                padding: '5px 14px',
                background: '#2A2A2A',
                border: '1px solid #FF0000',
                color: '#FF0000',
                fontWeight: 'bold',
                fontSize: '10px',
                letterSpacing: '0.12em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Square size={10} />
              ABORT
            </button>
          )}
          <button
            onClick={handleClear}
            disabled={results.length === 0}
            style={{
              padding: '5px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: results.length === 0 ? '#555' : '#E8E8E8',
              fontSize: '10px',
              cursor: results.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            CLEAR
          </button>
        </div>

        {/* Common Ports Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '10px',
              color: useCommonPorts ? '#C8A84B' : '#8B7D6B',
              letterSpacing: '0.08em',
            }}
          >
            <input
              type="checkbox"
              checked={useCommonPorts}
              onChange={(e) => setUseCommonPorts(e.target.checked)}
              style={{ accentColor: '#FF0000' }}
            />
            COMMON PORTS
          </label>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#555',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {showFilters ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            OPTIONS
          </button>
        </div>

        {/* Quick port selection */}
        {showFilters && useCommonPorts && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '4px' }}>
            {DEFAULT_QUICK_PORTS.map((port) => (
              <button
                key={port}
                onClick={() => toggleQuickPort(port)}
                style={{
                  padding: '3px 8px',
                  background: quickPorts.includes(port) ? '#1E1E1E' : '#000000',
                  border: `1px solid ${quickPorts.includes(port) ? '#C8A84B' : '#2A2A2A'}`,
                  color: quickPorts.includes(port) ? '#C8A84B' : '#555',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {port}
                <span style={{ color: '#555', fontSize: '8px' }}>
                  {COMMON_PORTS[port]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Progress Bar ──────────────────────────────────── */}
      {(isScanning || progress > 0) && (
        <div
          style={{
            height: '3px',
            background: '#1E1E1E',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: progress < 100 ? '#FF0000' : '#00BFBF',
              transition: 'width 100ms linear',
              boxShadow: progress < 100 ? '0 0 8px rgba(255,0,0,0.5)' : '0 0 8px rgba(0,191,191,0.5)',
            }}
          />
          {isScanning && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '30%',
                background: 'linear-gradient(90deg, transparent, rgba(255,0,0,0.3), transparent)',
                animation: 'shimmer 1s infinite',
              }}
            />
          )}
        </div>
      )}

      {/* ── Stats Bar ─────────────────────────────────────── */}
      {results.length > 0 && (
        <div
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid #222',
            display: 'flex',
            gap: '16px',
            fontSize: '10px',
            flexShrink: 0,
            background: '#0F0F0F',
          }}
        >
          <span>
            <span style={{ color: '#555' }}>Total: </span>
            <span style={{ color: '#E8E8E8' }}>{scanStats.total}</span>
          </span>
          <span>
            <span style={{ color: '#555' }}>Open: </span>
            <span style={{ color: '#FF0000' }}>{scanStats.open}</span>
          </span>
          <span>
            <span style={{ color: '#555' }}>Closed: </span>
            <span style={{ color: '#555' }}>{scanStats.closed}</span>
          </span>
          <span>
            <span style={{ color: '#555' }}>Filtered: </span>
            <span style={{ color: '#C8A84B' }}>{scanStats.filtered}</span>
          </span>
          <span style={{ marginLeft: 'auto' }}>
            <span style={{ color: '#555' }}>Time: </span>
            <span style={{ color: '#00BFBF' }}>{(scanStats.elapsed / 1000).toFixed(1)}s</span>
          </span>
        </div>
      )}

      {/* ── Results Table ─────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Filter Tabs */}
        {results.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '1px',
              background: '#1A1A1A',
              padding: '4px 12px',
              borderBottom: '1px solid #222',
              flexShrink: 0,
            }}
          >
            {(['all', 'open', 'closed', 'filtered'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '3px 10px',
                  background: filterStatus === status ? '#2A2A2A' : 'transparent',
                  border: 'none',
                  color:
                    filterStatus === status
                      ? status === 'open'
                        ? '#FF0000'
                        : status === 'filtered'
                          ? '#C8A84B'
                          : '#E8E8E8'
                      : '#555',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                {status} ({status === 'all' ? results.length : results.filter((r) => r.status === status).length})
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={10} style={{ color: '#555' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'port' | 'status')}
                style={{
                  background: '#1E1E1E',
                  border: '1px solid #2A2A2A',
                  color: '#8B7D6B',
                  fontSize: '10px',
                  fontFamily: 'inherit',
                  padding: '2px 4px',
                }}
              >
                <option value="port">Port</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        {filteredResults.length > 0 ? (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr style={{ background: '#111111', position: 'sticky', top: 0 }}>
                <th style={thStyle}>Port</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => (
                <tr
                  key={r.port}
                  style={{
                    background: r.status === 'open' ? 'rgba(255,0,0,0.05)' : 'transparent',
                    borderBottom: r.status === 'open' ? '1px solid rgba(255,0,0,0.15)' : '1px solid #1A1A1A',
                  }}
                >
                  <td style={{ ...tdStyle, color: r.status === 'open' ? '#FF0000' : '#E8E8E8', fontWeight: r.status === 'open' ? 'bold' : 'normal' }}>
                    {r.port}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color:
                          r.status === 'open'
                            ? '#FF0000'
                            : r.status === 'filtered'
                              ? '#C8A84B'
                              : '#555',
                      }}
                    >
                      <StatusIcon status={r.status} />
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#8B7D6B' }}>{r.service}</td>
                  <td style={{ ...tdStyle, color: '#555', fontSize: '10px' }}>{r.responseTime}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: '#555' }}>
            {!isScanning && results.length === 0 ? (
              <>
                <Radar size={28} style={{ marginBottom: '10px', opacity: 0.3 }} />
                <div style={{ fontSize: '11px' }}>Enter host and port range, then press SCAN</div>
              </>
            ) : (
              <div style={{ fontSize: '11px' }}>No results match filter</div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 12px',
  textAlign: 'left',
  color: '#C8A84B',
  fontWeight: 'bold',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '2px solid #2A2A2A',
};

const tdStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderBottom: '1px solid #1A1A1A',
};
