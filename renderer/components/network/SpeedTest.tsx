// ═══ SPEED TEST ═══
// Sacred Noospheric Gauge — measures the velocity of data transmission.
// Simulates Speedtest.net functionality with Dark Mechanicus aesthetics.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Gauge, Server, Wifi, Download, Upload, RotateCcw, Signal, Zap } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface SpeedResult {
  download: number;
  upload: number;
  ping: number;
  jitter: number;
}

type TestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'complete';

// ═══════════════════════════════════════════════════════════════════════════════
// Real Speed Test Engine (via IPC to main process)
// ═══════════════════════════════════════════════════════════════════════════════

async function runRealSpeedTest(
  onProgress: (phase: 'ping' | 'download' | 'upload', value: number) => void
): Promise<{ ping: number; download: number; upload: number }> {
  // Animate ping phase
  for (let i = 0; i < 5; i++) {
    onProgress('ping', (i + 1) * 20);
    await new Promise((r) => setTimeout(r, 100));
  }

  // Real test via IPC
  onProgress('download', 10);
  const result = await window.electronAPI?.speedtest?.run();
  onProgress('download', 100);
  onProgress('upload', 100);

  if (!result || result.download < 0) {
    throw new Error('Speed test failed — check internet connection');
  }

  return {
    ping: result.ping > 0 ? result.ping : 0,
    download: result.download,
    upload: result.upload,
  };
}

