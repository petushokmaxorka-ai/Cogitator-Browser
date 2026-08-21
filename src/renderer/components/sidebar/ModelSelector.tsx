// ═══ MODEL SELECTOR ═══
// Ollama model selection dropdown with connection status

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { ANATHEMETRON_SWARM_MODELS } from '../../../shared/constants';

// ── Types ───────────────────────────────────────────────────

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

// ── Component ───────────────────────────────────────────────

export default function ModelSelector({
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // ── Fetch models ──────────────────────────────────────────

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check Ollama status
      const status = await window.electronAPI.ollama.checkStatus();
      setIsOnline(status);

      if (status) {
        const modelList = await window.electronAPI.ollama.listModels();
        setModels(modelList);

        // Auto-select first model if none selected
        if (modelList.length > 0 && !selectedModel) {
          const preferred =
            ANATHEMETRON_SWARM_MODELS.map((name) => modelList.find((m) => m === name)).find(Boolean) ??
            modelList.find((m) => m.toLowerCase().includes('anathemetron')) ??
            modelList[0];
          onModelChange(preferred);
        }
      } else {
        setModels([]);
      }
    } catch (error) {
      console.error('[ModelSelector] Error fetching models:', error);
      setIsOnline(false);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, onModelChange]);

  // Initial load
  useEffect(() => {
    fetchModels();
    // Periodic status check every 10s
    const interval = setInterval(() => {
      window.electronAPI.ollama.checkStatus().then(setIsOnline).catch(() => setIsOnline(false));
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  // ── Handlers ──────────────────────────────────────────────

  const handleRefresh = () => {
    fetchModels();
  };

  const handleSelect = (model: string) => {
    onModelChange(model);
    setIsOpen(false);
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        background: 'var(--iron-dark)',
        borderBottom: '1px solid var(--iron-gray)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Connection Status */}
      <div
        title={isOnline ? 'Ollama Online' : 'Ollama Offline'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOnline ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)',
            boxShadow: isOnline
              ? '0 0 6px var(--noosphere-cyan-glow)'
              : '0 0 6px var(--omnissiah-red-glow)',
          }}
        />
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: isOnline ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Divider */}
      <span style={{ color: 'var(--iron-gray)', fontSize: '10px' }}>│</span>

      {/* Model Dropdown */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={!isOnline || models.length === 0}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            padding: '4px 8px',
            background: 'var(--void-black)',
            border: '1px solid var(--iron-gray)',
            color: isOnline ? 'var(--sacred-white)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            cursor: isOnline ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedModel || 'No Model'}
          </span>
          <ChevronDown
            size={12}
            style={{
              flexShrink: 0,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
              opacity: isOnline ? 1 : 0.3,
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && isOnline && models.length > 0 && (
          <>
            {/* Backdrop click to close */}
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 50,
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {models.map((model) => (
                <button
                  key={model}
                  onClick={() => handleSelect(model)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    background:
                      model === selectedModel
                        ? 'rgba(255, 0, 0, 0.1)'
                        : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--iron-gray)',
                    color:
                      model === selectedModel
                        ? 'var(--omnissiah-red)'
                        : 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    textTransform: 'uppercase' as const,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      model === selectedModel
                        ? 'rgba(255, 0, 0, 0.1)'
                        : 'transparent';
                  }}
                >
                  {model === selectedModel && (
                    <span style={{ color: 'var(--omnissiah-red)', fontSize: '10px' }}>►</span>
                  )}
                  {model === selectedModel && (
                    <span style={{ flex: 1 }}>{model}</span>
                  )}
                  {model !== selectedModel && (
                    <span style={{ paddingLeft: '16px', flex: 1 }}>{model}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        title="Refresh models"
        disabled={isLoading}
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          background: 'var(--void-black)',
          border: '1px solid var(--iron-gray)',
          color: 'var(--parchment-dim)',
          cursor: 'pointer',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
          e.currentTarget.style.color = 'var(--sacred-white)';
          e.currentTarget.style.boxShadow = 'var(--glow-red)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--iron-gray)';
          e.currentTarget.style.color = 'var(--parchment-dim)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <RefreshCw
          size={12}
          style={{
            animation: isLoading ? 'spin-cog 1s linear infinite' : 'none',
          }}
        />
      </button>
    </div>
  );
}
