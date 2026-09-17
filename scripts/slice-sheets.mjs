#!/usr/bin/env node
/**
 * Slices contact sheets into their individual states.
 *
 *   npm run slice
 *
 * Any file in public/avatar/ or public/avatar/you/ whose basename does not
 * end in a digit is a sheet — five states side by side, worst on the left,
 * best on the right — and gets cut into <stem>1.png … <stem>5.png next to it,
 * alpha channel preserved. Already have the five states as separate files?
 * Then you don't need this — just name them that way and drop them in.
 *
 * Generating five states in one image keeps them far more consistent than
 * five separate prompts — the model draws them as a set rather than as five
 * unrelated pictures. Slicing is the price of that, and it is cheap.
 *
 * Aspect-agnostic on purpose: whatever the generator hands back, the panel
 * width is simply the sheet width divided by five.
 */

import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import sharp from 'sharp';

const AVATAR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'avatar');
const YOU_DIR = join(AVATAR_DIR, 'you');
const STATES = 5;

function sheetsIn(dir) {
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }
  return files.filter((f) => f.endsWith('.png') && !/\d\.png$/.test(f)).map((f) => join(dir, f));
}

let sliced = 0;

for (const sheetPath of [...sheetsIn(AVATAR_DIR), ...sheetsIn(YOU_DIR)]) {
  const dir = dirname(sheetPath);
  const stem = basename(sheetPath, '.png');

  const { width, height } = await sharp(sheetPath).metadata();
  if (!width || !height) throw new Error(`${stem}.png has no readable dimensions`);

  const panelWidth = Math.floor(width / STATES);
  if (panelWidth < 1) throw new Error(`${stem}.png is too narrow to hold ${STATES} states`);
  if (width % STATES !== 0) {
    // Not fatal — a stray column or two is normal from a generator — but the
    // panels will drift rightward if it is large, so say so.
    console.warn(`${stem}.png: width ${width} is not divisible by ${STATES}, cropping ${width % STATES}px`);
  }

  for (let i = 0; i < STATES; i++) {
    const out = join(dir, `${stem}${i + 1}.png`);
    await sharp(sheetPath)
      .extract({ left: i * panelWidth, top: 0, width: panelWidth, height })
      .png()
      .toFile(out);
    sliced++;
  }
  console.log(`${stem}: ${STATES} states at ${panelWidth}x${height}`);
}

console.log(sliced ? `\nwrote ${sliced} images` : '\nnothing to slice');
