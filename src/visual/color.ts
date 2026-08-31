/** Colour helpers for the parametric renderer. Everything interpolates. */

import { clamp01 } from '../core/math';

export type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function channel(v: number): string {
  return Math.round(clamp01(v / 255) * 255)
    .toString(16)
    .padStart(2, '0');
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Linear blend between two hex colours. `t=0` is `a`, `t=1` is `b`. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex({
    r: x.r + (y.r - x.r) * k,
    g: x.g + (y.g - x.g) * k,
    b: x.b + (y.b - x.b) * k,
  });
}

/** Multiplicative lightness, for the §4.1 ambient light channel. */
export function scale(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * factor, g: g * factor, b: b * factor });
}
