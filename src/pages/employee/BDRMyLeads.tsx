import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Upload, Search, Phone, ExternalLink, ChevronDown, ChevronUp, BookOpen, CheckCircle2, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/* ─── types ─── */
interface OutcomeEntry { label: string; note?: string; timestamp: string }
interface BdrLead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  website: string | null;
  niche: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  crm_deal_id: string | null;
  outcome_history: OutcomeEntry[];
  objection_category: string | null;
  has_booking_system: boolean | null;
  list_name: string | null;
  created_at: string;
}

/* ─── outcome config ─── */
type OutcomeGroup = "positive" | "followup" | "closed";
interface OutcomeDef {
  label: string;
  group: OutcomeGroup;
  status: string;
  pipeline: string;
  createTask?: boolean;
  promptObjection?: boolean;
}

const OUTCOMES: OutcomeDef[] = [
  { label: "Booked — Appointment Set", group: "positive", status: "appointment_booked", pipeline: "appointment_booked" },
  { label: "Won — Closed on the Spot", group: "positive", status: "closed_won", pipeline: "closed_won" },
  { label: "Told to Call Back", group: "followup", status: "contacted", pipeline: "contacted", createTask: true },
  { label: "Owner Wasn't There", group: "followup", status: "new_lead", pipeline: "new_lead", createTask: true },
  { label: "Left Owner a Message", group: "followup", status: "contacted", pipeline: "contacted" },
  { label: "Had to Think About It", group: "followup", status: "contacted", pipeline: "contacted", promptObjection: true },
  { label: "Asked for Info — Sent Details", group: "followup", status: "contacted", pipeline: "contacted" },
  { label: "Wasn't Interested — Firm No", group: "closed", status: "closed_lost", pipeline: "closed_lost", promptObjection: true },
  { label: "Didn't See the Value", group: "closed", status: "closed_lost", pipeline: "closed_lost", promptObjection: true },
  { label: "Already Has a Marketing Company", group: "closed", status: "closed_lost", pipeline: "closed_lost", promptObjection: true },
  { label: "Gatekeeper Blocked", group: "closed", status: "new_lead", pipeline: "new_lead", createTask: true, promptObjection: true },
  { label: "Bad Number / No Answer", group: "closed", status: "new_lead", pipeline: "new_lead" },
  { label: "Business Closed", group: "closed", status: "closed_lost", pipeline: "closed_lost" },
  { label: "Wrong Contact — Not Decision Maker", group: "closed", status: "new_lead", pipeline: "new_lead", createTask: true },
];

const GROUP_COLORS: Record<OutcomeGroup, { border: string; bg: string; accent: string }> = {
  positive: { border: "hsla(142,72%,42%,.4)", bg: "hsla(142,72%,42%,.08)", accent: "hsl(142,72%,42%)" },
  followup: { border: "hsla(38,92%,50%,.4)", bg: "hsla(38,92%,50%,.08)", accent: "hsl(38,92%,50%)" },
  closed:   { border: "hsla(0,0%,50%,.3)",   bg: "hsla(0,0%,50%,.06)",   accent: "hsl(0,0%,60%)" },
};
const GROUP_LABELS: Record<OutcomeGroup, string> = { positive: "Positive", followup: "Follow-Up", closed: "Closed" };

/* ─── objection config ─── */
const OBJECTION_CATEGORIES = [
  { key: "WALL", label: "WALL — Gatekeeper blocking", chapter: "5.1" },
  { key: "AUTOPILOT", label: "AUTOPILOT — 'Not interested' reflex", chapter: "5.2" },
  { key: "STALL", label: "STALL — 'Need to think about it'", chapter: "5.3" },
  { key: "VALUE_GAP", label: "VALUE GAP — Didn't see the value", chapter: "5.4" },
  { key: "COST", label: "COST — Price or budget objection", chapter: "5.5" },
  { key: "TRUST_DEFICIT", label: "TRUST DEFICIT — Bad experience / skepticism", chapter: "5.6" },
  { key: "STATUS_QUO", label: "STATUS QUO — Already has someone", chapter: "5.7" },
  { key: "PROOF_DEMAND", label: "PROOF DEMAND — Wants results first", chapter: "5.8" },
  { key: "STACKED", label: "STACKED — Multiple objections", chapter: "5.9" },
];

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  new_lead:    { label: "New Lead",    bg: "hsla(211,96%,56%,.15)", text: "hsl(211,96%,56%)" },
  contacted:   { label: "Contacted",   bg: "hsla(187,80%,50%,.15)", text: "hsl(187,80%,50%)" },
  appointment_booked: { label: "Booked", bg: "hsla(263,70%,55%,.15)", text: "hsl(263,70%,55%)" },
  closed_won:  { label: "Closed Won",  bg: "hsla(142,72%,42%,.15)", text: "hsl(142,72%,42%)" },
  closed_lost: { label: "Closed Lost", bg: "hsla(0,0%,50%,.15)",    text: "hsl(0,0%,60%)" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "new_lead", label: "New Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "appointment_booked", label: "Booked" },
  { key: "closed_won", label: "Won" },
  { key: "closed_lost", label: "Lost" },
];

