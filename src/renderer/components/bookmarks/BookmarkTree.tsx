// ═══ LIBRARY OF FORGE — Tree-Style Bookmarks ═══
// A sacred repository of noospheric coordinates, organized in
// the ancient tree structure of the Omnissiah.
// Toggle: Ctrl+B or the toolbar button.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Globe,
  Plus,
  X,
  Trash2,
  Edit3,
  ExternalLink,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

export interface BookmarkTreeItem {
  id: string;
  type: 'folder' | 'bookmark';
  title: string;
  url?: string;
  favicon?: string;
  children?: BookmarkTreeItem[];
  isOpen?: boolean;
}

interface BookmarkTreeProps {
  onNavigate: (url: string) => void;
  onCreateTab: (url?: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
  targetType: 'folder' | 'bookmark' | null;
}

interface DragState {
  draggedId: string | null;
  dragOverId: string | null;
  dragOverFolderId: string | null;
}

// ── Constants ──────────────────────────────────────────────

const STORAGE_KEY = 'cogitator_bookmark_tree';
const INDENT_PX = 16;

// ── Default Bookmark Tree Structure ────────────────────────

const getDefaultTree = (): BookmarkTreeItem[] => [
  {
    id: 'root-search',
    type: 'folder',
    title: '🔍 Search',
    isOpen: true,
    children: [
      {
        id: 'bm-google',
        type: 'bookmark',
        title: 'Google',
        url: 'https://google.com',
        favicon: 'https://www.google.com/favicon.ico',
      },
      {
        id: 'bm-duckduckgo',
        type: 'bookmark',
        title: 'DuckDuckGo',
        url: 'https://duckduckgo.com',
        favicon: 'https://duckduckgo.com/favicon.ico',
      },
      {
        id: 'bm-searxng',
        type: 'bookmark',
        title: 'SearXNG',
        url: 'http://localhost:8080',
      },
    ],
  },
  {
    id: 'root-ai',
    type: 'folder',
    title: '🤖 AI',
    isOpen: true,
    children: [
      {
        id: 'bm-chatgpt',
        type: 'bookmark',
        title: 'ChatGPT',
        url: 'https://chat.openai.com',
        favicon: 'https://chat.openai.com/favicon.ico',
      },
      {
        id: 'bm-ollama',
        type: 'bookmark',
        title: 'Ollama',
        url: 'http://localhost:11434',
      },
      {
        id: 'bm-libretranslate',
        type: 'bookmark',
        title: 'LibreTranslate',
        url: 'http://localhost:5000',
      },
    ],
  },
  {
    id: 'root-dev',
    type: 'folder',
    title: '💻 Dev',
    isOpen: true,
    children: [
      {
        id: 'bm-github',
        type: 'bookmark',
        title: 'GitHub',
        url: 'https://github.com',
        favicon: 'https://github.com/favicon.ico',
      },
      {
        id: 'bm-stackoverflow',
        type: 'bookmark',
        title: 'Stack Overflow',
        url: 'https://stackoverflow.com',
        favicon: 'https://stackoverflow.com/favicon.ico',
      },
      {
        id: 'bm-mdn',
        type: 'bookmark',
        title: 'MDN',
        url: 'https://developer.mozilla.org',
        favicon: 'https://developer.mozilla.org/favicon.ico',
      },
    ],
  },
  {
    id: 'root-news',
    type: 'folder',
    title: '📰 News',
    isOpen: false,
    children: [
      {
        id: 'bm-hackernews',
        type: 'bookmark',
        title: 'Hacker News',
        url: 'https://news.ycombinator.com',
        favicon: 'https://news.ycombinator.com/favicon.ico',
      },
      {
        id: 'bm-reddit',
        type: 'bookmark',
        title: 'Reddit',
        url: 'https://reddit.com',
        favicon: 'https://reddit.com/favicon.ico',
      },
    ],
  },
  {
    id: 'root-system',
    type: 'folder',
    title: '⚙ System',
    isOpen: false,
    children: [
      {
        id: 'bm-settings',
        type: 'bookmark',
        title: 'Settings',
        url: 'cogitator://settings',
      },
      {
        id: 'bm-vault',
        type: 'bookmark',
        title: 'Vault',
        url: 'cogitator://vault',
      },
      {
        id: 'bm-sigil',
        type: 'bookmark',
        title: 'Sigil',
        url: 'cogitator://sigil',
      },
    ],
  },
];

// ── Helpers: Persistence ───────────────────────────────────

const loadTree = (): BookmarkTreeItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultTree();
    const parsed = JSON.parse(raw) as BookmarkTreeItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultTree();
  } catch {
    return getDefaultTree();
  }
};

