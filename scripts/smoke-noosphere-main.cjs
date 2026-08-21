const { app, BrowserWindow, session, protocol } = require('electron');
const { readFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

function tcpOpen(port) {
  try {
    execSync(`bash -c 'echo >/dev/tcp/127.0.0.1/${port}'`, { stdio: 'ignore', timeout: 400 });
    return true;
  } catch {
    return false;
  }
}

const BYPASS = 'localhost,127.0.0.1,<local>,<loopback>';

if (tcpOpen(7890)) {
  app.commandLine.appendSwitch('proxy-server', 'http://127.0.0.1:7890');
  app.commandLine.appendSwitch('proxy-bypass-list', BYPASS);
  console.log('[noosphere-smoke] proxy :7890 with bypass', BYPASS);
} else {
  console.log('[noosphere-smoke] no local proxy — direct');
}

async function loadPageOk(win, url, timeoutMs = 20000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok, detail) => {
      if (done) return;
      done = true;
      resolve({ ok, detail });
    };
    const t = setTimeout(() => finish(false, 'timeout'), timeoutMs);
    win.webContents.once('did-finish-load', () => {
      clearTimeout(t);
      const code = win.webContents.getHTTPResponseCode?.() ?? 0;
      finish(code === 0 || (code >= 200 && code < 400), `code=${code}`);
    });
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      clearTimeout(t);
      finish(false, `${code} ${desc}`);
    });
    win.loadURL(url).catch((err) => {
      clearTimeout(t);
      finish(false, String(err.message || err));
    });
  });
}

async function fetchJsonFromPage(win, url) {
  return win.webContents.executeJavaScript(`
    (async () => {
      try {
        const r = await fetch(${JSON.stringify(url)});
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}
        return { ok: r.ok, status: r.status, bodyLen: text.length, resultCount: json?.results?.length ?? -1 };
      } catch (e) {
        return { ok: false, status: 0, error: String(e.message || e) };
      }
    })()
  `);
}

app.whenReady().then(async () => {
  protocol.handle('cogitator', async (request) => {
    if (request.url.startsWith('cogitator://noosphere')) {
      const data = readFileSync(join(__dirname, '../resources/noosphere.html'));
      return new Response(data, {
        headers: { 'content-type': 'text/html', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response('not found', { status: 404 });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isSearx =
      details.url.startsWith('http://127.0.0.1:8080/') ||
      details.url.startsWith('http://localhost:8080/');
    if (isSearx && details.responseHeaders) {
      details.responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      details.responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS'];
      details.responseHeaders['Access-Control-Allow-Headers'] = ['Content-Type, Accept'];
    }
    callback({ responseHeaders: details.responseHeaders });
  });

  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 700,
    webPreferences: { sandbox: false, contextIsolation: true },
  });

  console.log('[noosphere-smoke] load cogitator://noosphere');
  await win.loadURL('cogitator://noosphere');

  const searchUrl =
    'http://127.0.0.1:8080/search?q=omnissiah&format=json&categories=general&safesearch=0';
  const search = await fetchJsonFromPage(win, searchUrl);
  console.log('[noosphere-smoke] SearXNG fetch:', JSON.stringify(search));

  const uiSearch = await win.webContents.executeJavaScript(`
    (async () => {
      const input = document.getElementById('searchInput');
      const btn = document.getElementById('searchBtn');
      if (!input || !btn) return { ok: false, error: 'no UI' };
      input.value = 'test';
      btn.click();
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 250));
        const cards = document.querySelectorAll('.result-card');
        const err = document.getElementById('emptyTitle')?.textContent || '';
        if (cards.length > 0) return { ok: true, cards: cards.length };
        if (err.includes('silent')) return { ok: false, error: document.getElementById('emptyText')?.textContent || err };
      }
      return { ok: false, error: 'timeout waiting results' };
    })()
  `);
  console.log('[noosphere-smoke] UI search click:', JSON.stringify(uiSearch));

  const dash = await loadPageOk(win, 'http://127.0.0.1:7777/');
  console.log('[noosphere-smoke] Dashboard load:', JSON.stringify(dash));

  const forge = await loadPageOk(win, 'http://127.0.0.1:9091/');
  console.log('[noosphere-smoke] Forge load:', JSON.stringify(forge));

  const ok =
    search.ok &&
    search.status === 200 &&
    search.resultCount > 0 &&
    dash.ok &&
    forge.ok &&
    uiSearch.ok;

  console.log(ok ? '[noosphere-smoke] PASS' : '[noosphere-smoke] FAIL');
  app.exit(ok ? 0 : 1);
});
