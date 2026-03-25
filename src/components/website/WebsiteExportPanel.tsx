import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, ExternalLink, Code, Link2, Calendar, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { WebsiteSection } from "@/hooks/useWebsiteSections";
import type { WebsiteSite } from "@/hooks/useWebsiteSite";

interface Props {
  sections: WebsiteSection[];
  site: WebsiteSite | null;
  pageName: string;
  clientSlug?: string;
}

export function WebsiteExportPanel({ sections, site, pageName, clientSlug }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sectionToText = (s: WebsiteSection): string => {
    const cj = typeof s.content_json === "string" ? JSON.parse(s.content_json) : (s.content_json || {});
    const parts: string[] = [];
    if (cj.heading) parts.push(cj.heading);
    if (cj.subheading) parts.push(cj.subheading);
    if (cj.body) parts.push(cj.body);
    if (cj.buttonText) parts.push(`[${cj.buttonText}](${cj.buttonUrl || "#"})`);
    return parts.join("\n\n");
  };

  const siteUrl = clientSlug ? `/site/${clientSlug}` : null;
  const bookingNote = "Use your workspace booking links to embed scheduling on your external site.";

  return (
    <div className="space-y-6">
      {/* Quick links */}
      <div className="p-4 rounded-xl border border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" /> Embeddable Links
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Use these links on your external website for booking, reviews, and more.
        </p>
        <div className="space-y-2">
          {siteUrl && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">NewLight Landing Page</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(window.location.origin + siteUrl, "site-url")}>
                {copiedId === "site-url" ? <CheckCircle className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />} Copy
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Booking Links</span>
            </div>
            <Badge variant="outline" className="text-[9px]">From Calendar Module</Badge>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Review Request Link</span>
            </div>
            <Badge variant="outline" className="text-[9px]">From Reviews Module</Badge>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Contact / Lead Forms</span>
            </div>
            <Badge variant="outline" className="text-[9px]">From Forms Module</Badge>
          </div>
        </div>
      </div>

      {/* Export content blocks */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" /> Export Content — {pageName}
        </h3>
        {sections.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No sections on this page yet. Add content in the Content tab.
          </p>
        ) : (
          <div className="space-y-2">
            {sections.filter(s => s.is_active).map(s => {
              const text = sectionToText(s);
              return (
                <div key={s.id} className="p-3 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{s.block_type}</Badge>
                      <span className="text-xs font-medium">{s.block_label || s.block_type}</span>
                    </div>
                    <Button
                      size="sm" variant="ghost" className="h-7 text-xs gap-1"
                      onClick={() => copyToClipboard(text, s.id)}
                    >
                      {copiedId === s.id ? <CheckCircle className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      Copy Text
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{text || "No text content"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adapter status */}
      <div className="p-4 rounded-xl border border-dashed border-border bg-secondary/20">
        <h3 className="text-sm font-semibold mb-1">Platform Adapters</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Direct publishing to external platforms is coming soon. For now, use copy/export to update your external site.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {["WordPress", "Shopify", "Wix", "Squarespace", "Custom API"].map(p => (
            <div key={p} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">{p}</span>
              <Badge variant="outline" className="text-[8px] ml-auto">Soon</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
