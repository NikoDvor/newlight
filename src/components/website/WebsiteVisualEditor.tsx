import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Monitor, Smartphone, Plus, Trash2, Eye, EyeOff, Save, Copy,
  ChevronUp, ChevronDown, GripVertical, X, PanelRightClose, PanelRightOpen,
  Sparkles, Type, Image, ShoppingBag, Package, MousePointerClick,
  MessageSquare, HelpCircle, Mail, Calendar, Star, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WebsiteSection } from "@/hooks/useWebsiteSections";
import { SECTION_TYPES } from "@/hooks/useWebsiteSections";
import type { WebsiteSite } from "@/hooks/useWebsiteSite";
import { WebsiteImageUploader } from "./WebsiteImageUploader";
import { useIsMobile } from "@/hooks/use-mobile";

const ICON_MAP: Record<string, any> = {
  Sparkles, Type, Image, ShoppingBag, Package, MousePointerClick,
  MessageSquare, HelpCircle, Mail, Calendar, Star,
};

interface Props {
  sections: WebsiteSection[];
  site: WebsiteSite | null;
  pageName: string;
  pageKey: string;
  onAdd: (type: string) => void;
  onUpdate: (id: string, updates: Partial<WebsiteSection>) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  clientId: string;
  isExternal?: boolean;
}

/* ── Section renderer (shared with preview) ── */
function renderSection(section: WebsiteSection, site: WebsiteSite | null) {
  const cj = typeof section.content_json === "string" ? JSON.parse(section.content_json) : (section.content_json || {});
  if (!section.is_active) return null;
  const primary = site?.primary_color || "#3B82F6";
  const btnRadius = site?.button_style === "pill" ? "9999px" : site?.button_style === "square" ? "4px" : "12px";

  switch (section.block_type) {
    case "Hero":
      return (
        <div className="py-12 px-6 text-center" style={{ background: `linear-gradient(135deg, ${primary}11, ${primary}05)` }}>
          {cj.imageUrl && <img src={cj.imageUrl} alt={cj.altText || ""} className="w-full max-h-48 object-cover rounded-xl mb-4" />}
          <h1 className="text-2xl font-bold mb-2" style={{ color: primary }}>{cj.heading || "Welcome"}</h1>
          {cj.subheading && <p className="text-sm text-muted-foreground mb-2">{cj.subheading}</p>}
          {cj.body && <p className="text-sm max-w-md mx-auto mb-4">{cj.body}</p>}
          {cj.buttonText && (
            <span className="inline-block px-6 py-2.5 text-sm font-medium text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText}
            </span>
          )}
        </div>
      );
    case "RichText":
      return (
        <div className="py-8 px-6">
          {cj.heading && <h2 className="text-lg font-semibold mb-2">{cj.heading}</h2>}
          {cj.body && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{cj.body}</p>}
        </div>
      );
    case "ImageText":
      return (
        <div className="py-8 px-6 flex flex-col sm:flex-row gap-6 items-center">
          {cj.imageUrl && <img src={cj.imageUrl} alt={cj.altText || ""} className="w-full sm:w-1/2 rounded-xl object-cover max-h-48" />}
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
            <span className="inline-block px-6 py-2.5 text-sm font-medium text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText}
            </span>
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
            <input className="w-full border rounded-lg px-3 py-2 text-sm bg-white" placeholder="Your Name" readOnly />
            <input className="w-full border rounded-lg px-3 py-2 text-sm bg-white" placeholder="Your Email" readOnly />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm bg-white" placeholder="Message" rows={2} readOnly />
            <span className="inline-block px-6 py-2 text-sm font-medium text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText || "Send Message"}
            </span>
          </div>
        </div>
      );
    default:
      return (
        <div className="py-6 px-6">
          {cj.heading && <h2 className="text-lg font-semibold mb-2">{cj.heading}</h2>}
          {cj.body && <p className="text-sm text-muted-foreground">{cj.body}</p>}
          {!cj.heading && !cj.body && (
            <p className="text-sm text-muted-foreground italic">Empty {section.block_label || section.block_type} section — click to edit</p>
          )}
        </div>
      );
  }
}

