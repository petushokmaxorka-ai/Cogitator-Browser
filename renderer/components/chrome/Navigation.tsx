// ═══ NAVIGATION ═══
// Navigation controls — Back, Forward, Reload
// Traverse the Noosphere with the Machine God's blessing

import React from 'react';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

// ── Types ──────────────────────────────────────────────────
interface NavigationProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
}

// ── Component ──────────────────────────────────────────────
const Navigation: React.FC<NavigationProps> = ({
  canGoBack,
  canGoForward,
  isLoading,
  onGoBack,
  onGoForward,
  onReload,
}) => {
  // Common button base classes
  const btnBase = [
    'flex items-center justify-center',
    'w-8 h-8',
    'text-[var(--parchment)]',
    'rounded-none',
    'transition-all duration-150',
    'cursor-pointer',
  ].join(' ');

  const btnEnabled = [
    'hover:text-[var(--cogitator-gold-bright,#e8c87e)]',
    'hover:shadow-[0_0_8px_rgba(200,168,110,0.3)]',
    'active:scale-[0.95]',
  ].join(' ');

  const btnDisabled = 'opacity-30 cursor-not-allowed';

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex items-center gap-0.5 px-1">
      {/* Back */}
      <Tooltip content="Go Back" position="bottom" delay={400}>
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className={[btnBase, canGoBack ? btnEnabled : btnDisabled].join(' ')}
          type="button"
          aria-label="Go back"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
      </Tooltip>

      {/* Forward */}
      <Tooltip content="Go Forward" position="bottom" delay={400}>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className={[
            btnBase,
            canGoForward ? btnEnabled : btnDisabled,
          ].join(' ')}
          type="button"
          aria-label="Go forward"
        >
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </Tooltip>

      {/* Reload */}
      <Tooltip content="Reload" position="bottom" delay={400}>
        <button
          onClick={onReload}
          className={[btnBase, btnEnabled].join(' ')}
          type="button"
          aria-label={isLoading ? 'Stop loading' : 'Reload page'}
        >
          <RefreshCw
            size={14}
            strokeWidth={1.5}
            className={isLoading ? 'animate-spin' : ''}
          />
        </button>
      </Tooltip>
    </div>
  );
};

export default Navigation;
