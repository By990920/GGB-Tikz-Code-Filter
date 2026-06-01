# GeoTikTrim — GeoGebra TikZ Code Filter

Live at: https://geotiktrim.site/

## Recommended: Browser Extension

One-click export and filter GeoGebra's verbose TikZ code directly in GeoGebra Classic.

**NEW**: Paste a screenshot of any geometric figure — AI auto-recognizes it and builds it in GeoGebra. Fine-tune, then export as TikZ.

### Installation

1. Open the extensions page:
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder from this repository

### Usage

#### TikZ Export

1. Open [GeoGebra Classic](https://www.geogebra.org/classic)
2. A floating panel appears on the right side
3. Click the gear icon, check filter options, then click "Copy TikZ"
4. Paste into your `.tex` file

#### Screenshot Recognition

1. Edit `extension/config.json` — set `apiKey`, `model`, and `endpoint` for your AI provider
2. **Reload the extension** (extensions page → refresh icon) and **refresh the GeoGebra page**
3. Paste a geometry screenshot (Ctrl+V), drag it, or click the drop zone
4. AI analyzes the figure and injects GeoGebra commands into the canvas
5. Fine-tune the figure in GeoGebra
6. Click "Copy TikZ" to export

See [`extension/README.md`](extension/README.md) for details.

---

## Alternative: Web App

Open `GGB-Tikz-Code-Filter.html` directly in your browser or visit https://geotiktrim.site/, then manually paste GeoGebra-exported TikZ code to filter it.

---

## Features

- **Points**: coordinate definitions, markers, smart label positioning
- **Lines**: segments (deduplicated), line style conversion (solid, dashed, dotted, dash-dot)
- **Curves**: circles, ellipses (with rotation), arcs, sectors, Bezier curves
- **Functions**: function plots, quadratic functions, parametric equations
- **Markers**: angle marks and labels, text labels
- **Screenshot to GGB**: paste a geometry screenshot → AI builds it in GeoGebra (new)

---

## Screenshot

![Screenshot](Screenshot.png)

---

## Project Structure

```
ggb-tikz-code-filter/
├── GGB-Tikz-Code-Filter.html   # Web app
├── Netlify-index/
│   └── index.html              # Web app (release)
├── extension/                  # Browser extension
│   ├── manifest.json           # Chrome extension manifest
│   ├── background.js           # Service Worker (AI API proxy)
│   ├── content.js              # Entry point: injection + image paste + AI flow
│   ├── inject.js               # Page context: ggbApplet API + command injection
│   ├── filter.js               # Core TikZ filtering logic
│   ├── prompt.js               # AI vision model prompt
│   ├── ui.js                   # Floating panel + drop zone + settings
│   ├── toast.js                # Toast notifications
│   ├── config.json             # AI config (model, endpoint, apiKey)
│   ├── style.css               # Glassmorphism + light/dark mode
│   └── icons/                  # Extension icons
├── test/                       # Test LaTeX documents
├── AI-Prompt.md                # AI maintenance guide
├── README.md
├── README.zh-CN.md
└── LICENSE
```

---

## Technical Details

- 100% client-side, no backend required
- Browser extension: Manifest V3, vanilla JavaScript
- AI API calls proxied through Service Worker (bypasses CORS)
- `config.json` for cross-platform AI provider configuration
- Vision model prompt with 40+ precise GeoGebra command references from official docs
- Web app: Plain HTML + CSS + JavaScript

---

## Contributing

Issues and Pull Requests are welcome!

## License

GNU General Public License v2.0 — see the `LICENSE` file for details.