const saveTree = (tree: BookmarkTreeItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  } catch (err) {
    console.error('[BookmarkTree] Failed to save:', err);
  }
};

const generateId = (): string =>
  `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ── Helpers: Tree Traversal ────────────────────────────────

const findItem = (
  tree: BookmarkTreeItem[],
  id: string
): { item: BookmarkTreeItem; parent: BookmarkTreeItem[] | null; index: number } | null => {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      return { item: tree[i], parent: tree, index: i };
    }
    if (tree[i].children) {
      const result = findItem(tree[i].children!, id);
      if (result) return result;
    }
  }
  return null;
};

const removeItem = (tree: BookmarkTreeItem[], id: string): BookmarkTreeItem[] => {
  return tree
    .map((item) => {
      if (item.children) {
        return { ...item, children: removeItem(item.children, id) };
      }
      return item;
    })
    .filter((item) => item.id !== id);
};

const addItemToFolder = (
  tree: BookmarkTreeItem[],
  folderId: string,
  newItem: BookmarkTreeItem
): BookmarkTreeItem[] => {
  return tree.map((item) => {
    if (item.id === folderId && item.type === 'folder') {
      return {
        ...item,
        children: [...(item.children || []), newItem],
        isOpen: true,
      };
    }
    if (item.children) {
      return { ...item, children: addItemToFolder(item.children, folderId, newItem) };
    }
    return item;
  });
};

const moveItem = (
  tree: BookmarkTreeItem[],
  draggedId: string,
  targetFolderId: string
): BookmarkTreeItem[] => {
  const found = findItem(tree, draggedId);
  if (!found) return tree;

  const newTree = removeItem(tree, draggedId);
  return addItemToFolder(newTree, targetFolderId, found.item);
};

const toggleFolder = (tree: BookmarkTreeItem[], folderId: string): BookmarkTreeItem[] => {
  return tree.map((item) => {
    if (item.id === folderId && item.type === 'folder') {
      return { ...item, isOpen: !item.isOpen };
    }
    if (item.children) {
      return { ...item, children: toggleFolder(item.children, folderId) };
    }
    return item;
  });
};

const updateItem = (
  tree: BookmarkTreeItem[],
  id: string,
  updates: Partial<BookmarkTreeItem>
): BookmarkTreeItem[] => {
  return tree.map((item) => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    if (item.children) {
      return { ...item, children: updateItem(item.children, id, updates) };
    }
    return item;
  });
};

// ── Tree Item Component ────────────────────────────────────

interface TreeItemProps {
  item: BookmarkTreeItem;
  depth: number;
  isActive: boolean;
  onToggleFolder: (id: string) => void;
  onOpenBookmark: (url: string) => void;
  onOpenInNewTab: (url: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, type: 'folder' | 'bookmark') => void;
  dragState: DragState;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string, type: 'folder' | 'bookmark') => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetId: string, type: 'folder' | 'bookmark') => void;
  onDragEnd: () => void;
}

const TreeItem: React.FC<TreeItemProps> = ({
  item,
  depth,
  isActive,
  onToggleFolder,
  onOpenBookmark,
  onOpenInNewTab,
  onContextMenu,
  dragState,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const isFolder = item.type === 'folder';
  const isDragOver = dragState.dragOverId === item.id;
  const isDragOverFolder = dragState.dragOverFolderId === item.id;

  const handleClick = useCallback(() => {
    if (isFolder) {
      onToggleFolder(item.id);
    } else if (item.url) {
      onOpenBookmark(item.url);
    }
  }, [isFolder, item.id, item.url, onToggleFolder, onOpenBookmark]);

  const handleAuxClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 && !isFolder && item.url) {
        // Middle click → open in new tab
        e.preventDefault();
        onOpenInNewTab(item.url);
      }
    },
    [isFolder, item.url, onOpenInNewTab]
  );

  return (
    <div>
      {/* Item row */}
      <div
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, item.id, item.type)}
        onMouseDown={handleAuxClick}
        draggable
        onDragStart={() => onDragStart(item.id)}
        onDragOver={(e) => onDragOver(e, item.id, item.type)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, item.id, item.type)}
        onDragEnd={onDragEnd}
        className={[
          'flex items-center gap-1.5',
          'h-7 px-2',
          'cursor-pointer',
          'font-mono text-[11px]',
          'transition-all duration-100',
          'select-none',
          isActive ? 'border-l-2 border-l-[var(--omnissiah-red)] bg-[rgba(255,0,0,0.05)]' : 'border-l-2 border-l-transparent',
          isDragOver ? 'bg-[rgba(0,191,191,0.1)]' : '',
          isDragOverFolder ? 'bg-[rgba(200,168,75,0.1)]' : 'hover:bg-[var(--iron-dark)]',
        ].join(' ')}
        style={{ paddingLeft: `${8 + depth * INDENT_PX}px` }}
      >
        {/* Folder toggle / icon */}
        {isFolder ? (
          <span className="flex-shrink-0 text-[var(--steel-gray)]">
            {item.isOpen ? (
              <ChevronDown size={12} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={12} strokeWidth={1.5} />
            )}
          </span>
        ) : (
          <span className="flex-shrink-0 w-3" />
        )}

        {/* Icon */}
        <span className="flex-shrink-0">
          {isFolder ? (
            item.isOpen ? (
              <FolderOpen size={13} strokeWidth={1.5} className="text-[var(--cogitator-gold)]" />
            ) : (
              <Folder size={13} strokeWidth={1.5} className="text-[var(--cogitator-gold)]" />
            )
          ) : item.favicon ? (
            <img
              src={item.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe size={12} strokeWidth={1.5} className="text-[var(--noosphere-cyan)]" />
          )}
        </span>

        {/* Title */}
        <span
          className={[
            'truncate flex-1 min-w-0',
            isFolder
              ? 'text-[var(--cogitator-gold)] font-bold'
              : 'text-[var(--parchment)]',
          ].join(' ')}
          title={isFolder ? item.title : `${item.title}${item.url ? ` — ${item.url}` : ''}`}
        >
          {item.title}
        </span>
      </div>

      {/* Children */}
      {isFolder && item.isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              isActive={isActive}
              onToggleFolder={onToggleFolder}
              onOpenBookmark={onOpenBookmark}
              onOpenInNewTab={onOpenInNewTab}
              onContextMenu={onContextMenu}
              dragState={dragState}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Context Menu Component ─────────────────────────────────

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onOpenInNewTab: (url: string) => void;
  bookmarkUrl?: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onDelete,
  onEdit,
  onOpenInNewTab,
  bookmarkUrl,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => onClose();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (state.visible) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [state.visible, onClose]);

  if (!state.visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-[var(--iron-dark)] border border-[var(--omnissiah-red)] shadow-[0_4px_20px_rgba(255,0,0,0.15)] z-[1000] py-1 min-w-[160px]"
      style={{ left: state.x, top: state.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {state.targetType === 'bookmark' && bookmarkUrl && (
        <button
          onClick={() => {
            onOpenInNewTab(bookmarkUrl);
            onClose();
          }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[var(--parchment)] font-mono text-[11px] hover:bg-[rgba(255,0,0,0.1)] hover:text-[var(--cogitator-gold)] transition-all duration-100 cursor-pointer"
        >
          <ExternalLink size={12} strokeWidth={1.5} />
          Open in New Tab
        </button>
      )}

      <button
        onClick={() => {
          if (state.targetId) onEdit(state.targetId);
          onClose();
        }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[var(--parchment)] font-mono text-[11px] hover:bg-[rgba(255,0,0,0.1)] hover:text-[var(--cogitator-gold)] transition-all duration-100 cursor-pointer"
      >
        <Edit3 size={12} strokeWidth={1.5} />
        Edit
      </button>

      <div className="h-px bg-[var(--iron-gray)] my-1" />

      <button
        onClick={() => {
          if (state.targetId) onDelete(state.targetId);
          onClose();
        }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[var(--omnissiah-red)] font-mono text-[11px] hover:bg-[rgba(255,0,0,0.1)] transition-all duration-100 cursor-pointer"
      >
        <Trash2 size={12} strokeWidth={1.5} />
        Delete
      </button>
    </div>
  );
};

// ── Edit Dialog Component ──────────────────────────────────

interface EditDialogProps {
  item: BookmarkTreeItem | null;
  onSave: (id: string, title: string, url?: string) => void;
  onClose: () => void;
}

const EditDialog: React.FC<EditDialogProps> = ({ item, onSave, onClose }) => {
  const [title, setTitle] = useState(item?.title || '');
  const [url, setUrl] = useState(item?.url || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(item?.title || '');
    setUrl(item?.url || '');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(item.id, title.trim(), item.type === 'bookmark' ? url.trim() || undefined : undefined);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.7)] z-[1001] flex items-center justify-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--void-black)] border border-[var(--omnissiah-red)] p-4 w-[320px] shadow-[0_0_20px_rgba(255,0,0,0.2)]"
      >
        <h3 className="text-[var(--cogitator-gold)] font-mono text-[12px] uppercase tracking-widest mb-3">
          {item.type === 'folder' ? 'Edit Folder' : 'Edit Bookmark'}
        </h3>

        <div className="mb-3">
          <label className="block text-[var(--parchment-dim)] font-mono text-[9px] uppercase tracking-wider mb-1">
            Title
          </label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-8 px-2 bg-[var(--iron-dark)] border border-[var(--iron-gray)] text-[var(--sacred-white)] font-mono text-[11px] focus:outline-none focus:border-[var(--omnissiah-red)]"
          />
        </div>

        {item.type === 'bookmark' && (
          <div className="mb-4">
            <label className="block text-[var(--parchment-dim)] font-mono text-[9px] uppercase tracking-wider mb-1">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full h-8 px-2 bg-[var(--iron-dark)] border border-[var(--iron-gray)] text-[var(--sacred-white)] font-mono text-[11px] focus:outline-none focus:border-[var(--omnissiah-red)]"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-[var(--iron-gray)] text-[var(--parchment)] font-mono text-[10px] uppercase tracking-wider hover:border-[var(--omnissiah-red)] hover:text-[var(--omnissiah-red)] transition-all duration-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[var(--omnissiah-red)] text-white font-mono text-[10px] uppercase tracking-wider hover:bg-[var(--omnissiah-red-dim)] transition-all duration-100 cursor-pointer"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Main BookmarkTree Component ────────────────────────────

const BookmarkTree: React.FC<BookmarkTreeProps> = ({
  onNavigate,
  onCreateTab,
  isOpen,
  onToggle,
}) => {
  const [tree, setTree] = useState<BookmarkTreeItem[]>(loadTree);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
    targetType: null,
  });
  const [editingItem, setEditingItem] = useState<BookmarkTreeItem | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    dragOverId: null,
    dragOverFolderId: null,
  });
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Persist tree changes
  useEffect(() => {
    saveTree(tree);
  }, [tree]);

  // Keyboard shortcut: Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

  // ── Handlers ────────────────────────────────────────────

  const handleToggleFolder = useCallback((id: string) => {
    setTree((prev) => toggleFolder(prev, id));
  }, []);

  const handleOpenBookmark = useCallback(
    (url: string) => {
      onNavigate(url);
      // Find and set active
      const findBookmark = (items: BookmarkTreeItem[], targetUrl: string): string | null => {
        for (const item of items) {
          if (item.type === 'bookmark' && item.url === targetUrl) return item.id;
          if (item.children) {
            const found = findBookmark(item.children, targetUrl);
            if (found) return found;
          }
        }
        return null;
      };
      const id = findBookmark(tree, url);
      if (id) setActiveBookmarkId(id);
    },
    [onNavigate, tree]
  );

  const handleOpenInNewTab = useCallback(
    (url: string) => {
      onCreateTab(url);
    },
    [onCreateTab]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string, type: 'folder' | 'bookmark') => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        targetId: id,
        targetType: type,
      });
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    setTree((prev) => removeItem(prev, id));
    setActiveBookmarkId((prev) => (prev === id ? null : prev));
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      const found = findItem(tree, id);
      if (found) {
        setEditingItem(found.item);
      }
    },
    [tree]
  );

  const handleSaveEdit = useCallback(
    (id: string, title: string, url?: string) => {
      setTree((prev) => updateItem(prev, id, { title, ...(url !== undefined ? { url } : {}) }));
    },
    []
  );

  // ── Drag & Drop ─────────────────────────────────────────

  const handleDragStart = useCallback((id: string) => {
    setDragState((prev) => ({ ...prev, draggedId: id }));
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string, type: 'folder' | 'bookmark') => {
      e.preventDefault();
      e.stopPropagation();

      if (type === 'folder') {
        setDragState((prev) => ({
          ...prev,
          dragOverId: id,
          dragOverFolderId: id,
        }));
      } else {
        setDragState((prev) => ({
          ...prev,
          dragOverId: id,
          dragOverFolderId: null,
        }));
      }
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({ ...prev, dragOverId: null, dragOverFolderId: null }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string, type: 'folder' | 'bookmark') => {
      e.preventDefault();
      e.stopPropagation();

      const { draggedId } = dragState;
      if (!draggedId || draggedId === targetId) {
        setDragState({ draggedId: null, dragOverId: null, dragOverFolderId: null });
        return;
      }

      if (type === 'folder') {
        // Drop into folder
        setTree((prev) => moveItem(prev, draggedId, targetId));
      }

      setDragState({ draggedId: null, dragOverId: null, dragOverFolderId: null });
    },
    [dragState]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, dragOverId: null, dragOverFolderId: null });
  }, []);

  // ── New Folder ──────────────────────────────────────────

  const handleStartNewFolder = useCallback(() => {
    setNewFolderParent('root');
    setTimeout(() => newFolderInputRef.current?.focus(), 0);
  }, []);

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) {
      setNewFolderParent(null);
      return;
    }

    const newFolder: BookmarkTreeItem = {
      id: generateId(),
      type: 'folder',
      title: newFolderName.trim(),
      isOpen: true,
      children: [],
    };

    setTree((prev) => [...prev, newFolder]);
    setNewFolderName('');
    setNewFolderParent(null);
  }, [newFolderName]);

  // ── Get URL for context menu ────────────────────────────

  const contextMenuUrl = (() => {
    if (!contextMenu.targetId || contextMenu.targetType !== 'bookmark') return undefined;
    const found = findItem(tree, contextMenu.targetId);
    return found?.item.url;
  })();

  // ── Render ──────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      <div
        className="flex flex-col h-full border-r border-[var(--iron-gray)]"
        style={{
          width: 250,
          minWidth: 250,
          backgroundColor: 'var(--void-black)',
          flexShrink: 0,
        }}
      >
        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--iron-gray)] flex-shrink-0">
          <span className="text-[var(--cogitator-gold)] font-mono text-[11px] uppercase tracking-widest font-bold">
            ◉ Library of Forge
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleStartNewFolder}
              className="flex items-center justify-center w-5 h-5 text-[var(--text-muted)] hover:text-[var(--cogitator-gold)] transition-all duration-100 cursor-pointer"
              title="New Folder"
            >
              <Plus size={12} strokeWidth={1.5} />
            </button>
            <button
              onClick={onToggle}
              className="flex items-center justify-center w-5 h-5 text-[var(--text-muted)] hover:text-[var(--omnissiah-red)] transition-all duration-100 cursor-pointer"
              title="Close (Ctrl+B)"
            >
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ═══ New Folder Input ═══ */}
        {newFolderParent && (
          <div className="flex items-center gap-1.5 h-7 px-2 bg-[var(--iron-dark)] border-b border-[var(--iron-gray)]">
            <Folder size={13} strokeWidth={1.5} className="text-[var(--cogitator-gold)] flex-shrink-0" />
            <input
              ref={newFolderInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setNewFolderParent(null);
                  setNewFolderName('');
                }
              }}
              onBlur={handleCreateFolder}
              placeholder="Folder name..."
              className="flex-1 h-full bg-transparent text-[var(--sacred-white)] font-mono text-[11px] placeholder:text-[var(--text-muted)] focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {/* ═══ Tree Items ═══ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {tree.map((item) => (
            <TreeItem
              key={item.id}
              item={item}
              depth={0}
              isActive={activeBookmarkId === item.id}
              onToggleFolder={handleToggleFolder}
              onOpenBookmark={handleOpenBookmark}
              onOpenInNewTab={handleOpenInNewTab}
              onContextMenu={handleContextMenu}
              dragState={dragState}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}

          {tree.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="text-[var(--steel-gray)] text-lg">◈</span>
              <span className="text-[var(--text-muted)] font-mono text-[10px] uppercase tracking-wider">
                No bookmarks
              </span>
            </div>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="h-7 px-3 border-t border-[var(--iron-gray)] flex items-center justify-between flex-shrink-0">
          <span className="text-[var(--text-muted)] font-mono text-[9px] uppercase tracking-wider">
            {tree.reduce((count, item) => {
              const countBookmarks = (items: BookmarkTreeItem[]): number =>
                items.reduce((acc, it) => acc + (it.type === 'bookmark' ? 1 : 0) + (it.children ? countBookmarks(it.children) : 0), 0);
              return count + countBookmarks([item]);
            }, 0)} bookmarks
          </span>
          <span className="text-[var(--parchment-dim)] font-mono text-[9px]">
            {tree.length} folders
          </span>
        </div>
      </div>

      {/* ═══ Context Menu ═══ */}
      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onOpenInNewTab={handleOpenInNewTab}
        bookmarkUrl={contextMenuUrl}
      />

      {/* ═══ Edit Dialog ═══ */}
      <EditDialog
        item={editingItem}
        onSave={handleSaveEdit}
        onClose={() => setEditingItem(null)}
      />
    </>
  );
};

export default BookmarkTree;
