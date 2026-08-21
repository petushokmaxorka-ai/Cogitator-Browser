// ═══ BADGE ═══
// Status badge with dot indicator — Dark Mechanicus style

import React from 'react';

// ── Types ──────────────────────────────────────────────────
type BadgeVariant = 'online' | 'offline' | 'idle' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

// ── Variant Config ─────────────────────────────────────────
const variantConfig: Record<
  BadgeVariant,
  { dotColor: string; textColor: string; glowClass: string }
> = {
  online: {
    dotColor: 'bg-[var(--noosphere-cyan)]',
    textColor: 'text-[var(--noosphere-cyan)]',
    glowClass: 'shadow-[0_0_6px_rgba(0,191,191,0.6)]',
  },
  offline: {
    dotColor: 'bg-[var(--omnissiah-red)]',
    textColor: 'text-[var(--omnissiah-red)]',
    glowClass: 'shadow-[0_0_6px_rgba(255,0,0,0.4)]',
  },
  idle: {
    dotColor: 'bg-[var(--cogitator-gold)]',
    textColor: 'text-[var(--cogitator-gold)]',
    glowClass: 'shadow-[0_0_6px_rgba(200,168,75,0.4)]',
  },
  default: {
    dotColor: 'bg-[var(--steel-gray)]',
    textColor: 'text-[var(--text-muted)]',
    glowClass: '',
  },
};

// ── Component ──────────────────────────────────────────────
const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  className = '',
  pulse = false,
}) => {
  const config = variantConfig[variant];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5',
        'px-2 py-0.5',
        'bg-[var(--iron-dark)]',
        'border border-[var(--iron-gray)]',
        'font-mono text-[10px] uppercase tracking-widest',
        config.textColor,
        className,
      ].join(' ')}
    >
      {/* Status dot */}
      <span
        className={[
          'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
          config.dotColor,
          config.glowClass,
          pulse && 'animate-pulse',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {label}
    </span>
  );
};

export default Badge;
