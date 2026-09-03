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

  await put(SUBSCRIPTION_PATH, JSON.stringify(subscription), {
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
