#!/usr/bin/env node

/**
 * Asset Conversion Script for MCP Diagnostics Extension
 * Converts SVG assets to PNG format for VS Code Marketplace
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Sharp is not installed. Please run: npm install sharp');
  console.error('   Or use alternative conversion methods in images/convert-assets.md');
  process.exit(1);
}

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const ICON_PNG_PATH = path.join(IMAGES_DIR, 'icon.png');
const BANNER_PNG_PATH = path.join(IMAGES_DIR, 'gallery-banner.png');

const BANNER_WIDTH = 1376;
const BANNER_HEIGHT = 80;

/**
 * Creates the text elements for the banner as an SVG buffer.
 * This allows for high-quality text rendering.
 */
function createTextSvg() {
  const title = 'MCP Diagnostics Server';
  const subtitle = 'Real-time VS Code diagnostics via Model Context Protocol';
  const features = [
    'Real-time Diagnostics',
    'MCP Tools',
    'Rich Configuration',
    'High Performance',
    'TDD Workflow',
    'Custom Assets'
  ];

  // Create feature text elements positioned horizontally
  let featureElements = '';
  features.forEach((feature, i) => {
    const x = 520 + (i * 120); // Space them out horizontally
    featureElements += `
      <rect x="${x-5}" y="20" width="${feature.length * 7 + 10}" height="20" fill="rgba(255,255,255,0.1)" rx="4"/>
      <text x="${x}" y="33" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="white" font-weight="500">${feature}</text>
    `;
  });

  const svg = `<svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <!-- Title -->
    <text x="100" y="30" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="white">${title}</text>

    <!-- Subtitle -->
    <text x="100" y="50" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#cccccc">${subtitle}</text>

    <!-- Features -->
    ${featureElements}
  </svg>`;

  return svg;
}


async function createBanner() {
  try {
    if (!fs.existsSync(ICON_PNG_PATH)) {
      console.error(`❌ Icon not found at ${ICON_PNG_PATH}`);
      console.error('   Please ensure your icon.png is in the /images directory.');
      return;
    }
    console.log('🖼️  Creating gallery banner...');

    // Create the complete banner SVG with background, text, and icon placeholder
    const completeBannerSvg = `<svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="#1e1e1e"/>

      <!-- Title -->
      <text x="100" y="35" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="white">MCP Diagnostics Server</text>

      <!-- Subtitle -->
      <text x="100" y="55" font-family="Segoe UI, Arial, sans-serif" font-size="14" fill="#cccccc">Real-time VS Code diagnostics via Model Context Protocol</text>

      <!-- Features -->
      <rect x="515" y="25" width="110" height="18" fill="rgba(255,255,255,0.1)" rx="4"/>
      <text x="520" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="white" font-weight="500">Real-time Diagnostics</text>

      <rect x="635" y="25" width="80" height="18" fill="rgba(255,255,255,0.1)" rx="4"/>
      <text x="640" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="white" font-weight="500">MCP Tools</text>

      <rect x="725" y="25" width="100" height="18" fill="rgba(255,255,255,0.1)" rx="4"/>
      <text x="730" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="white" font-weight="500">Rich Configuration</text>

      <rect x="835" y="25" width="110" height="18" fill="rgba(255,255,255,0.1)" rx="4"/>
      <text x="840" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="white" font-weight="500">High Performance</text>

      <rect x="955" y="25" width="90" height="18" fill="rgba(255,255,255,0.1)" rx="4"/>
      <text x="960" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="white" font-weight="500">TDD Workflow</text>

      <rect x="1055" y="25" width="100" height="18" fill="rgba(255,255,255,0.1)" rx="4"/>
      <text x="1060" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="11" fill="white" font-weight="500">Custom Assets</text>
    </svg>`;

    // Render the complete banner SVG to PNG
    const bannerBuffer = await sharp(Buffer.from(completeBannerSvg))
      .png()
      .toBuffer();

    // Resize the icon to fit
    const resizedIcon = await sharp(ICON_PNG_PATH)
        .resize({ height: 60 })
        .toBuffer();

    // Composite the icon onto the banner
    await sharp(bannerBuffer)
      .composite([
        { input: resizedIcon, top: 10, left: 20 }
      ])
      .toFile(BANNER_PNG_PATH);

    const stats = fs.statSync(BANNER_PNG_PATH);
    console.log(`✅ Banner created successfully: ${BANNER_PNG_PATH} (${(stats.size / 1024).toFixed(2)} KB)`);
  } catch (error) {
    console.error('❌ Error creating banner:', error);
  }
}

async function convertIcon() {
    const iconStaticSvgPath = path.join(IMAGES_DIR, 'icon-static.svg');
    if (!fs.existsSync(iconStaticSvgPath)) {
        console.warn(`⚠️  Static icon not found at ${iconStaticSvgPath}, skipping icon conversion.`);
        return;
    }
    try {
        console.log('📱 Converting extension icon...');
        await sharp(iconStaticSvgPath)
          .resize(128, 128)
          .toFile(ICON_PNG_PATH);

        const stats = fs.statSync(ICON_PNG_PATH);
        console.log(`✅ Icon converted successfully: ${ICON_PNG_PATH} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (error) {
        console.error('❌ Error converting icon:', error);
    }
}


async function convertAssets() {
  console.log('🎨 Converting assets...');
  await convertIcon();
  await createBanner();
  console.log('\\n✨ Asset generation complete.');
}

convertAssets();

module.exports = { convertAssets };
