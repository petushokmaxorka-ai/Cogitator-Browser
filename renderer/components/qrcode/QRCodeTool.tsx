// ═══ QR CODE TOOL ═══
// Generator & Scanner — Dark Mechanicus Interface
// Pure TypeScript implementation without external libraries
// Generates QR-like patterns as visual data matrices

import { useState, useRef, useCallback, useEffect } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  Upload,
  Download,
  Copy,
  Check,
  RefreshCw,
  Palette,
  ExternalLink,
  X,
  ScanLine,
  Image,
} from 'lucide-react';

// ── QR-like Pattern Generator ─────────────────────────────

interface PatternCell {
  x: number;
  y: number;
  filled: boolean;
}

/** Generate a deterministic pseudo-random pattern from text */
function generatePattern(text: string, size: number): PatternCell[] {
  const cells: PatternCell[] = [];

  // Use the text to seed a simple PRNG
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) & 0xffffffff;
  }

  const pseudoRandom = (): number => {
    seed = (seed * 1103515245 + 12345) & 0xffffffff;
    return (seed >>> 16) / 0xffff;
  };

  // Generate finder patterns (3 squares in corners like real QR)
  const finderSize = Math.max(3, Math.floor(size * 0.15));

  // Top-left finder
  for (let y = 1; y < finderSize - 1; y++) {
    for (let x = 1; x < finderSize - 1; x++) {
      cells.push({ x, y, filled: true });
    }
  }
  // Top-right finder
  for (let y = 1; y < finderSize - 1; y++) {
    for (let x = size - finderSize + 1; x < size - 1; x++) {
      cells.push({ x, y, filled: true });
    }
  }
  // Bottom-left finder
  for (let y = size - finderSize + 1; y < size - 1; y++) {
    for (let x = 1; x < finderSize - 1; x++) {
      cells.push({ x, y, filled: true });
    }
  }

  // Timing patterns
  for (let i = finderSize + 1; i < size - finderSize - 1; i += 2) {
    cells.push({ x: i, y: finderSize - 2, filled: true });
    cells.push({ x: finderSize - 2, y: i, filled: true });
  }

  // Data pattern from text hash
  for (let y = finderSize + 1; y < size - 2; y++) {
    for (let x = finderSize + 1; x < size - 2; x++) {
      // Skip areas near other finder patterns
      if (y < finderSize && x > size - finderSize - 1) continue;
      if (y > size - finderSize - 1 && x < finderSize) continue;

      if (pseudoRandom() > 0.45) {
        cells.push({ x, y, filled: true });
      }
    }
  }

  return cells;
}

/** Render pattern to canvas */
function renderPatternToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  pixelSize: number,
  fgColor: string,
  bgColor: string
): void {
  const size = pixelSize;
  const cellSize = Math.floor(256 / size);
  canvas.width = cellSize * size;
  canvas.height = cellSize * size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Quiet zone border
  ctx.strokeStyle = fgColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // Cells
  const cells = generatePattern(text, size);
  ctx.fillStyle = fgColor;
  cells.forEach((cell) => {
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  });
}