function getSpeedTier(download: number): string {
  if (download >= 500) return 'Sacred Optic Vox';
  if (download >= 100) return 'Noospheric Uplink';
  if (download >= 50) return 'Adeptus Connection';
  if (download >= 20) return 'Standard Vox-line';
  return 'Servitor-class Link';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Speed Gauge Component
// ═══════════════════════════════════════════════════════════════════════════════

const SpeedGauge: React.FC<{
  value: number;
  max: number;
  label: string;
  color: string;
  unit: string;
  icon: React.ReactNode;
}> = ({ value, max, label, color, unit, icon }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <div style={{ position: 'relative', width: '110px', height: '110px' }}>
        <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx="55"
            cy="55"
            r="45"
            fill="none"
            stroke="var(--iron-gray)"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx="55"
            cy="55"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
              transition: 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div style={{ color, fontSize: '22px', fontWeight: 'bold', textShadow: `0 0 8px ${color}40` }}>
            {value.toFixed(1)}
          </div>
          <div style={{ color: 'var(--parchment-dim)', fontSize: '9px', textTransform: 'uppercase' }}>
            {unit}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '10px',
          color: 'var(--parchment-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {icon}
        {label}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const SpeedTest: React.FC = () => {
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [pingProgress, setPingProgress] = useState(0);
  const abortRef = useRef(false);

  const handleStart = useCallback(async () => {
    setPhase('ping');
    setResult(null);
    setCurrentSpeed(0);
    setPingProgress(0);
    abortRef.current = false;

    setPhase('ping');

    const { ping, download, upload } = await runRealSpeedTest((phase, value) => {
      if (phase === 'ping') {
        setPingProgress(value / 20);
      } else if (phase === 'download') {
        setPhase('download');
        setCurrentSpeed(value);
      } else if (phase === 'upload') {
        setPhase('upload');
        setCurrentSpeed(value);
      }
    });

    setResult({
      download: Math.round(download * 10) / 10,
      upload: Math.round(upload * 10) / 10,
      ping,
      jitter: 0,
    });
    setPhase('complete');
    setCurrentSpeed(0);
  }, []);

  const handleRestart = useCallback(() => {
    abortRef.current = true;
    setPhase('idle');
    setResult(null);
    setCurrentSpeed(0);
    setPingProgress(0);
  }, []);

  const isRunning = phase === 'ping' || phase === 'download' || phase === 'upload';

  // Auto-run on mount
  useEffect(() => {
    // Don't auto-run, wait for user
    return () => {
      abortRef.current = true;
    };
  }, []);

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
          <Gauge size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          ═══ Speed Test ═══
        </div>
        <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', marginTop: '2px' }}>
          NOOSPHERIC TRANSMISSION VELOCITY GAUGE
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Main Start Button */}
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,0,0,0.15) 0%, transparent 70%)',
              border: '3px solid var(--omnissiah-red)',
              color: 'var(--omnissiah-red)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'bold',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.3s',
              boxShadow: '0 0 20px rgba(255, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '20px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 40px rgba(255, 0, 0, 0.4)';
              e.currentTarget.style.background = 'radial-gradient(circle, rgba(255,0,0,0.25) 0%, transparent 70%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.2)';
              e.currentTarget.style.background = 'radial-gradient(circle, rgba(255,0,0,0.15) 0%, transparent 70%)';
            }}
          >
            <Zap size={32} />
            <span>START</span>
            <span style={{ fontSize: '9px', fontWeight: 'normal', letterSpacing: '0.08em' }}>TEST</span>
          </button>
        )}

        {/* Running State */}
        {isRunning && (
          <div
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,0,0,0.1) 0%, transparent 70%)',
              border: '3px solid var(--omnissiah-red)',
              color: 'var(--omnissiah-red)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginTop: '20px',
              animation: 'pulse 1.5s infinite',
              boxShadow: '0 0 30px rgba(255, 0, 0, 0.3)',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,0,0,0.5)' }}>
              {phase === 'ping' ? `${pingProgress * 20}ms` : `${currentSpeed.toFixed(1)}`}
            </div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {phase === 'ping' && 'PINGING...'}
              {phase === 'download' && 'DOWNLOADING...'}
              {phase === 'upload' && 'UPLOADING...'}
            </div>
          </div>
        )}

        {/* Complete State */}
        {phase === 'complete' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
            {/* Tier Badge */}
            <div
              style={{
                background: 'rgba(200, 168, 75, 0.1)',
                border: '1px solid var(--cogitator-gold)',
                padding: '6px 16px',
                color: 'var(--cogitator-gold)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
              }}
            >
              {getSpeedTier(result.download)}
            </div>

            {/* Gauges */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                flexWrap: 'wrap',
                width: '100%',
              }}
            >
              <SpeedGauge
                value={result.download}
                max={200}
                label="Download"
                color="var(--omnissiah-red)"
                unit="Mbps"
                icon={<Download size={10} />}
              />
              <SpeedGauge
                value={result.upload}
                max={100}
                label="Upload"
                color="var(--noosphere-cyan)"
                unit="Mbps"
                icon={<Upload size={10} />}
              />
            </div>

            {/* Stats Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                width: '100%',
              }}
            >
              <div
                style={{
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Signal size={12} style={{ color: 'var(--cogitator-gold)' }} />
                <span style={{ fontSize: '20px', color: 'var(--cogitator-gold)', fontWeight: 'bold' }}>{result.ping}</span>
                <span style={{ fontSize: '9px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>Ping ms</span>
              </div>
              <div
                style={{
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Wifi size={12} style={{ color: 'var(--noosphere-cyan)' }} />
                <span style={{ fontSize: '20px', color: 'var(--noosphere-cyan)', fontWeight: 'bold' }}>{result.jitter}</span>
                <span style={{ fontSize: '9px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>Jitter ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Server & ISP Info (stubs) */}
        <div
          style={{
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            padding: '10px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--parchment-dim)' }}>
            <Server size={10} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Server</span>
            <span style={{ color: 'var(--noosphere-cyan)', marginLeft: 'auto' }}>Forge World Mars - Primary</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--parchment-dim)' }}>
            <Wifi size={10} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>ISP</span>
            <span style={{ color: 'var(--cogitator-gold)', marginLeft: 'auto' }}>Adeptus Mechanicus Network</span>
          </div>
        </div>

        {/* Restart Button (complete only) */}
        {phase === 'complete' && (
          <button
            onClick={handleRestart}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid var(--cogitator-gold)',
              color: 'var(--cogitator-gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
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
            <RotateCcw size={14} />
            RESTART TEST
          </button>
        )}
      </div>
    </div>
  );
};

export default SpeedTest;
