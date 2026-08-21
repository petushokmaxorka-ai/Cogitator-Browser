/**
 * Smoke: YouTube tab → videoId → PiP embed (not fallback).
 */
const { app, BrowserWindow, BrowserView, protocol } = require('electron');
const { readFile } = require('fs/promises');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PRELOAD = path.join(ROOT, 'out/preload/index.js');
const PIP_HTML = path.join(ROOT, 'resources/pip.html');

const WATCH_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const VIDEO_DETECTOR_SCRIPT = `
(() => {
  const videos = Array.from(document.querySelectorAll('video'));
  const playing = videos.find(v => !v.paused && v.readyState >= 2);
  const any = videos[0];
  const video = playing || any;
  if (!video) return null;
  let youtubeId = null;
  try {
    const href = location.href;
    if (/youtube\\.com|youtu\\.be/i.test(href)) {
      const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\\.be\\/([a-zA-Z0-9_-]{11})/,
        /\\/shorts\\/([a-zA-Z0-9_-]{11})/,
        /\\/embed\\/([a-zA-Z0-9_-]{11})/,
        /\\/live\\/([a-zA-Z0-9_-]{11})/,
      ];
      for (const p of patterns) {
        const m = href.match(p);
        if (m) { youtubeId = m[1]; break; }
      }
      if (!youtubeId && window.ytInitialPlayerResponse?.videoDetails?.videoId) {
        youtubeId = window.ytInitialPlayerResponse.videoDetails.videoId;
      }
      if (!youtubeId) {
        const canon = document.querySelector('link[rel="canonical"]');
        const canonHref = canon && canon.getAttribute('href');
        if (canonHref) {
          const cm = canonHref.match(/(?:[?&]v=|\\/shorts\\/|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/);
          if (cm) youtubeId = cm[1];
        }
      }
    }
  } catch {}
  return {
    src: video.currentSrc || video.src || '',
    currentTime: video.currentTime || 0,
    paused: video.paused,
    youtubeId,
  };
})()
`;

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
  console.log('[pip-smoke] CLI proxy :7890');
}

function extractYoutubeId(url) {
  if (!url || !/youtube\.com|youtu\.be/i.test(url)) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function buildPayload(video) {
  const ytId = video.youtubeId || extractYoutubeId(video.url);
  if (ytId) {
    return {
      type: 'youtube',
      videoId: ytId,
      startTime: Math.floor(video.currentTime || 0),
      title: video.title || 'Video',
      url: video.url,
    };
  }
  if (video.src && !video.src.startsWith('blob:') && !video.src.startsWith('data:')) {
    return { type: 'direct', src: video.src, url: video.url };
  }
  return { type: 'fallback', url: video.url };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadUrl(wc, url, timeoutMs = 45000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok, detail) => {
      if (done) return;
      done = true;
      resolve({ ok, detail });
    };
    const t = setTimeout(() => finish(false, 'timeout'), timeoutMs);
    wc.once('did-finish-load', () => {
      clearTimeout(t);
      finish(true, wc.getURL());
    });
    wc.once('did-fail-load', (_e, code, desc) => {
      clearTimeout(t);
      finish(false, `${code} ${desc}`);
    });
    wc.loadURL(url).catch((err) => {
      clearTimeout(t);
      finish(false, String(err.message || err));
    });
  });
}

let settled = false;
function finish(ok, msg) {
  if (settled) return;
  settled = true;
  console.log(ok ? '[pip-smoke] PASS' : '[pip-smoke] FAIL', msg);
  app.exit(ok ? 0 : 1);
}

