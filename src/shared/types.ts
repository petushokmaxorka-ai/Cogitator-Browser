// ═══════════════════════════════════════════════════════════
// Shared Types — COGITATOR BROWSER v2
// ═══════════════════════════════════════════════════════════

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon: string;
  isLoading: boolean;
  loadProgress: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

export type LlmProvider = 'ollama' | 'llama-server';

export interface OllamaConfig {
  host: string;
  model: string;
  provider?: LlmProvider;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface VPNStatus {
  connected: boolean;
  ip?: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

export type SidebarTab =
  | 'browser'
  | 'context'
  | 'translate'
  | 'editor'
  | 'regex'
  | 'diff'
  | 'diagram'
  | 'ocr'
  | 'gif'
  | 'videodl'
  | 'audio'
  | 'ascii'
  | 'draw'
  | 'ssh'
  | 'sqlite'
  | 'scan'
  | 'lan'
  | 'wol'
  | 'archive'
  | 'convert'
  | 'loan'
  | 'encrypt'
  | 'speed'
  | 'calendar'
  | 'pomodoro'
  | 'todo'
  | 'tracker'
  | 'habits'
  | 'journal'
  | 'totp'
  | 'qr'
  | 'tts'
  | 'reading'
  | 'read'
  | 'worldclock'
  | 'clock'
  | 'focus'
  | 'apitester'
  | 'docker'
  | 'git'
  | 'graphql'
  | 'email'
  | 'media'
  | 'sysmon'
  | 'process'
  | 'terminal'
  | 'torrent'
  | 'clipboard'
  | 'notes'
  | 'rss'
  | 'recorder'
  | 'colorpicker'
  | 'websocket'
  | 'visualizer'
  | 'vault'
  | 'sigil'
  | 'settings'
  | 'autofill'
  | 'downloads'
  | 'files'
  | 'weather'
  | 'search'
  | 'forge';

export interface PageInfo {
  title: string;
  url: string;
  content: string;
}

export interface BrowserState {
  tabs: Tab[];
  activeTabId: string | null;
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
}

// ═══════════════════════════════════════════════════════════
// TOTP / 2FA Types
// ═══════════════════════════════════════════════════════════

export interface TOTPAccount {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: string;
  icon?: string;
}

// ═══════════════════════════════════════════════════════════
// Video Downloader Types
// ═══════════════════════════════════════════════════════════

export interface VideoInfo {
  title: string;
  duration: string;
  formats: { quality: string; format: string; size: string }[];
}

export interface DownloadHistoryItem {
  id: string;
  url: string;
  title: string;
  quality?: string;
  format?: string;
  date?: string;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'failed';
  progress: number;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// Whiteboard Types
// ═══════════════════════════════════════════════════════════

export type DrawingTool = 'pen' | 'eraser' | 'line' | 'rect' | 'rectangle' | 'circle' | 'text' | 'arrow';

export interface DrawingAction {
  tool: DrawingTool;
  points: { x: number; y: number }[];
  color: string;
  width?: number;
  lineWidth?: number;
  text?: string;
}

// ═══════════════════════════════════════════════════════════
// Privacy Engine Types
// ═══════════════════════════════════════════════════════════

export interface PrivacyConfig {
  /** Block known tracking endpoints */
  blockTrackers: boolean;
  /** Strip tracking parameters from URLs */
  stripTrackingParams: boolean;
  /** Sanitize response headers */
  sanitizeHeaders: boolean;
  /** Block WebRTC IP leaks */
  blockWebrtcLeaks: boolean;
  /** Spoof canvas/WebGL/audio fingerprints */
  spoofFingerprints: boolean;
  /** Enforce HTTPS-only mode */
  httpsOnly: boolean;
  /** Block third-party cookies */
  blockThirdPartyCookies: boolean;
  /** Enable Do-Not-Track header */
  sendDntHeader: boolean;
  /** Disable JavaScript (global kill-switch) */
  disableJavaScript: boolean;
  /** Anti-fingerprinting level */
  fingerprintLevel: 'none' | 'basic' | 'strict' | 'paranoid';
}

export interface AutoClearConfig {
  /** Clear all cookies on exit */
  cookies: boolean;
  /** Clear HTTP cache on exit */
  cache: boolean;
  /** Clear browsing history on exit */
  history: boolean;
  /** Clear downloaded files list on exit */
  downloads: boolean;
  /** Clear localStorage / indexedDB on exit */
  storage: boolean;
  /** Clear service workers on exit */
  serviceWorkers: boolean;
  /** Enable auto-clear on exit */
  onExit: boolean;
}

// ═══════════════════════════════════════════════════════════
// Vault — Password Manager Types
// ═══════════════════════════════════════════════════════════

/** Password entry stored in the vault */
export interface VaultPasswordEntry {
  id: string;
  title: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  folder: VaultFolder;
  createdAt: number;
  modifiedAt: number;
  favicon: string;
}

/** Vault folder categories */
export type VaultFolder = 'general' | 'social' | 'banking' | 'work';

/** New password entry (without auto-generated fields) */
export type VaultNewPasswordEntry = Omit<VaultPasswordEntry, 'id' | 'createdAt' | 'modifiedAt'>;

/** Password strength levels */
export type VaultPasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/** Password generation options */
export interface VaultPasswordGenOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}

/** Vault statistics */
export interface VaultStats {
  passwordCount: number;
  cardCount: number;
  oldestEntry: number;
  newestEntry: number;
}

// ═══════════════════════════════════════════════════════════
// Vault — Payment Card Types
// ═══════════════════════════════════════════════════════════

export type CardType = 'visa' | 'mastercard' | 'amex' | 'unknown';

export interface CardEntry {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  cardType: CardType;
  notes: string;
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════
// Reader Mode — Article Data
// ═══════════════════════════════════════════════════════════

export interface ArticleData {
  title: string;
  author: string;
  date: string;
  content: string;
  isArticle: boolean;
}

// ═══════════════════════════════════════════════════════════
// Translation — Language Support
// ═══════════════════════════════════════════════════════════

export interface Language {
  code: string;
  name: string;
}

// ═══════════════════════════════════════════════════════════
// Night Schedule — Dark Mode Intensifier
// ═══════════════════════════════════════════════════════════

export interface NightSchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
  intensity: 'low' | 'medium' | 'high';
}

// ═══════════════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════════════

export interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  tabs: { url: string; title: string }[];
}

export interface SessionConfig {
  startupBehavior: 'restore' | 'newtab' | 'specific';
  startupPages: string[];
}

// ═══════════════════════════════════════════════════════════
// Per-site Settings
// ═══════════════════════════════════════════════════════════

export interface SiteSetting {
  hostname: string;
  javascript: boolean;
  cookies: boolean;
  images: boolean;
  ads: boolean;
  fingerprint: boolean;
}

export interface SiteSecurityInfo {
  https: boolean;
  certificate?: string;
  connectionType: string;
}

// ═══════════════════════════════════════════════════════════
// AdBlocker — Filter Engine
// ═══════════════════════════════════════════════════════════

export interface AdBlockerStats {
  enabled: boolean;
  blockedCount: number;
  blockRules: number;
  allowRules: number;
  cosmeticRules: number;
}

// ═══════════════════════════════════════════════════════════
// Sigil — Digital Signature Types
// ═══════════════════════════════════════════════════════════

/** Supported certificate / key algorithms */
export type CertAlgorithm = 'rsa' | 'ecdsa' | 'gost';

/** Imported certificate metadata */
export interface Certificate {
  id: string;
  name: string;
  type: CertAlgorithm;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  thumbprint: string;
  hasPrivateKey: boolean;
}

/** Record of a digital signature applied to a file */
export interface Signature {
  id: string;
  fileName: string;
  filePath: string;
  certificateId: string;
  certificateName: string;
  signDate: number;
  algorithm: string;
  signatureHex: string;
  hashHex: string;
}

/** Sigil engine configuration */
export interface SigilConfig {
  defaultCertificate: string | null;
  timestampEnabled: boolean;
  detachedSignature: boolean;
}

/** Signature verification result */
export interface VerifyResult {
  valid: boolean;
  message: string;
}

// IPC Channel definitions
export const IPC_CHANNELS = {
  // Tabs
  TABS_CREATE: 'tabs:create',
  TABS_CLOSE: 'tabs:close',
  TABS_SWITCH: 'tabs:switch',
  TABS_NAVIGATE: 'tabs:navigate',
  TABS_GO_BACK: 'tabs:go-back',
  TABS_GO_FORWARD: 'tabs:go-forward',
  TABS_RELOAD: 'tabs:reload',
  TABS_GET_ALL: 'tabs:get-all',
  TABS_GET_ACTIVE: 'tabs:get-active',
  TABS_ON_UPDATE: 'tabs:on-update',
  TABS_GET_SELECTED_TEXT: 'tabs:get-selected-text',
  TABS_GET_PAGE_TEXT: 'tabs:get-page-text',
  TABS_GET_PAGE_INFO: 'tabs:get-page-info',

  // Ollama
  OLLAMA_LIST_MODELS: 'ollama:list-models',
  OLLAMA_CHAT: 'ollama:chat',
  OLLAMA_CHECK_STATUS: 'ollama:check-status',
  OLLAMA_GET_CONFIG: 'ollama:get-config',
  OLLAMA_SET_CONFIG: 'ollama:set-config',
  OLLAMA_ABORT: 'ollama:abort',
  OLLAMA_ON_STREAM: 'ollama:on-stream',

  // Embedding (nomic-embed via standalone llama-server on :11501)
  EMBED_CREATE: 'embed:create',
  EMBED_HEALTH: 'embed:health',

  // Mens Machinae — bibliotheca context
  MENS_CHECK_STATUS: 'mens:check-status',
  MENS_GET_CONTEXT: 'mens:get-context',
  MENS_SEMANTIC_SEARCH: 'mens:semantic-search',

  // Anathemetron — consciousness pulse (read-only)
  MIND_GET_PULSE: 'mind:get-pulse',

  // VPN
  VPN_STATUS: 'vpn:status',
  VPN_START: 'vpn:start',
  VPN_STOP: 'vpn:stop',

  // Page
  PAGE_GET_INFO: 'page:get-info',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_ON_MAXIMIZE: 'window:on-maximize',
  WINDOW_ON_UNMAXIMIZE: 'window:on-unmaximize',
  WINDOW_GET_BOUNDS: 'window:get-bounds',
  WINDOW_RESIZE: 'window:resize',
  CONTENT_FULLSCREEN_ON_CHANGE: 'content:fullscreen-on-change',

  // Sidebar
  SIDEBAR_TOGGLE: 'sidebar:toggle',
  SIDEBAR_RESIZE: 'sidebar:resize',

  // DevTools
  DEVTOOLS_OPEN: 'devtools:open',
  DEVTOOLS_CLOSE: 'devtools:close',

  // Find in Page
  FIND_IN_PAGE: 'find-in-page',
  STOP_FIND_IN_PAGE: 'stop-find-in-page',
  FIND_IN_PAGE_RESULT: 'find-in-page:result',

  // Zoom
  ZOOM_SET: 'zoom:set',

  // ═══ Vault — Cryptkeeper Password Manager ═══════════
  VAULT_EXISTS: 'vault:exists',
  VAULT_UNLOCK: 'vault:unlock',
  VAULT_LOCK: 'vault:lock',
  VAULT_IS_UNLOCKED: 'vault:is-unlocked',
  VAULT_GET_PASSWORDS: 'vault:get-passwords',
  VAULT_GET_PASSWORD: 'vault:get-password',
  VAULT_ADD_PASSWORD: 'vault:add-password',
  VAULT_UPDATE_PASSWORD: 'vault:update-password',
  VAULT_DELETE_PASSWORD: 'vault:delete-password',
  VAULT_SEARCH_PASSWORDS: 'vault:search-passwords',
  VAULT_GET_PASSWORDS_FOR_URL: 'vault:get-passwords-for-url',
  VAULT_GENERATE_PASSWORD: 'vault:generate-password',
  VAULT_CHECK_STRENGTH: 'vault:check-strength',
  VAULT_CALCULATE_ENTROPY: 'vault:calculate-entropy',
  VAULT_GET_STATS: 'vault:get-stats',
  VAULT_CHANGE_PASSWORD: 'vault:change-password',
  VAULT_GET_CARDS: 'vault:get-cards',
  VAULT_SAVE_CARD: 'vault:save-card',
  VAULT_DELETE_CARD: 'vault:delete-card',

  // Reader Mode
  READER_DETECT: 'reader:detect',
  READER_GET_HTML: 'reader:get-html',

  // Translation

  // Session
  SESSION_SAVE: 'session:save',
  SESSION_RESTORE: 'session:restore',
  SESSION_GET_ALL: 'session:get-all',
  SESSION_DELETE: 'session:delete',

  // Site Settings

  // ═══ Privacy Engine ═══════════════════════════════════
  PRIVACY_GET_CONFIG: 'privacy:get-config',
  PRIVACY_SET_CONFIG: 'privacy:set-config',
  PRIVACY_CLEAR_ALL: 'privacy:clear-all',
  PRIVACY_CLEAR_COOKIES: 'privacy:clear-cookies',
  PRIVACY_CLEAR_CACHE: 'privacy:clear-cache',
  PRIVACY_CLEAR_HISTORY: 'privacy:clear-history',
  PRIVACY_CLEAR_STORAGE: 'privacy:clear-storage',
  PRIVACY_CLEAR_SERVICE_WORKERS: 'privacy:clear-service-workers',

  // ═══ Session Manager ══════════════════════════════════
  SESSION_GET_CONFIG: 'session:get-config',
  SESSION_SET_CONFIG: 'session:set-config',
  SESSION_CLEAR_ALL: 'session:clear-all',

  // ═══ AdBlocker Engine ═════════════════════════════════
  ADBLOCK_GET_STATS: 'adblock:get-stats',
  ADBLOCK_TOGGLE: 'adblock:toggle',
  ADBLOCK_GET_ENABLED: 'adblock:get-enabled',

  // ═══ Portable Mode ════════════════════════════════════
  WINDOW_IS_PORTABLE: 'window:is-portable',

  // ═══ Sigil — Digital Signature Engine ═════════════════
  SIGIL_GET_CONFIG: 'sigil:get-config',
  SIGIL_SET_CONFIG: 'sigil:set-config',
  SIGIL_IMPORT_P12: 'sigil:import-p12',
  SIGIL_GET_CERTIFICATES: 'sigil:get-certificates',
  SIGIL_DELETE_CERT: 'sigil:delete-cert',
  SIGIL_GENERATE_SELF_SIGNED: 'sigil:generate-self-signed',
  SIGIL_SIGN_FILE: 'sigil:sign-file',
  SIGIL_VERIFY: 'sigil:verify',
  SIGIL_VERIFY_SIG_FILE: 'sigil:verify-sig-file',
  SIGIL_GET_SIGNATURES: 'sigil:get-signatures',
  SIGIL_DELETE_SIGNATURE: 'sigil:delete-signature',
  SIGIL_ENCRYPT_FILE: 'sigil:encrypt-file',
  SIGIL_DECRYPT_FILE: 'sigil:decrypt-file',

  // ═══ File System — Archive of Mars ════════════════════
  FS_LIST_DIR: 'fs:list-dir',
  FS_GET_HOME: 'fs:get-home',
  FS_GET_DOWNLOADS: 'fs:get-downloads',
  FS_GET_DESKTOP: 'fs:get-desktop',
  FS_GET_DOCUMENTS: 'fs:get-documents',
  FS_GET_PICTURES: 'fs:get-pictures',
  FS_DELETE: 'fs:delete',
  FS_RENAME: 'fs:rename',
  FS_MKDIR: 'fs:mkdir',
  FS_OPEN_PATH: 'fs:open-path',
  FS_REVEAL: 'fs:reveal',
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  FS_SELECT_DIR: 'fs:select-dir',

  // ═══ Torrent Engine ═══════════════════════════════════
  TORRENT_ADD: 'torrent:add',
  TORRENT_ADD_FILE: 'torrent:add-file',
  TORRENT_REMOVE: 'torrent:remove',
  TORRENT_PAUSE: 'torrent:pause',
  TORRENT_RESUME: 'torrent:resume',
  TORRENT_GET_LIST: 'torrent:get-list',
  TORRENT_GET_FILE_URL: 'torrent:get-file-url',
  TORRENT_ON_UPDATE: 'torrent:on-update',

  // ═══ System Monitor ════════════════════════════════════
  SYSMON_GET_STATS: 'sysmon:get-stats',
  SYSMON_UPDATE: 'sysmon:update',
  SPEEDTEST_RUN: 'speedtest:run',

  // ═══ Picture-in-Picture ═════════════════════════════════
  PIP_TOGGLE: 'pip:toggle',
  PIP_GET_STATE: 'pip:get-state',
  PIP_CLOSE: 'pip:close',
  PIP_STATE_CHANGE: 'pip:state-change',
  PIP_CONTROL: 'pip:control',

  // ═══ Email Client ═══════════════════════════════════════
  EMAIL_ADD_ACCOUNT: 'email:add-account',
  EMAIL_REMOVE_ACCOUNT: 'email:remove-account',
  EMAIL_GET_ACCOUNTS: 'email:get-accounts',
  EMAIL_CONNECT: 'email:connect',
  EMAIL_DISCONNECT: 'email:disconnect',
  EMAIL_LIST_FOLDERS: 'email:list-folders',
  EMAIL_FETCH_MESSAGES: 'email:fetch-messages',
  EMAIL_SEND_MESSAGE: 'email:send-message',

  // ═══ Git Manager ═════════════════════════════════════════
  GIT_SELECT_REPO: 'git:select-repo',
  GIT_SET_REPO: 'git:set-repo',
  GIT_STATUS: 'git:status',
  GIT_ADD: 'git:add',
  GIT_RESET: 'git:reset',
  GIT_DISCARD: 'git:discard',
  GIT_COMMIT: 'git:commit',
  GIT_LOG: 'git:log',
  GIT_BRANCHES: 'git:branches',
  GIT_CHECKOUT: 'git:checkout',
  GIT_CREATE_BRANCH: 'git:create-branch',
  GIT_PULL: 'git:pull',
  GIT_PUSH: 'git:push',
  GIT_CLONE: 'git:clone',
  GIT_INIT: 'git:init',
  GIT_DIFF: 'git:diff',

  // ═══ Docker ═════════════════════════════════════════════
  DOCKER_LIST_CONTAINERS: 'docker:list-containers',
  DOCKER_LIST_IMAGES: 'docker:list-images',
  DOCKER_LIST_VOLUMES: 'docker:list-volumes',
  DOCKER_LIST_NETWORKS: 'docker:list-networks',
  DOCKER_START: 'docker:start',
  DOCKER_STOP: 'docker:stop',
  DOCKER_RESTART: 'docker:restart',
  DOCKER_LOGS: 'docker:logs',
  DOCKER_REMOVE: 'docker:remove',

  // ═══ Network tools ══════════════════════════════════════
  NETWORK_SCAN_PORTS: 'network:scan-ports',
  NETWORK_SCAN_LAN: 'network:scan-lan',
  NETWORK_WOL: 'network:wol',
  // Live network monitor — system connections + Chromium request feed
  NETWORK_CONNECTIONS: 'network:connections',
  NETWORK_INTERFACE_STATS: 'network:interface-stats',
  NETWORK_REQUEST_ACTIVITY: 'network:request-activity',
  NETWORK_CLEAR_ACTIVITY: 'network:clear-activity',

  // ═══ SQLite ═════════════════════════════════════════════
  SQLITE_OPEN: 'sqlite:open',
  SQLITE_QUERY: 'sqlite:query',
  SQLITE_LIST_TABLES: 'sqlite:list-tables',
  SQLITE_SCHEMA: 'sqlite:schema',

  // ═══ Media (yt-dlp / ffmpeg) ════════════════════════════
  MEDIA_ANALYZE: 'media:analyze',
  MEDIA_DOWNLOAD: 'media:download',
  MEDIA_EXTRACT_AUDIO: 'media:extract-audio',

  // ═══ SSH ════════════════════════════════════════════════
  SSH_CONNECT: 'ssh:connect',
  SSH_EXEC: 'ssh:exec',
  SSH_DISCONNECT: 'ssh:disconnect',

  // ═══ Archives ═════════════════════════════════════════════
  ARCHIVE_LIST: 'archive:list',
  ARCHIVE_EXTRACT: 'archive:extract',
  ARCHIVE_READ_ENTRY: 'archive:read-entry',
  ARCHIVE_CREATE: 'archive:create',
  ARCHIVE_EXTRACT_ENTRIES: 'archive:extract-entries',

  // ═══ Process manager ══════════════════════════════════════
  PROCESS_LIST: 'process:list',
  PROCESS_KILL: 'process:kill',

  // ═══ Omnibox quick answers ══════════════════════════════
  OMNIBOX_IP: 'omnibox:ip',
  OMNIBOX_WEATHER: 'omnibox:weather',
  OMNIBOX_CURRENCY: 'omnibox:currency',
  OMNIBOX_WHOIS: 'omnibox:whois',
  OMNIBOX_TIME: 'omnibox:time',
  OMNIBOX_DEFINE: 'omnibox:define',

  // ═══ Auto-update (electron-updater) ══════════════════════
  APP_UPDATE_STATUS: 'app:update-status',
  APP_UPDATE_RESTART: 'app:update-restart',
} as const;
