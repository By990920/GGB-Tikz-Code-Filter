# GeoTikTrim - GeoGebra TikZ Code Filter Extension

One-click export and filter GeoGebra's verbose TikZ code directly in GeoGebra Classic, copied to clipboard instantly.

**New**: Paste a screenshot of a geometric figure, AI auto-recognizes and builds it in GeoGebra for you to fine-tune, then export as TikZ.

## Installation

1. Open the extensions page:
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

## Usage

### TikZ Export

1. Open [GeoGebra Classic](https://www.geogebra.org/classic)
2. A floating panel appears on the right side
3. Click the gear icon to open settings, check filter options
4. Click "Copy TikZ"
5. Paste into your `.tex` file

### Screenshot Recognition

1. Edit `config.json` — set your `apiKey`, `model`, and `endpoint`
2. **Reload the extension** (extensions page → refresh icon) and **refresh the GeoGebra page**
3. Paste a screenshot (Ctrl+V), drag it to the drop zone, or click to upload
4. The AI analyzes the figure and injects GeoGebra commands into the canvas
5. Fine-tune the figure in GeoGebra
6. Click "Copy TikZ" to export

### config.json

```json
{
  "model": "qwen3.6-plus",
  "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  "apiKey": "",
  "enable_thinking": false
}
```

- `model`, `endpoint`, `apiKey` are reserved fields
- Any other fields (e.g. `enable_thinking`, `top_p`) are merged directly into the API request body
- Works with any OpenAI-compatible chat/completions API

### Filter Options

- **Include points** — outputs `\draw[fill=black] (X) circle (1pt)`
- **Include labels** — outputs `\node [above] at (X) {$X$}`

## Features

- Auto-extract tikzpicture environment
- Coordinate definitions + labels
- Line segments (dedup + line style conversion)
- Circles, ellipses, arcs, sectors
- Angle marks and labels
- Function plots (with scope clipping)
- Bezier curves (parametric equations)
- Smart label positioning
- Text label preservation
- **Screenshot → AI recognition → GeoGebra commands**

## File Structure

```
extension/
├── manifest.json       # Manifest V3 config
├── background.js       # Service worker (AI API proxy)
├── content.js          # Entry: injection + paste handling + AI flow
├── inject.js           # Page context: ggbApplet API + command injection
├── filter.js           # TikZ code filtering core logic
├── prompt.js           # Vision model prompt template
├── ui.js               # Floating panel + drop zone + settings
├── toast.js            # Toast notification component
├── config.json         # AI config (model, endpoint, apiKey)
├── style.css           # Glassmorphism + light/dark mode
└── icons/              # Extension icons
```

## Tech

- Manifest V3
- Vanilla JavaScript (no frameworks/build tools)
- Service Worker as AI API fetch proxy (bypasses CORS)
- `config.json` for cross-platform AI configuration
- `chrome.storage.local` for persistent filter settings
- `postMessage` for cross-context communication
