// ═══ ADBLOCK COUNTER ═══
// Shield badge showing blocked request count.
// Click to toggle ad blocking on/off.
// Sacred barrier against the entropy of surveillance capitalism.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, ShieldOff } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

// ── Types ──────────────────────────────────────────────────

interface AdBlockStats {
  enabled: boolean;
  blockedCount: number;
  blockRules: number;
  allowRules: number;
  cosmeticRules: number;
}

// ── Component ──────────────────────────────────────────────

const AdBlockCounter: React.FC = () => {
  const [stats, setStats] = useState<AdBlockStats>({
    enabled: true,
    blockedCount: 0,
    blockRules: 0,
    allowRules: 0,
    cosmeticRules: 0,
  });
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch stats from main ────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const result = await window.electronAPI?.adblock?.getStats?.();
      if (result) {
        setStats(result);
      }
    } catch {
      // AdBlocker not available
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Toggle ad blocking ───────────────────────────────────

  const handleToggle = useCallback(async () => {
    try {
      const newEnabled = await window.electronAPI?.adblock?.toggle?.();
      if (typeof newEnabled === 'boolean') {
        setStats((prev) => ({ ...prev, enabled: newEnabled }));
      }
      // Refresh full stats
      fetchStats();
    } catch {
      // AdBlocker not available
    }
  }, [fetchStats]);

  // ── Poll for updates ─────────────────────────────────────

  useEffect(() => {
    fetchStats();

    // Poll every 10 seconds to update blocked count
    intervalRef.current = setInterval(() => {
      fetchStats();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStats]);

  // ── Format count for display ─────────────────────────────

  const formatCount = (count: number): string => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  // ── Tooltip content ──────────────────────────────────────

  const tooltipContent = (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          AdBlocker
        </span>
        <span
          className={[
            'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded',
            stats.enabled
              ? 'text-[var(--noosphere-cyan)] bg-[rgba(0,191,191,0.1)]'
              : 'text-[var(--text-muted)] bg-[rgba(255,255,255,0.05)]',
          ].join(' ')}
        >
          {stats.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>
      <div className="h-px bg-[var(--iron-gray)] my-0.5" />
      <div className="flex justify-between">
        <span className="text-[10px] font-mono text-[var(--text-muted)]">Blocked</span>
        <span className="text-[10px] font-mono text-[var(--sacred-white)]">
          {stats.blockedCount.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] font-mono text-[var(--text-muted)]">Block Rules</span>
        <span className="text-[10px] font-mono text-[var(--sacred-white)]">
          {stats.blockRules.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] font-mono text-[var(--text-muted)]">Allow Rules</span>
        <span className="text-[10px] font-mono text-[var(--sacred-white)]">
          {stats.allowRules.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] font-mono text-[var(--text-muted)]">Cosmetic</span>
        <span className="text-[10px] font-mono text-[var(--sacred-white)]">
          {stats.cosmeticRules.toLocaleString()}
        </span>
      </div>
      <div className="h-px bg-[var(--iron-gray)] my-0.5" />
      <span className="text-[9px] font-mono text-[var(--text-muted)] italic">
        Click to {stats.enabled ? 'disable' : 'enable'}
      </span>
    </div>
  );

  // ── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-9 px-1.5 flex-shrink-0 opacity-50">
        <Shield size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
      </div>
    );
  }

  // If adblock API not available, don't render
  if (!window.electronAPI?.adblock) {
    return null;
  }

  return (
    <Tooltip content={tooltipContent} position="bottom" delay={400} className="whitespace-normal max-w-[220px]">
      <button
        type="button"
        onClick={handleToggle}
        className={[
          'flex items-center justify-center gap-1',
          'h-9 px-1.5',
          'flex-shrink-0',
          'transition-all duration-150',
          'cursor-pointer',
          'bg-transparent',
          'border-l border-[var(--iron-gray)]',
          stats.enabled
            ? 'text-[var(--noosphere-cyan)] hover:text-[var(--noosphere-cyan)] hover:bg-[rgba(0,191,191,0.08)]'
            : 'text-[var(--text-muted)] hover:text-[var(--parchment)] hover:bg-[rgba(255,255,255,0.04)]',
        ].join(' ')}
        title={stats.enabled ? 'AdBlocker active — Click to disable' : 'AdBlocker disabled — Click to enable'}
      >
        {stats.enabled ? (
          <Shield size={14} strokeWidth={1.5} />
        ) : (
          <ShieldOff size={14} strokeWidth={1.5} />
        )}
        {stats.blockedCount > 0 && (
          <span
            className={[
              'text-[9px] font-mono tabular-nums leading-none',
              stats.enabled ? 'text-[var(--noosphere-cyan)]' : 'text-[var(--text-muted)]',
            ].join(' ')}
          >
            {formatCount(stats.blockedCount)}
          </span>
        )}
      </button>
    </Tooltip>
  );
};

export default AdBlockCounter;
