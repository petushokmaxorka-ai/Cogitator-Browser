// ═══════════════════════════════════════════════════════════
// Fingerprint Spoofer — COGITATOR BROWSER v2
// Anti-fingerprinting scripts injected into every WebContents.
// Injects imperceptible noise into Canvas, WebGL, AudioContext,
// and normalizes device / screen / navigator APIs.
// ═══════════════════════════════════════════════════════════

import { getSessionNoise } from './privacy-engine';

// ── Per-session noise value (consistent for the session) ──
const NOISE = getSessionNoise();
const NOISE_INT = NOISE > 0.5 ? 1 : -1;

// ═══════════════════════════════════════════════════════════
// Skip-list for authentication-sensitive domains
// ═══════════════════════════════════════════════════════════

// Domains where fingerprint randomization breaks legitimate login flows
// (Google/YouTube/Proton/GitHub/Microsoft auth detect canvas/WebGL/audio spoofing).
const SPOOF_SKIP_HOSTS = [
  'accounts.google.com',
  'myaccount.google.com',
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'accounts.youtube.com',
  'mail.google.com',
  'mail.proton.me',
  'account.proton.me',
  'github.com',
  'login.microsoftonline.com',
];

function shouldSkipSpoof(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return SPOOF_SKIP_HOSTS.some(h => host === h || host.endsWith('.' + h));
  } catch { return false; }
}

// Utility guard injected at the top of each IIFE script string.
function skipIfAuthSite(): string {
  return `
  if (shouldSkipSpoof(location.href)) { return; }
`;
}

// Note: shouldSkipSpoof and skipIfAuthSite are string-helpers; the actual
// shouldSkipSpoof implementation is embedded in each IIFE so scripts remain
// self-contained when injected via executeJavaScript.
// Adds imperceptible ±1 noise to RGB channels in getImageData()
// and toDataURL()/toBlob() outputs. This breaks canvas fingerprinting
// while keeping visuals identical to the human eye.
// ═══════════════════════════════════════════════════════════

export const CANVAS_SPOOF = `
(function() {
  'use strict';
  const NOISE = ${NOISE_INT};

  // Skip fingerprint randomization on auth sites to avoid "This browser or app
  // may not be secure" errors from Google/YouTube/Proton/GitHub/Microsoft.
  function shouldSkipSpoof() {
    try {
      const host = location.hostname;
      const skip = [
        'accounts.google.com',
        'myaccount.google.com',
        'www.youtube.com',
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'accounts.youtube.com',
        'mail.google.com',
        'mail.proton.me',
        'account.proton.me',
        'github.com',
        'login.microsoftonline.com',
      ];
      return skip.some(h => host === h || host.endsWith('.' + h));
    } catch { return false; }
  }
  if (shouldSkipSpoof()) return;

  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const origToBlob = HTMLCanvasElement.prototype.toBlob;

  // ── getImageData: add imperceptible noise ──
  CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
    const imageData = origGetImageData.call(this, sx, sy, sw, sh);
    try {
      const data = imageData.data;
      // Deterministic noise based on pixel index — consistent per session
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = (data[i]     + NOISE) & 0xFF; // R
        data[i + 1] = (data[i + 1] + NOISE) & 0xFF; // G
        data[i + 2] = (data[i + 2] + NOISE) & 0xFF; // B
        // Alpha channel (i+3) is NOT modified — would be visible
      }
    } catch (e) { /* silently fail for cross-origin canvases */ }
    return imageData;
  };

  // ── toDataURL: noise injected via temporary canvas ──
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    try {
      const ctx = this.getContext('2d');
      if (ctx && this.width > 0 && this.height > 0) {
        const w = this.width;
        const h = this.height;
        const imgData = origGetImageData.call(ctx, 0, 0, w, h);
        const newData = new Uint8ClampedArray(imgData.data);
        for (let i = 0; i < newData.length; i += 4) {
          newData[i]     = (newData[i]     + NOISE) & 0xFF;
          newData[i + 1] = (newData[i + 1] + NOISE) & 0xFF;
          newData[i + 2] = (newData[i + 2] + NOISE) & 0xFF;
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(new ImageData(newData, w, h), 0, 0);
        return origToDataURL.call(tempCanvas, type, quality);
      }
    } catch (e) { /* cross-origin or other failure */ }
    return origToDataURL.call(this, type, quality);
  };

  // ── toBlob: same noise injection via temporary canvas ──
  HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
    try {
      const ctx = this.getContext('2d');
      if (ctx && this.width > 0 && this.height > 0) {
        const w = this.width;
        const h = this.height;
        const imgData = origGetImageData.call(ctx, 0, 0, w, h);
        const newData = new Uint8ClampedArray(imgData.data);
        for (let i = 0; i < newData.length; i += 4) {
          newData[i]     = (newData[i]     + NOISE) & 0xFF;
          newData[i + 1] = (newData[i + 1] + NOISE) & 0xFF;
          newData[i + 2] = (newData[i + 2] + NOISE) & 0xFF;
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(new ImageData(newData, w, h), 0, 0);
        return origToBlob.call(tempCanvas, callback, type, quality);
      }
    } catch (e) { /* cross-origin or other failure */ }
    return origToBlob.call(this, callback, type, quality);
  };

  // ── isPointInPath / isPointInStroke: consistency ──
  const origPointInPath = CanvasRenderingContext2D.prototype.isPointInPath;
  CanvasRenderingContext2D.prototype.isPointInPath = function(path, x, y, fillRule) {
    // Normalize argument overloads
    if (arguments.length >= 3 && typeof x === 'number') {
      return origPointInPath.apply(this, arguments);
    }
    return origPointInPath.apply(this, arguments);
  };
})();
`;

