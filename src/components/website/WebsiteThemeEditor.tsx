import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Palette } from "lucide-react";
import type { WebsiteSite } from "@/hooks/useWebsiteSite";
import { WebsiteImageUploader } from "./WebsiteImageUploader";

const FONT_PRESETS = [
  { value: "modern", label: "Modern (Inter)" },
  { value: "elegant", label: "Elegant (Playfair Display)" },
  { value: "clean", label: "Clean (DM Sans)" },
  { value: "bold", label: "Bold (Space Grotesk)" },
  { value: "figtree", label: "Figtree" },
];

const BUTTON_STYLES = [
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
  { value: "square", label: "Square" },
];

interface Props {
  site: WebsiteSite;
  onSave: (updates: Partial<WebsiteSite>) => void;
}

export function WebsiteThemeEditor({ site, onSave }: Props) {
  const [form, setForm] = useState<Partial<WebsiteSite>>(site);

  useEffect(() => { setForm(site); }, [site]);

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    onSave({
      site_name: form.site_name, tagline: form.tagline, favicon_url: form.favicon_url,
      primary_color: form.primary_color, secondary_color: form.secondary_color,
      font_preset: form.font_preset, button_style: form.button_style,
      contact_email: form.contact_email, contact_phone: form.contact_phone,
      address: form.address, business_hours: form.business_hours,
      social_facebook: form.social_facebook, social_instagram: form.social_instagram,
      social_linkedin: form.social_linkedin, social_twitter: form.social_twitter,
      social_youtube: form.social_youtube, global_cta_text: form.global_cta_text,
      global_cta_url: form.global_cta_url,
    });
  };

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Brand Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Site Name</Label><Input value={form.site_name || ""} onChange={e => set("site_name", e.target.value)} /></div>
          <div className="space-y-2"><Label>Tagline</Label><Input value={form.tagline || ""} onChange={e => set("tagline", e.target.value)} /></div>
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Colors</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <input type="color" value={form.primary_color || "#3B82F6"} onChange={e => set("primary_color", e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer" />
              <Input value={form.primary_color || ""} onChange={e => set("primary_color", e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <input type="color" value={form.secondary_color || "#06B6D4"} onChange={e => set("secondary_color", e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer" />
              <Input value={form.secondary_color || ""} onChange={e => set("secondary_color", e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Typography & Buttons */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Typography & Buttons</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Font Preset</Label>
            <Select value={form.font_preset || "modern"} onValueChange={v => set("font_preset", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FONT_PRESETS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Button Style</Label>
            <Select value={form.button_style || "rounded"} onValueChange={v => set("button_style", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BUTTON_STYLES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Email</Label><Input value={form.contact_email || ""} onChange={e => set("contact_email", e.target.value)} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.contact_phone || ""} onChange={e => set("contact_phone", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input value={form.address || ""} onChange={e => set("address", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Business Hours</Label><Input value={form.business_hours || ""} onChange={e => set("business_hours", e.target.value)} placeholder="Mon-Fri 9am-5pm" /></div>
        </div>
      </div>

      {/* Social Links */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Social Links</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-xs">Facebook</Label><Input value={form.social_facebook || ""} onChange={e => set("social_facebook", e.target.value)} placeholder="https://facebook.com/..." /></div>
          <div className="space-y-1"><Label className="text-xs">Instagram</Label><Input value={form.social_instagram || ""} onChange={e => set("social_instagram", e.target.value)} placeholder="https://instagram.com/..." /></div>
          <div className="space-y-1"><Label className="text-xs">LinkedIn</Label><Input value={form.social_linkedin || ""} onChange={e => set("social_linkedin", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Twitter/X</Label><Input value={form.social_twitter || ""} onChange={e => set("social_twitter", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">YouTube</Label><Input value={form.social_youtube || ""} onChange={e => set("social_youtube", e.target.value)} /></div>
        </div>
      </div>

      {/* Global CTA */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Global CTA</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>CTA Button Text</Label><Input value={form.global_cta_text || ""} onChange={e => set("global_cta_text", e.target.value)} /></div>
          <div className="space-y-2"><Label>CTA URL</Label><Input value={form.global_cta_url || ""} onChange={e => set("global_cta_url", e.target.value)} placeholder="/contact" /></div>
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} className="gap-1.5"><Save className="h-4 w-4" /> Save Theme Settings</Button>
      </div>
    </div>
  );
}
