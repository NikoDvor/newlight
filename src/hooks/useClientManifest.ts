import { useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

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
      : "#3B82F6";
    const iconUrl = isClient && branding.app_icon_url
      ? branding.app_icon_url
      : "/favicon.ico";

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

    // Build and inject a dynamic manifest blob
    const manifest = {
      name: appName,
      short_name: appName.substring(0, 12),
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: themeColor,
      icons: [
        { src: iconUrl, sizes: "192x192", type: "image/png" },
        { src: iconUrl, sizes: "512x512", type: "image/png" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    const oldHref = manifestLink.href;
    manifestLink.href = url;

    return () => {
      if (oldHref && oldHref.startsWith("blob:")) {
        URL.revokeObjectURL(oldHref);
      }
    };
  }, [activeClientId, branding]);
}
