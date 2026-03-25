import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { WebsiteSection } from "@/hooks/useWebsiteSections";
import type { WebsiteSite } from "@/hooks/useWebsiteSite";

interface Props {
  sections: WebsiteSection[];
  site: WebsiteSite | null;
  pageName: string;
  pageSlug?: string;
}

function renderSection(section: WebsiteSection, site: WebsiteSite | null) {
  const cj = typeof section.content_json === "string" ? JSON.parse(section.content_json) : (section.content_json || {});
  if (!section.is_active) return null;
  const primary = site?.primary_color || "#3B82F6";
  const btnRadius = site?.button_style === "pill" ? "9999px" : site?.button_style === "square" ? "4px" : "12px";

  switch (section.block_type) {
    case "Hero":
      return (
        <div className="py-12 px-6 text-center" style={{ background: `linear-gradient(135deg, ${primary}11, ${primary}05)` }}>
          {cj.imageUrl && <img src={cj.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-xl mb-4" />}
          <h1 className="text-2xl font-bold mb-2" style={{ color: primary }}>{cj.heading || "Welcome"}</h1>
          {cj.subheading && <p className="text-sm text-muted-foreground mb-2">{cj.subheading}</p>}
          {cj.body && <p className="text-sm max-w-md mx-auto mb-4">{cj.body}</p>}
          {cj.buttonText && (
            <button className="px-6 py-2.5 text-sm font-medium text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText}
            </button>
          )}
        </div>
      );
    case "richtext":
    case "text":
      return (
        <div className="py-8 px-6">
          {cj.heading && <h2 className="text-lg font-semibold mb-2">{cj.heading}</h2>}
          {cj.body && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{cj.body}</p>}
        </div>
      );
    case "imagetext":
      return (
        <div className="py-8 px-6 flex flex-col sm:flex-row gap-6 items-center">
          {cj.imageUrl && <img src={cj.imageUrl} alt="" className="w-full sm:w-1/2 rounded-xl object-cover max-h-48" />}
          <div className="flex-1">
            {cj.heading && <h2 className="text-lg font-semibold mb-2">{cj.heading}</h2>}
            {cj.body && <p className="text-sm text-muted-foreground">{cj.body}</p>}
          </div>
        </div>
      );
    case "CTA":
      return (
        <div className="py-10 px-6 text-center" style={{ background: `${primary}08` }}>
          {cj.heading && <h2 className="text-lg font-bold mb-2">{cj.heading}</h2>}
          {cj.body && <p className="text-sm text-muted-foreground mb-4">{cj.body}</p>}
          {cj.buttonText && (
            <button className="px-6 py-2.5 text-sm font-medium text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText}
            </button>
          )}
        </div>
      );
    case "FAQ":
      return (
        <div className="py-8 px-6">
          {cj.heading && <h2 className="text-lg font-semibold mb-3">{cj.heading}</h2>}
          {cj.body && <p className="text-sm text-muted-foreground whitespace-pre-line">{cj.body}</p>}
        </div>
      );
    case "ContactBlock":
      return (
        <div className="py-8 px-6" style={{ background: `${primary}05` }}>
          <h2 className="text-lg font-semibold mb-3">{cj.heading || "Contact Us"}</h2>
          {cj.body && <p className="text-sm text-muted-foreground mb-4">{cj.body}</p>}
          <div className="space-y-2 max-w-sm">
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Your Name" />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Your Email" />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Message" rows={3} />
            <button className="px-6 py-2 text-sm font-medium text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText || "Send Message"}
            </button>
          </div>
        </div>
      );
    default:
      return (
        <div className="py-6 px-6">
          {cj.heading && <h2 className="text-lg font-semibold mb-2">{cj.heading}</h2>}
          {cj.body && <p className="text-sm text-muted-foreground">{cj.body}</p>}
        </div>
      );
  }
}

export function WebsitePreviewFrame({ sections, site, pageName, pageSlug }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const { activeClientId } = useWorkspace();
  const [clientSlug, setClientSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!activeClientId) return;
    supabase.from("clients").select("workspace_slug").eq("id", activeClientId).maybeSingle()
      .then(({ data }) => setClientSlug(data?.workspace_slug || null));
  }, [activeClientId]);

  const publicUrl = clientSlug
    ? `/site/${clientSlug}${pageSlug && pageSlug !== "home" ? `/${pageSlug}` : ""}`
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Preview: {pageName}</h3>
        <div className="flex gap-1.5">
          <Button size="sm" variant={mode === "desktop" ? "default" : "outline"} onClick={() => setMode("desktop")} className="gap-1">
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </Button>
          <Button size="sm" variant={mode === "mobile" ? "default" : "outline"} onClick={() => setMode("mobile")} className="gap-1">
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </Button>
          {publicUrl && (
            <Button size="sm" variant="outline" className="gap-1" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className={`border border-border rounded-2xl overflow-hidden bg-white mx-auto transition-all ${
        mode === "mobile" ? "max-w-[375px]" : "w-full"
      }`}>
        {/* Nav preview */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold" style={{ color: site?.primary_color }}>
            {site?.site_name || "Your Site"}
          </span>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Home</span><span>About</span><span>Services</span><span>Contact</span>
          </div>
        </div>

        {/* Sections */}
        <div className="divide-y divide-border/50">
          {sections.filter(s => s.is_active).length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No visible sections. Add sections to see a preview.
            </div>
          ) : (
            sections.filter(s => s.is_active).map(section => (
              <div key={section.id}>{renderSection(section, site)}</div>
            ))
          )}
        </div>

        {/* Footer preview */}
        <div className="px-4 py-4 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} {site?.site_name || "Your Business"}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
