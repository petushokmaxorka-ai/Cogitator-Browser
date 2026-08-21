// ═══ DATA INQUISITOR ═══
// Postman-style API Tester + JSON Formatter for the Machine Spirit

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Star, StarOff, Trash2, Clock, Plus, X, ChevronDown } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface APIRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  starred?: boolean;
}

interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

interface HistoryEntry {
  request: APIRequest;
  response: APIResponse;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
type Method = (typeof METHODS)[number];

const METHOD_COLORS: Record<string, { color: string; glow: string }> = {
  GET:    { color: 'var(--noosphere-cyan)', glow: 'var(--glow-cyan)' },
  POST:   { color: 'var(--cogitator-gold)', glow: 'var(--glow-gold)' },
  PUT:    { color: 'var(--cogitator-gold)', glow: 'var(--glow-gold)' },
  PATCH:  { color: 'var(--cogitator-gold)', glow: 'var(--glow-gold)' },
  DELETE: { color: 'var(--omnissiah-red)',  glow: 'var(--glow-red)' },
  HEAD:   { color: 'var(--parchment-dim)',  glow: 'none' },
  OPTIONS:{ color: 'var(--parchment-dim)',  glow: 'none' },
};

const HISTORY_KEY = 'cogitator_api_history';

// ── JSON Syntax Highlighter ─────────────────────────────────

function highlightJSON(json: string): string {
  let formatted = json;
  try {
    formatted = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    // invalid JSON, highlight as-is
  }

  return formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"(\w+)":/g, '<span style="color:#C8A84B">"$1"</span>:') // keys gold
    .replace(/: "([^"]*)"/g, ': <span style="color:#00BFBF">"$1"</span>') // strings cyan
    .replace(/: (\d+)/g, ': <span style="color:#FF0000">$1</span>') // numbers red
    .replace(/: (true|false)/g, ': <span style="color:#D4C5A0">$1</span>') // booleans parchment
    .replace(/: (null)/g, ': <span style="color:#8B7D6B">$1</span>'); // null dim
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--noosphere-cyan)';
  if (status >= 300 && status < 400) return 'var(--cogitator-gold)';
  return 'var(--omnissiah-red)';
}

function getStatusGlow(status: number): string {
  if (status >= 200 && status < 300) return 'var(--glow-cyan)';
  if (status >= 300 && status < 400) return 'var(--glow-gold)';
  return 'var(--glow-red)';
}

// ── Component ───────────────────────────────────────────────

