import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve('.');
const svgPath = path.join(root, 'public', 'favicon.svg');
const out192 = path.join(root, 'public', 'icon-192.png');
const out512 = path.join(root, 'public', 'icon-512.png');
const outApple = path.join(root, 'public', 'apple-touch-icon.png');

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error(`SVG favicon not found at ${svgPath}.`);
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath);

  // Increase density so the rasterization is sharp
  const density = 256;

  // Transparent background by default; can be changed later based on user preference
  const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };

  // 192x192
  await sharp(svg, { density })
    .resize(192, 192, { fit: 'contain', background: transparentBg })
    .png({ compressionLevel: 9 })
    .toFile(out192);
  console.log(`Generated: ${out192}`);

  // 512x512
  await sharp(svg, { density })
    .resize(512, 512, { fit: 'contain', background: transparentBg })
    .png({ compressionLevel: 9 })
    .toFile(out512);
  console.log(`Generated: ${out512}`);

  // Apple touch icon 180x180 (recommended)
  await sharp(svg, { density })
    .resize(180, 180, { fit: 'contain', background: transparentBg })
    .png({ compressionLevel: 9 })
    .toFile(outApple);
  console.log(`Generated: ${outApple}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});