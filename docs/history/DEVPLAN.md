# COGITATOR BROWSER v2.1 — План доработки

## Цель: Полноценный браузер + Dark Mechanicus всё

---

## Stage 1: Core Browser (критично)

### 1.1 WebView отображение
**Проблема:** WebViewContainer.tsx — placeholder, сайты не отображаются.
**Решение:** Переработать tab-manager.ts + WebViewContainer для корректного позиционирования WebContentsView поверх renderer.

Electron WebContentsView работает на уровне native views, НЕ в DOM. Они позиционируются через setBounds() в main process. Renderer знает о sidebar state через IPC и сообщает main process пересчитать bounds.

Подход:
- Renderer → IPC "sidebar:toggle" → Main пересчитывает bounds всех WebContentsView
- Resize observer в renderer → IPC "window:resize" → Main пересчитывает bounds
- WebContentsView позиционируются ПОД chrome area и СПРАВА от sidebar

### 1.2 DevTools
- F12 / Ctrl+Shift+I → открыть DevTools для активного таба
- Отдельное окно или bottom panel

### 1.3 Find in Page (Ctrl+F)
- Оверлей поиска по странице
- webContents.findInPage(text) API

### 1.4 Zoom (Ctrl+ +/- / 0)
- webContents.setZoomLevel(level)
- Сохранение zoom per-tab

### 1.5 Context Menu (ПКМ)
- На ссылках: "Open in new tab", "Copy link"
- На картинках: "Save image", "Copy image"
- На тексте: "Search with Anathemetron"
- Механикус-стиль меню

---

## Stage 2: Закладки и История

### 2.1 Bookmarks
- Хранение в JSON файл (~/.config/cogitator/bookmarks.json)
- UI: панель закладок под адресной строкой (опционально)
- Кнопка ⭐ в адресной строке — добавить/удалить закладку
- Менеджер закладок в Settings

### 2.2 History
- Хранение в SQLite или JSON
- Панель истории в sidebar вкладке
- Очистка истории

### 2.3 Downloads
- IPC listener на will-download
- Менеджер загрузок в sidebar
- Прогресс, скорость, open/reveal/cancel

---

## Stage 3: SearXNG Dark Mechanicus Theme

### 3.1 Кастомный CSS
SearXNG поддерживает кастомные темы через `ui/static/themes/`. Создадим тему `cogitator`:

**Цвета:**
- Фон: #000000 (void black)
- Карточки: #1E1E1E (iron dark)
- Акцент: #FF0000 (omnissiah red) вместо синего
- Текст: #E8E8E8 (sacred white)
- Вторичный: #D4C5A0 (parchment)
- Ссылки: #C8A84B (cogitator gold)
- Hover: #00BFBF (noosphere cyan)

**Шрифт:** Courier New / monospace
**Эффекты:** glow на результатах, механикус-рамки

### 3.2 Docker Compose обновление
- Volume mount для CSS темы
- Переменная окружения SEARXNG_THEME=cogitator

---

## Stage 4: Полировка

### 4.1 Горячие клавиши
- Ctrl+T — новый таб
- Ctrl+W — закрыть таб
- Ctrl+L — фокус на адресную строку
- Ctrl+F — поиск на странице
- F12 — DevTools
- Ctrl+Shift+A — AI сайдбар
- Ctrl+ +/- — zoom

### 4.2 Startup
- Восстановление табов при запуске
- Загрузка last session

### 4.3 Обновлённый install.sh
- Установка + тема SearXNG
- Запуск всех сервисов
