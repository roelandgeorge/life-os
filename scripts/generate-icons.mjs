#!/usr/bin/env node
/**
 * §9 step 8 — PWA icons. One SVG source, rasterised to every size the
 * manifest needs. Re-run after touching the mark:
 *
 *   npm run icons
 *
 * The mark echoes the app itself: a figure, cropped close, on the same dark
 * ground and bronze accent as the real portrait — read from
 * src/styles/tokens.css rather than a second literal here.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'icons');

const TOKENS_CSS = readFileSync(join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
function token(name) {
  const match = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(TOKENS_CSS);
  if (!match) throw new Error(`tokens.css has no ${name}`);
  return match[1].trim();
}

const BG = token('--ground');
const FIGURE = token('--bronze');

/** The figure, sized for a 512x512 canvas. Head + shoulders, nothing else — legible at 16px. */
function figureSvg({ size, padding }) {
  const s = size - padding * 2;
  const scale = s / 512;
  return `
    <g transform="translate(${padding} ${padding}) scale(${scale})">
      <circle cx="256" cy="190" r="92" fill="${FIGURE}" />
      <path d="M 96 512 C 96 360 165 292 256 292 C 347 292 416 360 416 512 Z" fill="${FIGURE}" />
    </g>
  `;
}

/** Standard icon: full-bleed background, generous padding so it reads at any size. */
function standardSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}" />
    ${figureSvg({ size, padding: size * 0.08 })}
  </svg>`;
}

/** Maskable icon: content kept inside the ~80% safe zone the OS mask won't clip. */
function maskableSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}" />
    ${figureSvg({ size, padding: size * 0.18 })}
  </svg>`;
}

async function render(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`wrote ${file}`);
}

mkdirSync(OUT_DIR, { recursive: true });
await render(standardSvg(192), join(OUT_DIR, 'icon-192.png'));
await render(standardSvg(512), join(OUT_DIR, 'icon-512.png'));
await render(maskableSvg(512), join(OUT_DIR, 'icon-512-maskable.png'));
