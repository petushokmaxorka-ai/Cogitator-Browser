// ═══════════════════════════════════════════════════════════════════════════════
// COGITATOR BROWSER — Sidebar
// Dark Mechanicus: #000000, #FF0000, #C8A84B, #00BFBF, monospace
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { SidebarTab, Tab } from '../../../shared/types';

import VideoDownloader from '../downloader/VideoDownloader';
import AudioExtractor from '../downloader/AudioExtractor';
import DownloadsPanel from './DownloadsPanel';
import ASCIIArt from '../ascii/ASCIIArt';
import Whiteboard from '../whiteboard/Whiteboard';
import { SSHClient } from '../ssh';
import { SQLiteBrowser } from '../sqlite';
import { PortScanner, LANScanner, WakeOnLAN } from '../network';
import { ArchiveManager } from '../archive';
import { UnitConverter } from '../converter';
import { LoanCalculator } from '../calculator';
import { FileEncryptor } from '../crypto';
import { SpeedTest } from '../network';
import { CalendarView } from '../calendar';
import { PomodoroTimer } from '../pomodoro';
import { TodoList } from '../todo';
import { TimeTracker } from '../timetrack';
import { HabitTracker } from '../habits';
import { Journal } from '../journal';
import { TOTPGenerator } from '../totp';
import { QRCodeTool } from '../qrcode';
import TextToSpeech from '../tts/TextToSpeech';
import ReadingList from '../reading/ReadingList';
import WorldClock from '../worldclock/WorldClock';
import ClockTool from '../clock/Clock';
import FocusMode from '../focus/FocusMode';
import WeatherWidget from '../weather/WeatherWidget';
import FileManager from '../files/FileManager';

// ── Core tools ──
import ChatPanel from './ChatPanel';
import PageContextPanel from './PageContextPanel';
import TranslatePanel from './TranslatePanel';
import CodeEditor from '../editor/CodeEditor';
import RegexTester from '../regex/RegexTester';
import DiffTool from '../diff/DiffTool';
import DiagramTool from '../diagram/DiagramTool';
import APITester from '../apitester/APITester';
import DockerUI from '../docker/DockerUI';
import GitClient from '../git/GitClient';
import GraphQLPlayground from '../graphql/GraphQLPlayground';
import EmailClient from '../email/EmailClient';
import MediaPlayer from '../media/MediaPlayer';
import SystemMonitor from '../sysmon/SystemMonitor';
import ProcessManager from '../process/ProcessManager';
import TerminalPanel from '../terminal/TerminalPanel';
import TorrentClient from '../torrent/TorrentClient';
import ClipboardManager from '../clipboard/ClipboardManager';
import NotesPanel from '../notes/NotesPanel';
import RSSReader from '../rss/RSSReader';
import ScreenRecorder from '../recorder/ScreenRecorder';
import ColorPicker from '../colorpicker/ColorPicker';
import WebSocketTester from '../websocket/WebSocketTester';
import MusicVisualizer from '../visualizer/MusicVisualizer';
import VaultPanel from '../vault/VaultPanel';
import SigilPanel from '../sigil/SigilPanel';
import SettingsPanel from '../settings/SettingsPanel';
import AutoFillSettings from '../autofill/AutoFillSettings';
import SearchPanel from './SearchPanel';
import ForgePanel from '../forge/ForgePanel';

// ── Tools to be created ──
import OCRTool from '../ocr/OCRTool';
import GIFTool from '../gif/GIFTool';

const COLORS = {
  bg: '#000000',
  panel: '#111111',
  border: '#FF0000',
  gold: '#C8A84B',
  cyan: '#00BFBF',
  text: '#E0E0E0',
  textDim: '#888888',
  hover: '#1A1A1A',
};

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

