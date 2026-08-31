import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// §9 step 8. Notifications (§6) need the PWA installed to the home screen on
// iOS, which needs a manifest + service worker to exist at all — this is
// what makes that installable, not what schedules the notification itself.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // On so the manifest/service worker are inspectable via `npm run dev`,
      // not only in a production build.
      devOptions: { enabled: true },
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Life OS',
        short_name: 'Life OS',
        description: "This is you at +15. If your current average holds.",
        start_url: '/',
        display: 'standalone',
        background_color: '#14161a',
        theme_color: '#14161a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
