// ═══ Context menu for chrome / start page (main renderer) ═══

import { clipboard, Menu, type BrowserWindow, type WebContents } from 'electron';

export function installChromeContextMenu(window: BrowserWindow, webContents: WebContents): void {
  webContents.on('context-menu', (event, params) => {
    event.preventDefault();

    const template: Electron.MenuItemConstructorOptions[] = [];

    if (params.editFlags.canCut) template.push({ label: 'Вырезать', role: 'cut' });
    if (params.editFlags.canCopy) template.push({ label: 'Копировать', role: 'copy' });
    if (params.editFlags.canPaste) template.push({ label: 'Вставить', role: 'paste' });
    if (params.editFlags.canSelectAll) template.push({ label: 'Выделить всё', role: 'selectAll' });

    if (template.length > 0) {
      template.push({ type: 'separator' });
    }

    if (params.linkURL) {
      template.push({
        label: 'Скопировать ссылку',
        click: () => clipboard.writeText(params.linkURL!),
      });
      template.push({ type: 'separator' });
    }

    template.push({
      label: 'Открыть DevTools',
      click: () => webContents.openDevTools({ mode: 'detach' }),
    });

    Menu.buildFromTemplate(template).popup({
      window,
      x: params.x,
      y: params.y,
    });
  });
}
