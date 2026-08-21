# Cogitator Theme for SearXNG

> **Blessed by the Omnissiah. Sanctified for the Noosphere.**

A Dark Mechanicus-inspired theme for [SearXNG](https://github.com/searxng/searxng), the open-source meta-search engine. Designed for the COGITATOR BROWSER project.

## Aesthetic

The theme draws from the **Adeptus Mechanicus** visual language of Warhammer 40K:

- **Void Black** (#000000) - The sacred nothingness of unlit forge-vaults
- **Iron Dark** (#1E1E1E) - The chassis of ancient cogitators
- **Omnissiah Red** (#FF0000) - The sacred rage of the Machine God
- **Cogitator Gold** (#C8A84B) - The glow of blessed knowledge
- **Noosphere Cyan** (#00BFBF) - The ethereal data streams
- **Parchment** (#D4C5A0) - The color of sacred scrolls

## Features

- **Complete SearXNG style override** - Every UI element restyled
- **CRT scanline effect** - Subtle retro monitor overlay
- **Monospace typography** - 'Courier New' throughout for terminal aesthetic
- **Red glow accents** - Interactive elements glow with sacred machine light
- **Scrollbar customization** - Iron-gray mechanicus-style scrollbars
- **Responsive design** - Works on mobile forge-terminals
- **500+ CSS rules** - Comprehensive coverage of all SearXNG components

## Installation

### Method 1: Docker (Recommended)

The theme is automatically mounted via docker-compose:

```yaml
volumes:
  - ../noosphere-search/themes/cogitator:/usr/local/searxng/searx/static/themes/cogitator:ro
```

### Method 2: Manual

1. Copy the `cogitator.css` file to your SearXNG themes directory:
   ```bash
   cp cogitator.css /usr/local/searxng/searx/static/themes/cogitator/
   ```

2. Set the theme in your SearXNG settings:
   ```yaml
   ui:
     default_theme: cogitator
   ```

3. Restart SearXNG

## File Structure

```
themes/cogitator/
├── cogitator.css   - Main theme stylesheet
└── README.md       - This file
```

## CSS Architecture

The stylesheet is organized into sections:

1. **Root Variables** - Color palette and glow definitions
2. **Body & Layout** - Global resets and CRT effect
3. **Search Header** - Header with custom NOOSPHERE branding
4. **Search Input** - Styled query field with red glow on focus
5. **Search Button** - Gradient button with uppercase mechanicus text
6. **Search Results** - Iron-dark cards with gold titles and cyan hover
7. **Category Tabs** - Active tabs glow with Omnissiah Red
8. **Pagination** - Styled page navigation
9. **Sidebar/Infoboxes** - Knowledge panels
10. **Image/Video/News Results** - Specialized result types
11. **Forms & Inputs** - Universal form styling
12. **Tables** - Data grid styling
13. **Code Blocks** - Cyan-highlighted code
14. **Messages** - Error/warning/info alerts
15. **Scrollbars** - Custom mechanicus scrollbars
16. **Autocomplete** - Dropdown suggestions

## Customization

Edit the `:root` CSS variables in `cogitator.css` to adjust colors:

```css
:root {
  --omnissiah-red: #FF0000;     /* Change accent color */
  --cogitator-gold: #C8A84B;    /* Change title color */
  --noosphere-cyan: #00BFBF;    /* Change hover color */
}
```

## License

Part of the COGITATOR BROWSER project. Sanctified for use by servants of the Omnissiah.

---

*"There is no truth in flesh, only betrayal."* - Credo Omnissiah
