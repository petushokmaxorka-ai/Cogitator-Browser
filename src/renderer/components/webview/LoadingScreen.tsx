// ═══ LOADING SCREEN ═══
// Same visual language as resources/splash.html — shown while tab loads

import React from 'react';

interface LoadingScreenProps {
  loadProgress?: number;
}

const BOOT_LABELS: Array<[number, string]> = [
  [8, 'Initializing void-black substrate...'],
  [22, 'Binding privacy engine...'],
  [38, 'Scanning proxy relays...'],
  [52, 'Opening session vault...'],
  [68, 'Registering cogitator protocol...'],
  [82, 'Loading renderer sanctum...'],
  [94, 'Awakening tab manager...'],
  [100, 'Machine spirit online.'],
];

function statusForProgress(pct: number): string {
  let label = 'Establishing connection';
  for (let i = BOOT_LABELS.length - 1; i >= 0; i--) {
    if (pct >= BOOT_LABELS[i][0]) {
      label = BOOT_LABELS[i][1];
      break;
    }
  }
  return label;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ loadProgress = 0 }) => {
  const pct = Math.max(0, Math.min(100, Math.round(loadProgress)));
  const status = statusForProgress(pct);

  return (
    <div
      className="loading-screen absolute inset-0 flex flex-col"
      style={{
        zIndex: 100,
        backgroundColor: '#000000',
        fontFamily: '"Courier New", Courier, monospace',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(30,30,30,0.85) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="dm-scanline-overlay"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #8b0000, #c8a84b, transparent)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          padding: '40px 48px 24px',
          zIndex: 3,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            border: '2px solid #c8a84b',
            borderRadius: '50%',
            borderTopColor: '#dc2626',
            animation: 'splash-cog-spin 8s linear infinite',
            position: 'relative',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(200, 168, 75, 0.25)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 10,
              border: '2px solid #8b7355',
              borderRadius: '50%',
              borderBottomColor: 'transparent',
              animation: 'splash-cog-spin-rev 4s linear infinite',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#c8a84b',
              textShadow: '0 0 8px rgba(200, 168, 75, 0.4)',
            }}
          >
            Cogitator Browser
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#888',
            }}
          >
            Sacred instrument of the Omnissiah
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 10,
              letterSpacing: '0.1em',
              color: '#666',
              textTransform: 'uppercase',
            }}
          >
            {status}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px 36px', zIndex: 3 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#666',
            marginBottom: 8,
          }}
        >
          <span>Load sequence</span>
          <span style={{ color: '#dc2626' }}>{pct}%</span>
        </div>
        <div
          style={{
            height: 3,
            background: '#1a1a1a',
            border: '1px solid #3a3a3a',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #8b0000, #dc2626)',
              boxShadow: '0 0 6px rgba(220, 38, 38, 0.6)',
              transition: 'width 0.12s ease-out',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splash-cog-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes splash-cog-spin-rev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
