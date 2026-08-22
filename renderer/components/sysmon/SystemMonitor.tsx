// ═══ OMNISIAH EYE — SYSTEM MONITOR ═══
// Machine Spirit resource surveillance interface
// Displays CPU, RAM, Disk, Network metrics with Canvas 2D history graphs

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, HardDrive, Cpu, MemoryStick, ArrowDown, ArrowUp, Clock, Server } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface SystemStats {
  cpuUsage: number; // 0-100%
  ramUsed: number; // MB
  ramTotal: number; // MB
  diskUsed: number; // GB
  diskTotal: number; // GB
  netDown: number; // KB/s
  netUp: number; // KB/s
  uptime: number; // seconds
  processes: number;
  platform?: string;
  distro?: string;
  release?: string;
  arch?: string;
  hostname?: string;
}

// ── Helpers ─────────────────────────────────────────────────

function formatBytes(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatGB(gb: number): string {
  return `${gb.toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatNetSpeed(kbps: number): string {
  if (kbps < 1) return '< 1 KB/s';
  return `${kbps.toFixed(0)} KB/s`;
}

// ── Canvas Graph Component ──────────────────────────────────

interface GraphCanvasProps {
  data: number[];
  color: string;
  maxValue: number;
  label: string;
  height?: number;
}

function GraphCanvas({ data, color, maxValue, label, height = 80 }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;

    canvas.width = w * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, w, height);

    // Grid lines
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Vertical grid
    for (let i = 0; i < 7; i++) {
      const x = (w / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (data.length < 2) return;

    // Line graph
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = (w / (data.length - 1)) * i;
      const y = height - (val / maxValue) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '05');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = (w / (data.length - 1)) * i;
      const y = height - (val / maxValue) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Glow dot at latest value
    if (data.length > 0) {
      const lastVal = data[data.length - 1];
      const lastX = w;
      const lastY = height - (lastVal / maxValue) * height;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [data, color, maxValue, height]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

// ── Progress Bar Component ──────────────────────────────────

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
}

function ProgressBar({ value, max = 100, color, label, detail, icon }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color, display: 'flex' }}>{icon}</span>
          <span
            style={{
              color: 'var(--parchment)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
        </div>
        <span style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)' }}>
          {detail}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            boxShadow: `0 0 8px ${color}80`,
            transition: 'width 300ms ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>0%</span>
        <span style={{ color, fontSize: '10px', fontWeight: 'bold' }}>{pct.toFixed(1)}%</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>100%</span>
      </div>
    </div>
  );
}

// ── Disk Usage Bar Component ────────────────────────────────

interface DiskBarProps {
  used: number;
  total: number;
  color: string;
}

function DiskBar({ used, total, color }: DiskBarProps) {
  const pct = (used / total) * 100;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color, display: 'flex' }}>
            <HardDrive size={12} />
          </span>
          <span
            style={{
              color: 'var(--parchment)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            DISK
          </span>
        </div>
        <span style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)' }}>
          {formatGB(used)} / {formatGB(total)}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            boxShadow: `0 0 8px ${color}80`,
            transition: 'width 300ms ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>0 GB</span>
        <span style={{ color, fontSize: '10px', fontWeight: 'bold' }}>{pct.toFixed(1)}%</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{formatGB(total)}</span>
      </div>
    </div>
  );
}

// ── Stat Row Component ──────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
  color = 'var(--parchment-dim)',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid var(--iron-gray)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        <span
          style={{
            color: 'var(--parchment-dim)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          color: 'var(--parchment)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'bold',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

const HISTORY_SIZE = 60; // 60 seconds of history

export function SystemMonitor() {
  // ═══ State ═══
  const [stats, setStats] = useState<SystemStats>({
    cpuUsage: 0, ramUsed: 0, ramTotal: 1, diskUsed: 0, diskTotal: 1,
    netDown: 0, netUp: 0, uptime: 0, processes: 0,
  });
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(HISTORY_SIZE).fill(0));
  const [ramHistory, setRamHistory] = useState<number[]>(Array(HISTORY_SIZE).fill(0));
  const [netDownHistory, setNetDownHistory] = useState<number[]>(Array(HISTORY_SIZE).fill(0));
  const [netUpHistory, setNetUpHistory] = useState<number[]>(Array(HISTORY_SIZE).fill(0));
  const [uptime, setUptime] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [osInfo, setOsInfo] = useState({ platform: '...', release: '...', arch: '...', hostname: '...' });

  // ═══ IPC Listener — real stats from main process ═══
  useEffect(() => {
    const api = window.electronAPI?.sysmon;
    if (!api?.onUpdate) return;

    const unsubscribe = api.onUpdate((newStats: SystemStats) => {
      setStats(newStats);
      setUptime(newStats.uptime);
      setCpuHistory((prev) => [...prev.slice(1), newStats.cpuUsage]);
      setRamHistory((prev) => [...prev.slice(1), (newStats.ramUsed / newStats.ramTotal) * 100]);
      setNetDownHistory((prev) => [...prev.slice(1), newStats.netDown]);
      setNetUpHistory((prev) => [...prev.slice(1), newStats.netUp]);
      if (newStats.platform) {
        setOsInfo({
          platform: newStats.distro || newStats.platform || 'Linux',
          release: newStats.release || '',
          arch: newStats.arch || '',
          hostname: newStats.hostname || '',
        });
      }
    });

    // Fetch initial stats
    api.getStats?.().catch(() => {});

    return () => { unsubscribe(); };
  }, []);

  // ═══ Derived values ═══
  const ramPct = (stats.ramUsed / stats.ramTotal) * 100;

  // ═══ Render ═══
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} style={{ color: 'var(--omnissiah-red)' }} />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: 'var(--font-size-sm)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
            }}
          >
            OMNISIAH EYE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isActive ? 'var(--omnissiah-red)' : 'var(--text-muted)',
              boxShadow: isActive ? '0 0 6px var(--omnissiah-red)' : 'none',
              animation: isActive ? 'pulse 2s infinite' : 'none',
            }}
          />
          <span
            style={{
              color: isActive ? 'var(--omnissiah-red)' : 'var(--text-muted)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {isActive ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* ── Scrollable Content ──────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px',
        }}
        className="scrollbar-mechanicus"
      >
        {/* CPU Section */}
        <div
          style={{
            marginBottom: '16px',
            border: '1px solid var(--iron-gray)',
            padding: '10px',
            background: 'rgba(30, 30, 30, 0.5)',
          }}
        >
          <ProgressBar
            value={stats.cpuUsage}
            max={100}
            color="var(--omnissiah-red)"
            label="CPU"
            detail={`${stats.cpuUsage.toFixed(1)}%`}
            icon={<Cpu size={12} />}
          />
          <GraphCanvas
            data={cpuHistory}
            color="#FF0000"
            maxValue={100}
            label="CPU %"
            height={70}
          />
        </div>

        {/* RAM Section */}
        <div
          style={{
            marginBottom: '16px',
            border: '1px solid var(--iron-gray)',
            padding: '10px',
            background: 'rgba(30, 30, 30, 0.5)',
          }}
        >
          <ProgressBar
            value={stats.ramUsed}
            max={stats.ramTotal}
            color="var(--noosphere-cyan)"
            label="RAM"
            detail={`${formatBytes(stats.ramUsed)} / ${formatBytes(stats.ramTotal)}`}
            icon={<MemoryStick size={12} />}
          />
          <GraphCanvas
            data={ramHistory}
            color="#00BFBF"
            maxValue={100}
            label="RAM %"
            height={70}
          />
        </div>

        {/* Disk Section */}
        <div
          style={{
            marginBottom: '16px',
            border: '1px solid var(--iron-gray)',
            padding: '10px',
            background: 'rgba(30, 30, 30, 0.5)',
          }}
        >
          <DiskBar
            used={stats.diskUsed}
            total={stats.diskTotal}
            color="var(--cogitator-gold)"
          />
        </div>

        {/* Network Section */}
        <div
          style={{
            marginBottom: '16px',
            border: '1px solid var(--iron-gray)',
            padding: '10px',
            background: 'rgba(30, 30, 30, 0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                color: 'var(--parchment)',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              NETWORK
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '8px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <ArrowDown size={10} style={{ color: 'var(--noosphere-cyan)' }} />
                <span style={{ color: 'var(--noosphere-cyan)', fontSize: '9px', letterSpacing: '0.08em' }}>
                  DOWN
                </span>
              </div>
              <span style={{ color: 'var(--parchment)', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                {formatNetSpeed(stats.netDown)}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <ArrowUp size={10} style={{ color: 'var(--omnissiah-red)' }} />
                <span style={{ color: 'var(--omnissiah-red)', fontSize: '9px', letterSpacing: '0.08em' }}>
                  UP
                </span>
              </div>
              <span style={{ color: 'var(--parchment)', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
                {formatNetSpeed(stats.netUp)}
              </span>
            </div>
          </div>
          <GraphCanvas
            data={netDownHistory}
            color="#00BFBF"
            maxValue={600}
            label="NET DOWN"
            height={50}
          />
          <div style={{ height: '4px' }} />
          <GraphCanvas
            data={netUpHistory}
            color="#FF0000"
            maxValue={150}
            label="NET UP"
            height={40}
          />
        </div>

        {/* System Info Section */}
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            padding: '10px',
            background: 'rgba(30, 30, 30, 0.5)',
          }}
        >
          <div
            style={{
              color: 'var(--parchment)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Server size={12} />
            SYSTEM INFO
          </div>
          <StatRow
            icon={<Server size={10} />}
            label="OS"
            value={`${osInfo.platform} ${osInfo.release}`}
            color="var(--cogitator-gold)"
          />
          <StatRow
            icon={<Clock size={10} />}
            label="Uptime"
            value={formatUptime(uptime)}
            color="var(--noosphere-cyan)"
          />
          <StatRow
            icon={<Cpu size={10} />}
            label="Processes"
            value={`${stats.processes}`}
            color="var(--omnissiah-red)"
          />
          <StatRow
            icon={<HardDrive size={10} />}
            label="Architecture"
            value={osInfo.arch}
            color="var(--parchment-dim)"
          />
          <StatRow
            icon={<Activity size={10} />}
            label="Hostname"
            value={osInfo.hostname}
            color="var(--parchment-dim)"
          />
        </div>
      </div>
    </div>
  );
}

// Default export
export default SystemMonitor;
