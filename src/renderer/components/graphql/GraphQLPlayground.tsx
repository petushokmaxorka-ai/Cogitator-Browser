// ═══ GRAPHQL PLAYGROUND ═══
// GraphQL IDE — Query the sacred data archives of the Machine God
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace

import { useState, useCallback } from 'react';
import { Play, Copy, Check, BookOpen, Trash2, Globe } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface QueryTemplate {
  name: string;
  query: string;
  variables?: string;
}

interface HeaderEntry {
  key: string;
  value: string;
}

interface GqlSchemaType {
  name: string;
  kind: string;
  fields: Array<{ name: string; type: string }>;
}

const INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    types {
      kind
      name
      fields {
        name
        type { name kind ofType { name kind ofType { name kind } } }
      }
    }
  }
}`;

function gqlTypeLabel(typeObj: {
  name?: string | null;
  kind?: string | null;
  ofType?: { name?: string | null; kind?: string | null; ofType?: unknown } | null;
} | null | undefined): string {
  if (!typeObj) return 'Unknown';
  if (typeObj.name) return typeObj.name;
  const inner = typeObj.ofType as typeof typeObj | undefined;
  if (inner?.name) return inner.name;
  if (inner?.kind) return gqlTypeLabel(inner);
  return typeObj.kind ?? 'Unknown';
}

// ── Constants ────────────────────────────────────────────────

const SAMPLE_QUERIES: QueryTemplate[] = [
  {
    name: 'Get Users',
    query: 'query {\n  users {\n    id\n    name\n    email\n  }\n}',
  },
  {
    name: 'Get User',
    query: 'query($id: ID!) {\n  user(id: $id) {\n    id\n    name\n    posts {\n      title\n    }\n  }\n}',
    variables: '{ "id": "1" }',
  },
  {
    name: 'Create User',
    query: 'mutation($name: String!, $email: String!) {\n  createUser(name: $name, email: $email) {\n    id\n    name\n  }\n}',
    variables: '{ "name": "Tech-Priest", "email": "priest@mechanicus.adeptus" }',
  },
  {
    name: 'Introspection',
    query: 'query {\n  __schema {\n    types {\n      name\n      kind\n    }\n  }\n}',
  },
  {
    name: 'Subscriptions (stub)',
    query: 'subscription {\n  dataStream {\n    id\n    payload\n  }\n}',
  },
];

const STORAGE_KEY_ENDPOINT = 'cogitator-gql-endpoint';

// ── Helpers ──────────────────────────────────────────────────

function formatJson(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

// ── Component ────────────────────────────────────────────────

export default function GraphQLPlayground(): JSX.Element {
  const [endpoint, setEndpoint] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY_ENDPOINT) || 'http://localhost:4000/graphql'; }
    catch { return 'http://localhost:4000/graphql'; }
  });
  const [query, setQuery] = useState<string>('');
  const [variables, setVariables] = useState<string>('');
  const [headers, setHeaders] = useState<HeaderEntry[]>([
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeEditorTab, setActiveEditorTab] = useState<'query' | 'variables' | 'headers'>('query');
  const [schemaOpen, setSchemaOpen] = useState<boolean>(false);
  const [schemaTypes, setSchemaTypes] = useState<GqlSchemaType[]>([]);
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);
  const [schemaError, setSchemaError] = useState<string>('');

  // ── Handlers ──────────────────────────────────────────────

  const handleEndpointChange = useCallback((val: string) => {
    setEndpoint(val);
    try { localStorage.setItem(STORAGE_KEY_ENDPOINT, val); }
    catch { /* */ }
  }, []);

  const handleTemplateChange = useCallback((name: string) => {
    setSelectedTemplate(name);
    const tmpl = SAMPLE_QUERIES.find((q) => q.name === name);
    if (tmpl) {
      setQuery(tmpl.query);
      if (tmpl.variables) setVariables(tmpl.variables);
    }
  }, []);

  const fetchSchema = useCallback(async () => {
    if (!endpoint.trim()) return;
    setSchemaLoading(true);
    setSchemaError('');
    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.value) headerObj[h.key] = h.value;
      });
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...headerObj, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: INTROSPECTION_QUERY }),
      });
      const data = (await res.json()) as {
        errors?: Array<{ message?: string }>;
        data?: {
          __schema?: {
            types?: Array<{
              kind?: string;
              name?: string;
              fields?: Array<{
                name?: string;
                type?: {
                  name?: string | null;
                  kind?: string | null;
                  ofType?: { name?: string | null; kind?: string | null; ofType?: unknown } | null;
                };
              }> | null;
            }>;
          };
        };
      };
      if (data.errors?.length) {
        throw new Error(data.errors[0]?.message ?? 'Introspection failed');
      }
      const types = (data.data?.__schema?.types ?? [])
        .filter((t) => t.name && !t.name.startsWith('__'))
        .map((t) => ({
          name: t.name ?? '',
          kind: t.kind ?? '',
          fields: (t.fields ?? []).map((f) => ({
            name: f.name ?? '',
            type: gqlTypeLabel(f.type ?? null),
          })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setSchemaTypes(types);
      setSchemaOpen(true);
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : 'Schema fetch failed');
      setSchemaOpen(true);
    } finally {
      setSchemaLoading(false);
    }
  }, [endpoint, headers]);

  const insertTypeQuery = useCallback(
    (typeName: string, kind: string, fields: Array<{ name: string }>) => {
      const root =
        kind === 'OBJECT'
          ? `${typeName.charAt(0).toLowerCase()}${typeName.slice(1)}s`
          : typeName.charAt(0).toLowerCase() + typeName.slice(1);
      const fieldLines = fields.slice(0, 8).map((f) => `    ${f.name}`).join('\n');
      const q = `query {\n  ${root} {\n${fieldLines || '    id'}\n  }\n}`;
      setQuery(q);
      setActiveEditorTab('query');
    },
    [],
  );

  const executeQuery = useCallback(async () => {
    if (!query.trim() || !endpoint.trim()) return;
    setLoading(true);
    setResponse('');

    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => { if (h.key && h.value) headerObj[h.key] = h.value; });

      const body: Record<string, unknown> = { query: query.trim() };
      if (variables.trim()) {
        try { body.variables = JSON.parse(variables); }
        catch { setResponse('// ERROR: Invalid JSON in variables field'); setLoading(false); return; }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...headerObj, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(`// ERROR: ${err instanceof Error ? err.message : 'Request failed'}\n// Ensure the GraphQL endpoint is accessible.`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, query, variables, headers]);

  const copyResponse = useCallback(() => {
    if (!response) return;
    navigator.clipboard.writeText(response).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* */ });
  }, [response]);

  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  const updateHeader = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setHeaders((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  }, []);

  const removeHeader = useCallback((index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setQuery('');
    setVariables('');
    setResponse('');
    setSelectedTemplate('');
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
            marginBottom: '8px',
            textShadow: '0 0 8px rgba(200, 168, 75, 0.3)',
          }}
        >
          ◆ GraphQL Playground
        </div>

        {/* Endpoint */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Globe size={12} style={{ color: 'var(--mechanicus-teal)', flexShrink: 0 }} />
          <input
            type="text"
            value={endpoint}
            onChange={(e) => handleEndpointChange(e.target.value)}
            placeholder="http://localhost:4000/graphql"
            style={{
              flex: 1,
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              borderRadius: '2px',
              padding: '5px 8px',
              color: 'var(--parchment)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              outline: 'none',
            }}
          />
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{
              background: 'var(--iron-dark)',
              border: '1px solid var(--iron-gray)',
              borderRadius: '2px',
              padding: '4px 6px',
              color: 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">— Query Template —</option>
            {SAMPLE_QUERIES.map((q) => (
              <option key={q.name} value={q.name}>{q.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══ EDITOR TABS ═══ */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        {(['query', 'variables', 'headers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveEditorTab(tab)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeEditorTab === tab ? '2px solid var(--omnissiah-red)' : '2px solid transparent',
              color: activeEditorTab === tab ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              textShadow: activeEditorTab === tab ? '0 0 8px rgba(255, 0, 0, 0.4)' : 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ═══ EDITOR AREA ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Query Editor */}
        {activeEditorTab === 'query' && (
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter GraphQL query..."
            style={{
              flex: 1,
              width: '100%',
              background: 'var(--iron-dark)',
              border: 'none',
              padding: '10px 12px',
              color: 'var(--mechanicus-teal)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            spellCheck={false}
          />
        )}

        {/* Variables Editor */}
        {activeEditorTab === 'variables' && (
          <textarea
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            placeholder='{ "key": "value" }'
            style={{
              flex: 1,
              width: '100%',
              background: 'var(--iron-dark)',
              border: 'none',
              padding: '10px 12px',
              color: 'var(--cogitator-gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            spellCheck={false}
          />
        )}

        {/* Headers Editor */}
        {activeEditorTab === 'headers' && (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
            }}
          >
            {headers.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => updateHeader(i, 'key', e.target.value)}
                  placeholder="Header"
                  style={{
                    flex: 1,
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    borderRadius: '2px',
                    padding: '4px 6px',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => updateHeader(i, 'value', e.target.value)}
                  placeholder="Value"
                  style={{
                    flex: 1,
                    background: 'var(--iron-dark)',
                    border: '1px solid var(--iron-gray)',
                    borderRadius: '2px',
                    padding: '4px 6px',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => removeHeader(i)}
                  style={{
                    padding: '4px 6px',
                    background: 'transparent',
                    border: '1px solid var(--iron-gray)',
                    borderRadius: '2px',
                    color: 'var(--parchment-dim)',
                    cursor: 'pointer',
                    fontSize: '10px',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addHeader}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px dashed var(--iron-gray)',
                borderRadius: '2px',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              + Add Header
            </button>
          </div>
        )}
      </div>

      {/* ═══ EXECUTE BAR ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderTop: '1px solid var(--iron-gray)',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        <button
          onClick={executeQuery}
          disabled={loading || !query.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 16px',
            background: loading ? 'var(--iron-gray)' : 'var(--omnissiah-red)',
            border: 'none',
            borderRadius: '2px',
            color: '#000000',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Play size={12} />
          {loading ? 'Querying...' : 'Execute'}
        </button>
        <button
          onClick={copyResponse}
          disabled={!response}
          title="Copy response"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            borderRadius: '2px',
            color: copied ? 'var(--mechanicus-teal)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            cursor: response ? 'pointer' : 'not-allowed',
            opacity: response ? 1 : 0.3,
          }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={clearAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            background: 'transparent',
            border: '1px solid var(--iron-gray)',
            borderRadius: '2px',
            color: 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={10} />
          Clear
        </button>
        <button
          onClick={() => void fetchSchema()}
          disabled={schemaLoading || !endpoint.trim()}
          title="Schema Explorer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            background: schemaOpen ? 'rgba(0, 191, 191, 0.1)' : 'transparent',
            border: `1px solid ${schemaOpen ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
            borderRadius: '2px',
            color: schemaOpen ? 'var(--noosphere-cyan)' : 'var(--parchment-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            cursor: schemaLoading || !endpoint.trim() ? 'not-allowed' : 'pointer',
            opacity: !endpoint.trim() ? 0.4 : 1,
            marginLeft: 'auto',
          }}
        >
          <BookOpen size={10} />
          {schemaLoading ? 'Schema…' : 'Schema'}
        </button>
      </div>

      {schemaOpen && (
        <div
          style={{
            maxHeight: '180px',
            overflow: 'auto',
            padding: '8px 12px',
            background: 'var(--void-black)',
            borderTop: '1px solid var(--iron-gray)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
          }}
        >
          {schemaError ? (
            <div style={{ color: 'var(--omnissiah-red)' }}>{schemaError}</div>
          ) : schemaTypes.length === 0 ? (
            <div style={{ color: 'var(--parchment-dim)' }}>No types loaded</div>
          ) : (
            schemaTypes.map((t) => (
              <div key={t.name} style={{ marginBottom: '8px' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => insertTypeQuery(t.name, t.kind, t.fields)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') insertTypeQuery(t.name, t.kind, t.fields);
                  }}
                  style={{
                    color: 'var(--cogitator-gold)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  title="Insert starter query"
                >
                  {t.name}{' '}
                  <span style={{ color: 'var(--parchment-dim)', fontWeight: 'normal' }}>({t.kind})</span>
                </div>
                {t.fields.slice(0, 8).map((f) => (
                  <div key={f.name} style={{ paddingLeft: '12px', color: 'var(--mechanicus-teal)' }}>
                    {f.name}: {f.type}
                  </div>
                ))}
                {t.fields.length > 8 && (
                  <div style={{ paddingLeft: '12px', color: 'var(--parchment-dim)' }}>
                    +{t.fields.length - 8} more fields
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ RESPONSE ═══ */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '10px 12px',
          background: 'var(--iron-dark)',
          borderTop: '1px solid var(--iron-gray)',
        }}
      >
        {!response && !loading && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--parchment-dim)',
              fontSize: '11px',
              marginTop: '20px',
              opacity: 0.5,
            }}
          >
            Execute a query to commune with the data archives
          </div>
        )}
        {response && (
          <pre
            style={{
              margin: 0,
              color: response.startsWith('// ERROR') ? 'var(--omnissiah-red)' : 'var(--mechanicus-teal)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {response}
          </pre>
        )}
      </div>
    </div>
  );
}
