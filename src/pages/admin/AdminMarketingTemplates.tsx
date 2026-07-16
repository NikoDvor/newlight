import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Power } from "lucide-react";

const MATERIAL_TYPES = [
  "email", "social_post", "ad", "landing_page", "video", "print", "other",
];

interface Template {
  id: string;
  title: string;
  category: string;
  material_type: string;
  template_text: string;
  is_active: boolean;
  updated_at: string;
}

const emptyForm = {
  title: "",
  category: "",
  material_type: "email",
  template_text: "",
  is_active: true,
};

export default function AdminMarketingTemplates() {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_content_templates" as any)
      .select("*")
      .order("category")
      .order("title");
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []) as Template[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); };
  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      title: t.title, category: t.category, material_type: t.material_type,
      template_text: t.template_text, is_active: t.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.category.trim() || !form.template_text.trim()) {
      toast.error("Title, category, and template text are required");
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("marketing_content_templates" as any)
        .update(form as any)
        .eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Template updated");
    } else {
      const { error } = await supabase
        .from("marketing_content_templates" as any)
        .insert(form as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Template created");
    }
    setShowForm(false);
    await load();
  };

  const toggleActive = async (t: Template) => {
    const { error } = await supabase
      .from("marketing_content_templates" as any)
      .update({ is_active: !t.is_active } as any)
      .eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing Content Templates</h1>
          <p className="text-sm text-white/50 mt-1">
            Global, compliance-safe starter templates. Available in every client's "New Material" dialog.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="text-white/50 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-white/50 text-sm">No templates yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((t) => (
            <Card key={t.id} className="border-0 bg-white/[0.04]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{t.title}</div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{t.category}</Badge>
                      <Badge variant="outline">{t.material_type}</Badge>
                      {!t.is_active && <Badge variant="destructive">inactive</Badge>}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/60 line-clamp-4 whitespace-pre-wrap">
                  {t.template_text}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(t)}>
                    <Power className="h-3 w-3 mr-1" /> {t.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Social Security"
                />
              </div>
              <div>
                <Label>Material Type</Label>
                <Select value={form.material_type} onValueChange={(v) => setForm({ ...form, material_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Template Text</Label>
              <Textarea
                rows={12}
                value={form.template_text}
                onChange={(e) => setForm({ ...form, template_text: e.target.value })}
                placeholder="Use {{first_name}} and similar tokens for merge fields."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active (visible in the New Material picker)
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save Changes" : "Create Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
