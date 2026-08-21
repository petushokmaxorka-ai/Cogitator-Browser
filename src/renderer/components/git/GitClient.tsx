// ═══ GIT CLIENT ═══
// Git repository interface — Sanctify thy code commits in the name of the Omnissiah
// Backend: real git CLI via IPC (git-manager.ts, no shell=True)
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace

import { useState, useCallback, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Plus,
  Minus,
  FileText,
  Trash2,
  Upload,
  Download,
  FolderOpen,
  Check,
  RotateCcw,
  CircleDot,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface GitStatusEntry {
  status: 'M' | 'A' | 'D' | '?' | 'R';
  file: string;
  staged: boolean;
}

interface GitLogEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
}

function statusLabel(status: GitStatusEntry['status']): string {
  switch (status) {
    case 'M': return 'modified';
    case 'A': return 'added';
    case 'D': return 'deleted';
    case '?': return 'untracked';
    case 'R': return 'renamed';
    default: return 'unknown';
  }
}

function statusColor(status: GitStatusEntry['status']): string {
  switch (status) {
    case 'M': return 'var(--cogitator-gold)';
    case 'A': return '#00ff00';
    case 'D': return 'var(--omnissiah-red)';
    case '?': return 'var(--parchment-dim)';
    case 'R': return 'var(--mechanicus-teal)';
    default: return 'var(--parchment-dim)';
  }
}

// ── Component ────────────────────────────────────────────────

