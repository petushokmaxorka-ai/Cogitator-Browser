// ═══════════════════════════════════════════════════════════
// AdBlocker Engine — COGITATOR BROWSER
// High-performance filter engine inspired by uBlock Origin
// ═══════════════════════════════════════════════════════════

import type { Session, WebContents } from 'electron';
import { BLOCK_RULES, COSMETIC_RULES } from './adblock-lists';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

/** Parsed filter rule types */
export type FilterType = 'block' | 'allow' | 'cosmetic';

/** Resource types for option matching */
export type ResourceType =
  | 'script'
  | 'image'
  | 'stylesheet'
  | 'xmlhttprequest'
  | 'sub_frame'
  | 'font'
  | 'media'
  | 'websocket'
  | 'other';

/** Rule options from EasyList modifiers */
export interface RuleOptions {
  /** $third-party — only match third-party requests */
  thirdParty?: boolean;
  /** $first-party — only match first-party requests */
  firstParty?: boolean;
  /** $domain=example.com,~example.org — domain whitelist/blacklist */
  domains?: Array<{ domain: string; allow: boolean }>;
  /** $script — only match scripts */
  script?: boolean;
  /** $image — only match images */
  image?: boolean;
  /** $stylesheet — only match CSS */
  stylesheet?: boolean;
  /** $xmlhttprequest — only match XHR/fetch */
  xmlhttprequest?: boolean;
  /** $subdocument — only match iframes */
  subdocument?: boolean;
  /** $font — only match fonts */
  font?: boolean;
  /** $media — only match video/audio */
  media?: boolean;
  /** $websocket — only match websockets */
  websocket?: boolean;
  /** $popup — match popups */
  popup?: boolean;
  /** $important — overrides exception rules */
  important?: boolean;
}

/** Parsed network filter rule */
export interface FilterRule {
  type: 'block' | 'allow';
  /** Original rule string (for debugging) */
  raw: string;
  /** URL pattern (before $options) */
  pattern: string;
  /** Compiled RegExp for matching */
  regex: RegExp;
  /** Parsed options */
  options: RuleOptions;
  /** Is this an anchor rule (||domain^) */
  isAnchorRule: boolean;
  /** Is this a prefix rule (|http://) */
  isPrefixRule: boolean;
  /** Is this a suffix rule (|.jpg|) */
  isSuffixRule: boolean;
  /** Domain extracted from ||rule */
  anchorDomain?: string;
}

/** Parsed cosmetic filter rule */
export interface CosmeticRule {
  type: 'cosmetic';
  /** Original rule string */
  raw: string;
  /** CSS selector */
  selector: string;
  /** Target domains (empty = all) */
  domains: string[];
  /** Is this an exception rule (#@#) */
  isException: boolean;
}

/** AdBlocker statistics */
export interface AdBlockerStats {
  enabled: boolean;
  blockedCount: number;
  blockRules: number;
  allowRules: number;
  cosmeticRules: number;
}

// ═══════════════════════════════════════════════════════════
// Rule Parser
// ═══════════════════════════════════════════════════════════

/**
 * Parse EasyList-style options from the $ portion of a rule.
 * Example: "third-party,domain=example.com|~evil.com,script"
 */
