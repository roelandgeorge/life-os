/**
 * The daily reminder. Invoked by the cron in vercel.json, once a day.
 *
 * Vercel's free plan runs cron jobs at most once a day, within an hour of the
 * scheduled time, and only in UTC — so this is deliberately not clever about
 * timing. It fires once, in the evening, and the app's copy says as much
 * rather than pretending to a precision the plan does not offer.
 *
 * It cannot know whether the boxes were ticked: the log lives in IndexedDB on
 * the phone and never leaves it. So the text asks rather than tells, which is
 * also the more honest nudge.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get } from '@vercel/blob';
import webpush from 'web-push';
import { SUBSCRIPTION_PATH } from './subscribe.js';

type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Vercel sends `Authorization: Bearer $CRON_SECRET` when the secret is set. */
function authorised(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse rather than run open: an unguarded endpoint lets anyone on the
  // internet fire the notification at any hour.
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorised' });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:nobody@example.com';
  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'VAPID keys are not configured' });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  // useCache: false — a subscription saved minutes ago must not be missed
  // because the CDN is still serving the previous one.
  const stored = await get(SUBSCRIPTION_PATH, { access: 'private', useCache: false });
  if (!stored || stored.statusCode !== 200) {
    return res.status(200).json({ sent: false, reason: 'no subscription' });
  }

  const subscription = (await new Response(stored.stream).json()) as StoredSubscription;

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'Life OS',
        body: 'Did today count? Fill it in.',
        url: '/',
      }),
    );
    return res.status(200).json({ sent: true });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404/410 mean the browser dropped the subscription — the user reinstalled,
    // cleared data, or revoked permission. Report it rather than retrying: the
    // app re-subscribes by itself next time the toggle is switched on.
    if (statusCode === 404 || statusCode === 410) {
      return res.status(200).json({ sent: false, reason: 'subscription expired' });
    }
    return res.status(500).json({ sent: false, error: err instanceof Error ? err.message : String(err) });
  }
}
