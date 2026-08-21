// ═══ WAKE-ON-LAN ═══
// Magic packet sender — Rouse the Machine Spirits from slumber
// Backend: real UDP broadcast via IPC (network-tools.ts, dgram socket)

import { useState, useCallback, useEffect } from 'react';
import {
  Power,
  Send,
  Save,
  Trash2,
  Plus,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Radio,
  CircuitBoard,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface SavedDevice {
  id: string;
  label: string;
  mac: string;
  ip: string;
  port: number;
}

// ── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_wol_devices';

// ── Magic Packet Generator ──────────────────────────────────

function createMagicPacket(mac: string): Uint8Array {
  const cleanMac = mac.replace(/[-:]/g, '').toLowerCase();
  if (cleanMac.length !== 12 || !/^[0-9a-f]+$/.test(cleanMac)) {
    throw new Error('Invalid MAC address format');
  }

  const macBytes = [];
  for (let i = 0; i < 12; i += 2) {
    macBytes.push(parseInt(cleanMac.slice(i, i + 2), 16));
  }

  const packet = new Uint8Array(102);
  packet.fill(0xff, 0, 6);
  for (let i = 0; i < 16; i++) {
    macBytes.forEach((b, j) => {
      packet[6 + i * 6 + j] = b;
    });
  }
  return packet;
}

function validateMac(mac: string): boolean {
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
}

// ── Storage Helpers ─────────────────────────────────────────

function loadDevices(): SavedDevice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDevices(devices: SavedDevice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

function generateId(): string {
  return 'wol_' + Math.random().toString(36).slice(2, 11);
}

// ── Component ───────────────────────────────────────────────

export default function WakeOnLAN() {
  const [devices, setDevices] = useState<SavedDevice[]>(loadDevices);
  const [mac, setMac] = useState('');
  const [ip, setIp] = useState('255.255.255.255');
  const [port, setPort] = useState('9');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // ── Save devices ──────────────────────────────────────────
  useEffect(() => {
    saveDevices(devices);
  }, [devices]);

  // ── Handlers ──────────────────────────────────────────────
  const handleSendMagicPacket = useCallback(async (deviceMac: string, deviceIp: string, devicePort: number) => {
    if (!validateMac(deviceMac)) {
      setStatus('error');
      setStatusMessage(`Invalid MAC address: ${deviceMac}`);
      return;
    }

    setStatus('sending');
    setStatusMessage(`Sending magic packet to ${deviceMac}...`);

    try {
      await window.electronAPI?.network?.wakeOnLan?.(deviceMac, deviceIp, devicePort);
      setStatus('sent');
      setStatusMessage(`Magic packet sent to ${deviceMac} via ${deviceIp}:${devicePort}`);
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to send magic packet');
    }
  }, []);

  const handleSendCurrent = useCallback(() => {
    handleSendMagicPacket(mac, ip, parseInt(port) || 9);
  }, [mac, ip, port, handleSendMagicPacket]);

  const handleSaveDevice = useCallback(() => {
    if (!mac || !validateMac(mac)) return;
    const device: SavedDevice = {
      id: generateId(),
      label: label || `Device ${devices.length + 1}`,
      mac,
      ip,
      port: parseInt(port) || 9,
    };
    setDevices((prev) => [...prev, device]);
    setLabel('');
    setShowAddForm(false);
  }, [mac, ip, port, label, devices.length]);

  const handleDeleteDevice = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleLoadDevice = useCallback((device: SavedDevice) => {
    setMac(device.mac);
    setIp(device.ip);
    setPort(String(device.port));
    setLabel(device.label);
  }, []);

  // ── Status color helper ───────────────────────────────────
  const statusColor = () => {
    switch (status) {
      case 'sent': return '#00BFBF';
      case 'sending': return '#C8A84B';
      case 'error': return '#FF0000';
      default: return '#555';
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
        <Power size={14} style={{ color: '#FF0000' }} />
        <span
          style={{
            color: '#FF0000',
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            fontSize: '11px',
            textTransform: 'uppercase',
          }}
        >
          Wake-on-LAN
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <CircuitBoard size={14} style={{ color: '#555' }} />
        </div>
      </div>

      {/* ── Magic Packet Form ─────────────────────────────── */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #2A2A2A',
          flexShrink: 0,
          background: '#111111',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* MAC Address */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            MAC Address (XX:XX:XX:XX:XX:XX)
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={mac}
              onChange={(e) => {
                setMac(e.target.value);
                setStatus('idle');
              }}
              placeholder="AA:BB:CC:DD:EE:FF"
              style={{
                flex: 1,
                padding: '6px 8px',
                background: '#1E1E1E',
                border: `1px solid ${mac && !validateMac(mac) ? '#FF0000' : '#2A2A2A'}`,
                color: '#E8E8E8',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
            {mac && validateMac(mac) && (
              <CheckCircle2 size={16} style={{ color: '#00BFBF', alignSelf: 'center' }} />
            )}
            {mac && !validateMac(mac) && (
              <AlertTriangle size={16} style={{ color: '#FF0000', alignSelf: 'center' }} />
            )}
          </div>
        </div>

        {/* IP + Port */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Broadcast Address
            </label>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="255.255.255.255"
              style={{
                padding: '5px 8px',
                background: '#1E1E1E',
                border: '1px solid #2A2A2A',
                color: '#E8E8E8',
                fontSize: '11px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Port
            </label>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9"
              type="number"
              min={1}
              max={65535}
              style={{
                padding: '5px 8px',
                background: '#1E1E1E',
                border: '1px solid #2A2A2A',
                color: '#E8E8E8',
                fontSize: '11px',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Label (optional) + Save button */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            style={{
              flex: 1,
              padding: '5px 8px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '11px',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => { setShowAddForm(!showAddForm); }}
            disabled={!validateMac(mac)}
            style={{
              padding: '5px 10px',
              background: validateMac(mac) ? '#1E1E1E' : '#151515',
              border: '1px solid #2A2A2A',
              color: validateMac(mac) ? '#C8A84B' : '#555',
              fontSize: '10px',
              cursor: validateMac(mac) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Save size={10} />
            SAVE
          </button>
        </div>

        {/* SEND MAGIC PACKET Button — Big Red Glow */}
        <button
          onClick={handleSendCurrent}
          disabled={!validateMac(mac) || status === 'sending'}
          style={{
            width: '100%',
            padding: '12px',
            background: status === 'sending' ? '#2A2A2A' : '#FF0000',
            border: 'none',
            color: status === 'sending' ? '#C8A84B' : '#000000',
            fontWeight: 'bold',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: !validateMac(mac) || status === 'sending' ? 'not-allowed' : 'pointer',
            opacity: !validateMac(mac) ? 0.3 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: validateMac(mac) && status !== 'sending'
              ? '0 0 15px rgba(255, 0, 0, 0.4), 0 0 30px rgba(255, 0, 0, 0.2), inset 0 0 10px rgba(255, 0, 0, 0.1)'
              : 'none',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            if (validateMac(mac) && status !== 'sending') {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 0, 0, 0.6), 0 0 50px rgba(255, 0, 0, 0.3), inset 0 0 15px rgba(255, 0, 0, 0.2)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = validateMac(mac) && status !== 'sending'
              ? '0 0 15px rgba(255, 0, 0, 0.4), 0 0 30px rgba(255, 0, 0, 0.2), inset 0 0 10px rgba(255, 0, 0, 0.1)'
              : 'none';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Radio size={14} />
          {status === 'sending' ? 'TRANSMITTING...' : 'SEND MAGIC PACKET'}
          <Radio size={14} />
        </button>

        {/* Status Display */}
        {status !== 'idle' && (
          <div
            style={{
              padding: '8px 10px',
              background: status === 'sent' ? 'rgba(0,191,191,0.08)' : status === 'error' ? 'rgba(255,0,0,0.08)' : 'rgba(200,168,75,0.05)',
              border: `1px solid ${statusColor()}`,
              borderLeft: `3px solid ${statusColor()}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {status === 'sent' && <CheckCircle2 size={14} style={{ color: '#00BFBF', flexShrink: 0 }} />}
            {status === 'sending' && <Radio size={14} style={{ color: '#C8A84B', flexShrink: 0, animation: 'pulse 1s infinite' }} />}
            {status === 'error' && <AlertTriangle size={14} style={{ color: '#FF0000', flexShrink: 0 }} />}
            <span style={{ color: statusColor(), fontSize: '11px', wordBreak: 'break-all' }}>
              {statusMessage}
            </span>
          </div>
        )}
      </div>

      {/* ── Saved Devices ─────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            padding: '8px 12px',
            fontSize: '10px',
            color: '#555',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            borderBottom: '1px solid #222',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Saved Devices ({devices.length})</span>
          <button
            onClick={() => {
              setMac(''); setIp('255.255.255.255'); setPort('9'); setLabel(''); setShowAddForm(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#C8A84B',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={10} />
            ADD NEW
          </button>
        </div>

        {devices.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#555', fontSize: '11px' }}>
            <Monitor size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <div>No saved devices</div>
            <div style={{ fontSize: '10px', marginTop: '4px' }}>Save a device for quick wake</div>
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid #1A1A1A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
              onClick={() => handleLoadDevice(device)}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#111111'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Monitor size={14} style={{ color: '#555', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#E8E8E8', fontSize: '11px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {device.label}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <span style={{ color: '#00BFBF', fontSize: '10px' }}>{device.mac}</span>
                  <span style={{ color: '#555', fontSize: '10px' }}>via</span>
                  <span style={{ color: '#8B7D6B', fontSize: '10px' }}>{device.ip}:{device.port}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendMagicPacket(device.mac, device.ip, device.port);
                }}
                style={{
                  padding: '4px 8px',
                  background: '#1E1E1E',
                  border: '1px solid #FF0000',
                  color: '#FF0000',
                  fontSize: '9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FF0000';
                  e.currentTarget.style.color = '#000000';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(255,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1E1E1E';
                  e.currentTarget.style.color = '#FF0000';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Send size={9} />
                WAKE
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id); }}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#555',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Info Footer ───────────────────────────────────── */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid #222',
          fontSize: '9px',
          color: '#444',
          flexShrink: 0,
          textAlign: 'center',
        }}
      >
        Magic Packet: 6x 0xFF + 16x MAC (102 bytes) | UDP Broadcast
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