// ═══════════════════════════════════════════════════════════
// 3.2 WebGL / WebGL2 Fingerprint Randomization
// Spoof UNMASKED_VENDOR and UNMASKED_RENDERER to common values.
// Also adds slight noise to readPixels() and getParameter()
// where it doesn't break rendering.
// ═══════════════════════════════════════════════════════════

export const WEBGL_SPOOF = `
(function() {
  'use strict';

  // Skip fingerprint randomization on auth sites to avoid login security checks.
  function shouldSkipSpoof() {
    try {
      const host = location.hostname;
      const skip = [
        'accounts.google.com',
        'myaccount.google.com',
        'www.youtube.com',
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'accounts.youtube.com',
        'mail.google.com',
        'mail.proton.me',
        'account.proton.me',
        'github.com',
        'login.microsoftonline.com',
      ];
      return skip.some(h => host === h || host.endsWith('.' + h));
    } catch { return false; }
  }
  if (shouldSkipSpoof()) return;

  const VENDOR = 'Google Inc. (NVIDIA)';
  const RENDERER = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)';

  const VENDOR_WEBGL   = 0x9245;  // UNMASKED_VENDOR_WEBGL
  const RENDERER_WEBGL = 0x9246;  // UNMASKED_RENDERER_WEBGL

  // ── WebGLRenderingContext ──
  const origGetParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(pname) {
    if (pname === VENDOR_WEBGL)   return VENDOR;
    if (pname === RENDERER_WEBGL) return RENDERER;
    // Add subtle noise to debug info extensions
    if (pname === 0x1F00) return VENDOR; // VENDOR
    if (pname === 0x1F01) return RENDERER; // RENDERER
    return origGetParam.call(this, pname);
  };

  // ── WebGL2RenderingContext ──
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const origGetParam2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(pname) {
      if (pname === VENDOR_WEBGL)   return VENDOR;
      if (pname === RENDERER_WEBGL) return RENDERER;
      if (pname === 0x1F00) return VENDOR;
      if (pname === 0x1F01) return RENDERER;
      return origGetParam2.call(this, pname);
    };
  }

  // ── getShaderPrecisionFormat: normalize output ──
  const origPrecision = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
  WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shadertype, precisiontype) {
    const result = origPrecision.call(this, shadertype, precisiontype);
    if (result) {
      // Return deterministic values regardless of GPU
      return {
        precision: 23,
        rangeMin: 127,
        rangeMax: 127,
      };
    }
    return result;
  };

  // ── getSupportedExtensions: limit entropy ──
  const origExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
  WebGLRenderingContext.prototype.getSupportedExtensions = function() {
    const exts = origExtensions.call(this);
    if (!exts) return null;
    // Remove debug/profiling extensions that add fingerprinting surface
    return exts.filter(function(ext) {
      return !ext.match(/debug|profiling/i);
    });
  };

  // ── readPixels: add imperceptible noise ──
  const origReadPixels = WebGLRenderingContext.prototype.readPixels;
  WebGLRenderingContext.prototype.readPixels = function(x, y, width, height, format, type, pixels) {
    origReadPixels.call(this, x, y, width, height, format, type, pixels);
    if (pixels && pixels instanceof Uint8Array && pixels.length > 0) {
      const NOISE = ${NOISE_INT};
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i]     = (pixels[i]     + NOISE) & 0xFF;
        pixels[i + 1] = (pixels[i + 1] + NOISE) & 0xFF;
        pixels[i + 2] = (pixels[i + 2] + NOISE) & 0xFF;
      }
    }
  };
})();
`;

