// ═══ UNIT CONVERTER ═══
// Sacred Metric Engine — converts between units of the Imperium.
// Categories: Length, Weight, Temperature, Volume, Area, Speed, Data, Time, Energy, Pressure

import React, { useState, useCallback, useMemo } from 'react';
import { ArrowLeftRight, Copy, Check, FlaskConical } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface UnitCategory {
  name: string;
  icon: string;
  units: { name: string; symbol: string; toBase: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Categories & Units
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORIES: UnitCategory[] = [
  {
    name: 'Length',
    icon: '\u2194',
    units: [
      { name: 'Millimeter', symbol: 'mm', toBase: 0.001 },
      { name: 'Centimeter', symbol: 'cm', toBase: 0.01 },
      { name: 'Meter', symbol: 'm', toBase: 1 },
      { name: 'Kilometer', symbol: 'km', toBase: 1000 },
      { name: 'Inch', symbol: 'in', toBase: 0.0254 },
      { name: 'Foot', symbol: 'ft', toBase: 0.3048 },
      { name: 'Yard', symbol: 'yd', toBase: 0.9144 },
      { name: 'Mile', symbol: 'mi', toBase: 1609.344 },
    ],
  },
  {
    name: 'Weight',
    icon: '\u2696',
    units: [
      { name: 'Milligram', symbol: 'mg', toBase: 0.000001 },
      { name: 'Gram', symbol: 'g', toBase: 0.001 },
      { name: 'Kilogram', symbol: 'kg', toBase: 1 },
      { name: 'Ounce', symbol: 'oz', toBase: 0.0283495 },
      { name: 'Pound', symbol: 'lb', toBase: 0.453592 },
      { name: 'Ton', symbol: 't', toBase: 1000 },
    ],
  },
  {
    name: 'Temperature',
    icon: '\u2600',
    units: [
      { name: 'Celsius', symbol: '\u00B0C', toBase: 1 },
      { name: 'Fahrenheit', symbol: '\u00B0F', toBase: 1 },
      { name: 'Kelvin', symbol: 'K', toBase: 1 },
    ],
  },
  {
    name: 'Volume',
    icon: '\u{1F4A7}',
    units: [
      { name: 'Milliliter', symbol: 'ml', toBase: 0.001 },
      { name: 'Liter', symbol: 'l', toBase: 1 },
      { name: 'Gallon', symbol: 'gal', toBase: 3.78541 },
      { name: 'Pint', symbol: 'pt', toBase: 0.473176 },
      { name: 'Cup', symbol: 'cup', toBase: 0.236588 },
    ],
  },
  {
    name: 'Area',
    icon: '\u25A1',
    units: [
      { name: 'Square Meter', symbol: 'm\u00B2', toBase: 1 },
      { name: 'Square Kilometer', symbol: 'km\u00B2', toBase: 1000000 },
      { name: 'Square Foot', symbol: 'ft\u00B2', toBase: 0.092903 },
      { name: 'Acre', symbol: 'ac', toBase: 4046.86 },
      { name: 'Hectare', symbol: 'ha', toBase: 10000 },
    ],
  },
  {
    name: 'Speed',
    icon: '\u26A1',
    units: [
      { name: 'Meter/Second', symbol: 'm/s', toBase: 1 },
      { name: 'Kilometer/Hour', symbol: 'km/h', toBase: 0.277778 },
      { name: 'Miles/Hour', symbol: 'mph', toBase: 0.44704 },
      { name: 'Knot', symbol: 'kn', toBase: 0.514444 },
    ],
  },
  {
    name: 'Data',
    icon: '\u{1F4BE}',
    units: [
      { name: 'Byte', symbol: 'B', toBase: 1 },
      { name: 'Kilobyte', symbol: 'KB', toBase: 1024 },
      { name: 'Megabyte', symbol: 'MB', toBase: 1048576 },
      { name: 'Gigabyte', symbol: 'GB', toBase: 1073741824 },
      { name: 'Terabyte', symbol: 'TB', toBase: 1099511627776 },
      { name: 'Petabyte', symbol: 'PB', toBase: 1125899906842624 },
    ],
  },
  {
    name: 'Time',
    icon: '\u23F1',
    units: [
      { name: 'Millisecond', symbol: 'ms', toBase: 0.001 },
      { name: 'Second', symbol: 's', toBase: 1 },
      { name: 'Minute', symbol: 'min', toBase: 60 },
      { name: 'Hour', symbol: 'h', toBase: 3600 },
      { name: 'Day', symbol: 'd', toBase: 86400 },
      { name: 'Week', symbol: 'wk', toBase: 604800 },
      { name: 'Month', symbol: 'mo', toBase: 2628000 },
      { name: 'Year', symbol: 'yr', toBase: 31536000 },
    ],
  },
  {
    name: 'Energy',
    icon: '\u{1F50B}',
    units: [
      { name: 'Joule', symbol: 'J', toBase: 1 },
      { name: 'Calorie', symbol: 'cal', toBase: 4.184 },
      { name: 'Kilocalorie', symbol: 'kcal', toBase: 4184 },
      { name: 'Watt-hour', symbol: 'Wh', toBase: 3600 },
      { name: 'Kilowatt-hour', symbol: 'kWh', toBase: 3600000 },
      { name: 'BTU', symbol: 'BTU', toBase: 1055.06 },
    ],
  },
  {
    name: 'Pressure',
    icon: '\u{1F4A8}',
    units: [
      { name: 'Pascal', symbol: 'Pa', toBase: 1 },
      { name: 'Bar', symbol: 'bar', toBase: 100000 },
      { name: 'PSI', symbol: 'psi', toBase: 6894.76 },
      { name: 'Atmosphere', symbol: 'atm', toBase: 101325 },
      { name: 'mmHg', symbol: 'mmHg', toBase: 133.322 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Conversion Logic
// ═══════════════════════════════════════════════════════════════════════════════

function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number;
  // Convert to Celsius
  switch (from) {
    case '\u00B0F':
      celsius = (value - 32) * 5 / 9;
      break;
    case 'K':
      celsius = value - 273.15;
      break;
    default:
      celsius = value;
  }
  // Convert from Celsius
  switch (to) {
    case '\u00B0F':
      return celsius * 9 / 5 + 32;
    case 'K':
      return celsius + 273.15;
    default:
      return celsius;
  }
}

function convertValue(value: number, fromSymbol: string, toSymbol: string, category: UnitCategory): number {
  if (category.name === 'Temperature') {
    return convertTemperature(value, fromSymbol, toSymbol);
  }
  const fromUnit = category.units.find((u) => u.symbol === fromSymbol);
  const toUnit = category.units.find((u) => u.symbol === toSymbol);
  if (!fromUnit || !toUnit) return 0;
  const baseValue = value * fromUnit.toBase;
  return baseValue / toUnit.toBase;
}

function getFormula(fromSymbol: string, toSymbol: string, category: UnitCategory): string {
  if (fromSymbol === toSymbol) return 'value = value';
  if (category.name === 'Temperature') {
    if (fromSymbol === '\u00B0C' && toSymbol === '\u00B0F') return 'value \u00D7 9/5 + 32';
    if (fromSymbol === '\u00B0F' && toSymbol === '\u00B0C') return '(value - 32) \u00D7 5/9';
    if (fromSymbol === '\u00B0C' && toSymbol === 'K') return 'value + 273.15';
    if (fromSymbol === 'K' && toSymbol === '\u00B0C') return 'value - 273.15';
    return 'complex conversion';
  }
  const fromUnit = category.units.find((u) => u.symbol === fromSymbol);
  const toUnit = category.units.find((u) => u.symbol === toSymbol);
  if (!fromUnit || !toUnit) return '';
  const factor = fromUnit.toBase / toUnit.toBase;
  if (factor >= 1) return `value \u00D7 ${factor.toExponential(4)}`;
  return `value \u00D7 ${factor.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function formatResult(value: number): string {
  if (Math.abs(value) < 0.0001 && value !== 0) return value.toExponential(6);
  if (Math.abs(value) >= 1e12) return value.toExponential(6);
  return value.toLocaleString('en-US', { maximumFractionDigits: 8 }).replace(/,/g, ' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

const UnitConverter: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('1');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const category = CATEGORIES[activeCategory];

  // Initialize units when category changes
  React.useEffect(() => {
    if (category.units.length >= 2) {
      setFromUnit(category.units[0].symbol);
      setToUnit(category.units[1].symbol);
    }
  }, [activeCategory, category]);

  const numericValue = parseFloat(inputValue) || 0;
  const result = useMemo(() => {
    if (!fromUnit || !toUnit) return 0;
    return convertValue(numericValue, fromUnit, toUnit, category);
  }, [numericValue, fromUnit, toUnit, category]);

  const formula = useMemo(() => {
    if (!fromUnit || !toUnit) return '';
    return getFormula(fromUnit, toUnit, category);
  }, [fromUnit, toUnit, category]);

  const handleSwap = useCallback(() => {
    setFromUnit((prev) => {
      setToUnit(prev);
      return toUnit;
    });
  }, [toUnit]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formatResult(result)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [result]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      setInputValue(val);
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
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
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
          }}
        >
          <FlaskConical size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          ═══ Unit Converter ═══
        </div>
        <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', marginTop: '2px' }}>
          SACRED METRIC TRANSMUTATION ENGINE
        </div>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
          gap: '1px',
        }}
      >
        {CATEGORIES.map((cat, idx) => {
          const isActive = activeCategory === idx;
          return (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(idx)}
              style={{
                flex: '1 0 auto',
                padding: '6px 8px',
                background: isActive ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
                color: isActive ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                textShadow: isActive ? '0 0 8px rgba(255, 0, 0, 0.4)' : 'none',
                whiteSpace: 'nowrap',
                minWidth: '50px',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Converter Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* From */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '10px',
              color: 'var(--parchment-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            From — {category.name}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-base)',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              style={{
                padding: '10px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '80px',
              }}
            >
              {category.units.map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSwap}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
              e.currentTarget.style.color = 'var(--cogitator-gold)';
              e.currentTarget.style.boxShadow = 'var(--glow-gold)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Swap units"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>

        {/* To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '10px',
              color: 'var(--parchment-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            To — {category.name}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--void-black)',
                border: '1px solid var(--steel-gray)',
                color: 'var(--cogitator-gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'bold',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
              }}
            >
              {formatResult(result)}
            </div>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              style={{
                padding: '10px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '80px',
              }}
            >
              {category.units.map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formula */}
        <div
          style={{
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            padding: '10px',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Formula
          </div>
          <div style={{ color: 'var(--noosphere-cyan)', fontFamily: 'var(--font-mono)' }}>
            {formula}
          </div>
          <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', marginTop: '4px' }}>
            1 {fromUnit} ={' '}
            <span style={{ color: 'var(--cogitator-gold)' }}>
              {formatResult(convertValue(1, fromUnit, toUnit, category))} {toUnit}
            </span>
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            background: copied ? 'rgba(0, 191, 191, 0.1)' : 'transparent',
            border: `1px solid ${copied ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
            color: copied ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'COPIED' : 'COPY RESULT'}
        </button>

        {/* All Units Reference */}
        <div
          style={{
            borderTop: '1px solid var(--iron-gray)',
            paddingTop: '12px',
          }}
        >
          <div
            style={{
              color: 'var(--parchment-dim)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: '8px',
            }}
          >
            Available Units — {category.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {category.units.map((u) => (
              <div
                key={u.symbol}
                style={{
                  fontSize: '10px',
                  color: 'var(--parchment)',
                  padding: '4px 6px',
                  background: 'var(--iron-dark)',
                }}
              >
                <span style={{ color: 'var(--noosphere-cyan)' }}>{u.symbol}</span>{' '}
                <span style={{ color: 'var(--parchment-dim)' }}>{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitConverter;
