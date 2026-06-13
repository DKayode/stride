/**
 * Stride PWA icon generator.
 *
 * Rasterizes the brand mark to the PNG icon set required by the web app
 * manifest and Play Store Asset Links validation:
 *   - icon-192.png            (192x192, purpose "any")
 *   - icon-512.png            (512x512, purpose "any")
 *   - icon-192-maskable.png   (192x192, purpose "maskable", full-bleed safe zone)
 *   - icon-512-maskable.png   (512x512, purpose "maskable", full-bleed safe zone)
 *   - apple-touch-icon.png    (180x180, iOS home-screen)
 *
 * Run: `pnpm icons`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/icons');

const INK = '#0f172a';
const BRAND = '#6366f1';
const ACCENT = '#22d3ee';

/**
 * Build an SVG string for the Stride mark.
 * @param {number} size      canvas size in px
 * @param {boolean} maskable when true, the artwork is shrunk into the inner
 *                           ~64% safe zone and the background bleeds to the
 *                           full canvas so platform masks never clip content.
 */
function markSvg(size, maskable) {
  const radius = maskable ? 0 : Math.round(size * 0.22);
  // Logical 100x100 artwork drawn centred; maskable variant insets it.
  const inset = maskable ? 18 : 6;
  const scale = (100 - inset * 2) / 100;
  const stroke = 11 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK}"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#bg)"/>
  <g transform="translate(${size / 2} ${size / 2}) scale(${(size / 100) * scale}) translate(-50 -50)">
    <path d="M18 64 L40 30 L54 50 L78 18"
      fill="none" stroke="${BRAND}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="78" cy="18" r="${stroke * 0.85}" fill="${ACCENT}"/>
  </g>
</svg>`;
}

/** @type {{ name: string; size: number; maskable: boolean }[]} */
const TARGETS = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const { name, size, maskable } of TARGETS) {
    const svg = markSvg(size, maskable);
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(resolve(OUT_DIR, name), png);
    console.log(`✓ ${name} (${size}x${size}${maskable ? ', maskable' : ''})`);
  }
  // Keep the source SVG favicon in sync with the brand mark.
  await writeFile(resolve(OUT_DIR, 'favicon.svg'), markSvg(32, false));
  console.log(`✓ favicon.svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
