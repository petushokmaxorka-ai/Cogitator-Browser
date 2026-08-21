// ═══════════════════════════════════════════════════════════════════════════════
// COGITATOR BROWSER — Whiteboard
// Tab: DRAW
// Canvas 2D freehand drawing with tools, undo/redo, pan/zoom, grid
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { DrawingTool, DrawingAction } from '../../../shared/types';

const COLORS = {
  bg: '#000000',
  panel: '#111111',
  border: '#FF0000',
  gold: '#C8A84B',
  cyan: '#00BFBF',
  text: '#E0E0E0',
  textDim: '#888888',
  canvasBg: '#0D0D0D',
  grid: '#1A1A1A',
};

const TOOL_COLORS: string[] = [
  COLORS.border,
  COLORS.gold,
  COLORS.cyan,
  '#00FF00',
  '#FF00FF',
  '#FFFF00',
  '#FFFFFF',
  '#FF6600',
  '#6600FF',
  '#00FFFF',
];

const TOOLS: { id: DrawingTool; label: string }[] = [
  { id: 'pen', label: 'PEN' },
  { id: 'eraser', label: 'ERASER' },
  { id: 'line', label: 'LINE' },
  { id: 'rectangle', label: 'RECT' },
  { id: 'circle', label: 'CIRCLE' },
  { id: 'arrow', label: 'ARROW' },
  { id: 'text', label: 'TEXT' },
];

