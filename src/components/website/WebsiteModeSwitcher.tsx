import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, ExternalLink, Save, Info } from "lucide-react";
import type { WebsiteSite } from "@/hooks/useWebsiteSite";

const PLATFORM_OPTIONS = [
  { value: "unknown", label: "Unknown / Not Sure" },
  { value: "wordpress", label: "WordPress" },
  { value: "wix", label: "Wix" },
  { value: "squarespace", label: "Squarespace" },
  { value: "shopify", label: "Shopify" },
  { value: "custom", label: "Custom / Other CMS" },
  { value: "other", label: "Other" },
];

interface Props {
  site: WebsiteSite;
  onSave: (updates: Partial<WebsiteSite>) => void;
}

export function WebsiteModeSwitcher({ site, onSave }: Props) {
  const [mode, setMode] = useState(site.website_mode || "hosted");
  const [externalUrl, setExternalUrl] = useState(site.external_url || "");
  const [externalDomain, setExternalDomain] = useState(site.external_domain || "");
  const [externalPlatform, setExternalPlatform] = useState(site.external_platform || "unknown");
  const [externalNotes, setExternalNotes] = useState(site.external_notes || "");

  useEffect(() => {
    setMode(site.website_mode || "hosted");
    setExternalUrl(site.external_url || "");
    setExternalDomain(site.external_domain || "");
    setExternalPlatform(site.external_platform || "unknown");
    setExternalNotes(site.external_notes || "");
  }, [site]);

  const handleSave = () => {
    onSave({
      website_mode: mode as "hosted" | "external",
      external_url: externalUrl,
      external_domain: externalDomain,
      external_platform: externalPlatform,
      external_notes: externalNotes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Website Mode</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setMode("hosted")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              mode === "hosted"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">NewLight Hosted</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Full website built & published from this app
            </p>
          </button>
          <button
            onClick={() => setMode("external")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              mode === "external"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <ExternalLink className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">External Website</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Existing site — manage content here, sync/export to your site
            </p>
          </button>
        </div>
      </div>

      {/* External site config */}
      {mode === "external" && (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Content managed in NewLight is your canonical source. Export or embed it on your external site. 
              Direct publishing to external platforms is not yet enabled — content is sync/export-ready.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={externalDomain}
                onChange={e => setExternalDomain(e.target.value)}
                placeholder="example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>CMS / Platform</Label>
            <Select value={externalPlatform} onValueChange={setExternalPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Internal Setup Notes</Label>
            <Textarea
              value={externalNotes}
              onChange={e => setExternalNotes(e.target.value)}
              placeholder="Login details, CMS access instructions, or implementation notes..."
              rows={3}
            />
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="gap-1.5">
        <Save className="h-4 w-4" /> Save Website Mode
      </Button>
    </div>
  );
}
