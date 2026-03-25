import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Globe, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import type { WebsitePage } from "@/hooks/useWebsitePages";
import { PAGE_TEMPLATES } from "@/hooks/useWebsitePages";
import { Switch } from "@/components/ui/switch";

interface Props {
  pages: WebsitePage[];
  onSelectPage: (page: WebsitePage) => void;
  onCreatePage: (name: string, slug: string, template: string, pageSource?: "hosted" | "external", externalUrl?: string) => Promise<any>;
  onDeletePage: (id: string) => void;
  onUpdatePage: (id: string, updates: Partial<WebsitePage>) => void;
  selectedPageId?: string | null;
  websiteMode?: "hosted" | "external";
}

export function WebsitePageList({ pages, onSelectPage, onCreatePage, onDeletePage, onUpdatePage, selectedPageId, websiteMode = "hosted" }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTemplate, setNewTemplate] = useState("blank");
  const [newPageSource, setNewPageSource] = useState<"hosted" | "external">(websiteMode === "external" ? "external" : "hosted");
  const [newExternalUrl, setNewExternalUrl] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreatePage(newName, newSlug, newTemplate, newPageSource, newExternalUrl);
    setNewName(""); setNewSlug(""); setNewTemplate("blank"); setNewExternalUrl("");
    setNewPageSource(websiteMode === "external" ? "external" : "hosted");
    setCreateOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Pages ({pages.length})</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add Page
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="py-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">No pages yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create your first page to start building your website.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Page
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer group ${
                selectedPageId === page.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-secondary/50"
              }`}
              onClick={() => onSelectPage(page)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{page.page_name}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {page.publish_status === "published" ? "Published" : "Draft"}
                  </Badge>
                  {page.page_source === "external" && (
                    <Badge variant="outline" className="text-[9px] shrink-0 border-primary/30 text-primary">External</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {page.page_source === "external" && page.external_page_url
                    ? page.external_page_url
                    : `/${page.slug || page.page_name?.toLowerCase().replace(/\s+/g, "-")}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onSelectPage(page); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Create Page</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Page Template</Label>
              <Select value={newTemplate} onValueChange={(v) => {
                setNewTemplate(v);
                const tpl = PAGE_TEMPLATES.find(t => t.template === v);
                if (tpl && tpl.slug) { setNewName(tpl.label); setNewSlug(tpl.slug); }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_TEMPLATES.map(t => (
                    <SelectItem key={t.template} value={t.template}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Page Name *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. About Us" />
            </div>
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="about-us" />
              <p className="text-[10px] text-muted-foreground">Auto-generated from name if left blank</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={!newName.trim()}>Create Page</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
