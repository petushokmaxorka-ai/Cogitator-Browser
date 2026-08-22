// ═══════════════════════════════════════════════════════════════════════════════
// COGITATOR BROWSER — Video Downloader
// Tab: VIDEO DL
// Integrates yt-dlp via IPC to main process.
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import type { VideoInfo, DownloadHistoryItem } from '../../../shared/types';

// ═══ yt-dlp via main process IPC ═══
async function analyzeVideoUrl(url: string): Promise<VideoInfo> {
  const raw = await window.electronAPI?.media?.analyze?.(url);
  if (!raw) throw new Error('Analyze failed');
  const data = raw as { title: string; duration: number; formats: Array<{ id: string; label: string; ext: string }> };
  const mins = Math.floor((data.duration || 0) / 60);
  const secs = (data.duration || 0) % 60;
  return {
    title: data.title,
    duration: `${mins}:${String(secs).padStart(2, '0')}`,
    formats: data.formats.map((f) => ({
      quality: f.label,
      format: f.ext.toUpperCase(),
      size: f.id,
    })),
  };
}

async function downloadVideoUrl(
  url: string,
  formatId: string,
  onProgress: (p: number) => void,
): Promise<void> {
  onProgress(5);
  await window.electronAPI?.media?.download?.(url, formatId);
  onProgress(100);
}

async function extractAudioFromUrl(url: string): Promise<void> {
  await window.electronAPI?.media?.extractAudio?.(url, 'mp3', '192k');
}

const COLORS = {
  bg: '#000000',
  panel: '#111111',
  border: '#FF0000',
  gold: '#C8A84B',
  cyan: '#00BFBF',
  text: '#E0E0E0',
  textDim: '#888888',
  inputBg: '#1A1A1A',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: 'monospace',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    overflow: 'auto',
  },
  header: {
    fontSize: '14px',
    color: COLORS.border,
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '8px',
    marginBottom: '16px',
    letterSpacing: '2px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    color: COLORS.text,
    border: `1px solid ${COLORS.gold}`,
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: '13px',
    outline: 'none',
  },
  button: {
    backgroundColor: COLORS.bg,
    color: COLORS.gold,
    border: `1px solid ${COLORS.gold}`,
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  buttonHover: {
    backgroundColor: COLORS.gold,
    color: COLORS.bg,
  },
  buttonDanger: {
    backgroundColor: COLORS.bg,
    color: COLORS.border,
    border: `1px solid ${COLORS.border}`,
    padding: '6px 12px',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
  },
  resultPanel: {
    backgroundColor: COLORS.panel,
    border: `1px solid ${COLORS.cyan}`,
    padding: '16px',
    marginBottom: '16px',
  },
  thumbnail: {
    width: '100%',
    maxWidth: '320px',
    height: '180px',
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.gold}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.textDim,
    fontSize: '12px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    color: COLORS.cyan,
    marginBottom: '4px',
  },
  duration: {
    fontSize: '12px',
    color: COLORS.textDim,
    marginBottom: '12px',
  },
  formatsHeader: {
    fontSize: '12px',
    color: COLORS.gold,
    marginBottom: '8px',
    letterSpacing: '1px',
  },
  formatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    borderBottom: `1px solid #222`,
    fontSize: '12px',
  },
  progressBar: {
    width: '100%',
    height: '20px',
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.cyan}`,
    marginTop: '12px',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.cyan,
    transition: 'width 0.3s ease',
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '11px',
    color: COLORS.text,
  },
  historyPanel: {
    marginTop: '16px',
  },
  historyHeader: {
    fontSize: '12px',
    color: COLORS.border,
    marginBottom: '8px',
    letterSpacing: '1px',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: COLORS.panel,
    border: `1px solid #222`,
    marginBottom: '4px',
    fontSize: '11px',
  },
  statusCompleted: { color: '#00FF00' },
  statusFailed: { color: COLORS.border },
  statusPending: { color: COLORS.gold },
  statusDownloading: { color: COLORS.cyan },
  loading: {
    color: COLORS.cyan,
    fontSize: '12px',
    textAlign: 'center',
    padding: '20px',
  },
};

