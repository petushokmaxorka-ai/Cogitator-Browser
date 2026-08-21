// ═══ WEATHER WIDGET ═══
// Atmospheric surveillance — real-time meteorological data
// Powered by Open-Meteo API (no API key required)

import { useState, useEffect, useCallback } from 'react';
import { Cloud, MapPin, Search, Loader } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface CurrentWeather {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
  is_day: number;
}

interface DailyForecast {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weathercode: number[];
  precipitation_sum: number[];
}

interface WeatherData {
  current_weather: CurrentWeather;
  daily: DailyForecast;
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
  };
}

// ── WMO Weather codes ─────────────────────────────────────

function getWeatherIcon(code: number, isDay: number = 1): string {
  if (code === 0) return isDay ? '☀' : '🌙';
  if (code >= 1 && code <= 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫';
  if (code >= 51 && code <= 55) return '🌧';
  if (code >= 56 && code <= 57) return '🌨';
  if (code >= 61 && code <= 67) return '🌧';
  if (code >= 71 && code <= 77) return '❄';
  if (code >= 80 && code <= 82) return '🌧';
  if (code >= 85 && code <= 86) return '❄';
  if (code >= 95 && code <= 99) return '⚡';
  return '☁';
}

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Cloudy';
}

// ── Helpers ───────────────────────────────────────────────

const formatDay = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatHour = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// ── Component ─────────────────────────────────────────────

export default function WeatherWidget() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeoResult | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Load cached location on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cogitator-weather-location');
      if (cached) {
        const loc = JSON.parse(cached) as GeoResult;
        setSelectedLocation(loc);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch weather when location changes
  useEffect(() => {
    if (!selectedLocation) return;
    let cancelled = false;

    async function fetchWeather() {
      setLoading(true);
      setError('');
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedLocation!.latitude}&longitude=${selectedLocation!.longitude}&current_weather=true&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=4`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather API error');
        const data = (await res.json()) as WeatherData;
        if (!cancelled) setWeather(data);
      } catch {
        if (!cancelled) setError('Failed to fetch weather data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => { cancelled = true; };
  }, [selectedLocation]);

  const searchCity = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setGeoResults([]);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`);
      const data = await res.json();
      if (data.results) {
        setGeoResults(data.results as GeoResult[]);
      } else {
        setError('No cities found');
      }
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const selectCity = useCallback((loc: GeoResult) => {
    setSelectedLocation(loc);
    setGeoResults([]);
    setShowSearch(false);
    localStorage.setItem('cogitator-weather-location', JSON.stringify(loc));
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cloud size={14} style={{ color: 'var(--noosphere-cyan)' }} />
          <span style={{ color: 'var(--cogitator-gold)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Atmosphere
          </span>
        </div>
        <button
          onClick={() => setShowSearch((s) => !s)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <Search size={14} />
        </button>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--iron-gray)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCity()}
              placeholder="Enter city..."
              style={{
                flex: 1,
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--sacred-white)',
                fontFamily: 'inherit',
                fontSize: '12px',
                padding: '6px 8px',
                outline: 'none',
              }}
            />
            <button
              onClick={searchCity}
              disabled={loading}
              style={{
                background: 'var(--iron-gray)',
                border: '1px solid var(--steel-gray)',
                color: 'var(--cogitator-gold)',
                fontFamily: 'inherit',
                fontSize: '10px',
                textTransform: 'uppercase',
                cursor: loading ? 'wait' : 'pointer',
                padding: '6px 10px',
              }}
            >
              {loading ? <Loader size={12} className="animate-spin" /> : 'Search'}
            </button>
          </div>
          {geoResults.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {geoResults.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => selectCity(loc)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--sacred-white)',
                    fontFamily: 'inherit',
                    fontSize: '11px',
                    textAlign: 'left',
                    padding: '6px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <MapPin size={10} style={{ display: 'inline', marginRight: '6px', color: 'var(--omnissiah-red)' }} />
                  {loc.name}, {loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}
                </button>
              ))}
            </div>
          )}
          {error && (
            <div style={{ color: 'var(--omnissiah-red)', fontSize: '10px', marginTop: '6px' }}>{error}</div>
          )}
        </div>
      )}

      {/* Weather content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {selectedLocation && weather && (
          <>
            {/* Current */}
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                border: '1px solid var(--iron-gray)',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                <MapPin size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {selectedLocation.name}, {selectedLocation.country}
              </div>
              <div style={{ fontSize: '48px', lineHeight: 1, margin: '8px 0' }}>
                {getWeatherIcon(weather.current_weather.weathercode, weather.current_weather.is_day)}
              </div>
              <div style={{ fontSize: '28px', color: 'var(--sacred-white)', fontWeight: 'bold' }}>
                {Math.round(weather.current_weather.temperature)}°C
              </div>
              <div style={{ fontSize: '11px', color: 'var(--cogitator-gold)', marginTop: '4px' }}>
                {getWeatherLabel(weather.current_weather.weathercode)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  🌬 {Math.round(weather.current_weather.windspeed)} km/h
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  💧 {Math.round(weather.daily.precipitation_sum[0] || 0)} mm
                </span>
              </div>
            </div>

            {/* Hourly strip */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
                Hourly
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {weather.hourly.time.slice(0, 12).map((t, i) => (
                  <div
                    key={t}
                    style={{
                      flexShrink: 0,
                      textAlign: 'center',
                      padding: '6px 8px',
                      border: '1px solid var(--iron-gray)',
                      minWidth: '50px',
                    }}
                  >
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{formatHour(t)}</div>
                    <div style={{ fontSize: '16px', margin: '2px 0' }}>{getWeatherIcon(weather.hourly.weathercode[i])}</div>
                    <div style={{ fontSize: '10px', color: 'var(--sacred-white)' }}>{Math.round(weather.hourly.temperature_2m[i])}°</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily forecast */}
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
                3-Day Forecast
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {weather.daily.time.slice(1, 4).map((t, i) => (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      border: '1px solid var(--iron-gray)',
                    }}
                  >
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '80px' }}>{formatDay(t)}</span>
                    <span style={{ fontSize: '16px' }}>{getWeatherIcon(weather.daily.weathercode[i + 1])}</span>
                    <span style={{ fontSize: '10px', color: 'var(--sacred-white)' }}>
                      {Math.round(weather.daily.temperature_2m_min[i + 1])}° / {Math.round(weather.daily.temperature_2m_max[i + 1])}°
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--noosphere-cyan)' }}>
                      {Math.round(weather.daily.precipitation_sum[i + 1] || 0)} mm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!selectedLocation && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '11px' }}>
            <Cloud size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <div>No location selected</div>
            <div style={{ marginTop: '8px', fontSize: '10px' }}>
              Click the search icon above to find your city
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--iron-gray)',
          fontSize: '9px',
          color: 'var(--steel-gray)',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        Data: Open-Meteo
      </div>
    </div>
  );
}
