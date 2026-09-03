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
import { SUBSCRIPTION_PATH, type StoredRecord } from './subscribe.js';

const DAY_MS = 86_400_000;

/** Same threshold as the app's own warning (core/atRisk.ts). */
const RISK_DAYS_LEFT = 2;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / DAY_MS);
}

/**
 * How many weekly commitments are about to lapse, worked out here rather than
 * on the phone — the app may not have been opened for days, which is exactly
 * when the reminder matters. Never-done counts as at risk.
 */
function countAtRisk(record: StoredRecord, todayIso: string): number {
  const digest = record.digest;
  if (!digest || digest.anchor === null) return 0;

  let count = 0;
  for (const entry of digest.entries) {
    const period = entry.periodDays;
    if (period <= 1) continue;
    const elapsed = daysBetween(digest.anchor, todayIso);
    if (elapsed < 0) continue;
    const periodStartOffset = Math.floor(elapsed / period) * period;
    const daysLeft = period - (elapsed % period);
    if (daysLeft > RISK_DAYS_LEFT) continue;

    // Satisfied within the period in progress? Then it is not at risk.
    const doneAt = entry.lastHit === null ? null : daysBetween(digest.anchor, entry.lastHit);
    if (doneAt !== null && doneAt >= periodStartOffset) continue;
    count++;
  }
  return count;
}

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

  const record = (await new Response(stored.stream).json()) as StoredRecord;
  const todayIso = new Date().toISOString().slice(0, 10);
  const atRisk = countAtRisk(record, todayIso);

  const body =
    atRisk === 1
      ? 'One weekly thing is about to lapse. Open Life OS.'
      : atRisk > 1
        ? `${atRisk} weekly things are about to lapse. Open Life OS.`
        : 'Did today count? Fill it in.';

  try {
    await webpush.sendNotification(
      record.subscription,
      JSON.stringify({ title: 'Life OS', body, url: '/' }),
    );
    return res.status(200).json({ sent: true, atRisk });
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
