// ═══ SPECTRAL ANALYZER ═══
// Color Picker — Extract, analyze, and catalog chromatic signatures
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { Pipette, Copy, Check } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Color Conversion Utilities
// ═══════════════════════════════════════════════════════════

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// ═══════════════════════════════════════════════════════════
// Palettes
// ═══════════════════════════════════════════════════════════

const MECHANICUS_PALETTE = [
  { name: 'void-black', hex: '#000000' },
  { name: 'iron-dark', hex: '#1E1E1E' },
  { name: 'omnissiah-red', hex: '#FF0000' },
  { name: 'cogitator-gold', hex: '#C8A84B' },
  { name: 'noosphere-cyan', hex: '#00BFBF' },
  { name: 'parchment', hex: '#D4C5A0' },
  { name: 'steel-gray', hex: '#3A3A3A' },
  { name: 'sacred-white', hex: '#E8E8E8' },
  { name: 'omnissiah-dim', hex: '#8B0000' },
  { name: 'cyan-dim', hex: '#007777' },
  { name: 'gold-dim', hex: '#8B7355' },
  { name: 'parchment-dim', hex: '#8B7D6B' },
];

const WEB_SAFE_COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF',
  '#800000', '#008000', '#000080', '#808000', '#008080', '#800080',
  '#FF8000', '#80FF00', '#00FF80', '#0080FF', '#8000FF', '#FF0080',
  '#FF6666', '#66FF66', '#6666FF', '#FFFF66', '#66FFFF', '#FF66FF',
  '#CC0000', '#00CC00', '#0000CC', '#CCCC00', '#00CCCC', '#CC00CC',
  '#990000', '#009900', '#000099', '#999900', '#009999', '#990099',
  '#660000', '#006600', '#000066', '#666600', '#006666', '#660066',
  '#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#44FFFF', '#FF44FF',
  '#FF8888', '#88FF88', '#8888FF', '#FFFF88', '#88FFFF', '#FF88FF',
  '#FFAAAA', '#AAFFAA', '#AAAAFF', '#FFFFAA', '#AAFFFF', '#FFAAFF',
  '#A52A2A', '#D2691E', '#FF6347', '#FF4500', '#DA70D6', '#BA55D3',
];

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'cogitator_color_history';
const MAX_HISTORY = 20;

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function ColorPicker() {
  const [hex, setHex] = useState('#FF0000');
  const [rgb, setRgb] = useState({ r: 255, g: 0, b: 0 });
  const [hsl, setHsl] = useState({ h: 0, s: 100, l: 50 });
  const [history, setHistory] = useState<string[]>([]);
  const [customPalette, setCustomPalette] = useState<string[]>([]);
  const [activePalette, setActivePalette] = useState<'mechanicus' | 'safe' | 'custom'>('mechanicus');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load history from localStorage ──────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
      const savedCustom = localStorage.getItem('cogitator_custom_palette');
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) setCustomPalette(parsed);
      }
    } catch {
      // Silently fail on corrupted storage
    }
  }, []);

  // ── Persist history ─────────────────────────────────────
  const saveHistory = useCallback((newHistory: string[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  // ── Sync RGB/HSL when hex changes ───────────────────────
  const updateFromHex = useCallback((newHex: string) => {
    if (!/^#?[0-9A-Fa-f]{6}$/.test(newHex)) return;
    const normalized = newHex.startsWith('#') ? newHex.toUpperCase() : `#${newHex.toUpperCase()}`;
    const newRgb = hexToRgb(normalized);
    const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    setHex(normalized);
    setRgb(newRgb);
    setHsl(newHsl);
  }, []);

  // ── Update from RGB ─────────────────────────────────────
  const updateFromRgb = useCallback((channel: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [channel]: value };
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    const newHsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    setRgb(newRgb);
    setHex(newHex);
    setHsl(newHsl);
  }, [rgb]);

  // ── Update from HSL ─────────────────────────────────────
  const updateFromHsl = useCallback((channel: 'h' | 's' | 'l', value: number) => {
    const newHsl = { ...hsl, [channel]: value };
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHsl(newHsl);
    setRgb(newRgb);
    setHex(newHex);
  }, [hsl]);

  // ── Add to history ──────────────────────────────────────
  const addToHistory = useCallback(
    (colorHex: string) => {
      const newHistory = [colorHex, ...history.filter((h) => h !== colorHex)].slice(0, MAX_HISTORY);
      saveHistory(newHistory);
    },
    [history, saveHistory]
  );

  // ── Copy to clipboard ───────────────────────────────────
  const copyToClipboard = useCallback(
    (text: string, format: string) => {
      navigator.clipboard.writeText(text).catch(() => {
        // Fallback for restricted contexts
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
      setCopiedFormat(format);
      addToHistory(hex);
      setTimeout(() => setCopiedFormat(null), 1500);
    },
    [hex, addToHistory]
  );

  // ── Contrast calculations ───────────────────────────────
  const contrastWhite = getContrastRatio(hex, '#FFFFFF');
  const contrastBlack = getContrastRatio(hex, '#000000');
  const bestTextColor = contrastWhite >= contrastBlack ? '#FFFFFF' : '#000000';
  const bestContrast = Math.max(contrastWhite, contrastBlack);
  const wcagPass = bestContrast >= 4.5;
  const wcagAAPass = bestContrast >= 3;

  // ── Color preview style ─────────────────────────────────
  const previewStyle: React.CSSProperties = {
    backgroundColor: hex,
    width: '100%',
    height: '80px',
    border: '1px solid var(--iron-gray)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    color: bestTextColor,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  };

  // ── Slider styles ───────────────────────────────────────
  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  };

  const sliderLabelStyle: React.CSSProperties = {
    color: 'var(--parchment-dim)',
    fontSize: '10px',
    width: '12px',
    textAlign: 'center',
    letterSpacing: '0.05em',
  };

  const sliderValueStyle: React.CSSProperties = {
    color: 'var(--cogitator-gold)',
    fontSize: '10px',
    width: '28px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  };

  // ── Render Slider ───────────────────────────────────────
  const renderSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (val: number) => void,
    trackColor: string
  ) => (
    <div style={sliderContainerStyle}>
      <span style={sliderLabelStyle}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          flex: 1,
          accentColor: trackColor,
          height: '14px',
          cursor: 'pointer',
        }}
      />
      <span style={sliderValueStyle}>{value}</span>
    </div>
  );

  // ── Eyedropper from page ────────────────────────────────
  const handlePickFromPage = useCallback(async () => {
    // @ts-ignore — EyeDropper is a newer browser API
    if ('EyeDropper' in window) {
      try {
        setIsPicking(true);
        // @ts-ignore
        const eyeDropper = new EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          updateFromHex(result.sRGBHex);
          addToHistory(result.sRGBHex.toUpperCase());
        }
      } catch {
        // User cancelled or API failed
      } finally {
        setIsPicking(false);
      }
    } else {
      // Fallback: use color input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  }, [updateFromHex, addToHistory]);

  // ── Palette switcher ────────────────────────────────────
  const paletteTabs: { id: 'mechanicus' | 'safe' | 'custom'; label: string }[] = [
    { id: 'mechanicus', label: 'MECHANICUS' },
    { id: 'safe', label: 'SAFE' },
    { id: 'custom', label: 'CUSTOM' },
  ];

  const getPaletteColors = (): string[] => {
    switch (activePalette) {
      case 'mechanicus':
        return MECHANICUS_PALETTE.map((c) => c.hex);
      case 'safe':
        return WEB_SAFE_COLORS;
      case 'custom':
        return customPalette.length > 0 ? customPalette : MECHANICUS_PALETTE.map((c) => c.hex);
    }
  };

  // ── Add current color to custom palette ─────────────────
  const addToCustomPalette = useCallback(() => {
    if (!customPalette.includes(hex)) {
      const newPalette = [hex, ...customPalette].slice(0, 48);
      setCustomPalette(newPalette);
      try {
        localStorage.setItem('cogitator_custom_palette', JSON.stringify(newPalette));
      } catch {
        // Storage full
      }
    }
  }, [hex, customPalette]);

  // ── Render ──────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ═══ Header ═══ */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: 'var(--cogitator-gold)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
          }}
        >
          ◉ SPECTRAL ANALYZER
        </div>
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            marginTop: '2px',
          }}
        >
          CHROMATIC EXTRACTION UNIT v1.0
        </div>
      </div>

      {/* ═══ Scrollable Content ═══ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
        }}
        className="scrollbar-mechanicus"
      >
        {/* ═══ Preview Box ═══ */}
        <div
          style={previewStyle}
          title="Click to add to custom palette"
          onClick={addToCustomPalette}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = 'var(--glow-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {hex}
        </div>

        {/* ═══ HEX Input ═══ */}
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <label
            style={{
              color: 'var(--parchment-dim)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              display: 'block',
              marginBottom: '3px',
            }}
          >
            HEX CODE
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={hex}
              onChange={(e) => {
                let val = e.target.value.toUpperCase();
                if (!val.startsWith('#')) val = `#${val}`;
                setHex(val);
                if (/^#[0-9A-F]{6}$/.test(val)) {
                  updateFromHex(val);
                }
              }}
              onBlur={() => {
                if (!/^#[0-9A-F]{6}$/.test(hex)) {
                  updateFromHex('#FF0000');
                } else {
                  addToHistory(hex);
                }
              }}
              style={{
                flex: 1,
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--omnissiah-red)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                padding: '4px 8px',
                letterSpacing: '0.08em',
                outline: 'none',
              }}
              maxLength={7}
            />
            <input
              ref={fileInputRef}
              type="color"
              value={hex}
              onChange={(e) => {
                updateFromHex(e.target.value);
                addToHistory(e.target.value.toUpperCase());
              }}
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                border: '1px solid var(--iron-gray)',
                background: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* ═══ Pick from Page Button ═══ */}
        <button
          onClick={handlePickFromPage}
          disabled={isPicking}
          style={{
            width: '100%',
            padding: '6px',
            background: isPicking ? 'var(--iron-dark)' : 'var(--omnissiah-red-dim)',
            border: '1px solid var(--omnissiah-red)',
            color: isPicking ? 'var(--parchment-dim)' : 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            cursor: isPicking ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginBottom: '10px',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isPicking) {
              e.currentTarget.style.background = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isPicking ? 'var(--iron-dark)' : 'var(--omnissiah-red-dim)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Pipette size={12} />
          {isPicking ? 'ACQUIRING SAMPLE...' : 'PICK FROM PAGE'}
        </button>

        {/* ═══ RGB Sliders ═══ */}
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            padding: '6px',
            marginBottom: '8px',
            background: 'var(--iron-dark)',
          }}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              marginBottom: '4px',
              borderBottom: '1px solid var(--iron-gray)',
              paddingBottom: '2px',
            }}
          >
            RGB CHANNELS
          </div>
          {renderSlider('R', rgb.r, 0, 255, (v) => updateFromRgb('r', v), '#FF0000')}
          {renderSlider('G', rgb.g, 0, 255, (v) => updateFromRgb('g', v), '#00FF00')}
          {renderSlider('B', rgb.b, 0, 255, (v) => updateFromRgb('b', v), '#0000FF')}
        </div>

        {/* ═══ HSL Sliders ═══ */}
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            padding: '6px',
            marginBottom: '8px',
            background: 'var(--iron-dark)',
          }}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              marginBottom: '4px',
              borderBottom: '1px solid var(--iron-gray)',
              paddingBottom: '2px',
            }}
          >
            HSL SPECTRUM
          </div>
          {renderSlider('H', hsl.h, 0, 360, (v) => updateFromHsl('h', v), '#C8A84B')}
          {renderSlider('S', hsl.s, 0, 100, (v) => updateFromHsl('s', v), '#00BFBF')}
          {renderSlider('L', hsl.l, 0, 100, (v) => updateFromHsl('l', v), '#D4C5A0')}
        </div>

        {/* ═══ Contrast Check ═══ */}
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            padding: '6px',
            marginBottom: '8px',
            background: 'var(--iron-dark)',
          }}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              marginBottom: '4px',
              borderBottom: '1px solid var(--iron-gray)',
              paddingBottom: '2px',
            }}
          >
            CONTRAST ANALYSIS
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
            <div
              style={{
                flex: 1,
                padding: '4px',
                backgroundColor: hex,
                color: '#FFFFFF',
                fontSize: '10px',
                textAlign: 'center',
                border: '1px solid var(--iron-gray)',
              }}
            >
              WHITE {contrastWhite.toFixed(2)}:1
            </div>
            <div
              style={{
                flex: 1,
                padding: '4px',
                backgroundColor: hex,
                color: '#000000',
                fontSize: '10px',
                textAlign: 'center',
                border: '1px solid var(--iron-gray)',
              }}
            >
              BLACK {contrastBlack.toFixed(2)}:1
            </div>
          </div>
          <div
            style={{
              color: wcagPass ? '#00FF00' : wcagAAPass ? '#C8A84B' : '#FF0000',
              fontSize: '10px',
              textAlign: 'center',
              letterSpacing: '0.08em',
            }}
          >
            {wcagPass ? '● WCAG AA PASS (4.5:1)' : wcagAAPass ? '● WCAG AA LARGE TEXT ONLY (3:1)' : '● FAILS WCAG'}
            {' — '}Best: {bestContrast.toFixed(2)}:1
          </div>
        </div>

        {/* ═══ Copy Formats ═══ */}
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            padding: '6px',
            marginBottom: '8px',
            background: 'var(--iron-dark)',
          }}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              marginBottom: '4px',
              borderBottom: '1px solid var(--iron-gray)',
              paddingBottom: '2px',
            }}
          >
            EXPORT FORMATS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {[
              {
                label: 'HEX',
                value: hex,
                format: 'hex',
              },
              {
                label: 'RGB',
                value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
                format: 'rgb',
              },
              {
                label: 'HSL',
                value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
                format: 'hsl',
              },
              {
                label: 'CSS',
                value: `--extracted-color: ${hex.toLowerCase()};`,
                format: 'css',
              },
            ].map((item) => (
              <button
                key={item.format}
                onClick={() => copyToClipboard(item.value, item.format)}
                style={{
                  padding: '4px 6px',
                  background: copiedFormat === item.format ? 'rgba(0, 255, 0, 0.1)' : 'var(--void-black)',
                  border: `1px solid ${copiedFormat === item.format ? '#00FF00' : 'var(--iron-gray)'}`,
                  color: copiedFormat === item.format ? '#00FF00' : 'var(--parchment)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (copiedFormat !== item.format) {
                    e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (copiedFormat !== item.format) {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                  }
                }}
              >
                {copiedFormat === item.format ? <Check size={10} /> : <Copy size={10} />}
                {copiedFormat === item.format ? 'COPIED' : item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ History ═══ */}
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            padding: '6px',
            marginBottom: '8px',
            background: 'var(--iron-dark)',
          }}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              marginBottom: '4px',
              borderBottom: '1px solid var(--iron-gray)',
              paddingBottom: '2px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>HISTORY ({history.length}/{MAX_HISTORY})</span>
            {history.length > 0 && (
              <button
                onClick={() => saveHistory([])}
                style={{
                  color: 'var(--parchment-dim)',
                  fontSize: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--omnissiah-red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--parchment-dim)';
                }}
              >
                CLEAR
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div
              style={{
                color: 'var(--parchment-dim)',
                fontSize: '9px',
                textAlign: 'center',
                padding: '8px',
                fontStyle: 'italic',
              }}
            >
              No samples recorded...
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {history.map((color, idx) => (
                <button
                  key={`${color}-${idx}`}
                  onClick={() => updateFromHex(color)}
                  title={color}
                  style={{
                    width: '22px',
                    height: '22px',
                    backgroundColor: color,
                    border:
                      hex === color
                        ? '2px solid var(--cogitator-gold)'
                        : '1px solid var(--iron-gray)',
                    cursor: 'pointer',
                    transition: 'all 100ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.boxShadow = 'var(--glow-red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══ Palettes ═══ */}
        <div
          style={{
            border: '1px solid var(--iron-gray)',
            padding: '6px',
            background: 'var(--iron-dark)',
          }}
        >
          <div
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              marginBottom: '4px',
              borderBottom: '1px solid var(--iron-gray)',
              paddingBottom: '2px',
            }}
          >
            CHROMATIC ARCHIVES
          </div>

          {/* Palette tabs */}
          <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
            {paletteTabs.map((pt) => (
              <button
                key={pt.id}
                onClick={() => setActivePalette(pt.id)}
                style={{
                  flex: 1,
                  padding: '3px 4px',
                  background: activePalette === pt.id ? 'var(--omnissiah-red-dim)' : 'var(--void-black)',
                  border: `1px solid ${activePalette === pt.id ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
                  color: activePalette === pt.id ? 'var(--sacred-white)' : 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (activePalette !== pt.id) {
                    e.currentTarget.style.borderColor = 'var(--steel-light)';
                    e.currentTarget.style.color = 'var(--parchment)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePalette !== pt.id) {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                  }
                }}
              >
                {pt.label}
              </button>
            ))}
          </div>

          {/* Palette grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {getPaletteColors().map((color, idx) => (
              <button
                key={`${color}-${idx}`}
                onClick={() => {
                  updateFromHex(color);
                  addToHistory(color);
                }}
                title={activePalette === 'mechanicus' ? MECHANICUS_PALETTE[idx]?.name || color : color}
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: color,
                  border:
                    hex === color
                      ? '2px solid var(--cogitator-gold)'
                      : '1px solid var(--iron-gray)',
                  cursor: 'pointer',
                  transition: 'all 100ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.zIndex = '10';
                  e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.zIndex = '1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>

          {/* Add to custom palette button */}
          {activePalette === 'custom' && (
            <button
              onClick={addToCustomPalette}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '3px',
                background: 'var(--void-black)',
                border: '1px dashed var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--noosphere-cyan)';
                e.currentTarget.style.color = 'var(--noosphere-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              + ADD CURRENT COLOR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
