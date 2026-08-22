// ═══ BUTTON ═══
// Universal button component — Dark Mechanicus style

import React, { type ButtonHTMLAttributes, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  isLoading?: boolean;
}

// ── Variant Styles ─────────────────────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-[var(--iron-dark)] border-[var(--iron-gray)] text-[var(--parchment)] ' +
    'hover:border-[var(--omnissiah-red)] hover:text-[var(--sacred-white)] hover:shadow-[var(--glow-red)]',
  primary:
    'bg-gradient-to-br from-[var(--omnissiah-red-dim)] to-[var(--iron-dark)] ' +
    'border-[var(--omnissiah-red)] text-[var(--sacred-white)] ' +
    'hover:from-[var(--omnissiah-red)] hover:to-[var(--omnissiah-red-dim)] ' +
    'shadow-[var(--glow-red)]',
  ghost:
    'bg-transparent border-transparent text-[var(--parchment)] ' +
    'hover:bg-[var(--iron-dark)] hover:text-[var(--sacred-white)] ' +
    'hover:border-[var(--iron-gray)]',
  danger:
    'bg-[var(--omnissiah-red)] border-[var(--omnissiah-red)] text-white ' +
    'hover:bg-[#cc0000] hover:shadow-[0_0_12px_rgba(255,0,0,0.5)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[10px] gap-1.5',
  md: 'h-9 px-4 text-[11px] gap-2',
  lg: 'h-11 px-6 text-[13px] gap-2.5',
};

// ── Component ──────────────────────────────────────────────
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'md',
      icon: Icon,
      isLoading = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-mono uppercase tracking-wider ' +
      'border transition-all duration-150 ease-out cursor-pointer ' +
      'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none ' +
      'disabled:hover:border-[var(--iron-gray)] disabled:hover:text-[var(--parchment)] ' +
      'disabled:hover:bg-[var(--iron-dark)] active:scale-[0.98]';

    const classes = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className,
    ].join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="loading-cog mr-1">◆</span>
        ) : Icon ? (
          <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} strokeWidth={1.5} />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
