// ═══ STRENGTH INDICATOR ═══
// Password strength visualizer — Dark Mechanicus style
// Four levels: WEAK (red) → FAIR (orange) → GOOD (gold) → STRONG (cyan glow)

import React from 'react';
import type { VaultPasswordStrength } from '../../../shared/types';

// ── Types ──────────────────────────────────────────────────

interface StrengthIndicatorProps {
  strength: VaultPasswordStrength;
  entropy?: number;
  showLabel?: boolean;
  showEntropy?: boolean;
}

// ── Configuration ──────────────────────────────────────────

const STRENGTH_CONFIG: Record<
  VaultPasswordStrength,
  {
    label: string;
    color: string;
    glowColor: string;
    width: string;
    textShadow: string;
  }
> = {
  weak: {
    label: 'WEAK',
    color: '#FF0000',
    glowColor: 'rgba(255, 0, 0, 0.5)',
    width: '25%',
    textShadow: '0 0 8px rgba(255, 0, 0, 0.4)',
  },
  fair: {
    label: 'FAIR',
    color: '#FF8800',
    glowColor: 'rgba(255, 136, 0, 0.5)',
    width: '50%',
    textShadow: '0 0 8px rgba(255, 136, 0, 0.4)',
  },
  good: {
    label: 'GOOD',
    color: '#C8A84B',
    glowColor: 'rgba(200, 168, 75, 0.5)',
    width: '75%',
    textShadow: '0 0 8px rgba(200, 168, 75, 0.4)',
  },
  strong: {
    label: 'STRONG',
    color: '#00BFBF',
    glowColor: 'rgba(0, 191, 191, 0.6)',
    width: '100%',
    textShadow: '0 0 12px rgba(0, 191, 191, 0.6)',
  },
};

// ── Component ──────────────────────────────────────────────

export const StrengthIndicator: React.FC<StrengthIndicatorProps> = ({
  strength,
  entropy,
  showLabel = true,
  showEntropy = false,
}) => {
  const config = STRENGTH_CONFIG[strength];

  return (
    <div style={{ width: '100%' }}>
      {/* Label row */}
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              color: config.color,
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              textShadow: config.textShadow,
              transition: 'all 300ms ease',
            }}
          >
            {config.label}
          </span>
          {showEntropy && entropy !== undefined && (
            <span
              style={{
                color: 'var(--parchment-dim)',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
              }}
            >
              {entropy} bits
            </span>
          )}
        </div>
      )}

      {/* Bar container */}
      <div
        style={{
          width: '100%',
          height: '3px',
          background: 'var(--iron-gray)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background segments (subtle) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            gap: '1px',
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background:
                  i === 0
                    ? 'rgba(255, 0, 0, 0.1)'
                    : i === 1
                      ? 'rgba(255, 136, 0, 0.1)'
                      : i === 2
                        ? 'rgba(200, 168, 75, 0.1)'
                        : 'rgba(0, 191, 191, 0.1)',
              }}
            />
          ))}
        </div>

        {/* Active fill */}
        <div
          style={{
            height: '100%',
            width: config.width,
            background: config.color,
            boxShadow: `0 0 8px ${config.glowColor}, 0 0 16px ${config.glowColor}`,
            transition: 'all 300ms ease',
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>
    </div>
  );
};

export default StrengthIndicator;
