# Asset Conversion Guide

This guide explains how to convert the SVG assets to the required PNG formats for the VS Code Marketplace.

## Required Assets

### 1. Extension Icon (128x128 PNG)
- **Source**: `icon-static.svg`
- **Target**: `icon.png`
- **Size**: 128x128 pixels
- **Format**: PNG with transparency

### 2. Gallery Banner (1376x80 PNG)
- **Source**: `gallery-banner.svg`
- **Target**: `gallery-banner.png`
- **Size**: 1376x80 pixels
- **Format**: PNG

## Conversion Methods

### Method 1: Using Inkscape (Recommended)
```bash
# Install Inkscape (if not already installed)
# Windows: Download from https://inkscape.org/
# macOS: brew install inkscape
# Linux: sudo apt-get install inkscape

# Convert icon
inkscape icon-static.svg --export-png=icon.png --export-width=128 --export-height=128

# Convert gallery banner
inkscape gallery-banner.svg --export-png=gallery-banner.png --export-width=1376 --export-height=80
```

### Method 2: Using ImageMagick
```bash
# Install ImageMagick (if not already installed)
# Windows: Download from https://imagemagick.org/
# macOS: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Convert icon
magick convert icon-static.svg -resize 128x128 icon.png

# Convert gallery banner
magick convert gallery-banner.svg -resize 1376x80 gallery-banner.png
```

### Method 3: Using Node.js (sharp)
```bash
# Install sharp
npm install sharp

# Create conversion script
node -e "
const sharp = require('sharp');
const fs = require('fs');

// Convert icon
const iconSvg = fs.readFileSync('icon-static.svg');
sharp(iconSvg)
  .resize(128, 128)
  .png()
  .toFile('icon.png');

// Convert banner
const bannerSvg = fs.readFileSync('gallery-banner.svg');
sharp(bannerSvg)
  .resize(1376, 80)
  .png()
  .toFile('gallery-banner.png');
"
```

### Method 4: Online Conversion
1. Go to https://convertio.co/svg-png/
2. Upload `icon-static.svg`
3. Set dimensions to 128x128
4. Download as `icon.png`
5. Repeat for `gallery-banner.svg` with dimensions 1376x80

## Verification

After conversion, verify the assets:

1. **Icon**: Should be exactly 128x128 pixels, PNG format with transparency
2. **Banner**: Should be exactly 1376x80 pixels, PNG format
3. **Quality**: Check that all visual elements are crisp and colors are correct
4. **File Size**: Icon should be under 50KB, banner under 100KB

## Package.json Updates

After creating the PNG assets, ensure `package.json` references them correctly:

```json
{
  "icon": "images/icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  }
}
```

## Asset Optimization

For optimal marketplace performance:

1. **Compress PNGs**: Use tools like TinyPNG or ImageOptim
2. **Verify transparency**: Ensure icon background is transparent
3. **Test on different backgrounds**: Verify icon looks good on light/dark themes
4. **Check marketplace preview**: Use VS Code's package preview to verify appearance

## Troubleshooting

### Common Issues:
- **Blurry icons**: Ensure exact 128x128 pixel dimensions
- **Wrong colors**: Verify SVG renders correctly before conversion
- **Large file sizes**: Use PNG compression tools
- **Missing transparency**: Check SVG background is transparent

### Quality Checklist:
- [ ] Icon is exactly 128x128 pixels
- [ ] Banner is exactly 1376x80 pixels
- [ ] Colors match VS Code dark theme
- [ ] All text is readable
- [ ] Network connections are visible
- [ ] Warning triangle is prominent
- [ ] File sizes are optimized
