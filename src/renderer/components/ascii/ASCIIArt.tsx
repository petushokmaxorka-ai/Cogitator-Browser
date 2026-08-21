// ═══════════════════════════════════════════════════════════════════════════════
// COGITATOR BROWSER — ASCII Art Generator
// Tab: ASCII
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';

const ASCII_CHARS = '@%#*+=-:. ';

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

function imageToASCII(
  canvas: HTMLCanvasElement,
  width: number,
  invert: boolean,
  colorMode: boolean
): { text: string; coloredSpans: JSX.Element[] } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { text: '', coloredSpans: [] };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const aspectRatio = canvas.height / canvas.width;
  const height = Math.floor(width * aspectRatio * 0.5); // chars are taller than wide

  let ascii = '';
  const spans: JSX.Element[] = [];
  const chars = invert
    ? ASCII_CHARS.split('').reverse().join('')
    : ASCII_CHARS;

  for (let y = 0; y < height; y++) {
    const lineSpans: JSX.Element[] = [];
    for (let x = 0; x < width; x++) {
      const px = Math.min(Math.floor((x / width) * canvas.width), canvas.width - 1);
      const py = Math.min(Math.floor((y / height) * canvas.height), canvas.height - 1);
      const i = (py * canvas.width + px) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const brightness = (r + g + b) / 3;
      const charIndex = Math.floor((brightness / 255) * (chars.length - 1));
      const char = chars[charIndex];
      ascii += char;

      if (colorMode) {
        lineSpans.push(
          <span
            key={`${x}-${y}`}
            style={{ color: `rgb(${r},${g},${b})` }}
          >
            {char}
          </span>
        );
      }
    }
    ascii += '\n';
    if (colorMode) {
      spans.push(
        <div key={y} style={{ lineHeight: '1em', height: '1em' }}>
          {lineSpans}
        </div>
      );
    }
  }

  return { text: ascii, coloredSpans: spans };
}

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
    padding: '30px',
    textAlign: 'center',
    marginBottom: '16px',
    cursor: 'pointer',
  },
  dropText: {
    fontSize: '13px',
    color: COLORS.textDim,
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '16px',
    backgroundColor: COLORS.panel,
    border: `1px solid ${COLORS.cyan}`,
    padding: '12px',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  controlLabel: {
    fontSize: '11px',
    color: COLORS.gold,
    letterSpacing: '1px',
  },
  slider: {
    width: '150px',
    accentColor: COLORS.cyan,
  },
  sliderValue: {
    fontSize: '12px',
    color: COLORS.cyan,
  },
  toggleButton: {
    backgroundColor: COLORS.bg,
    color: COLORS.textDim,
    border: `1px solid #333`,
    padding: '4px 12px',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.bg,
    color: COLORS.cyan,
    border: `1px solid ${COLORS.cyan}`,
    padding: '4px 12px',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
  },
  asciiOutput: {
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.gold}`,
    padding: '12px',
    fontSize: '10px',
    lineHeight: '1em',
    overflow: 'auto',
    maxHeight: '400px',
    whiteSpace: 'pre',
    color: COLORS.text,
  },
  asciiOutputColor: {
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.gold}`,
    padding: '12px',
    fontSize: '10px',
    lineHeight: '1em',
    overflow: 'auto',
    maxHeight: '400px',
    fontFamily: 'monospace',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
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
  buttonCopy: {
    backgroundColor: COLORS.bg,
    color: '#00FF00',
    border: `1px solid #00FF00`,
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  canvas: {
    display: 'none',
  },
  previewInfo: {
    fontSize: '11px',
    color: COLORS.textDim,
    marginBottom: '8px',
  },
  status: {
    fontSize: '12px',
    color: COLORS.cyan,
    marginTop: '8px',
  },
};

export default function ASCIIArt(): JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [asciiText, setAsciiText] = useState('');
  const [coloredSpans, setColoredSpans] = useState<JSX.Element[]>([]);
  const [width, setWidth] = useState(80);
  const [invert, setInvert] = useState(false);
  const [colorMode, setColorMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          // Draw image to canvas (resized for processing)
          const maxWidth = 800;
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);

          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const result = imageToASCII(canvas, width, invert, colorMode);
          setAsciiText(result.text);
          setColoredSpans(result.coloredSpans);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [width, invert, colorMode]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        setSelectedFile(file);
        processImage(file);
      }
    },
    [processImage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        processImage(file);
      }
    },
    [processImage]
  );

  const handleCopy = useCallback(async () => {
    if (!asciiText) return;
    try {
      await navigator.clipboard.writeText(asciiText);
      setCopyStatus('> Copied to clipboard');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('> Failed to copy');
    }
  }, [asciiText]);

  const handleExport = useCallback(() => {
    if (!asciiText) return;
    const blob = new Blob([asciiText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascii_art_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setCopyStatus('> Exported to .txt file');
    setTimeout(() => setCopyStatus(''), 2000);
  }, [asciiText]);

  // Re-process when width/invert/colorMode changes
  React.useEffect(() => {
    if (selectedFile) {
      processImage(selectedFile);
    }
  }, [width, invert, colorMode, selectedFile, processImage]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>// ASCII ART GENERATOR //</div>

      {/* Drop Zone */}
      <div
        style={{
          ...styles.dropZone,
          borderColor: isDragging ? COLORS.cyan : COLORS.gold,
        }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={styles.dropText}>
          {isDragging
            ? '> DROP IMAGE <'
            : '> DROP IMAGE HERE OR CLICK TO SELECT <'}
        </div>
        {selectedFile && (
          <div style={{ color: COLORS.cyan, fontSize: '12px', marginTop: '8px' }}>
            [ {selectedFile.name} ]
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Controls */}
      {selectedFile && (
        <>
          <div style={styles.controls}>
            {/* Width Slider */}
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>// WIDTH ({width} CHARS)</span>
              <input
                type="range"
                min={20}
                max={200}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                style={styles.slider}
              />
            </div>

            {/* Invert Toggle */}
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>// INVERT</span>
              <button
                style={invert ? styles.toggleButtonActive : styles.toggleButton}
                onClick={() => setInvert(!invert)}
              >
                {invert ? 'INVERTED' : 'NORMAL'}
              </button>
            </div>

            {/* Color Mode Toggle */}
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>// COLOR MODE</span>
              <button
                style={colorMode ? styles.toggleButtonActive : styles.toggleButton}
                onClick={() => setColorMode(!colorMode)}
              >
                {colorMode ? 'COLOR' : 'MONO'}
              </button>
            </div>
          </div>

          {/* Preview Info */}
          <div style={styles.previewInfo}>
            ASCII chars: {ASCII_CHARS} | Invert: {invert ? 'ON' : 'OFF'} | Color:{' '}
            {colorMode ? 'ON' : 'OFF'}
          </div>

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} style={styles.canvas} />

          {/* ASCII Output */}
          {asciiText && (
            <>
              {colorMode ? (
                <div style={styles.asciiOutputColor}>{coloredSpans}</div>
              ) : (
                <pre style={styles.asciiOutput}>{asciiText}</pre>
              )}

              {/* Action Buttons */}
              <div style={styles.buttonRow}>
                <button
                  style={styles.button}
                  onClick={handleCopy}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = COLORS.gold;
                    (e.target as HTMLElement).style.color = COLORS.bg;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = COLORS.bg;
                    (e.target as HTMLElement).style.color = COLORS.gold;
                  }}
                >
                  COPY TO CLIPBOARD
                </button>
                <button
                  style={styles.buttonCopy}
                  onClick={handleExport}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = '#00FF00';
                    (e.target as HTMLElement).style.color = COLORS.bg;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = COLORS.bg;
                    (e.target as HTMLElement).style.color = '#00FF00';
                  }}
                >
                  EXPORT .TXT
                </button>
              </div>

              {copyStatus && <div style={styles.status}>{copyStatus}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}
