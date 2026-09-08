/**
 * Web push, client side.
 *
 * The one hard constraint shaping this file: `Notification.requestPermission()`
 * must be called from a user gesture, and on iOS only from an app installed to
 * the home screen. So there is no "enable on boot" path — every entry point
 * here is something the user clicked.
 *
 * Everything returns a `PushResult` rather than throwing, because every
 * failure here is one the user needs told: a denied permission, a browser
 * that cannot do this, a server that did not take the subscription. Silence
 * would mean waiting for a reminder that is never coming.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'not-installed' | 'denied' | 'failed'; detail?: string };

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * iOS grants push only to a PWA launched from the home screen. Detecting that
 * lets Settings say "add it to your home screen first" instead of letting the
 * permission call fail with nothing to act on.
 */
export function installedToHomeScreen(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

const isApple = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * VAPID keys travel as base64url; PushManager wants raw bytes. Returns the
 * backing ArrayBuffer rather than the view, because `applicationServerKey`
 * will not accept a `Uint8Array` whose buffer might be shared.
 */
function decodeKey(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Ships alongside the subscription so the evening reminder can say something
 * true. Only opaque ids, dates and period lengths — never a task's name, and
 * never the log. See `core/atRisk.ts`.
 */
export type PushDigest = { anchor: string | null; entries: unknown[] };

/**
 * Refresh the server's copy of what is weekly and when it was last done.
 * Called whenever the app opens, so the reminder stays right even after days
 * without an open — the server recomputes urgency on the day it fires.
 */
export async function syncDigest(digest: PushDigest): Promise<void> {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    // No subscription means reminders are off; there is nothing to keep fresh.
    if (!subscription) return;
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription, digest }),
    });
  } catch {
    // Best effort. A stale digest degrades the wording of the reminder; it
    // does not stop the reminder, and it must never break opening the app.
  }
}

export async function enablePush(digest?: PushDigest): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  if (isApple() && !installedToHomeScreen()) return { ok: false, reason: 'not-installed' };
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, reason: 'failed', detail: 'VITE_VAPID_PUBLIC_KEY is not set in this build.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const registration = await navigator.serviceWorker.ready;
    // Reuse an existing subscription: re-subscribing with the same key returns
    // the same endpoint anyway, and asking twice can fail on some browsers.
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(VAPID_PUBLIC_KEY),
      }));

    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription, digest }),
    });
    if (!response.ok) {
      return { ok: false, reason: 'failed', detail: `The server refused the subscription (${response.status}).` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'failed', detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fires the real thing on demand: server, VAPID, push service, service
 * worker. Every step of that chain fails silently in normal use, so this
 * reports which one, in words meant for the person holding the phone.
 *
 * The endpoint URL is what proves to the server that this is the subscribed
 * device — see api/test-push.ts.
 */
export async function testPush(): Promise<{ ok: boolean; detail: string }> {
  if (!pushSupported()) {
    return { ok: false, detail: 'This browser cannot do push notifications.' };
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // Worth its own message: the app's own setting can read "on" while the
      // browser has quietly dropped the subscription, and that combination
      // looks exactly like a broken server.
      return {
        ok: false,
        detail: 'This browser has no subscription. Switch the reminder off and on again.',
      };
    }
    if (Notification.permission !== 'granted') {
      return { ok: false, detail: 'Notifications are blocked for this app in your browser settings.' };
    }

    const response = await fetch('/api/test-push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) {
      return { ok: false, detail: `The server did not answer (${response.status}).` };
    }
    // A deployment without the serverless functions answers this with the
    // app's own HTML, which would otherwise surface as a JSON parse error and
    // send you looking in the wrong place.
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return {
        ok: false,
        detail: 'No push endpoint is deployed at /api/test-push — the server side of the app is not running.',
      };
    }
    const result = (await response.json()) as { ok?: boolean; detail?: string };
    return { ok: result.ok === true, detail: result.detail ?? 'The server gave no reason.' };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await subscription.unsubscribe();
    // Tell the server too, so the daily job stops pushing into a dead endpoint.
    await fetch('/api/subscribe', { method: 'DELETE' }).catch(() => {});
  } catch {
    // Unsubscribing is best-effort: the setting is already off locally, and a
    // stale server subscription expires on its own.
  }
}
