/**
 * One refresh, not two.
 *
 * `vite-plugin-pwa`'s `registerType: 'autoUpdate'` puts `skipWaiting` and
 * `clientsClaim` in the generated worker, so a new worker installs and takes
 * over as soon as the page asks for `/sw.js`. What it does not do is reload
 * the page that triggered it: that page was already served from the old
 * precache, so it keeps showing the old build. The update only appears on
 * the *next* load.
 *
 * On a site that is one tab among many, nobody notices. On a phone home
 * screen it means refreshing, seeing no change, and concluding the deploy
 * did not land.
 *
 * So the page reloads itself the moment a new worker claims it. Two guards
 * against reloading when nothing shipped:
 *
 * - `hadController`. `clientsClaim` also fires `controllerchange` the very
 *   first time a worker claims an uncontrolled page, which is every first
 *   visit. Without this the app would reload once for every new install.
 * - `reloading`. `controllerchange` can fire more than once, and a second
 *   reload after the first has started is how this becomes a loop.
 */
export function reloadOnWorkerUpdate(): void {
  if (!('serviceWorker' in navigator)) return;

  const hadController = navigator.serviceWorker.controller !== null;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
}
