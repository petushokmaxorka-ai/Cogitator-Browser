// ═══ DOCKER UI ═══
// Docker container management — Oversee the sacred machine-spirits of containers
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace

import { useState, useCallback, useEffect } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Box,
  HardDrive,
  Network,
  Tag,
  Terminal,
  Container,
  Layers,
  Database,
  Globe,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface DockerContainer {
  id: string;
  fullId: string;
  name: string;
  image: string;
  status: 'running' | 'exited' | 'paused' | 'restarting';
  ports: string;
}

interface DockerImage {
  name: string;
  tag: string;
  size: string;
  created: string;
}

interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  size: string;
}

interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

type DockerTab = 'containers' | 'images' | 'volumes' | 'networks';

// ── Helpers ──────────────────────────────────────────────────

function statusColor(status: DockerContainer['status']): string {
  switch (status) {
    case 'running': return '#00ff00';
    case 'exited': return 'var(--omnissiah-red)';
    case 'paused': return 'var(--cogitator-gold)';
    case 'restarting': return 'var(--mechanicus-teal)';
    default: return 'var(--parchment-dim)';
  }
}

// ── Component ────────────────────────────────────────────────

export default function DockerUI(): JSX.Element {
  const [activeTab, setActiveTab] = useState<DockerTab>('containers');
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [dockerHost] = useState<string>('localhost');
  const [error, setError] = useState('');

  const mapStatus = (s: string): DockerContainer['status'] => {
    if (/up|running/i.test(s)) return 'running';
    if (/restart/i.test(s)) return 'restarting';
    return 'exited';
  };

  const refresh = useCallback(async () => {
    const api = window.electronAPI?.docker;
    if (!api) return;
    try {
      const raw = await api.listContainers();
      setContainers(
        raw.map((c: { id: string; name: string; image: string; status: string; ports: string; created: string }) => ({
          id: c.id.slice(0, 12),
          fullId: c.id,
          name: c.name,
          image: c.image,
          status: mapStatus(c.status),
          ports: c.ports,
        })),
      );
      const rawImages = await api.listImages();
      setImages(
        rawImages.map((img: { repository: string; tag: string; size: string; created: string }) => ({
          name: img.repository,
          tag: img.tag,
          size: img.size,
          created: img.created,
        })),
      );
      const rawVolumes = await api.listVolumes();
      setVolumes(
        rawVolumes.map((vol: { name: string; driver: string; mountpoint: string }) => ({
          name: vol.name,
          driver: vol.driver,
          mountpoint: vol.mountpoint,
          size: '—',
        })),
      );
      setNetworks(await api.listNetworks());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startContainer = useCallback(async (fullId: string) => {
    await window.electronAPI?.docker?.start?.(fullId);
    await refresh();
  }, [refresh]);

  const stopContainer = useCallback(async (fullId: string) => {
    await window.electronAPI?.docker?.stop?.(fullId);
    await refresh();
  }, [refresh]);

  const restartContainer = useCallback(async (fullId: string) => {
    await window.electronAPI?.docker?.restart?.(fullId);
    await refresh();
  }, [refresh]);

  const removeContainer = useCallback(async (fullId: string, shortId: string) => {
    await window.electronAPI?.docker?.remove?.(fullId);
    if (selectedContainer === shortId) {
      setSelectedContainer(null);
      setLogs('');
    }
    await refresh();
  }, [refresh, selectedContainer]);

  const viewLogs = useCallback(async (container: DockerContainer) => {
    setSelectedContainer(container.id);
    const text = await window.electronAPI?.docker?.logs?.(container.fullId);
    setLogs(text ?? '');
  }, []);

  // ── Tab Config ────────────────────────────────────────────

  const tabs: { id: DockerTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'containers', label: 'Containers', icon: <Container size={12} />, count: containers.length },
    { id: 'images', label: 'Images', icon: <Layers size={12} />, count: images.length },
    { id: 'volumes', label: 'Volumes', icon: <Database size={12} />, count: volumes.length },
    { id: 'networks', label: 'Networks', icon: <Globe size={12} />, count: networks.length },
  ];

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--void-black)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--parchment)',
        overflow: 'hidden',
      }}
    >
      {/* ═══ HEADER ═══ */}
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
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
          }}
        >
          <Box size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Docker UI
        </div>
        <div style={{ color: 'var(--parchment-dim)', fontSize: '10px', marginTop: '4px', letterSpacing: '0.08em' }}>
          Host: <span style={{ color: 'var(--mechanicus-teal)' }}>{dockerHost}</span>
          {' | '}
          Running: <span style={{ color: '#00ff00' }}>{containers.filter((c) => c.status === 'running').length}</span>
          {' | '}
          Total: <span style={{ color: 'var(--parchment)' }}>{containers.length}</span>
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedContainer(null); setLogs(''); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 6px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              textShadow: activeTab === tab.id ? '0 0 8px rgba(255, 0, 0, 0.4)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
            <span
              style={{
                background: 'var(--iron-gray)',
                borderRadius: '8px',
                padding: '1px 5px',
                fontSize: '9px',
                color: 'var(--parchment-dim)',
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>

        {/* ── Containers Tab ── */}
        {activeTab === 'containers' && (
          <div>
            {containers.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '8px 10px',
                  marginBottom: '6px',
                  background: selectedContainer === c.id ? 'rgba(255, 0, 0, 0.05)' : 'var(--iron-dark)',
                  border: `1px solid ${selectedContainer === c.id ? 'var(--omnissiah-red)' : 'var(--iron-gray)'}`,
                  borderRadius: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <HardDrive size={12} style={{ color: 'var(--mechanicus-teal)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--parchment)' }}>{c.name}</span>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: statusColor(c.status),
                        boxShadow: `0 0 6px ${statusColor(c.status)}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '9px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>{c.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {c.status !== 'running' && (
                      <button
                        onClick={() => startContainer(c.fullId)}
                        title="Start"
                        style={{
                          padding: '3px 6px',
                          background: 'transparent',
                          border: '1px solid var(--iron-gray)',
                          borderRadius: '2px',
                          color: '#00ff00',
                          cursor: 'pointer',
                        }}
                      >
                        <Play size={10} />
                      </button>
                    )}
                    {c.status === 'running' && (
                      <button
                        onClick={() => stopContainer(c.fullId)}
                        title="Stop"
                        style={{
                          padding: '3px 6px',
                          background: 'transparent',
                          border: '1px solid var(--iron-gray)',
                          borderRadius: '2px',
                          color: 'var(--omnissiah-red)',
                          cursor: 'pointer',
                        }}
                      >
                        <Square size={10} />
                      </button>
                    )}
                    <button
                      onClick={() => restartContainer(c.fullId)}
                      title="Restart"
                      style={{
                        padding: '3px 6px',
                        background: 'transparent',
                        border: '1px solid var(--iron-gray)',
                        borderRadius: '2px',
                        color: 'var(--cogitator-gold)',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCw size={10} />
                    </button>
                    <button
                      onClick={() => viewLogs(c)}
                      title="Logs"
                      style={{
                        padding: '3px 6px',
                        background: 'transparent',
                        border: '1px solid var(--iron-gray)',
                        borderRadius: '2px',
                        color: 'var(--mechanicus-teal)',
                        cursor: 'pointer',
                      }}
                    >
                      <Terminal size={10} />
                    </button>
                    <button
                      onClick={() => void removeContainer(c.fullId, c.id)}
                      title="Remove"
                      style={{
                        padding: '3px 6px',
                        background: 'transparent',
                        border: '1px solid var(--iron-gray)',
                        borderRadius: '2px',
                        color: 'var(--omnissiah-red)',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--parchment-dim)', marginTop: '4px', paddingLeft: '20px' }}>
                  {c.image} | ports: {c.ports} | id: {c.id}
                </div>
              </div>
            ))}
            {containers.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--parchment-dim)', fontSize: '11px', marginTop: '20px', opacity: 0.5 }}>
                No containers — the forge is silent
              </div>
            )}

            {/* Logs Viewer */}
            {logs && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  borderRadius: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Terminal size={10} style={{ color: 'var(--mechanicus-teal)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--cogitator-gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Logs: {containers.find((c) => c.id === selectedContainer)?.name}
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    color: 'var(--parchment-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {logs}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── Images Tab ── */}
        {activeTab === 'images' && (
          <div>
            {images.map((img) => (
              <div
                key={`${img.name}:${img.tag}`}
                style={{
                  padding: '8px 10px',
                  marginBottom: '6px',
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <Layers size={12} style={{ color: 'var(--cogitator-gold)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.name}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--parchment-dim)', marginTop: '2px' }}>
                      <Tag size={8} style={{ display: 'inline', verticalAlign: 'middle' }} /> {img.tag}
                      {' | '}
                      {img.size}
                      {' | '}
                      {img.created}
                    </div>
                  </div>
                </div>
                <button
                  title="Remove image"
                  style={{
                    padding: '3px 6px',
                    background: 'transparent',
                    border: '1px solid var(--iron-gray)',
                    borderRadius: '2px',
                    color: 'var(--omnissiah-red)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Volumes Tab ── */}
        {activeTab === 'volumes' && (
          <div>
            {volumes.map((vol) => (
              <div
                key={vol.name}
                style={{
                  padding: '8px 10px',
                  marginBottom: '6px',
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  borderRadius: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={12} style={{ color: 'var(--mechanicus-teal)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--parchment)' }}>{vol.name}</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--parchment-dim)', marginTop: '4px', paddingLeft: '20px' }}>
                  driver: {vol.driver} | size: {vol.size}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--parchment-dim)', paddingLeft: '20px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {vol.mountpoint}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Networks Tab ── */}
        {activeTab === 'networks' && (
          <div>
            {networks.map((net) => (
              <div
                key={net.id}
                style={{
                  padding: '8px 10px',
                  marginBottom: '6px',
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <Network size={12} style={{ color: 'var(--cogitator-gold)' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--parchment)' }}>{net.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--parchment-dim)', marginTop: '2px' }}>
                      driver: {net.driver} | scope: {net.scope} | id: {net.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ FOOTER ═══ */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--iron-gray)',
          flexShrink: 0,
          fontSize: '9px',
          color: 'var(--parchment-dim)',
          letterSpacing: '0.08em',
          textAlign: 'center',
        }}
      >
        docker CLI via main process · {error ? `⚠ ${error}` : 'ready'}
      </div>
    </div>
  );
}
