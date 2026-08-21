const { app, BrowserView, BrowserWindow } = require('electron');
const { execSync } = require('child_process');

function tcpOpen(port) {
  try {
    execSync(`bash -c 'echo >/dev/tcp/127.0.0.1/${port}'`, { stdio: 'ignore', timeout: 400 });
    return true;
  } catch {
    return false;
  }
}

if (tcpOpen(7890)) {
  app.commandLine.appendSwitch('proxy-server', 'http://127.0.0.1:7890');
  app.commandLine.appendSwitch('proxy-bypass-list', 'localhost,127.0.0.1,<local>,<loopback>');
}

const SITES = [
  { name: 'YouTube', url: 'https://www.youtube.com/', needsProxy: true },
  { name: 'GitHub', url: 'https://github.com/', needsProxy: true },
  { name: 'Reddit', url: 'https://www.reddit.com/', needsProxy: true },
  { name: 'Google', url: 'https://www.google.com/', needsProxy: true },
  { name: 'Mens', url: 'http://127.0.0.1:8000/health', needsProxy: false },
  { name: 'Forge', url: 'http://127.0.0.1:9091/', needsProxy: false },
  { name: 'Dashboard', url: 'http://127.0.0.1:7777/', needsProxy: false },
  { name: 'SearXNG', url: 'http://127.0.0.1:8080/', needsProxy: false },
];

function loadUrl(view, url, timeoutMs = 28000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok, detail) => {
      if (done) return;
      done = true;
      resolve({ ok, detail });
    };
    const t = setTimeout(() => finish(false, 'timeout'), timeoutMs);
    view.webContents.once('did-finish-load', () => {
      clearTimeout(t);
      const code = view.webContents.getHTTPResponseCode?.() ?? 0;
      const finalUrl = view.webContents.getURL();
      finish(true, `code=${code} url=${finalUrl}`);
    });
    view.webContents.once('did-fail-load', (_e, code, desc) => {
      clearTimeout(t);
      finish(false, `${code} ${desc}`);
    });
    view.webContents.loadURL(url).catch((err) => {
      clearTimeout(t);
      finish(false, String(err.message || err));
    });
  });
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1024, height: 768 });
  const view = new BrowserView({ webPreferences: { sandbox: true, contextIsolation: true } });
  win.setBrowserView(view);
  view.setBounds({ x: 0, y: 0, width: 1024, height: 768 });

  const results = [];
  for (const site of SITES) {
    console.log(`[sites] ${site.name} → ${site.url}`);
    const r = await loadUrl(view, site.url);
    results.push({ ...site, ...r });
    console.log(`[sites] ${site.name}: ${r.ok ? 'OK' : 'FAIL'} ${r.detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  app.exit(failed.length === 0 ? 0 : 1);
});
