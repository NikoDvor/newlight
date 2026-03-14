import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoUploader } from "@/components/LogoUploader";
import {
  Image, Monitor, Sidebar, Smartphone, Sparkles, Download,
  Square, CircleDot, Loader2, Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface BrandingData {
  logo_url: string | null;
  favicon_url: string | null;
  dashboard_logo_url: string | null;
  sidebar_logo_url: string | null;
  app_icon_url: string | null;
  splash_logo_url: string | null;
  avatar_logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  company_name: string | null;
}

const assetCards = [
  { key: "logo_url", label: "Primary Logo", icon: Image, desc: "Main logo used across the workspace" },
  { key: "dashboard_logo_url", label: "Dashboard Logo", icon: Monitor, desc: "Displayed in the workspace header" },
  { key: "sidebar_logo_url", label: "Sidebar Logo", icon: Sidebar, desc: "Compact logo for the navigation sidebar" },
  { key: "app_icon_url", label: "App Icon", icon: Smartphone, desc: "192×192+ icon for installable app" },
  { key: "splash_logo_url", label: "Splash Logo", icon: Sparkles, desc: "Loading / splash screen logo" },
  { key: "favicon_url", label: "Favicon", icon: Square, desc: "Browser tab icon (32×32)" },
  { key: "avatar_logo_url", label: "Avatar Icon", icon: CircleDot, desc: "Small square icon for avatars" },
] as const;

export default function BrandAssets() {
  const { activeClientId } = useWorkspace();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeClientId) return;
    supabase.from("client_branding").select("*").eq("client_id", activeClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setBranding({
            logo_url: d.logo_url,
            favicon_url: d.favicon_url,
            dashboard_logo_url: d.dashboard_logo_url,
            sidebar_logo_url: d.sidebar_logo_url,
            app_icon_url: d.app_icon_url,
            splash_logo_url: d.splash_logo_url,
            avatar_logo_url: d.avatar_logo_url,
            primary_color: d.primary_color,
            secondary_color: d.secondary_color,
            company_name: d.company_name,
          });
          setLogoUrl(d.logo_url || "");
        }
        setLoading(false);
      });
  }, [activeClientId]);

  const handleSaveLogo = async () => {
    if (!activeClientId) return;
    setSaving(true);
    // Auto-populate all asset fields from the main logo if they're currently empty
    const updates: Record<string, string | null> = { logo_url: logoUrl || null };
    if (logoUrl) {
      if (!branding?.favicon_url) updates.favicon_url = logoUrl;
      if (!branding?.dashboard_logo_url) updates.dashboard_logo_url = logoUrl;
      if (!branding?.sidebar_logo_url) updates.sidebar_logo_url = logoUrl;
      if (!branding?.app_icon_url) updates.app_icon_url = logoUrl;
      if (!branding?.splash_logo_url) updates.splash_logo_url = logoUrl;
      if (!branding?.avatar_logo_url) updates.avatar_logo_url = logoUrl;
    }

    const { error } = await supabase.from("client_branding")
      .upsert({ client_id: activeClientId, ...updates } as any, { onConflict: "client_id" });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logo saved! Brand assets auto-generated.");
      // Refresh
      const { data } = await supabase.from("client_branding").select("*").eq("client_id", activeClientId).maybeSingle();
      if (data) {
        const d = data as any;
        setBranding({
          logo_url: d.logo_url, favicon_url: d.favicon_url,
          dashboard_logo_url: d.dashboard_logo_url, sidebar_logo_url: d.sidebar_logo_url,
          app_icon_url: d.app_icon_url, splash_logo_url: d.splash_logo_url,
          avatar_logo_url: d.avatar_logo_url, primary_color: d.primary_color,
          secondary_color: d.secondary_color, company_name: d.company_name,
        });
      }
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Brand Assets" description="Manage your logos and generated brand assets" />

      <div className="space-y-6">
        {/* Primary logo upload */}
        <Card className="card-widget">
          <CardContent className="p-5">
            <LogoUploader value={logoUrl} onChange={setLogoUrl} label="Primary Logo" dark={false} />
            <Button onClick={handleSaveLogo} disabled={saving} className="mt-4 btn-gradient h-9 text-xs px-5">
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save & Generate Assets
            </Button>
          </CardContent>
        </Card>

        {/* Generated assets grid */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Generated Assets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assetCards.map(asset => {
              const url = branding?.[asset.key] || null;
              return (
                <Card key={asset.key} className="card-widget">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                        {url ? (
                          <img src={url} alt={asset.label} className="h-9 w-9 object-contain" />
                        ) : (
                          <asset.icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{asset.label}</p>
                        <p className="text-[11px] text-muted-foreground">{asset.desc}</p>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary mt-1 hover:underline"
                          >
                            <Download className="h-2.5 w-2.5" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
