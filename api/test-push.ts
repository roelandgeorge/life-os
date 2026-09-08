/**
 * "Send a test notification" — the same path the evening cron takes, on
 * demand, reporting which step failed.
 *
 * It exists because every failure mode of web push is silent from the phone's
 * side. A missing Blob token, an unset VAPID key, a subscription the browser
 * quietly dropped and an expired endpoint all look identical: no notification,
 * ever, with nothing to act on. This turns each into a sentence.
 *
 * Authorisation is the caller's own subscription endpoint. That URL is a
 * capability — it is what lets anyone holding it push to this device — so
 * knowing it is proof enough of being the device, and nothing is disclosed
 * until it matches. Every other check runs after that, so the config readout
 * cannot be harvested by an anonymous caller.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get } from '@vercel/blob';
import webpush from 'web-push';
import { SUBSCRIPTION_PATH, vapidPublicKey, type StoredRecord } from './subscribe.js';

type Result = {
  ok: boolean;
  /** Which step this stopped at, for the app to show verbatim. */
  stage:
    | 'bad-request'
    | 'store'
    | 'no-subscription'
    | 'mismatch'
    | 'config'
    | 'expired'
    | 'push-failed'
    | 'sent';
  detail: string;
  /** Only ever filled in once the caller has proven it is the device. */
  cronSecretSet?: boolean;
  serverTimeUtc?: string;
};

function send(res: VercelResponse, result: Result) {
  // Always 200: the app renders `detail`, and an HTTP error code would make
  // fetch-level failures indistinguishable from diagnosed ones.
  return res.status(200).json(result);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const endpoint = (body as { endpoint?: unknown } | undefined)?.endpoint;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
    return send(res, { ok: false, stage: 'bad-request', detail: 'No subscription endpoint sent.' });
  }

  let record: StoredRecord;
  try {
    const stored = await get(SUBSCRIPTION_PATH, { access: 'private', useCache: false });
    if (!stored || stored.statusCode !== 200) {
      return send(res, {
        ok: false,
        stage: 'no-subscription',
        detail:
          'The server has no subscription stored. Switch the reminder off and on again to re-register this device.',
      });
    }
    record = (await new Response(stored.stream).json()) as StoredRecord;
  } catch (err) {
    // Overwhelmingly the first thing to go wrong: no Blob store, a token that
    // was never added to the environment, or a store created as public when
    // the code asks for a private read.
    return send(res, {
      ok: false,
      stage: 'store',
      detail: `Could not read the subscription store: ${message(err)}`,
    });
  }

  if (record.subscription?.endpoint !== endpoint) {
    return send(res, {
      ok: false,
      stage: 'mismatch',
      detail:
        'The server holds a subscription for a different browser or device. Switch the reminder off and on again here.',
    });
  }

  const cronSecretSet = Boolean(process.env.CRON_SECRET);
  const serverTimeUtc = new Date().toISOString();

  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return send(res, {
      ok: false,
      stage: 'config',
      detail: !publicKey
        ? 'The server cannot see the public VAPID key. Set VITE_VAPID_PUBLIC_KEY in Vercel and redeploy.'
        : 'VAPID_PRIVATE_KEY is not set on the server. Add it in Vercel and redeploy.',
      cronSecretSet,
      serverTimeUtc,
    });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:nobody@example.com', publicKey, privateKey);

  try {
    await webpush.sendNotification(
      record.subscription,
      JSON.stringify({ title: 'Life OS', body: 'Test notification. The evening reminder works.', url: '/' }),
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return send(res, {
        ok: false,
        stage: 'expired',
        detail: 'The push service has dropped this subscription. Switch the reminder off and on again.',
        cronSecretSet,
        serverTimeUtc,
      });
    }
    return send(res, {
      ok: false,
      stage: 'push-failed',
      detail: `The push service refused it${statusCode ? ` (${statusCode})` : ''}: ${message(err)}`,
      cronSecretSet,
      serverTimeUtc,
    });
  }

  return send(res, {
    ok: true,
    stage: 'sent',
    // The cron is the other half: a working test push with no CRON_SECRET set
    // means the daily job refuses to run, which is exactly the "nothing ever
    // arrives" symptom this endpoint is here to explain.
    detail: cronSecretSet
      ? 'Sent. It should arrive within a few seconds.'
      : 'Sent — but CRON_SECRET is not set on the server, so the daily job refuses to run and no evening reminder will ever fire.',
    cronSecretSet,
    serverTimeUtc,
  });
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
