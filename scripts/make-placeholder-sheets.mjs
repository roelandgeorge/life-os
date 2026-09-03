#!/usr/bin/env node
/**
 * Throwaway placeholder contact sheets, so the layer pipeline runs before any
 * real artwork exists.
 *
 *   npm run placeholders && npm run slice
 *
 * These are deliberately ugly: flat blocks with the layer name and state
 * number on them. They exist to prove the wiring — that step 3 of SLEEP puts
 * the third head on screen, that the layers stack in the right order, that
 * the frame is the right shape. Overwrite public/avatar/<layer>.png with the
 * real sheet and re-run `npm run slice`; nothing in the app changes.
 */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const AVATAR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'avatar');

/** One panel. The app frame is portrait; keep the same ratio as the old viewBox. */
const PANEL_W = 640;
const PANEL_H = 832;
const STATES = 5;

/** Worst state to best, so the ramp is visible at a glance. */
const RAMP = ['#3A3F4A', '#4E5666', '#657085', '#8593A8', '#A8B8CE'];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Where each layer sits inside the shared frame, as fractions of it. The real
 * artwork decides this for itself — every sheet is drawn against the same crop
 * — but the placeholders have to occupy different regions or they simply cover
 * each other and the stacking order proves nothing.
 */
const REGION = {
  achtergrond: null, // fills the frame
  lief: { x: 0.55, y: 0.30, w: 0.34, h: 0.60 },
  user: { x: 0.12, y: 0.16, w: 0.40, h: 0.74 },
};

function panel(layer, i) {
  const x = i * PANEL_W;
  const tone = RAMP[i];
  const label = `${escape(layer)} ${i + 1}/${STATES}`;
  const region = REGION[layer];

  if (!region) {
    return `
      <rect x="${x}" y="0" width="${PANEL_W}" height="${PANEL_H}" fill="${tone}" />
      <rect x="${x + 8}" y="8" width="${PANEL_W - 16}" height="${PANEL_H - 16}"
        fill="none" stroke="#0B0E14" stroke-width="3" />
      <text x="${x + PANEL_W / 2}" y="${PANEL_H * 0.12}" fill="#0B0E14" font-family="sans-serif"
        font-size="30" font-weight="700" text-anchor="middle">${label}</text>
    `;
  }

  const rx = x + region.x * PANEL_W;
  const ry = region.y * PANEL_H;
  const rw = region.w * PANEL_W;
  const rh = region.h * PANEL_H;

  return `
    <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="${rw * 0.14}"
      fill="${tone}" stroke="#0B0E14" stroke-width="4" />
    <text x="${rx + rw / 2}" y="${ry + rh / 2}" fill="#0B0E14" font-family="sans-serif"
      font-size="24" font-weight="700" text-anchor="middle">${label}</text>
  `;
}

async function sheet(layer) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_W * STATES}" height="${PANEL_H}">
    ${Array.from({ length: STATES }, (_, i) => panel(layer, i)).join('')}
  </svg>`;

  const file = join(AVATAR_DIR, `${layer}.png`); // a sheet, sliced by `npm run slice`
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`wrote ${file}`);
}

mkdirSync(AVATAR_DIR, { recursive: true });
for (const layer of Object.keys(REGION)) await sheet(layer);
