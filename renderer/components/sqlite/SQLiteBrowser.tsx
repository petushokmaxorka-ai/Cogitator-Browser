// ═══ SQLITE BROWSER ═══
// Database schema viewer and SQL query executor — Data Archive Interface
// Backend: real sqlite3 CLI via IPC (sqlite-manager.ts, no native modules)

import { useState, useCallback, useRef } from 'react';
import {
  Database,
  Table,
  Play,
  Trash2,
  FileJson,
  Columns3,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  FileInput,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface SQLResult {
  columns: string[];
  rows: Record<string, unknown>[];
  error?: string;
}

function formatTableSchema(table: string, rows: Record<string, unknown>[]): string {
  const lines = rows.map((r) => {
    const name = String(r.name ?? 'col');
    const type = String(r.type ?? 'TEXT');
    const pk = r.pk ? ' PRIMARY KEY' : '';
    const notnull = r.notnull ? ' NOT NULL' : '';
    return `  ${name} ${type}${pk}${notnull}`;
  });
  return `CREATE TABLE ${table} (\n${lines.join(',\n')}\n);`;
}

function resultToCsv(result: SQLResult): string {
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = result.columns.map(escape).join(',');
  const rows = result.rows.map((row) => result.columns.map((col) => escape(row[col])).join(','));
  return [header, ...rows].join('\n');
}

// ── Component ───────────────────────────────────────────────

export default function SQLiteBrowser() {
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<Record<string, string[]>>({});
  const [tableSchemas, setTableSchemas] = useState<Record<string, string>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SQLResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [view, setView] = useState<'data' | 'schema'>('data');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const currentSchema = selectedTable ? tableSchemas[selectedTable] : null;

  const loadDatabaseFromPath = useCallback(async (path: string) => {
    await window.electronAPI.sqlite.open(path);
    const names = await window.electronAPI.sqlite.listTables();
    setDbPath(path);
    setTableNames(names);
    setTableColumns({});
    setTableSchemas({});
    setSelectedTable(null);
    setResult(null);
    setExpandedTables(new Set(names.slice(0, 1)));
  }, []);

  const handleOpenDatabase = useCallback(async () => {
    const path = await window.electronAPI.sigil.openFileDialog({
      title: 'Open SQLite database',
      filters: [
        { name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All', extensions: ['*'] },
      ],
    });
    if (!path) return;
    try {
      await loadDatabaseFromPath(path);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }, [loadDatabaseFromPath]);

  const handleDropDatabase = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0] as (File & { path?: string }) | undefined;
      const path = file?.path;
      if (!path || !/\.(db|sqlite|sqlite3)$/i.test(path)) return;
      try {
        await loadDatabaseFromPath(path);
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      }
    },
    [loadDatabaseFromPath],
  );

  const loadTableMeta = useCallback(async (name: string) => {
    const res = await window.electronAPI?.sqlite?.schema?.(name);
    if (!res || res.error) return;
    const cols = res.rows.map((r) => String(r.name ?? ''));
    setTableColumns((prev) => ({ ...prev, [name]: cols }));
    setTableSchemas((prev) => ({ ...prev, [name]: formatTableSchema(name, res.rows) }));
  }, []);

  // ── Handlers ──────────────────────────────────────────────

  const toggleExpanded = useCallback((name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleRunQuery = useCallback(async () => {
    if (!query.trim()) return;
    setIsExecuting(true);
    setResult(null);

    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      const res = await window.electronAPI?.sqlite?.query?.(query);
      setResult(res ?? { columns: ['error'], rows: [{ error: 'Open a database first (path in main process)' }] });
    } catch (err) {
      setResult({
        columns: ['error'],
        rows: [{ error: err instanceof Error ? err.message : String(err) }],
      });
    }
    setQueryHistory((prev) => [query, ...prev.slice(0, 19)]);
    setHistoryIndex(-1);
    setIsExecuting(false);
  }, [query]);

  const handleHistorySelect = useCallback(
    (dir: 'up' | 'down') => {
      if (queryHistory.length === 0) return;
      if (dir === 'up') {
        const next = Math.min(historyIndex + 1, queryHistory.length - 1);
        setHistoryIndex(next);
        setQuery(queryHistory[next]);
      } else {
        const next = Math.max(historyIndex - 1, -1);
        setHistoryIndex(next);
        setQuery(next >= 0 ? queryHistory[next] : '');
      }
    },
    [queryHistory, historyIndex]
  );

  const handleSelectTable = useCallback(
    async (name: string) => {
      setSelectedTable(name);
      setView('data');
      const sql = `SELECT * FROM ${name} LIMIT 100;`;
      setQuery(sql);
      if (!tableColumns[name]) {
        void loadTableMeta(name);
      }
      setIsExecuting(true);
      setResult(null);
      try {
        const res = await window.electronAPI?.sqlite?.query?.(sql);
        setResult(res ?? { columns: ['error'], rows: [{ error: 'Query failed' }] });
      } catch (err) {
        setResult({
          columns: ['error'],
          rows: [{ error: err instanceof Error ? err.message : String(err) }],
        });
      } finally {
        setIsExecuting(false);
      }
    },
    [loadTableMeta, tableColumns],
  );

  const handleClearResult = useCallback(() => {
    setResult(null);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (!result || result.columns.length === 0) return;
    const csv = resultToCsv(result);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable ?? 'query'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, selectedTable]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      ref={dropRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => void handleDropDatabase(e)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000000',
        fontFamily: "'Courier New', 'Consolas', monospace",
        fontSize: '12px',
        color: '#E8E8E8',
        overflow: 'hidden',
        outline: isDragging ? '2px dashed #00BFBF' : undefined,
        outlineOffset: '-2px',
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <Database size={14} style={{ color: '#00BFBF' }} />
        <span
          style={{
            color: '#00BFBF',
            fontWeight: 'bold',
            letterSpacing: '0.12em',
            fontSize: '11px',
            textTransform: 'uppercase',
          }}
        >
          SQLite Browser
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '60%', minWidth: 0 }}>
          {dbPath && (
            <span
              style={{
                fontSize: '9px',
                color: '#8B7D6B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
              title={dbPath}
            >
              {dbPath}
            </span>
          )}
          <button
            onClick={() => void handleOpenDatabase()}
            style={{
              padding: '4px 10px',
              background: '#1E1E1E',
              border: '1px solid #2A2A2A',
              color: '#E8E8E8',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileInput size={10} />
            OPEN DATABASE
          </button>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Left: Table Tree ────────────────────────────── */}
        <div
          style={{
            width: '160px',
            flexShrink: 0,
            borderRight: '1px solid #2A2A2A',
            overflow: 'auto',
            background: '#0F0F0F',
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              fontSize: '10px',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              borderBottom: '1px solid #222',
            }}
          >
            Tables ({tableNames.length})
          </div>
          {tableNames.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: '10px', color: '#555' }}>
              No database open
            </div>
          )}
          {tableNames.map((tableName) => {
            const isExpanded = expandedTables.has(tableName);
            const isSelected = selectedTable === tableName;
            const columns = tableColumns[tableName] ?? [];
            return (
              <div key={tableName}>
                <div
                  onClick={() => {
                    toggleExpanded(tableName);
                    void handleSelectTable(tableName);
                    if (!tableColumns[tableName]) void loadTableMeta(tableName);
                  }}
                  style={{
                    padding: '5px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    background: isSelected ? '#1E1E1E' : 'transparent',
                    borderLeft: isSelected ? '2px solid #00BFBF' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#151515'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {isExpanded ? <ChevronDown size={10} style={{ color: '#555' }} /> : <ChevronRight size={10} style={{ color: '#555' }} />}
                  <Table size={10} style={{ color: '#C8A84B' }} />
                  <span style={{ fontSize: '11px', color: isSelected ? '#00BFBF' : '#E8E8E8' }}>{tableName}</span>
                </div>
                {isExpanded && (
                  <div style={{ paddingLeft: '28px' }}>
                    {(columns.length ? columns : ['…']).map((col) => (
                      <div
                        key={col}
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          color: '#8B7D6B',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Columns3 size={8} />
                        {col}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Schema section */}
          <div
            style={{
              padding: '8px 10px',
              fontSize: '10px',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              borderTop: '1px solid #222',
              marginTop: '8px',
            }}
          >
            Actions
          </div>
          <button
            onClick={() => setView('schema')}
            style={{
              width: '100%',
              padding: '5px 10px',
              background: 'transparent',
              border: 'none',
              color: view === 'schema' ? '#C8A84B' : '#8B7D6B',
              fontSize: '11px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileJson size={10} />
            Schema View
          </button>
        </div>

        {/* ── Right: Query + Results ──────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* SQL Editor */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #2A2A2A',
              flexShrink: 0,
              background: '#111111',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                SQL Query
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleClearResult}
                  style={{
                    padding: '2px 6px',
                    background: 'transparent',
                    border: '1px solid #2A2A2A',
                    color: '#555',
                    fontSize: '9px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={8} />
                </button>
                <button
                  onClick={handleRunQuery}
                  disabled={!query.trim() || isExecuting}
                  style={{
                    padding: '4px 12px',
                    background: '#00BFBF',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 'bold',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    cursor: !query.trim() || isExecuting ? 'not-allowed' : 'pointer',
                    opacity: !query.trim() || isExecuting ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Play size={10} />
                  {isExecuting ? 'RUNNING...' : 'RUN QUERY'}
                </button>
              </div>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleRunQuery();
                }
                if (e.key === 'ArrowUp' && e.ctrlKey) {
                  e.preventDefault();
                  handleHistorySelect('up');
                }
                if (e.key === 'ArrowDown' && e.ctrlKey) {
                  e.preventDefault();
                  handleHistorySelect('down');
                }
              }}
              placeholder="SELECT * FROM users;"
              spellCheck={false}
              style={{
                width: '100%',
                height: '60px',
                padding: '8px',
                background: '#1E1E1E',
                border: '1px solid #2A2A2A',
                color: '#E8E8E8',
                fontSize: '12px',
                fontFamily: "'Courier New', 'Consolas', monospace",
                resize: 'none',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '9px', color: '#444' }}>Ctrl+Enter to run | Ctrl+Up/Down for history</span>
              <span style={{ fontSize: '9px', color: '#444' }}>{query.length} chars</span>
            </div>
          </div>

          {/* Results Area */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
            {/* Schema View */}
            {view === 'schema' && selectedTable && currentSchema && (
              <div style={{ padding: '12px' }}>
                <div
                  style={{
                    marginBottom: '8px',
                    fontSize: '10px',
                    color: '#C8A84B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Schema: {selectedTable}
                </div>
                <pre
                  style={{
                    background: '#111111',
                    border: '1px solid #2A2A2A',
                    padding: '12px',
                    color: '#00BFBF',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    overflow: 'auto',
                  }}
                >
                  {currentSchema}
                </pre>
              </div>
            )}

            {/* Data View — empty */}
            {view === 'data' && !result && !selectedTable && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '11px' }}>
                <Database size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>Open a database or write a SQL query</p>
              </div>
            )}

            {/* Data View — Selected Table hint removed; results show via query */}
            {view === 'data' && !result && selectedTable && isExecuting && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '11px' }}>
                Loading {selectedTable}…
              </div>
            )}

            {/* Query Result */}
            {result && (
              <div style={{ animation: 'fadeIn 200ms ease-out' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #222',
                    fontSize: '10px',
                    color: '#555',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    Result: <span style={{ color: '#00BFBF' }}>{result.columns.length}</span> columns,{' '}
                    <span style={{ color: '#00BFBF' }}>{result.rows.length}</span> rows
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      style={{
                        background: '#1E1E1E',
                        border: '1px solid #2A2A2A',
                        color: '#C8A84B',
                        fontSize: '9px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      EXPORT CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleClearResult}
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <ResultTable result={result} />
              </div>
            )}
          </div>

          {/* Query History */}
          {queryHistory.length > 0 && (
            <div
              style={{
                borderTop: '1px solid #222',
                background: '#0F0F0F',
                flexShrink: 0,
                maxHeight: '100px',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  padding: '4px 12px',
                  fontSize: '9px',
                  color: '#444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid #1A1A1A',
                }}
              >
                Query History
              </div>
              {queryHistory.map((q, i) => (
                <div
                  key={i}
                  onClick={() => { setQuery(q); setHistoryIndex(i); }}
                  style={{
                    padding: '3px 12px',
                    fontSize: '11px',
                    color: '#8B7D6B',
                    cursor: 'pointer',
                    borderBottom: '1px solid #1A1A1A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1A1A1A'; e.currentTarget.style.color = '#C8A84B'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B7D6B'; }}
                >
                  <Search size={8} />
                  {q}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Result Table Sub-Component ──────────────────────────────

function ResultTable({ result }: { result: SQLResult }) {
  if (result.columns.length === 0) return null;

  return (
    <div style={{ overflow: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px',
          minWidth: '400px',
        }}
      >
        <thead>
          <tr style={{ background: '#111111' }}>
            {result.columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  color: '#C8A84B',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #2A2A2A',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? '#0F0F0F' : '#000000',
              }}
            >
              {result.columns.map((col) => (
                <td
                  key={col}
                  style={{
                    padding: '5px 10px',
                    borderBottom: '1px solid #1A1A1A',
                    color: col === 'id' ? '#00BFBF' : '#E8E8E8',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.rows.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontSize: '11px' }}>
          No rows returned
        </div>
      )}
    </div>
  );
}
