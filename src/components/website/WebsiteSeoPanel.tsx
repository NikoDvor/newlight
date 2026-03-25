import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Search, Globe } from "lucide-react";
import type { WebsitePage } from "@/hooks/useWebsitePages";
import { WebsiteImageUploader } from "./WebsiteImageUploader";

interface Props {
  page: WebsitePage;
  onSave: (id: string, updates: Partial<WebsitePage>) => void;
  clientId: string;
}

export function WebsiteSeoPanel({ page, onSave, clientId }: Props) {
  const [form, setForm] = useState({
    seo_title: page.seo_title || "",
    seo_description: page.seo_description || "",
    og_image_url: page.og_image_url || "",
    noindex: page.noindex || false,
    slug: page.slug || "",
  });

  useEffect(() => {
    setForm({
      seo_title: page.seo_title || "",
      seo_description: page.seo_description || "",
      og_image_url: page.og_image_url || "",
      noindex: page.noindex || false,
      slug: page.slug || "",
    });
  }, [page.id]);

  const handleSave = () => {
    onSave(page.id, form as any);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Page Slug</Label>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Globe className="h-3 w-3" /> yoursite.com/<span className="font-medium">{form.slug || "page"}</span>
        </div>
        <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />
      </div>

      <div className="space-y-2">
        <Label>SEO Title <span className="text-muted-foreground text-xs">({(form.seo_title || "").length}/60)</span></Label>
        <Input value={form.seo_title} onChange={e => setForm(p => ({ ...p, seo_title: e.target.value }))} placeholder={page.page_name} maxLength={70} />
      </div>

      <div className="space-y-2">
        <Label>Meta Description <span className="text-muted-foreground text-xs">({(form.seo_description || "").length}/160)</span></Label>
        <Textarea value={form.seo_description} onChange={e => setForm(p => ({ ...p, seo_description: e.target.value }))} maxLength={170} rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Social Share Image (OG Image)</Label>
        <WebsiteImageUploader clientId={clientId} currentUrl={form.og_image_url} onUpload={url => setForm(p => ({ ...p, og_image_url: url }))} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.noindex} onCheckedChange={v => setForm(p => ({ ...p, noindex: v }))} />
        <Label>Hide from search engines (noindex)</Label>
      </div>

      {/* Preview */}
      <div className="border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Search className="h-3 w-3" /> Search Preview</p>
        <p className="text-sm font-medium text-primary truncate">{form.seo_title || page.page_name || "Page Title"}</p>
        <p className="text-xs text-emerald-600 truncate">yoursite.com/{form.slug || "page"}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{form.seo_description || "Add a meta description for this page..."}</p>
      </div>

      <Button onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save SEO Settings</Button>
    </div>
  );
}
