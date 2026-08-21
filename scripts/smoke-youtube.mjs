#!/usr/bin/env node
/**
 * Headless-ish smoke test: boot Electron, load YouTube via tab manager path, exit with code.
 */
import { spawn } from 'child_process';
import { createConnection } from 'net';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function portOpen(port) {
  return new Promise((resolve) => {
    const s = createConnection(port, '127.0.0.1');
    const done = (ok) => {
      try {
        s.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    s.on('connect', () => done(true));
    s.on('error', () => done(false));
    setTimeout(() => done(false), 500);
  });
}

const proxyUp = await portOpen(7890);
console.log(`FlClash :7890 ${proxyUp ? 'UP' : 'DOWN'}`);

const smokeMain = join(root, 'scripts/smoke-youtube-main.cjs');
const electron = join(root, 'node_modules/.bin/electron');

const child = spawn(
  electron,
  [smokeMain],
  {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '',
      COGITATOR_PROXY_MODE: 'auto',
      DISPLAY: process.env.DISPLAY || ':0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let out = '';
child.stdout.on('data', (d) => {
  const s = d.toString();
  out += s;
  process.stdout.write(s);
});
child.stderr.on('data', (d) => {
  const s = d.toString();
  out += s;
  process.stderr.write(s);
});

const killTimer = setTimeout(() => {
  console.error('SMOKE_TIMEOUT');
  child.kill('SIGTERM');
}, 45000);

child.on('exit', (code) => {
  clearTimeout(killTimer);
  if (code === 0) {
    console.log('SMOKE_OK');
    process.exit(0);
  }
  console.error('SMOKE_FAIL code=', code);
  process.exit(code ?? 1);
});
