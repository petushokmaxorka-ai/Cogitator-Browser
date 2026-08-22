// ═══ ADEPTUS PLAYER — MEDIA PLAYER ═══
// Holy video/audio playback engine of the Machine Spirit
// Supports playlist, subtitles, speed control, repeat, shuffle

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type DragEvent as ReactDragEvent,
  type ChangeEvent,
} from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  Film,
  Music,
  Plus,
  X,
  Repeat,
  Repeat1,
  Shuffle,
  Gauge,
  Subtitles,
  GripVertical,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'audio';
  duration?: number;
}

interface MediaPlayerProps {
  files?: MediaFile[];
  initialFile?: MediaFile;
}

type RepeatMode = 'none' | 'one' | 'all';

// ── Helpers ─────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function generateId(): string {
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

// ── Subtitle Track ──────────────────────────────────────────

interface SubtitleTrack {
  label: string;
  src: string;
  srclang: string;
}

// ── Component ───────────────────────────────────────────────

export function MediaPlayer({ files: initialFiles = [], initialFile }: MediaPlayerProps) {
  // ═══ State ═══
  const [playlist, setPlaylist] = useState<MediaFile[]>(initialFiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffled, setIsShuffled] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [playlistReorder, setPlaylistReorder] = useState<{ from: number; to: number } | null>(null);

  // ═══ Refs ═══
  const mediaRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══ Derived ═══
  const currentFile = playlist[currentIndex] || null;

  // ═══ Initialize with initialFile ═══
  useEffect(() => {
    if (initialFile) {
      setPlaylist((prev) => {
        const exists = prev.find((f) => f.id === initialFile.id);
        if (exists) return prev;
        return [...prev, initialFile];
      });
      const idx = playlist.findIndex((f) => f.id === initialFile.id);
      if (idx >= 0) {
        setCurrentIndex(idx);
      } else {
        setCurrentIndex(playlist.length);
      }
    }
  }, [initialFile]);

  // ═══ Media Event Handlers ═══
  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setCurrentTime(media.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setDuration(media.duration);
    media.playbackRate = speed;
  }, [speed]);

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      const media = mediaRef.current;
      if (media) {
        media.currentTime = 0;
        media.play();
      }
    } else if (isShuffled) {
      playRandom();
    } else if (currentIndex < playlist.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else if (repeatMode === 'all' && playlist.length > 0) {
      setCurrentIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [repeatMode, isShuffled, currentIndex, playlist.length]);

  // ═══ Play/Pause ═══
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying) {
      media.play().catch(() => setIsPlaying(false));
    } else {
      media.pause();
    }
  }, [isPlaying, currentIndex, currentFile]);

  // ═══ Speed ═══
  useEffect(() => {
    const media = mediaRef.current;
    if (media) {
      media.playbackRate = speed;
    }
  }, [speed]);

  // ═══ Volume ═══
  useEffect(() => {
    const media = mediaRef.current;
    if (media) {
      media.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ═══ Controls ═══
  const togglePlay = useCallback(() => {
    if (!currentFile) return;
    setIsPlaying((p) => !p);
  }, [currentFile]);

  const playNext = useCallback(() => {
    if (isShuffled) {
      playRandom();
      return;
    }
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else if (repeatMode === 'all') {
      setCurrentIndex(0);
    }
  }, [currentIndex, playlist.length, isShuffled, repeatMode]);

  const playPrev = useCallback(() => {
    if (isShuffled) {
      playRandom();
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else if (repeatMode === 'all') {
      setCurrentIndex(playlist.length - 1);
    }
  }, [currentIndex, isShuffled, repeatMode, playlist.length]);

  function playRandom() {
    if (playlist.length <= 1) return;
    let next = Math.floor(Math.random() * playlist.length);
    while (next === currentIndex && playlist.length > 1) {
      next = Math.floor(Math.random() * playlist.length);
    }
    setCurrentIndex(next);
  }

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const media = mediaRef.current;
      const bar = progressRef.current;
      if (!media || !bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const newTime = pct * duration;
      media.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const handleVolumeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (v > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === 'none' ? 'all' : m === 'all' ? 'one' : 'none'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((s) => !s);
  }, []);

  // ═══ File Picker ═══
  const handleAddFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const newFiles: MediaFile[] = Array.from(files)
        .filter((f) => f.type.startsWith('video/') || f.type.startsWith('audio/'))
        .map((f) => ({
          id: generateId(),
          name: f.name,
          url: URL.createObjectURL(f),
          type: f.type.startsWith('video/') ? 'video' : 'audio',
        }));
      if (newFiles.length > 0) {
        setPlaylist((prev) => [...prev, ...newFiles]);
      }
      e.target.value = '';
    },
    []
  );

  const removeFromPlaylist = useCallback(
    (index: number) => {
      setPlaylist((prev) => {
        const next = [...prev];
        const removed = next.splice(index, 1)[0];
        if (removed) URL.revokeObjectURL(removed.url);
        return next;
      });
      if (index === currentIndex) {
        setIsPlaying(false);
        setCurrentTime(0);
        if (index >= playlist.length - 1) {
          setCurrentIndex(Math.max(0, playlist.length - 2));
        }
      } else if (index < currentIndex) {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    },
    [currentIndex, playlist.length]
  );

  const selectTrack = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  // ═══ Drag & Drop — Playlist Reorder ═══
  const handleDragStart = useCallback((index: number) => {
    setPlaylistReorder({ from: index, to: index });
  }, []);

  const handleDragOverItem = useCallback(
    (e: ReactDragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      if (playlistReorder && playlistReorder.from !== index) {
        setPlaylistReorder({ ...playlistReorder, to: index });
      }
    },
    [playlistReorder]
  );

  const handleDragEnd = useCallback(() => {
    if (playlistReorder && playlistReorder.from !== playlistReorder.to) {
      setPlaylist((prev) => {
        const next = [...prev];
        const [moved] = next.splice(playlistReorder.from, 1);
        next.splice(playlistReorder.to, 0, moved);
        return next;
      });
      if (currentIndex === playlistReorder.from) {
        setCurrentIndex(playlistReorder.to);
      } else if (
        playlistReorder.from < currentIndex &&
        playlistReorder.to >= currentIndex
      ) {
        setCurrentIndex((i) => i - 1);
      } else if (
        playlistReorder.from > currentIndex &&
        playlistReorder.to <= currentIndex
      ) {
        setCurrentIndex((i) => i + 1);
      }
    }
    setPlaylistReorder(null);
  }, [playlistReorder, currentIndex]);

  // ═══ Drag & Drop — Files from outside ═══
  const handleContainerDragOver = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleContainerDragLeave = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleContainerDrop = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles) return;
    const mediaFiles: MediaFile[] = Array.from(droppedFiles)
      .filter((f) => f.type.startsWith('video/') || f.type.startsWith('audio/'))
      .map((f) => ({
        id: generateId(),
        name: f.name,
        url: URL.createObjectURL(f),
        type: f.type.startsWith('video/') ? 'video' : 'audio',
      }));
    if (mediaFiles.length > 0) {
      setPlaylist((prev) => [...prev, ...mediaFiles]);
    }
    // Check for subtitle files
    const subFiles = Array.from(droppedFiles).filter(
      (f) => f.name.endsWith('.srt') || f.name.endsWith('.vtt')
    );
    subFiles.forEach((f) => {
      const url = URL.createObjectURL(f);
      setSubtitles((prev) => [
        ...prev,
        {
          label: f.name,
          src: url,
          srclang: 'en',
        },
      ]);
    });
  }, []);

  // ═══ Subtitle Drop — dedicated handler ═══
  const handleSubtitleDrop = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files) return;
    const subFiles = Array.from(files).filter(
      (f) => f.name.endsWith('.srt') || f.name.endsWith('.vtt')
    );
    subFiles.forEach((f) => {
      const url = URL.createObjectURL(f);
      setSubtitles((prev) => [
        ...prev,
        {
          label: f.name,
          src: url,
          srclang: 'en',
        },
      ]);
    });
  }, []);

  // ═══ Keyboard shortcuts ═══
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (mediaRef.current) mediaRef.current.currentTime += 5;
          break;
        case 'ArrowLeft':
          if (mediaRef.current) mediaRef.current.currentTime -= 5;
          break;
        case 'ArrowUp':
          setVolume((v) => Math.min(1, v + 0.1));
          break;
        case 'ArrowDown':
          setVolume((v) => Math.max(0, v - 0.1));
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'n':
          playNext();
          break;
        case 'p':
          playPrev();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, toggleFullscreen, playNext, playPrev]);

  // ═══ Progress percentage ═══
  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  // ═══ Render ═══
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
      {/* ── Header ──────────────────────────────────────────── */}
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
          <Film size={14} style={{ color: 'var(--omnissiah-red)' }} />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: 'var(--font-size-sm)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
            }}
          >
            ADEPTUS PLAYER
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentFile && (
            <span
              style={{
                color: 'var(--parchment-dim)',
                fontSize: '9px',
                letterSpacing: '0.08em',
              }}
            >
              {currentFile.type === 'video' ? 'VIDEO' : 'AUDIO'} MODE
            </span>
          )}
        </div>
      </div>

      {/* ── Main Area (Player + Playlist) ───────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Player Area */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#000',
            position: 'relative',
          }}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          onDrop={handleContainerDrop}
        >
          {/* Drag Overlay */}
          {isDraggingOver && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 0, 0, 0.1)',
                border: '2px dashed var(--omnissiah-red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <Film size={32} style={{ color: 'var(--omnissiah-red)' }} />
              <span
                style={{
                  color: 'var(--omnissiah-red)',
                  fontSize: 'var(--font-size-md)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                DROP MEDIA FILES
              </span>
            </div>
          )}

          {/* Video Element */}
          {currentFile ? (
            <video
              ref={mediaRef}
              src={currentFile.url}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
              }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onClick={togglePlay}
              playsInline
            >
              {subtitles.map((sub, i) => (
                <track
                  key={`${sub.src}_${i}`}
                  kind="subtitles"
                  src={sub.src}
                  srcLang={sub.srclang}
                  label={sub.label}
                  default={i === 0}
                />
              ))}
            </video>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--parchment-dim)',
              }}
            >
              <Film size={48} style={{ color: 'var(--iron-gray)' }} />
              <span
                style={{
                  fontSize: 'var(--font-size-md)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                NO MEDIA LOADED
              </span>
              <button
                onClick={handleAddFiles}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  border: '1px solid var(--omnissiah-red)',
                  background: 'transparent',
                  color: 'var(--omnissiah-red)',
                  fontSize: 'var(--font-size-xs)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--omnissiah-red)';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--omnissiah-red)';
                }}
              >
                + ADD FILES
              </button>
            </div>
          )}

          {/* Controls Bar */}
          {currentFile && (
            <div
              style={{
                background: 'var(--iron-dark)',
                borderTop: '1px solid var(--iron-gray)',
                padding: '8px 12px',
                flexShrink: 0,
              }}
            >
              {/* Progress Bar */}
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--iron-gray)',
                  cursor: 'pointer',
                  position: 'relative',
                  marginBottom: '8px',
                  overflow: 'hidden',
                }}
                title={`${formatTime(currentTime)} / ${formatTime(duration)}`}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: 'var(--omnissiah-red)',
                    boxShadow: '0 0 8px rgba(255, 0, 0, 0.5)',
                    transition: 'width 100ms linear',
                  }}
                />
              </div>

              {/* Control Buttons Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                {/* Left: Prev/Play/Next */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ControlButton onClick={playPrev} title="Previous (p)">
                    <SkipBack size={14} />
                  </ControlButton>
                  <ControlButton onClick={togglePlay} title="Play/Pause (Space)">
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </ControlButton>
                  <ControlButton onClick={playNext} title="Next (n)">
                    <SkipForward size={14} />
                  </ControlButton>
                </div>

                {/* Time */}
                <span
                  style={{
                    color: 'var(--parchment-dim)',
                    fontSize: 'var(--font-size-xs)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.05em',
                  }}
                >
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Center: Repeat/Shuffle/Speed */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ControlButton
                    onClick={toggleShuffle}
                    title="Shuffle"
                    active={isShuffled}
                    activeColor="var(--noosphere-cyan)"
                  >
                    <Shuffle size={12} />
                  </ControlButton>
                  <ControlButton
                    onClick={cycleRepeat}
                    title={`Repeat: ${repeatMode}`}
                    active={repeatMode !== 'none'}
                    activeColor="var(--cogitator-gold)"
                  >
                    {repeatMode === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}
                  </ControlButton>
                  <SpeedSelector speed={speed} onChange={setSpeed} />
                </div>

                {/* Right: Volume/Fullscreen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Subtitle indicator */}
                  {subtitles.length > 0 && (
                    <span style={{ color: 'var(--noosphere-cyan)', display: 'flex' }} title="Subtitles loaded">
                      <Subtitles size={12} />
                    </span>
                  )}

                  <ControlButton onClick={toggleMute} title="Mute/Unmute">
                    {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </ControlButton>

                  {/* Volume Slider */}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    title={`Volume: ${Math.round(volume * 100)}%`}
                    style={{
                      width: '60px',
                      height: '3px',
                      accentColor: 'var(--noosphere-cyan)',
                      cursor: 'pointer',
                    }}
                  />

                  <ControlButton onClick={toggleFullscreen} title="Fullscreen (f)">
                    <Maximize size={12} />
                  </ControlButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Playlist Sidebar */}
        {showPlaylist && (
          <div
            style={{
              width: '200px',
              flexShrink: 0,
              background: 'var(--iron-dark)',
              borderLeft: '1px solid var(--iron-gray)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Playlist Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderBottom: '1px solid var(--iron-gray)',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: 'var(--parchment)',
                  fontSize: 'var(--font-size-xs)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                }}
              >
                PLAYLIST ({playlist.length})
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <ControlButton onClick={handleAddFiles} title="Add Files">
                  <Plus size={12} />
                </ControlButton>
              </div>
            </div>

            {/* Subtitle Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleSubtitleDrop}
              style={{
                padding: '6px 10px',
                borderBottom: '1px solid var(--iron-gray)',
                fontSize: '9px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                letterSpacing: '0.05em',
                cursor: 'copy',
              }}
              title="Drop .srt or .vtt subtitle files here"
            >
              <Subtitles size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              DROP SUBTITLES (.srt/.vtt)
            </div>

            {/* Playlist Items */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
              }}
              className="scrollbar-mechanicus"
            >
              {playlist.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  Empty playlist
                </div>
              ) : (
                playlist.map((file, index) => {
                  const isActive = index === currentIndex;
                  return (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOverItem(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => selectTrack(index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 10px',
                        borderBottom: '1px solid var(--iron-gray)',
                        borderLeft: isActive ? '3px solid var(--omnissiah-red)' : '3px solid transparent',
                        background: isActive ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 100ms ease',
                        opacity: playlistReorder?.from === index ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--steel-gray)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                      title={file.name}
                    >
                      {/* Drag Handle */}
                      <span
                        style={{
                          color: 'var(--text-muted)',
                          cursor: 'grab',
                          display: 'flex',
                          flexShrink: 0,
                        }}
                      >
                        <GripVertical size={10} />
                      </span>

                      {/* Icon */}
                      <span style={{ color: isActive ? 'var(--omnissiah-red)' : 'var(--parchment-dim)', flexShrink: 0 }}>
                        {file.type === 'video' ? <Film size={12} /> : <Music size={12} />}
                      </span>

                      {/* Name */}
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 'var(--font-size-xs)',
                          color: isActive ? 'var(--omnissiah-red)' : 'var(--parchment)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {file.name}
                      </span>

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromPlaylist(index);
                        }}
                        style={{
                          display: 'flex',
                          color: 'var(--text-muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          flexShrink: 0,
                          transition: 'color 100ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--omnissiah-red)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                        title="Remove"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ═══ Sub-components ═════════════════════════════════════════

// Control Button
function ControlButton({
  children,
  onClick,
  title,
  active = false,
  activeColor = 'var(--omnissiah-red)',
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        background: active ? `${activeColor}20` : 'transparent',
        border: active ? `1px solid ${activeColor}` : '1px solid transparent',
        color: active ? activeColor : 'var(--parchment-dim)',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        borderRadius: '2px',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--steel-gray)';
          e.currentTarget.style.color = 'var(--parchment)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--parchment-dim)';
        }
      }}
    >
      {children}
    </button>
  );
}

// Speed Selector
function SpeedSelector({
  speed,
  onChange,
}: {
  speed: number;
  onChange: (s: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <ControlButton onClick={() => setOpen(!open)} title={`Speed: ${speed}x`}>
        <Gauge size={12} />
      </ControlButton>
      <span
        onClick={() => setOpen(!open)}
        style={{
          color: 'var(--parchment-dim)',
          fontSize: '9px',
          cursor: 'pointer',
          marginLeft: '2px',
          letterSpacing: '0.05em',
        }}
      >
        {speed}x
      </span>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            minWidth: '60px',
            marginBottom: '4px',
          }}
        >
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              style={{
                padding: '6px 12px',
                background: s === speed ? 'var(--steel-gray)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--iron-gray)',
                color: s === speed ? 'var(--cogitator-gold)' : 'var(--parchment)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                textAlign: 'center',
                letterSpacing: '0.08em',
              }}
              onMouseEnter={(e) => {
                if (s !== speed) {
                  e.currentTarget.style.background = 'var(--steel-gray)';
                }
              }}
              onMouseLeave={(e) => {
                if (s !== speed) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Default export
export default MediaPlayer;
