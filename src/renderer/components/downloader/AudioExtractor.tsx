// ═══════════════════════════════════════════════════════════════════════════════
// COGITATOR BROWSER — Audio Extractor
// Tab: AUDIO
// Extracts audio via ffmpeg (main process, media.extractAudio IPC).
// Requires ffmpeg on PATH — install: pacman -S ffmpeg. Dark Mechanicus styling.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';

const OUTPUT_FORMATS = ['MP3', 'WAV', 'OGG', 'AAC', 'FLAC'] as const;
const BITRATES = [128, 192, 256, 320] as const;

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
  dropZone: {
    border: `2px dashed ${COLORS.gold}`,
    backgroundColor: COLORS.panel,
    padding: '40px',
    textAlign: 'center',
    marginBottom: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropZoneActive: {
    borderColor: COLORS.cyan,
    backgroundColor: '#1A1A1A',
  },
  dropText: {
    fontSize: '13px',
    color: COLORS.textDim,
  },
  fileName: {
    fontSize: '13px',
    color: COLORS.cyan,
    marginTop: '8px',
  },
  section: {
    backgroundColor: COLORS.panel,
    border: `1px solid ${COLORS.cyan}`,
    padding: '16px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '12px',
    color: COLORS.gold,
    marginBottom: '10px',
    letterSpacing: '1px',
  },
  optionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  optionButton: {
    backgroundColor: COLORS.bg,
    color: COLORS.textDim,
    border: `1px solid #333`,
    padding: '6px 14px',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
  },
  optionButtonActive: {
    backgroundColor: COLORS.bg,
    color: COLORS.cyan,
    border: `1px solid ${COLORS.cyan}`,
    padding: '6px 14px',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
  },
  extractButton: {
    backgroundColor: COLORS.bg,
    color: COLORS.border,
    border: `1px solid ${COLORS.border}`,
    padding: '10px 24px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
    letterSpacing: '2px',
    marginTop: '8px',
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: '24px',
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.gold}`,
    marginTop: '16px',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    transition: 'width 0.3s ease',
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    color: COLORS.text,
    textShadow: '0 0 4px #000',
  },
  resultPanel: {
    backgroundColor: COLORS.panel,
    border: `1px solid #00FF00`,
    padding: '16px',
    marginTop: '12px',
  },
  resultText: {
    fontSize: '12px',
    color: '#00FF00',
  },
  logPanel: {
    backgroundColor: COLORS.inputBg,
    border: `1px solid #333`,
    padding: '12px',
    marginTop: '12px',
    maxHeight: '150px',
    overflowY: 'auto',
    fontSize: '11px',
    color: COLORS.textDim,
  },
  logEntry: {
    marginBottom: '2px',
    fontFamily: 'monospace',
  },
};

// ═══ Audio extraction via ffmpeg (main process) ═══

export default function AudioExtractor(): JSX.Element {
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [outputFormat, setOutputFormat] = useState<(typeof OUTPUT_FORMATS)[number]>('MP3');
  const [bitrate, setBitrate] = useState<(typeof BITRATES)[number]>(192);
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [outputPath, setOutputPath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickVideoFile = useCallback(async () => {
    const path = await window.electronAPI.sigil.openFileDialog({
      title: 'Select video file',
      filters: [
        { name: 'Video', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov', 'm4v'] },
        { name: 'All', extensions: ['*'] },
      ],
    });
    if (path) {
      setSelectedPath(path);
      setSelectedName(path.split('/').pop() || path);
      setCompleted(false);
      setProgress(0);
      setLogs([]);
      setOutputPath('');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0] as (File & { path?: string }) | undefined;
    if (file?.path) {
      setSelectedPath(file.path);
      setSelectedName(file.name);
      setCompleted(false);
      setProgress(0);
      setLogs([]);
      setOutputPath('');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as (File & { path?: string }) | undefined;
    if (file?.path) {
      setSelectedPath(file.path);
      setSelectedName(file.name);
      setCompleted(false);
      setProgress(0);
      setLogs([]);
      setOutputPath('');
    }
  }, []);

  const handleExtract = useCallback(async () => {
    if (!selectedPath) return;
    setExtracting(true);
    setCompleted(false);
    setProgress(10);
    setLogs(['> Starting ffmpeg extraction...']);

    try {
      const out = await window.electronAPI.media.extractAudio(
        selectedPath,
        outputFormat.toLowerCase(),
        `${bitrate}k`
      );
      setOutputPath(out);
      setProgress(100);
      setLogs((prev) => [...prev, `> Done: ${out}`]);
      setCompleted(true);
    } catch (err) {
      setLogs((prev) => [...prev, `> Error: ${(err as Error).message}`]);
    } finally {
      setExtracting(false);
    }
  }, [selectedPath, outputFormat, bitrate]);

  const handleDownloadResult = useCallback(() => {
    if (outputPath) {
      void window.electronAPI.fs.reveal(outputPath);
    }
  }, [outputPath]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>// AUDIO EXTRACTOR //</div>

      {/* Drop Zone */}
      <div
        style={{
          ...styles.dropZone,
          ...(isDragging ? styles.dropZoneActive : {}),
        }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => void pickVideoFile()}
      >
        <div style={styles.dropText}>
          {isDragging
            ? '> DROP VIDEO FILE <'
            : '> DROP VIDEO FILE HERE OR CLICK TO SELECT <'}
        </div>
        {selectedName && (
          <div style={styles.fileName}>
            [ {selectedName} ]
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Output Format */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>// OUTPUT FORMAT</div>
        <div style={styles.optionRow}>
          {OUTPUT_FORMATS.map((fmt) => (
            <button
              key={fmt}
              style={outputFormat === fmt ? styles.optionButtonActive : styles.optionButton}
              onClick={() => setOutputFormat(fmt)}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Bitrate */}
      {outputFormat !== 'FLAC' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>// BITRATE (KBPS)</div>
          <div style={styles.optionRow}>
            {BITRATES.map((br) => (
              <button
                key={br}
                style={bitrate === br ? styles.optionButtonActive : styles.optionButton}
                onClick={() => setBitrate(br)}
              >
                {br}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Extract Button */}
      <button
        style={{
          ...styles.extractButton,
          opacity: selectedPath && !extracting ? 1 : 0.4,
          cursor: selectedPath && !extracting ? 'pointer' : 'not-allowed',
        }}
        onClick={handleExtract}
        disabled={!selectedPath || extracting}
        onMouseEnter={(e) => {
          if (selectedPath && !extracting) {
            (e.target as HTMLElement).style.backgroundColor = COLORS.border;
            (e.target as HTMLElement).style.color = COLORS.text;
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.backgroundColor = COLORS.bg;
          (e.target as HTMLElement).style.color = COLORS.border;
        }}
      >
        {extracting ? 'EXTRACTING...' : 'EXTRACT AUDIO'}
      </button>

      {/* Progress */}
      {extracting && (
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          <span style={styles.progressText}>{progress}%</span>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div style={styles.logPanel}>
          {logs.map((log, i) => (
            <div key={i} style={styles.logEntry}>{log}</div>
          ))}
        </div>
      )}

      {/* Result */}
      {completed && (
        <div style={styles.resultPanel}>
          <div style={styles.resultText}>
            {'> Audio extraction complete.'}
          </div>
          <button
            style={{
              ...styles.optionButtonActive,
              marginTop: '10px',
              color: '#00FF00',
              borderColor: '#00FF00',
            }}
            onClick={handleDownloadResult}
          >
            DOWNLOAD AUDIO FILE
          </button>
        </div>
      )}
    </div>
  );
}
