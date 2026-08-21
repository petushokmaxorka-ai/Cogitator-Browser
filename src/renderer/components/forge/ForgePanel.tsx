import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const FORGE_URL = 'http://127.0.0.1:9091';

export default function ForgePanel(): JSX.Element {
  const [online, setOnline] = useState<boolean | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const probeForge = useCallback(async () => {
    try {
      const res = await fetch(FORGE_URL, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2500),
      });
      setOnline(res.ok || res.status < 500);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    void probeForge();
    const interval = setInterval(() => {
      void probeForge();
    }, 15000);
    return () => clearInterval(interval);
  }, [probeForge, reloadKey]);

  const handleReload = () => {
    setReloadKey((k) => k + 1);
    void probeForge();
  };

  const statusColor =
    online === null ? '#888' : online ? '#00ff00' : 'var(--omnissiah-red)';
  const statusLabel =
    online === null ? 'checking…' : online ? 'online' : 'offline';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000000' }}>
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div
          style={{
            color: '#C8A84B',
            fontFamily: 'monospace',
            fontSize: '11px',
            letterSpacing: '0.12em',
          }}
        >
          ◉ HERETIC FORGE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              color: statusColor,
              letterSpacing: '0.08em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: statusColor,
                marginRight: '6px',
                boxShadow: online ? `0 0 6px ${statusColor}` : 'none',
              }}
            />
            :9091 {statusLabel}
          </span>
          <button
            type="button"
            onClick={handleReload}
            title="Reload Forge"
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid #2A2A2A',
              borderRadius: '2px',
              color: '#C8A84B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      {!online && online !== null && (
        <div
          style={{
            padding: '8px 12px',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#8B7D6B',
            borderBottom: '1px solid #2A2A2A',
          }}
        >
          Forge не отвечает на {FORGE_URL} — запусти сервис и нажми Reload.
        </div>
      )}
      <iframe
        key={reloadKey}
        ref={iframeRef}
        title="Heretic Forge"
        src={FORGE_URL}
        style={{ flex: 1, border: 'none', width: '100%', background: '#000000' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
