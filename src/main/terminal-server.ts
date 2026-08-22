// ═══════════════════════════════════════════════════════════
// COGITATOR BROWSER — Real Terminal (node-pty)
// ═══════════════════════════════════════════════════════════
// Interactive PTY sessions: spawn/write/resize/kill over IPC,
// output streamed back via TERM_DATA_EVENT. One session per
// terminal panel instance; all sessions die with the app.

import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn as ptySpawn, type IPty } from 'node-pty';
import { homedir } from 'os';
import { IPC_CHANNELS } from '../shared/types';

const sessions = new Map<string, IPty>();
let counter = 0;

function broadcast(id: string, data: string): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(IPC_CHANNELS.TERM_DATA_EVENT, { id, data });
    }
  }
}

interface CreateOptions {
  cols?: number;
  rows?: number;
}

export function registerTerminalHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TERM_CREATE, (_e, opts: CreateOptions | undefined) => {
    const id = `term-${++counter}`;
    const shell = process.env.SHELL || '/bin/bash';
    const pty = ptySpawn(shell, [], {
      name: 'xterm-256color',
      cols: opts?.cols ?? 80,
      rows: opts?.rows ?? 24,
      cwd: homedir(),
      env: process.env as Record<string, string>,
    });
    pty.onData((data) => broadcast(id, data));
    pty.onExit(({ exitCode }) => {
      broadcast(id, `\r\n\x1b[90m[process exited: ${exitCode}]\x1b[0m\r\n`);
      sessions.delete(id);
    });
    sessions.set(id, pty);
    return { id, shell };
  });

  ipcMain.handle(IPC_CHANNELS.TERM_WRITE, (_e, id: string, data: string) => {
    sessions.get(id)?.write(data);
  });

  ipcMain.handle(IPC_CHANNELS.TERM_RESIZE, (_e, id: string, cols: number, rows: number) => {
    try {
      sessions.get(id)?.resize(cols, rows);
    } catch {
      // session may be mid-exit; resize races are harmless
    }
  });

  ipcMain.handle(IPC_CHANNELS.TERM_KILL, (_e, id: string) => {
    const pty = sessions.get(id);
    if (pty) {
      try {
        pty.kill();
      } catch {
        // already dead
      }
      sessions.delete(id);
    }
  });

  app.on('will-quit', () => {
    for (const pty of sessions.values()) {
      try {
        pty.kill();
      } catch {
        // already dead
      }
    }
    sessions.clear();
  });
}
