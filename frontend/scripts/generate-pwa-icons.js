/**
 * Generates PWA icon set from source SVG.
 * Output:
 * - public/icons/icon-192.png
 * - public/icons/icon-512.png
 * - public/icons/icon-192-maskable.png
 * - public/icons/icon-512-maskable.png
 * - public/icons/apple-touch-icon.png
 */
const path = require('path');
const fs = require('fs');

async function generatePwaIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Missing sharp. Run: npm install sharp --save-dev');
    process.exit(1);
  }

  const rootDir = path.join(__dirname, '..');
  const srcSvg = path.join(rootDir, 'src/assets/icon_sticker_purple_and_pink.svg');
  const outDir = path.join(rootDir, 'public/icons');

  if (!fs.existsSync(srcSvg)) {
    console.error('Source SVG not found:', srcSvg);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const writeNormalIcon = async (size) => {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(srcSvg)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outPath);
    console.log('Created:', outPath);
  };

  const writeMaskableIcon = async (size) => {
    const safeZone = 0.8;
    const insetSize = Math.round(size * safeZone);
    const offset = Math.round((size - insetSize) / 2);
    const outPath = path.join(outDir, `icon-${size}-maskable.png`);

    const inset = await sharp(srcSvg)
      .resize(insetSize, insetSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 93, g: 53, b: 135, alpha: 1 },
      },
    })
      .composite([{ input: inset, left: offset, top: offset }])
      .png()
      .toFile(outPath);

    console.log('Created:', outPath);
  };

  await writeNormalIcon(192);
  await writeNormalIcon(512);
  await writeMaskableIcon(192);
  await writeMaskableIcon(512);

  const appleTouchIconPath = path.join(outDir, 'apple-touch-icon.png');
  await sharp(srcSvg)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(appleTouchIconPath);
  console.log('Created:', appleTouchIconPath);

  console.log('Done. PWA icons are ready.');
}

generatePwaIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