export default function GitClient(): JSX.Element {
  const [repoPath, setRepoPath] = useState<string>('');
  const [statusEntries, setStatusEntries] = useState<GitStatusEntry[]>([]);
  const [logEntries, setLogEntries] = useState<GitLogEntry[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'status' | 'log'>('status');
  const [error, setError] = useState<string>('');

  const refresh = useCallback(async () => {
    const api = window.electronAPI?.git;
    if (!api || !repoPath) return;
    try {
      const status = await api.status();
      setStatusEntries(status.entries ?? []);
      setCurrentBranch(status.branch ?? 'main');
      const branchInfo = await api.branches();
      setBranches(branchInfo.branches ?? []);
      if (branchInfo.current) setCurrentBranch(branchInfo.current);
      setLogEntries(await api.log(30));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [repoPath]);

  useEffect(() => {
    if (repoPath) void refresh();
  }, [repoPath, refresh]);

  useEffect(() => {
    void (async () => {
      const home = await window.electronAPI?.fs?.getHome?.();
      const defaultRepo = home ? `${home}/heretic-os` : '';
      if (!defaultRepo) return;
      try {
        await window.electronAPI?.git?.setRepo?.(defaultRepo);
        setRepoPath(defaultRepo);
      } catch {
        // User can pick repo manually
      }
    })();
  }, []);

  const stageFile = useCallback(async (file: string) => {
    await window.electronAPI?.git?.add?.([file]);
    await refresh();
  }, [refresh]);

  const unstageFile = useCallback(async (file: string) => {
    await window.electronAPI?.git?.reset?.([file]);
    await refresh();
  }, [refresh]);

  const discardFile = useCallback(async (file: string) => {
    await window.electronAPI?.git?.discard?.(file);
    await refresh();
  }, [refresh]);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;
    await window.electronAPI?.git?.commit?.(commitMessage.trim());
    setCommitMessage('');
    await refresh();
  }, [commitMessage, refresh]);

  const openRepo = useCallback(async () => {
    const result = await window.electronAPI?.git?.selectRepo?.();
    if (result?.success && result.path) {
      setRepoPath(result.path);
    }
  }, []);

  const handlePull = useCallback(async () => {
    await window.electronAPI?.git?.pull?.();
    await refresh();
  }, [refresh]);

  const handlePush = useCallback(async () => {
    await window.electronAPI?.git?.push?.();
    await refresh();
  }, [refresh]);

  const stagedFiles = statusEntries.filter((e) => e.staged);
  const unstagedFiles = statusEntries.filter((e) => !e.staged);

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
          <GitBranch size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Git Client
        </div>

        {/* Repo Path */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Enter repository path..."
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
          <button
            onClick={openRepo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              background: 'var(--omnissiah-red)',
              border: 'none',
              borderRadius: '2px',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <FolderOpen size={10} />
            Open
          </button>
        </div>

        {/* Branch + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={12} style={{ color: 'var(--mechanicus-teal)' }} />
            <select
              value={currentBranch}
              onChange={(e) => setCurrentBranch(e.target.value)}
              style={{
                background: 'var(--iron-dark)',
                border: '1px solid var(--iron-gray)',
                borderRadius: '2px',
                padding: '3px 6px',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => void handlePull()}
              title="Pull"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                borderRadius: '2px',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                cursor: 'pointer',
                letterSpacing: '0.06em',
              }}
            >
              <Download size={10} />
              Pull
            </button>
            <button
              onClick={() => void handlePush()}
              title="Push"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid var(--iron-gray)',
                borderRadius: '2px',
                color: 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                cursor: 'pointer',
                letterSpacing: '0.06em',
              }}
            >
              <Upload size={10} />
              Push
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--iron-gray)',
          flexShrink: 0,
          background: 'var(--iron-dark)',
        }}
      >
        {([
          { id: 'status' as const, label: 'Status', count: statusEntries.length },
          { id: 'log' as const, label: 'Log', count: logEntries.length },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
            {tab.id === 'status' ? <CircleDot size={10} /> : <GitCommit size={10} />}
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

        {/* ── Status Tab ── */}
        {activeTab === 'status' && (
          <div>
            {/* Staged */}
            {stagedFiles.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--cogitator-gold)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    fontWeight: 'bold',
                  }}
                >
                  <Check size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Staged ({stagedFiles.length})
                </div>
                {stagedFiles.map((entry) => (
                  <div
                    key={entry.file}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      marginBottom: '3px',
                      background: 'rgba(0, 191, 191, 0.05)',
                      borderLeft: '2px solid var(--mechanicus-teal)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: statusColor(entry.status), width: '14px', textAlign: 'center' }}>
                        {entry.status}
                      </span>
                      <FileText size={10} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.file}
                      </span>
                      <span style={{ fontSize: '8px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>
                        {statusLabel(entry.status)}
                      </span>
                    </div>
                    <button
                      onClick={() => unstageFile(entry.file)}
                      title="Unstage"
                      style={{
                        padding: '2px 4px',
                        background: 'transparent',
                        border: '1px solid var(--iron-gray)',
                        borderRadius: '2px',
                        color: 'var(--cogitator-gold)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Minus size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Unstaged */}
            {unstagedFiles.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--omnissiah-red)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    fontWeight: 'bold',
                  }}
                >
                  <RotateCcw size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Changes ({unstagedFiles.length})
                </div>
                {unstagedFiles.map((entry) => (
                  <div
                    key={entry.file}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      marginBottom: '3px',
                      background: 'var(--iron-dark)',
                      borderLeft: `2px solid ${statusColor(entry.status)}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: statusColor(entry.status), width: '14px', textAlign: 'center' }}>
                        {entry.status}
                      </span>
                      <FileText size={10} style={{ color: 'var(--parchment-dim)', flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.file}
                      </span>
                      <span style={{ fontSize: '8px', color: 'var(--parchment-dim)', textTransform: 'uppercase' }}>
                        {statusLabel(entry.status)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                      <button
                        onClick={() => stageFile(entry.file)}
                        title="Stage"
                        style={{
                          padding: '2px 4px',
                          background: 'transparent',
                          border: '1px solid var(--iron-gray)',
                          borderRadius: '2px',
                          color: '#00ff00',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={8} />
                      </button>
                      <button
                        onClick={() => discardFile(entry.file)}
                        title="Discard"
                        style={{
                          padding: '2px 4px',
                          background: 'transparent',
                          border: '1px solid var(--iron-gray)',
                          borderRadius: '2px',
                          color: 'var(--omnissiah-red)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {statusEntries.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--parchment-dim)', fontSize: '11px', marginTop: '20px', opacity: 0.5 }}>
                Working tree clean — the machine spirit is at peace
              </div>
            )}
          </div>
        )}

        {/* ── Log Tab ── */}
        {activeTab === 'log' && (
          <div>
            {logEntries.map((entry) => (
              <div
                key={entry.hash}
                style={{
                  padding: '8px 10px',
                  marginBottom: '6px',
                  background: 'var(--iron-dark)',
                  border: '1px solid var(--iron-gray)',
                  borderRadius: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <GitCommit size={10} style={{ color: 'var(--omnissiah-red)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--cogitator-gold)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                    {entry.hash}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--parchment-dim)', marginLeft: 'auto' }}>
                    {entry.date}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--parchment)', paddingLeft: '16px' }}>
                  {entry.message}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--mechanicus-teal)', paddingLeft: '16px', marginTop: '2px' }}>
                  by {entry.author}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ COMMIT BAR ═══ */}
      {activeTab === 'status' && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--iron-gray)',
            flexShrink: 0,
            background: 'var(--iron-dark)',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommit(); } }}
              placeholder="Sanctify thy commit message..."
              style={{
                flex: 1,
                background: 'var(--void-black)',
                border: '1px solid var(--iron-gray)',
                borderRadius: '2px',
                padding: '6px 8px',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCommit}
              disabled={!commitMessage.trim() || stagedFiles.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                background: commitMessage.trim() && stagedFiles.length > 0 ? 'var(--omnissiah-red)' : 'var(--iron-gray)',
                border: 'none',
                borderRadius: '2px',
                color: commitMessage.trim() && stagedFiles.length > 0 ? '#000000' : 'var(--parchment-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: commitMessage.trim() && stagedFiles.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              <GitCommit size={10} />
              Commit
            </button>
          </div>
          {error && (
            <div style={{ fontSize: '9px', color: 'var(--omnissiah-red)', marginTop: '6px' }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
