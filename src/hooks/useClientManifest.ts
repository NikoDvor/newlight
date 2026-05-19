import { useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Dynamically updates the web app manifest, theme-color, and apple-touch-icon
 * based on the active client workspace branding.
 *
 * The manifest is built in-memory and injected via a data: URL so it is
 * always same-origin with the document — this is what makes the PWA name +
 * icon reflect the currently active account (sub-account or admin fallback)
 * when "Add to Home Screen" is invoked.
 *
 * - Admin viewing a sub-account → that client's name + logo
 * - Logged in directly to a sub-account → that sub-account's name + logo
 * - Admin with no sub-account selected → NewLight default
 */
export function useClientManifest() {
  const { activeClientId, branding } = useWorkspace();

  useEffect(() => {
    const isClient = !!activeClientId;
    const appName = isClient
      ? (branding.company_name || branding.app_display_name || "NewLight")
      : "NewLight";
    const themeColor = isClient && branding.primary_color
      ? branding.primary_color
      : "#FFFFFF";
    const iconUrl = isClient && (branding.pwa_icon_url || branding.app_icon_url || branding.logo_url)
      ? (branding.pwa_icon_url || branding.app_icon_url || branding.logo_url)
      : `${window.location.origin}/pwa-512x512.png`;

    // Document title + standard meta
    document.title = appName;
    setMeta("apple-mobile-web-app-title", appName);
    setMeta("application-name", appName);
    setMetaTheme(themeColor);
    setLink("apple-touch-icon", iconUrl);
    setLink("icon", isClient ? iconUrl : "/favicon.ico");

    // Build manifest fresh for this account context and inject as a
    // same-origin data: URL so start_url/scope resolve to the app origin.
    const lower = iconUrl.split("?")[0].toLowerCase();
    const mime = lower.endsWith(".svg")
      ? "image/svg+xml"
      : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : lower.endsWith(".webp")
          ? "image/webp"
          : "image/png";
    const isSvg = mime === "image/svg+xml";

    const manifest = {
      name: appName,
      short_name: appName.slice(0, 12),
      description: `${appName} workspace`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: themeColor,
      theme_color: themeColor,
      icons: isSvg
        ? [
            { src: iconUrl, sizes: "any", type: mime, purpose: "any" },
            { src: iconUrl, sizes: "any", type: mime, purpose: "maskable" },
          ]
        : [
            { src: iconUrl, sizes: "192x192", type: mime },
            { src: iconUrl, sizes: "512x512", type: mime },
            { src: iconUrl, sizes: "512x512", type: mime, purpose: "any maskable" },
          ],
    };

    const manifestUrl =
      "data:application/manifest+json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(manifest));

    const link = ensureManifestLink();
    link.setAttribute("crossorigin", "use-credentials");
    link.href = manifestUrl;
  }, [activeClientId, branding]);

  function ensureManifestLink() {
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    return manifestLink;
  }

  function setMeta(name: string, content: string) {
    let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  }

  function setMetaTheme(color: string) {
    let el = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.name = "theme-color";
      document.head.appendChild(el);
    }
    el.content = color;
  }

  function setLink(rel: string, href: string) {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
  }
}