// ═══════════════════════════════════════════════════════════
// 3.3 AudioContext Fingerprint Randomization
// Adds sub-audible noise to AudioBuffer operations.
// The noise is below human hearing threshold (< -120dB)
// but sufficient to break audio fingerprint hashing.
// ═══════════════════════════════════════════════════════════

export const AUDIO_SPOOF = `
(function() {
  'use strict';
  const NOISE_AMP = 0.000001; // ~ -120 dB — imperceptible

  // Skip fingerprint randomization on auth sites to avoid login security checks.
  function shouldSkipSpoof() {
    try {
      const host = location.hostname;
      const skip = [
        'accounts.google.com',
        'myaccount.google.com',
        'www.youtube.com',
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'accounts.youtube.com',
        'mail.google.com',
        'mail.proton.me',
        'account.proton.me',
        'github.com',
        'login.microsoftonline.com',
      ];
      return skip.some(h => host === h || host.endsWith('.' + h));
    } catch { return false; }
  }
  if (shouldSkipSpoof()) return;

  // ── AudioBuffer.copyFromChannel ──
  if (AudioBuffer.prototype.copyFromChannel) {
    const origCopyFrom = AudioBuffer.prototype.copyFromChannel;
    AudioBuffer.prototype.copyFromChannel = function(destination, channelNumber, startInChannel) {
      origCopyFrom.call(this, destination, channelNumber, startInChannel || 0);
      // Add deterministic noise based on sample index
      for (let i = 0; i < destination.length; i++) {
        const hash = Math.sin(i * 9301 + 49297) * 0.5 + 0.5; // pseudo-random but deterministic
        destination[i] += (hash - 0.5) * NOISE_AMP * 2;
      }
    };
  }

  // ── AudioBuffer.getChannelData ──
  const origGetChannel = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function(channel) {
    const data = origGetChannel.call(this, channel);
    // Return a cloned, noised Float32Array instead of the original
    // This prevents in-place modification of the original buffer
    const cloned = new Float32Array(data);
    for (let i = 0; i < cloned.length; i++) {
      const hash = Math.sin(i * 9301 + 49297) * 0.5 + 0.5;
      cloned[i] += (hash - 0.5) * NOISE_AMP * 2;
    }
    return cloned;
  };

  // ── OfflineAudioContext: normalize sampleRate / channel count ──
  const OrigOfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (OrigOfflineCtx) {
    const origOfflineStartRendering = OrigOfflineCtx.prototype.startRendering;
    OrigOfflineCtx.prototype.startRendering = function() {
      // Normalize constructor parameters that were used for fingerprinting
      return origOfflineStartRendering.call(this);
    };
  }

  // ── AnalyserNode.getFloatFrequencyData ──
  if (AnalyserNode && AnalyserNode.prototype.getFloatFrequencyData) {
    const origFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
    AnalyserNode.prototype.getFloatFrequencyData = function(array) {
      origFloatFreq.call(this, array);
      for (let i = 0; i < array.length; i++) {
        const hash = Math.sin(i * 9301 + 49297) * 0.5 + 0.5;
        array[i] += (hash - 0.5) * NOISE_AMP;
      }
    };
  }

  // ── AnalyserNode.getByteFrequencyData ──
  if (AnalyserNode && AnalyserNode.prototype.getByteFrequencyData) {
    const origByteFreq = AnalyserNode.prototype.getByteFrequencyData;
    AnalyserNode.prototype.getByteFrequencyData = function(array) {
      origByteFreq.call(this, array);
      for (let i = 0; i < array.length; i++) {
        const hash = Math.sin(i * 9301 + 49297) * 0.5 + 0.5;
        const delta = hash > 0.5 ? 1 : 0;
        array[i] = Math.min(255, Math.max(0, array[i] + delta));
      }
    };
  }
})();
`;

