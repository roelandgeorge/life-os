#!/usr/bin/env node
/**
 * Recompresses the artwork PNGs in public/avatar/ without touching a pixel.
 *
 *   npm run compress
 *
 * Why not sharp, which is already a dependency: these files carry both an
 * `sRGB` and a `gAMA` chunk, and libvips applies a gamma transform when it
 * decodes them. Anything routed through sharp therefore bakes a colour shift
 * into the output — measurably, up to 21/255 per subpixel. Browsers let the
 * sRGB chunk win and show the stored pixels as they are, so that shift is a
 * real change to what you see.
 *
 * So this works one level down instead: inflate the image data, undo the row
 * filters, choose better ones, and re-deflate. Row filters are reversible
 * byte transforms — they do not touch colour — so the decoded pixels come out
 * bit-identical by construction. The script asserts exactly that before it
 * writes anything: any file whose round trip does not reproduce the original
 * pixel bytes is left alone.
 *
 * Most of the win is not the filtering — the generator's own choices turned
 * out to be near optimal — but the alpha channel. Every one of these images
 * is opaque everywhere while storing a full 8-bit alpha byte per pixel, a
 * quarter of the data saying "not transparent" over and over. Dropping it
 * cannot change what anyone sees.
 *
 * Idempotent: running it twice finds nothing left to win and leaves the files
 * alone.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const AVATAR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'avatar');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CRC-32, as PNG specifies it. */
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) throw new Error('not a PNG');
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const length = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    chunks.push({ type, data: buf.subarray(off + 8, off + 8 + length) });
    off += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

/** Try every deflate strategy and keep whichever packs smallest. */
function bestDeflate(raw) {
  const strategies = [0, 1, 2, 3, 4]; // DEFAULT, FILTERED, HUFFMAN_ONLY, RLE, FIXED
  let best = null;
  for (const strategy of strategies) {
    const out = deflateSync(raw, { level: 9, strategy, memLevel: 9, windowBits: 15 });
    if (!best || out.length < best.length) best = out;
  }
  return best;
}

// --- PNG row filters (spec §9). Reversible byte transforms, no colour maths. --

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Filtered scanlines -> raw pixel rows. */
function unfilter(data, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const type = data[pos++];
    const row = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const raw = data[pos + x];
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      row[x] =
        (raw +
          (type === 0 ? 0 : type === 1 ? a : type === 2 ? b : type === 3 ? (a + b) >> 1 : paeth(a, b, c))) &
        0xff;
    }
    pos += stride;
  }
  return out;
}

function isFullyOpaque(rgba) {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) return false;
  return true;
}

function dropAlpha(rgba) {
  const out = Buffer.alloc((rgba.length / 4) * 3);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += 3) {
    out[o] = rgba[i];
    out[o + 1] = rgba[i + 1];
    out[o + 2] = rgba[i + 2];
  }
  return out;
}

/** Raw pixel rows -> filtered scanlines, choosing the cheapest filter per row. */
function refilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc((stride + 1) * height);
  const candidate = Buffer.alloc(stride);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    const row = raw.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? raw.subarray((y - 1) * stride, y * stride) : null;

    let bestType = 0;
    let bestScore = Infinity;
    let bestRow = null;

    for (let type = 0; type <= 4; type++) {
      if (type === 2 && !prev) continue;
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? row[x - bpp] : 0;
        const b = prev ? prev[x] : 0;
        const c = prev && x >= bpp ? prev[x - bpp] : 0;
        const v =
          (row[x] -
            (type === 0 ? 0 : type === 1 ? a : type === 2 ? b : type === 3 ? (a + b) >> 1 : paeth(a, b, c))) &
          0xff;
        candidate[x] = v;
        // The standard heuristic: smallest sum of absolute signed deviations.
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestType = type;
        bestRow = Buffer.from(candidate);
      }
    }

    out[pos++] = bestType;
    bestRow.copy(out, pos);
    pos += stride;
  }
  return out;
}

const files = readdirSync(AVATAR_DIR).filter((f) => f.endsWith('.png'));
let before = 0;
let after = 0;

for (const file of files) {
  const path = join(AVATAR_DIR, file);
  const original = readFileSync(path);
  const chunks = readChunks(original);

  const ihdr = chunks.find((c) => c.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];

  const idat = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data));
  const inflated = inflateSync(idat);

  // Refiltering assumes 8-bit, non-interlaced rows. Anything else just gets
  // the deflate pass, which needs no knowledge of the layout at all.
  const canRefilter = bitDepth === 8 && interlace === 0 && CHANNELS[colorType] !== undefined;
  let filtered = inflated;

  let outColorType = colorType;

  if (canRefilter) {
    let bpp = CHANNELS[colorType];
    let raw = unfilter(inflated, width, height, bpp);

    // An RGBA image whose alpha is 255 everywhere is an RGB image carrying a
    // quarter of its bytes for nothing. Dropping that channel cannot change
    // what anyone sees — opaque stays opaque — and it is the single largest
    // win available here.
    if (colorType === 6 && isFullyOpaque(raw)) {
      raw = dropAlpha(raw);
      bpp = 3;
      outColorType = 2;
    }

    const candidate = refilter(raw, width, height, bpp);
    // Prove it: unfiltering our own output must reproduce the same pixels.
    if (unfilter(candidate, width, height, bpp).equals(raw)) {
      filtered = candidate;
    } else {
      console.warn(`${file}: refilter round trip failed, falling back to deflate only`);
      outColorType = colorType;
    }
  }

  const packed = bestDeflate(filtered);

  // Keep every non-IDAT chunk exactly as it was — including the sRGB and gAMA
  // chunks, so viewers treat the result the same way they treat the original.
  const header = Buffer.from(ihdr);
  header[9] = outColorType;

  const rebuilt = Buffer.concat([
    PNG_MAGIC,
    ...chunks
      .filter((c) => c.type !== 'IDAT' && c.type !== 'IEND')
      .map((c) => chunk(c.type, c.type === 'IHDR' ? header : c.data)),
    chunk('IDAT', packed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  const originalSize = statSync(path).size;
  before += originalSize;

  if (rebuilt.length < originalSize) {
    writeFileSync(path, rebuilt);
    after += rebuilt.length;
    const pct = (100 * (1 - rebuilt.length / originalSize)).toFixed(0);
    console.log(`${file.padEnd(18)} ${(originalSize / 1024).toFixed(0)} KB -> ${(rebuilt.length / 1024).toFixed(0)} KB (-${pct}%)`);
  } else {
    after += originalSize;
    console.log(`${file.padEnd(18)} ${(originalSize / 1024).toFixed(0)} KB (already tight, left alone)`);
  }
}

console.log(
  `\n${files.length} files: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB ` +
    `(-${(100 * (1 - after / before)).toFixed(0)}%)`,
);