function parseOptions(optionsStr: string): RuleOptions {
  const options: RuleOptions = {};
  const parts = optionsStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Handle domain= option
    if (trimmed.startsWith('domain=')) {
      const domainList = trimmed.slice(7); // after "domain="
      const domains: Array<{ domain: string; allow: boolean }> = [];
      for (const d of domainList.split('|')) {
        const domain = d.trim();
        if (domain.startsWith('~')) {
          domains.push({ domain: domain.slice(1), allow: false });
        } else if (domain) {
          domains.push({ domain, allow: true });
        }
      }
      if (domains.length > 0) {
        options.domains = domains;
      }
      continue;
    }

    // Handle negated options (~third-party)
    if (trimmed.startsWith('~')) {
      const key = trimmed.slice(1) as keyof RuleOptions;
      if (key === 'third-party') options.thirdParty = false;
      continue;
    }

    // Boolean options
    switch (trimmed) {
      case 'third-party':
        options.thirdParty = true;
        break;
      case 'first-party':
        options.firstParty = true;
        break;
      case 'script':
        options.script = true;
        break;
      case 'image':
        options.image = true;
        break;
      case 'stylesheet':
        options.stylesheet = true;
        break;
      case 'xmlhttprequest':
        options.xmlhttprequest = true;
        break;
      case 'subdocument':
        options.subdocument = true;
        break;
      case 'font':
        options.font = true;
        break;
      case 'media':
        options.media = true;
        break;
      case 'websocket':
        options.websocket = true;
        break;
      case 'popup':
        options.popup = true;
        break;
      case 'important':
        options.important = true;
        break;
    }
  }

  return options;
}

/**
 * Compile a URL pattern into a RegExp for fast matching.
 * Supports EasyList syntax:
 *   ||domain.com^   — match domain + subdomains + end of host or /
 *   |http://        — match prefix
 *   |.jpg|          — match suffix
 *   *               — wildcard (matches any characters)
 *   ^               — separator (matches end of host, /, ?, &, =)
 */
