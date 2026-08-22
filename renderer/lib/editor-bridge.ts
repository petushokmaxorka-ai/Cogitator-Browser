/** Cross-panel bridge: vault / search → CodeEditor */

export const EDITOR_OPEN_REQUEST = 'cogitator:editor-open-request';
export const EDITOR_OPEN_FILE = 'cogitator:editor-open-file';

export function requestOpenInEditor(path: string): void {
  window.dispatchEvent(new CustomEvent<string>(EDITOR_OPEN_REQUEST, { detail: path }));
}

export function onEditorOpenRequest(handler: (path: string) => void): () => void {
  const listener = (event: Event) => {
    const path = (event as CustomEvent<string>).detail;
    if (path) handler(path);
  };
  window.addEventListener(EDITOR_OPEN_REQUEST, listener);
  return () => window.removeEventListener(EDITOR_OPEN_REQUEST, listener);
}

export function dispatchEditorOpenFile(path: string): void {
  window.dispatchEvent(new CustomEvent<string>(EDITOR_OPEN_FILE, { detail: path }));
}

export function onEditorOpenFile(handler: (path: string) => void): () => void {
  const listener = (event: Event) => {
    const path = (event as CustomEvent<string>).detail;
    if (path) handler(path);
  };
  window.addEventListener(EDITOR_OPEN_FILE, listener);
  return () => window.removeEventListener(EDITOR_OPEN_FILE, listener);
}

const EDITABLE_EXT =
  /\.(md|txt|json|ts|tsx|js|jsx|py|rs|go|html|css|yaml|yml|toml|sh|sql|vue|svelte)$/i;

export function isEditableVaultPath(path: string): boolean {
  return EDITABLE_EXT.test(path);
}