const TAB_CONFIG: { id: SidebarTab; label: string }[] = [
  { id: 'browser', label: 'WEB' },
  { id: 'context', label: 'PAGE' },
  { id: 'translate', label: 'TR' },
  { id: 'search', label: 'SRCH' },
  { id: 'forge', label: 'FORGE' },
  { id: 'files', label: 'FILES' },
  { id: 'downloads', label: 'DL' },
  { id: 'editor', label: 'EDIT' },
  { id: 'regex', label: 'REGEX' },
  { id: 'diff', label: 'DIFF' },
  { id: 'diagram', label: 'DIAG' },
  { id: 'ocr', label: 'OCR' },
  { id: 'gif', label: 'GIF' },
  { id: 'apitester', label: 'API' },
  { id: 'docker', label: 'DOCKER' },
  { id: 'git', label: 'GIT' },
  { id: 'graphql', label: 'GQL' },
  { id: 'email', label: 'EMAIL' },
  { id: 'media', label: 'MEDIA' },
  { id: 'sysmon', label: 'SYS' },
  { id: 'process', label: 'PROC' },
  { id: 'terminal', label: 'TERM' },
  { id: 'torrent', label: 'TORR' },
  { id: 'clipboard', label: 'CLIP' },
  { id: 'notes', label: 'NOTE' },
  { id: 'rss', label: 'RSS' },
  { id: 'recorder', label: 'REC' },
  { id: 'colorpicker', label: 'COLOR' },
  { id: 'websocket', label: 'WS' },
  { id: 'visualizer', label: 'VIS' },
  { id: 'vault', label: 'VAULT' },
  { id: 'sigil', label: 'SIGIL' },
  { id: 'settings', label: 'SET' },
  { id: 'autofill', label: 'FILL' },
  { id: 'videodl', label: 'VIDEO' },
  { id: 'audio', label: 'AUDIO' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'draw', label: 'DRAW' },
  { id: 'ssh', label: 'SSH' },
  { id: 'sqlite', label: 'SQL' },
  { id: 'scan', label: 'SCAN' },
  { id: 'lan', label: 'LAN' },
  { id: 'wol', label: 'WOL' },
  { id: 'archive', label: 'ARCH' },
  { id: 'convert', label: 'CONV' },
  { id: 'loan', label: 'LOAN' },
  { id: 'encrypt', label: 'CRYPT' },
  { id: 'speed', label: 'SPD' },
  { id: 'calendar', label: 'CAL' },
  { id: 'pomodoro', label: 'POMO' },
  { id: 'todo', label: 'TODO' },
  { id: 'tracker', label: 'TRK' },
  { id: 'habits', label: 'HAB' },
  { id: 'journal', label: 'JRN' },
  { id: 'totp', label: '2FA' },
  { id: 'qr', label: 'QR' },
  { id: 'tts', label: 'TTS' },
  { id: 'reading', label: 'RD' },
  { id: 'read', label: 'RL' },
  { id: 'worldclock', label: 'WC' },
  { id: 'clock', label: 'CLK' },
  { id: 'focus', label: 'FOC' },
  { id: 'weather', label: 'WX' },
];

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '56px',
    backgroundColor: COLORS.panel,
    borderRight: `1px solid ${COLORS.border}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '8px',
    paddingBottom: '8px',
    gap: '2px',
    flexShrink: 0,
    zIndex: 10,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    maxHeight: '100vh',
  },
  tabButton: {
    width: '48px',
    height: '48px',
    backgroundColor: 'transparent',
    color: COLORS.textDim,
    border: '1px solid transparent',
    fontFamily: 'monospace',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    transition: 'all 0.15s',
    letterSpacing: '0.5px',
  },
  tabButtonActive: {
    width: '48px',
    height: '48px',
    backgroundColor: COLORS.hover,
    color: COLORS.cyan,
    border: `1px solid ${COLORS.cyan}`,
    fontFamily: 'monospace',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    letterSpacing: '0.5px',
  },
  tabIndicator: {
    width: '24px',
    height: '2px',
    backgroundColor: COLORS.cyan,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
  },
};

// ── Scrollbar styles for sidebar ─────────────────────────
const SIDEBAR_SCROLL_CSS = `
  .cogitator-sidebar::-webkit-scrollbar {
    width: 12px;
  }
  .cogitator-sidebar::-webkit-scrollbar-track {
    background:
      repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 32px,
        rgba(42,42,42,0.9) 32px,
        rgba(42,42,42,0.9) 33px
      );
    border-left: 1px solid #1A1A1A;
  }
  .cogitator-sidebar::-webkit-scrollbar-thumb {
    background: repeating-conic-gradient(
      from 0deg,
      #FF0000 0deg 12deg,
      #8B0000 12deg 24deg
    );
    border: 1px solid #C8A84B;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(255,0,0,0.6), inset 0 0 4px rgba(0,0,0,0.5);
    min-height: 28px;
  }
  .cogitator-sidebar::-webkit-scrollbar-thumb:hover {
    background: repeating-conic-gradient(
      from 0deg,
      #FF3333 0deg 12deg,
      #AA0000 12deg 24deg
    );
    box-shadow: 0 0 12px rgba(255,0,0,0.8), inset 0 0 4px rgba(0,0,0,0.5);
  }
