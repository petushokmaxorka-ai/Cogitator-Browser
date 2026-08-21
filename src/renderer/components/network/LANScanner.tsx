// ═══ LAN SCANNER ═══
// Local network device discovery — Omnissiah Network Cartograph
// Uses main-process IPC for ping/ARP discovery and Wake-on-LAN.

import { useState, useCallback, useRef } from 'react';
import {
  Network,
  Play,
  Square,
  CircleDot,
  CircleOff,
  Router,
  Monitor,
  Smartphone,
  Server,
  HardDrive,
  Zap,
  Wifi,
  Clock,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface NetworkDevice {
  id: string;
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  status: 'online' | 'offline' | 'unknown';
  type: 'router' | 'desktop' | 'mobile' | 'server' | 'iot' | 'unknown';
  responseTime: number;
  ports: number[];
}

// ── Device Type Icon ────────────────────────────────────────

function DeviceTypeIcon({ type, size = 12 }: { type: NetworkDevice['type']; size?: number }) {
  switch (type) {
    case 'router': return <Router size={size} />;
    case 'desktop': return <Monitor size={size} />;
    case 'mobile': return <Smartphone size={size} />;
    case 'server': return <Server size={size} />;
    case 'iot': return <HardDrive size={size} />;
    default: return <Network size={size} />;
  }
}

function guessDeviceType(vendor: string, hostname: string): NetworkDevice['type'] {
  const text = `${vendor} ${hostname}`.toLowerCase();
  if (text.includes('router') || text.includes('gateway') || text.includes('asus') || text.includes('netgear')) return 'router';
  if (text.includes('phone') || text.includes('mobile') || text.includes('apple') || text.includes('samsung')) return 'mobile';
  if (text.includes('server') || text.includes('raspberry') || text.includes('synology')) return 'server';
  if (text.includes('cam') || text.includes('printer') || text.includes('hp') || text.includes('hikvision') || text.includes('sony')) return 'iot';
  if (text.includes('desktop') || text.includes('dell') || text.includes('asus')) return 'desktop';
  return 'unknown';
}

// ── Component ───────────────────────────────────────────────

export default function LANScanner() {
  const [ipRange, setIpRange] = useState('192.168.1.0/24');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [scanTime, setScanTime] = useState(0);
  const abortRef = useRef(false);

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;

  // ── Handlers ──────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setDevices([]);
    setProgress(0);
    abortRef.current = false;

    const start = Date.now();
    try {
      const found = await window.electronAPI?.network?.scanLan?.(ipRange);
      setDevices(
        (found ?? []).map((d: { ip: string; mac: string; hostname: string; vendor: string; status?: string; responseTime?: number }) => ({
          id: `${d.ip}-${d.mac}`,
          ip: d.ip,
          mac: d.mac,
          hostname: d.hostname,
          vendor: d.vendor,
          status: (d.status as NetworkDevice['status']) || 'online',
          type: guessDeviceType(d.vendor, d.hostname),
          responseTime: d.responseTime ?? 0,
          ports: [],
        })),
      );
      setProgress(100);
    } catch (err) {
      console.warn('[LANScanner]', err);
    }
    setScanTime(Date.now() - start);
    setIsScanning(false);
  }, [ipRange, isScanning]);

  const handleWake = useCallback(async (mac: string) => {
    try {
      await window.electronAPI?.network?.wakeOnLan?.(mac);
    } catch (err) {
      console.warn('[LANScanner] WOL failed', err);
    }
  }, []);

  const handleAbort = useCallback(() => {
    abortRef.current = true;
    setIsScanning(false);
  }, []);

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
        <Wifi size={14} style={{ color: '#00BFBF' }} />
        <span
          style={{
            color: '#00BFBF',
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            fontSize: '11px',
            textTransform: 'uppercase',
          }}
        >
          LAN Scanner
        </span>
        {isScanning && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={12} style={{ color: '#00BFBF', animation: 'pulse 0.5s infinite' }} />
            <span style={{ color: '#00BFBF', fontSize: '10px' }}>SCANNING...</span>
          </div>
        )}
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Network size={12} style={{ color: '#555' }} />
          <span style={{ color: '#8B7D6B', fontSize: '10px', letterSpacing: '0.08em' }}>RANGE</span>
          <input
            value={ipRange}
            onChange={(e) => setIpRange(e.target.value)}
            placeholder="192.168.1.0/24"
            style={{
              flex: 1,
              padding: '5px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
            }}
          />
          {!isScanning ? (
            <button
              onClick={handleScan}
              disabled={!ipRange}
              style={{
                padding: '5px 14px',
                background: '#00BFBF',
                border: 'none',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '10px',
                letterSpacing: '0.12em',
                cursor: !ipRange ? 'not-allowed' : 'pointer',
                opacity: !ipRange ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Play size={10} />
              SCAN NETWORK
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
        </div>
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
              background: progress < 100 ? '#00BFBF' : '#C8A84B',
              transition: 'width 100ms linear',
              boxShadow: progress < 100 ? '0 0 8px rgba(0,191,191,0.5)' : '0 0 8px rgba(200,168,75,0.5)',
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
                background: 'linear-gradient(90deg, transparent, rgba(0,191,191,0.3), transparent)',
                animation: 'shimmer 1s infinite',
              }}
            />
          )}
        </div>
      )}

      {/* ── Stats Bar ─────────────────────────────────────── */}
      {devices.length > 0 && (
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
            <span style={{ color: '#555' }}>Found: </span>
            <span style={{ color: '#E8E8E8' }}>{devices.length}</span>
          </span>
          <span>
            <CircleDot size={10} style={{ color: '#00BFBF', display: 'inline', verticalAlign: 'middle' }} />
            <span style={{ color: '#00BFBF' }}> {onlineCount}</span>
          </span>
          <span>
            <CircleOff size={10} style={{ color: '#555', display: 'inline', verticalAlign: 'middle' }} />
            <span style={{ color: '#555' }}> {offlineCount}</span>
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} style={{ color: '#555' }} />
            <span style={{ color: '#555' }}>{(scanTime / 1000).toFixed(1)}s</span>
          </span>
        </div>
      )}

      {/* ── Results Table ─────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {devices.length > 0 ? (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}
          >
            <thead>
              <tr style={{ background: '#111111', position: 'sticky', top: 0 }}>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>IP Address</th>
                <th style={thStyle}>Hostname</th>
                <th style={thStyle}>MAC Address</th>
                <th style={thStyle}>Vendor</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Ping</th>
                <th style={thStyle}>Ports</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.id}
                  style={{
                    background: device.status === 'online' ? 'rgba(0,191,191,0.03)' : 'transparent',
                    borderBottom: '1px solid #1A1A1A',
                    opacity: device.status === 'offline' ? 0.6 : 1,
                  }}
                >
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {device.status === 'online' ? (
                      <CircleDot size={12} style={{ color: '#00BFBF' }} />
                    ) : (
                      <CircleOff size={12} style={{ color: '#555' }} />
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#00BFBF', fontWeight: 'bold' }}>{device.ip}</td>
                  <td style={{ ...tdStyle, color: '#E8E8E8' }}>{device.hostname}</td>
                  <td style={{ ...tdStyle, color: '#8B7D6B', fontSize: '10px' }}>{device.mac}</td>
                  <td style={{ ...tdStyle, color: '#C8A84B', fontSize: '10px' }}>{device.vendor}</td>
                  <td style={{ ...tdStyle }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#8B7D6B',
                      }}
                    >
                      <DeviceTypeIcon type={device.type} />
                      <span style={{ textTransform: 'uppercase', fontSize: '10px' }}>{device.type}</span>
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: device.responseTime >= 0 ? '#555' : '#333', fontSize: '10px' }}>
                    {device.responseTime >= 0 ? `${device.responseTime}ms` : '—'}
                  </td>
                  <td style={{ ...tdStyle }}>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {device.ports.map((p) => (
                        <span
                          key={p}
                          style={{
                            padding: '1px 4px',
                            background: '#1E1E1E',
                            border: '1px solid #2A2A2A',
                            fontSize: '9px',
                            color: '#8B7D6B',
                          }}
                        >
                          {p}
                        </span>
                      ))}
                      {device.ports.length === 0 && (
                        <span style={{ fontSize: '10px', color: '#333' }}>—</span>
                      )}
                      <button
                        onClick={() => void handleWake(device.mac)}
                        title={`Wake ${device.mac}`}
                        style={{
                          marginLeft: '4px',
                          padding: '1px 4px',
                          background: 'transparent',
                          border: '1px solid #C8A84B',
                          color: '#C8A84B',
                          fontSize: '9px',
                          cursor: 'pointer',
                        }}
                      >
                        WOL
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
            {!isScanning ? (
              <>
                <Network size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <div style={{ fontSize: '11px' }}>No scan results</div>
                <div style={{ fontSize: '10px', marginTop: '6px' }}>Press SCAN NETWORK to discover devices</div>
              </>
            ) : (
              <>
                <Zap size={28} style={{ color: '#00BFBF', animation: 'pulse 0.5s infinite', marginBottom: '12px' }} />
                <div style={{ fontSize: '11px', color: '#00BFBF' }}>Scanning network...</div>
              </>
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
  padding: '6px 10px',
  textAlign: 'left',
  color: '#C8A84B',
  fontWeight: 'bold',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '2px solid #2A2A2A',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
};
