/**
 * Stores (or clears) the one push subscription this app has.
 *
 * One user, one device, one subscription — so there is no database here, just
 * a single JSON blob at a fixed path. The store must be a **private** Blob
 * store: a push subscription on a public URL would let anyone who found it
 * send notifications to the phone.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del, put } from '@vercel/blob';

export const SUBSCRIPTION_PATH = 'push/subscription.json';

/** The shape `pushManager.subscribe()` serialises to. */
type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * What the app tells the server about its weekly commitments: opaque ids,
 * the day each was last satisfied, and how long its period is. Deliberately
 * no names and no log — the server can work out urgency from this alone, on
 * whatever day it fires.
 */
type DigestEntry = { id: string; lastHit: string | null; periodDays: number };
export type StoredRecord = {
  subscription: StoredSubscription;
  digest?: { anchor: string | null; entries: DigestEntry[] };
};

function parseDigest(value: unknown): StoredRecord['digest'] {
  if (typeof value !== 'object' || value === null) return undefined;
  const raw = value as { anchor?: unknown; entries?: unknown };
  if (!Array.isArray(raw.entries)) return undefined;

  const entries: DigestEntry[] = [];
  for (const entry of raw.entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== 'string') continue;
    if (typeof e.periodDays !== 'number' || !Number.isFinite(e.periodDays)) continue;
    const lastHit = typeof e.lastHit === 'string' ? e.lastHit : null;
    entries.push({ id: e.id, lastHit, periodDays: e.periodDays });
  }
  return { anchor: typeof raw.anchor === 'string' ? raw.anchor : null, entries };
}

function isSubscription(value: unknown): value is StoredSubscription {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = v.keys as Record<string, unknown> | undefined;
  return (
    typeof v.endpoint === 'string' &&
    v.endpoint.startsWith('https://') &&
    typeof keys?.p256dh === 'string' &&
    typeof keys?.auth === 'string'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'DELETE') {
    await del(SUBSCRIPTION_PATH).catch(() => {});
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const subscription = (body as { subscription?: unknown } | undefined)?.subscription;

  if (!isSubscription(subscription)) {
    return res.status(400).json({ error: 'Not a push subscription' });
  }

  const digest = parseDigest((body as { digest?: unknown } | undefined)?.digest);
  const record: StoredRecord = digest ? { subscription, digest } : { subscription };

  await put(SUBSCRIPTION_PATH, JSON.stringify(record), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    // Re-subscribing replaces the old endpoint; a stale one would just bounce.
    addRandomSuffix: false,
  });

  return res.status(200).json({ ok: true });
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
