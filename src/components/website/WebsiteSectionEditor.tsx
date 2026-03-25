import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  GripVertical, Plus, Pencil, Trash2, Eye, EyeOff, Save,
  Sparkles, Type, Image, ShoppingBag, Package, MousePointerClick,
  MessageSquare, HelpCircle, Mail, Calendar, Star,
} from "lucide-react";
import { motion } from "framer-motion";
import type { WebsiteSection } from "@/hooks/useWebsiteSections";
import { SECTION_TYPES } from "@/hooks/useWebsiteSections";
import { WebsiteImageUploader } from "./WebsiteImageUploader";

const ICON_MAP: Record<string, any> = {
  Sparkles, Type, Image, ShoppingBag, Package, MousePointerClick,
  MessageSquare, HelpCircle, Mail, Calendar, Star,
};

interface Props {
  sections: WebsiteSection[];
  pageKey: string;
  onAdd: (type: string) => void;
  onUpdate: (id: string, updates: Partial<WebsiteSection>) => void;
  onDelete: (id: string) => void;
  clientId: string;
}

export function WebsiteSectionEditor({ sections, pageKey, onAdd, onUpdate, onDelete, clientId }: Props) {
  const [editing, setEditing] = useState<WebsiteSection | null>(null);
  const [form, setForm] = useState<any>({});

  const openEdit = (section: WebsiteSection) => {
    const cj = typeof section.content_json === "string" ? JSON.parse(section.content_json) : (section.content_json || {});
    setForm({ ...section, content_json: cj });
    setEditing(section);
  };

  const save = () => {
    if (!editing) return;
    onUpdate(editing.id, {
      block_label: form.block_label,
      content_json: form.content_json,
      is_active: form.is_active,
    });
    setEditing(null);
  };

  const updateField = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, content_json: { ...p.content_json, [key]: value } }));
  };

  return (
    <div>
      {sections.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">No sections on this page yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {sections.map((section, i) => {
            const cj = typeof section.content_json === "string" ? JSON.parse(section.content_json) : (section.content_json || {});
            const typeInfo = SECTION_TYPES.find(t => t.value === section.block_type);
            const Icon = ICON_MAP[typeInfo?.icon || "Type"] || Type;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-3 rounded-xl border border-border group transition-colors ${
                  !section.is_active ? "opacity-50" : "hover:bg-secondary/50"
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{section.block_label || section.block_type}</span>
                    {!section.is_active && <Badge variant="outline" className="text-[9px]">Hidden</Badge>}
                  </div>
                  {cj.heading && <p className="text-[10px] text-muted-foreground truncate">{cj.heading}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(section)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate(section.id, { is_active: !section.is_active })}>
                    {section.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(section.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Section Palette */}
      <div className="border-2 border-dashed border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">Add Section</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {SECTION_TYPES.map((st) => {
            const Icon = ICON_MAP[st.icon] || Type;
            return (
              <button
                key={st.value}
                onClick={() => onAdd(st.value)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={!!editing} onOpenChange={() => setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Edit Section</SheetTitle></SheetHeader>
          {editing && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Section Label</Label>
                <Input value={form.block_label || ""} onChange={e => setForm((p: any) => ({ ...p, block_label: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm((p: any) => ({ ...p, is_active: v }))} />
                <Label>Visible on site</Label>
              </div>
              <div className="space-y-2">
                <Label>Heading</Label>
                <Input value={form.content_json?.heading || ""} onChange={e => updateField("heading", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subheading</Label>
                <Input value={form.content_json?.subheading || ""} onChange={e => updateField("subheading", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Body Text</Label>
                <Textarea value={form.content_json?.body || ""} onChange={e => updateField("body", e.target.value)} rows={4} />
              </div>
              {(form.block_type === "CTA" || form.block_type === "Hero" || form.block_type === "BookingBlock") && (
                <>
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input value={form.content_json?.buttonText || ""} onChange={e => updateField("buttonText", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Button URL</Label>
                    <Input value={form.content_json?.buttonUrl || ""} onChange={e => updateField("buttonUrl", e.target.value)} placeholder="/contact or https://..." />
                  </div>
                </>
              )}
              {(form.block_type === "Hero" || form.block_type === "ImageText" || form.block_type === "Gallery") && (
                <div className="space-y-2">
                  <Label>Image</Label>
                  <WebsiteImageUploader
                    clientId={clientId}
                    currentUrl={form.content_json?.imageUrl || ""}
                    onUpload={(url) => updateField("imageUrl", url)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Background Style</Label>
                <Input value={form.content_json?.bgStyle || ""} onChange={e => updateField("bgStyle", e.target.value)} placeholder="e.g. light, dark, gradient" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
                <Button className="flex-1" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
