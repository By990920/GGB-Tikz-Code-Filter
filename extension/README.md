# GeoTikTrim - GeoGebra TikZ Code Filter Extension

One-click export and filter GeoGebra's verbose TikZ code directly in GeoGebra Classic, copied to clipboard instantly.

## Installation

1. Open the extensions page:
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

## Usage

1. Open [GeoGebra Classic](https://www.geogebra.org/classic)
2. A floating panel appears on the right side of the page
3. Check your filter options:
   - **Include points** — outputs `\draw[fill=black] (X) circle (1pt)`
   - **Include labels** — outputs `\node [above] at (X) {$X$}`
   - **Round coordinates** — rounds to 3 decimal places
4. Click "Copy TikZ"
5. "√ TikZ code copied" appears in the bottom-right corner
6. Paste into your `.tex` file

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

## File Structure

```
extension/
├── manifest.json    # Manifest V3 config
├── content.js       # Entry point: script injection + communication bridge
├── inject.js        # Page context: access ggbApplet
├── filter.js        # TikZ code filtering core logic
├── ui.js            # UI floating panel component
├── toast.js         # Toast notification component
├── style.css        # Glassmorphism + light/dark mode
└── icons/           # Extension icons
```

## Tech

- Manifest V3
- Vanilla JavaScript (no frameworks/build tools)
- chrome.storage.local for persistent settings
- postMessage for cross-context communication