/* ── Inspector Panel Content ── */
function InspectorContent({
  section, onUpdate, onDelete, onClose, clientId,
}: {
  section: WebsiteSection;
  onUpdate: (id: string, updates: Partial<WebsiteSection>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  clientId: string;
}) {
  const cj = typeof section.content_json === "string" ? JSON.parse(section.content_json) : (section.content_json || {});
  const [form, setForm] = useState({ ...cj });
  const [label, setLabel] = useState(section.block_label || "");
  const [active, setActive] = useState(section.is_active);

  // Reset form when section changes
  useEffect(() => {
    const parsed = typeof section.content_json === "string" ? JSON.parse(section.content_json) : (section.content_json || {});
    setForm({ ...parsed });
    setLabel(section.block_label || "");
    setActive(section.is_active);
  }, [section.id, section.content_json, section.block_label, section.is_active]);

  const updateField = (key: string, value: any) => {
    setForm((p: any) => ({ ...p, [key]: value }));
  };

  const save = () => {
    onUpdate(section.id, {
      block_label: label,
      content_json: form,
      is_active: active,
    });
  };

  const typeInfo = SECTION_TYPES.find(t => t.value === section.block_type);
  const Icon = ICON_MAP[typeInfo?.icon || "Type"] || Type;
  const showButton = ["CTA", "Hero", "BookingBlock", "ContactBlock", "ReviewsCTA"].includes(section.block_type);
  const showImage = ["Hero", "ImageText", "Gallery"].includes(section.block_type);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold flex-1 truncate">{typeInfo?.label || section.block_type}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Section Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} className="h-8 text-sm" />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label className="text-xs">Visible on site</Label>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-1.5">
            <Label className="text-xs">Heading</Label>
            <Input value={form.heading || ""} onChange={e => updateField("heading", e.target.value)} className="h-8 text-sm" />
          </div>

          {section.block_type === "Hero" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Subheading</Label>
              <Input value={form.subheading || ""} onChange={e => updateField("subheading", e.target.value)} className="h-8 text-sm" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Body Text</Label>
            <Textarea value={form.body || ""} onChange={e => updateField("body", e.target.value)} rows={3} className="text-sm" />
          </div>

          {showButton && (
            <>
              <div className="h-px bg-border" />
              <div className="space-y-1.5">
                <Label className="text-xs">Button Text</Label>
                <Input value={form.buttonText || ""} onChange={e => updateField("buttonText", e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Button URL</Label>
                <Input value={form.buttonUrl || ""} onChange={e => updateField("buttonUrl", e.target.value)} className="h-8 text-sm" placeholder="/contact or https://..." />
              </div>
            </>
          )}

          {showImage && (
            <>
              <div className="h-px bg-border" />
              <div className="space-y-1.5">
                <Label className="text-xs">Image</Label>
                <WebsiteImageUploader
                  clientId={clientId}
                  currentUrl={form.imageUrl || ""}
                  onUpload={(url) => updateField("imageUrl", url)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alt Text</Label>
                <Input value={form.altText || ""} onChange={e => updateField("altText", e.target.value)} className="h-8 text-sm" placeholder="Describe the image" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Background Style</Label>
            <Input value={form.bgStyle || ""} onChange={e => updateField("bgStyle", e.target.value)} className="h-8 text-sm" placeholder="light, dark, gradient" />
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 p-3 border-t border-border shrink-0">
        <Button size="sm" variant="destructive" className="gap-1" onClick={() => { onDelete(section.id); onClose(); }}>
          <Trash2 className="h-3 w-3" /> Remove
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="gap-1" onClick={save}>
          <Save className="h-3 w-3" /> Save
        </Button>
      </div>
    </div>
  );
}

/* ── Add Section Popover ── */
function AddSectionMenu({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute left-1/2 -translate-x-1/2 z-30 w-[280px] bg-card border border-border rounded-xl shadow-lg p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Section</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}><X className="h-3 w-3" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto">
        {SECTION_TYPES.map((st) => {
          const Icon = ICON_MAP[st.icon] || Type;
          return (
            <button
              key={st.value}
              onClick={() => { onAdd(st.value); onClose(); }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-medium">{st.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Main Visual Editor ── */
export function WebsiteVisualEditor({
  sections, site, pageName, pageKey, onAdd, onUpdate, onDelete, onReorder, clientId, isExternal,
}: Props) {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showNavigator, setShowNavigator] = useState(!isMobile);
  const [addMenuAt, setAddMenuAt] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedSection = sections.find(s => s.id === selectedId) || null;

  // External page guard
  if (isExternal) {
    return (
      <div className="py-12 text-center">
        <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-1">This is an external reference page.</p>
        <p className="text-xs text-muted-foreground">Create or open a hosted copy to visually edit it in NewLight.</p>
      </div>
    );
  }

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const ids = sections.map(s => s.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    onReorder(ids);
  };

  const duplicateSection = (section: WebsiteSection) => {
    onAdd(section.block_type);
    // The new section gets default content; user can then edit
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setShowNavigator(!showNavigator)}>
          <Layers className="h-3.5 w-3.5" />
          {showNavigator ? "Hide" : "Sections"}
        </Button>
        <div className="flex-1" />
        <div className="flex gap-1">
          <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")} className="gap-1 h-8 text-xs">
            <Monitor className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Desktop</span>
          </Button>
          <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")} className="gap-1 h-8 text-xs">
            <Smartphone className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Mobile</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-3 min-h-[500px]">
        {/* Left: Section Navigator */}
        <AnimatePresence>
          {showNavigator && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? "100%" : 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="border border-border rounded-xl bg-card h-full flex flex-col" style={{ width: isMobile ? "100%" : 200 }}>
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Sections</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-1.5 space-y-0.5">
                    {sections.map((section, i) => {
                      const typeInfo = SECTION_TYPES.find(t => t.value === section.block_type);
                      const Icon = ICON_MAP[typeInfo?.icon || "Type"] || Type;
                      const isSelected = selectedId === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setSelectedId(isSelected ? null : section.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                            isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-secondary"
                          } ${!section.is_active ? "opacity-50" : ""}`}
                        >
                          <Icon className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-[11px] font-medium truncate flex-1">
                            {section.block_label || typeInfo?.label || section.block_type}
                          </span>
                          {!section.is_active && <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t border-border">
                  <Button size="sm" variant="outline" className="w-full gap-1 h-7 text-[11px]" onClick={() => setAddMenuAt(-1)}>
                    <Plus className="h-3 w-3" /> Add Section
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: Canvas */}
        <div className="flex-1 min-w-0">
          <div
            ref={canvasRef}
            className={`border border-border rounded-2xl overflow-hidden bg-white mx-auto transition-all ${
              previewMode === "mobile" ? "max-w-[375px]" : "w-full"
            }`}
          >
            {/* Nav bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold" style={{ color: site?.primary_color }}>
                {site?.site_name || "Your Site"}
              </span>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Home</span><span>About</span><span>Services</span><span>Contact</span>
              </div>
            </div>

            {/* Sections on canvas */}
            <div>
              {sections.length === 0 ? (
                <div className="py-16 text-center relative">
                  <p className="text-sm text-muted-foreground mb-3">No sections yet. Add one to start building.</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddMenuAt(-1)}>
                    <Plus className="h-3.5 w-3.5" /> Add Section
                  </Button>
                  <AnimatePresence>
                    {addMenuAt === -1 && <AddSectionMenu onAdd={onAdd} onClose={() => setAddMenuAt(null)} />}
                  </AnimatePresence>
                </div>
              ) : (
                sections.map((section, i) => {
                  const isSelected = selectedId === section.id;
                  const isHovered = hoveredId === section.id;
                  return (
                    <div key={section.id}>
                      {/* Section block */}
                      <div
                        className={`relative cursor-pointer transition-all ${
                          isSelected
                            ? "ring-2 ring-primary ring-inset z-10"
                            : isHovered
                            ? "ring-1 ring-primary/40 ring-inset"
                            : ""
                        } ${!section.is_active ? "opacity-40" : ""}`}
                        onClick={() => setSelectedId(isSelected ? null : section.id)}
                        onMouseEnter={() => setHoveredId(section.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {/* Section type label on hover/select */}
                        {(isHovered || isSelected) && (
                          <div className="absolute top-0 left-0 z-20 flex items-center">
                            <span className="bg-primary text-primary-foreground text-[9px] font-semibold px-2 py-0.5 rounded-br-lg">
                              {section.block_label || section.block_type}
                            </span>
                          </div>
                        )}

                        {/* Quick actions on hover */}
                        {(isHovered || isSelected) && (
                          <div className="absolute top-1 right-1 z-20 flex gap-0.5">
                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-md shadow-sm" onClick={e => { e.stopPropagation(); moveSection(section.id, -1); }}>
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-md shadow-sm" onClick={e => { e.stopPropagation(); moveSection(section.id, 1); }}>
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-md shadow-sm" onClick={e => { e.stopPropagation(); onUpdate(section.id, { is_active: !section.is_active }); }}>
                              {section.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-md shadow-sm" onClick={e => { e.stopPropagation(); duplicateSection(section); }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {renderSection(section, site)}
                      </div>

                      {/* Add-between button */}
                      <div className="relative h-0 flex items-center justify-center z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); setAddMenuAt(addMenuAt === i ? null : i); }}
                          className="absolute -top-3 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity shadow-md"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <AnimatePresence>
                          {addMenuAt === i && <AddSectionMenu onAdd={onAdd} onClose={() => setAddMenuAt(null)} />}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-border text-center">
              <p className="text-[10px] text-muted-foreground">
                © {new Date().getFullYear()} {site?.site_name || "Your Business"}. All rights reserved.
              </p>
            </div>
          </div>

          {/* Bottom add button */}
          {sections.length > 0 && (
            <div className="flex justify-center mt-3 relative">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddMenuAt(sections.length - 1 + 1000)}>
                <Plus className="h-3.5 w-3.5" /> Add Section
              </Button>
              <AnimatePresence>
                {addMenuAt !== null && addMenuAt >= 1000 && (
                  <AddSectionMenu onAdd={onAdd} onClose={() => setAddMenuAt(null)} />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right: Inspector Panel (desktop) */}
        {!isMobile && selectedSection && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="shrink-0"
          >
            <div className="border border-border rounded-xl bg-card h-full flex flex-col" style={{ width: 280 }}>
              <InspectorContent
                section={selectedSection}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onClose={() => setSelectedId(null)}
                clientId={clientId}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile: Inspector Sheet */}
      {isMobile && (
        <Sheet open={!!selectedSection} onOpenChange={() => setSelectedId(null)}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            {selectedSection && (
              <InspectorContent
                section={selectedSection}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onClose={() => setSelectedId(null)}
                clientId={clientId}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

// Need Globe for external guard
import { Globe } from "lucide-react";
