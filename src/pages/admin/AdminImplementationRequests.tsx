import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Inbox, Clock, FileText, CheckCircle2, XCircle, Send, User,
  DollarSign, Search, Package, Sparkles, ArrowRight, StickyNote,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const STATUS_STYLE: Record<string, string> = {
  New: "bg-blue-50 text-blue-700",
  "In Review": "bg-amber-50 text-amber-600",
  "Proposal Needed": "bg-violet-50 text-violet-700",
  "Proposal Sent": "bg-cyan-50 text-cyan-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-600",
  Closed: "bg-secondary text-muted-foreground",
};

const URGENCY_STYLE: Record<string, string> = {
  Critical: "bg-red-50 text-red-600",
  High: "bg-orange-50 text-orange-600",
  Medium: "bg-blue-50 text-blue-700",
  Low: "bg-secondary text-muted-foreground",
};

const STATUSES = ["New", "In Review", "Proposal Needed", "Proposal Sent", "Approved", "Rejected", "Closed"];

export default function AdminImplementationRequests() {
  const navigate = useNavigate();
  const { user } = useWorkspace();
  const [requests, setRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [internalNote, setInternalNote] = useState("");

  const load = async () => {
    const [rRes, cRes] = await Promise.all([
      supabase.from("implementation_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, business_name"),
    ]);
    setRequests(rRes.data || []);
    setClients(cRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const loadEvents = async (requestId: string) => {
    const { data } = await supabase
      .from("implementation_request_events")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    setEvents(data || []);
  };

  const openRequest = (r: any) => {
    setSelected(r);
    loadEvents(r.id);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.business_name || "Unknown";

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("implementation_requests").update({ request_status: status }).eq("id", id);
    await supabase.from("implementation_request_events").insert({
      client_id: selected?.client_id, request_id: id,
      event_type: status === "Rejected" ? "Request Rejected" : status === "Approved" ? "Request Approved" : "Status Changed",
      event_summary: `Status changed to ${status}`,
      created_by: user?.id,
    });
    await supabase.from("audit_logs").insert({
      client_id: selected?.client_id, action: "implementation_request_status_changed",
      module: "monetization", user_id: user?.id,
      metadata: { request_id: id, new_status: status },
    });
    toast({ title: `Status updated to ${status}` });
    setSelected((prev: any) => prev ? { ...prev, request_status: status } : null);
    load();
    if (selected) loadEvents(id);
  };

  const assignOwner = async (id: string, userId: string) => {
    await supabase.from("implementation_requests").update({ assigned_admin_user_id: userId }).eq("id", id);
    await supabase.from("implementation_request_events").insert({
      client_id: selected?.client_id, request_id: id,
      event_type: "Assigned", event_summary: "Admin owner assigned",
      created_by: user?.id,
    });
    toast({ title: "Owner assigned" });
    setSelected((prev: any) => prev ? { ...prev, assigned_admin_user_id: userId } : null);
    load();
  };

  const addInternalNote = async () => {
    if (!selected || !internalNote.trim()) return;
    const updated = selected.internal_notes
      ? `${selected.internal_notes}\n\n[${new Date().toLocaleString()}] ${internalNote}`
      : `[${new Date().toLocaleString()}] ${internalNote}`;
    await supabase.from("implementation_requests").update({ internal_notes: updated }).eq("id", selected.id);
    await supabase.from("implementation_request_events").insert({
      client_id: selected.client_id, request_id: selected.id,
      event_type: "Note Added", event_summary: internalNote.substring(0, 100),
      created_by: user?.id,
    });
    setSelected((prev: any) => prev ? { ...prev, internal_notes: updated } : null);
    setInternalNote("");
    loadEvents(selected.id);
    toast({ title: "Note added" });
  };

  const createProposalFromRequest = (r: any) => {
    // Navigate to proposals with prefill context via query params
    const params = new URLSearchParams();
    if (r.recommendation_name) params.set("title", r.recommendation_name);
    if (r.default_setup_fee) params.set("setup_fee", String(r.default_setup_fee));
    if (r.default_monthly_fee) params.set("monthly_fee", String(r.default_monthly_fee));
    params.set("request_id", r.id);

    // Update status
    updateStatus(r.id, "Proposal Needed");
    navigate(`/proposals?${params.toString()}`);
  };

  const filtered = requests.filter(r => {
    if (tab !== "all" && r.request_status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      const cn = getClientName(r.client_id).toLowerCase();
      if (!cn.includes(q) && !(r.recommendation_name || "").toLowerCase().includes(q) && !(r.package_name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = requests.filter(r => r.request_status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <PageHeader title="Implementation Requests" description="Manage client service and package requests">
        <Badge variant="outline" className="text-xs">{requests.length} total</Badge>
      </PageHeader>

      {/* Status summary */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setTab(tab === s ? "all" : s)}
            className={`p-2 rounded-xl border text-center transition-colors ${tab === s ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}>
            <p className="text-lg font-bold tabular-nums">{counts[s]}</p>
            <p className="text-[10px] text-muted-foreground">{s}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by client, service, or package…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <DataCard title={tab === "all" ? "All Requests" : tab}>
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Client", "Type", "Service / Package", "Urgency", "Status", "Created", ""].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => openRequest(r)}>
                    <td className="text-sm font-medium py-3 pr-3">{getClientName(r.client_id)}</td>
                    <td className="text-xs text-muted-foreground py-3 pr-3">{r.request_type}</td>
                    <td className="text-sm py-3 pr-3">{r.recommendation_name || r.package_name || "—"}</td>
                    <td className="py-3 pr-3">
                      <Badge className={`text-[10px] ${URGENCY_STYLE[r.urgency_level] || ""}`}>{r.urgency_level}</Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge className={`text-[10px] ${STATUS_STYLE[r.request_status] || ""}`}>{r.request_status}</Badge>
                    </td>
                    <td className="text-xs text-muted-foreground py-3 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-3"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-lg">{selected.recommendation_name || selected.package_name || "Implementation Request"}</SheetTitle>
                <p className="text-xs text-muted-foreground">{getClientName(selected.client_id)} · {selected.request_type}</p>
              </SheetHeader>

              {/* Status + Urgency */}
              <div className="flex gap-2">
                <Badge className={STATUS_STYLE[selected.request_status] || ""}>{selected.request_status}</Badge>
                <Badge className={URGENCY_STYLE[selected.urgency_level] || ""}>{selected.urgency_level}</Badge>
              </div>

              {/* Revenue context */}
              {(selected.projected_monthly > 0 || selected.default_monthly_fee > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {selected.projected_monthly > 0 && (
                    <div className="p-3 rounded-lg bg-primary/[0.04] border border-primary/10">
                      <p className="text-[10px] text-muted-foreground">Projected Revenue</p>
                      <p className="text-lg font-bold">${Number(selected.projected_monthly).toLocaleString()}/mo</p>
                    </div>
                  )}
                  {selected.default_monthly_fee > 0 && (
                    <div className="p-3 rounded-lg bg-primary/[0.04] border border-primary/10">
                      <p className="text-[10px] text-muted-foreground">Package Fee</p>
                      <p className="text-lg font-bold">${Number(selected.default_monthly_fee).toLocaleString()}/mo</p>
                      {selected.default_setup_fee > 0 && <p className="text-[10px] text-muted-foreground">${Number(selected.default_setup_fee).toLocaleString()} setup</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Client message */}
              {selected.request_message && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Client Message</p>
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm">{selected.request_message}</div>
                </div>
              )}

              {/* Status control */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-2">Update Status</p>
                <Select value={selected.request_status} onValueChange={v => updateStatus(selected.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => createProposalFromRequest(selected)}>
                  <FileText className="h-3.5 w-3.5" /> Create Proposal
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => updateStatus(selected.id, "Approved")}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-destructive"
                  onClick={() => updateStatus(selected.id, "Rejected")}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>

              {/* Assign self */}
              {!selected.assigned_admin_user_id && user?.id && (
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => assignOwner(selected.id, user.id)}>
                  <User className="h-3.5 w-3.5" /> Assign to Me
                </Button>
              )}

              {/* Internal notes */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-2">Internal Notes</p>
                {selected.internal_notes && (
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs whitespace-pre-wrap mb-2">{selected.internal_notes}</div>
                )}
                <div className="flex gap-2">
                  <Textarea rows={2} placeholder="Add internal note…" value={internalNote} onChange={e => setInternalNote(e.target.value)} className="flex-1 text-sm" />
                  <Button size="sm" className="self-end" onClick={addInternalNote} disabled={!internalNote.trim()}>
                    <StickyNote className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Event history */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase mb-2">Event History</p>
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No events yet</p>
                ) : (
                  <div className="space-y-2">
                    {events.map(ev => (
                      <div key={ev.id} className="flex gap-2 py-2 border-b border-border last:border-0">
                        <div className="h-2 w-2 rounded-full mt-1.5 shrink-0 bg-primary" />
                        <div>
                          <p className="text-xs font-medium">{ev.event_type}</p>
                          {ev.event_summary && <p className="text-[10px] text-muted-foreground">{ev.event_summary}</p>}
                          <p className="text-[10px] text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground">
                Created: {new Date(selected.created_at).toLocaleString()} · Updated: {new Date(selected.updated_at).toLocaleString()}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
