// ═══ AETHER RESONANCE ═══
// Audio Visualizer — 5 modes of sacred waveform observation
// Frequencies given visual form for the Omnissiah

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Upload,
  AudioLines,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

type VizMode = 'frequency' | 'waveform' | 'circular' | 'particles' | 'rings';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  life: number;
  maxLife: number;
}

const MODE_LABELS: Record<VizMode, string> = {
  frequency: 'FREQ',
  waveform: 'WAVE',
  circular: 'CIRCLE',
  particles: 'PARTICLE',
  rings: 'RINGS',
};

const MODE_COLORS: Record<VizMode, string> = {
  frequency: 'var(--noosphere-cyan)',
  waveform: 'var(--cogitator-gold)',
  circular: 'var(--omnissiah-red)',
  particles: 'var(--noosphere-cyan)',
  rings: 'var(--cogitator-gold)',
};

// ── Component ───────────────────────────────────────────────

export default function MusicVisualizer() {
  // ── State ─────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [mode, setMode] = useState<VizMode>('frequency');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // ── Refs ──────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const ringPhaseRef = useRef(0);

  // ── Audio Setup ───────────────────────────────────────────
  const setupAudio = useCallback((audioEl: HTMLAudioElement) => {
    if (audioContextRef.current?.state === 'closed') {
      audioContextRef.current = null;
    }

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;

    // Disconnect previous source if exists
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
    }

    const source = ctx.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    sourceNodeRef.current = source;
    analyserRef.current = analyser;

    return analyser;
  }, []);

  // ── Initialize particles ──────────────────────────────────
  const initParticles = useCallback((count: number, w: number, h: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 3 + 1,
        hue: Math.random() * 120,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 100,
      });
    }
    return particles;
  }, []);

  // ── Draw Functions ────────────────────────────────────────

  // Mode 1: Frequency Bars
  const drawBars = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = dataArray.length;
      const barWidth = (w / barCount) * 2.5;
      let barX = 0;

      for (let i = 0; i < barCount; i++) {
        const barHeight = (dataArray[i] / 255) * h * 0.85;
        const hue = (i / barCount) * 120; // Red to Cyan range

        // Glow effect
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
        ctx.shadowBlur = 10;

        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
        ctx.fillRect(barX, h - barHeight, barWidth - 1, barHeight);

        // Top highlight
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, 1)`;
        ctx.fillRect(barX, h - barHeight, barWidth - 1, 2);

        barX += barWidth;
        if (barX > w) break;
      }

      ctx.shadowBlur = 0;
    },
    []
  );

  // Mode 2: Waveform
  const drawWaveform = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const sliceWidth = w / dataArray.length;
      let x = 0;

      // Draw multiple wave layers
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        const layerOffset = (layer - 1) * 30;
        const alpha = layer === 1 ? 0.9 : 0.3;

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 255;
          const y = (v * h * 0.5) + h / 2 + layerOffset;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        const hue = layer === 1 ? 45 : layer === 0 ? 0 : 180;
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
        ctx.lineWidth = layer === 1 ? 2 : 1;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
        ctx.shadowBlur = 8;
        ctx.stroke();
        x = 0;
      }

      ctx.shadowBlur = 0;
    },
    []
  );

  // Mode 3: Circular
  const drawCircular = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) / 5;

      ctx.clearRect(0, 0, w, h);

      // Draw outer glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(0, 100%, 30%, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = 0; i < dataArray.length; i++) {
        const angle = (i / dataArray.length) * Math.PI * 2 - Math.PI / 2;
        const barHeight = (dataArray[i] / 255) * Math.min(w, h) * 0.35;
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + barHeight);
        const y2 = cy + Math.sin(angle) * (radius + barHeight);

        const hue = (i / dataArray.length) * 360;

        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.4)`;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Center circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(0, 100%, 50%, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'hsla(0, 100%, 50%, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.shadowBlur = 0;
    },
    []
  );

  // Mode 4: Particles
  const drawParticles = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
      const w = canvas.width;
      const h = canvas.height;

      // Fade effect for trails
      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
      ctx.fillRect(0, 0, w, h);

      // Calculate bass energy (lower frequencies)
      let bassSum = 0;
      const bassRange = Math.floor(dataArray.length * 0.15);
      for (let i = 0; i < bassRange; i++) {
        bassSum += dataArray[i];
      }
      const bassEnergy = bassSum / bassRange / 255;

      const particles = particlesRef.current;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // React to frequency at particle's position
        const freqIdx = Math.floor((p.x / w) * dataArray.length) % dataArray.length;
        const freqVal = dataArray[freqIdx] / 255;

        // Velocity influenced by audio
        p.vx += (Math.random() - 0.5) * freqVal * 0.5;
        p.vy += (Math.random() - 0.5) * freqVal * 0.5;

        // Bass boost - particles jump on bass
        if (bassEnergy > 0.6) {
          p.vy -= bassEnergy * 2;
        }

        // Friction
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Move
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Wrap around
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Reset old particles
        if (p.life > p.maxLife) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = (Math.random() - 0.5) * 2;
          p.life = 0;
        }

        // Draw particle
        const lifeRatio = 1 - p.life / p.maxLife;
        const size = p.radius * (1 + freqVal * 2);

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue + freqVal * 60}, 100%, 50%, ${lifeRatio * 0.8})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 50%, 0.5)`;
        ctx.shadowBlur = 4;
        ctx.fill();

        // Draw connections between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 100%, 50%, ${(1 - dist / 80) * 0.15 * lifeRatio})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.shadowBlur = 0;
    },
    []
  );

  // Mode 5: Neon Rings
  const drawRings = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Calculate average energy
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avgEnergy = sum / dataArray.length / 255;

      ringPhaseRef.current += 0.02 + avgEnergy * 0.05;
      const phase = ringPhaseRef.current;

      const ringCount = 8;
      const maxRadius = Math.min(w, h) * 0.45;

      for (let r = 0; r < ringCount; r++) {
        const freqIdx = Math.floor((r / ringCount) * dataArray.length) % dataArray.length;
        const freqVal = dataArray[freqIdx] / 255;

        const baseRadius = ((r + 1) / ringCount) * maxRadius;
        const pulseRadius = baseRadius + freqVal * 20 + Math.sin(phase + r * 0.7) * 10;
        const hue = (r / ringCount) * 120 + phase * 10;

        ctx.beginPath();
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${0.3 + freqVal * 0.5})`;
        ctx.lineWidth = 2 + freqVal * 3;
        ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
        ctx.shadowBlur = 10 + freqVal * 10;
        ctx.stroke();

        // Inner glow dots on ring
        const dotCount = 6;
        for (let d = 0; d < dotCount; d++) {
          const angle = (d / dotCount) * Math.PI * 2 + phase * (r % 2 === 0 ? 1 : -1) * 0.3;
          const dotX = cx + Math.cos(angle) * pulseRadius;
          const dotY = cy + Math.sin(angle) * pulseRadius;

          ctx.beginPath();
          ctx.arc(dotX, dotY, 2 + freqVal * 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${0.5 + freqVal * 0.5})`;
          ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
      }

      // Center glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.15);
      gradient.addColorStop(0, `hsla(${60 + avgEnergy * 60}, 100%, 50%, ${0.3 + avgEnergy * 0.3})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - maxRadius * 0.15, cy - maxRadius * 0.15, maxRadius * 0.3, maxRadius * 0.3);

      ctx.shadowBlur = 0;
    },
    []
  );

  // ── Animation Loop ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize particles
    if (particlesRef.current.length === 0) {
      particlesRef.current = initParticles(80, canvas.width, canvas.height);
    }

    const animate = () => {
      if (!analyserRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;

      if (mode === 'waveform') {
        const timeData = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(timeData);

        switch (mode) {
          case 'waveform':
            drawWaveform(ctx, canvas, timeData);
            break;
        }
      } else {
        const freqData = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(freqData);

        switch (mode) {
          case 'frequency':
            drawBars(ctx, canvas, freqData);
            break;
          case 'circular':
            drawCircular(ctx, canvas, freqData);
            break;
          case 'particles':
            drawParticles(ctx, canvas, freqData);
            break;
          case 'rings':
            drawRings(ctx, canvas, freqData);
            break;
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mode, drawBars, drawWaveform, drawCircular, drawParticles, drawRings, initParticles]);

  // ── Canvas Resize ─────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Re-init particles on resize
      particlesRef.current = initParticles(80, canvas.width, canvas.height);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [initParticles]);

  // ── Handle File Load ──────────────────────────────────────
  const handleFile = useCallback(
    (file: File) => {
      // Validate audio file
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/ogg', 'audio/flac', 'audio/x-flac', 'audio/mp3'];
      const validExts = ['.mp3', '.wav', '.ogg', '.flac'];
      const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

      if (!validTypes.includes(file.type) && !hasValidExt) {
        return;
      }

      // Clean up previous audio
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.volume = volume;

      audioElementRef.current = audio;
      setFileName(file.name);
      setAudioLoaded(true);

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });

      audio.addEventListener('error', () => {
        setIsPlaying(false);
        setAudioLoaded(false);
      });

      // Setup audio context on first user interaction
      const setup = () => {
        setupAudio(audio);

        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }

        audio
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(false);
          });
      };

      // Try to autoplay
      setup();
    },
    [volume, setupAudio]
  );

  // ── Drag & Drop Handlers ──────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  // ── Playback Controls ─────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const stopPlayback = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  }, []);

  // ── Volume Control ────────────────────────────────────────
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVol = parseFloat(e.target.value);
      setVolume(newVol);
      if (audioElementRef.current) {
        audioElementRef.current.volume = newVol;
      }
    },
    []
  );

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      setVolume(0);
      if (audioElementRef.current) audioElementRef.current.volume = 0;
    } else {
      setVolume(0.7);
      if (audioElementRef.current) audioElementRef.current.volume = 0.7;
    }
  }, [volume]);

  // ── Fullscreen ────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Trigger resize after fullscreen change
      setTimeout(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (canvas && container) {
          const rect = container.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
      }, 100);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-sm)',
        overflow: 'hidden',
        color: 'var(--parchment)',
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: 'var(--omnissiah-red)',
            fontSize: 'var(--font-size-md)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255, 0, 0, 0.3)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AudioLines size={16} />
          AETHER RESONANCE
        </div>
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.1em',
          }}
        >
          AUDIO VISUALIZER // 5 SACRED MODES
        </div>
      </div>

      {/* ── Canvas Area ───────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--void-black)',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />

        {/* ── Drop Zone Overlay ─────────────────────────── */}
        {!audioLoaded && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDragOver
                ? 'rgba(255, 0, 0, 0.1)'
                : 'rgba(10, 10, 10, 0.85)',
              border: isDragOver
                ? '2px dashed var(--omnissiah-red)'
                : '2px dashed var(--iron-gray)',
              transition: 'all 200ms ease',
              zIndex: 10,
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload
              size={40}
              style={{
                color: isDragOver ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                marginBottom: '16px',
              }}
            />
            <div
              style={{
                color: isDragOver ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                fontSize: 'var(--font-size-md)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                textAlign: 'center',
                transition: 'color 200ms ease',
              }}
            >
              {isDragOver ? 'DROP AUDIO FILE' : 'DROP AUDIO FILE HERE'}
            </div>
            <div
              style={{
                color: 'var(--parchment-dim)',
                fontSize: 'var(--font-size-xs)',
                letterSpacing: '0.1em',
                marginTop: '8px',
                textAlign: 'center',
              }}
            >
              OR CLICK TO BROWSE
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-xs)',
                marginTop: '12px',
                textAlign: 'center',
              }}
            >
              .mp3 .wav .ogg .flac
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* ── File Name Badge ───────────────────────────── */}
        {audioLoaded && fileName && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              padding: '4px 10px',
              background: 'rgba(10, 10, 10, 0.8)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--cogitator-gold)',
              fontSize: 'var(--font-size-xs)',
              letterSpacing: '0.08em',
              zIndex: 5,
              maxWidth: '60%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fileName}
          </div>
        )}
      </div>

      {/* ── Controls ──────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--iron-gray)',
          background: 'var(--iron-dark)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Playback Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!audioLoaded}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: audioLoaded ? 'var(--omnissiah-red-dim)' : 'var(--iron-gray)',
              border: `1px solid ${audioLoaded ? 'var(--omnissiah-red)' : 'var(--steel-gray)'}`,
              color: 'var(--sacred-white)',
              cursor: audioLoaded ? 'pointer' : 'not-allowed',
              opacity: audioLoaded ? 1 : 0.5,
              boxShadow: audioLoaded ? 'var(--glow-red)' : 'none',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (audioLoaded) {
                e.currentTarget.style.background = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255,0,0,0.6)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--omnissiah-red-dim)';
              e.currentTarget.style.boxShadow = audioLoaded ? 'var(--glow-red)' : 'none';
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          {/* Stop */}
          <button
            onClick={stopPlayback}
            disabled={!audioLoaded}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: audioLoaded ? 'var(--parchment)' : 'var(--parchment-dim)',
              cursor: audioLoaded ? 'pointer' : 'not-allowed',
              opacity: audioLoaded ? 1 : 0.5,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (audioLoaded) {
                e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                e.currentTarget.style.color = 'var(--omnissiah-red)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = audioLoaded ? 'var(--parchment)' : 'var(--parchment-dim)';
            }}
          >
            <Square size={14} />
          </button>

          {/* Volume */}
          <button
            onClick={toggleMute}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: 'transparent',
              border: 'none',
              color: volume === 0 ? 'var(--parchment-dim)' : 'var(--noosphere-cyan)',
              cursor: 'pointer',
            }}
          >
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            style={{
              width: '80px',
              accentColor: 'var(--noosphere-cyan)',
              cursor: 'pointer',
            }}
          />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: 'transparent',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment-dim)',
              cursor: 'pointer',
              marginLeft: '8px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
              e.currentTarget.style.color = 'var(--cogitator-gold)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--iron-gray)';
              e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        </div>

        {/* Mode Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {(Object.keys(MODE_LABELS) as VizMode[]).map((m) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 10px',
                  background: isActive ? 'var(--iron-gray)' : 'transparent',
                  border: isActive ? '1px solid var(--omnissiah-red)' : '1px solid var(--iron-gray)',
                  color: isActive ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  textShadow: isActive ? '0 0 8px rgba(255,0,0,0.4)' : 'none',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = MODE_COLORS[m];
                    e.currentTarget.style.color = MODE_COLORS[m];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--iron-gray)';
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                  }
                }}
              >
                {MODE_LABELS[m]}
              </button>
            );
          })}
        </div>

        {/* Load New File Button */}
        {audioLoaded && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                e.currentTarget.style.color = 'var(--cogitator-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.color = 'var(--parchment-dim)';
              }}
            >
              <Upload size={10} />
              LOAD NEW FILE
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
