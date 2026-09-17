#!/usr/bin/env node
/**
 * Throwaway placeholder contact sheets, generated straight from scene.json so
 * the panel geometry is never duplicated between this script and the app —
 * `docs/plan/phase-2.md`'s REGION constant is gone for exactly that reason.
 *
 *   npm run placeholders && npm run slice
 *
 * One sheet per state-bearing slot (wealth, body, network, head, partner) per
 * variant combination it declares in scene.json — 12 sheets holding the 60
 * panels the artwork guide asks the user to draw. Nothing drives the two
 * accessory slots yet (phase 6), so this script does not generate sheets for
 * them.
 *
 * Box sheets (wealth, body, network) are flat, opaque panels labelled with
 * their slot, variant and state. Overlay sheets (head, partner) carry a real
 * alpha channel: a shape inset from the panel edge, transparent everywhere
 * else, so compositing onto the box behind it is visibly proven rather than
 * just claimed.
 *
 * These are deliberately ugly. They exist to prove the wiring — that step 3
 * of a panel puts the third drawing on screen, that overlays actually
 * composite, that the frame is the right shape. Overwrite the sheet with real
 * art and re-run `npm run slice`; nothing in the app changes.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AVATAR_DIR = join(ROOT, 'public', 'avatar');
const YOU_DIR = join(AVATAR_DIR, 'you');
const SCENE = JSON.parse(readFileSync(join(ROOT, 'src', 'content', 'scene.json'), 'utf8'));

const STATES = 5;
const GENDERS = ['male', 'female'];
const HAIRS = ['blond', 'dark'];
const AXIS_VALUES = { gender: GENDERS, hair: HAIRS };

/** Worst state to best, so the ramp is visible at a glance. */
const RAMP = ['#3A3F4A', '#4E5666', '#657085', '#8593A8', '#A8B8CE'];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Every combination of the slot's variant axes, in the order scene.json declares them. */
function combos(variants) {
  return variants.reduce(
    (acc, axis) => acc.flatMap((prefix) => AXIS_VALUES[axis].map((v) => [...prefix, v])),
    [[]],
  );
}

function boxPanel(x, w, h, label, tone) {
  return `
    <rect x="${x}" y="0" width="${w}" height="${h}" fill="${tone}" />
    <rect x="${x + 6}" y="6" width="${w - 12}" height="${h - 12}"
      fill="none" stroke="#0B0E14" stroke-width="3" />
    <text x="${x + w / 2}" y="${h * 0.1}" fill="#0B0E14" font-family="sans-serif"
      font-size="20" font-weight="700" text-anchor="middle">${label}</text>
  `;
}

/** A shape inset from the panel edge, so the canvas outside it stays transparent. */
function overlayPanel(x, w, h, label, tone) {
  const margin = 0.1;
  const sx = x + w * margin;
  const sy = h * margin;
  const sw = w * (1 - 2 * margin);
  const sh = h * (1 - 2 * margin);
  return `
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${sw * 0.12}"
      fill="${tone}" fill-opacity="0.85" stroke="#0B0E14" stroke-width="3" />
    <text x="${x + w / 2}" y="${sy + sh / 2}" fill="#0B0E14" font-family="sans-serif"
      font-size="18" font-weight="700" text-anchor="middle">${label}</text>
  `;
}

async function sheet(stem, kind, rect) {
  const w = rect.w;
  const h = rect.h;
  const panels = Array.from({ length: STATES }, (_, i) => {
    const label = escape(`${stem} ${i + 1}/${STATES}`);
    const tone = RAMP[i];
    return kind === 'box' ? boxPanel(i * w, w, h, label, tone) : overlayPanel(i * w, w, h, label, tone);
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * STATES}" height="${h}">${panels}</svg>`;

  const hasVariant = stem.includes('-');
  const dir = hasVariant ? YOU_DIR : AVATAR_DIR;
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${stem}.png`);
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`wrote ${file}`);
}

let count = 0;
for (const slot of SCENE.slots) {
  if (slot.panel === undefined) continue; // accessory slots — nothing drives them yet
  for (const combo of combos(slot.variants)) {
    const stem = [slot.slot, ...combo].join('-');
    await sheet(stem, slot.kind, slot.rect);
    count++;
  }
}
console.log(`\n${count} sheets, ${count * STATES} panels`);