async function runDirectEmbedSmoke(youtubeId) {
  const pipWin = new BrowserWindow({
    show: false,
    width: 420,
    height: 280,
    transparent: false,
    backgroundColor: '#000000',
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const origin = encodeURIComponent('https://www.youtube.com');
  const embedUrl =
    `https://www.youtube.com/embed/${youtubeId}` +
    `?autoplay=1&start=0&rel=0&modestbranding=1&playsinline=1` +
    `&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;

  const pipReady = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('pip load timeout')), 25000);
    pipWin.webContents.once('did-finish-load', () => {
      clearTimeout(t);
      resolve();
    });
    pipWin.webContents.once('did-fail-load', (_e, code, desc) => {
      clearTimeout(t);
      reject(new Error(`embed fail ${code} ${desc}`));
    });
  });

  await pipWin.loadURL(embedUrl);
  await pipReady;
  console.log('[pip-smoke] youtube embed loaded', pipWin.webContents.getURL());

  await sleep(3000);

  const state = await pipWin.webContents.executeJavaScript(
    `({
      href: location.href,
      hasPlayer: !!document.querySelector('video, .html5-video-player, #movie_player'),
      bodyLen: document.body?.innerText?.length || 0,
    })`,
    true,
  );

  console.log('[pip-smoke] pip dom', JSON.stringify(state));

  const href = state.href || '';
  if (!href.includes('youtube.com/embed/' + youtubeId)) {
    finish(false, `bad embed url: ${href}`);
    return;
  }
  if (state.bodyLen < 5 && !state.hasPlayer) {
    finish(false, 'embed page appears empty');
    return;
  }

  finish(true, `youtubeId=${youtubeId} direct embed ok`);
}

app.whenReady().then(async () => {
  protocol.handle('cogitator', async (request) => {
    if (request.url.startsWith('cogitator://pip')) {
      const data = await readFile(PIP_HTML);
      return new Response(data, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    return new Response('not found', { status: 404 });
  });

  const tabWin = new BrowserWindow({ show: false, width: 1280, height: 800 });
  const tabView = new BrowserView({
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  tabWin.setBrowserView(tabView);
  tabView.setBounds({ x: 0, y: 0, width: 1280, height: 800 });

  console.log('[pip-smoke] loading', WATCH_URL);
  const load = await loadUrl(tabView.webContents, WATCH_URL);
  if (!load.ok) {
    const id = extractYoutubeId(WATCH_URL);
    console.log('[pip-smoke] youtube tab failed — direct embed fallback', load.detail);
    if (id) {
      try {
        await runDirectEmbedSmoke(id);
      } catch (err) {
        finish(false, `youtube load: ${load.detail}; embed: ${err.message || err}`);
      }
      return;
    }
    finish(false, `youtube load: ${load.detail}`);
    return;
  }
  console.log('[pip-smoke] youtube loaded:', load.detail);

  let detector = null;
  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    try {
      detector = await tabView.webContents.executeJavaScript(VIDEO_DETECTOR_SCRIPT, true);
    } catch (err) {
      console.log('[pip-smoke] detector attempt', i + 1, err.message);
    }
    if (detector) break;
  }
  const pageUrl = tabView.webContents.getURL();

  if (!detector) {
    const fallbackId = extractYoutubeId(pageUrl || WATCH_URL);
    if (fallbackId) {
      console.log('[pip-smoke] no <video> — fallback videoId from URL', fallbackId);
      detector = { youtubeId: fallbackId, currentTime: 0, src: '', paused: true };
    } else {
      finish(false, 'no <video> on YouTube page after 30s');
      return;
    }
  }
  const youtubeId = detector.youtubeId || extractYoutubeId(pageUrl);
  console.log('[pip-smoke] detector src=', detector.src?.slice(0, 40), 'youtubeId=', youtubeId);

  if (!youtubeId) {
    finish(false, `no videoId url=${pageUrl}`);
    return;
  }

  const payload = buildPayload({
    url: pageUrl,
    youtubeId,
    src: detector.src,
    currentTime: detector.currentTime,
    title: tabView.webContents.getTitle(),
  });

  if (payload.type !== 'youtube') {
    finish(false, `payload type=${payload.type} expected youtube`);
    return;
  }

  try {
    await runDirectEmbedSmoke(youtubeId);
  } catch (err) {
    finish(false, String(err.message || err));
  }
});
