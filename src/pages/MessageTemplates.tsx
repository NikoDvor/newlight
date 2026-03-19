import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Search, FileText, Mail, Phone, MessageSquare, Copy, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const CATEGORIES = [
  "Sales Follow-Up", "Meeting Reminder", "Proposal Follow-Up", "Activation Welcome",
  "Booking Confirmation", "Booking Reminder", "Support Update", "Billing Reminder",
  "Review Request", "Internal Notification", "General",
];
const CHANNELS = ["Email", "SMS", "InApp"];
const CHANNEL_ICON: Record<string, any> = { Email: Mail, SMS: Phone, InApp: MessageSquare };

export default function MessageTemplates() {
  const { activeClientId, isAdmin, user } = useWorkspace();
  const [templates, setTemplates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showEdit, setShowEdit] = useState<any>(null); // null=closed, {}=new, {id:..}=edit
  const [form, setForm] = useState({ name: "", category: "General", channel: "Email", subject: "", body: "", active: true, scope: "admin_global" });

  const load = async () => {
    let q = supabase.from("message_templates" as any).select("*").order("created_at", { ascending: false });
    if (!isAdmin && activeClientId) q = q.eq("client_id", activeClientId);
    const { data } = await q;
    setTemplates(data ?? []);
  };

  useEffect(() => { load(); }, [activeClientId, isAdmin]);

  const openNew = () => {
    setForm({ name: "", category: "General", channel: "Email", subject: "", body: "", active: true, scope: isAdmin ? "admin_global" : "client_workspace" });
    setShowEdit({});
  };

  const openEdit = (t: any) => {
    setForm({
      name: t.template_name, category: t.template_category, channel: t.channel,
      subject: t.subject_template || "", body: t.body_template, active: t.is_active,
      scope: t.template_scope_type,
    });
    setShowEdit(t);
  };

  const save = async () => {
    const payload: any = {
      template_name: form.name,
      template_category: form.category,
      channel: form.channel,
      subject_template: form.subject || null,
      body_template: form.body,
      is_active: form.active,
      template_scope_type: form.scope,
    };
    if (form.scope === "client_workspace" && activeClientId) payload.client_id = activeClientId;
    if (!showEdit?.id) {
      payload.created_by = user?.id;
      await supabase.from("message_templates" as any).insert(payload);
      toast({ title: "Template created" });
    } else {
      await supabase.from("message_templates" as any).update(payload).eq("id", showEdit.id);
      toast({ title: "Template updated" });
    }
    setShowEdit(null);
    load();
  };

  const duplicate = async (t: any) => {
    await supabase.from("message_templates" as any).insert({
      template_name: `${t.template_name} (Copy)`,
      template_category: t.template_category,
      channel: t.channel,
      subject_template: t.subject_template,
      body_template: t.body_template,
      is_active: false,
      template_scope_type: t.template_scope_type,
      client_id: t.client_id,
      created_by: user?.id,
    } as any);
    toast({ title: "Template duplicated" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("message_templates" as any).delete().eq("id", id);
    toast({ title: "Template deleted" });
    load();
  };

  const filtered = templates.filter(t =>
    t.template_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.template_category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <PageHeader title="Message Templates" description="Create and manage reusable communication templates">
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Template</Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search templates…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border"><CardContent className="p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No Templates Yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create message templates for follow-ups, reminders, and notifications.</p>
          <Button className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Create Template</Button>
        </CardContent></Card>
      ) : filtered.map(t => {
        const ChIcon = CHANNEL_ICON[t.channel] || FileText;
        return (
          <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <ChIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{t.template_name}</p>
                    {!t.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.body_template}</p>
                  <div className="flex gap-1.5 mt-2">
                    <Badge variant="outline">{t.template_category}</Badge>
                    <Badge variant="outline">{t.channel}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{t.template_scope_type === "admin_global" ? "Global" : "Workspace"}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => duplicate(t)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <Sheet open={showEdit !== null} onOpenChange={() => setShowEdit(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{showEdit?.id ? "Edit Template" : "New Template"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.channel === "Email" && <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>}
            <div><Label>Body</Label><Textarea rows={6} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Use {{contact_name}}, {{company}}, etc." /></div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
            </div>
            <Button className="w-full" onClick={save} disabled={!form.name || !form.body}>Save Template</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
