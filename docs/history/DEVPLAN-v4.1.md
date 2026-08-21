# COGITATOR BROWSER v4.1 — "IRON HAND"
## Take it and RUN + New Features

---

## PART 1: FIXES (взял и запустил)

### Fix 1: WebContentsView Bounds
- tab-manager.ts: точный offset под chrome area (tabbar 40px + toolbar 48px = 88px)
- sidebar: width = 400px, уменьшать webview при sidebarOpen
- resize observer в renderer → IPC

### Fix 2: ReaderMode IPC
- tab-manager.ts: метод getPageHTML(tabId) → executeJavaScript('document.documentElement.outerHTML')
- IPC канал READER_GET_HTML
- ReaderMode.tsx: получать реальный HTML страницы

### Fix 3: package.json
- Добавить "node-forge": "^1.3.1"
- Добавить "@types/node-forge": "^1.3.11"
- Проверить все зависимости

### Fix 4: will-download
- main/index.ts: session.on('will-download') → отправлять в renderer
- Downloads tracking через IPC

### Fix 5: Start Page as default new tab
- tab-manager.ts: createTab() → URL по умолчанию 'cogitator://start'
- Обработка cogitator:// протокола

---

## PART 2: NEW FEATURES

### Feature 1: PDF Viewer (pdf.js)
- Встроенный просмотр PDF
- Открывать PDF во вкладке, не скачивать

### Feature 2: Voice Search (Web Speech API)
- Кнопка 🎤 в адресной строке
- SpeechRecognition API
- Результат → адресная строка

### Feature 3: Screen Recorder
- Запись экрана/вкладки
- MediaRecorder API

### Feature 4: Auto-translate Pages
- Автоопределение языка страницы
- Перевод через LibreTranslate

### Feature 5: Password Breach Check
- Have I Been Pwned API
- Проверка паролей на утечку

### Feature 6: Network Monitor
- DevTools-style network panel
- Время загрузки, размер, статус

### Feature 7: Dark Mode Schedule
- Автопереключение по времени

### Feature 8: Portable Mode
- Запуск с USB-флешки
- Все данные в папке приложения