// ═══════════════════════════════════════════════════════════
// 3.4 Device / Screen / Navigator Spoofing
// Normalizes values that would otherwise create unique
// fingerprints across different hardware configurations.
// ═══════════════════════════════════════════════════════════

export const DEVICE_SPOOF = `
(function() {
  'use strict';

  // Skip navigator/screen randomization on auth sites to avoid login security checks.
  function shouldSkipSpoof() {
    try {
      const host = location.hostname;
      const skip = [
        'accounts.google.com',
        'myaccount.google.com',
        'www.youtube.com',
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'accounts.youtube.com',
        'mail.google.com',
        'mail.proton.me',
        'account.proton.me',
        'github.com',
        'login.microsoftonline.com',
      ];
      return skip.some(h => host === h || host.endsWith('.' + h));
    } catch { return false; }
  }
  if (shouldSkipSpoof()) return;

  // ── Navigator properties ──

  // deviceMemory: always report 8 GB (most common value)
  try {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: function() { return 8; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* property may already be defined */ }

  // hardwareConcurrency: always report 4 cores (very common)
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: function() { return 4; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // maxTouchPoints: desktop browser
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: function() { return 0; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // bluetooth: undefined on desktop (not null)
  try {
    Object.defineProperty(navigator, 'bluetooth', {
      get: function() { return undefined; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // keyboard: undefined
  try {
    Object.defineProperty(navigator, 'keyboard', {
      get: function() { return undefined; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // mediaCapabilities: keep but normalize
  // presentation: undefined
  try {
    Object.defineProperty(navigator, 'presentation', {
      get: function() { return undefined; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // wakeLock: undefined
  try {
    Object.defineProperty(navigator, 'wakeLock', {
      get: function() { return undefined; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // storage.estimate: spoof to common values
  if (navigator.storage && navigator.storage.estimate) {
    const origEstimate = navigator.storage.estimate;
    navigator.storage.estimate = function() {
      return origEstimate.call(navigator.storage).then(function(estimate) {
        // Round quota to nearest GB to reduce entropy
        if (estimate.quota) {
          estimate.quota = Math.round(estimate.quota / (1024 * 1024 * 1024)) * 1024 * 1024 * 1024;
        }
        return estimate;
      });
    };
  }

  // ── Screen properties ──

  // colorDepth: standard 24-bit
  try {
    Object.defineProperty(screen, 'colorDepth', {
      get: function() { return 24; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // pixelDepth: same
  try {
    Object.defineProperty(screen, 'pixelDepth', {
      get: function() { return 24; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // availLeft / availTop: always 0 (most common)
  try {
    Object.defineProperty(screen, 'availLeft', {
      get: function() { return 0; },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(screen, 'availTop', {
      get: function() { return 0; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // ── Font enumeration limiting ──

  if (document.fonts && document.fonts.check) {
    const origCheck = document.fonts.check;
    document.fonts.check = function(font, text) {
      // Limit to standard web-safe fonts
      const allowedFonts = [
        'Arial', 'Arial Black', 'Arial Narrow',
        'Courier New', 'Georgia', 'Impact',
        'Times New Roman', 'Trebuchet MS', 'Verdana',
        'Comic Sans MS', 'Helvetica', 'Tahoma',
        'Palatino Linotype', 'Garamond', 'Bookman',
        'Candara', 'Calibri', 'Cambria',
        'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Symbol',
        'MS Sans Serif', 'MS Serif',
        'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
        'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace',
        '-apple-system', 'BlinkMacSystemFont',
        'Apple Color Emoji',
      ];
      const fontName = font.replace(/["\']/g, '').split(',')[0].trim();
      if (!allowedFonts.includes(fontName)) {
        return false;
      }
      return origCheck.call(this, font, text);
    };
  }

  // document.fonts.ready: normalize timing
  if (document.fonts && document.fonts.ready) {
    const origReady = document.fonts.ready;
    Object.defineProperty(document.fonts, 'ready', {
      get: function() {
        return origReady;
      },
    });
  }

  // ── Performance timing normalization ──

  // Round performance.now() to 2 decimal places to reduce timing precision
  const origPerfNow = performance.now.bind(performance);
  performance.now = function() {
    return Math.round(origPerfNow() * 100) / 100;
  };

  // Date.now() precision is already 1ms — leave alone
  // But we can protect against high-res timers:
  if (window.SharedArrayBuffer) {
    // SharedArrayBuffer enables nanosecond timers via Spectre
    // Mark as not available to prevent exploitation
    try {
      delete window.SharedArrayBuffer;
    } catch (e) {
      window.SharedArrayBuffer = undefined;
    }
  }

  // ── Battery API: not exposed (Chromium already removed it) ──
  // But in case it comes back through a flag:
  if (navigator.getBattery) {
    navigator.getBattery = undefined;
  }

  // ── Network Information API ──
  if ('connection' in navigator) {
    try {
      Object.defineProperty(navigator, 'connection', {
        get: function() { return undefined; },
        enumerable: true,
        configurable: true,
      });
    } catch (e) { /* ignore */ }
  }

  // ── Payment Request API ──
  if (window.PaymentRequest) {
    window.PaymentRequest = undefined;
  }

  // ── Web Authentication API (partial) ──
  if (navigator.credentials && navigator.credentials.create) {
    const origCredCreate = navigator.credentials.create;
    navigator.credentials.create = function(options) {
      // Block conditional mediation requests (used for tracking)
      if (options && options.mediation === 'conditional') {
        return Promise.reject(new DOMException('Credentials mediation not allowed', 'NotAllowedError'));
      }
      return origCredCreate.call(navigator.credentials, options);
    };
  }
})();
`;

