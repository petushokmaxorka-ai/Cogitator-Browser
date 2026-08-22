// ═══ MACHINE CONSOLE ═══
// Real terminal — interactive PTY (node-pty) rendered with xterm.js.
// The sacred interface to the Machine Spirit is now an actual shell.

import { useCallback, useEffect, useRef } from 'react';
import { TerminalSquare } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TERM_THEME = {
  background: '#000000',
  foreground: '#D4C5A0',
  cursor: '#C8A84B',
  cursorAccent: '#000000',
  selectionBackground: 'rgba(200, 168, 75, 0.3)',
  black: '#000000',
  red: '#FF0000',
  green: '#00BFBF',
  yellow: '#C8A84B',
  blue: '#8B7355',
  magenta: '#DC2626',
  cyan: '#00BFBF',
  white: '#E8E8E8',
  brightBlack: '#3A3A3A',
  brightRed: '#FF4444',
  brightGreen: '#44DDDD',
  brightYellow: '#E8C87E',
  brightBlue: '#A89268',
  brightMagenta: '#FF5555',
  brightCyan: '#55EEEE',
  brightWhite: '#FFFFFF',
};

export default function TerminalPanel(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      theme: TERM_THEME,
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    try {
      fit.fit();
    } catch {
      /* container not measured yet — first resize observer tick will fit */
    }
    termRef.current = term;
    term.focus();

    let disposed = false;
    let unsubData: (() => void) | undefined;

    const boot = async (): Promise<void> => {
      const api = window.electronAPI?.terminal;
      if (!api) {
        term.writeln('\x1b[31m[MACHINE CONSOLE] PTY bridge unavailable\x1b[0m');
        return;
      }
      try {
        const { id, shell } = await api.create({
          cols: term.cols,
          rows: term.rows,
        });
        if (disposed) {
          void api.kill(id);
          return;
        }
        sessionRef.current = id;
        term.onData((data) => void api.write(id, data));
        term.onResize(({ cols, rows }) => void api.resize(id, cols, rows));
        unsubData = api.onData(({ id: evId, data }) => {
          if (evId === sessionRef.current) term.write(data);
        });
        term.writeln(`\x1b[90m◆ MACHINE CONSOLE — ${shell}\x1b[0m`);
      } catch (err) {
        term.writeln(`\x1b[31m[MACHINE CONSOLE] PTY failed: ${(err as Error).message}\x1b[0m`);
      }
    };
    void boot();

    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* not measurable yet */
      }
    });
    observer.observe(container);

    return () => {
      disposed = true;
      unsubData?.();
      observer.disconnect();
      if (sessionRef.current) {
        void window.electronAPI?.terminal?.kill(sessionRef.current);
        sessionRef.current = null;
      }
      term.dispose();
      termRef.current = null;
    };
  }, []);

  const focusTerm = useCallback(() => {
    termRef.current?.focus();
  }, []);

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ background: '#000000' }}
      onClick={focusTerm}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{
          borderColor: 'var(--iron-gray, #2A2A2A)',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'var(--cogitator-gold, #C8A84B)',
          textTransform: 'uppercase',
        }}
      >
        <TerminalSquare size={12} />
        <span>Machine Console — PTY</span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 p-2" />
    </div>
  );
}
