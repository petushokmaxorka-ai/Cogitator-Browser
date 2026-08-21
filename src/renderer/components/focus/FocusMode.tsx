// ═══════════════════════════════════════════════════════════════════════════════
// FOCUS MODE — Concentration Ritual
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Crosshair,
  Plus,
  Trash2,
  Play,
  Square,
  Clock,
  Trophy,
  AlertTriangle,
  X,
  Flame,
  Shield,
  Eye,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface BlockedSite {
  id: string;
  domain: string;
  addedAt: number;
}

interface FocusStats {
  totalFocusMinutesToday: number;
  totalFocusMinutesWeek: number;
  sessionsCompleted: number;
}

interface FocusSession {
  startTime: number;
  duration: number; // minutes
  isActive: boolean;
  remainingSeconds: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY_SITES = 'cogitator_focus_sites';
const STORAGE_KEY_STATS = 'cogitator_focus_stats';

const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'youtube.com',
  'twitch.tv',
  'discord.com',
  'netflix.com',
];

const SESSION_PRESETS = [25, 45, 60, 90, 120];

// ── Storage Helpers ──────────────────────────────────────────────────────────

function loadBlockedSites(): BlockedSite[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SITES);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_BLOCKED_SITES.map((domain, i) => ({
    id: `block_${i}`,
    domain,
    addedAt: Date.now(),
  }));
}

function saveBlockedSites(sites: BlockedSite[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sites));
  } catch { /* ignore */ }
}

function loadStats(): FocusStats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATS);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { totalFocusMinutesToday: 0, totalFocusMinutesWeek: 0, sessionsCompleted: 0 };
}

function saveStats(stats: FocusStats) {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch { /* ignore */ }
}

