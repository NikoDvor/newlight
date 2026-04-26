import { useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Dynamically updates the web app manifest, theme-color, and apple-touch-icon
 * based on the active client workspace branding.
 * When no client is active (admin view), defaults to NewLight branding.
 */
export function useClientManifest() {
  const { activeClientId, branding } = useWorkspace();

  useEffect(() => {
    const isClient = !!activeClientId;
    const appName = isClient && branding.app_display_name
      ? branding.app_display_name
      : isClient && branding.company_name
        ? branding.company_name
        : "NewLight";
    const themeColor = isClient && branding.primary_color
      ? branding.primary_color
      : "#0EA5E9";
    const iconUrl = isClient && (branding.pwa_icon_url || branding.app_icon_url || branding.logo_url)
      ? (branding.pwa_icon_url || branding.app_icon_url || branding.logo_url)
      : "/apple-touch-icon.png";

    // Update document title
    document.title = appName;

    // Update or create theme-color meta
    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = themeColor;

    // Update or create apple-touch-icon link
    let touchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (!touchIcon) {
      touchIcon = document.createElement("link");
      touchIcon.rel = "apple-touch-icon";
      document.head.appendChild(touchIcon);
    }
    touchIcon.href = iconUrl;

    // Update or create shortcut icon link
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = isClient ? iconUrl : "/favicon.ico";

    const manifestLink = ensureManifestLink();
    manifestLink.href = isClient
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-manifest?client_id=${encodeURIComponent(activeClientId)}&app_origin=${encodeURIComponent(window.location.origin)}`
      : "/manifest.json";
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
}
