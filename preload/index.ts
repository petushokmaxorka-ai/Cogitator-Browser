// ═══════════════════════════════════════════════════════════
// Preload Script — Context Bridge
// ═══════════════════════════════════════════════════════════

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  VaultPasswordEntry,
  VaultNewPasswordEntry,
  VaultPasswordStrength,
  VaultStats,
  Certificate,
  Signature,
  SigilConfig,
  VerifyResult,
} from '../shared/types';

const electronAPI = {
  // ── Tabs ──────────────────────────────────────────────
  tabs: {
    create: (url?: string) => ipcRenderer.invoke(IPC_CHANNELS.TABS_CREATE, url),
    close: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TABS_CLOSE, id),
    switch: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TABS_SWITCH, id),
    navigate: (id: string, url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TABS_NAVIGATE, id, url),
    goBack: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TABS_GO_BACK, id),
    goForward: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TABS_GO_FORWARD, id),
    reload: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TABS_RELOAD, id),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ALL),
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ACTIVE),
    onUpdate: (callback: (tabs: any[], activeId: string) => void) => {
      const listener = (_: any, tabs: any[], activeId: string) => callback(tabs, activeId);
      ipcRenderer.on(IPC_CHANNELS.TABS_ON_UPDATE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.TABS_ON_UPDATE, listener);
    },
    getSelectedText: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_SELECTED_TEXT),
    getPageText: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_PAGE_TEXT),
    getPageInfo: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_PAGE_INFO),
  },

  // ── Sidebar ───────────────────────────────────────────
  sidebar: {
    toggle: (open: boolean) => ipcRenderer.invoke(IPC_CHANNELS.SIDEBAR_TOGGLE, open),
    resize: (width: number) => ipcRenderer.invoke(IPC_CHANNELS.SIDEBAR_RESIZE, width),
  },

  // ── DevTools ──────────────────────────────────────────
  devtools: {
    open: () => ipcRenderer.invoke(IPC_CHANNELS.DEVTOOLS_OPEN),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.DEVTOOLS_CLOSE),
  },

  // ── Find in Page ──────────────────────────────────────
  find: {
    inPage: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.FIND_IN_PAGE, text),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.STOP_FIND_IN_PAGE),
    onResult: (callback: (result: { tabId: string; requestId: number; activeMatchOrdinal: number; matches: number; finalUpdate: boolean }) => void) => {
      const listener = (_: any, result: any) => callback(result);
      ipcRenderer.on(IPC_CHANNELS.FIND_IN_PAGE_RESULT, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.FIND_IN_PAGE_RESULT, listener);
    },
  },

  // ── Zoom ──────────────────────────────────────────────
  zoom: {
    set: (level: number) => ipcRenderer.invoke(IPC_CHANNELS.ZOOM_SET, level),
  },

  // ── Ollama ────────────────────────────────────────────
  ollama: {
    listModels: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_LIST_MODELS),
    chat: (messages: any[], model: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_CHAT, messages, model),
    checkStatus: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_CHECK_STATUS),
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_GET_CONFIG),
    setConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_SET_CONFIG, config),
    abort: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA_ABORT),
    onStreamChunk: (callback: (data: { chunk: string; done: boolean }) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('ollama:stream-chunk', listener);
      return () => ipcRenderer.removeListener('ollama:stream-chunk', listener);
    },
  },

  mens: {
    checkStatus: () => ipcRenderer.invoke(IPC_CHANNELS.MENS_CHECK_STATUS),
    getContext: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.MENS_GET_CONTEXT, query),
    semanticSearch: (query: string, limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.MENS_SEMANTIC_SEARCH, query, limit),
  },

  embed: {
    create: (input: string | string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.EMBED_CREATE, input),
    health: () => ipcRenderer.invoke(IPC_CHANNELS.EMBED_HEALTH),
  },

  mind: {
    getPulse: () => ipcRenderer.invoke(IPC_CHANNELS.MIND_GET_PULSE),
  },

  // ── VPN ───────────────────────────────────────────────
  vpn: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.VPN_STATUS),
    start: () => ipcRenderer.invoke(IPC_CHANNELS.VPN_START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.VPN_STOP),
  },

  // ── Page ──────────────────────────────────────────────
  page: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.PAGE_GET_INFO),
  },

  // ── Reader ────────────────────────────────────────────
  reader: {
    getHTML: () => ipcRenderer.invoke(IPC_CHANNELS.READER_GET_HTML),
    detect: () => ipcRenderer.invoke(IPC_CHANNELS.READER_DETECT),
  },

  // ── Downloads ─────────────────────────────────────────
  downloads: {
    onStarted: (callback: (data: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('download-started', listener);
      return () => ipcRenderer.removeListener('download-started', listener);
    },
    onProgress: (callback: (data: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('download-progress', listener);
      return () => ipcRenderer.removeListener('download-progress', listener);
    },
    onCompleted: (callback: (data: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('download-completed', listener);
      return () => ipcRenderer.removeListener('download-completed', listener);
    },
  },

  // ── AdBlocker ─────────────────────────────────────────
  adblock: {
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.ADBLOCK_GET_STATS),
    toggle: () => ipcRenderer.invoke(IPC_CHANNELS.ADBLOCK_TOGGLE),
    getEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.ADBLOCK_GET_ENABLED),
  },

  // ── Window ────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    getBounds: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_BOUNDS),
    resize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_RESIZE),
    onMaximize: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.WINDOW_ON_MAXIMIZE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_ON_MAXIMIZE, listener);
    },
    onUnmaximize: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.WINDOW_ON_UNMAXIMIZE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_ON_UNMAXIMIZE, listener);
    },
    onContentFullscreenChange: (callback: (active: boolean) => void) => {
      const listener = (_: unknown, active: boolean) => callback(active);
      ipcRenderer.on(IPC_CHANNELS.CONTENT_FULLSCREEN_ON_CHANGE, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.CONTENT_FULLSCREEN_ON_CHANGE, listener);
    },
    isPortable: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_PORTABLE),
  },

  // ── Vault — Cryptkeeper Password Manager ──────────────
  vault: {
    exists: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT_EXISTS),
    unlock: (password: string) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_UNLOCK, password),
    lock: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT_LOCK),
    isUnlocked: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT_IS_UNLOCKED),
    getPasswords: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_PASSWORDS),
    getPassword: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_PASSWORD, id),
    addPassword: (entry: VaultNewPasswordEntry) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_ADD_PASSWORD, entry),
    updatePassword: (id: string, updates: Partial<Omit<VaultPasswordEntry, 'id' | 'createdAt'>>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_UPDATE_PASSWORD, id, updates),
    deletePassword: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_DELETE_PASSWORD, id),
    searchPasswords: (query: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_SEARCH_PASSWORDS, query),
    getPasswordsForUrl: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_PASSWORDS_FOR_URL, url),
    generatePassword: (
      length?: number,
      useSymbols?: boolean,
      useNumbers?: boolean,
      useUppercase?: boolean,
      useLowercase?: boolean
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.VAULT_GENERATE_PASSWORD,
        length,
        useSymbols,
        useNumbers,
        useUppercase,
        useLowercase
      ),
    checkStrength: (password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_CHECK_STRENGTH, password),
    calculateEntropy: (password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_CALCULATE_ENTROPY, password),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_STATS),
    changePassword: (newPassword: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_CHANGE_PASSWORD, newPassword),
  },

  // ── Privacy Engine ────────────────────────────────────
  privacy: {
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_GET_CONFIG),
    setConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_SET_CONFIG, config),
    clearAll: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_CLEAR_ALL),
    clearCookies: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_CLEAR_COOKIES),
    clearCache: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_CLEAR_CACHE),
    clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_CLEAR_HISTORY),
    clearStorage: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_CLEAR_STORAGE),
    clearServiceWorkers: () => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_CLEAR_SERVICE_WORKERS),
  },

  // ── Session Manager ───────────────────────────────────
  session: {
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_CONFIG),
    setConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_SET_CONFIG, config),
    clearAll: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLEAR_ALL),
  },

  // ═══ File System — Archive of Mars ═════════════════════
  fs: {
    listDir: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_LIST_DIR, dirPath),
    getHome: () => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_HOME),
    getDownloads: () => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_DOWNLOADS),
    getDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_DESKTOP),
    getDocuments: () => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_DOCUMENTS),
    getPictures: () => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_PICTURES),
    delete: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE, filePath),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME, oldPath, newPath),
    mkdir: (dirPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_MKDIR, dirPath),
    openPath: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_OPEN_PATH, filePath),
    reveal: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_REVEAL, filePath),
    read: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ, filePath),
    write: (filePath: string, content: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE, filePath, content),
    selectDir: () => ipcRenderer.invoke(IPC_CHANNELS.FS_SELECT_DIR),
  },

  // ═══ Sigil — Digital Signature Engine ══════════════════
  sigil: {
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SIGIL_GET_CONFIG),
    setConfig: (config: Partial<SigilConfig>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_SET_CONFIG, config),
    importP12: (p12Path: string, password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_IMPORT_P12, p12Path, password),
    getCertificates: () => ipcRenderer.invoke(IPC_CHANNELS.SIGIL_GET_CERTIFICATES),
    deleteCert: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SIGIL_DELETE_CERT, id),
    generateSelfSigned: (name: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_GENERATE_SELF_SIGNED, name),
    signFile: (filePath: string, certificateId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_SIGN_FILE, filePath, certificateId),
    verify: (filePath: string, signatureHex: string, certificateId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_VERIFY, filePath, signatureHex, certificateId),
    verifySigFile: (filePath: string, sigFilePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_VERIFY_SIG_FILE, filePath, sigFilePath),
    getSignatures: () => ipcRenderer.invoke(IPC_CHANNELS.SIGIL_GET_SIGNATURES),
    deleteSignature: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_DELETE_SIGNATURE, id),
    encryptFile: (filePath: string, certificateId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_ENCRYPT_FILE, filePath, certificateId),
    decryptFile: (encryptedFilePath: string, certificateId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SIGIL_DECRYPT_FILE, encryptedFilePath, certificateId),
    openFileDialog: (options?: { filters?: any[]; title?: string }) =>
      ipcRenderer.invoke('dialog:open-file', options),
    openFilesDialog: (options?: { filters?: any[]; title?: string }) =>
      ipcRenderer.invoke('dialog:open-files', options),
    saveFileDialog: (options?: { defaultPath?: string; filters?: any[]; title?: string }) =>
      ipcRenderer.invoke('dialog:save-file', options),
    openSigFileDialog: (options?: { title?: string }) =>
      ipcRenderer.invoke('dialog:open-sig-file', options),
  },

  // ═══ Torrent Engine ═════════════════════════════════════
  torrent: {
    add: (magnetURI: string, savePath?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TORRENT_ADD, magnetURI, savePath),
    addFile: (torrentPath: string, savePath?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TORRENT_ADD_FILE, torrentPath, savePath),
    remove: (infoHash: string) => ipcRenderer.invoke(IPC_CHANNELS.TORRENT_REMOVE, infoHash),
    pause: (infoHash: string) => ipcRenderer.invoke(IPC_CHANNELS.TORRENT_PAUSE, infoHash),
    resume: (infoHash: string) => ipcRenderer.invoke(IPC_CHANNELS.TORRENT_RESUME, infoHash),
    getList: () => ipcRenderer.invoke(IPC_CHANNELS.TORRENT_GET_LIST),
    getFileURL: (infoHash: string, fileIndex: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TORRENT_GET_FILE_URL, infoHash, fileIndex),
    onUpdate: (callback: (torrents: any[]) => void) => {
      const listener = (_: any, torrents: any[]) => callback(torrents);
      ipcRenderer.on(IPC_CHANNELS.TORRENT_ON_UPDATE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.TORRENT_ON_UPDATE, listener);
    },
  },

  // ═══ System Monitor ════════════════════════════════════
  sysmon: {
    getStats: () => ipcRenderer.invoke('sysmon:get-stats'),
    onUpdate: (callback: (stats: any) => void) => {
      const listener = (_: any, stats: any) => callback(stats);
      ipcRenderer.on('sysmon:update', listener);
      return () => ipcRenderer.removeListener('sysmon:update', listener);
    },
  },
  speedtest: {
    run: () => ipcRenderer.invoke('speedtest:run'),
  },

  git: {
    selectRepo: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_SELECT_REPO),
    setRepo: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_SET_REPO, path),
    status: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS),
    add: (files: string[]) => ipcRenderer.invoke(IPC_CHANNELS.GIT_ADD, files),
    reset: (files: string[]) => ipcRenderer.invoke(IPC_CHANNELS.GIT_RESET, files),
    discard: (file: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD, file),
    commit: (message: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, message),
    log: (max?: number) => ipcRenderer.invoke(IPC_CHANNELS.GIT_LOG, max),
    branches: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCHES),
    checkout: (branch: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT, branch),
    createBranch: (branch: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH, branch),
    pull: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL),
    push: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_PUSH),
    diff: (file?: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF, file),
  },

  docker: {
    listContainers: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_LIST_CONTAINERS),
    listImages: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_LIST_IMAGES),
    listVolumes: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_LIST_VOLUMES),
    listNetworks: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_LIST_NETWORKS),
    start: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_START, id),
    stop: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_STOP, id),
    restart: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_RESTART, id),
    logs: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_LOGS, id),
    remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_REMOVE, id),
  },

  network: {
    scanPorts: (host: string, from: number, to: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.NETWORK_SCAN_PORTS, host, from, to),
    scanLan: (cidr?: string) => ipcRenderer.invoke(IPC_CHANNELS.NETWORK_SCAN_LAN, cidr),
    wakeOnLan: (mac: string, broadcast?: string, port?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.NETWORK_WOL, mac, broadcast, port),
    // Live network monitor
    connections: () => ipcRenderer.invoke(IPC_CHANNELS.NETWORK_CONNECTIONS),
    interfaceStats: () => ipcRenderer.invoke(IPC_CHANNELS.NETWORK_INTERFACE_STATS),
    requestActivity: (sinceCursor = 0) =>
      ipcRenderer.invoke(IPC_CHANNELS.NETWORK_REQUEST_ACTIVITY, sinceCursor),
    clearActivity: () => ipcRenderer.invoke(IPC_CHANNELS.NETWORK_CLEAR_ACTIVITY),
  },

  sqlite: {
    open: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.SQLITE_OPEN, path),
    query: (sql: string) => ipcRenderer.invoke(IPC_CHANNELS.SQLITE_QUERY, sql),
    listTables: () => ipcRenderer.invoke(IPC_CHANNELS.SQLITE_LIST_TABLES),
    schema: (table: string) => ipcRenderer.invoke(IPC_CHANNELS.SQLITE_SCHEMA, table),
  },

  media: {
    analyze: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_ANALYZE, url),
    download: (url: string, formatId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MEDIA_DOWNLOAD, url, formatId),
    extractAudio: (inputPath: string, format: string, bitrate: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MEDIA_EXTRACT_AUDIO, inputPath, format, bitrate),
  },

  ssh: {
    connect: (config: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SSH_CONNECT, config),
    exec: (command: string) => ipcRenderer.invoke(IPC_CHANNELS.SSH_EXEC, command),
    disconnect: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_DISCONNECT),
  },

  archive: {
    list: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.ARCHIVE_LIST, path),
    extract: (path: string, dest: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ARCHIVE_EXTRACT, path, dest),
    readEntry: (path: string, entryName: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ARCHIVE_READ_ENTRY, path, entryName),
    create: (outputPath: string, sourcePaths: string[], format: 'zip' | 'tar.gz' | '7z') =>
      ipcRenderer.invoke(IPC_CHANNELS.ARCHIVE_CREATE, outputPath, sourcePaths, format),
    extractEntries: (path: string, dest: string, entries: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.ARCHIVE_EXTRACT_ENTRIES, path, dest, entries),
  },

  process: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_LIST),
    kill: (pid: number) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_KILL, pid),
  },

  // ═══ Picture-in-Picture ═════════════════════════════════
  pip: {
    toggle: () => ipcRenderer.invoke('pip:toggle'),
    getState: () => ipcRenderer.invoke('pip:get-state'),
    close: () => ipcRenderer.invoke('pip:close'),
    onStateChange: (callback: (state: any) => void) => {
      const listener = (_: any, state: any) => callback(state);
      ipcRenderer.on('pip:state-change', listener);
      return () => ipcRenderer.removeListener('pip:state-change', listener);
    },
    onLoadVideo: (callback: (payload: any) => void) => {
      const listener = (_: any, payload: any) => callback(payload);
      ipcRenderer.on('pip:load', listener);
      return () => ipcRenderer.removeListener('pip:load', listener);
    },
    onSync: (callback: (payload: any) => void) => {
      const listener = (_: any, payload: any) => callback(payload);
      ipcRenderer.on('pip:sync', listener);
      return () => ipcRenderer.removeListener('pip:sync', listener);
    },
    sendControl: (action: string, data?: any) => ipcRenderer.send('pip:control', action, data),
  },

  // ═══ Anathemetron (context menu / omnibox bridge) ═══════
  anathemetron: {
    onSearch: (callback: (text: string) => void) => {
      const listener = (_: unknown, text: string) => callback(text);
      ipcRenderer.on('anathemetron:search', listener);
      return () => {
        ipcRenderer.removeListener('anathemetron:search', listener);
      };
    },
  },

  omnibox: {
    getIp: () => ipcRenderer.invoke(IPC_CHANNELS.OMNIBOX_IP),
    getWeather: (city: string) => ipcRenderer.invoke(IPC_CHANNELS.OMNIBOX_WEATHER, city),
    convertCurrency: (amount: number, from: string, to: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.OMNIBOX_CURRENCY, amount, from, to),
    whois: (domain: string) => ipcRenderer.invoke(IPC_CHANNELS.OMNIBOX_WHOIS, domain),
    getTime: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.OMNIBOX_TIME, query),
    define: (word: string) => ipcRenderer.invoke(IPC_CHANNELS.OMNIBOX_DEFINE, word),
  },

  // ═══ Email Client ═══════════════════════════════════════
  email: {
    addAccount: (account: any) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_ADD_ACCOUNT, account),
    removeAccount: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_REMOVE_ACCOUNT, id),
    getAccounts: () => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_GET_ACCOUNTS),
    connect: (accountId: string) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_CONNECT, accountId),
    disconnect: (accountId: string) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_DISCONNECT, accountId),
    listFolders: (accountId: string) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_LIST_FOLDERS, accountId),
    fetchMessages: (accountId: string, folderPath: string, limit?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.EMAIL_FETCH_MESSAGES, accountId, folderPath, limit),
    sendMessage: (accountId: string, to: string, subject: string, body: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.EMAIL_SEND_MESSAGE, accountId, to, subject, body),
  },

  // ── RSS: main-process fetch (no CORS, no third-party proxy) ──
  rss: {
    fetch: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.RSS_FETCH_URL, url),
  },

  // ── Real terminal (node-pty) ──────────────────────────
  terminal: {
    create: (opts?: { cols?: number; rows?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERM_CREATE, opts),
    write: (id: string, data: string) => ipcRenderer.invoke(IPC_CHANNELS.TERM_WRITE, id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TERM_RESIZE, id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TERM_KILL, id),
    onData: (cb: (payload: { id: string; data: string }) => void) => {
      const handler = (_e: unknown, payload: { id: string; data: string }): void => cb(payload);
      ipcRenderer.on(IPC_CHANNELS.TERM_DATA_EVENT, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.TERM_DATA_EVENT, handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
