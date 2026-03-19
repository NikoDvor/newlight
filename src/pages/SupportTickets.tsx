import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Headphones, Search, MessageSquare, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["Technical", "Booking", "Billing", "Calendar", "CRM", "Website", "SEO", "Ads", "Social", "Team Access", "Training", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const STATUS_STYLE: Record<string, string> = {
  New: "bg-blue-50 text-blue-700",
  Open: "bg-cyan-50 text-cyan-700",
  "In Progress": "bg-indigo-50 text-indigo-700",
  "Waiting on Client": "bg-amber-50 text-amber-700",
  Escalated: "bg-red-50 text-red-600",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-secondary text-muted-foreground",
};

const PRIORITY_STYLE: Record<string, string> = {
  Urgent: "bg-red-50 text-red-600",
  High: "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-secondary text-muted-foreground",
};

export default function SupportTickets() {
  const { activeClientId, user } = useWorkspace();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [form, setForm] = useState({ subject: "", description: "", category: "Other", priority: "Medium" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeClientId) return;
    const { data } = await supabase.from("support_tickets" as any).select("*").eq("client_id", activeClientId).order("created_at", { ascending: false });
    setTickets(data ?? []);
  };

  useEffect(() => { load(); }, [activeClientId]);

  const create = async () => {
    if (!activeClientId || !form.subject) return;
    setSaving(true);
    await supabase.from("support_tickets" as any).insert({
      client_id: activeClientId,
      ticket_subject: form.subject,
      ticket_description: form.description,
      ticket_category: form.category,
      ticket_priority: form.priority,
      created_by_user_id: user?.id,
    } as any);
    toast({ title: "Ticket created" });
    setShowCreate(false);
    setForm({ subject: "", description: "", category: "Other", priority: "Medium" });
    setSaving(false);
    load();
  };

  const openDetail = async (ticket: any) => {
    setShowDetail(ticket);
    const { data } = await supabase.from("support_comments" as any).select("*").eq("ticket_id", ticket.id).eq("is_internal", false).order("created_at", { ascending: true });
    setComments(data ?? []);
  };

  const addComment = async () => {
    if (!showDetail || !newComment || !activeClientId) return;
    await supabase.from("support_comments" as any).insert({
      ticket_id: showDetail.id,
      client_id: activeClientId,
      author_user_id: user?.id,
      is_internal: false,
      comment_body: newComment,
    } as any);
    setNewComment("");
    openDetail(showDetail);
  };

  const filtered = tickets.filter(t =>
    t.ticket_subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <PageHeader title="Support Tickets" subtitle="Submit and track support requests" />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Ticket</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border"><CardContent className="p-8 text-center">
          <Headphones className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No Tickets Yet</p>
          <p className="text-sm text-muted-foreground mt-1">Submit a support ticket and we'll get back to you quickly.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Create Ticket</Button>
        </CardContent></Card>
      ) : filtered.map(t => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => openDetail(t)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{t.ticket_subject}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.ticket_description}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Badge className={STATUS_STYLE[t.ticket_status] || "bg-secondary"} variant="secondary">{t.ticket_status}</Badge>
                    <Badge className={PRIORITY_STYLE[t.ticket_priority] || "bg-secondary"} variant="secondary">{t.ticket_priority}</Badge>
                    <Badge variant="outline">{t.ticket_category}</Badge>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Create Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Support Ticket</SheetTitle>
            <SheetDescription>Describe your issue and we'll help you resolve it.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Brief summary of your issue" /></div>
            <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue in detail…" /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={create} disabled={saving || !form.subject}>Submit Ticket</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <SheetContent className="overflow-y-auto">
          {showDetail && (
            <>
              <SheetHeader>
                <SheetTitle>{showDetail.ticket_subject}</SheetTitle>
                <SheetDescription>
                  <Badge className={STATUS_STYLE[showDetail.ticket_status] || "bg-secondary"} variant="secondary">{showDetail.ticket_status}</Badge>{" "}
                  <Badge className={PRIORITY_STYLE[showDetail.ticket_priority] || "bg-secondary"} variant="secondary">{showDetail.ticket_priority}</Badge>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-sm text-foreground">{showDetail.ticket_description || "No description provided."}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{new Date(showDetail.created_at).toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Comments</p>
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : comments.map(c => (
                    <div key={c.id} className="border-l-2 border-primary/20 pl-3 mb-3">
                      <p className="text-sm text-foreground">{c.comment_body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Textarea placeholder="Add a comment…" value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} className="flex-1" />
                  <Button size="sm" onClick={addComment} disabled={!newComment}>Send</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