/** Convert canvas to SVG string */
function patternToSVG(
  text: string,
  pixelSize: number,
  fgColor: string,
  bgColor: string
): string {
  const size = pixelSize;
  const cellSize = Math.floor(256 / size);
  const totalSize = cellSize * size;
  const cells = generatePattern(text, size);

  let rects = '';
  cells.forEach((cell) => {
    rects += `<rect x="${cell.x * cellSize}" y="${cell.y * cellSize}" width="${cellSize}" height="${cellSize}"/>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">
  <rect width="${totalSize}" height="${totalSize}" fill="${bgColor}"/>
  <g fill="${fgColor}">
    ${rects}
  </g>
</svg>`;
}

// ── Component ───────────────────────────────────────────────

type QRMode = 'generate' | 'scan';

const SIZES = [128, 256, 512, 1024];

export default function QRCodeTool() {
  // ── State ─────────────────────────────────────────────────
  const [mode, setMode] = useState<QRMode>('generate');
  const [inputText, setInputText] = useState('https://cogitator.browser');
  const [pixelSize, setPixelSize] = useState(32);
  const [fgColor, setFgColor] = useState('#C8A84B');
  const [bgColor, setBgColor] = useState('#000000');
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedSVG, setCopiedSVG] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Generate pattern ──────────────────────────────────────
  useEffect(() => {
    if (mode === 'generate' && canvasRef.current && inputText) {
      renderPatternToCanvas(canvasRef.current, inputText, pixelSize, fgColor, bgColor);
    }
  }, [inputText, pixelSize, fgColor, bgColor, mode]);

  // ── Download PNG ──────────────────────────────────────────
  const handleDownloadPNG = useCallback(() => {
    if (!canvasRef.current || !inputText) return;
    const link = document.createElement('a');
    link.download = `cogitator-qr-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, [inputText]);

  // ── Download SVG ──────────────────────────────────────────
  const handleDownloadSVG = useCallback(() => {
    if (!inputText) return;
    const svg = patternToSVG(inputText, pixelSize, fgColor, bgColor);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `cogitator-qr-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [inputText, pixelSize, fgColor, bgColor]);

  // ── Copy to clipboard ─────────────────────────────────────
  const handleCopyImage = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 1500);
      });
    } catch (err) {
      console.error('[QR] Copy failed:', err);
    }
  }, []);

  // ── Copy SVG ──────────────────────────────────────────────
  const handleCopySVG = useCallback(async () => {
    if (!inputText) return;
    try {
      const svg = patternToSVG(inputText, pixelSize, fgColor, bgColor);
      await navigator.clipboard.writeText(svg);
      setCopiedSVG(true);
      setTimeout(() => setCopiedSVG(false), 1500);
    } catch (err) {
      console.error('[QR] SVG copy failed:', err);
    }
  }, [inputText, pixelSize, fgColor, bgColor]);

  // ── Scan from camera ──────────────────────────────────────
  const scanFrame = useCallback((stream: MediaStream, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    if (!ctx || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(() => scanFrame(stream, canvas));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code) {
      stream.getTracks().forEach((track) => track.stop());
      setIsScanning(false);
      setScanResult(code.data);
      return;
    }

    // Continue scanning
    requestAnimationFrame(() => scanFrame(stream, canvas));
  }, []);

  const handleCameraScan = useCallback(async () => {
    setScanError('');
    setScanResult('');
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const canvas = document.createElement('canvas');
        scanFrame(stream, canvas);

        // Safety timeout after 30 seconds
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          setIsScanning(false);
          if (!scanResult) {
            setScanError('No QR code detected within 30 seconds');
          }
        }, 30000);
      }
    } catch (err) {
      setScanError('Camera access denied or unavailable');
      setIsScanning(false);
    }
  }, [scanFrame, scanResult]);

  // ── Scan from image file ──────────────────────────────────
  const handleImageScan = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError('');
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setScanError('Canvas context not available');
          setIsScanning(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'attemptBoth',
        });
        setIsScanning(false);
        if (code) {
          setScanResult(code.data);
        } else {
          setScanError('No QR code found in image');
        }
      };
      img.onerror = () => {
        setScanError('Failed to load image');
        setIsScanning(false);
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setScanError('Failed to read image file');
      setIsScanning(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  }, []);

  // ── Is URL ────────────────────────────────────────────────
  const isUrl = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  // ═════════════════════════════════════════════════════════
  //  RENDER: GENERATOR MODE
  // ═════════════════════════════════════════════════════════

  if (mode === 'generate') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid var(--iron-gray)',
            background: 'var(--void-black)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            <QrCode size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            QR Code
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setMode('scan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.color = 'var(--omnissiah-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              <ScanLine size={12} />
              Scanner
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Text / URL
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text or URL..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 150ms ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />
          </div>

          {/* Size selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Resolution
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setPixelSize(s === 128 ? 16 : s === 256 ? 24 : s === 512 ? 32 : 48)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: pixelSize === (s === 128 ? 16 : s === 256 ? 24 : s === 512 ? 32 : 48)
                      ? 'rgba(200, 168, 75, 0.15)'
                      : 'var(--void-black)',
                    border: `1px solid ${pixelSize === (s === 128 ? 16 : s === 256 ? 24 : s === 512 ? 32 : 48)
                      ? 'var(--cogitator-gold)'
                      : 'var(--iron-gray)'}`,
                    color: pixelSize === (s === 128 ? 16 : s === 256 ? 24 : s === 512 ? 32 : 48)
                      ? 'var(--cogitator-gold)'
                      : 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'var(--parchment-dim)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                <Palette size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Foreground
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  style={{
                    width: '36px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid var(--iron-gray)',
                    background: 'var(--void-black)',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--sacred-white)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    outline: 'none',
                    letterSpacing: '0.05em',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'var(--parchment-dim)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                Background
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{
                    width: '36px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid var(--iron-gray)',
                    background: 'var(--void-black)',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--sacred-white)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    outline: 'none',
                    letterSpacing: '0.05em',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
                />
              </div>
            </div>
          </div>

          {/* QR Canvas */}
          {inputText && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                padding: '16px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  imageRendering: 'pixelated',
                  border: `1px solid ${fgColor}22`,
                }}
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={handleDownloadPNG}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: 'rgba(0, 191, 191, 0.1)',
                    border: '1px solid var(--noosphere-cyan)',
                    color: 'var(--noosphere-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 191, 191, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 191, 191, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 191, 191, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Download size={12} />
                  PNG
                </button>
                <button
                  onClick={handleDownloadSVG}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: 'rgba(0, 191, 191, 0.1)',
                    border: '1px solid var(--noosphere-cyan)',
                    color: 'var(--noosphere-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 191, 191, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 191, 191, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 191, 191, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Download size={12} />
                  SVG
                </button>
                <button
                  onClick={handleCopyImage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: copiedImage
                      ? 'rgba(0, 191, 191, 0.2)'
                      : 'rgba(200, 168, 75, 0.1)',
                    border: `1px solid ${copiedImage ? 'var(--noosphere-cyan)' : 'var(--cogitator-gold)'}`,
                    color: copiedImage ? 'var(--noosphere-cyan)' : 'var(--cogitator-gold)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!copiedImage) {
                      e.currentTarget.style.background = 'rgba(200, 168, 75, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copiedImage) {
                      e.currentTarget.style.background = 'rgba(200, 168, 75, 0.1)';
                    }
                  }}
                >
                  {copiedImage ? <Check size={12} /> : <Copy size={12} />}
                  {copiedImage ? 'Copied' : 'Copy PNG'}
                </button>
                <button
                  onClick={handleCopySVG}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    background: copiedSVG
                      ? 'rgba(0, 191, 191, 0.2)'
                      : 'rgba(200, 168, 75, 0.1)',
                    border: `1px solid ${copiedSVG ? 'var(--noosphere-cyan)' : 'var(--cogitator-gold)'}`,
                    color: copiedSVG ? 'var(--noosphere-cyan)' : 'var(--cogitator-gold)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!copiedSVG) {
                      e.currentTarget.style.background = 'rgba(200, 168, 75, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copiedSVG) {
                      e.currentTarget.style.background = 'rgba(200, 168, 75, 0.1)';
                    }
                  }}
                >
                  {copiedSVG ? <Check size={12} /> : <Copy size={12} />}
                  {copiedSVG ? 'Copied' : 'Copy SVG'}
                </button>
              </div>
            </div>
          )}

          {/* Color presets */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                color: 'var(--parchment-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Presets
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { fg: '#C8A84B', bg: '#000000', label: 'Gold / Void' },
                { fg: '#FF0000', bg: '#000000', label: 'Crimson' },
                { fg: '#00BFBF', bg: '#000000', label: 'Cyan' },
                { fg: '#000000', bg: '#C8A84B', label: 'Inverted' },
                { fg: '#D4C5A0', bg: '#1E1E1E', label: 'Parchment' },
                { fg: '#FFFFFF', bg: '#000000', label: 'Mono' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setFgColor(preset.fg); setBgColor(preset.bg); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = preset.fg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      background: preset.fg,
                      border: `1px solid ${preset.bg === '#000000' ? '#333' : preset.bg}`,
                      display: 'inline-block',
                    }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  RENDER: SCANNER MODE
  // ═════════════════════════════════════════════════════════

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          background: 'var(--void-black)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
          }}
        >
          <ScanLine size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          QR Scanner
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setMode('generate')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
              e.currentTarget.style.color = 'var(--omnissiah-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
          >
            <QrCode size={12} />
            Generator
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Camera view */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            overflow: 'hidden',
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: isScanning ? 'block' : 'none',
            }}
          />
          {!isScanning && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--parchment-dim)',
              }}
            >
              <ScanLine size={48} strokeWidth={1} />
              <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Camera feed will appear here
              </span>
            </div>
          )}

          {/* Scanning overlay */}
          {isScanning && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '2px dashed var(--noosphere-cyan)',
                opacity: 0.5,
                pointerEvents: 'none',
              }}
            >
              {/* Corner markers */}
              <div style={{ position: 'absolute', top: '20%', left: '20%', width: '20px', height: '20px', borderTop: '2px solid var(--noosphere-cyan)', borderLeft: '2px solid var(--noosphere-cyan)' }} />
              <div style={{ position: 'absolute', top: '20%', right: '20%', width: '20px', height: '20px', borderTop: '2px solid var(--noosphere-cyan)', borderRight: '2px solid var(--noosphere-cyan)' }} />
              <div style={{ position: 'absolute', bottom: '20%', left: '20%', width: '20px', height: '20px', borderBottom: '2px solid var(--noosphere-cyan)', borderLeft: '2px solid var(--noosphere-cyan)' }} />
              <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '20px', height: '20px', borderBottom: '2px solid var(--noosphere-cyan)', borderRight: '2px solid var(--noosphere-cyan)' }} />
            </div>
          )}
        </div>

        {/* Scan buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCameraScan}
            disabled={isScanning}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              background: isScanning ? 'var(--iron-dark)' : 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))',
              border: '1px solid var(--omnissiah-red)',
              color: isScanning ? 'var(--text-muted)' : 'var(--sacred-white)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isScanning) {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isScanning) {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Camera size={14} />
            {isScanning ? 'Scanning...' : 'Scan from Camera'}
          </button>
          <button
            onClick={handleImageScan}
            disabled={isScanning}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              background: isScanning ? 'var(--iron-dark)' : 'rgba(0, 191, 191, 0.1)',
              border: '1px solid var(--noosphere-cyan)',
              color: isScanning ? 'var(--text-muted)' : 'var(--noosphere-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isScanning) {
                e.currentTarget.style.background = 'rgba(0, 191, 191, 0.2)';
                e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isScanning) {
                e.currentTarget.style.background = 'rgba(0, 191, 191, 0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Image size={14} />
            Scan from Image
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Error */}
        {scanError && (
          <div
            style={{
              padding: '10px',
              background: 'rgba(255, 0, 0, 0.05)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              color: 'var(--omnissiah-red)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <X size={12} />
            {scanError}
          </div>
        )}

        {/* Scan result */}
        {scanResult && (
          <div
            style={{
              padding: '12px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: 'var(--noosphere-cyan)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Scan Result
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                wordBreak: 'break-all',
                lineHeight: 1.5,
                background: 'var(--void-black)',
                padding: '10px',
                border: '1px solid var(--iron-gray)',
              }}
            >
              {scanResult}
            </div>
            {isUrl(scanResult) && (
              <button
                onClick={() => {
                  try {
                    window.open(scanResult, '_blank');
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  background: 'rgba(0, 191, 191, 0.1)',
                  border: '1px solid var(--noosphere-cyan)',
                  color: 'var(--noosphere-cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 191, 191, 0.2)';
                  e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 191, 191, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <ExternalLink size={12} />
                Open URL
              </button>
            )}
          </div>
        )}

        {/* Note */}
        <div
          style={{
            padding: '10px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            fontSize: '10px',
            color: 'var(--steel-gray)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--cogitator-gold)' }}>Note:</strong> QR decoding powered by <code style={{ color: 'var(--noosphere-cyan)' }}>jsQR</code>.
          Supports camera scan (real-time) and image upload.
        </div>
      </div>
    </div>
  );
}
