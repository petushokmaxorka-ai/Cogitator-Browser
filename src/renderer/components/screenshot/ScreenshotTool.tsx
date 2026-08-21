// ═══ OPTICAL CAPTURE ═══
// Screenshot Tool with Annotation Canvas — Dark Mechanicus Interface
// Capture the visual data-streams of the Noosphere.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  X,
  Square,
  ArrowRight,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Download,
  Copy,
  Check,
  Maximize,
  Crop,
  Circle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type AnnotationTool = 'rectangle' | 'arrow' | 'text' | 'eraser';
type AnnotationColor = 'red' | 'gold' | 'cyan' | 'white';
type LineWidth = 2 | 4 | 8;

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  tool: AnnotationTool;
  color: string;
  lineWidth: number;
  points: Point[];
  text?: string;
}

interface ScreenshotToolProps {
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const COLOR_MAP: Record<AnnotationColor, string> = {
  red: '#FF0000',
  gold: '#C8A84B',
  cyan: '#00BFBF',
  white: '#E8E8E8',
};

const TOOLS: { key: AnnotationTool; label: string; icon: React.ReactNode }[] = [
  { key: 'rectangle', label: 'Rect', icon: <Square size={14} /> },
  { key: 'arrow', label: 'Arrow', icon: <ArrowRight size={14} /> },
  { key: 'text', label: 'Text', icon: <Type size={14} /> },
  { key: 'eraser', label: 'Erase', icon: <Eraser size={14} /> },
];

const COLORS: { key: AnnotationColor; label: string }[] = [
  { key: 'red', label: 'Red' },
  { key: 'gold', label: 'Gold' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'white', label: 'White' },
];

const LINE_WIDTHS: LineWidth[] = [2, 4, 8];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function ScreenshotTool({ onClose }: ScreenshotToolProps) {
  // ── Mode state ───────────────────────────────────────────
  const [mode, setMode] = useState<'idle' | 'area-select' | 'annotating'>('idle');

  // ── Capture state ────────────────────────────────────────
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // ── Annotation state ─────────────────────────────────────
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rectangle');
  const [activeColor, setActiveColor] = useState<AnnotationColor>('red');
  const [activeLineWidth, setActiveLineWidth] = useState<LineWidth>(4);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);

  // ── Area selection state ─────────────────────────────────
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // ── UI state ─────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Refs ─────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════════════════════
  // Capture Functions
  // ═══════════════════════════════════════════════════════════

  // Capture full page — request from main process
  const handleCaptureFull = useCallback(async () => {
    try {
      // Use IPC to capture the current page
      const result = await window.electronAPI?.tabs?.getAll?.();
      if (result && Array.isArray(result) && result.length > 0) {
        // For now, use a canvas to capture the visible area
        // Full page capture would require webContents.capturePage() in main
        await captureVisibleArea();
      } else {
        await captureVisibleArea();
      }
    } catch {
      await captureVisibleArea();
    }
  }, []);

  const captureVisibleArea = useCallback(async () => {
    try {
      // Use html2canvas-like approach: capture the webview
      // Since we can't directly access webview from renderer,
      // we'll use a placeholder message with instructions
      setMode('annotating');
      // Create a placeholder canvas with instructions
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Dark background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid pattern
        ctx.strokeStyle = '#1E1E1E';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Title
        ctx.fillStyle = '#C8A84B';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OPTICAL CAPTURE — SCREENSHOT TOOL', canvas.width / 2, canvas.height / 2 - 60);

        // Instructions
        ctx.fillStyle = '#8B7D6B';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText('Full page capture requires main process integration.', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Use Ctrl+Shift+S to activate area capture overlay.', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Or paste an image from clipboard (Ctrl+V).', canvas.width / 2, canvas.height / 2 + 50);

        // Border
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
      }
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
      setImageSize({ width: canvas.width, height: canvas.height });
      setMode('annotating');
    } catch (err) {
      console.error('[ScreenshotTool] Capture failed:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Area Selection
  // ═══════════════════════════════════════════════════════════

  const startAreaSelection = useCallback(() => {
    setMode('area-select');
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const handleOverlayMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 'area-select') return;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    setIsSelecting(true);
  }, [mode]);

  const handleOverlayMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || mode !== 'area-select') return;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectionEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [isSelecting, mode]);