/* ─── page ─── */
export default function BDRMyLeads() {
  const { user } = useWorkspace();
  const [leads, setLeads] = useState<BdrLead[]>([]);
  const [calledLeadIds, setCalledLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [outcomeLead, setOutcomeLead] = useState<BdrLead | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "objections">("leads");
  const [activeList, setActiveList] = useState<string>("__all__");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchLeads = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any).from("nl_bdr_leads")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLeads((data || []).map((d: any) => ({ ...d, outcome_history: d.outcome_history || [] })));
    const { data: calls } = await (supabase as any).from("bdr_call_outcomes")
      .select("lead_id").eq("bdr_user_id", user.id);
    const calledSet = new Set<string>((calls || []).map((c: any) => c.lead_id).filter(Boolean));
    (data || []).forEach((d: any) => { if (d.called) calledSet.add(d.id); });
    setCalledLeadIds(calledSet);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = leads.filter(l => l.created_at.slice(0, 10) === todayStr).length;

  const lists = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      const key = l.list_name || "Unsorted";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads]);

  const listScopedLeads = useMemo(() => {
    if (activeList === "__all__") return leads;
    if (activeList === "Unsorted") return leads.filter(l => !l.list_name);
    return leads.filter(l => l.list_name === activeList);
  }, [leads, activeList]);

  const filtered = useMemo(() => {
    let list = listScopedLeads;
    if (filter === "today") list = list.filter(l => l.created_at.slice(0, 10) === todayStr);
    else if (filter !== "all") list = list.filter(l => l.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.business_name.toLowerCase().includes(q) || (l.owner_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [listScopedLeads, filter, search, todayStr]);

  const stats = useMemo(() => {
    const scope = listScopedLeads;
    const total = scope.length;
    const contacted = scope.filter(l => l.status === "contacted").length;
    const booked = scope.filter(l => l.status === "appointment_booked").length;
    const won = scope.filter(l => l.status === "closed_won").length;
    return { total, contacted, booked, won, rate: total ? Math.round((booked / total) * 100) : 0 };
  }, [listScopedLeads]);

  const createCRMRecords = async (lead: { business_name: string; owner_name?: string; phone?: string; website?: string }, leadId: string) => {
    if (!user?.id) return;
    const { data: contact } = await supabase.from("crm_contacts").insert({
      full_name: lead.owner_name || lead.business_name, phone: lead.phone || null,
      lead_source: "bdr_field", contact_status: "lead", contact_owner: user.id,
    } as any).select("id").single();
    if (contact) {
      const { data: deal } = await supabase.from("crm_deals").insert({
        deal_name: `${lead.business_name} — BDR Lead`, pipeline_stage: "new_lead",
        status: "open", lead_source: "bdr_field", assigned_user: user.id, contact_id: contact.id,
      } as any).select("id").single();
      await (supabase as any).from("nl_bdr_leads").update({ crm_contact_id: contact.id, crm_deal_id: deal?.id || null }).eq("id", leadId);
    }
  };

  const handleAddLead = async (form: Record<string, string>) => {
    if (!user?.id) return;
    const { data, error } = await (supabase as any).from("nl_bdr_leads").insert({
      user_id: user.id, business_name: form.business_name, owner_name: form.owner_name || null,
      phone: form.phone || null, website: form.website || null, niche: form.niche || null,
      city: form.city || null, notes: form.notes || null,
    }).select("id").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await createCRMRecords(form as any, data.id);
    toast({ title: "Lead added" }); setShowAdd(false); fetchLeads();
  };

  const handleImport = async (rows: { business_name: string; owner_name: string; phone: string; website: string; has_booking_system: boolean | null }[], listName: string) => {
    if (!user?.id) return;
    const cleanList = listName.trim() || null;
    const existingNames = new Set(leads.map(l => (l.business_name || "").trim().toLowerCase()));
    const seenInBatch = new Set<string>();
    let count = 0;
    let skipped = 0;
    for (const row of rows) {
      const key = (row.business_name || "").trim().toLowerCase();
      if (!key || existingNames.has(key) || seenInBatch.has(key)) { skipped++; continue; }
      seenInBatch.add(key);
      const { data } = await (supabase as any).from("nl_bdr_leads").insert({
        user_id: user.id, business_name: row.business_name, owner_name: row.owner_name || null,
        phone: row.phone || null, website: row.website || null,
        has_booking_system: row.has_booking_system,
        list_name: cleanList,
      }).select("id").single();
      if (data) { await createCRMRecords(row, data.id); count++; }
    }
    toast({ title: `${count} leads imported${cleanList ? ` to "${cleanList}"` : ""}`, description: skipped > 0 ? `${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped` : undefined });
    if (cleanList) setActiveList(cleanList);
    setShowImport(false); fetchLeads();
  };

  const handleSaveOutcome = async (outcome: OutcomeDef, note: string): Promise<{ promptObjection: boolean; lead: BdrLead; outcomeLabel: string }> => {
    if (!outcomeLead || !user?.id) return { promptObjection: false, lead: outcomeLead!, outcomeLabel: "" };
    const lead = outcomeLead;
    const entry: OutcomeEntry = { label: outcome.label, timestamp: new Date().toISOString(), ...(note ? { note } : {}) };
    const newHistory = [...(lead.outcome_history || []), entry];

    await (supabase as any).from("nl_bdr_leads").update({
      status: outcome.status, outcome_history: newHistory,
      notes: note ? (lead.notes ? `${lead.notes}\n${note}` : note) : lead.notes,
    }).eq("id", lead.id);

    if (lead.crm_deal_id) {
      await supabase.from("crm_deals").update({
        pipeline_stage: outcome.pipeline,
        ...(outcome.status === "closed_won" ? { status: "won" as any } : outcome.status === "closed_lost" ? { status: "lost" as any } : {}),
      } as any).eq("id", lead.crm_deal_id);
    }

    if (outcome.createTask) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
      await supabase.from("crm_tasks").insert({
        title: `Follow up with ${lead.business_name}`,
        description: `Outcome: ${outcome.label}${note ? `\nNote: ${note}` : ""}`,
        related_type: "lead", related_id: lead.id, assigned_user: user.id,
        due_date: tomorrow.toISOString(), status: "open", priority: "medium",
      } as any);
    }

    if (!outcome.promptObjection) {
      setOutcomeLead(null);
      if (outcome.group === "positive") toast({ title: outcome.status === "closed_won" ? "🎉 Won! Great work." : "📅 Booked! Great work.", description: lead.business_name });
      else if (outcome.createTask) toast({ title: "Got it — follow-up task created for tomorrow.", description: lead.business_name });
      else toast({ title: "Logged.", description: lead.business_name });
      fetchLeads();
    }

    return { promptObjection: !!outcome.promptObjection, lead, outcomeLabel: outcome.label };
  };

  const handleDeleteLead = async (lead: BdrLead) => {
    if (!user?.id) return;
    if (!window.confirm(`Delete "${lead.business_name}" permanently? This cannot be undone.`)) return;
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    const { error } = await (supabase as any).from("nl_bdr_leads").delete().eq("id", lead.id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Couldn't delete lead", description: error.message, variant: "destructive" });
      fetchLeads();
      return;
    }
    if (lead.crm_deal_id) {
      await supabase.from("crm_deals").delete().eq("id", lead.crm_deal_id);
    }
    toast({ title: "Lead deleted", description: lead.business_name });
  };

  const toggleCalled = async (lead: BdrLead) => {
    if (!user?.id) return;
    const wasCalled = calledLeadIds.has(lead.id);
    const next = !wasCalled;
    setCalledLeadIds(prev => {
      const n = new Set(prev);
      if (next) n.add(lead.id); else n.delete(lead.id);
      return n;
    });
    const { error } = await (supabase as any).from("nl_bdr_leads")
      .update({ called: next }).eq("id", lead.id).eq("user_id", user.id);
    if (error) {
      setCalledLeadIds(prev => {
        const n = new Set(prev);
        if (wasCalled) n.add(lead.id); else n.delete(lead.id);
        return n;
      });
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    }
  };

  const deleteLeadsByIds = async (ids: string[], successMsg: string) => {
    if (!user?.id || ids.length === 0) return;
    const dealIds = leads.filter(l => ids.includes(l.id) && l.crm_deal_id).map(l => l.crm_deal_id as string);
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    const { error } = await (supabase as any).from("nl_bdr_leads").delete().in("id", ids).eq("user_id", user.id);
    if (error) {
      toast({ title: "Couldn't delete leads", description: error.message, variant: "destructive" });
      fetchLeads();
      return;
    }
    if (dealIds.length > 0) {
      await supabase.from("crm_deals").delete().in("id", dealIds);
    }
    toast({ title: successMsg });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected lead${ids.length !== 1 ? "s" : ""} permanently? This cannot be undone.`)) return;
    await deleteLeadsByIds(ids, `${ids.length} lead${ids.length !== 1 ? "s" : ""} deleted`);
  };

  const handleDeleteAllInList = async () => {
    const ids = listScopedLeads.map(l => l.id);
    if (ids.length === 0) return;
    const label = activeList === "__all__" ? "all leads" : `all leads in "${activeList}"`;
    if (!window.confirm(`Delete ${label} (${ids.length} lead${ids.length !== 1 ? "s" : ""}) permanently? This cannot be undone.`)) return;
    await deleteLeadsByIds(ids, `${ids.length} lead${ids.length !== 1 ? "s" : ""} deleted`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Reset selection when switching list/tab
  useEffect(() => { setSelectedIds(new Set()); setSelectMode(false); }, [activeList, activeTab]);

  const handleSaveObjection = async (leadId: string, businessName: string, outcomeLabel: string, category: string | null) => {
    if (!user?.id) return;
    if (category) {
      await (supabase as any).from("nl_bdr_objections").insert({
        user_id: user.id, lead_id: leadId, objection_category: category,
        outcome_logged: outcomeLabel, business_name: businessName,
      });
      await (supabase as any).from("nl_bdr_leads").update({ objection_category: category }).eq("id", leadId);
    }
    setOutcomeLead(null);
    toast({ title: "Logged." }); fetchLeads();
  };

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Leads</h1>
          <p className="text-sm text-muted-foreground">{dateLabel} · {todayCount} leads today · {leads.length} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Lead</Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: "hsla(215,35%,10%,.6)" }}>
        {(["leads", "objections"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: activeTab === tab ? "hsl(211,96%,56%)" : "transparent",
              color: activeTab === tab ? "#fff" : "hsl(211,96%,56%)",
            }}>
            {tab === "leads" ? "My Leads" : "My Objections"}
          </button>
        ))}
      </div>

      {activeTab === "leads" ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Total", value: stats.total },
              { label: "Contacted", value: stats.contacted },
              { label: "Booked", value: stats.booked },
              { label: "Won", value: stats.won },
              { label: "Conv %", value: `${stats.rate}%` },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* List pages */}
          {lists.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              <button onClick={() => setActiveList("__all__")}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5"
                style={{ background: activeList === "__all__" ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.08)", color: activeList === "__all__" ? "#fff" : "hsl(211,96%,56%)" }}>
                All Lists <span className="opacity-70">({leads.length})</span>
              </button>
              {lists.map(([name, count]) => (
                <button key={name} onClick={() => setActiveList(name)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5"
                  style={{ background: activeList === name ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.08)", color: activeList === name ? "#fff" : "hsl(211,96%,56%)" }}>
                  {name} <span className="opacity-70">({count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Bulk action toolbar */}
          {listScopedLeads.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap rounded-xl px-3 py-2"
              style={{ background: selectMode ? "hsla(211,96%,56%,.08)" : "hsla(215,35%,10%,.6)", border: "1px solid hsla(211,96%,60%,.12)" }}>
              <p className="text-xs text-muted-foreground">
                {selectMode ? `${selectedIds.size} selected` : `${listScopedLeads.length} lead${listScopedLeads.length !== 1 ? "s" : ""} in ${activeList === "__all__" ? "all lists" : `"${activeList}"`}`}
              </p>
              <div className="flex items-center gap-2">
                {selectMode ? (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>Cancel</Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={selectedIds.size === 0} onClick={handleBulkDelete}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete Selected
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectMode(true)}>Select</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={handleDeleteAllInList}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete All
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-1 flex-wrap">
              {FILTER_TABS.map(t => (
                <button key={t.key} onClick={() => setFilter(t.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={{ background: filter === t.key ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.08)", color: filter === t.key ? "#fff" : "hsl(211,96%,56%)" }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9 h-8 text-sm" />
            </div>
          </div>

          {/* Lead cards */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><p className="text-muted-foreground">No leads yet. Add your first lead or import from Claude.</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map(lead => {
                const cfg = STATUS_CFG[lead.status] || STATUS_CFG.new_lead;
                const history = lead.outcome_history || [];
                const expanded = expandedId === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={selectMode ? () => toggleSelect(lead.id) : undefined}
                    role={selectMode ? "button" : undefined}
                    aria-pressed={selectMode ? selectedIds.has(lead.id) : undefined}
                    className={`rounded-2xl overflow-hidden transition-all ${selectMode ? "cursor-pointer active:scale-[0.99]" : ""}`}
                    style={{
                      background: selectMode && selectedIds.has(lead.id) ? "hsla(211,96%,56%,.12)" : "hsla(215,35%,10%,.8)",
                      border: `1px solid ${selectMode && selectedIds.has(lead.id) ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.12)"}`,
                    }}
                  >
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {selectMode && (
                        <div className="flex-shrink-0 h-5 w-5 rounded-md inline-flex items-center justify-center"
                          style={{
                            background: selectedIds.has(lead.id) ? "hsl(211,96%,56%)" : "transparent",
                            border: `1.5px solid ${selectedIds.has(lead.id) ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.4)"}`,
                          }}>
                          {selectedIds.has(lead.id) && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">{lead.business_name}</span>
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                        </div>
                        {lead.owner_name && <p className="text-sm text-muted-foreground">{lead.owner_name}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {lead.phone && <a href={`tel:${lead.phone}`} className="text-xs flex items-center gap-1" style={{ color: "hsl(211,96%,56%)" }}><Phone className="h-3 w-3" /> {lead.phone}</a>}
                          {lead.website && <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1" style={{ color: "hsl(211,96%,56%)" }}><ExternalLink className="h-3 w-3" /> Website</a>}
                          {lead.city && <span className="text-xs text-muted-foreground">{lead.city}</span>}
                          {lead.has_booking_system === true && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }}>Booking System ✓</span>
                          )}
                          {lead.has_booking_system === false && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>No Booking System</span>
                          )}
                          {!selectMode && (
                            calledLeadIds.has(lead.id) ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCalled(lead); }}
                                aria-pressed="true"
                                title="Click to mark as not called"
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 transition-opacity hover:opacity-80"
                                style={{ background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Called
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCalled(lead); }}
                                aria-pressed="false"
                                title="Mark as called"
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1 transition-colors hover:text-foreground"
                                style={{ background: "hsla(0,0%,50%,.10)", color: "hsl(0,0%,65%)", border: "1px solid hsla(0,0%,50%,.25)" }}
                              >
                                <span className="h-3 w-3 inline-block rounded-sm border border-current" /> Mark Called
                              </button>
                            )
                          )}
                          {lead.list_name && activeList === "__all__" && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "hsla(211,96%,56%,.08)", color: "hsl(211,96%,56%)" }}>{lead.list_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</span>
                        {history.length > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : lead.id); }} className="text-[10px] flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
                            {history.length} log{history.length > 1 ? "s" : ""} {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                        {!selectMode && (lead.status === "new_lead" || lead.status === "contacted") && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setOutcomeLead(lead); }}>Log Outcome</Button>
                        )}
                        {!selectMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead); }}
                            aria-label={`Delete ${lead.business_name}`}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <AnimatePresence>
                      {expanded && history.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4 space-y-1.5 border-t" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide pt-3">Outcome History</p>
                            {history.slice().reverse().map((h, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="text-muted-foreground whitespace-nowrap">{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                <span className="text-foreground font-medium">{h.label}</span>
                                {h.note && <span className="text-muted-foreground italic">— {h.note}</span>}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!selectMode && (
                      <div className="px-4 pb-3 -mt-1" onClick={(e) => e.stopPropagation()}>
                        <LeadNotesField leadId={lead.id} userId={user?.id || ""} initial={lead.notes || ""} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <ObjectionDashboard userId={user?.id} />
      )}

      {/* Modals */}
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddLead} />
      <OutcomeSheet lead={outcomeLead} onClose={() => setOutcomeLead(null)} onSaveOutcome={handleSaveOutcome} onSaveObjection={handleSaveObjection} />
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Inline notes field with auto-save on blur       */
/* ═══════════════════════════════════════════════ */
function LeadNotesField({ leadId, userId, initial }: { leadId: string; userId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [baseline, setBaseline] = useState(initial);
  useEffect(() => { setValue(initial); setBaseline(initial); }, [initial, leadId]);

  const save = async () => {
    if (!userId || value === baseline) return;
    setSaving(true);
    const { error } = await (supabase as any).from("nl_bdr_leads")
      .update({ notes: value }).eq("id", leadId).eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save notes", description: error.message, variant: "destructive" });
      return;
    }
    setBaseline(value);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Call notes</span>
        {saving ? (
          <span className="text-[10px] text-muted-foreground">Saving…</span>
        ) : savedFlash ? (
          <span className="text-[10px]" style={{ color: "hsl(142,72%,42%)" }}>Saved ✓</span>
        ) : null}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Add notes from this call…"
        className="min-h-[44px] text-xs resize-y bg-background/40"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Outcome Bottom Sheet (with objection prompt)    */
/* ═══════════════════════════════════════════════ */
function OutcomeSheet({ lead, onClose, onSaveOutcome, onSaveObjection }: {
  lead: BdrLead | null;
  onClose: () => void;
  onSaveOutcome: (o: OutcomeDef, note: string) => Promise<{ promptObjection: boolean; lead: BdrLead; outcomeLabel: string }>;
  onSaveObjection: (leadId: string, businessName: string, outcomeLabel: string, category: string | null) => Promise<void>;
}) {
  const [selected, setSelected] = useState<OutcomeDef | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [objectionPhase, setObjectionPhase] = useState(false);
  const [pendingLead, setPendingLead] = useState<{ id: string; name: string; outcomeLabel: string } | null>(null);

  useEffect(() => { if (!lead) { setSelected(null); setNote(""); setObjectionPhase(false); setPendingLead(null); } }, [lead]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const result = await onSaveOutcome(selected, note.trim());
    setSaving(false);
    if (result.promptObjection) {
      setPendingLead({ id: result.lead.id, name: result.lead.business_name, outcomeLabel: result.outcomeLabel });
      setObjectionPhase(true);
    }
  };

  const groups: OutcomeGroup[] = ["positive", "followup", "closed"];

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        {!objectionPhase ? (
          <>
            <div className="p-5 pb-0">
              <DialogHeader>
                <DialogTitle>What happened?</DialogTitle>
                <DialogDescription>{lead?.business_name}</DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-5 pb-5 space-y-4">
              {!selected ? (
                groups.map(g => {
                  const items = OUTCOMES.filter(o => o.group === g);
                  const colors = GROUP_COLORS[g];
                  return (
                    <div key={g}>
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: colors.accent }}>{GROUP_LABELS[g]}</p>
                      <div className="space-y-1.5">
                        {items.map(o => (
                          <button key={o.label} onClick={() => setSelected(o)}
                            className="w-full text-left rounded-xl px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.98]"
                            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: "var(--foreground)" }}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="rounded-xl px-4 py-3 text-sm font-medium"
                    style={{ background: GROUP_COLORS[selected.group].bg, border: `1px solid ${GROUP_COLORS[selected.group].border}`, color: GROUP_COLORS[selected.group].accent }}>
                    {selected.label}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Add a note (optional)</label>
                    <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1" placeholder="What happened on this visit..." />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelected(null)} className="flex-shrink-0">Back</Button>
                    <Button onClick={save} disabled={saving} className="flex-1">{saving ? "Saving..." : "Save Outcome"}</Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── objection prompt ── */
          <div className="p-5 space-y-4">
            <DialogHeader>
              <DialogTitle>What objection came up?</DialogTitle>
              <DialogDescription>This helps you track what to work on</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              {OBJECTION_CATEGORIES.map(cat => (
                <button key={cat.key}
                  onClick={() => pendingLead && onSaveObjection(pendingLead.id, pendingLead.name, pendingLead.outcomeLabel, cat.key)}
                  className="w-full text-left rounded-xl px-4 py-3.5 text-sm font-medium transition-all active:scale-[0.98]"
                  style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,60%,.15)", color: "var(--foreground)" }}>
                  {cat.label}
                </button>
              ))}
            </div>
            <button onClick={() => pendingLead && onSaveObjection(pendingLead.id, pendingLead.name, pendingLead.outcomeLabel, null)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
              Skip
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════ */
/* Objection Dashboard Tab                         */
/* ═══════════════════════════════════════════════ */
function ObjectionDashboard({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [objections, setObjections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await (supabase as any).from("nl_bdr_objections")
        .select("*").eq("user_id", userId).order("created_at", { ascending: false });
      setObjections(data || []);
      setLoading(false);
    })();
  }, [userId]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    OBJECTION_CATEGORIES.forEach(c => { map[c.key] = 0; });
    objections.forEach(o => { map[o.objection_category] = (map[o.objection_category] || 0) + 1; });
    return map;
  }, [objections]);

  const total = objections.length;
  const maxCount = Math.max(1, ...Object.values(counts));
  const topCategory = OBJECTION_CATEGORIES.reduce((best, cat) => counts[cat.key] > (counts[best.key] || 0) ? cat : best, OBJECTION_CATEGORIES[0]);

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeek = objections.filter(o => new Date(o.created_at) >= weekStart).length;
  const lastWeek = objections.filter(o => { const d = new Date(o.created_at); return d >= lastWeekStart && d < weekStart; }).length;

  if (loading) return <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>;

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total Logged", value: total },
          { label: "Most Common", value: total > 0 ? topCategory.key.replace("_", " ") : "—" },
          { label: "This Week / Last", value: `${thisWeek} / ${lastWeek}` },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
            <p className="text-lg font-bold text-foreground truncate">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {total === 0 ? (
        <div className="text-center py-12"><p className="text-muted-foreground">No objections logged yet. They'll show up here as you log outcomes.</p></div>
      ) : (
        <div className="space-y-2">
          {OBJECTION_CATEGORIES.map(cat => {
            const count = counts[cat.key] || 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const barWidth = Math.max(2, (count / maxCount) * 100);
            return (
              <div key={cat.key} className="rounded-xl p-3" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">{cat.key.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{count} ({pct}%)</span>
                    {count > 0 && (
                      <button onClick={() => navigate(`/employee/training/bdr`)}
                        className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors"
                        style={{ color: "hsl(211,96%,56%)", background: "hsla(211,96%,56%,.08)" }}>
                        <BookOpen className="h-3 w-3" /> Ch {cat.chapter}
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, background: "hsl(211,96%,56%)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="rounded-2xl p-4 text-center" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,60%,.12)" }}>
          <p className="text-sm text-muted-foreground">
            Your most common objection is <span className="font-bold" style={{ color: "hsl(211,96%,56%)" }}>{topCategory.key.replace("_", " ")}</span>.
            {" "}Tap <span style={{ color: "hsl(211,96%,56%)" }}>Ch {topCategory.chapter}</span> above to go work on it.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Import Modal                                    */
/* ═══════════════════════════════════════════════ */
function ImportModal({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (rows: any[], listName: string) => void }) {
  const [raw, setRaw] = useState("");
  const [listName, setListName] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);

  useEffect(() => { if (!open) { setRaw(""); setListName(""); setParsed([]); setChecked([]); } }, [open]);

  const parse = () => {
    const lines = raw.trim().split("\n").filter(Boolean);
    if (!lines.length) return;
    const delim = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
    const rows = lines.map(l => l.split(delim).map(c => c.trim()));
    const headerLike = rows[0].some(c => /business|name|phone|website|booking/i.test(c));
    const dataRows = headerLike ? rows.slice(1) : rows;
    let biIdx = 0, owIdx = 1, phIdx = 2, webIdx = 3, bkIdx = 4;
    if (headerLike) {
      const h = rows[0].map(c => c.toLowerCase());
      h.forEach((c, i) => {
        if (/business/.test(c)) biIdx = i;
        else if (/owner|contact/.test(c)) owIdx = i;
        else if (/phone/.test(c)) phIdx = i;
        else if (/website|url|site/.test(c)) webIdx = i;
        else if (/booking/.test(c)) bkIdx = i;
      });
    }
    const parseBooking = (v: string): boolean | null => {
      const s = (v || "").trim().toLowerCase();
      if (!s) return null;
      if (/^(y|yes|true|1|✓)$/.test(s)) return true;
      if (/^(n|no|false|0)$/.test(s)) return false;
      return null;
    };
    const result = dataRows.filter(r => r.length >= 1 && r[biIdx]?.trim()).map(r => ({
      business_name: r[biIdx]?.trim() || "", owner_name: r[owIdx]?.trim() || "",
      phone: r[phIdx]?.trim() || "", website: r[webIdx]?.trim() || "",
      has_booking_system: parseBooking(r[bkIdx] || ""),
    }));
    setParsed(result); setChecked(result.map(() => true));
  };

  const toggle = (i: number) => setChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  const selectedCount = checked.filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Claude</DialogTitle>
          <DialogDescription>Paste your cleaned lead table from Claude.ai</DialogDescription>
        </DialogHeader>
        {parsed.length === 0 ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">List Name</label>
              <Input value={listName} onChange={e => setListName(e.target.value)} placeholder='e.g. "Ojai Hair Salons — State Street SB"' className="mt-1 h-9" />
              <p className="text-[10px] text-muted-foreground mt-1">Name this batch so you can switch between lists later.</p>
            </div>
            <Textarea value={raw} onChange={e => setRaw(e.target.value)} rows={10}
              placeholder={"Paste your lead table here. Format:\nBusiness Name | Owner Name | Phone | Website | Booking System\n\nExample:\nJoe's HVAC | Joe Martinez | (805) 555-1234 | joeshvac.com | No"} />
            <Button onClick={parse} disabled={!raw.trim() || !listName.trim()} className="w-full">Parse Leads</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{parsed.length} leads found</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {parsed.map((r, i) => (
                <label key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer"
                  style={{ background: checked[i] ? "hsla(211,96%,56%,.06)" : "transparent", border: "1px solid hsla(211,96%,60%,.1)" }}>
                  <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} className="accent-[hsl(211,96%,56%)]" />
                  <span className="font-medium text-foreground truncate">{r.business_name}</span>
                  <span className="text-muted-foreground truncate hidden sm:inline">— {r.owner_name || "N/A"}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setParsed([]); setChecked([]); }}>Back</Button>
              <Button onClick={() => onImport(parsed.filter((_, i) => checked[i]), listName)} disabled={!selectedCount} className="flex-1">
                Import {selectedCount} Lead{selectedCount !== 1 ? "s" : ""}{listName.trim() ? ` to "${listName.trim()}"` : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════ */
/* Add Lead Modal                                  */
/* ═══════════════════════════════════════════════ */
function AddLeadModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (f: Record<string, string>) => void }) {
  const [form, setForm] = useState<Record<string, string>>({ business_name: "", owner_name: "", phone: "", website: "", niche: "", city: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) setForm({ business_name: "", owner_name: "", phone: "", website: "", niche: "", city: "", notes: "" }); }, [open]);

  const handleSave = async () => {
    if (!form.business_name.trim()) return;
    setSaving(true); await onSave(form); setSaving(false);
  };

  const field = (key: string, label: string, required = false) => (
    <div key={key}>
      <label className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</label>
      {key === "notes" ? (
        <Textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3} className="mt-1" />
      ) : (
        <Input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="mt-1 h-9" />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>Enter a new lead manually.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {field("business_name", "Business Name", true)}
          {field("owner_name", "Owner Name")}
          {field("phone", "Phone")}
          {field("website", "Website")}
          {field("niche", "Niche")}
          {field("city", "City")}
          {field("notes", "Notes")}
          <Button onClick={handleSave} disabled={!form.business_name.trim() || saving} className="w-full">
            {saving ? "Saving..." : "Save Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
