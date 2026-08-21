// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAM TOOL — Flowchart Builder (Canvas 2D)
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type DiagramElementType = 'rectangle' | 'diamond' | 'circle' | 'arrow' | 'text';

interface Point {
  x: number;
  y: number;
}

interface DiagramElement {
  id: string;
  type: DiagramElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  borderColor: string;
  connections: string[]; // IDs of connected elements
  fromId?: string; // for arrow: source element ID
  toId?: string; // for arrow: target element ID
}

interface DragState {
  isDragging: boolean;
  elementId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ELEMENT_COLORS = [
  { label: 'Gold', value: '#C8A84B' },
  { label: 'Red', value: '#FF0000' },
  { label: 'Cyan', value: '#00BFBF' },
  { label: 'Parchment', value: '#D4C5A0' },
  { label: 'Green', value: '#4ade80' },
  { label: 'Purple', value: '#a78bfa' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'White', value: '#e5e5e5' },
];

const DEFAULT_COLOR = '#C8A84B';
const SELECTED_BORDER = '#FF0000';
const CANVAS_BG = '#000000';
const GRID_COLOR = '#1A1A1A';
const GRID_SIZE = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// Check if a point is inside an element
function hitTest(element: DiagramElement, px: number, py: number): boolean {
  switch (element.type) {
    case 'circle': {
      const dx = px - element.x;
      const dy = py - element.y;
      return dx * dx + dy * dy <= (element.width / 2) * (element.width / 2);
    }
    case 'diamond': {
      const dx = Math.abs(px - element.x);
      const dy = Math.abs(py - element.y);
      return dx / (element.width / 2) + dy / (element.height / 2) <= 1;
    }
    case 'arrow': {
      // Simple bounding box for arrow
      const minX = Math.min(element.x, element.x + element.width);
      const maxX = Math.max(element.x, element.x + element.width);
      const minY = Math.min(element.y, element.y + element.height);
      const maxY = Math.max(element.y, element.y + element.height);
      return px >= minX - 4 && px <= maxX + 4 && py >= minY - 4 && py <= maxY + 4;
    }
    default:
      return (
        px >= element.x - element.width / 2 &&
        px <= element.x + element.width / 2 &&
        py >= element.y - element.height / 2 &&
        py <= element.y + element.height / 2
      );
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DiagramTool() {
  // ═══ State ═══
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<DiagramElementType>('rectangle');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    elementId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState('');
  const [arrowStart, setArrowStart] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  // ═══ Canvas to screen coordinate conversion ═══
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  // ═══ Drawing / Rendering ═══
  const renderElements = useCallback(() => {
    return elements.map((el) => {
      const isSelected = el.id === selectedElementId;
      const borderColor = isSelected ? SELECTED_BORDER : el.borderColor;
      const borderWidth = isSelected ? 2 : 1;
      const glow = isSelected ? '0 0 12px rgba(255, 0, 0, 0.4)' : 'none';

      const commonStyle: React.CSSProperties = {
        position: 'absolute',
        left: el.x - el.width / 2,
        top: el.y - el.height / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: dragState.isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      };

      if (el.type === 'rectangle') {
        return (
          <div
            key={el.id}
            style={{
              ...commonStyle,
              width: el.width,
              height: el.height,
              background: `${el.color}10`,
              border: `${borderWidth}px solid ${borderColor}`,
              boxShadow: glow,
              color: el.color,
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              padding: '4px',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {el.text}
          </div>
        );
      }

      if (el.type === 'diamond') {
        const size = Math.max(el.width, el.height);
        return (
          <div
            key={el.id}
            style={{
              ...commonStyle,
              width: size,
              height: size,
              left: el.x - size / 2,
              top: el.y - size / 2,
              background: `${el.color}10`,
              border: `${borderWidth}px solid ${borderColor}`,
              boxShadow: glow,
              color: el.color,
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              transform: 'rotate(45deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <span style={{ transform: 'rotate(-45deg)', padding: '4px', wordBreak: 'break-word' }}>
              {el.text}
            </span>
          </div>
        );
      }

      if (el.type === 'circle') {
        const size = Math.max(el.width, el.height);
        return (
          <div
            key={el.id}
            style={{
              ...commonStyle,
              width: size,
              height: size,
              left: el.x - size / 2,
              top: el.y - size / 2,
              background: `${el.color}10`,
              border: `${borderWidth}px solid ${borderColor}`,
              boxShadow: glow,
              borderRadius: '50%',
              color: el.color,
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
              padding: '4px',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {el.text}
          </div>
        );
      }

      if (el.type === 'text') {
        return (
          <div
            key={el.id}
            style={{
              ...commonStyle,
              width: 'auto',
              height: 'auto',
              left: el.x,
              top: el.y,
              color: el.color,
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              cursor: 'grab',
              textShadow: glow,
            }}
          >
            {el.text}
          </div>
        );
      }

      if (el.type === 'arrow') {
        // Render arrow as SVG
        const dx = el.width;
        const dy = el.height;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <svg
            key={el.id}
            style={{
              position: 'absolute',
              left: Math.min(el.x, el.x + dx) - 10,
              top: Math.min(el.y, el.y + dy) - 10,
              width: Math.abs(dx) + 20,
              height: Math.abs(dy) + 20,
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            <defs>
              <marker
                id={`arrowhead-${el.id}`}
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={borderColor} />
              </marker>
            </defs>
            <line
              x1={el.x <= el.x + dx ? 10 : Math.abs(dx) + 10}
              y1={el.y <= el.y + dy ? 10 : Math.abs(dy) + 10}
              x2={el.x <= el.x + dx ? Math.abs(dx) + 10 : 10}
              y2={el.y <= el.y + dy ? Math.abs(dy) + 10 : 10}
              stroke={borderColor}
              strokeWidth={borderWidth}
              markerEnd={`url(#arrowhead-${el.id})`}
            />
          </svg>
        );
      }

      return null;
    });
  }, [elements, selectedElementId, dragState.isDragging]);

  // ═══ Mouse Handlers ═══
  function handleCanvasMouseDown(e: React.MouseEvent) {
    const point = getCanvasPoint(e);

    // Check if clicking on existing element
    for (let i = elements.length - 1; i >= 0; i--) {
      if (hitTest(elements[i], point.x, point.y)) {
        const el = elements[i];

        // Arrow connection mode
        if (selectedTool === 'arrow') {
          if (arrowStart === null) {
            setArrowStart(el.id);
            setSelectedElementId(el.id);
          } else if (arrowStart !== el.id) {
            // Create arrow between elements
            const fromEl = elements.find((e) => e.id === arrowStart);
            if (fromEl) {
              const newArrow: DiagramElement = {
                id: generateId(),
                type: 'arrow',
                x: fromEl.x,
                y: fromEl.y,
                width: el.x - fromEl.x,
                height: el.y - fromEl.y,
                text: '',
                color: selectedColor,
                borderColor: selectedColor,
                connections: [arrowStart, el.id],
                fromId: arrowStart,
                toId: el.id,
              };
              setElements((prev) => [...prev, newArrow]);
            }
            setArrowStart(null);
          }
          return;
        }

        // Start dragging
        setDragState({
          isDragging: true,
          elementId: el.id,
          startX: point.x,
          startY: point.y,
          offsetX: point.x - el.x,
          offsetY: point.y - el.y,
        });
        setSelectedElementId(el.id);
        return;
      }
    }

    // Clicked on empty space
    if (selectedTool === 'arrow') {
      setArrowStart(null);
    }

    // Start drawing a new element
    setIsDrawing(true);
    setDrawingStart(point);
    setSelectedElementId(null);
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    const point = getCanvasPoint(e);

    if (dragState.isDragging && dragState.elementId) {
      const newX = point.x - dragState.offsetX;
      const newY = point.y - dragState.offsetY;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id === dragState.elementId) {
            return { ...el, x: newX, y: newY };
          }
          return el;
        })
      );

      // Update arrows connected to this element
      setElements((prev) =>
        prev.map((el) => {
          if (el.type === 'arrow') {
            if (el.fromId === dragState.elementId && el.toId) {
              const toEl = prev.find((e) => e.id === el.toId);
              if (toEl) {
                return { ...el, x: newX, y: newY, width: toEl.x - newX, height: toEl.y - newY };
              }
            } else if (el.toId === dragState.elementId && el.fromId) {
              const fromEl = prev.find((e) => e.id === el.fromId);
              if (fromEl) {
                return { ...el, width: newX - fromEl.x, height: newY - fromEl.y };
              }
            }
          }
          return el;
        })
      );
    }
  }

  function handleCanvasMouseUp(e: React.MouseEvent) {
    const point = getCanvasPoint(e);

    if (isDrawing && drawingStart) {
      const dx = point.x - drawingStart.x;
      const dy = point.y - drawingStart.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Only create if dragged a minimum distance (otherwise treat as click)
      if (selectedTool === 'text' || (absDx > 10 && absDy > 10)) {
        let newElement: DiagramElement;

        switch (selectedTool) {
          case 'rectangle':
            newElement = {
              id: generateId(),
              type: 'rectangle',
              x: drawingStart.x + dx / 2,
              y: drawingStart.y + dy / 2,
              width: absDx,
              height: absDy,
              text: 'Process',
              color: selectedColor,
              borderColor: selectedColor,
              connections: [],
            };
            break;
          case 'diamond':
            newElement = {
              id: generateId(),
              type: 'diamond',
              x: drawingStart.x + dx / 2,
              y: drawingStart.y + dy / 2,
              width: absDx,
              height: absDy,
              text: 'Decision?',
              color: selectedColor,
              borderColor: selectedColor,
              connections: [],
            };
            break;
          case 'circle':
            newElement = {
              id: generateId(),
              type: 'circle',
              x: drawingStart.x + dx / 2,
              y: drawingStart.y + dy / 2,
              width: Math.max(absDx, absDy),
              height: Math.max(absDx, absDy),
              text: 'Start',
              color: selectedColor,
              borderColor: selectedColor,
              connections: [],
            };
            break;
          case 'text':
            newElement = {
              id: generateId(),
              type: 'text',
              x: point.x,
              y: point.y,
              width: 100,
              height: 20,
              text: 'Label',
              color: selectedColor,
              borderColor: selectedColor,
              connections: [],
            };
            break;
          case 'arrow':
            // Arrow between two points (free-form)
            newElement = {
              id: generateId(),
              type: 'arrow',
              x: drawingStart.x,
              y: drawingStart.y,
              width: dx,
              height: dy,
              text: '',
              color: selectedColor,
              borderColor: selectedColor,
              connections: [],
            };
            break;
          default:
            setIsDrawing(false);
            setDrawingStart(null);
            return;
        }

        setElements((prev) => [...prev, newElement]);
        setSelectedElementId(newElement.id);
      }
    }

    setIsDrawing(false);
    setDrawingStart(null);
    setDragState({
      isDragging: false,
      elementId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    });
  }

  function handleDoubleClick(e: React.MouseEvent) {
    const point = getCanvasPoint(e);
    for (let i = elements.length - 1; i >= 0; i--) {
      if (hitTest(elements[i], point.x, point.y)) {
        setEditingText(elements[i].id);
        setEditTextValue(elements[i].text);
        setSelectedElementId(elements[i].id);
        return;
      }
    }
  }

  function handleTextEditSubmit() {
    if (editingText) {
      setElements((prev) =>
        prev.map((el) => (el.id === editingText ? { ...el, text: editTextValue } : el))
      );
      setEditingText(null);
    }
  }

  function handleDeleteElement() {
    if (selectedElementId) {
      // Also remove arrows connected to this element
      setElements((prev) =>
        prev.filter(
          (el) =>
            el.id !== selectedElementId &&
            !(el.type === 'arrow' && (el.fromId === selectedElementId || el.toId === selectedElementId))
        )
      );
      setSelectedElementId(null);
    }
  }

  function handleExportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;

    // Fill background
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x < rect.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Draw elements
    for (const el of elements) {
      const isSelected = el.id === selectedElementId;
      const borderColor = isSelected ? SELECTED_BORDER : el.borderColor;

      ctx.strokeStyle = borderColor;
      ctx.fillStyle = `${el.color}10`;
      ctx.lineWidth = isSelected ? 2 : 1;

      switch (el.type) {
        case 'rectangle': {
          const rx = el.x - el.width / 2;
          const ry = el.y - el.height / 2;
          ctx.fillRect(rx, ry, el.width, el.height);
          ctx.strokeRect(rx, ry, el.width, el.height);
          ctx.fillStyle = el.color;
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text, el.x, el.y);
          break;
        }
        case 'circle': {
          const radius = Math.max(el.width, el.height) / 2;
          ctx.beginPath();
          ctx.arc(el.x, el.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = el.color;
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text, el.x, el.y);
          break;
        }
        case 'diamond': {
          const size = Math.max(el.width, el.height) / 2;
          ctx.beginPath();
          ctx.moveTo(el.x, el.y - size);
          ctx.lineTo(el.x + size, el.y);
          ctx.lineTo(el.x, el.y + size);
          ctx.lineTo(el.x - size, el.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = el.color;
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.save();
          ctx.fillText(el.text, el.x, el.y);
          ctx.restore();
          break;
        }
        case 'arrow': {
          // Draw arrow line
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + el.width, el.y + el.height);
          ctx.stroke();
          // Arrowhead
          const angle = Math.atan2(el.height, el.width);
          const arrowLength = 10;
          const endX = el.x + el.width;
          const endY = el.y + el.height;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = borderColor;
          ctx.fill();
          break;
        }
        case 'text': {
          ctx.fillStyle = el.color;
          ctx.font = '12px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(el.text, el.x, el.y);
          break;
        }
      }
    }

    // Download
    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'diagram.png';
    a.click();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedElementId && !editingText) {
        e.preventDefault();
        handleDeleteElement();
      }
    }
  }

  // ═══ Tools config ═══
  const tools: { id: DiagramElementType; label: string; symbol: string }[] = [
    { id: 'rectangle', label: 'Rectangle', symbol: '▭' },
    { id: 'diamond', label: 'Diamond', symbol: '◆' },
    { id: 'circle', label: 'Circle', symbol: '○' },
    { id: 'arrow', label: 'Arrow', symbol: '→' },
    { id: 'text', label: 'Text', symbol: 'T' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000000',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ═══ Toolbar ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          borderBottom: '1px solid #1E1E1E',
          background: '#111111',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* Tools */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setSelectedTool(tool.id);
              setArrowStart(null);
            }}
            title={tool.label}
            style={{
              padding: '4px 10px',
              background: selectedTool === tool.id ? 'rgba(255, 0, 0, 0.15)' : '#1E1E1E',
              border: selectedTool === tool.id ? '1px solid #FF0000' : '1px solid #333',
              color: selectedTool === tool.id ? '#FF0000' : '#D4C5A0',
              fontFamily: 'inherit',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 100ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              if (selectedTool !== tool.id) {
                e.currentTarget.style.borderColor = '#C8A84B';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTool !== tool.id) {
                e.currentTarget.style.borderColor = '#333';
              }
            }}
          >
            <span>{tool.symbol}</span>
            <span style={{ fontSize: '9px' }}>{tool.label}</span>
          </button>
        ))}

        <div style={{ width: '1px', height: '20px', background: '#333', margin: '0 4px' }} />

        {/* Colors */}
        {ELEMENT_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedColor(c.value)}
            title={c.label}
            style={{
              width: '20px',
              height: '20px',
              background: c.value,
              border: selectedColor === c.value ? '2px solid #fff' : '2px solid #333',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}

        <div style={{ width: '1px', height: '20px', background: '#333', margin: '0 4px' }} />

        <button
          onClick={handleDeleteElement}
          disabled={!selectedElementId}
          style={{
            padding: '4px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: selectedElementId ? '#f87171' : '#555',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: selectedElementId ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase',
          }}
        >
          Delete
        </button>

        <button
          onClick={() => {
            setElements([]);
            setSelectedElementId(null);
          }}
          style={{
            padding: '4px 10px',
            background: '#1E1E1E',
            border: '1px solid #333',
            color: '#D4C5A0',
            fontFamily: 'inherit',
            fontSize: '10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF0000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          Clear
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleExportPng}
          style={{
            padding: '4px 14px',
            background: 'linear-gradient(135deg, rgba(0, 191, 191, 0.15), rgba(0, 191, 191, 0.05))',
            border: '1px solid #00BFBF',
            color: '#00BFBF',
            fontFamily: 'inherit',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 191, 191, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Export PNG
        </button>
      </div>

      {/* Arrow connection hint */}
      {selectedTool === 'arrow' && arrowStart && (
        <div
          style={{
            padding: '4px 12px',
            background: 'rgba(255, 0, 0, 0.05)',
            borderBottom: '1px solid #1E1E1E',
            color: '#FF0000',
            fontSize: '10px',
            flexShrink: 0,
          }}
        >
          Click another element to connect, or click empty space to cancel.
        </div>
      )}

      {/* ═══ Canvas Area ═══ */}
      <div
        ref={canvasRef}
        style={{
          flex: 1,
          position: 'relative',
          background: CANVAS_BG,
          backgroundImage: `
            linear-gradient(${GRID_COLOR} 1px, transparent 1px),
            linear-gradient(90deg, ${GRID_COLOR} 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          cursor:
            selectedTool === 'arrow'
              ? 'crosshair'
              : isDrawing
                ? 'crosshair'
                : dragState.isDragging
                  ? 'grabbing'
                  : 'default',
          overflow: 'hidden',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {renderElements()}

        {/* Text Edit Input */}
        {editingText && selectedElement && (
          <div
            style={{
              position: 'absolute',
              left: selectedElement.type === 'text' ? selectedElement.x : selectedElement.x - selectedElement.width / 2,
              top: selectedElement.type === 'text' ? selectedElement.y : selectedElement.y - selectedElement.height / 2,
              zIndex: 100,
            }}
          >
            <input
              type="text"
              value={editTextValue}
              onChange={(e) => setEditTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextEditSubmit();
                if (e.key === 'Escape') setEditingText(null);
              }}
              onBlur={handleTextEditSubmit}
              autoFocus
              style={{
                background: '#000000',
                border: '1px solid #FF0000',
                color: selectedElement.color,
                fontFamily: 'var(--font-mono)',
                fontSize: selectedElement.type === 'text' ? '12px' : '11px',
                padding: '2px 4px',
                outline: 'none',
                boxShadow: '0 0 8px rgba(255, 0, 0, 0.3)',
                minWidth: '80px',
              }}
            />
          </div>
        )}
      </div>

      {/* ═══ Info Bar ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '4px 12px',
          background: '#111111',
          borderTop: '1px solid #1E1E1E',
          flexShrink: 0,
          fontSize: '10px',
          color: '#8B7D6B',
        }}
      >
        <span>Elements: {elements.length}</span>
        <span style={{ color: '#C8A84B' }}>Tool: {selectedTool}</span>
        {selectedElement && (
          <>
            <span style={{ color: '#00BFBF' }}>Selected: {selectedElement.type}</span>
            <span>
              ({Math.round(selectedElement.x)}, {Math.round(selectedElement.y)})
            </span>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span>Drag to create • Double-click to edit text • Delete key to remove</span>
      </div>
    </div>
  );
}