export default function APITester() {
  // ── State ─────────────────────────────────────────────────
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: 'Accept', value: '*/*' },
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'headers' | 'body'>('request');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const [urlSuggestions, setUrlSuggestions] = useState<string[]>([]);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Load history from localStorage ────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      }
    } catch (err) {
      console.warn('[APITester] Failed to load history:', err);
    }
  }, []);

  // ── Save history ──────────────────────────────────────────
  const saveHistory = useCallback((newHistory: HistoryEntry[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory.slice(0, 100)));
    } catch (err) {
      console.warn('[APITester] Failed to save history:', err);
    }
  }, []);

  // ── URL suggestions from history ──────────────────────────
  useEffect(() => {
    if (!url || url.length < 2) {
      setUrlSuggestions([]);
      return;
    }
    const suggestions = history
      .map((h) => h.request.url)
      .filter((u, i, arr) => u.toLowerCase().includes(url.toLowerCase()) && arr.indexOf(u) === i)
      .slice(0, 5);
    setUrlSuggestions(suggestions);
  }, [url, history]);

  // ── Headers handlers ──────────────────────────────────────
  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  const removeHeader = useCallback((index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateHeader = useCallback((index: number, field: 'key' | 'value', value: string) => {
    setHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  }, []);

  // ── Build headers record ──────────────────────────────────
  const buildHeadersRecord = useCallback((): Record<string, string> => {
    const record: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) {
        record[h.key.trim()] = h.value;
      }
    });
    return record;
  }, [headers]);

  // ── SEND request ──────────────────────────────────────────
  const sendRequest = useCallback(async () => {
    if (!url.trim()) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setResponse(null);

    const startTime = performance.now();

    try {
      const requestHeaders = buildHeadersRecord();
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal,
      };

      if (hasBody && body.trim()) {
        fetchOptions.body = body.trim();
      }

      const res = await fetch(url.trim(), fetchOptions);

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await res.text();
      const size = new Blob([responseBody]).size;

      const apiResponse: APIResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        time: responseTime,
        size,
      };

      setResponse(apiResponse);

      // Save to history
      const request: APIRequest = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        method,
        url: url.trim(),
        headers: requestHeaders,
        body: hasBody ? body.trim() : '',
        timestamp: Date.now(),
      };

      const entry: HistoryEntry = { request, response: apiResponse };
      saveHistory([entry, ...history].slice(0, 100));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const isAbort = err instanceof DOMException && err.name === 'AbortError';

      if (!isAbort) {
        const errorResponse: APIResponse = {
          status: 0,
          statusText: errorMessage,
          headers: {},
          body: JSON.stringify({ error: errorMessage }, null, 2),
          time: Math.round(performance.now() - startTime),
          size: 0,
        };
        setResponse(errorResponse);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [url, method, headers, body, history, buildHeadersRecord, saveHistory]);

  // ── Load from history ─────────────────────────────────────
  const loadFromHistory = useCallback(
    (entry: HistoryEntry) => {
      const { request } = entry;
      setMethod(request.method as Method);
      setUrl(request.url);
      const headerArray = Object.entries(request.headers).map(([key, value]) => ({
        key,
        value,
      }));
      setHeaders(headerArray.length > 0 ? headerArray : [{ key: '', value: '' }]);
      setBody(request.body);
      setResponse(entry.response);
      setShowHistory(false);
    },
    []
  );

  // ── Clear history ─────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  // ── Toggle star ───────────────────────────────────────────
  const toggleStar = useCallback(
    (entryId: string) => {
      const newHistory = history.map((h) =>
        h.request.id === entryId ? { ...h, request: { ...h.request, starred: !h.request.starred } } : h
      );
      saveHistory(newHistory);
    },
    [history, saveHistory]
  );

  // ── Format response body ──────────────────────────────────
  const formatResponseBody = useCallback((bodyText: string): string => {
    try {
      const parsed = JSON.parse(bodyText);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return bodyText;
    }
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
            color: 'var(--cogitator-gold)',
            fontSize: 'var(--font-size-md)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(200, 168, 75, 0.3)',
            marginBottom: '8px',
          }}
        >
          ⚙ DATA INQUISITOR
        </div>
        <div
          style={{
            color: 'var(--parchment-dim)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.1em',
          }}
        >
          API TESTER // JSON FORMATTER
        </div>
      </div>

      {/* ── Request Bar ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        {/* Method Dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowMethodDropdown(!showMethodDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              color: METHOD_COLORS[method]?.color || 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              minWidth: '80px',
              justifyContent: 'space-between',
            }}
          >
            {method}
            <ChevronDown size={12} />
          </button>
          {showMethodDropdown && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 99,
                }}
                onClick={() => setShowMethodDropdown(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 100,
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  minWidth: '100px',
                  marginTop: '2px',
                }}
              >
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMethod(m);
                      setShowMethodDropdown(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '6px 10px',
                      background: method === m ? 'var(--iron-gray)' : 'transparent',
                      border: 'none',
                      color: METHOD_COLORS[m]?.color || 'var(--parchment)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: method === m ? 'bold' : 'normal',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      textAlign: 'left',
                      letterSpacing: '0.08em',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--iron-gray)';
                    }}
                    onMouseLeave={(e) => {
                      if (method !== m) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* URL Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={urlInputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendRequest();
              if (e.key === 'Escape') setUrlSuggestions([]);
            }}
            placeholder="Enter URL..."
            style={{
              width: '100%',
              padding: '6px 10px',
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--omnissiah-red)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--iron-gray)';
              setTimeout(() => setUrlSuggestions([]), 200);
            }}
          />
          {/* URL Suggestions */}
          {urlSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                marginTop: '2px',
              }}
            >
              {urlSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUrl(suggestion);
                    setUrlSuggestions([]);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '6px 10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--iron-gray)';
                    e.currentTarget.style.color = 'var(--cogitator-gold)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--parchment)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SEND Button */}
        <button
          onClick={sendRequest}
          disabled={loading || !url.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            background: loading ? 'var(--iron-gray)' : 'var(--omnissiah-red-dim)',
            border: '1px solid var(--omnissiah-red)',
            color: 'var(--sacred-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'bold',
            cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            opacity: loading || !url.trim() ? 0.6 : 1,
            boxShadow: 'var(--glow-red)',
            transition: 'all 150ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!loading && url.trim()) {
              e.currentTarget.style.background = 'var(--omnissiah-red)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(255,0,0,0.6), 0 0 30px rgba(255,0,0,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--omnissiah-red-dim)';
            e.currentTarget.style.boxShadow = 'var(--glow-red)';
          }}
        >
          <Send size={12} />
          {loading ? '...' : 'SEND'}
        </button>
      </div>

      {/* ── Request Tabs ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        {(['request', 'headers', 'body'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              textShadow: activeTab === tab ? '0 0 8px rgba(255,0,0,0.4)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) e.currentTarget.style.color = 'var(--parchment)';
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) e.currentTarget.style.color = 'var(--parchment-dim)';
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Request Content ───────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="scrollbar-thin"
      >
        {/* Headers Tab */}
        {activeTab === 'headers' && (
          <div style={{ padding: '10px 12px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 30px',
                gap: '6px',
                marginBottom: '8px',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--parchment-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <span>Key</span>
              <span>Value</span>
              <span />
            </div>
            {headers.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 30px',
                  gap: '6px',
                  marginBottom: '6px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => updateHeader(i, 'key', e.target.value)}
                  placeholder="Header key"
                  style={{
                    padding: '4px 8px',
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--cogitator-gold)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--omnissiah-red)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--iron-gray)';
                  }}
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => updateHeader(i, 'value', e.target.value)}
                  placeholder="Header value"
                  style={{
                    padding: '4px 8px',
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--noosphere-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--omnissiah-red)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--iron-gray)';
                  }}
                />
                <button
                  onClick={() => removeHeader(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--parchment-dim)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--omnissiah-red)';
                    e.currentTarget.style.color = 'var(--omnissiah-red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={addHeader}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                marginTop: '4px',
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
              <Plus size={10} />
              Add Header
            </button>
          </div>
        )}

        {/* Body Tab */}
        {activeTab === 'body' && ['POST', 'PUT', 'PATCH'].includes(method) && (
          <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`{\n  "key": "value"\n}`}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: '120px',
                padding: '10px',
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.5,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--omnissiah-red)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--iron-gray)';
              }}
            />
          </div>
        )}
        {activeTab === 'body' && !['POST', 'PUT', 'PATCH'].includes(method) && (
          <div
            style={{
              padding: '20px',
              color: 'var(--parchment-dim)',
              fontSize: 'var(--font-size-xs)',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Body not available for {method} requests
          </div>
        )}

        {/* Request Tab (default info) */}
        {activeTab === 'request' && (
          <div style={{ padding: '10px 12px' }}>
            <div
              style={{
                color: 'var(--parchment-dim)',
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px',
              }}
            >
              Request Preview
            </div>
            <pre
              style={{
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                padding: '10px',
                color: 'var(--noosphere-cyan)',
                fontSize: 'var(--font-size-xs)',
                lineHeight: 1.6,
                overflow: 'auto',
                margin: 0,
              }}
            >
              <span style={{ color: METHOD_COLORS[method]?.color }}>{method}</span>{' '}
              <span style={{ color: 'var(--parchment)' }}>{url || '...'}</span>
              {'\n'}
              {Object.entries(buildHeadersRecord()).map(([k, v]) => (
                <span key={k}>
                  <span style={{ color: 'var(--cogitator-gold)' }}>{k}</span>
                  <span style={{ color: 'var(--parchment-dim)' }}>: </span>
                  <span style={{ color: 'var(--noosphere-cyan)' }}>{v}</span>
                  {'\n'}
                </span>
              ))}
            </pre>
          </div>
        )}

        {/* ── Response Section ────────────────────────────── */}
        {response && (
          <>
            <div
              style={{
                borderTop: '2px solid var(--iron-gray)',
                padding: '10px 12px',
                background: 'var(--iron-dark)',
              }}
            >
              {/* Response Meta */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    color: getStatusColor(response.status),
                    fontWeight: 'bold',
                    fontSize: 'var(--font-size-md)',
                    textShadow: getStatusGlow(response.status),
                  }}
                >
                  {response.status > 0 ? `${response.status} ${response.statusText}` : response.statusText}
                </span>
                <span style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)' }}>
                  {response.time}ms
                </span>
                <span style={{ color: 'var(--parchment-dim)', fontSize: 'var(--font-size-xs)' }}>
                  {response.size > 1024 ? `${(response.size / 1024).toFixed(1)}KB` : `${response.size}B`}
                </span>
              </div>

              {/* Response Tabs */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['body', 'headers'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setResponseTab(tab)}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom:
                        responseTab === tab ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
                      color: responseTab === tab ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--font-size-xs)',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                    onMouseEnter={(e) => {
                      if (responseTab !== tab) e.currentTarget.style.color = 'var(--parchment)';
                    }}
                    onMouseLeave={(e) => {
                      if (responseTab !== tab) e.currentTarget.style.color = 'var(--parchment-dim)';
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Response Content */}
            <div style={{ padding: '10px 12px', overflow: 'auto', flex: 1 }} className="scrollbar-thin">
              {responseTab === 'body' && (
                <pre
                  style={{
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    padding: '10px',
                    margin: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-xs)',
                    lineHeight: 1.6,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: highlightJSON(formatResponseBody(response.body)),
                  }}
                />
              )}
              {responseTab === 'headers' && (
                <div
                  style={{
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    padding: '10px',
                  }}
                >
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        lineHeight: 1.8,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span style={{ color: 'var(--cogitator-gold)' }}>{k}</span>
                      <span style={{ color: 'var(--parchment-dim)' }}>: </span>
                      <span style={{ color: 'var(--noosphere-cyan)' }}>{v}</span>
                    </div>
                  ))}
                  {Object.keys(response.headers).length === 0 && (
                    <span style={{ color: 'var(--parchment-dim)' }}>No response headers</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── History Section ─────────────────────────────── */}
        <div
          style={{
            borderTop: '2px solid var(--iron-gray)',
            flexShrink: 0,
            maxHeight: showHistory ? '200px' : '36px',
            transition: 'max-height 200ms ease',
            overflow: 'hidden',
          }}
        >
          {/* History Header */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 12px',
              background: 'var(--iron-dark)',
              border: 'none',
              borderBottom: showHistory ? '1px solid var(--iron-gray)' : 'none',
              color: 'var(--cogitator-gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} />
              History ({history.length})
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {history.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHistory();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--parchment-dim)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--omnissiah-red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--parchment-dim)';
                  }}
                  title="Clear history"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <span style={{ fontSize: '10px' }}>{showHistory ? '▲' : '▼'}</span>
            </div>
          </button>

          {/* History List */}
          {showHistory && (
            <div
              style={{
                overflow: 'auto',
                maxHeight: '164px',
              }}
              className="scrollbar-thin"
            >
              {history.length === 0 && (
                <div
                  style={{
                    padding: '12px',
                    color: 'var(--parchment-dim)',
                    fontSize: 'var(--font-size-xs)',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                  }}
                >
                  No requests yet
                </div>
              )}
              {history.map((entry, idx) => (
                <div
                  key={entry.request.id || idx}
                  onClick={() => loadFromHistory(entry)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderBottom: '1px solid var(--iron-gray)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-xs)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--iron-gray)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(entry.request.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: entry.request.starred ? 'var(--cogitator-gold)' : 'var(--parchment-dim)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {entry.request.starred ? <Star size={10} /> : <StarOff size={10} />}
                  </button>

                  {/* Method */}
                  <span
                    style={{
                      color: METHOD_COLORS[entry.request.method]?.color || 'var(--parchment)',
                      fontWeight: 'bold',
                      minWidth: '52px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {entry.request.method}
                  </span>

                  {/* URL */}
                  <span
                    style={{
                      flex: 1,
                      color: 'var(--parchment)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.request.url}
                  </span>

                  {/* Status */}
                  <span
                    style={{
                      color: getStatusColor(entry.response.status),
                      fontWeight: 'bold',
                      minWidth: '50px',
                      textAlign: 'right',
                    }}
                  >
                    {entry.response.status > 0 ? entry.response.status : 'ERR'}
                  </span>

                  {/* Time */}
                  <span
                    style={{
                      color: 'var(--parchment-dim)',
                      minWidth: '40px',
                      textAlign: 'right',
                    }}
                  >
                    {entry.response.time}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
