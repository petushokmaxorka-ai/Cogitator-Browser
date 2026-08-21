const { app, BrowserWindow, BrowserView, session, protocol } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
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
  console.log('[smoke] CLI proxy :7890');
}

const ROOT = path.join(__dirname, '..');

function registerCogitator() {
  const { protocol, net } = require('electron');
  protocol.handle('cogitator', (request) => {
    if (request.url.startsWith('cogitator://error')) {
      return new Response('<html><body>error</body></html>', {
        headers: { 'content-type': 'text/html' },
      });
    }
    return net.fetch(pathToFileURL(path.join(ROOT, 'resources/start.html')).toString());
  });
}

app.whenReady().then(async () => {
  registerCogitator();
  await new Promise((r) => setTimeout(r, 300));

  const win = new BrowserWindow({ show: false, width: 1280, height: 800 });
  const view = new BrowserView({
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  win.setBrowserView(view);
  view.setBounds({ x: 0, y: 0, width: 1280, height: 800 });

  const target = 'https://www.youtube.com/';
  let settled = false;

  const finish = (ok, msg) => {
    if (settled) return;
    settled = true;
    console.log(ok ? '[smoke] PASS' : '[smoke] FAIL', msg);
    app.exit(ok ? 0 : 1);
  };

  view.webContents.on('did-fail-load', (_e, code, desc) => {
    finish(false, `did-fail-load ${code} ${desc}`);
  });

  view.webContents.on('did-finish-load', async () => {
    const url = view.webContents.getURL();
    const title = view.webContents.getTitle();
    console.log('[smoke] loaded url=', url, 'title=', title);
    if (!url.includes('youtube.com')) {
      finish(false, `unexpected url ${url}`);
      return;
    }
    try {
      const probe = await view.webContents.executeJavaScript(
        `document.body && document.body.innerText && document.body.innerText.length > 10`,
        true,
      );
      const title = view.webContents.getTitle();
      const ok = Boolean(probe) || (title && title.toLowerCase().includes('youtube'));
      finish(ok, `body probe=${probe} title=${title}`);
    } catch (err) {
      finish(false, `executeJavaScript ${err}`);
    }
  });

  setTimeout(() => finish(false, 'timeout 35s'), 35000);

  console.log('[smoke] loading', target);
  await view.webContents.loadURL(target);
});
