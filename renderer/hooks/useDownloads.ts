// ═══ USE DOWNLOADS ═══
// Monitor and control file transfers from the Noosphere.
// Renderer-side state management for download operations.

import { useState, useCallback, useEffect } from 'react';

// ── Types ───────────────────────────────────────────────────

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'cancelled' | 'failed';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  status: DownloadStatus;
  savePath: string;
  startTime: number;
  endTime?: number;
}

export interface UseDownloadsReturn {
  downloads: DownloadItem[];
  addDownload: (item: Omit<DownloadItem, 'id' | 'startTime' | 'receivedBytes' | 'status'>) => void;
  updateProgress: (id: string, receivedBytes: number, totalBytes: number) => void;
  completeDownload: (id: string) => void;
  failDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  clearCompleted: () => void;
  openFile: (id: string) => void;
  showInFolder: (id: string) => void;
}

// ── Helper: generate unique ID ──────────────────────────────

const generateId = (): string => {
  return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ── Helper: format bytes ────────────────────────────────────

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// ── Helper: format download speed ───────────────────────────

export const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatBytes(bytesPerSecond)}/s`;
};

// ── Hook ────────────────────────────────────────────────────

export function useDownloads(): UseDownloadsReturn {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  // ── IPC Listeners: Subscribe to main process download events ──
  useEffect(() => {
    const api = window.electronAPI?.downloads;
    if (!api) return;

    const unsubStarted = api.onStarted?.((data: any) => {
      const newItem: DownloadItem = {
        id: data.id || `dl_${Date.now()}`,
        filename: data.filename || 'Unknown',
        url: data.url || '',
        totalBytes: data.totalBytes || 0,
        receivedBytes: 0,
        status: 'downloading',
        savePath: data.savePath || '',
        startTime: data.startTime || Date.now(),
      };
      setDownloads((prev) => [newItem, ...prev]);
    });

    const unsubProgress = api.onProgress?.((data: any) => {
      setDownloads((prev) =>
        prev.map((dl) =>
          dl.id === data.id
            ? {
                ...dl,
                receivedBytes: data.receivedBytes || dl.receivedBytes,
                totalBytes: data.totalBytes || dl.totalBytes,
                status: 'downloading' as DownloadStatus,
              }
            : dl
        )
      );
    });

    const unsubCompleted = api.onCompleted?.((data: any) => {
      setDownloads((prev) =>
        prev.map((dl) =>
          dl.id === data.id
            ? { ...dl, status: 'completed' as DownloadStatus, endTime: Date.now() }
            : dl
        )
      );
    });

    return () => {
      unsubStarted?.();
      unsubProgress?.();
      unsubCompleted?.();
    };
  }, []);

  // ── Add new download ──────────────────────────────────────

  const addDownload = useCallback(
    (item: Omit<DownloadItem, 'id' | 'startTime' | 'receivedBytes' | 'status'>) => {
      const newItem: DownloadItem = {
        ...item,
        id: generateId(),
        startTime: Date.now(),
        receivedBytes: 0,
        status: 'pending',
      };
      setDownloads((prev) => [newItem, ...prev]);
      return newItem.id;
    },
    []
  );

  // ── Update progress ───────────────────────────────────────

  const updateProgress = useCallback((id: string, receivedBytes: number, totalBytes: number) => {
    setDownloads((prev) =>
      prev.map((dl) =>
        dl.id === id
          ? { ...dl, receivedBytes, totalBytes, status: 'downloading' as DownloadStatus }
          : dl
      )
    );
  }, []);

  // ── Mark as completed ─────────────────────────────────────

  const completeDownload = useCallback((id: string) => {
    setDownloads((prev) =>
      prev.map((dl) =>
        dl.id === id
          ? { ...dl, status: 'completed' as DownloadStatus, endTime: Date.now() }
          : dl
      )
    );
  }, []);

  // ── Mark as failed ────────────────────────────────────────

  const failDownload = useCallback((id: string) => {
    setDownloads((prev) =>
      prev.map((dl) =>
        dl.id === id
          ? { ...dl, status: 'failed' as DownloadStatus, endTime: Date.now() }
          : dl
      )
    );
  }, []);

  // ── Cancel download ───────────────────────────────────────

  const cancelDownload = useCallback((id: string) => {
    setDownloads((prev) =>
      prev.map((dl) =>
        dl.id === id
          ? { ...dl, status: 'cancelled' as DownloadStatus, endTime: Date.now() }
          : dl
      )
    );
  }, []);

  // ── Clear completed downloads ─────────────────────────────

  const clearCompleted = useCallback(() => {
    setDownloads((prev) =>
      prev.filter((dl) => dl.status !== 'completed' && dl.status !== 'cancelled' && dl.status !== 'failed')
    );
  }, []);

  // ── Open file (placeholder for IPC integration) ───────────

  const openFile = useCallback((id: string) => {
    const dl = downloads.find((d) => d.id === id);
    if (!dl?.savePath) return;
    void window.electronAPI?.fs?.openPath?.(dl.savePath);
  }, [downloads]);

  const showInFolder = useCallback((id: string) => {
    const dl = downloads.find((d) => d.id === id);
    if (!dl?.savePath) return;
    void window.electronAPI?.fs?.reveal?.(dl.savePath);
  }, [downloads]);

  return {
    downloads,
    addDownload,
    updateProgress,
    completeDownload,
    failDownload,
    cancelDownload,
    clearCompleted,
    openFile,
    showInFolder,
  };
}

export default useDownloads;
