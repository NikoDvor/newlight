import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import {
  Clock, CheckCircle2, AlertTriangle, ArrowRight, Plus, Search,
  Briefcase, Headphones, CreditCard, RefreshCw, Star, SkipForward,
  MessageSquare, Calendar
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
};

export default function FollowUpQueue() {
  const { activeClientId, isAdmin } = useWorkspace();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: "Sales Follow-Up", priority: "Medium", notes: "", due: "" });

  const load = async () => {
    let q = supabase.from("follow_up_queues" as any).select("*").order("due_at", { ascending: true }).limit(100);
    if (!isAdmin && activeClientId) q = q.eq("client_id", activeClientId);
    const { data } = await q;
    // Mark overdue
    const now = new Date();
    setItems((data ?? []).map((i: any) => ({
      ...i,
      status: i.status === "Pending" && i.due_at && new Date(i.due_at) < now ? "Overdue" : i.status,
    })));
  };

  useEffect(() => { load(); }, [activeClientId, isAdmin]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("follow_up_queues" as any).update({ status } as any).eq("id", id);
    load();
  };

  const create = async () => {
    const payload: any = {
      queue_type: form.type,
      priority: form.priority,
      notes: form.notes,
      due_at: form.due || null,
      status: "Pending",
    };
    if (activeClientId) payload.client_id = activeClientId;
    await supabase.from("follow_up_queues" as any).insert(payload);
    toast({ title: "Follow-up created" });
    setShowCreate(false);
    setForm({ type: "Sales Follow-Up", priority: "Medium", notes: "", due: "" });
    load();
  };

  const filtered = items.filter(i => {
    if (tab !== "all" && i.status !== tab) return false;
    if (search && !i.notes?.toLowerCase().includes(search.toLowerCase()) && !i.queue_type?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <PageHeader title="Follow-Up Queue" description="Track and manage all pending follow-ups">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </PageHeader>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search follow-ups…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", "Pending", "Overdue", "In Progress", "Completed"].map(s => (
            <Button key={s} size="sm" variant={tab === s ? "default" : "ghost"} className="h-8 text-xs"
              onClick={() => setTab(s)}>{s === "all" ? "All" : s}</Button>
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
        return (
          <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <TIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{item.queue_type}</p>
                  {item.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.notes}</p>}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Badge className={STATUS_STYLE[item.status] || "bg-secondary"} variant="secondary">{item.status}</Badge>
                    <Badge className={PRIORITY_STYLE[item.priority] || "bg-secondary"} variant="secondary">{item.priority}</Badge>
                    {item.due_at && (
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />{new Date(item.due_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.status !== "Completed" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => updateStatus(item.id, "Completed")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Done
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => updateStatus(item.id, "Skipped")}>
                        <SkipForward className="h-3 w-3" />
                      </Button>
                    </>
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
            <div><Label>Due Date</Label><Input type="date" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={create}>Create Follow-Up</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