// ═══════════════════════════════════════════════════════════
// 3.5 Timezone & Intl spoofing
// Normalizes timezone and locale detection.
// ═══════════════════════════════════════════════════════════

export const TIMEZONE_SPOOF = `
(function() {
  'use strict';

  // Skip timezone randomization on auth sites to avoid login security checks.
  function shouldSkipSpoof() {
    try {
      const host = location.hostname;
      const skip = [
        'accounts.google.com',
        'myaccount.google.com',
        'www.youtube.com',
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'accounts.youtube.com',
        'mail.google.com',
        'mail.proton.me',
        'account.proton.me',
        'github.com',
        'login.microsoftonline.com',
      ];
      return skip.some(h => host === h || host.endsWith('.' + h));
    } catch { return false; }
  }
  if (shouldSkipSpoof()) return;

  const SPOOFED_TZ = 'America/New_York';

  // ── Intl.DateTimeFormat ──
  const OrigDateTimeFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function(locales, options) {
    options = options || {};
    // Force timezone to spoofed value
    options.timeZone = SPOOFED_TZ;
    return new OrigDateTimeFormat(locales, options);
  };
  Intl.DateTimeFormat.prototype = OrigDateTimeFormat.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = OrigDateTimeFormat.supportedLocalesOf;

  // ── Date.prototype.toLocaleString ──
  const origToLocaleString = Date.prototype.toLocaleString;
  Date.prototype.toLocaleString = function(locales, options) {
    options = options || {};
    options.timeZone = SPOOFED_TZ;
    return origToLocaleString.call(this, locales, options);
  };

  // ── Date.prototype.toLocaleDateString ──
  const origToLocaleDateString = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function(locales, options) {
    options = options || {};
    options.timeZone = SPOOFED_TZ;
    return origToLocaleDateString.call(this, locales, options);
  };

  // ── Date.prototype.toLocaleTimeString ──
  const origToLocaleTimeString = Date.prototype.toLocaleTimeString;
  Date.prototype.toLocaleTimeString = function(locales, options) {
    options = options || {};
    options.timeZone = SPOOFED_TZ;
    return origToLocaleTimeString.call(this, locales, options);
  };
})();
`;

