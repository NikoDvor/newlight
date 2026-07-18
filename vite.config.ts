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
      // "autoUpdate" applies new deploys automatically on the next page load.
      // No manual user action (clicking a banner) is required; skipWaiting and
      // clientsClaim below activate the new service worker immediately.
      registerType: "autoUpdate",
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
        // Activate the new service worker immediately so updates take effect
        // on the next load without waiting for a user prompt.
        skipWaiting: true,
        clientsClaim: true,
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
