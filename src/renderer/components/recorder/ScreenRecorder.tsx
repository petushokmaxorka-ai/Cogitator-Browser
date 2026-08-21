// ═══ SCREEN RECORDER ═══
// MediaRecorder API — screen/tab recording with audio toggle
// Dark Mechanicus interface for capturing viewport sessions

import { useState, useRef, useCallback } from 'react';
import { Video, Circle, Square, Pause, Play, Download, Mic, MicOff } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface ScreenRecorderProps {
  // no props needed — self-contained component
}

// ── Component ───────────────────────────────────────────────

export default function ScreenRecorder(_props: ScreenRecorderProps) {
  // ═══ State ═══
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [includeAudio, setIncludeAudio] = useState(true);

  // ═══ Refs ═══
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ═══ Helpers ═══

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ═══ Handlers ═══

  const startRecording = useCallback(async () => {
    try {
      // ── Get display media (screen or tab) ──
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: includeAudio,
      });

      streamRef.current = stream;

      // ── Handle user clicking "Stop sharing" in browser UI ──
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // ── Create MediaRecorder ──
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // ── Start timer ──
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('[ScreenRecorder] Failed to start recording:', err);
    }
  }, [includeAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const pauseRecording = useCallback(() => {
    if (isPaused) {
      mediaRecorderRef.current?.resume();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      mediaRecorderRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  }, [isPaused]);

  const downloadRecording = useCallback(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogitator-recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordedBlob]);

  // ═══ Render ═══

  return (
    <div style={{ padding: 16, fontFamily: 'var(--font-mono)' }}>
      {/* ── Header ── */}
      <div
        style={{
          color: 'var(--cogitator-gold)',
          fontSize: 14,
          letterSpacing: '0.15em',
          fontWeight: 'bold',
          marginBottom: 16,
          textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
        }}
      >
        <Video size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
        SCREEN RECORDER
      </div>

      {/* ── Status Panel ── */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--iron-gray)',
          padding: 20,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {isRecording ? (
          <>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'var(--omnissiah-red)',
                margin: '0 auto 8px',
                boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
                animation: 'pulse 1s infinite',
              }}
            />
            <div
              style={{
                color: 'var(--omnissiah-red)',
                fontSize: 32,
                letterSpacing: '0.1em',
                textShadow: '0 0 15px rgba(255, 0, 0, 0.4)',
              }}
            >
              ● REC {formatDuration(duration)}
            </div>
            {isPaused && (
              <div style={{ color: 'var(--cogitator-gold)', fontSize: 11, marginTop: 4 }}>
                PAUSED
              </div>
            )}
          </>
        ) : recordedBlob ? (
          <div style={{ color: 'var(--cyan-lua)', fontSize: 14 }}>
            ✓ RECORDING SAVED
          </div>
        ) : (
          <div style={{ color: 'var(--parchment-dim)', fontSize: 14 }}>
            READY TO RECORD
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {!isRecording ? (
          <button
            onClick={startRecording}
            style={{
              padding: '10px 24px',
              background: '#8B0000',
              border: '1px solid var(--omnissiah-red)',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = 'var(--glow-red)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#8B0000';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Circle size={14} /> START RECORDING
          </button>
        ) : (
          <>
            <button
              onClick={pauseRecording}
              title={isPaused ? 'Resume' : 'Pause'}
              style={{
                padding: '10px 16px',
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--cogitator-gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cogitator-gold)';
                e.currentTarget.style.boxShadow = 'var(--glow-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--iron-gray)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              onClick={stopRecording}
              style={{
                padding: '10px 24px',
                background: '#8B0000',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--omnissiah-red)';
                e.currentTarget.style.boxShadow = 'var(--glow-red)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#8B0000';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Square size={14} /> STOP
            </button>
          </>
        )}
      </div>

      {/* ── Audio Toggle ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--iron-gray)',
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setIncludeAudio(!includeAudio)}
          style={{
            background: 'transparent',
            border: 'none',
            color: includeAudio ? 'var(--cyan-lua)' : 'var(--parchment-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            transition: 'color 150ms ease',
          }}
        >
          {includeAudio ? <Mic size={14} /> : <MicOff size={14} />}
          <span>AUDIO {includeAudio ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* ── Download Button ── */}
      {recordedBlob && (
        <button
          onClick={downloadRecording}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--card-bg)',
            border: '1px solid var(--cyan-lua)',
            color: 'var(--cyan-lua)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            letterSpacing: '0.1em',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--cyan-lua)';
            e.currentTarget.style.color = 'var(--void-black)';
            e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)';
            e.currentTarget.style.color = 'var(--cyan-lua)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Download size={14} /> DOWNLOAD .WEBM
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
