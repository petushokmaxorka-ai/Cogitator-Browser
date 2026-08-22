// ═══ useVPN ═══
/**
 * Custom hook for managing the VPN (Noospheric Cloak) connection.
 * Tracks connection status, IP address, and provides start/stop controls
 * with automatic periodic refresh every 5 seconds.
 *
 * The data-shroud conceals the cogitator's presence in the noosphere.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VPNStatus } from '../../shared/types';

// ─── Interfaces ─────────────────────────────────────────────────────────────────

export interface UseVPNReturn {
  /** Current VPN status including connection state and IP */
  status: VPNStatus;
  /** Establish the VPN connection */
  start: () => Promise<void>;
  /** Terminate the VPN connection */
  stop: () => Promise<void>;
  /** Manually refresh the VPN status from the main process */
  refresh: () => Promise<void>;
  /** Whether a start/stop operation is in progress */
  isLoading: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_REFRESH_INTERVAL_MS = 5000; // 5 seconds

// ─── Hook ───────────────────────────────────────────────────────────────────────

const useVPN = (): UseVPNReturn => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<VPNStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Fetch the latest VPN status from the main process */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const currentStatus = await window.electronAPI.vpn.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('[useVPN] refresh error:', error);
      setStatus({ connected: false });
    }
  }, []);

  /** Activate the VPN connection */
  const start = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await window.electronAPI.vpn.start();
      await refresh();
    } catch (error) {
      console.error('[useVPN] start error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  /** Deactivate the VPN connection */
  const stop = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await window.electronAPI.vpn.stop();
      await refresh();
    } catch (error) {
      console.error('[useVPN] stop error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // ── Effects ────────────────────────────────────────────────────────────────

  /** Initial status fetch on mount */
  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      await refresh();
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Periodic status refresh every 5 seconds */
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refresh();
    }, STATUS_REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    status,
    start,
    stop,
    refresh,
    isLoading,
  };
};

export default useVPN;
