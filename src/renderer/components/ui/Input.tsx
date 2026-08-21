// ═══ INPUT ═══
// Text input component with optional icon — Dark Mechanicus style

import React, { type InputHTMLAttributes, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  inputSize?: InputSize;
  isError?: boolean;
}

// ── Size Styles ────────────────────────────────────────────
const sizeStyles: Record<InputSize, string> = {
  sm: 'h-7 text-[10px] px-2 gap-1.5',
  md: 'h-9 text-[11px] px-3 gap-2',
  lg: 'h-11 text-[13px] px-4 gap-2.5',
};

const iconSizeMap: Record<InputSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

// ── Component ──────────────────────────────────────────────
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      icon: Icon,
      inputSize = 'md',
      isError = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const containerClasses = [
      'flex items-center w-full',
      'bg-[var(--void-black)]',
      'border border-[var(--iron-gray)]',
      'rounded-none',
      'transition-all duration-150',
      'focus-within:border-[var(--omnissiah-red)]',
      'focus-within:shadow-[0_0_8px_rgba(255,0,0,0.3),inset_0_0_4px_rgba(255,0,0,0.1)]',
      isError && 'border-[var(--omnissiah-red)] shadow-[var(--glow-red)]',
      sizeStyles[inputSize],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses =
      'flex-1 bg-transparent text-[var(--sacred-white)] font-mono ' +
      'placeholder:text-[var(--text-muted)] ' +
      'focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

    return (
      <div className={containerClasses}>
        {Icon && (
          <Icon
            size={iconSizeMap[inputSize]}
            strokeWidth={1.5}
            className="text-[var(--text-muted)] flex-shrink-0"
          />
        )}
        <input ref={ref} className={inputClasses} {...props} />
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
