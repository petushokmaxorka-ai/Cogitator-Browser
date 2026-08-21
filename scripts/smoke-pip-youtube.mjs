#!/usr/bin/env node
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(
  join(root, 'node_modules/.bin/electron'),
  [join(root, 'scripts/smoke-pip-youtube-main.cjs')],
  {
    cwd: root,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '', COGITATOR_PROXY_MODE: 'auto' },
    stdio: 'inherit',
  },
);

child.on('exit', (code) => {
  console.log(code === 0 ? 'SMOKE_PIP_OK' : 'SMOKE_PIP_FAIL code=', code);
  process.exit(code ?? 1);
});
