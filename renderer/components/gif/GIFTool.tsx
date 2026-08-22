import { useState, useCallback, useRef } from 'react';
import { Upload, Play, Download, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
// @ts-ignore
import gifshot from 'gifshot';

interface Frame {
  id: string;
  url: string;
  width: number;
  height: number;
}

export default function GIFTool(): JSX.Element {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [delay, setDelay] = useState(500);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    imageFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setFrames((prev) => [...prev, { id: crypto.randomUUID(), url, width: img.width, height: img.height }]);
      };
      img.src = url;
    });
  }, []);

  const removeFrame = useCallback((id: string) => {
    setFrames((prev) => {
      const frame = prev.find((f) => f.id === id);
      if (frame) URL.revokeObjectURL(frame.url);
      return prev.filter((f) => f.id !== id);
    });
    setGifUrl(null);
  }, []);

  const generateGif = useCallback(() => {
    if (frames.length < 2) return;
    setGenerating(true);
    setGifUrl(null);

    gifshot.createGIF(
      {
        images: frames.map((f) => f.url),
        gifWidth: Math.min(frames[0].width, 640),
        gifHeight: Math.min(frames[0].height, 480),
        interval: delay / 1000,
        numFrames: frames.length,
        frameDuration: 1,
        fontWeight: 'normal',
        fontSize: '16px',
        fontFamily: 'sans-serif',
        fontColor: '#ffffff',
        textAlign: 'center',
        textBaseline: 'bottom',
        sampleInterval: 10,
        numWorkers: 2,
      },
      (obj: { error: boolean; errorCode?: string; errorMsg?: string; image: string }) => {
        setGenerating(false);
        if (!obj.error) {
          setGifUrl(obj.image);
        } else {
          console.error('GIF generation failed:', obj.errorMsg);
        }
      }
    );
  }, [frames, delay]);

  const downloadGif = useCallback(() => {
    if (!gifUrl) return;
    const a = document.createElement('a');
    a.href = gifUrl;
    a.download = `cogitator-${Date.now()}.gif`;
    a.click();
  }, [gifUrl]);

  const clearAll = useCallback(() => {
    frames.forEach((f) => URL.revokeObjectURL(f.url));
    setFrames([]);
    setGifUrl(null);
  }, [frames]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        gap: '12px',
        overflow: 'auto',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div style={{ color: 'var(--cogitator-gold)', fontSize: 12, letterSpacing: '0.1em' }}>
        ◉ GIF Animator
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '4px 12px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--noosphere-cyan)',
            color: 'var(--noosphere-cyan)',
            cursor: 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Upload size={12} />
          Add Frames
        </button>
        <button
          onClick={generateGif}
          disabled={frames.length < 2 || generating}
          style={{
            padding: '4px 12px',
            background: frames.length < 2 || generating ? 'var(--iron-gray)' : 'var(--iron-dark)',
            border: '1px solid var(--cogitator-gold)',
            color: frames.length < 2 || generating ? 'var(--parchment-dim)' : 'var(--cogitator-gold)',
            cursor: frames.length < 2 || generating ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {generating ? 'Generating...' : 'Generate GIF'}
        </button>
        <button
          onClick={clearAll}
          disabled={frames.length === 0}
          style={{
            padding: '4px 12px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--omnissiah-red)',
            color: 'var(--omnissiah-red)',
            cursor: frames.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: frames.length === 0 ? 0.5 : 1,
          }}
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--parchment-dim)' }}>
        <span>Delay (ms):</span>
        <input
          type="number"
          value={delay}
          onChange={(e) => setDelay(Math.max(50, parseInt(e.target.value) || 500))}
          style={{
            width: '60px',
            background: 'var(--iron-dark)',
            border: '1px solid var(--iron-gray)',
            color: 'var(--parchment)',
            padding: '2px 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
          }}
        />
        <span>{frames.length} frame(s)</span>
      </div>

      {frames.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '120px', overflow: 'auto' }}>
          {frames.map((frame, idx) => (
            <div key={frame.id} style={{ position: 'relative', border: '1px solid var(--iron-gray)' }}>
              <img src={frame.url} alt={`frame ${idx}`} style={{ width: '60px', height: '45px', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '0 4px' }}>
                {idx + 1}
              </div>
              <button
                onClick={() => removeFrame(frame.id)}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'var(--omnissiah-red)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '9px',
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                  lineHeight: '14px',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {gifUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', border: '1px solid var(--cogitator-gold)', padding: '12px' }}>
          <img src={gifUrl} alt="Generated GIF" style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid var(--iron-gray)' }} />
          <button
            onClick={downloadGif}
            style={{
              padding: '4px 16px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--cogitator-gold)',
              color: 'var(--cogitator-gold)',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Download size={12} />
            Download GIF
          </button>
        </div>
      )}

      {frames.length === 0 && (
        <div
          style={{
            border: '2px dashed var(--iron-gray)',
            borderRadius: '4px',
            padding: '32px',
            textAlign: 'center',
            color: 'var(--parchment-dim)',
            fontSize: '12px',
          }}
        >
          <ImageIcon size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <div>Select multiple images to create an animated GIF</div>
        </div>
      )}
    </div>
  );
}
