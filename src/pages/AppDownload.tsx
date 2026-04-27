import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Share2, Smartphone, Chrome, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

type ClientDownload = {
  id: string;
  business_name: string;
  workspace_slug: string;
};

type Branding = {
  company_name: string | null;
  app_display_name: string | null;
  logo_url: string | null;
  app_icon_url: string | null;
  pwa_icon_url: string | null;
  primary_color: string | null;
};

const fallbackColor = "#0EA5E9";

export default function AppDownload() {
  const { slug = "" } = useParams();
  const { install, isInstalled, isIOS } = usePWAInstall();
  const [client, setClient] = useState<ClientDownload | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data: clientRow } = await supabase
        .from("clients")
        .select("id, business_name, workspace_slug")
        .eq("workspace_slug", slug)
        .maybeSingle();

      if (!mounted) return;
      setClient(clientRow as ClientDownload | null);

      if (clientRow?.id) {
        const { data: brandingRow } = await supabase
          .from("client_branding")
          .select("company_name, app_display_name, logo_url, app_icon_url, pwa_icon_url, primary_color")
          .eq("client_id", clientRow.id)
          .maybeSingle();
        if (mounted) setBranding((brandingRow as Branding | null) ?? null);
      }
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [slug]);

  const appName = branding?.app_display_name || branding?.company_name || client?.business_name || "Your App";
  const iconUrl = branding?.pwa_icon_url || branding?.app_icon_url || branding?.logo_url;
  const brandColor = /^#[0-9a-f]{6}$/i.test(branding?.primary_color || "") ? branding!.primary_color! : fallbackColor;

  useEffect(() => {
    if (!client?.id) return;
    document.title = `${appName} App Download`;
    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = brandColor;

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-manifest?client_id=${encodeURIComponent(client.id)}&app_origin=${encodeURIComponent(window.location.origin)}`;

    if (iconUrl) {
      let touchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (!touchIcon) {
        touchIcon = document.createElement("link");
        touchIcon.rel = "apple-touch-icon";
        document.head.appendChild(touchIcon);
      }
      touchIcon.href = iconUrl;
    }
  }, [appName, brandColor, client?.id, iconUrl]);

  const initials = useMemo(() => appName.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "APP", [appName]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("App download link copied");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading app download…</div>;
  }

  if (!client) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">App download link not found.</div>;
  }

  return (
    <main className="min-h-screen text-white" style={{ background: `linear-gradient(160deg, ${brandColor} 0%, hsl(218 35% 10%) 58%, hsl(220 30% 8%) 100%)` }}>
      <section className="min-h-screen px-5 py-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto h-24 w-24 rounded-[28px] bg-white/15 border border-white/25 shadow-2xl flex items-center justify-center overflow-hidden backdrop-blur-md">
              {iconUrl ? <img src={iconUrl} alt={`${appName} logo`} className="h-full w-full object-contain p-2" /> : <span className="text-3xl font-black">{initials}</span>}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-normal">{appName}</h1>
            <p className="mt-2 text-sm text-white/75">Add your app to your home screen.</p>
          </div>

          <Button onClick={install} className="w-full h-14 text-base font-bold rounded-xl bg-white text-slate-950 hover:bg-white/90 shadow-xl gap-2">
            <Download className="h-5 w-5" /> {isInstalled ? "App Installed" : isIOS ? "Add to Home Screen" : "Install App"}
          </Button>

          <div className="mt-5 grid gap-3">
            <div className="rounded-xl bg-white/12 border border-white/15 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 font-bold text-sm"><Share2 className="h-4 w-4" /> iOS</div>
              <p className="mt-2 text-sm text-white/78">1. Tap the share button.</p>
              <p className="text-sm text-white/78">2. Tap Add to Home Screen.</p>
            </div>
            <div className="rounded-xl bg-white/12 border border-white/15 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 font-bold text-sm"><Chrome className="h-4 w-4" /> Android</div>
              <p className="mt-2 text-sm text-white/78">1. Tap the button above.</p>
              <p className="text-sm text-white/78">2. Tap Install on the Chrome prompt.</p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button variant="outline" onClick={copyLink} className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/15 gap-2">
              <Copy className="h-4 w-4" /> Copy Link
            </Button>
            <Button variant="outline" onClick={() => window.location.href = `/w/${client.workspace_slug}`} className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/15 gap-2">
              <Smartphone className="h-4 w-4" /> Open App
            </Button>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-white/60">
            <CheckCircle2 className="h-3.5 w-3.5" /> Permanent app download link
          </p>
        </div>
      </section>
    </main>
  );
}
