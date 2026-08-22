// ═══ TOOLTIP ═══
// Portal + fixed coords — stays in chrome band (above native BrowserView)

import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CHROME_HEIGHT } from '../../../shared/constants';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipAlign = 'start' | 'center' | 'end';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  align?: TooltipAlign;
  wrap?: boolean;
  delay?: number;
  className?: string;
}

const GAP = 6;
const VIEWPORT_PAD = 8;

function computeCoords(
  trigger: DOMRect,
  tip: DOMRect,
  position: TooltipPosition,
  align: TooltipAlign,
): { top: number; left: number } {
  let top = 0;
  let left = 0;

  switch (position) {
    case 'top':
      top = trigger.top - tip.height - GAP;
      break;
    case 'bottom':
      top = trigger.bottom + GAP;
      break;
    case 'left':
      top = trigger.top + trigger.height / 2 - tip.height / 2;
      left = trigger.left - tip.width - GAP;
      break;
    case 'right':
      top = trigger.top + trigger.height / 2 - tip.height / 2;
      left = trigger.right + GAP;
      break;
    default:
      break;
  }

  if (position === 'top' || position === 'bottom') {
    switch (align) {
      case 'start':
        left = trigger.left;
        break;
      case 'end':
        left = trigger.right - tip.width;
        break;
      default:
        left = trigger.left + trigger.width / 2 - tip.width / 2;
        break;
    }
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - tip.width - VIEWPORT_PAD));

  const chromeMaxBottom = CHROME_HEIGHT - VIEWPORT_PAD;
  if (top + tip.height > chromeMaxBottom) {
    top = trigger.top - tip.height - GAP;
  }
  if (top < VIEWPORT_PAD) {
    top = trigger.bottom + GAP;
  }
  top = Math.max(VIEWPORT_PAD, Math.min(top, chromeMaxBottom - tip.height));

  return { top, left };
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'bottom',
  align = 'center',
  wrap = false,
  delay = 300,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    setCoords(computeCoords(trigger, tip, position, align));
  }, [visible, position, align, content]);

  const tipNode = visible ? (
    <div
      ref={tipRef}
      role="tooltip"
      className={[
        'fixed z-[200000] pointer-events-none',
        'px-2 py-1',
        'bg-[var(--void-black)]',
        'border border-[var(--omnissiah-red)]',
        'shadow-[var(--glow-red)]',
        'font-mono text-[10px] uppercase tracking-wider',
        'text-[var(--parchment)]',
        wrap ? 'whitespace-normal max-w-[220px]' : 'whitespace-nowrap',
        className,
      ].join(' ')}
      style={{ top: coords.top, left: coords.left }}
    >
      {content}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {tipNode && createPortal(tipNode, document.body)}
    </>
  );
};

export default Tooltip;