// ═══════════════════════════════════════════════════════════
// 3.6 Plugin & MIME type spoofing
// Hides the minimal PDF plugin that Chromium exposes.
// ═══════════════════════════════════════════════════════════

export const PLUGIN_SPOOF = `
(function() {
  'use strict';

  // Skip plugin randomization on auth sites to avoid login security checks.
  function shouldSkipSpoof() {
    try {
      const host = location.hostname;
      const skip = [
        'accounts.google.com',
        'myaccount.google.com',
        'www.youtube.com',
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'accounts.youtube.com',
        'mail.google.com',
        'mail.proton.me',
        'account.proton.me',
        'github.com',
        'login.microsoftonline.com',
      ];
      return skip.some(h => host === h || host.endsWith('.' + h));
    } catch { return false; }
  }
  if (shouldSkipSpoof()) return;

  // Navigator.plugins: return empty PluginArray
  try {
    Object.defineProperty(navigator, 'plugins', {
      get: function() {
        // Return a fake PluginArray with length 0
        return Object.setPrototypeOf([], PluginArray.prototype);
      },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // Navigator.mimeTypes: return empty MimeTypeArray
  try {
    Object.defineProperty(navigator, 'mimeTypes', {
      get: function() {
        return Object.setPrototypeOf([], MimeTypeArray.prototype);
      },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }

  // PDF viewer enabled: spoof to false
  try {
    Object.defineProperty(navigator, 'pdfViewerEnabled', {
      get: function() { return false; },
      enumerable: true,
      configurable: true,
    });
  } catch (e) { /* ignore */ }
})();
`;

// ═══════════════════════════════════════════════════════════
// Combined injection helper
// ═══════════════════════════════════════════════════════════

/** All spoof scripts in injection order */
export const ALL_SPOOF_SCRIPTS: readonly string[] = [
  DEVICE_SPOOF,
  CANVAS_SPOOF,
  WEBGL_SPOOF,
  AUDIO_SPOOF,
  TIMEZONE_SPOOF,
  PLUGIN_SPOOF,
];

/** Script names for debugging/logging */
export const SPOOF_SCRIPT_NAMES: readonly string[] = [
  'device-spoof',
  'canvas-spoof',
  'webgl-spoof',
  'audio-spoof',
  'timezone-spoof',
  'plugin-spoof',
];
