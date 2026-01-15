import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const svgBuffer = readFileSync(join(projectRoot, 'public', 'logo.svg'));
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

console.log('Generating PWA icons...');

try {
  // Standard icons
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(join(projectRoot, 'public', `icon-${size}x${size}.png`));
    console.log(`✓ Generated icon-${size}x${size}.png`);
  }

  // Maskable icons (with 20% padding for safe zone)
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    const paddedSize = Math.round(size * 0.8);
    await sharp(svgBuffer)
      .resize(paddedSize, paddedSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .extend({
        top: Math.round((size - paddedSize) / 2),
        bottom: Math.round((size - paddedSize) / 2),
        left: Math.round((size - paddedSize) / 2),
        right: Math.round((size - paddedSize) / 2),
        background: { r: 59, g: 130, b: 246, alpha: 1 } // #3B82F6 theme color
      })
      .png()
      .toFile(join(projectRoot, 'public', `icon-${size}x${size}-maskable.png`));
    console.log(`✓ Generated icon-${size}x${size}-maskable.png`);
  }

  // Apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(projectRoot, 'public', 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');

  console.log('\n✅ All icons generated successfully!');
} catch (error) {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
}
