import { describe, expect, it } from 'vitest';
import { PANEL_KEYS, type PanelSteps } from '../core/domains';
import type { Profile } from '../core/types';
import { FRAME, SLOTS, rectContains, scene, tilesFrame } from './scene';

function steps(value: number): PanelSteps {
  return Object.fromEntries(PANEL_KEYS.map((p) => [p, value])) as PanelSteps;
}

function slotRect(slot: string) {
  const found = SLOTS.find((s) => s.slot === slot);
  if (!found) throw new Error(`no such slot: ${slot}`);
  return found.rect;
}

describe('the scene table', () => {
  it('tiles the frame with the box slots — no gap, no overlap', () => {
    const boxes = SLOTS.filter((s) => s.kind === 'box').map((s) => s.rect);
    expect(tilesFrame(boxes, { x: 0, y: 0, ...FRAME })).toBe(true);
  });

  it('keeps every overlay rect inside the box it sits on', () => {
    expect(rectContains(slotRect('body'), slotRect('head'))).toBe(true);
    expect(rectContains(slotRect('network'), slotRect('partner'))).toBe(true);
    expect(rectContains(slotRect('body'), slotRect('accessory-body'))).toBe(true);
    expect(rectContains(slotRect('wealth'), slotRect('accessory-wealth'))).toBe(true);
  });

  it('is listed in ascending paint order', () => {
    const orders = SLOTS.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('drives every panel from exactly one slot', () => {
    const panels = SLOTS.map((s) => s.panel).filter((p): p is NonNullable<typeof p> => p !== undefined);
    expect([...panels].sort()).toEqual([...PANEL_KEYS].sort());
  });
});

describe('scene()', () => {
  const profiles: (Profile | undefined)[] = [
    undefined,
    { gender: 'male' },
    { gender: 'female', hair: 'dark' },
    { gender: 'male', hair: 'blond', partner: { wanted: true, gender: 'female', hair: 'dark' } },
  ];

  it('always resolves the box slots, whatever the profile or step', () => {
    for (const profile of profiles) {
      for (const step of [0, 2, 4]) {
        const slots = scene(steps(step), profile).map((r) => r.slot);
        expect(slots).toContain('wealth');
        expect(slots).toContain('body');
        expect(slots).toContain('network');
      }
    }
  });

  it('falls back a rung when no artwork exists for a slot — head and partner have none yet', () => {
    for (const profile of profiles) {
      const slots = scene(steps(2), profile).map((r) => r.slot);
      expect(slots).not.toContain('head');
      expect(slots).not.toContain('partner');
    }
  });

  it('points a box slot at its own step, one-indexed', () => {
    const body = scene(steps(3), undefined).find((r) => r.slot === 'body');
    expect(body?.src).toBe('/avatar/body4.png');
  });

  it('omits the accessory slots — nothing drives them until phase 6', () => {
    const slots = scene(steps(2), undefined).map((r) => r.slot);
    expect(slots).not.toContain('accessory-body');
    expect(slots).not.toContain('accessory-wealth');
  });

  it('returns resolved slots in ascending paint order', () => {
    const orders = scene(steps(2), undefined).map((r) => r.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
