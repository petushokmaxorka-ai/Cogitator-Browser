// ═══ SCROLL AREA ═══
// Custom scrollable container — Dark Mechanicus style

import React, { useRef, useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────
interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  autoHide?: boolean;
}

// ── Component ──────────────────────────────────────────────
const ScrollArea: React.FC<ScrollAreaProps> = ({
  children,
  className = '',
  maxHeight = '100%',
  autoHide = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle scroll event for auto-hide behavior
  const handleScroll = useCallback(() => {
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const containerClasses = [
    'relative overflow-hidden',
    className,
  ].join(' ');

  const viewportClasses = [
    'overflow-auto w-full h-full',
    'scrollbar-mechanicus',
    autoHide && !isScrolling && 'scrollbar-hidden',
    autoHide && isScrolling && 'scrollbar-visible',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      style={{ maxHeight }}
    >
      <div
        ref={scrollRef}
        className={viewportClasses}
        onScroll={handleScroll}
      >
        {children}
      </div>

      {/* Custom scrollbar track indicator (decorative) */}
      <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[var(--iron-dark)] pointer-events-none opacity-40">
        <div
          className="w-full bg-[var(--steel-gray)] transition-opacity duration-300"
          style={{ opacity: isScrolling ? 0.8 : 0.3 }}
        />
      </div>
    </div>
  );
};

export default ScrollArea;
