#!/usr/bin/env node
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(join(root, 'node_modules/.bin/electron'), [join(root, 'scripts/smoke-noosphere-main.cjs')], {
  cwd: root,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '', COGITATOR_PROXY_MODE: 'auto' },
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 1));