function compilePattern(pattern: string): { regex: RegExp; isAnchor: boolean; isPrefix: boolean; isSuffix: boolean; anchorDomain?: string } {
  let isAnchor = false;
  let isPrefix = false;
  let isSuffix = false;
  let anchorDomain: string | undefined;

  let pat = pattern;

  // Handle anchor rule: ||domain.com/path
  if (pat.startsWith('||')) {
    isAnchor = true;
    const rest = pat.slice(2);
    // Extract domain part (before any / ? &)
    const domainEnd = rest.search(/[/?&]/);
    const domainPart = domainEnd >= 0 ? rest.slice(0, domainEnd) : rest;
    anchorDomain = domainPart;

    // Build regex: optional scheme + optional www. + domain + separator or end
    // ||example.com^ matches:
    //   http://example.com
    //   https://www.example.com/
    //   https://sub.example.com:8080/path
    //   ws://example.com
    const domainRegex = domainPart
      .replace(/\^/g, '__SEP__')
      .replace(/[.+${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/__SEP__/g, '(?:[/?:=&]|$)');
    let pathRegex = '';
    if (domainEnd >= 0) {
      const pathPart = rest.slice(domainEnd);
      pathRegex = pathPart
        .replace(/\^/g, '__SEP__')
        .replace(/[.+${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/__SEP__/g, '(?:[/?:=&]|$)');
    }
    const regexStr = `^(?:[a-z]+://)?(?:[^/]*\\.)?${domainRegex}${pathRegex || '(?:[/?:=&]|$)'}`;
    return { regex: new RegExp(regexStr, 'i'), isAnchor: true, isPrefix: false, isSuffix: false, anchorDomain };
  }

  // Handle prefix rule: |http://example.com
  if (pat.startsWith('|') && !pat.startsWith('||')) {
    isPrefix = true;
    pat = pat.slice(1);
  }

  // Handle suffix rule: example.com|
  if (pat.endsWith('|')) {
    isSuffix = true;
    pat = pat.slice(0, -1);
  }

  // Escape regex special chars, then restore wildcards and separators
  let regexStr = pat
    .replace(/\^/g, '__SEP__')
    .replace(/[.+${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/__SEP__/g, '(?:[/?:=&]|$)');

  if (isPrefix) {
    regexStr = '^' + regexStr;
  }
  if (isSuffix) {
    regexStr = regexStr + '$';
  }

  // Plain substring match — add .* on both sides if not anchored
  if (!isPrefix && !isSuffix) {
    regexStr = '.*' + regexStr + '.*';
  }

  return { regex: new RegExp(regexStr, 'i'), isAnchor, isPrefix, isSuffix };
}

/**
 * Parse a single network filter rule string.
 */
function parseNetworkRule(raw: string): FilterRule | null {
  const text = raw.trim();
  if (!text) return null;

  // Skip comments and cosmetic rules
  if (text.startsWith('!') || text.startsWith('[')) return null;
  if (text.includes('#')) {
    // Check if it's a cosmetic rule (## or #@# or #?#)
    const hashIdx = text.indexOf('#');
    const afterHash = text.slice(hashIdx + 1);
    if (afterHash.startsWith('#') || afterHash.startsWith('@') || afterHash.startsWith('?')) {
      return null; // cosmetic rule
    }
  }

  // Determine if exception rule (@@)
  const isAllow = text.startsWith('@@');
  let ruleText = isAllow ? text.slice(2) : text;

  // Split pattern and options at $
  let pattern = ruleText;
  let options: RuleOptions = {};
  const dollarIdx = ruleText.lastIndexOf('$');
  if (dollarIdx > 0) {
    pattern = ruleText.slice(0, dollarIdx);
    const optionsStr = ruleText.slice(dollarIdx + 1);
    options = parseOptions(optionsStr);
  }

  // Skip rules with unsupported options for now (domain exclusions handled in matcher)
  // Empty pattern after removing options → skip
  if (!pattern) return null;

  const { regex, isAnchor, isPrefix, isSuffix, anchorDomain } = compilePattern(pattern);

  return {
    type: isAllow ? 'allow' : 'block',
    raw: text,
    pattern,
    regex,
    options,
    isAnchorRule: isAnchor,
    isPrefixRule: isPrefix,
    isSuffixRule: isSuffix,
    anchorDomain,
  };
}

/**
 * Parse a single cosmetic filter rule string.
 */
function parseCosmeticRule(raw: string): CosmeticRule | null {
  const text = raw.trim();
  if (!text) return null;

  // Must contain ## (standard) or #@# (exception) or #?# (procedural)
  // Find the first occurrence of # followed by # or @ or ?
  const match = text.match(/^([^#]*)#(@|#|\?|@\?|\?#)?#(.+)$/);
  if (!match) return null;

  const [, domainPart, modifier, selector] = match;
  if (!selector) return null;

  const domains = domainPart
    ? domainPart.split(',').map((d) => d.trim()).filter(Boolean)
    : [];

  const isException = modifier === '@' || modifier === '@?';

  return {
    type: 'cosmetic',
    raw: text,
    selector: selector.trim(),
    domains,
    isException,
  };
}

// ═══════════════════════════════════════════════════════════
// URL Matcher
// ═══════════════════════════════════════════════════════════

/**
 * Extract hostname from a URL.
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Check if a hostname matches an anchor domain (e.g. 'ads.example.com' matches 'example.com').
 */
function matchesAnchorDomain(hostname: string, anchorDomain: string): boolean {
  return hostname === anchorDomain || hostname.endsWith('.' + anchorDomain);
}

/**
 * Check if a request is third-party relative to the document URL.
 */
function isThirdParty(reqUrl: string, docUrl: string): boolean {
  try {
    const reqHost = new URL(reqUrl).hostname;
    const docHost = new URL(docUrl).hostname;
    // Extract eTLD+1 (simplified: last two parts)
    const reqDomain = reqHost.split('.').slice(-2).join('.');
    const docDomain = docHost.split('.').slice(-2).join('.');
    return reqDomain !== docDomain;
  } catch {
    return false;
  }
}

/**
 * Check if domain options match.
 * domain=example.com|~evil.com means:
 *   - if allow domains specified: must match one of them
 *   - if deny domains specified: must NOT match any of them
 */
function matchDomainOptions(hostname: string, domains: Array<{ domain: string; allow: boolean }>): boolean {
  const hasAllowRules = domains.some((d) => d.allow);
  const hasDenyRules = domains.some((d) => !d.allow);

  // Check deny rules first
  if (hasDenyRules) {
    for (const d of domains) {
      if (!d.allow && (hostname === d.domain || hostname.endsWith('.' + d.domain))) {
        return false; // explicitly denied
      }
    }
  }

  // If allow rules exist, must match at least one
  if (hasAllowRules) {
    let matched = false;
    for (const d of domains) {
      if (d.allow && (hostname === d.domain || hostname.endsWith('.' + d.domain))) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }

  return true;
}

/**
 * Map Electron resourceType to our ResourceType.
 */
function mapResourceType(type: string): ResourceType {
  switch (type) {
    case 'script': return 'script';
    case 'image': return 'image';
    case 'stylesheet': return 'stylesheet';
    case 'xhr': return 'xmlhttprequest';
    case 'subFrame': return 'sub_frame';
    case 'font': return 'font';
    case 'media': return 'media';
    case 'websocket': return 'websocket';
    default: return 'other';
  }
}

/**
 * Check if resource type matches the rule's type options.
 */
function matchResourceType(type: ResourceType, options: RuleOptions): boolean {
  // If no type-specific options, match all types
  const hasTypeFilter =
    options.script ||
    options.image ||
    options.stylesheet ||
    options.xmlhttprequest ||
    options.subdocument ||
    options.font ||
    options.media ||
    options.websocket;

  if (!hasTypeFilter) return true;

  switch (type) {
    case 'script': return !!options.script;
    case 'image': return !!options.image;
    case 'stylesheet': return !!options.stylesheet;
    case 'xmlhttprequest': return !!options.xmlhttprequest;
    case 'sub_frame': return !!options.subdocument;
    case 'font': return !!options.font;
    case 'media': return !!options.media;
    case 'websocket': return !!options.websocket;
    default: return false;
  }
}

/**
 * Test if a URL matches a specific filter rule.
 */
function urlMatchesRule(url: string, hostname: string, docUrl: string, type: string, rule: FilterRule): boolean {
  // Test regex pattern match
  if (!rule.regex.test(url)) return false;

  // Check domain restrictions
  if (rule.options.domains) {
    const docHostname = getHostname(docUrl);
    if (!matchDomainOptions(docHostname, rule.options.domains)) return false;
  }

  // Check third-party restriction
  if (rule.options.thirdParty) {
    if (!isThirdParty(url, docUrl)) return false;
  }
  if (rule.options.firstParty) {
    if (isThirdParty(url, docUrl)) return false;
  }

  // Check resource type
  const resType = mapResourceType(type);
  if (!matchResourceType(resType, rule.options)) return false;

  return true;
}

// ═══════════════════════════════════════════════════════════
// AdBlocker Engine
// ═══════════════════════════════════════════════════════════

export class AdBlockerEngine {
  /** Compiled block rules */
  private blockRules: FilterRule[] = [];
  /** Compiled allow (exception) rules */
  private allowRules: FilterRule[] = [];
  /** Domain-indexed block rules for fast lookup */
  private blockRulesByDomain = new Map<string, FilterRule[]>();
  /** Compiled cosmetic rules */
  private cosmeticRules: CosmeticRule[] = [];
  /** Is blocking enabled */
  private enabled = true;
  /** Total blocked requests counter */
  private blockedCount = 0;
  /** webRequest handler reference (for cleanup) */
  private requestHandler: ((details: Electron.OnBeforeRequestListenerDetails, callback: (response: Electron.CallbackResponse) => void) => void) | null = null;
  /** Injected CSS per WebContents (to avoid duplicates) */
  private injectedCss = new WeakSet<WebContents>();
  /** Stored navigation listeners for cleanup */
  private cosmeticListeners = new WeakMap<WebContents, { didNavigate: (event: Electron.Event, url: string) => void; didNavigateInPage: (event: Electron.Event, url: string) => void }>();
  /** Reference to cosmetic CSS string */
  private cosmeticCss = '';
  /** Stats snapshot for IPC */
  private statsSnapshot: AdBlockerStats = {
    enabled: true,
    blockedCount: 0,
    blockRules: 0,
    allowRules: 0,
    cosmeticRules: 0,
  };

  // ── Constructor ─────────────────────────────────────────

  constructor() {
    this.loadDefaultRules();
  }

  // ── Rule Loading ────────────────────────────────────────

  /** Load built-in default filter lists */
  loadDefaultRules(): void {
    // Parse network rules
    for (const raw of BLOCK_RULES) {
      const rule = parseNetworkRule(raw);
      if (!rule) continue;
      if (rule.type === 'allow') {
        this.allowRules.push(rule);
      } else {
        this.blockRules.push(rule);
        if (rule.anchorDomain) {
          const list = this.blockRulesByDomain.get(rule.anchorDomain) || [];
          list.push(rule);
          this.blockRulesByDomain.set(rule.anchorDomain, list);
        }
      }
    }

    // Parse cosmetic rules
    for (const raw of COSMETIC_RULES) {
      const rule = parseCosmeticRule(raw);
      if (rule && !rule.isException) {
        this.cosmeticRules.push(rule);
      }
    }

    // Build cosmetic CSS
    this.cosmeticCss = this.buildCosmeticCss();

    // Update stats
    this.statsSnapshot = {
      enabled: this.enabled,
      blockedCount: this.blockedCount,
      blockRules: this.blockRules.length,
      allowRules: this.allowRules.length,
      cosmeticRules: this.cosmeticRules.length,
    };

    console.log(`[AdBlocker] Loaded ${this.blockRules.length} block rules, ${this.allowRules.length} allow rules, ${this.cosmeticRules.length} cosmetic rules`);
  }

  /** Add externally loaded rules (e.g. from EasyList) */
  addExternalRules(networkRules: string[], cosmeticRules: string[] = []): void {
    for (const raw of networkRules) {
      const rule = parseNetworkRule(raw);
      if (!rule) continue;
      if (rule.type === 'allow') {
        this.allowRules.push(rule);
      } else {
        this.blockRules.push(rule);
        if (rule.anchorDomain) {
          const list = this.blockRulesByDomain.get(rule.anchorDomain) || [];
          list.push(rule);
          this.blockRulesByDomain.set(rule.anchorDomain, list);
        }
      }
    }

    for (const raw of cosmeticRules) {
      const rule = parseCosmeticRule(raw);
      if (rule && !rule.isException) {
        this.cosmeticRules.push(rule);
      }
    }

    this.cosmeticCss = this.buildCosmeticCss();
    this.updateStats();

    console.log(`[AdBlocker] After external: ${this.blockRules.length} block, ${this.allowRules.length} allow, ${this.cosmeticRules.length} cosmetic rules`);
  }

  /** Build CSS string from all cosmetic rules */
  private buildCosmeticCss(): string {
    const selectors: string[] = [];
    for (const rule of this.cosmeticRules) {
      if (rule.domains.length === 0) {
        // Global rule — include always
        selectors.push(rule.selector);
      }
      // Domain-specific rules: inject at page level
    }
    if (selectors.length === 0) return '';

    return `${selectors.join(',\n')} { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; min-height: 0 !important; min-width: 0 !important; max-height: 0 !important; max-width: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; pointer-events: none !important; }\n`;
  }

  /** Build domain-specific CSS for a given hostname */
  private buildDomainSpecificCss(hostname: string): string {
    const selectors: string[] = [];
    for (const rule of this.cosmeticRules) {
      if (rule.domains.length > 0) {
        for (const domain of rule.domains) {
          if (hostname === domain || hostname.endsWith('.' + domain)) {
            selectors.push(rule.selector);
            break;
          }
        }
      }
    }
    if (selectors.length === 0) return '';
    return `${selectors.join(',\n')} { display: none !important; visibility: hidden !important; }\n`;
  }

  // ── Enable / Disable ────────────────────────────────────

  /** Enable ad blocking on a session */
  enable(sess: Session): void {
    if (this.requestHandler) {
      // Already enabled — remove old handler first
      this.disable(sess);
    }

    this.requestHandler = (
      details: Electron.OnBeforeRequestListenerDetails,
      callback: (response: Electron.CallbackResponse) => void
    ): void => {
      if (!this.enabled) {
        callback({});
        return;
      }

      const url = details.url;
      const type = details.resourceType;
      const referrer = details.referrer;

      // Skip non-http(s) URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        callback({});
        return;
      }

      // Never block localhost, loopback, or LAN IPs
      if (url.includes('://localhost') || url.includes('://127.') || /:\/\/192\.168\./.test(url) || /:\/\/10\./.test(url)) {
        callback({});
        return;
      }

      if (this.shouldBlock(url, type, referrer)) {
        this.blockedCount++;
        callback({ cancel: true });
        return;
      }

      callback({});
    };

    sess.webRequest.onBeforeRequest(this.requestHandler);

    // Inject cosmetic filters into existing webContents
    // Note: for new WebContents, the caller should call injectCosmeticFilters
    console.log('[AdBlocker] Engine enabled on session');
  }

  /** Disable ad blocking on a session */
  disable(sess: Session): void {
    if (this.requestHandler) {
      sess.webRequest.onBeforeRequest(null);
      this.requestHandler = null;
    }
    console.log('[AdBlocker] Engine disabled on session');
  }

  // ── Blocking Logic ──────────────────────────────────────

  /**
   * Determine if a URL should be blocked.
   * Exception rules are checked first, then block rules.
   */
  shouldBlock(url: string, type: string, docUrl = ''): boolean {
    // Fast-path: never block localhost/loopback/LAN
    if (url.includes('://localhost') || url.includes('://127.') || /:\/\/192\.168\./.test(url) || /:\/\/10\./.test(url)) {
      return false;
    }
    const hostname = getHostname(url);
    if (!hostname) return false;

    // Check allow (exception) rules first
    for (const rule of this.allowRules) {
      if (urlMatchesRule(url, hostname, docUrl, type, rule)) {
        return false; // explicitly allowed
      }
    }

    // Check domain-indexed block rules (fast path)
    const domainRules = this.blockRulesByDomain.get(hostname);
    if (domainRules) {
      for (const rule of domainRules) {
        if (urlMatchesRule(url, hostname, docUrl, type, rule)) {
          return true; // blocked
        }
      }
    }

    // Check remaining block rules (no anchor domain or different domain)
    for (const rule of this.blockRules) {
      if (rule.anchorDomain && !matchesAnchorDomain(hostname, rule.anchorDomain)) {
        continue;
      }
      if (urlMatchesRule(url, hostname, docUrl, type, rule)) {
        return true; // blocked
      }
    }

    return false;
  }

  // ── Cosmetic Filter Injection ───────────────────────────

  /**
   * Inject cosmetic filter CSS into a WebContents.
   * Call this when a new tab/page is created.
   */
  injectCosmeticFilters(webContents: WebContents): void {
    if (!this.enabled || !this.cosmeticCss) return;
    if (this.injectedCss.has(webContents)) return;

    // Inject global CSS
    if (this.cosmeticCss) {
      webContents.insertCSS(this.cosmeticCss).catch(() => {
        // WebContents may be destroyed
      });
    }

    // Listen for navigation to inject domain-specific CSS
    const didNavigate = (_: Electron.Event, url: string) => {
      if (!this.enabled) return;
      try {
        const hostname = new URL(url).hostname;
        const domainCss = this.buildDomainSpecificCss(hostname);
        if (domainCss) {
          webContents.insertCSS(domainCss).catch(() => {
            // ignore
          });
        }
      } catch {
        // invalid URL
      }
    };

    // Also handle in-page navigation (SPA)
    const didNavigateInPage = (_: Electron.Event, url: string) => {
      if (!this.enabled) return;
      try {
        const hostname = new URL(url).hostname;
        const domainCss = this.buildDomainSpecificCss(hostname);
        if (domainCss) {
          webContents.insertCSS(domainCss).catch(() => {
            // ignore
          });
        }
      } catch {
        // invalid URL
      }
    };

    webContents.on('did-navigate', didNavigate);
    webContents.on('did-navigate-in-page', didNavigateInPage);
    this.cosmeticListeners.set(webContents, { didNavigate, didNavigateInPage });

    this.injectedCss.add(webContents);
  }

  /** Remove cosmetic filter listeners from a WebContents */
  removeCosmeticFilters(webContents: WebContents): void {
    const listeners = this.cosmeticListeners.get(webContents);
    if (listeners) {
      webContents.removeListener('did-navigate', listeners.didNavigate);
      webContents.removeListener('did-navigate-in-page', listeners.didNavigateInPage);
      this.cosmeticListeners.delete(webContents);
    }
  }

  // ── Rule Management ─────────────────────────────────────

  /** Add a custom block rule at runtime */
  addBlockRule(pattern: string): void {
    const rule = parseNetworkRule(pattern);
    if (rule && rule.type === 'block') {
      this.blockRules.push(rule);
      if (rule.anchorDomain) {
        const list = this.blockRulesByDomain.get(rule.anchorDomain) || [];
        list.push(rule);
        this.blockRulesByDomain.set(rule.anchorDomain, list);
      }
      this.updateStats();
    }
  }

  /** Add a custom allow (exception) rule at runtime */
  addAllowRule(pattern: string): void {
    const rule = parseNetworkRule('@@' + pattern);
    if (rule && rule.type === 'allow') {
      this.allowRules.push(rule);
      this.updateStats();
    }
  }

  /** Clear all rules (for reload) */
  clearRules(): void {
    this.blockRules = [];
    this.blockRulesByDomain.clear();
    this.allowRules = [];
    this.cosmeticRules = [];
    this.cosmeticCss = '';
    this.updateStats();
  }

  // ── Toggle ──────────────────────────────────────────────

  /** Toggle blocking on/off */
  toggle(): boolean {
    this.enabled = !this.enabled;
    this.statsSnapshot.enabled = this.enabled;
    console.log(`[AdBlocker] ${this.enabled ? 'Enabled' : 'Disabled'}`);
    return this.enabled;
  }

  /** Check if blocking is enabled */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Set enabled state explicitly */
  setEnabled(value: boolean): void {
    this.enabled = value;
    this.statsSnapshot.enabled = value;
  }

  // ── Statistics ──────────────────────────────────────────

  /** Get total blocked count */
  getBlockedCount(): number {
    return this.blockedCount;
  }

  /** Reset blocked counter */
  resetCount(): void {
    this.blockedCount = 0;
    this.statsSnapshot.blockedCount = 0;
  }

  /** Get current stats */
  getStats(): AdBlockerStats {
    return {
      enabled: this.enabled,
      blockedCount: this.blockedCount,
      blockRules: this.blockRules.length,
      allowRules: this.allowRules.length,
      cosmeticRules: this.cosmeticRules.length,
    };
  }

  private updateStats(): void {
    this.statsSnapshot = {
      enabled: this.enabled,
      blockedCount: this.blockedCount,
      blockRules: this.blockRules.length,
      allowRules: this.allowRules.length,
      cosmeticRules: this.cosmeticRules.length,
    };
  }

  // ── Debug ───────────────────────────────────────────────

  /** Get rules matching a URL (for debugging) */
  debugMatch(url: string, type = 'other', docUrl = ''): FilterRule[] {
    const hostname = getHostname(url);
    const matches: FilterRule[] = [];
    for (const rule of this.blockRules) {
      if (urlMatchesRule(url, hostname, docUrl, type, rule)) {
        matches.push(rule);
      }
    }
    return matches;
  }
}

// ═══════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════

let engineInstance: AdBlockerEngine | null = null;

/** Get or create the singleton AdBlockerEngine */
export function getAdBlockerEngine(): AdBlockerEngine {
  if (!engineInstance) {
    engineInstance = new AdBlockerEngine();
  }
  return engineInstance;
}

/** Reset the singleton (for testing) */
export function resetAdBlockerEngine(): void {
  engineInstance = null;
}
