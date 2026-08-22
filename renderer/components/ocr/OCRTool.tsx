import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, Copy, Trash2 } from 'lucide-react';
import Tesseract from 'tesseract.js';

export default function OCRTool(): JSX.Element {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setText('');
    setLoading(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(
        url,
        'eng+rus',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        }
      );
      setText(result.data.text);
    } catch (err) {
      setText('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [handleFile]);

  const copyText = useCallback(() => {
    navigator.clipboard.writeText(text);
  }, [text]);

  const clear = useCallback(() => {
    if (image) URL.revokeObjectURL(image);
    setImage(null);
    setText('');
    setLoading(false);
    setProgress(0);
  }, [image]);

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
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={onPaste}
    >
      <div style={{ color: 'var(--cogitator-gold)', fontSize: 12, letterSpacing: '0.1em' }}>
        ◉ OCR — Optical Character Recognition
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!image && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--iron-gray)',
            borderRadius: '4px',
            padding: '32px',
            textAlign: 'center',
            color: 'var(--parchment-dim)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          <Upload size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <div>Drop image here, click to browse, or paste (Ctrl+V)</div>
        </div>
      )}

      {image && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img
            src={image}
            alt="OCR source"
            style={{ maxHeight: '200px', objectFit: 'contain', border: '1px solid var(--iron-gray)' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={clear}
              style={{
                padding: '4px 12px',
                background: 'var(--iron-dark)',
                border: '1px solid var(--omnissiah-red)',
                color: 'var(--omnissiah-red)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              <Trash2 size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Clear
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '4px 12px',
                background: 'var(--iron-dark)',
                border: '1px solid var(--noosphere-cyan)',
                color: 'var(--noosphere-cyan)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              <Upload size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              New Image
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--parchment-dim)', fontSize: '11px' }}>
          <Loader2 size={14} className="animate-spin" />
          Recognizing... {progress}%
        </div>
      )}

      {text && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--parchment-dim)', fontSize: '11px' }}>
              <FileText size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Recognized Text
            </span>
            <button
              onClick={copyText}
              style={{
                padding: '2px 8px',
                background: 'transparent',
                border: '1px solid var(--cogitator-gold)',
                color: 'var(--cogitator-gold)',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              <Copy size={10} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Copy
            </button>
          </div>
          <textarea
            readOnly
            value={text}
            style={{
              flex: 1,
              minHeight: '120px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment)',
              padding: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              resize: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