// ═══ History State for Undo/Redo ═══
interface HistoryState {
  actions: DrawingAction[];
  redoStack: DrawingAction[];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: 'monospace',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: COLORS.panel,
    borderBottom: `1px solid ${COLORS.border}`,
    minHeight: '48px',
  },
  toolButton: {
    backgroundColor: COLORS.bg,
    color: COLORS.textDim,
    border: `1px solid #333`,
    padding: '5px 10px',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  toolButtonActive: {
    backgroundColor: COLORS.bg,
    color: COLORS.cyan,
    border: `1px solid ${COLORS.cyan}`,
    padding: '5px 10px',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  colorSwatch: {
    width: '20px',
    height: '20px',
    border: '1px solid #333',
    cursor: 'pointer',
  },
  colorSwatchActive: {
    width: '20px',
    height: '20px',
    border: `2px solid ${COLORS.text}`,
    cursor: 'pointer',
    boxShadow: `0 0 4px ${COLORS.cyan}`,
  },
  separator: {
    width: '1px',
    height: '24px',
    backgroundColor: '#333',
    margin: '0 4px',
  },
  sizeSlider: {
    width: '80px',
    accentColor: COLORS.cyan,
  },
  sizeLabel: {
    fontSize: '11px',
    color: COLORS.gold,
    minWidth: '24px',
  },
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    cursor: 'crosshair',
  },
  canvas: {
    display: 'block',
    backgroundColor: COLORS.canvasBg,
  },
  exportButton: {
    backgroundColor: COLORS.bg,
    color: '#00FF00',
    border: `1px solid #00FF00`,
    padding: '5px 12px',
    fontFamily: 'monospace',
    fontSize: '11px',
    cursor: 'pointer',
  },
  textInput: {
    position: 'absolute',
    backgroundColor: COLORS.canvasBg,
    color: COLORS.cyan,
    border: `1px solid ${COLORS.cyan}`,
    fontFamily: 'monospace',
    fontSize: '14px',
    padding: '2px 4px',
    outline: 'none',
    zIndex: 10,
  },
  zoomLabel: {
    fontSize: '10px',
    color: COLORS.textDim,
    marginLeft: 'auto',
  },
};

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  e: React.MouseEvent | MouseEvent,
  scale: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - offsetX) / scale,
    y: (e.clientY - rect.top - offsetY) / scale,
  };
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  const headLength = 12;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  offsetX: number,
  offsetY: number
): void {
  const gridSize = 20 * scale;
  const startX = offsetX % gridSize;
  const startY = offsetY % gridSize;

  ctx.save();
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  for (let x = startX; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = startY; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

export default function Whiteboard(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState(COLORS.cyan);
  const [lineWidth, setLineWidth] = useState(2);
  const [showGrid, setShowGrid] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [history, setHistory] = useState<HistoryState>({ actions: [], redoStack: [] });
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [textValue, setTextValue] = useState('');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Canvas size
  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 2000 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resize = () => {
      setCanvasSize({
        width: Math.max(2000, container.clientWidth),
        height: Math.max(2000, container.clientHeight),
      });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Draw all actions
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply pan/zoom
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);

    // Grid
    if (showGrid) {
      drawGrid(ctx, canvas.width / scale, canvas.height / scale, scale, offset.x, offset.y);
    }

    // Draw all actions
    history.actions.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (action.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      if (action.tool === 'pen' || action.tool === 'eraser') {
        ctx.beginPath();
        const pts = action.points;
        if (pts.length > 0) {
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();
        }
      } else if (action.tool === 'line') {
        const pts = action.points;
        if (pts.length === 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        }
      } else if (action.tool === 'rectangle') {
        const pts = action.points;
        if (pts.length === 2) {
          ctx.beginPath();
          ctx.rect(
            pts[0].x,
            pts[0].y,
            pts[1].x - pts[0].x,
            pts[1].y - pts[0].y
          );
          ctx.stroke();
        }
      } else if (action.tool === 'circle') {
        const pts = action.points;
        if (pts.length === 2) {
          const radius = Math.sqrt(
            Math.pow(pts[1].x - pts[0].x, 2) + Math.pow(pts[1].y - pts[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (action.tool === 'arrow') {
        const pts = action.points;
        if (pts.length === 2) {
          drawArrow(ctx, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        }
      } else if (action.tool === 'text' && action.text) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = `${action.lineWidth * 6 + 10}px monospace`;
        ctx.fillStyle = action.color;
        ctx.fillText(action.text, action.points[0].x, action.points[0].y);
      }
    });

    ctx.restore();
  }, [history.actions, showGrid, scale, offset]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Pan with middle mouse or space+click
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        return;
      }

      if (e.button !== 0) return;

      const pt = getCanvasPoint(canvas, e, scale, offset.x, offset.y);
      setIsDrawing(true);
      setStartPoint(pt);
      setCurrentPoints([pt]);

      if (tool === 'text') {
        setTextInput({ x: e.clientX, y: e.clientY, visible: true });
        setTextValue('');
        setIsDrawing(false);
      }
    },
    [tool, scale, offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (isPanning) {
        setOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      if (!isDrawing) return;

      const pt = getCanvasPoint(canvas, e, scale, offset.x, offset.y);

      if (tool === 'pen' || tool === 'eraser') {
        setCurrentPoints((prev) => [...prev, pt]);

        // Draw immediately for pen/eraser
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
        ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        const prev = currentPoints[currentPoints.length - 1];
        if (prev) {
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    [isDrawing, isPanning, tool, color, lineWidth, scale, offset, panStart, currentPoints]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }

      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const pt = getCanvasPoint(canvas, e, scale, offset.x, offset.y);

      if (tool === 'pen' || tool === 'eraser') {
        const action: DrawingAction = {
          tool,
          color,
          lineWidth,
          points: [...currentPoints, pt],
        };
        setHistory((h) => ({
          actions: [...h.actions, action],
          redoStack: [],
        }));
      } else if (['line', 'rectangle', 'circle', 'arrow'].includes(tool)) {
        const action: DrawingAction = {
          tool: tool as DrawingTool,
          color,
          lineWidth,
          points: [startPoint, pt],
        };
        setHistory((h) => ({
          actions: [...h.actions, action],
          redoStack: [],
        }));
      }

      setIsDrawing(false);
      setCurrentPoints([]);
    },
    [isDrawing, isPanning, tool, color, lineWidth, startPoint, currentPoints, scale, offset]
  );

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim()) {
      setTextInput((prev) => ({ ...prev, visible: false }));
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pt = {
      x: (textInput.x - rect.left - offset.x) / scale,
      y: (textInput.y - rect.top - offset.y) / scale,
    };

    const action: DrawingAction = {
      tool: 'text',
      color,
      lineWidth,
      points: [pt],
      text: textValue,
    };

    setHistory((h) => ({
      actions: [...h.actions, action],
      redoStack: [],
    }));

    setTextInput((prev) => ({ ...prev, visible: false }));
    setTextValue('');
  }, [textValue, textInput, color, lineWidth, scale, offset]);

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.actions.length === 0) return h;
      const lastAction = h.actions[h.actions.length - 1];
      return {
        actions: h.actions.slice(0, -1),
        redoStack: [...h.redoStack, lastAction],
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((h) => {
      if (h.redoStack.length === 0) return h;
      const nextAction = h.redoStack[h.redoStack.length - 1];
      return {
        actions: [...h.actions, nextAction],
        redoStack: h.redoStack.slice(0, -1),
      };
    });
  }, []);

  const handleClear = useCallback(() => {
    setHistory({ actions: [], redoStack: [] });
  }, []);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export without grid
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    // Fill background
    expCtx.fillStyle = COLORS.canvasBg;
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw all actions
    history.actions.forEach((action) => {
      expCtx.strokeStyle = action.color;
      expCtx.fillStyle = action.color;
      expCtx.lineWidth = action.lineWidth;
      expCtx.lineCap = 'round';
      expCtx.lineJoin = 'round';

      if (action.tool === 'eraser') {
        expCtx.globalCompositeOperation = 'destination-out';
        expCtx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        expCtx.globalCompositeOperation = 'source-over';
      }

      if (action.tool === 'pen' || action.tool === 'eraser') {
        expCtx.beginPath();
        const pts = action.points;
        if (pts.length > 0) {
          expCtx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            expCtx.lineTo(pts[i].x, pts[i].y);
          }
          expCtx.stroke();
        }
      } else if (action.tool === 'line' && action.points.length === 2) {
        expCtx.beginPath();
        expCtx.moveTo(action.points[0].x, action.points[0].y);
        expCtx.lineTo(action.points[1].x, action.points[1].y);
        expCtx.stroke();
      } else if (action.tool === 'rectangle' && action.points.length === 2) {
        expCtx.beginPath();
        expCtx.rect(
          action.points[0].x,
          action.points[0].y,
          action.points[1].x - action.points[0].x,
          action.points[1].y - action.points[0].y
        );
        expCtx.stroke();
      } else if (action.tool === 'circle' && action.points.length === 2) {
        const radius = Math.sqrt(
          Math.pow(action.points[1].x - action.points[0].x, 2) +
          Math.pow(action.points[1].y - action.points[0].y, 2)
        );
        expCtx.beginPath();
        expCtx.arc(action.points[0].x, action.points[0].y, radius, 0, Math.PI * 2);
        expCtx.stroke();
      } else if (action.tool === 'arrow' && action.points.length === 2) {
        drawArrow(expCtx, action.points[0].x, action.points[0].y, action.points[1].x, action.points[1].y);
      } else if (action.tool === 'text' && action.text) {
        expCtx.globalCompositeOperation = 'source-over';
        expCtx.font = `${action.lineWidth * 6 + 10}px monospace`;
        expCtx.fillStyle = action.color;
        expCtx.fillText(action.text, action.points[0].x, action.points[0].y);
      }
    });

    const url = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard_${Date.now()}.png`;
    a.click();
  }, [history.actions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((s) => Math.max(0.1, Math.min(5, s + delta)));
      }
    },
    []
  );

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Tools */}
        {TOOLS.map((t) => (
          <button
            key={t.id}
            style={tool === t.id ? styles.toolButtonActive : styles.toolButton}
            onClick={() => setTool(t.id)}
            title={t.label}
          >
            {t.label}
          </button>
        ))}

        <div style={styles.separator} />

        {/* Colors */}
        {TOOL_COLORS.map((c) => (
          <div
            key={c}
            style={color === c ? styles.colorSwatchActive : styles.colorSwatch}
            onClick={() => setColor(c)}
          >
            <div style={{ width: '100%', height: '100%', backgroundColor: c }} />
          </div>
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', background: 'none' }}
        />

        <div style={styles.separator} />

        {/* Size */}
        <span style={styles.sizeLabel}>{lineWidth}px</span>
        <input
          type="range"
          min={1}
          max={20}
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          style={styles.sizeSlider}
        />

        <div style={styles.separator} />

        {/* Grid Toggle */}
        <button
          style={showGrid ? styles.toolButtonActive : styles.toolButton}
          onClick={() => setShowGrid(!showGrid)}
        >
          GRID
        </button>

        {/* Undo / Redo */}
        <button
          style={styles.toolButton}
          onClick={handleUndo}
          disabled={history.actions.length === 0}
        >
          UNDO
        </button>
        <button
          style={styles.toolButton}
          onClick={handleRedo}
          disabled={history.redoStack.length === 0}
        >
          REDO
        </button>

        {/* Clear */}
        <button style={styles.toolButton} onClick={handleClear}>
          CLEAR
        </button>

        <div style={styles.separator} />

        {/* Export */}
        <button style={styles.exportButton} onClick={handleExport}>
          EXPORT PNG
        </button>

        <span style={styles.zoomLabel}>
          {Math.round(scale * 100)}% | Shift+Drag to pan | Ctrl+Wheel to zoom
        </span>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        style={{
          ...styles.canvasContainer,
          cursor: isPanning ? 'grabbing' : tool === 'text' ? 'text' : 'crosshair',
        }}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            ...styles.canvas,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Text Input */}
        {textInput.visible && (
          <input
            type="text"
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') setTextInput((p) => ({ ...p, visible: false }));
            }}
            onBlur={handleTextSubmit}
            style={{
              ...styles.textInput,
              left: textInput.x,
              top: textInput.y,
              color: color,
              borderColor: color,
              fontSize: `${lineWidth * 6 + 10}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}