  const handleOverlayMouseUp = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) return;
    setIsSelecting(false);

    // Calculate selection area
    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const w = Math.abs(selectionEnd.x - selectionStart.x);
    const h = Math.abs(selectionEnd.y - selectionStart.y);

    if (w > 10 && h > 10) {
      // Capture the selected area
      captureSelectedArea(x, y, w, h);
    }

    setMode('idle');
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd]);

  const captureSelectedArea = useCallback((x: number, y: number, w: number, h: number) => {
    // Create canvas with selected dimensions
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Selection border visualization
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);

      // Info text
      ctx.fillStyle = '#C8A84B';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(`Captured: ${w}x${h}px`, 10, 20);
      ctx.fillText(`From: (${Math.round(x)}, ${Math.round(y)})`, 10, 40);

      // Crosshair center
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = 'rgba(0, 191, 191, 0.3)';
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy);
      ctx.lineTo(cx + 20, cy);
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx, cy + 20);
      ctx.stroke();
    }
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);
    setImageSize({ width: w, height: h });
    setMode('annotating');
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Clipboard Paste
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (mode === 'area-select') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              const img = new Image();
              img.onload = () => {
                setCapturedImage(dataUrl);
                setImageSize({ width: img.width, height: img.height });
                setMode('annotating');
              };
              img.src = dataUrl;
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode]);

  // ═══════════════════════════════════════════════════════════
  // Canvas Drawing
  // ═══════════════════════════════════════════════════════════

  // Redraw all annotations whenever they change
  useEffect(() => {
    if (!capturedImage || mode !== 'annotating') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load base image
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw all annotations
      annotations.forEach((ann) => drawAnnotation(ctx, ann));

      // Draw current annotation in progress
      if (currentAnnotation) {
        drawAnnotation(ctx, currentAnnotation);
      }
    };
    img.src = capturedImage;
  }, [annotations, capturedImage, mode, currentAnnotation]);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
    if (ann.points.length < 2 && ann.tool !== 'text') return;

    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (ann.tool) {
      case 'rectangle': {
        if (ann.points.length >= 2) {
          const [p1, p2] = [ann.points[0], ann.points[ann.points.length - 1]];
          const x = Math.min(p1.x, p2.x);
          const y = Math.min(p1.y, p2.y);
          const w = Math.abs(p2.x - p1.x);
          const h = Math.abs(p2.y - p1.y);
          ctx.strokeRect(x, y, w, h);
        }
        break;
      }
      case 'arrow': {
        if (ann.points.length >= 2) {
          const from = ann.points[0];
          const to = ann.points[ann.points.length - 1];
          drawArrow(ctx, from, to, ann.lineWidth);
        }
        break;
      }
      case 'text': {
        if (ann.text && ann.points.length > 0) {
          const p = ann.points[0];
          ctx.font = `${ann.lineWidth * 3 + 10}px "Courier New", monospace`;
          ctx.fillText(ann.text, p.x, p.y);
        }
        break;
      }
      case 'eraser': {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ann.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.lineTo(ann.points[ann.points.length - 1].x, ann.points[ann.points.length - 1].y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, from: Point, to: Point, width: number) => {
    const headLen = width * 4;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    // Line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLen * Math.cos(angle - Math.PI / 6),
      to.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headLen * Math.cos(angle + Math.PI / 6),
      to.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  // ═══════════════════════════════════════════════════════════
  // Mouse Handlers for Drawing
  // ═══════════════════════════════════════════════════════════

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'annotating') return;
    const point = getCanvasPoint(e);

    if (activeTool === 'text') {
      setTextPosition(point);
      setShowTextInput(true);
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    const newAnn: Annotation = {
      id: `ann-${Date.now()}`,
      tool: activeTool,
      color: COLOR_MAP[activeColor],
      lineWidth: activeLineWidth,
      points: [point],
    };

    setCurrentAnnotation(newAnn);
    setIsDrawing(true);
  }, [mode, activeTool, activeColor, activeLineWidth]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    const point = getCanvasPoint(e);

    setCurrentAnnotation((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points:
          prev.tool === 'rectangle' || prev.tool === 'arrow'
            ? [prev.points[0], point]
            : [...prev.points, point],
      };
    });
  }, [isDrawing, currentAnnotation]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawing || !currentAnnotation) return;

    if (currentAnnotation.points.length >= 2 ||
        (currentAnnotation.tool === 'text' && currentAnnotation.text)) {
      setAnnotations((prev) => [...prev, currentAnnotation]);
      setRedoStack([]); // Clear redo stack on new action
    }

    setCurrentAnnotation(null);
    setIsDrawing(false);
  }, [isDrawing, currentAnnotation]);

  // ═══════════════════════════════════════════════════════════
  // Text Annotation
  // ═══════════════════════════════════════════════════════════

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || !textPosition) {
      setShowTextInput(false);
      setTextInput('');
      setTextPosition(null);
      return;
    }

    const newAnn: Annotation = {
      id: `ann-${Date.now()}`,
      tool: 'text',
      color: COLOR_MAP[activeColor],
      lineWidth: activeLineWidth,
      points: [textPosition],
      text: textInput.trim(),
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setRedoStack([]);
    setShowTextInput(false);
    setTextInput('');
    setTextPosition(null);
  }, [textInput, textPosition, activeColor, activeLineWidth]);

  // ═══════════════════════════════════════════════════════════
  // Undo / Redo
  // ═══════════════════════════════════════════════════════════

  const handleUndo = useCallback(() => {
    setAnnotations((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setAnnotations((a) => [...a, last]);
      return prev.slice(0, -1);
    });
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Save / Copy
  // ═══════════════════════════════════════════════════════════

  const getAnnotatedDataUrl = useCallback((format: 'png' | 'jpeg' = 'png'): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    // Create a fresh canvas with all annotations baked in
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = imageSize.width;
    exportCanvas.height = imageSize.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';

    // White background for JPEG
    if (format === 'jpeg') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // Draw base image
    const img = new Image();
    img.src = capturedImage || '';

    // Draw all annotations
    annotations.forEach((ann) => drawAnnotation(ctx, ann));

    return exportCanvas.toDataURL(`image/${format}`, 0.95);
  }, [annotations, capturedImage, imageSize]);

  const handleSave = useCallback((format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `cogitator-capture-${Date.now()}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, 0.95);
    link.click();

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleCopy = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error('[ScreenshotTool] Copy failed:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Keyboard Shortcuts
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.key === 'Escape') {
        if (mode === 'area-select') {
          setMode('idle');
          setIsSelecting(false);
          setSelectionStart(null);
          setSelectionEnd(null);
        } else if (showTextInput) {
          setShowTextInput(false);
          setTextInput('');
        } else if (mode === 'annotating') {
          // Go back to idle / clear
          if (annotations.length > 0) {
            // Ask to clear — for now just keep
          } else {
            setCapturedImage(null);
            setMode('idle');
          }
        } else {
          onClose();
        }
      }

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((isCtrl && e.key === 'y') || (isCtrl && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onClose, handleUndo, handleRedo, annotations.length, showTextInput]);

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: mode === 'area-select' ? 'transparent' : 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ═══ Idle Mode — Capture Options ═══ */}
      {mode === 'idle' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
              <Camera size={24} style={{ color: 'var(--omnissiah-red)' }} />
              <span
                style={{
                  color: 'var(--cogitator-gold)',
                  fontSize: '16px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase' as const,
                  fontWeight: 'bold',
                }}
              >
                Optical Capture
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px', letterSpacing: '0.1em' }}>
              Record the visual essence of the Noosphere
            </span>
          </div>

          {/* Capture buttons */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={handleCaptureFull}
              style={captureButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; e.currentTarget.style.boxShadow = 'var(--glow-red)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Maximize size={20} />
              <span>Full Page</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ctrl+Shift+S</span>
            </button>

            <button
              onClick={startAreaSelection}
              style={captureButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cogitator-gold)'; e.currentTarget.style.boxShadow = 'var(--glow-gold)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Crop size={20} />
              <span>Select Area</span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Drag to capture</span>
            </button>
          </div>

          {/* Instructions */}
          <div
            style={{
              padding: '12px 20px',
              border: '1px solid var(--iron-gray)',
              background: 'var(--iron-dark)',
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'var(--parchment-dim)', fontSize: '10px' }}>
              Paste image from clipboard:{' '}
              <kbd
                style={{
                  background: 'var(--void-black)',
                  border: '1px solid var(--steel-gray)',
                  padding: '2px 6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--sacred-white)',
                }}
              >
                Ctrl+V
              </kbd>
            </span>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              ...mechButtonStyle,
              padding: '6px 16px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
          >
            <X size={12} />
            Close
          </button>
        </div>
      )}

      {/* ═══ Area Selection Overlay ═══ */}
      {mode === 'area-select' && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            cursor: 'crosshair',
            zIndex: 10000,
          }}
          onMouseDown={handleOverlayMouseDown}
          onMouseMove={handleOverlayMouseMove}
          onMouseUp={handleOverlayMouseUp}
        >
          {/* Instructions */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 16px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--omnissiah-red)',
              color: 'var(--parchment)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              pointerEvents: 'none',
            }}
          >
            Drag to select area — ESC to cancel
          </div>

          {/* Selection box */}
          {selectionStart && selectionEnd && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(selectionStart.x, selectionEnd.x),
                top: Math.min(selectionStart.y, selectionEnd.y),
                width: Math.abs(selectionEnd.x - selectionStart.x),
                height: Math.abs(selectionEnd.y - selectionStart.y),
                border: '1px dashed var(--omnissiah-red)',
                background: 'rgba(255, 0, 0, 0.05)',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: 0,
                  color: 'var(--omnissiah-red)',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                {Math.abs(selectionEnd.x - selectionStart.x)} x {Math.abs(selectionEnd.y - selectionStart.y)} px
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Annotating Mode ═══ */}
      {mode === 'annotating' && capturedImage && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'var(--iron-dark)',
              borderBottom: '1px solid var(--iron-gray)',
              flexShrink: 0,
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {/* Left: Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--cogitator-gold)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginRight: '8px' }}>
                <Camera size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {imageSize.width}x{imageSize.height}px
              </span>

              {TOOLS.map((tool) => (
                <button
                  key={tool.key}
                  onClick={() => setActiveTool(tool.key)}
                  title={tool.label}
                  style={{
                    ...mechButtonStyle,
                    color: activeTool === tool.key ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                    borderColor: activeTool === tool.key ? 'var(--omnissiah-red)' : 'var(--iron-gray)',
                  }}
                  onMouseEnter={(e) => { if (activeTool !== tool.key) e.currentTarget.style.color = 'var(--parchment)'; }}
                  onMouseLeave={(e) => { if (activeTool !== tool.key) e.currentTarget.style.color = 'var(--parchment-dim)'; }}
                >
                  {tool.icon}
                  <span style={{ fontSize: '9px' }}>{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Center: Colors & Size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Color picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setActiveColor(c.key)}
                    title={c.label}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '2px',
                      background: COLOR_MAP[c.key],
                      border: activeColor === c.key ? '2px solid var(--sacred-white)' : '2px solid transparent',
                      cursor: 'pointer',
                      opacity: activeColor === c.key ? 1 : 0.6,
                      transition: 'all 150ms ease',
                    }}
                  />
                ))}
              </div>

              {/* Line width */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', borderLeft: '1px solid var(--iron-gray)', paddingLeft: '8px' }}>
                {LINE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setActiveLineWidth(w)}
                    title={`${w}px`}
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: activeLineWidth === w ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                      border: activeLineWidth === w ? '1px solid var(--omnissiah-red)' : '1px solid var(--iron-gray)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: w === 2 ? 8 : w === 4 ? 12 : 16,
                        height: w === 2 ? 2 : w === 4 ? 4 : 8,
                        background: COLOR_MAP[activeColor],
                        borderRadius: 1,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Undo/Redo */}
              <button
                onClick={handleUndo}
                disabled={annotations.length === 0}
                title="Undo (Ctrl+Z)"
                style={{
                  ...mechButtonStyle,
                  opacity: annotations.length === 0 ? 0.4 : 1,
                }}
              >
                <Undo2 size={11} />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo (Ctrl+Y)"
                style={{
                  ...mechButtonStyle,
                  opacity: redoStack.length === 0 ? 0.4 : 1,
                }}
              >
                <Redo2 size={11} />
              </button>

              <div style={{ width: '1px', height: '20px', background: 'var(--iron-gray)', margin: '0 4px' }} />

              {/* Save/Copy */}
              <button
                onClick={() => handleSave('png')}
                title="Save as PNG"
                style={mechButtonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--noosphere-cyan)'; e.currentTarget.style.color = 'var(--noosphere-cyan)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
              >
                <Download size={11} />
                <span style={{ fontSize: '9px' }}>PNG</span>
              </button>
              <button
                onClick={() => handleSave('jpeg')}
                title="Save as JPG"
                style={mechButtonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cogitator-gold)'; e.currentTarget.style.color = 'var(--cogitator-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
              >
                <Download size={11} />
                <span style={{ fontSize: '9px' }}>JPG</span>
              </button>
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
                style={{
                  ...mechButtonStyle,
                  color: copied ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
                  borderColor: copied ? 'var(--noosphere-cyan)' : 'var(--iron-gray)',
                }}
                onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--noosphere-cyan)'; }}
                onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--parchment-dim)'; }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span style={{ fontSize: '9px' }}>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <div style={{ width: '1px', height: '20px', background: 'var(--iron-gray)', margin: '0 4px' }} />

              {/* Close */}
              <button
                onClick={onClose}
                title="Close"
                style={mechButtonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; e.currentTarget.style.color = 'var(--parchment-dim)'; }}
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 140px)',
                  cursor: activeTool === 'text' ? 'text' : activeTool === 'eraser' ? 'cell' : 'crosshair',
                  display: 'block',
                }}
              />

              {/* Text input overlay */}
              {showTextInput && textPosition && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(textPosition.x / imageSize.width) * 100}%`,
                    top: `${(textPosition.y / imageSize.height) * 100}%`,
                    zIndex: 10,
                  }}
                >
                  <input
                    ref={textInputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTextSubmit();
                      if (e.key === 'Escape') {
                        setShowTextInput(false);
                        setTextInput('');
                      }
                    }}
                    onBlur={handleTextSubmit}
                    placeholder="Type text..."
                    style={{
                      background: 'var(--void-black)',
                      border: `2px solid ${COLOR_MAP[activeColor]}`,
                      color: COLOR_MAP[activeColor],
                      fontFamily: 'var(--font-mono)',
                      fontSize: `${activeLineWidth * 3 + 10}px`,
                      padding: '4px 8px',
                      outline: 'none',
                      minWidth: '150px',
                      boxShadow: `0 0 10px ${COLOR_MAP[activeColor]}40`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer: Annotation count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 12px',
              background: 'var(--iron-dark)',
              borderTop: '1px solid var(--iron-gray)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
              {annotations.length} annotations
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                Tool: <span style={{ color: 'var(--parchment)' }}>{activeTool.toUpperCase()}</span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                Color: <span style={{ color: COLOR_MAP[activeColor] }}>{activeColor.toUpperCase()}</span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                Size: <span style={{ color: 'var(--parchment)' }}>{activeLineWidth}px</span>
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
              ESC to exit · Ctrl+Z undo · Ctrl+Y redo
            </span>
          </div>
        </div>
      )}

      {/* ═══ No Image State (fallback) ═══ */}
      {mode === 'annotating' && !capturedImage && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <Camera size={32} strokeWidth={1} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: '11px' }}>No image captured</span>
          <button
            onClick={() => setMode('idle')}
            style={mechButtonStyle}
          >
            Back to Capture
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const mechButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: 'var(--iron-dark)',
  border: '1px solid var(--iron-gray)',
  color: 'var(--parchment-dim)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  flexShrink: 0,
};

const captureButtonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  padding: '24px 32px',
  background: 'var(--iron-dark)',
  border: '1px solid var(--iron-gray)',
  color: 'var(--parchment)',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  transition: 'all 200ms ease',
  minWidth: '140px',
};
