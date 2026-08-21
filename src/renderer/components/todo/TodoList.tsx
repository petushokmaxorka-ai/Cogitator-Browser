// ═══════════════════════════════════════════════════════════
// TO-DO LIST — COGITATOR BROWSER
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// Tasks with AI prioritization via Ollama
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { askAnathemetron } from '../../lib/anathemetron-chat';
import {
  Plus,
  Trash2,
  Check,
  GripVertical,
  Sparkles,
  ListFilter,
  ClipboardList,
  X,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  ArrowDownCircle,
  Tag,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  dueDate?: string;
  createdAt: number;
}

type TodoFilter = 'all' | 'active' | 'completed' | 'high';
type AIPriorityState = 'idle' | 'loading' | 'done' | 'error';

const STORAGE_KEY = 'cogitator_todos';
const CATEGORIES = ['Work', 'Personal', 'Shopping', 'Ideas'];

const PRIORITY_CONFIG = {
  high: { color: '#FF0000', label: 'HIGH', icon: AlertTriangle },
  medium: { color: '#C8A84B', label: 'MED', icon: AlertCircle },
  low: { color: '#00BFBF', label: 'LOW', icon: ArrowDownCircle },
};

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return 'td_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

async function queryOllama(tasks: Todo[]): Promise<string> {
  const prompt = `You are a task prioritization assistant. Given these tasks, return ONLY a JSON array of task IDs in the recommended execution order (highest priority first).\n\nTasks:\n${tasks.map((t) => `- [${t.id}] [${t.priority.toUpperCase()}] ${t.title} (category: ${t.category}${t.dueDate ? ', due: ' + t.dueDate : ''})`).join('\n')}\n\nReturn only the JSON array of task IDs, nothing else.`;
  return askAnathemetron(prompt);
}