function generateId(): string {
  return `focus_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Circular Timer Component ─────────────────────────────────────────────────

function CircularTimer({
  totalSeconds,
  remainingSeconds,
  isActive,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  isActive: boolean;
}) {
  const radius = 80;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <svg width={radius * 2} height={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="transparent"
          stroke="var(--iron-gray)"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="transparent"
          stroke={isActive ? 'var(--omnissiah-red)' : 'var(--cogitator-gold)'}
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="square"
          style={{
            transition: 'stroke-dashoffset 1s linear',
            filter: isActive ? 'drop-shadow(0 0 6px rgba(255, 0, 0, 0.5))' : 'none',
          }}
        />
        {/* Center glow */}
        {isActive && (
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius * 0.6}
            fill="rgba(255, 0, 0, 0.05)"
          />
        )}
      </svg>
      <div
        style={{
          color: isActive ? 'var(--omnissiah-red)' : 'var(--cogitator-gold)',
          fontSize: '32px',
          fontWeight: 'bold',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.05em',
          textShadow: isActive
            ? '0 0 15px rgba(255, 0, 0, 0.5), 0 0 30px rgba(255, 0, 0, 0.2)'
            : '0 0 10px rgba(200, 168, 75, 0.3)',
        }}
      >
        {formatTime(remainingSeconds)}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function FocusMode() {
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>(loadBlockedSites);
  const [stats, setStats] = useState<FocusStats>(loadStats);
  const [session, setSession] = useState<FocusSession>({
    startTime: 0,
    duration: 25,
    isActive: false,
    remainingSeconds: 25 * 60,
  });
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [newSite, setNewSite] = useState('');
  const [showBlockPage, setShowBlockPage] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Persist ────────────────────────────────────────────────────────────────

  useEffect(() => {
    saveBlockedSites(blockedSites);
  }, [blockedSites]);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  // ── Timer Logic ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (session.isActive && session.remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setSession((prev) => {
          if (prev.remainingSeconds <= 1) {
            // Session complete
            return { ...prev, isActive: false, remainingSeconds: 0 };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    } else if (session.remainingSeconds === 0 && session.isActive) {
      // Session just completed
      setSession((prev) => ({ ...prev, isActive: false }));
      setStats((prev) => ({
        totalFocusMinutesToday: prev.totalFocusMinutesToday + session.duration,
        totalFocusMinutesWeek: prev.totalFocusMinutesWeek + session.duration,
        sessionsCompleted: prev.sessionsCompleted + 1,
      }));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session.isActive, session.remainingSeconds, session.duration]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const startSession = useCallback(() => {
    const totalSeconds = selectedDuration * 60;
    setSession({
      startTime: Date.now(),
      duration: selectedDuration,
      isActive: true,
      remainingSeconds: totalSeconds,
    });
    setShowBlockPage(true);
  }, [selectedDuration]);

  const stopSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isActive: false,
      remainingSeconds: prev.duration * 60,
    }));
    setShowBlockPage(false);
  }, []);

  const addBlockedSite = useCallback(() => {
    if (!newSite.trim()) return;
    const domain = newSite.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!domain) return;
    if (blockedSites.some((s) => s.domain === domain)) return;

    setBlockedSites((prev) => [
      ...prev,
      { id: generateId(), domain, addedAt: Date.now() },
    ]);
    setNewSite('');
  }, [newSite, blockedSites]);

  const removeBlockedSite = useCallback((id: string) => {
    setBlockedSites((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Block Page Overlay ─────────────────────────────────────────────────────

  if (showBlockPage && session.isActive) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'var(--void-black)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          zIndex: 100000,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Pulsing red glow background */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 0, 0, 0.08) 0%, transparent 70%)',
            animation: 'pulse-border 3s ease-in-out infinite',
          }}
        />

        <div
          style={{
            color: 'var(--omnissiah-red)',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            textShadow: '0 0 20px rgba(255, 0, 0, 0.5)',
          }}
        >
          <Eye size={14} style={{ display: 'inline', marginRight: '8px' }} />
          Focus Mode Active
        </div>

        <CircularTimer
          totalSeconds={session.duration * 60}
          remainingSeconds={session.remainingSeconds}
          isActive={session.isActive}
        />

        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: 'var(--font-size-sm)',
            maxWidth: 400,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          <Flame size={16} style={{ color: 'var(--omnissiah-red)', marginBottom: '8px' }} />
          <br />
          The Omnissiah demands concentration.
          <br />
          Distraction sites are sealed by the Machine Spirit.
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 400,
          }}
        >
          {blockedSites.slice(0, 6).map((site) => (
            <span
              key={site.id}
              style={{
                padding: '2px 8px',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.2)',
                color: 'var(--omnissiah-red-dim)',
                fontSize: '9px',
                textDecoration: 'line-through',
              }}
            >
              {site.domain}
            </span>
          ))}
        </div>

        <button
          onClick={stopSession}
          style={{
            marginTop: '16px',
            padding: '10px 24px',
            background: 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))',
            border: '1px solid var(--omnissiah-red)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 0, 0, 0.2)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
            e.currentTarget.style.boxShadow = 'var(--glow-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.2)';
          }}
        >
          <Square size={12} style={{ display: 'inline', marginRight: '6px' }} />
          End Session
        </button>
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────

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
        <Crosshair size={14} style={{ color: 'var(--omnissiah-red)' }} />
        <span>Concentration Ritual</span>
      </div>

      {/* ═══ Timer Section ═══ */}
      <div
        style={{
          padding: '16px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <CircularTimer
          totalSeconds={session.duration * 60}
          remainingSeconds={session.remainingSeconds}
          isActive={session.isActive}
        />

        {/* Duration presets */}
        {!session.isActive && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {SESSION_PRESETS.map((mins) => (
              <button
                key={mins}
                onClick={() => setSelectedDuration(mins)}
                style={{
                  padding: '6px 12px',
                  background: selectedDuration === mins
                    ? 'rgba(255, 0, 0, 0.2)'
                    : 'var(--void-black)',
                  border: `1px solid ${selectedDuration === mins ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
                  color: selectedDuration === mins ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {mins}m
              </button>
            ))}
          </div>
        )}

        {/* Start/Stop button */}
        <button
          onClick={session.isActive ? stopSession : startSession}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 32px',
            background: session.isActive
              ? 'linear-gradient(135deg, var(--iron-gray), var(--void-black))'
              : 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))',
            border: `1px solid ${session.isActive ? 'var(--iron-gray)' : 'var(--omnissiah-red)'}`,
            color: session.isActive ? 'var(--text-muted)' : 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            boxShadow: session.isActive ? 'none' : '0 0 20px rgba(255, 0, 0, 0.3)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!session.isActive) {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red), var(--omnissiah-red-dim))';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 0, 0, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!session.isActive) {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--omnissiah-red-dim), var(--iron-dark))';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.3)';
            }
          }}
        >
          {session.isActive ? (
            <>
              <Square size={14} />
              Stop Session
            </>
          ) : (
            <>
              <Play size={14} />
              Start Focus Session
            </>
          )}
        </button>
      </div>

      {/* ═══ Stats ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
        }}
      >
        <div
          style={{
            padding: '8px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            textAlign: 'center',
          }}
        >
          <Clock size={14} style={{ color: 'var(--cogitator-gold)', marginBottom: '4px' }} />
          <div style={{ color: 'var(--cogitator-gold)', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
            {formatMinutes(stats.totalFocusMinutesToday)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '8px', textTransform: 'uppercase' }}>Today</div>
        </div>
        <div
          style={{
            padding: '8px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            textAlign: 'center',
          }}
        >
          <Trophy size={14} style={{ color: 'var(--noosphere-cyan)', marginBottom: '4px' }} />
          <div style={{ color: 'var(--noosphere-cyan)', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
            {formatMinutes(stats.totalFocusMinutesWeek)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '8px', textTransform: 'uppercase' }}>This Week</div>
        </div>
        <div
          style={{
            padding: '8px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            textAlign: 'center',
          }}
        >
          <Flame size={14} style={{ color: 'var(--omnissiah-red)', marginBottom: '4px' }} />
          <div style={{ color: 'var(--omnissiah-red)', fontSize: 'var(--font-size-sm)', fontWeight: 'bold' }}>
            {stats.sessionsCompleted}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '8px', textTransform: 'uppercase' }}>Sessions</div>
        </div>
      </div>

      {/* ═══ Blocked Sites ═══ */}
      <div
        style={{
          padding: '10px',
          background: 'var(--iron-dark)',
          border: '1px solid var(--iron-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            <Shield size={11} />
            Sealed Domains ({blockedSites.length})
          </span>
        </div>

        {/* Add new site */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="Add domain to block..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') addBlockedSite();
            }}
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
            onClick={addBlockedSite}
            disabled={!newSite.trim()}
            style={{
              padding: '6px 10px',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid var(--omnissiah-red-dim)',
              color: 'var(--omnissiah-red)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              cursor: newSite.trim() ? 'pointer' : 'not-allowed',
              opacity: newSite.trim() ? 1 : 0.5,
            }}
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Site list */}
        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {blockedSites.map((site) => (
            <div
              key={site.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                background: 'var(--void-black)',
                border: '1px solid transparent',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--parchment-dim)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                <AlertTriangle size={10} style={{ color: 'var(--omnissiah-red-dim)' }} />
                {site.domain}
              </span>
              <button
                onClick={() => removeBlockedSite(site.id)}
                style={{
                  padding: '2px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
                title="Remove"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Break Reminder ═══ */}
      {stats.totalFocusMinutesToday > 60 && (
        <div
          style={{
            padding: '8px',
            background: 'rgba(200, 168, 75, 0.08)',
            border: '1px solid var(--cogitator-gold-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--cogitator-gold)',
          }}
        >
          <AlertTriangle size={12} />
          <span>You have focused for {formatMinutes(stats.totalFocusMinutesToday)} today. Consider taking a break to recharge the Machine Spirit.</span>
        </div>
      )}
    </div>
  );
}
