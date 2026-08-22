// ═══ COGITATOR BROWSER — Custom Hooks ═══
// Export all custom hooks for the renderer process.

export { default as useOllama } from './useOllama';
export type { UseOllamaReturn } from './useOllama';

export { default as useTabs } from './useTabs';
export type { UseTabsReturn } from './useTabs';

export { default as useVPN } from './useVPN';
export type { UseVPNReturn } from './useVPN';

export { default as useTheme } from './useTheme';
export type { UseThemeReturn } from './useTheme';

export { default as useBookmarks } from './useBookmarks';
export type { UseBookmarksReturn, Bookmark } from './useBookmarks';

export { default as useHistory } from './useHistory';
export type { UseHistoryReturn, HistoryEntry } from './useHistory';

export { default as useDownloads } from './useDownloads';
export type { UseDownloadsReturn, DownloadItem, DownloadStatus } from './useDownloads';

export { default as useQuickAnswer } from './useQuickAnswer';
export type { UseQuickAnswerReturn, QuickAnswer, QuickAnswerType } from './useQuickAnswer';

export { default as useVoiceSearch } from './useVoiceSearch';
export type { VoiceSearchState } from './useVoiceSearch';