// ── Component ───────────────────────────────────────────────

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [aiState, setAiState] = useState<AIPriorityState>('idle');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [formCategory, setFormCategory] = useState('Work');
  const [formDueDate, setFormDueDate] = useState('');

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);

  // Persist
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // ── CRUD ──────────────────────────────────────────────────

  const handleAdd = useCallback(() => {
    if (!formTitle.trim()) return;
    const newTodo: Todo = {
      id: generateId(),
      title: formTitle.trim(),
      completed: false,
      priority: formPriority,
      category: formCategory,
      dueDate: formDueDate || undefined,
      createdAt: Date.now(),
    };
    setTodos((prev) => [...prev, newTodo]);
    setFormTitle('');
    setFormDueDate('');
    setShowAdd(false);
  }, [formTitle, formPriority, formCategory, formDueDate]);

  const toggleComplete = useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── AI Prioritization ─────────────────────────────────────

  const handleAIPrioritize = useCallback(async () => {
    if (todos.length === 0) return;
    const activeTodos = todos.filter((t) => !t.completed);
    if (activeTodos.length === 0) return;

    setAiState('loading');
    try {
      const response = await queryOllama(activeTodos);
      // Parse JSON array from response
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        const orderedIds: string[] = JSON.parse(match[0]);
        // Reorder: completed first (keep order), then active in AI order
        const completed = todos.filter((t) => t.completed);
        const activeMap = new Map(activeTodos.map((t) => [t.id, t]));
        const reorderedActive = orderedIds
          .map((id) => activeMap.get(id))
          .filter(Boolean) as Todo[];
        // Append any active todos not in AI response
        const missing = activeTodos.filter((t) => !orderedIds.includes(t.id));
        setTodos([...reorderedActive, ...missing, ...completed]);
      }
      setAiState('done');
      setTimeout(() => setAiState('idle'), 3000);
    } catch {
      setAiState('error');
      setTimeout(() => setAiState('idle'), 3000);
    }
  }, [todos]);

  // ── Drag & Drop ───────────────────────────────────────────

  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, overId: string) => {
      e.preventDefault();
      if (!dragId || dragId === overId) return;
      setTodos((prev) => {
        const fromIdx = prev.findIndex((t) => t.id === dragId);
        const toIdx = prev.findIndex((t) => t.id === overId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const next = [...prev];
        const [item] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, item);
        return next;
      });
    },
    [dragId]
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  // ── Filters ───────────────────────────────────────────────

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.completed);
      case 'completed':
        return todos.filter((t) => t.completed);
      case 'high':
        return todos.filter((t) => t.priority === 'high');
      default:
        return todos;
    }
  }, [todos, filter]);

  const stats = useMemo(() => {
    const completed = todos.filter((t) => t.completed).length;
    return { completed, total: todos.length };
  }, [todos]);

  const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  // ── Styles ────────────────────────────────────────────────

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: 'var(--iron-dark)',
    border: '1px solid var(--iron-gray)',
    color: 'var(--parchment)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  };

  // ── Render ────────────────────────────────────────────────

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
      {/* ═══ Header ═══ */}
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
          <ClipboardList size={14} style={{ color: 'var(--cogitator-gold)' }} />
          <span
            style={{
              color: 'var(--cogitator-gold)',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            TO-DO
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {stats.completed}/{stats.total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {/* AI Button */}
          <button
            onClick={handleAIPrioritize}
            disabled={aiState === 'loading' || todos.filter((t) => !t.completed).length === 0}
            style={{
              ...btnBase,
              background: aiState === 'loading' ? 'var(--iron-dark)' : 'rgba(200, 168, 75, 0.15)',
              borderColor: 'var(--cogitator-gold)',
              color: 'var(--cogitator-gold)',
              opacity: aiState === 'loading' ? 0.6 : 1,
            }}
          >
            {aiState === 'loading' ? (
              <>
                <span className="loading-cog">◆</span> ANALYZING...
              </>
            ) : (
              <>
                <Sparkles size={11} /> PRIORITIZE AI
              </>
            )}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              ...btnBase,
              background: 'var(--omnissiah-red-dim)',
              borderColor: 'var(--omnissiah-red)',
              color: 'var(--sacred-white)',
              padding: '4px 8px',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* ═══ Progress Bar ═══ */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--iron-gray)', flexShrink: 0 }}>
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'var(--iron-gray)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: progressPercent === 100 ? 'var(--noosphere-cyan)' : 'var(--omnissiah-red)',
              transition: 'width 300ms ease, background 300ms ease',
              boxShadow: progressPercent === 100 ? 'var(--glow-cyan)' : '0 0 6px rgba(255, 0, 0, 0.3)',
            }}
          />
        </div>
        {aiState === 'done' && (
          <div style={{ color: 'var(--noosphere-cyan)', fontSize: '9px', marginTop: '4px', letterSpacing: '0.1em' }}>
            ✓ AI PRIORITIZATION APPLIED
          </div>
        )}
        {aiState === 'error' && (
          <div style={{ color: 'var(--omnissiah-red)', fontSize: '9px', marginTop: '4px', letterSpacing: '0.1em' }}>
            ✗ OLLAMA CONNECTION FAILED
          </div>
        )}
      </div>

      {/* ═══ Filters ═══ */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '6px 12px',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
        }}
      >
        {(['all', 'active', 'completed', 'high'] as TodoFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...btnBase,
              padding: '3px 8px',
              fontSize: '9px',
              background: filter === f ? 'var(--iron-dark)' : 'transparent',
              borderColor: filter === f ? 'var(--omnissiah-red)' : 'var(--iron-gray)',
              color: filter === f ? 'var(--omnissiah-red)' : 'var(--parchment-dim)',
            }}
          >
            {f === 'all' ? 'ALL' : f === 'active' ? 'ACTIVE' : f === 'completed' ? 'DONE' : 'HIGH'}
          </button>
        ))}
      </div>

      {/* ═══ Task List ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }} className="scrollbar-thin">
        {filteredTodos.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '10px',
              marginTop: '40px',
              fontStyle: 'italic',
            }}
          >
            <ListFilter size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <br />
            {filter === 'all' ? 'No tasks. Add one to begin.' : `No ${filter} tasks.`}
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const pConfig = PRIORITY_CONFIG[todo.priority];
            const PIcon = pConfig.icon;
            return (
              <div
                key={todo.id}
                draggable
                onDragStart={() => handleDragStart(todo.id)}
                onDragOver={(e) => handleDragOver(e, todo.id)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 8px',
                  marginBottom: '3px',
                  background: todo.completed ? 'rgba(0, 191, 191, 0.05)' : 'var(--iron-dark)',
                  borderLeft: `3px solid ${todo.completed ? 'var(--noosphere-cyan-dim)' : pConfig.color}`,
                  opacity: todo.completed ? 0.6 : 1,
                  cursor: 'grab',
                  transition: 'all 150ms ease',
                }}
              >
                {/* Drag handle */}
                <GripVertical size={12} style={{ color: 'var(--steel-gray)', flexShrink: 0, cursor: 'grab' }} />

                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(todo.id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    border: `1px solid ${todo.completed ? 'var(--noosphere-cyan)' : 'var(--iron-gray)'}`,
                    background: todo.completed ? 'var(--noosphere-cyan)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 150ms ease',
                  }}
                >
                  {todo.completed && <Check size={11} color="#000" />}
                </button>

                {/* Priority icon */}
                <PIcon size={12} style={{ color: pConfig.color, flexShrink: 0 }} />

                {/* Title */}
                <span
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    color: todo.completed ? 'var(--text-muted)' : 'var(--parchment)',
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {todo.title}
                </span>

                {/* Category badge */}
                <span
                  style={{
                    fontSize: '8px',
                    color: 'var(--parchment-dim)',
                    background: 'var(--void-black)',
                    padding: '1px 5px',
                    border: '1px solid var(--iron-gray)',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}
                >
                  {todo.category.toUpperCase()}
                </span>

                {/* Due date */}
                {todo.dueDate && (
                  <span style={{ fontSize: '8px', color: 'var(--cogitator-gold)', flexShrink: 0 }}>
                    {todo.dueDate.slice(5)}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(todo.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    flexShrink: 0,
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--omnissiah-red)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ═══ Add Task Modal ═══ */}
      {showAdd && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 10, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--iron-dark)',
              border: '1px solid var(--omnissiah-red)',
              padding: '14px',
              width: '100%',
              maxWidth: '320px',
              boxShadow: 'var(--glow-red)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: 'var(--cogitator-gold)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                NEW TASK
              </span>
              <button onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: 'none', color: 'var(--parchment-dim)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            {/* Title */}
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                marginBottom: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--omnissiah-red)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--iron-gray)'; }}
            />

            {/* Priority */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {(['high', 'medium', 'low'] as const).map((p) => {
                const pc = PRIORITY_CONFIG[p];
                const PIcon = pc.icon;
                return (
                  <button
                    key={p}
                    onClick={() => setFormPriority(p)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '5px',
                      background: formPriority === p ? `${pc.color}22` : 'transparent',
                      border: `1px solid ${formPriority === p ? pc.color : 'var(--iron-gray)'}`,
                      color: formPriority === p ? pc.color : 'var(--parchment-dim)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <PIcon size={10} /> {pc.label}
                  </button>
                );
              })}
            </div>

            {/* Category & Due Date */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em', display: 'block', marginBottom: '3px' }}>CATEGORY</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'var(--parchment-dim)', fontSize: '8px', letterSpacing: '0.1em', display: 'block', marginBottom: '3px' }}>DUE DATE</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'var(--void-black)',
                    border: '1px solid var(--iron-gray)',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  border: '1px solid var(--iron-gray)',
                  color: 'var(--parchment-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleAdd}
                disabled={!formTitle.trim()}
                style={{
                  padding: '5px 12px',
                  background: 'var(--omnissiah-red-dim)',
                  border: '1px solid var(--omnissiah-red)',
                  color: 'var(--sacred-white)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: formTitle.trim() ? 'pointer' : 'not-allowed',
                  opacity: formTitle.trim() ? 1 : 0.4,
                  boxShadow: 'var(--glow-red)',
                }}
              >
                ADD TASK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
