import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

process.env.BROWSERSLIST_IGNORE_OLD_DATA = "true";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // "prompt" makes a new service worker enter the WAITING state so
      // onNeedRefresh fires in registerSW() and we can show the update toast.
      // The user controls when the reload happens via the update banner.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "NewLight",
        short_name: "NewLight",
        description: "AI-powered business growth platform",
        theme_color: "#0EA5E9",
        background_color: "#0EA5E9",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // IMPORTANT: do NOT include `html` here. Precached HTML is served
        // cache-first, which pins returning users to a stale index.html
        // (pointing to old hashed JS chunks) until they manually clear data.
        // Hashed JS/CSS/asset files are safe to precache — their filenames
        // change every build so they can never go stale.
        globPatterns: ["**/*.{js,css,ico,png,jpg,jpeg,webp,svg,woff2}"],
        // Purge old precache buckets from prior deploys so storage doesn't
        // accumulate and stale entries can't be resurrected.
        cleanupOutdatedCaches: true,
        // Route SPA navigations through index.html, served via NetworkFirst below.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        // Intentionally NOT setting skipWaiting/clientsClaim so the user controls
        // when the reload happens via the update banner (calling updateSW(true) on
        // demand). A forced/automatic reload would interrupt an in-progress session
        // restore.
        runtimeCaching: [
          {
            // Navigations (HTML) — always try network first so a new deploy
            // is picked up on the very next page load. Fall back to cache
            // only when offline, with a short TTL so nothing lingers.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-navigations",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Explicit index.html fetches (navigateFallback target) — same policy.
            urlPattern: ({ url }) => url.pathname === "/index.html" || url.pathname === "/",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-shell",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Do NOT runtime-cache Supabase requests. Caching /auth/v1/* responses
        // causes stale/expired auth data to be returned on PWA cold-start,
        // which logs the user out when they re-open the installed app.
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 4096,
  },
}));
