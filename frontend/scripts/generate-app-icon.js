/**
 * Generates app icon and favicon from icon_sticker_purple_and_pink.svg
 * Output: 1024x1024 PNG for Android/iOS, same for web favicon
 * Run: node scripts/generate-app-icon.js
 */
const path = require('path');
const fs = require('fs');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Missing sharp. Run: npm install sharp --save-dev');
    process.exit(1);
  }

  const rootDir = path.join(__dirname, '..');
  const srcSvg = path.join(rootDir, 'src/assets/icon_sticker_purple_and_pink.svg');
  const assetsDir = path.join(rootDir, 'assets');
  const imagesDir = path.join(assetsDir, 'images');

  if (!fs.existsSync(srcSvg)) {
    console.error('Source SVG not found:', srcSvg);
    process.exit(1);
  }

  fs.mkdirSync(imagesDir, { recursive: true });

  const SIZE = 1024;
  const SAFE_ZONE = 0.66; // Android adaptive icon safe zone ~66%

  // 1024x1024 PNG for Android/iOS - fit icon in square with transparent background
  const iconPath = path.join(imagesDir, 'icon.png');
  await sharp(srcSvg)
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(iconPath);
  console.log('Created:', iconPath);

  // Adaptive icon - scale to 66% so full logo fits in Android safe zone (avoids zoom/crop)
  const adaptiveSize = Math.round(SIZE * SAFE_ZONE);
  const adaptivePath = path.join(imagesDir, 'adaptive-icon.png');
  const resized = await sharp(srcSvg)
    .resize(adaptiveSize, adaptiveSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const offset = Math.round((SIZE - adaptiveSize) / 2);
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: offset, top: offset }])
    .png()
    .toFile(adaptivePath);
  console.log('Created:', adaptivePath);

  // Favicon 48x48 for web (Expo scales from this)
  const faviconPath = path.join(imagesDir, 'favicon.png');
  await sharp(srcSvg)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(faviconPath);
  console.log('Created:', faviconPath);

  console.log('Done. Icons ready for app.json.');
}

generateIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
