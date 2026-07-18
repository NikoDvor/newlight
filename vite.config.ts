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
      // "prompt" (not "autoUpdate") so a new SW enters the WAITING state instead
      // of silently self-activating. This is what makes onNeedRefresh fire in
      // registerSW() so we can show the "A new version is available" toast.
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
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,webp,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        // Intentionally NOT setting skipWaiting/clientsClaim to true here — the
        // whole point of the update prompt is to let the user click "Reload"
        // which then calls updateSW(true) to trigger skipWaiting on demand.
        // Do NOT runtime-cache Supabase requests. Caching /auth/v1/* responses
        // causes stale/expired auth data to be returned on PWA cold-start,
        // which logs the user out when they re-open the installed app.
        runtimeCaching: [],
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
