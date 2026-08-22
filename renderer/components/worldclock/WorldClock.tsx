// ═══════════════════════════════════════════════════════════════════════════════
// WORLD CLOCK — Chronometric Auspex
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Sun, Moon, Plus, X, Search, Globe } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface CityClock {
  id: string;
  name: string;
  timezone: string;
  country: string;
}

interface TimeData {
  time: string;
  date: string;
  isDay: boolean;
  offset: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_world_clock_cities';

const DEFAULT_CITIES: CityClock[] = [
  { id: 'moscow', name: 'Moscow', timezone: 'Europe/Moscow', country: 'RU' },
  { id: 'london', name: 'London', timezone: 'Europe/London', country: 'GB' },
  { id: 'newyork', name: 'New York', timezone: 'America/New_York', country: 'US' },
  { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', country: 'JP' },
  { id: 'sydney', name: 'Sydney', timezone: 'Australia/Sydney', country: 'AU' },
  { id: 'berlin', name: 'Berlin', timezone: 'Europe/Berlin', country: 'DE' },
  { id: 'paris', name: 'Paris', timezone: 'Europe/Paris', country: 'FR' },
  { id: 'beijing', name: 'Beijing', timezone: 'Asia/Shanghai', country: 'CN' },
  { id: 'dubai', name: 'Dubai', timezone: 'Asia/Dubai', country: 'AE' },
  { id: 'losangeles', name: 'Los Angeles', timezone: 'America/Los_Angeles', country: 'US' },
];

const ADDITIONAL_CITIES: CityClock[] = [
  { id: 'singapore', name: 'Singapore', timezone: 'Asia/Singapore', country: 'SG' },
  { id: 'mumbai', name: 'Mumbai', timezone: 'Asia/Kolkata', country: 'IN' },
  { id: 'seoul', name: 'Seoul', timezone: 'Asia/Seoul', country: 'KR' },
  { id: 'bangkok', name: 'Bangkok', timezone: 'Asia/Bangkok', country: 'TH' },
  { id: 'istanbul', name: 'Istanbul', timezone: 'Europe/Istanbul', country: 'TR' },
  { id: 'cairo', name: 'Cairo', timezone: 'Africa/Cairo', country: 'EG' },
  { id: 'lagos', name: 'Lagos', timezone: 'Africa/Lagos', country: 'NG' },
  { id: 'johannesburg', name: 'Johannesburg', timezone: 'Africa/Johannesburg', country: 'ZA' },
  { id: 'riodejaneiro', name: 'Rio de Janeiro', timezone: 'America/Sao_Paulo', country: 'BR' },
  { id: 'buenosaires', name: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', country: 'AR' },
  { id: 'mexicocity', name: 'Mexico City', timezone: 'America/Mexico_City', country: 'MX' },
  { id: 'chicago', name: 'Chicago', timezone: 'America/Chicago', country: 'US' },
  { id: 'toronto', name: 'Toronto', timezone: 'America/Toronto', country: 'CA' },
  { id: 'vancouver', name: 'Vancouver', timezone: 'America/Vancouver', country: 'CA' },
  { id: 'auckland', name: 'Auckland', timezone: 'Pacific/Auckland', country: 'NZ' },
  { id: 'hongkong', name: 'Hong Kong', timezone: 'Asia/Hong_Kong', country: 'HK' },
  { id: 'jakarta', name: 'Jakarta', timezone: 'Asia/Jakarta', country: 'ID' },
  { id: 'manila', name: 'Manila', timezone: 'Asia/Manila', country: 'PH' },
  { id: 'telaviv', name: 'Tel Aviv', timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'nairobi', name: 'Nairobi', timezone: 'Africa/Nairobi', country: 'KE' },
  { id: 'reykjavik', name: 'Reykjavik', timezone: 'Atlantic/Reykjavik', country: 'IS' },
  { id: 'helsinki', name: 'Helsinki', timezone: 'Europe/Helsinki', country: 'FI' },
  { id: 'athens', name: 'Athens', timezone: 'Europe/Athens', country: 'GR' },
  { id: 'warsaw', name: 'Warsaw', timezone: 'Europe/Warsaw', country: 'PL' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCityTime(timezone: string): TimeData {
  const now = new Date();

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });

  const time = timeFormatter.format(now);
  const date = dateFormatter.format(now);
  const offsetStr = offsetFormatter.format(now);
  const offset = offsetStr.includes('GMT')
    ? offsetStr.split('GMT')[1] || '±0'
    : '±0';

  // Determine day/night by hour
  const hour = parseInt(time.split(':')[0], 10);
  const isDay = hour >= 6 && hour < 18;

  return { time, date, isDay, offset };
}

function loadSavedCities(): CityClock[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_CITIES;
}

function saveCities(cities: CityClock[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
  } catch { /* ignore */ }
}

// ── Analog Clock SVG ─────────────────────────────────────────────────────────

function AnalogClock({ timezone, size = 80 }: { timezone: string; size?: number }) {
  const [rotation, setRotation] = useState({ hour: 0, minute: 0, second: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

      const [h, m, s] = timeStr.split(':').map(Number);
      setRotation({
        hour: (h % 12) * 30 + m * 0.5,
        minute: m * 6 + s * 0.1,
        second: s * 6,
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const center = size / 2;
  const r = size / 2 - 4;

  // Hour markers
  const markers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const x1 = center + (r - 6) * Math.sin(angle);
    const y1 = center - (r - 6) * Math.cos(angle);
    const x2 = center + r * Math.sin(angle);
    const y2 = center - r * Math.cos(angle);
    const isMajor = i % 3 === 0;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isMajor ? 'var(--cogitator-gold)' : 'var(--iron-gray)'}
        strokeWidth={isMajor ? 1.5 : 0.5}
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Clock face */}
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="rgba(10, 10, 10, 0.8)"
        stroke="var(--iron-gray)"
        strokeWidth={1}
      />
      {/* Center dot */}
      <circle cx={center} cy={center} r={2} fill="var(--cogitator-gold)" />
      {/* Markers */}
      {markers}
      {/* Hour hand */}
      <line
        x1={center}
        y1={center}
        x2={center + (r - 20) * Math.sin((rotation.hour * Math.PI) / 180)}
        y2={center - (r - 20) * Math.cos((rotation.hour * Math.PI) / 180)}
        stroke="var(--sacred-white)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1={center}
        y1={center}
        x2={center + (r - 12) * Math.sin((rotation.minute * Math.PI) / 180)}
        y2={center - (r - 12) * Math.cos((rotation.minute * Math.PI) / 180)}
        stroke="var(--parchment)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1={center}
        y1={center}
        x2={center + (r - 8) * Math.sin((rotation.second * Math.PI) / 180)}
        y2={center - (r - 8) * Math.cos((rotation.second * Math.PI) / 180)}
        stroke="var(--omnissiah-red)"
        strokeWidth={0.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── City Clock Card ──────────────────────────────────────────────────────────

function CityClockCard({
  city,
  onRemove,
}: {
  city: CityClock;
  onRemove: (id: string) => void;
}) {
  const [timeData, setTimeData] = useState<TimeData>(() =>
    getCityTime(city.timezone)
  );

  useEffect(() => {
    const update = () => setTimeData(getCityTime(city.timezone));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [city.timezone]);

  return (
    <div
      style={{
        padding: '12px',
        background: 'var(--iron-dark)',
        border: '1px solid var(--iron-gray)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
        transition: 'border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--cogitator-gold-dim)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--iron-gray)';
      }}
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(city.id)}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          padding: '2px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          background: 'transparent',
          opacity: 0,
          transition: 'opacity 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.color = 'var(--omnissiah-red)';
        }}
      >
        <X size={12} />
      </button>

      {/* City name */}
      <div
        style={{
          color: 'var(--cogitator-gold)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          textAlign: 'center',
        }}
      >
        {city.name}
      </div>

      {/* Country */}
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: '9px',
        }}
      >
        {city.country}
      </div>

      {/* Analog + Digital */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AnalogClock timezone={city.timezone} size={70} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* Day/Night indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {timeData.isDay ? (
              <Sun size={14} style={{ color: 'var(--cogitator-gold)' }} />
            ) : (
              <Moon size={14} style={{ color: 'var(--noosphere-cyan)' }} />
            )}
          </div>
          {/* Digital time */}
          <div
            style={{
              color: 'var(--sacred-white)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.05em',
            }}
          >
            {timeData.time}
          </div>
          {/* Date */}
          <div
            style={{
              color: 'var(--parchment-dim)',
              fontSize: '9px',
            }}
          >
            {timeData.date}
          </div>
          {/* UTC offset */}
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: '8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            UTC{timeData.offset}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function WorldClock() {
  const [cities, setCities] = useState<CityClock[]>(loadSavedCities);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Persist ────────────────────────────────────────────────────────────────

  useEffect(() => {
    saveCities(cities);
  }, [cities]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const addCity = useCallback((city: CityClock) => {
    setCities((prev) => {
      if (prev.some((c) => c.id === city.id)) return prev;
      return [...prev, city];
    });
    setShowAddForm(false);
    setSearchQuery('');
  }, []);

  const removeCity = useCallback((id: string) => {
    setCities((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Available cities to add ────────────────────────────────────────────────

  const availableCities = useMemo(() => {
    const existingIds = new Set(cities.map((c) => c.id));
    return ADDITIONAL_CITIES.filter((c) => !existingIds.has(c.id)).filter(
      (c) =>
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.country.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cities, searchQuery]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        gap: '10px',
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ═══ Header ═══ */}
      <div className="mech-header">
        <Clock size={14} style={{ color: 'var(--noosphere-cyan)' }} />
        <span>Chronometric Auspex</span>
      </div>

      {/* ═══ Toolbar ═══ */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowAddForm((p) => !p)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--cogitator-gold)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          <Plus size={12} />
          Add City
        </button>
      </div>

      {/* ═══ Add City Form ═══ */}
      {showAddForm && (
        <div
          style={{
            padding: '10px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--noosphere-cyan-dim)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city..."
              autoFocus
              style={{
                flex: 1,
                padding: '6px 8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                outline: 'none',
              }}
            />
            <button
              onClick={() => { setShowAddForm(false); setSearchQuery(''); }}
              style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={14} />
            </button>
          </div>

          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {availableCities.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                No cities found.
              </div>
            ) : (
              availableCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => addCity(city)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: 'var(--void-black)',
                    border: '1px solid transparent',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--noosphere-cyan-dim)';
                    e.currentTarget.style.background = 'rgba(0, 191, 191, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'var(--void-black)';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={10} style={{ color: 'var(--text-muted)' }} />
                    {city.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                    {city.country} · UTC{getCityTime(city.timezone).offset}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══ Clock Grid ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '8px',
        }}
      >
        {cities.map((city) => (
          <CityClockCard
            key={city.id}
            city={city}
            onRemove={removeCity}
          />
        ))}
      </div>

      {/* ═══ Local Time Reference ═══ */}
      <LocalTimeReference />
    </div>
  );
}

// ── Local Time Reference Bar ─────────────────────────────────────────────────

function LocalTimeReference() {
  const [localTime, setLocalTime] = useState('');
  const [localDate, setLocalDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLocalTime(
        now.toLocaleTimeString('en-US', { hour12: false })
      );
      setLocalDate(
        now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        marginTop: 'auto',
        padding: '10px',
        background: 'var(--void-black)',
        border: '1px solid var(--iron-gray)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--parchment-dim)',
      }}
    >
      <Clock size={12} style={{ color: 'var(--cogitator-gold)' }} />
      <span style={{ color: 'var(--text-muted)' }}>Local:</span>
      <span style={{ color: 'var(--sacred-white)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
        {localTime}
      </span>
      <span style={{ color: 'var(--steel-gray)' }}>|</span>
      <span>{localDate}</span>
    </div>
  );
}