`;

const TAB_ICONS: Record<SidebarTab, string> = {
  browser: '◇',
  context: '◆',
  translate: '文',
  search: '🔍',
  forge: '⚒',
  files: '📁',
  downloads: '\u21E9',
  editor: '✎',
  regex: 'R',
  diff: '≠',
  diagram: '◆',
  ocr: 'O',
  gif: 'G',
  videodl: '▼',
  audio: '♪',
  ascii: 'A',
  draw: '✏',
  ssh: '$',
  sqlite: '🗄',
  scan: '◉',
  lan: '☎',
  wol: '⚡',
  archive: '📦',
  convert: '⇄',
  loan: '$',
  encrypt: '🔐',
  speed: '⬇',
  calendar: '📅',
  pomodoro: '◷',
  todo: '☑',
  tracker: '◴',
  habits: '◇',
  journal: '🕮',
  totp: '⚷',
  qr: '▣',
  tts: '◐',
  reading: '📖',
  read: '☰',
  worldclock: '🌐',
  clock: '◷',
  focus: '◎',
  apitester: '⚡',
  docker: '🐳',
  git: '⑃',
  graphql: '◆',
  email: '✉',
  media: '▶',
  sysmon: '💻',
  process: '◆',
  terminal: '⯈',
  torrent: '🔽',
  clipboard: '📋',
  notes: '📝',
  rss: '≡',
  recorder: '●',
  colorpicker: '🎨',
  websocket: '⇄',
  visualizer: '♫',
  vault: '🔒',
  sigil: '✦',
  settings: '◆',
  autofill: '✍',
  weather: '☁',
};

export default function Sidebar({ activeTab, onTabChange }: SidebarProps): JSX.Element {
  return (
    <>
      <style>{SIDEBAR_SCROLL_CSS}</style>
      <div className="cogitator-sidebar" style={styles.sidebar}>
        {TAB_CONFIG.map((tab) => (
        <button
          key={tab.id}
          style={activeTab === tab.id ? styles.tabButtonActive : styles.tabButton}
          onClick={() => onTabChange(tab.id)}
          title={tab.label}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.hover;
              (e.currentTarget as HTMLElement).style.color = COLORS.text;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = COLORS.textDim;
            }
          }}
        >
          <span style={{ fontSize: '14px' }}>{TAB_ICONS[tab.id]}</span>
          <span>{tab.label}</span>
          {activeTab === tab.id && <div style={styles.tabIndicator} />}
        </button>
      ))}
      </div>
    </>
  );
}

export function TabContent({
  activeTab,
  browserTab,
}: {
  activeTab: SidebarTab;
  browserTab: Tab | null;
}): JSX.Element {
  switch (activeTab) {
    case 'browser':
      return <ChatPanel />;
    case 'context':
      return <PageContextPanel activeTab={browserTab} />;
    case 'translate':
      return <TranslatePanel />;
    case 'search':
      return <SearchPanel />;
    case 'forge':
      return <ForgePanel />;
    case 'files':
      return <FileManager />;
    case 'downloads':
      return <DownloadsPanel />;
    case 'editor':
      return <CodeEditor />;
    case 'regex':
      return <RegexTester />;
    case 'diff':
      return <DiffTool />;
    case 'diagram':
      return <DiagramTool />;
    case 'ocr':
      return <OCRTool />;
    case 'gif':
      return <GIFTool />;
    case 'apitester':
      return <APITester />;
    case 'docker':
      return <DockerUI />;
    case 'git':
      return <GitClient />;
    case 'graphql':
      return <GraphQLPlayground />;
    case 'email':
      return <EmailClient />;
    case 'media':
      return <MediaPlayer />;
    case 'sysmon':
      return <SystemMonitor />;
    case 'process':
      return <ProcessManager />;
    case 'terminal':
      return <TerminalPanel />;
    case 'torrent':
      return <TorrentClient />;
    case 'clipboard':
      return <ClipboardManager />;
    case 'notes':
      return <NotesPanel />;
    case 'rss':
      return <RSSReader />;
    case 'recorder':
      return <ScreenRecorder />;
    case 'colorpicker':
      return <ColorPicker />;
    case 'websocket':
      return <WebSocketTester />;
    case 'visualizer':
      return <MusicVisualizer />;
    case 'vault':
      return <VaultPanel />;
    case 'sigil':
      return <SigilPanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'autofill':
      return <AutoFillSettings />;
    case 'videodl':
      return <VideoDownloader />;
    case 'audio':
      return <AudioExtractor />;
    case 'ascii':
      return <ASCIIArt />;
    case 'draw':
      return <Whiteboard />;
    case 'ssh':
      return <SSHClient />;
    case 'sqlite':
      return <SQLiteBrowser />;
    case 'scan':
      return <PortScanner />;
    case 'lan':
      return <LANScanner />;
    case 'wol':
      return <WakeOnLAN />;
    case 'archive':
      return <ArchiveManager />;
    case 'convert':
      return <UnitConverter />;
    case 'loan':
      return <LoanCalculator />;
    case 'encrypt':
      return <FileEncryptor />;
    case 'speed':
      return <SpeedTest />;
    case 'calendar':
      return <CalendarView />;
    case 'pomodoro':
      return <PomodoroTimer />;
    case 'todo':
      return <TodoList />;
    case 'tracker':
      return <TimeTracker />;
    case 'habits':
      return <HabitTracker />;
    case 'journal':
      return <Journal />;
    case 'totp':
      return <TOTPGenerator />;
    case 'qr':
      return <QRCodeTool />;
    case 'tts':
      return <TextToSpeech />;
    case 'reading':
      return <RSSReader />;
    case 'read':
      return <ReadingList />;
    case 'worldclock':
      return <WorldClock />;
    case 'clock':
      return <ClockTool />;
    case 'focus':
      return <FocusMode />;
    case 'weather':
      return <WeatherWidget />;
  }
}
