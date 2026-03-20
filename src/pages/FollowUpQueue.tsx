import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import {
  Clock, CheckCircle2, Plus, Search,
  Briefcase, Headphones, CreditCard, RefreshCw, Star, SkipForward,
  MessageSquare, Calendar, User, ExternalLink, AlarmClock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-600",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Skipped: "bg-secondary text-muted-foreground",
  Overdue: "bg-red-50 text-red-600",
  Snoozed: "bg-violet-50 text-violet-600",
};

const PRIORITY_STYLE: Record<string, string> = {
  Urgent: "bg-red-50 text-red-600",
  High: "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-secondary text-muted-foreground",
};

const TYPE_ICON: Record<string, any> = {
  "Sales Follow-Up": Briefcase,
  "Proposal Follow-Up": MessageSquare,
  "Booking Follow-Up": Calendar,
  "Support Follow-Up": Headphones,
  "Billing Follow-Up": CreditCard,
  "Renewal Follow-Up": RefreshCw,
  "Review Recovery": Star,
  "New Lead Follow-Up": User,
  "Post-Form Follow-Up": MessageSquare,
  "No-Show Follow-Up": AlarmClock,
  "General Follow-Up": Clock,
};

export default function FollowUpQueue() {
  const navigate = useNavigate();
  const { activeClientId, isAdmin } = useWorkspace();
  const [items, setItems] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: "Sales Follow-Up", priority: "Medium", notes: "", due: "", contact_id: "", assigned_user_id: "" });

  const load = async () => {
    const clientId = activeClientId;
    let q = supabase.from("follow_up_queues" as any).select("*").order("due_at", { ascending: true }).limit(100);
    if (!isAdmin && clientId) q = q.eq("client_id", clientId);

    const [fuRes, cRes, tmRes] = await Promise.all([
      q,
      clientId ? supabase.from("crm_contacts").select("id, full_name, email").eq("client_id", clientId).limit(500) : Promise.resolve({ data: [] }),
      clientId ? supabase.from("workspace_users").select("id, user_id, full_name").eq("client_id", clientId) : Promise.resolve({ data: [] }),
    ]);
    setContacts(cRes.data || []);
    setTeamMembers(tmRes.data || []);

    const now = new Date();
    setItems((data ?? []).map((i: any) => ({
      ...i,
      status: i.status === "Pending" && i.due_at && new Date(i.due_at) < now ? "Overdue" : i.status,
    })));
  };

  useEffect(() => { load(); }, [activeClientId, isAdmin]);

  const getContactName = (id: string) => contacts.find(c => c.id === id)?.full_name || null;
  const getOwnerName = (userId: string) => teamMembers.find(t => t.user_id === userId)?.full_name || null;

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("follow_up_queues" as any).update({ status } as any).eq("id", id);
    if (status === "Completed") {
      await supabase.from("crm_activities").insert({
        client_id: activeClientId, activity_type: "follow_up_completed",
        activity_note: `Follow-up completed`,
      } as any);
    }
    load();
  };

  const snooze = async (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    await supabase.from("follow_up_queues" as any).update({ status: "Snoozed", due_at: tomorrow.toISOString() } as any).eq("id", id);
    toast({ title: "Snoozed until tomorrow 9 AM" });
    load();
  };

  const reassign = async (id: string, userId: string) => {
    await supabase.from("follow_up_queues" as any).update({ assigned_user_id: userId } as any).eq("id", id);
    toast({ title: "Reassigned" });
    load();
  };

  const create = async () => {
    const payload: any = {
      queue_type: form.type,
      priority: form.priority,
      notes: form.notes,
      due_at: form.due || null,
      status: "Pending",
      assigned_user_id: form.assigned_user_id || null,
    };
    if (form.contact_id) {
      payload.related_type = "contact";
      payload.related_id = form.contact_id;
    }
    if (activeClientId) payload.client_id = activeClientId;
    await supabase.from("follow_up_queues" as any).insert(payload);
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "follow_up_created",
      activity_note: `Follow-up created: ${form.type}`,
    } as any);
    toast({ title: "Follow-up created" });
    setShowCreate(false);
    setForm({ type: "Sales Follow-Up", priority: "Medium", notes: "", due: "", contact_id: "", assigned_user_id: "" });
    load();
  };

  const filtered = items.filter(i => {
    if (tab !== "all" && i.status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      const contactName = i.related_id && i.related_type === "contact" ? getContactName(i.related_id)?.toLowerCase() : "";
      if (!i.notes?.toLowerCase().includes(q) && !i.queue_type?.toLowerCase().includes(q) && !contactName?.includes(q)) return false;
    }
    return true;
  });

  const overdueCount = items.filter(i => i.status === "Overdue").length;
  const pendingCount = items.filter(i => i.status === "Pending").length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <PageHeader title="Follow-Up Queue" description={`${pendingCount} pending · ${overdueCount} overdue`}>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </PageHeader>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search follow-ups or contacts…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", "Pending", "Overdue", "Snoozed", "In Progress", "Completed"].map(s => (
            <Button key={s} size="sm" variant={tab === s ? "default" : "ghost"} className="h-8 text-xs"
              onClick={() => setTab(s)}>{s === "all" ? "All" : s}
              {s === "Overdue" && overdueCount > 0 && <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">{overdueCount}</Badge>}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border"><CardContent className="p-8 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
          <p className="font-semibold text-foreground">Queue Clear</p>
          <p className="text-sm text-muted-foreground mt-1">No follow-ups matching your filter. Create one to get started.</p>
        </CardContent></Card>
      ) : filtered.map(item => {
        const TIcon = TYPE_ICON[item.queue_type] || Clock;
        const contactName = item.related_id && item.related_type === "contact" ? getContactName(item.related_id) : null;
        const ownerName = item.assigned_user_id ? getOwnerName(item.assigned_user_id) : null;
        return (
          <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <TIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">{item.queue_type}</p>
                    {contactName && (
                      <button onClick={() => navigate(`/crm/contacts/${item.related_id}`)}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5">
                        <User className="h-3 w-3" />{contactName}
                      </button>
                    )}
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.notes}</p>}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Badge className={STATUS_STYLE[item.status] || "bg-secondary"} variant="secondary">{item.status}</Badge>
                    <Badge className={PRIORITY_STYLE[item.priority] || "bg-secondary"} variant="secondary">{item.priority}</Badge>
                    {item.due_at && (
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />{new Date(item.due_at).toLocaleDateString()}
                      </Badge>
                    )}
                    {ownerName && (
                      <Badge variant="outline" className="text-[10px]">
                        <User className="h-3 w-3 mr-1" />{ownerName}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap">
                  {item.status !== "Completed" && item.status !== "Skipped" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => updateStatus(item.id, "Completed")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Done
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => snooze(item.id)} title="Snooze to tomorrow">
                        <AlarmClock className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => updateStatus(item.id, "Skipped")}>
                        <SkipForward className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {contactName && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => navigate(`/crm/contacts/${item.related_id}`)} title="Open contact">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader><SheetTitle>New Follow-Up</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TYPE_ICON).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Low", "Medium", "High", "Urgent"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {contacts.length > 0 && (
              <div><Label>Linked Contact</Label>
                <Select value={form.contact_id} onValueChange={v => setForm(p => ({ ...p, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {teamMembers.length > 0 && (
              <div><Label>Assign To</Label>
                <Select value={form.assigned_user_id} onValueChange={v => setForm(p => ({ ...p, assigned_user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{teamMembers.map(t => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Due Date</Label><Input type="date" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={create}>Create Follow-Up</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
