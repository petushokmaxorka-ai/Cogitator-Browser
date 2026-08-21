# COGITATOR BROWSER v3 — The Digital Ghost Plan
## "Leave No Trace in the Noosphere"

---

## Stage 1: Privacy Core (как Brave/LibreWolf)

### 1.1 Fingerprint Randomization
- **Canvas**: randomize pixel noise per session
- **WebGL**: spoof vendor/renderer strings  
- **AudioContext**: add subtle randomization
- **Fonts**: limit font enumeration
- **Screen**: spoof available screen metrics
- **Timezone**: override to UTC or random
- **Language**: configurable locale spoof
- **Color depth**: spoof to 24
- **Device memory**: spoof to 4GB or 8GB
- **Hardware concurrency**: spoof to 4 cores

### 1.2 Network Privacy
- **WebRTC**: disable non-proxied UDP (no IP leak)
- **DNS-over-HTTPS**: Quad9, Cloudflare, or custom
- **HTTPS-only mode**: block all HTTP
- **Proxy support**: SOCKS5, HTTP proxy per-tab
- **TLS fingerprint**: randomization via JA3

### 1.3 Content Blocking
- **AdBlocker engine**: uBlock-style static filtering
- **Filter lists**: EasyList, EasyPrivacy, uBlock filters, RU AdList
- **Cosmetic filtering**: hide ad placeholders
- **Script blocking**: per-site JS toggle
- **3rd party cookie blocking**: always
- **1st party isolation**: Firefox-style
- **Referrer policy**: strict-origin-when-cross-origin
- **Tracking parameter stripping**: fbclid, utm_*, etc.

### 1.4 Permission Hardening
- Geolocation: deny by default
- Camera/Mic: deny by default  
- Notifications: deny by default
- Clipboard: deny by default
- Push: deny by default
- Payment handler: deny by default
- USB: deny by default
- Serial: deny by default
- Bluetooth: deny by default
- MIDI: deny by default

### 1.5 Session Cleanup
- Auto-clear cookies on exit (optional)
- Auto-clear cache on exit (optional)
- Auto-clear history on exit (optional)
- Auto-clear downloads on exit (optional)
- Clear all data button
- Sandbox mode: no persistence

---

## Stage 2: Password Manager ("Cryptkeeper")

### 2.1 Encrypted Vault
- **AES-256-GCM** encryption with master password
- **PBKDF2** key derivation (100k iterations)
- Storage: encrypted JSON file (~/.cogitator/vault.enc)

### 2.2 Features
- Store login credentials (url, username, password, notes)
- Auto-fill login forms (detect username/password fields)
- Password generator (configurable length, symbols, etc.)
- Copy password to clipboard (auto-clear after 30s)
- Password strength indicator
- Duplicate password detection
- Breach check (via Have I Been Pwned API)
- Import/Export (CSV, JSON)

### 2.3 UI
- Vault panel in sidebar (lock icon)
- Unlock with master password on access
- List of saved passwords with search
- Add/Edit/Delete entries
- Browser action: auto-fill detected forms

---

## Stage 3: Payment Cards ("Payment Sigil")

### 3.1 Encrypted Storage
- Same AES-256-GCM vault as passwords
- Card number, holder, expiry, CVV

### 3.2 Features
- Masked display (**** **** **** 1234)
- Auto-fill card forms
- Card type detection (Visa/MC/Amex)
- Copy individual fields
- Expiry warnings

---

## Stage 4: AdBlocker Engine

### 4.1 Static Filter Engine
- Parse EasyList, EasyPrivacy filter syntax
- Match URLs against filter rules
- Block via webRequest API or declarativeNetRequest

### 4.2 Filter Lists (pre-configured)
- EasyList (ads)
- EasyPrivacy (trackers)
- uBlock filters (malware, annoyances)
- RU AdList (RU-specific)
- Cogitator blocklist (custom)

### 4.3 Cosmetic Filtering
- Hide ad placeholders with CSS
- Inject cosmetic filters into pages

### 4.4 Privacy Badger-style Heuristic
- Detect and block third-party trackers
- Learn from user browsing

---

## Stage 5: Additional Features

### 5.1 Reader Mode
- Strip clutter from articles
- Dark Mechanicus styled reading view
- Activation button in address bar

### 5.2 Translation
- LibreTranslate integration (local via Docker)
- Right-click translate selection
- Auto-translate foreign pages

### 5.3 Session Management
- Save/restore sessions
- Startup: restore tabs / new tab / specific pages
- Crash recovery

### 5.4 Advanced
- Custom user scripts (Greasemonkey-style)
- Custom user CSS per-site
- Request modifier headers
- Per-site settings UI
