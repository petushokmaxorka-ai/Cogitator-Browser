// ═══ TAB BAR ═══
// Tab strip with horizontal scroll — Dark Mechanicus style
// Each tab: a portal to another corner of the Noosphere

import React, { useRef, useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import type { Tab } from '../../../shared/types';

// ── Types ──────────────────────────────────────────────────
interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onCreateTab: () => void;
  onCloseTab: (id: string) => void;
  onSwitchTab: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, tabId: string) => void;
}

// ── Tab Item Component ─────────────────────────────────────
interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, tabId: string) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onSwitch, onClose, onContextMenu }) => {
  const [showClose, setShowClose] = useState(false);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose(tab.id);
    },
    [tab.id, onClose]
  );

  // Truncate title
  const displayTitle =
    tab.title && tab.title.length > 24
      ? `${tab.title.slice(0, 22)}...`
      : tab.title || tab.url || 'Untitled';

  return (
    <div
      onClick={() => onSwitch(tab.id)}
      onContextMenu={(e) => onContextMenu?.(e, tab.id)}
      onMouseEnter={() => setShowClose(true)}
      onMouseLeave={() => setShowClose(false)}
      className={[
        'group relative',
        'flex items-center gap-2',
        'h-[34px] px-3 pr-2',
        'max-w-[200px] min-w-[100px]',
        'flex-shrink-0',
        'cursor-pointer',
        'border-t border-l border-r border-transparent',
        'font-mono text-[11px]',
        'transition-all duration-100',
        'select-none',
        // Active tab styles
        isActive
          ? [
              'h-full',
              'bg-[var(--void-black)]',
              'border-t-[var(--cogitator-gold)] border-l-[var(--cogitator-gold)] border-r-[var(--cogitator-gold)]',
              'text-[var(--cogitator-gold-bright,#e8c87e)]',
              'border-b-2 border-b-[var(--cogitator-gold)]',
              'shadow-[0_0_8px_rgba(200,168,110,0.25)]',
            ].join(' ')
          : [
              'bg-[var(--void-black)]',
              'text-[var(--parchment)]',
              'hover:text-[var(--cogitator-gold-bright,#e8c87e)]',
              'border-b border-b-[var(--cogitator-gold-dim)]',
            ].join(' '),
      ].join(' ')}
    >
      {/* Favicon */}
      {tab.favicon ? (
        <img
          src={tab.favicon}
          alt=""
          className="w-3.5 h-3.5 flex-shrink-0 rounded-sm"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="text-[var(--text-muted)] text-[10px] flex-shrink-0">
          ◉
        </span>
      )}

      {/* Tab title */}
      <span className="flex-1 truncate">{displayTitle}</span>

      {/* Loading indicator */}
      {tab.isLoading && (
        <span className="loading-cog text-[var(--omnissiah-red)] text-[10px] flex-shrink-0">
          ◈
        </span>
      )}

      {/* Close button — appears on hover or when active */}
      <button
        onClick={handleClose}
        className={[
          'flex items-center justify-center',
          'w-4 h-4',
          'rounded-none',
          'text-[var(--text-muted)]',
          'hover:text-[var(--omnissiah-red)]',
          'hover:bg-[rgba(139,0,0,0.15)]',
          'transition-all duration-100',
          'flex-shrink-0',
          // Show on hover, always visible for active tab
          showClose || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
        type="button"
        aria-label={`Close ${tab.title || 'tab'}`}
        title="Close tab"
      >
        <X size={10} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Main TabBar Component ──────────────────────────────────
const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onCreateTab,
  onCloseTab,
  onSwitchTab,
  onContextMenu,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={[
        'flex items-center',
        'h-10 min-h-[40px]',
        'bg-[var(--omnissiah-red-dim)]',
        'border-b border-[var(--omnissiah-red)]',
      ].join(' ')}
    >
      {/* Scrollable tab container */}
      <div
        ref={scrollRef}
        className={[
          'flex items-end',
          'flex-1 h-full',
          'overflow-x-auto overflow-y-hidden',
          'scrollbar-thin scrollbar-transparent',
        ].join(' ')}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSwitch={onSwitchTab}
            onClose={onCloseTab}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>

      {/* New Tab button */}
      <button
        onClick={onCreateTab}
        className={[
          'flex items-center justify-center',
          'w-7 h-7 mx-1',
          'flex-shrink-0',
          'text-[var(--cogitator-gold)]',
          'border border-[var(--cogitator-gold-dim)]',
          'hover:text-[var(--omnissiah-red)]',
          'hover:border-[var(--omnissiah-red)]',
          'hover:shadow-[0_0_8px_rgba(255,0,0,0.3)]',
          'transition-all duration-150',
          'cursor-pointer',
          'active:scale-[0.95]',
        ].join(' ')}
        type="button"
        aria-label="New tab"
        title="New Tab"
      >
        <Plus size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default TabBar;
