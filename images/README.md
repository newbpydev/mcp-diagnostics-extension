# Extension Assets

## Icon Requirements

The extension requires a 128x128 PNG icon for the VS Code Marketplace.

### Current Assets
- `icon.svg` - Source SVG icon design
- `icon.png` - Required 128x128 PNG version (to be generated)

### Converting SVG to PNG

To generate the required PNG icon from the SVG source:

```bash
# Using ImageMagick (if available)
magick convert icon.svg -resize 128x128 icon.png

# Using Inkscape (if available)
inkscape icon.svg --export-png=icon.png --export-width=128 --export-height=128

# Online tools alternative:
# 1. Upload icon.svg to https://convertio.co/svg-png/
# 2. Set dimensions to 128x128
# 3. Download as icon.png
```

### Design Elements
- **Background**: Dark theme (#1e1e1e) with VS Code blue accent (#007acc)
- **MCP Symbol**: Interconnected nodes representing protocol connectivity
- **Diagnostic Symbol**: Warning triangle with error indicator
- **Data Flow**: Green arrows indicating real-time data flow

### Gallery Banner
- **Size**: 1376x80 pixels
- **Theme**: Dark (#1e1e1e background)
- **Content**: Extension name with subtle diagnostic/MCP imagery