export default function VideoDownloader(): JSX.Element {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setVideoInfo(null);
    try {
      const info = await analyzeVideoUrl(url);
      setVideoInfo(info);
    } catch {
      // ignore
    } finally {
      setAnalyzing(false);
    }
  }, [url]);

  const handleDownload = useCallback(async (quality: string, format: string) => {
    const key = `${quality}-${format}`;
    const formatId = videoInfo?.formats.find((f) => f.quality === quality && f.format === format)?.size || quality;
    setDownloadProgress((prev) => ({ ...prev, [key]: 0 }));

    const item: DownloadHistoryItem = {
      id: `${Date.now()}-${key}`,
      url: url || '',
      title: videoInfo?.title || 'Unknown',
      quality,
      format,
      date: new Date().toLocaleString(),
      status: 'downloading',
      progress: 0,
      timestamp: Date.now(),
    };
    setHistory((prev) => [item, ...prev]);

    await downloadVideoUrl(url, formatId, (p) => {
      setDownloadProgress((prev) => ({ ...prev, [key]: p }));
    });

    setHistory((prev) =>
      prev.map((h) => (h.id === item.id ? { ...h, status: 'completed' } : h))
    );
  }, [url, videoInfo]);

  const handleExtractAudio = useCallback(async () => {
    if (!url.trim()) return;
    const key = 'audio-mp3';
    setDownloadProgress((prev) => ({ ...prev, [key]: 0 }));
    const item: DownloadHistoryItem = {
      id: `${Date.now()}-${key}`,
      url: url || '',
      title: videoInfo?.title || 'Unknown',
      quality: 'audio',
      format: 'MP3',
      date: new Date().toLocaleString(),
      status: 'downloading',
      progress: 0,
      timestamp: Date.now(),
    };
    setHistory((prev) => [item, ...prev]);
    await extractAudioFromUrl(url);
    setDownloadProgress((prev) => ({ ...prev, [key]: 100 }));
    setHistory((prev) =>
      prev.map((h) => (h.id === item.id ? { ...h, status: 'completed' } : h))
    );
  }, [url, videoInfo]);

  const getStatusStyle = (status: DownloadHistoryItem['status']) => {
    switch (status) {
      case 'completed': return styles.statusCompleted;
      case 'failed': return styles.statusFailed;
      case 'pending': return styles.statusPending;
      case 'downloading': return styles.statusDownloading;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>// VIDEO DOWNLOADER //</div>

      {/* URL Input */}
      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="Paste YouTube, Vimeo, etc. URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          style={styles.input}
        />
        <button
          style={styles.button}
          onClick={handleAnalyze}
          disabled={analyzing}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = COLORS.gold;
            (e.target as HTMLElement).style.color = COLORS.bg;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = COLORS.bg;
            (e.target as HTMLElement).style.color = COLORS.gold;
          }}
        >
          {analyzing ? 'ANALYZING...' : 'ANALYZE'}
        </button>
      </div>

      {/* Results */}
      {analyzing && <div style={styles.loading}>&gt; Analyzing URL...</div>}

      {videoInfo && (
        <div style={styles.resultPanel}>
          {/* Thumbnail */}
          <div style={styles.thumbnail}>[ THUMBNAIL PREVIEW ]</div>

          {/* Title & Duration */}
          <div style={styles.title}>{videoInfo.title}</div>
          <div style={styles.duration}>Duration: {videoInfo.duration}</div>

          {/* Formats */}
          <div style={styles.formatsHeader}>// AVAILABLE FORMATS</div>
          {videoInfo.formats.map((fmt, idx) => {
            const key = `${fmt.quality}-${fmt.format}`;
            const progress = downloadProgress[key];
            return (
              <div key={idx} style={styles.formatRow}>
                <span>
                  <span style={{ color: COLORS.cyan }}>{fmt.quality}</span>
                  {' | '}
                  <span style={{ color: COLORS.gold }}>{fmt.format}</span>
                  {' | '}
                  <span style={{ color: COLORS.textDim }}>{fmt.size}</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {progress !== undefined && progress < 100 && (
                    <span style={{ color: COLORS.cyan, fontSize: '11px' }}>
                      {progress}%
                    </span>
                  )}
                  {progress === 100 && (
                    <span style={{ color: '#00FF00', fontSize: '11px' }}>DONE</span>
                  )}
                  <button
                    style={styles.buttonDanger}
                    onClick={() => void handleDownload(fmt.quality, fmt.format)}
                    disabled={progress !== undefined && progress < 100}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = COLORS.border;
                      (e.target as HTMLElement).style.color = COLORS.text;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = COLORS.bg;
                      (e.target as HTMLElement).style.color = COLORS.border;
                    }}
                  >
                    DOWNLOAD
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              style={styles.button}
              onClick={() => void handleExtractAudio()}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = COLORS.gold;
                (e.target as HTMLElement).style.color = COLORS.bg;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = COLORS.bg;
                (e.target as HTMLElement).style.color = COLORS.gold;
              }}
            >
              EXTRACT AUDIO
            </button>
          </div>

          {/* Progress Bar */}
          {Object.values(downloadProgress).some((p) => p > 0 && p < 100) && (
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${Math.max(...Object.values(downloadProgress).filter((p) => p < 100))}%`,
                }}
              />
              <span style={styles.progressText}>
                {Math.max(...Object.values(downloadProgress).filter((p) => p < 100))}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={styles.historyPanel}>
          <div style={styles.historyHeader}>// DOWNLOAD HISTORY</div>
          {history.map((item) => (
            <div key={item.id} style={styles.historyItem}>
              <span>
                <span style={{ color: COLORS.cyan }}>{item.title}</span>
                {' | '}
                <span style={{ color: COLORS.gold }}>
                  {item.quality} / {item.format}
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: COLORS.textDim }}>{item.date}</span>
                <span style={getStatusStyle(item.status)}>
                  [{item.status.toUpperCase()}]
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
