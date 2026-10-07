import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, Phone, Calendar, CalendarClock, Search, X, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { logDialerEvent } from "@/lib/bdrCalendar";
import { resolveEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { parseLeadFlags, stripLeadFlags, getLeadPhones } from "@/lib/leadFlags";
import RenameListButton from "@/components/employee/RenameListButton";
import { OUTCOMES } from "@/lib/bdrOutcomes";
import { BookingSystemBadge } from "@/components/employee/LeadFields";



interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  front_desk_phone: string | null;
  owner_direct_phone: string | null;
  city: string | null;
  niche: string | null;
  list_name: string | null;
  called: boolean | null;
  dialed_at?: string | null;
  notes: string | null;
  callback_at?: string | null;
  website: string | null;
  has_booking_system: boolean | null;
  booking_system_exists: boolean | null;
  booking_platform: string | null;
  booking_system_platform?: string | null;
  booking_system_methods?: string[] | null;
  booking_system_checked_at?: string | null;
  phone_type: string | null;

  booking_link: string | null;
  booking_link_is_owner: boolean | null;
  owner_calendar_confirmed: boolean | null;
  owner_booking_link: string | null;
  owner_booking_link_send_ready: string | null;
  self_booking_widget_non_owner: boolean | null;
  dialer_bookable: boolean | null;
  pipeline_stage: string | null;
  crm_deal_id: string | null;
  _claimConflict?: boolean;
}


interface OutcomeRow {
  lead_id: string | null;
  outcome: string;
  objection_type: string | null;
  logged_at: string | null;
}

interface DialLogRow {
  dialed_at: string | null;
}



// Outcome list lives in @/lib/bdrOutcomes so the Street Walk page logs the same set.


const STAT_KEYS = OUTCOMES.map(o => o.label);

const ALL_LIST = "__all__";

function inBucket(dateStr: string | null, bucket: "today" | "week" | "month" | "all") {
  if (!dateStr) return false;
  if (bucket === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (bucket === "today") return d.toDateString() === now.toDateString();
  if (bucket === "week") {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0);
    return d >= s;
  }
  if (bucket === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return false;
}

function NotesCell({ initial, onSave }: { initial: string; onSave: (v: string) => void | Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  useEffect(() => { setValue(initial); setBaseline(initial); }, [initial]);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={async () => {
        if (value === baseline) return;
        await onSave(value);
        setBaseline(value);
      }}
      placeholder="Add notes…"
      rows={3}
      className="w-full bg-transparent text-white text-xs px-2 py-2 rounded border border-white/10 hover:border-white/20 focus:border-[hsl(211,96%,56%)] focus:outline-none resize-y min-h-[64px] leading-snug"
      style={{ background: value ? "hsla(211,96%,56%,.06)" : "hsla(0,0%,100%,.02)" }}
    />
  );
}

export default function BDRDialer() {
  const navigate = useNavigate();
  const { activeClientId } = useWorkspace();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [dialLog, setDialLog] = useState<DialLogRow[]>([]);
  const [latestOutcomeByLead, setLatestOutcomeByLead] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<string>(ALL_LIST);
  const [showDialed, setShowDialed] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [callbackLead, setCallbackLead] = useState<Lead | null>(null);
  const [callbackDate, setCallbackDate] = useState<string>("");
  const [callbackTime, setCallbackTime] = useState<string>("");
  const [ownerSearch, setOwnerSearch] = useState<string>("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [confirmState, setConfirmState] = useState<
    { title: string; description: string; confirmLabel: string; resolve: (v: boolean) => void } | null
  >(null);
  // window.confirm() is blocked in the installed PWA / embedded app shell, which
  // silently cancelled every destructive action. Use a real dialog instead.
  const askConfirm = useCallback(
    (title: string, description: string, confirmLabel = "Delete") =>
      new Promise<boolean>(resolve => setConfirmState({ title, description, confirmLabel, resolve })),
    [],
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const cid = activeClientId || await resolveEmployeeClientId(user.id);
      setClientId(cid);
      const [{ data: leadRows }, { data: outcomeRows }, { data: dialRows }] = await Promise.all([
        (supabase as any).from("nl_bdr_leads")
          .select("id, business_name, owner_name, phone, front_desk_phone, owner_direct_phone, city, niche, list_name, called, dialed_at, notes, callback_at, website, has_booking_system, booking_system_exists, booking_platform, booking_system_platform, booking_system_methods, booking_system_checked_at, phone_type, booking_link, booking_link_is_owner, owner_calendar_confirmed, owner_booking_link, owner_booking_link_send_ready, self_booking_widget_non_owner, dialer_bookable, pipeline_stage, crm_deal_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        (supabase as any).from("bdr_call_outcomes")
          .select("lead_id, outcome, objection_type, logged_at, created_at")
          .eq("bdr_user_id", user.id)
          .order("logged_at", { ascending: false })
          .order("created_at", { ascending: false }),
        (supabase as any).from("nl_bdr_dial_log")
          .select("dialed_at")
          .eq("bdr_user_id", user.id),
      ]);
      setLeads(leadRows || []);
      const all: OutcomeRow[] = (outcomeRows || []).map((r: any) => ({
        lead_id: r.lead_id, outcome: r.outcome, objection_type: r.objection_type,
        logged_at: r.logged_at || r.created_at || null,
      }));
      setOutcomes(all);
      setDialLog((dialRows || []).map((r: any) => ({ dialed_at: r.dialed_at })));
      const latest: Record<string, string> = {};
      for (const r of (outcomeRows || [])) {
        if (r.lead_id && !latest[r.lead_id]) latest[r.lead_id] = r.outcome;
      }
      setLatestOutcomeByLead(latest);
      // Defensive: flag any of my leads whose phone also exists under another rep
      const ids = (leadRows || []).map((l: any) => l.id).filter(Boolean);
      if (ids.length) {
        const { data: conflicts } = await (supabase as any).rpc("list_lead_conflicts", { _lead_ids: ids });
        const conflictIds = new Set((conflicts || []).map((r: any) => r.lead_id));
        if (conflictIds.size > 0) {
          setLeads(prev => prev.map(l => conflictIds.has(l.id) ? { ...l, _claimConflict: true } : l));
        }
      }
      setLoading(false);
    })();
  }, [activeClientId]);


  // Show Dialed filter: OFF = not yet dialed, ON = dialed but not won. Won leads never show here.
  const isCallbackType = useCallback((id: string) => {
    const o = latestOutcomeByLead[id];
    return o === "Schedule Callback" || o === "Said They Would Reach Out";
  }, [latestOutcomeByLead]);

  const modeLeads = useMemo(() => leads.filter(l => {
    if (l.pipeline_stage === "won") return false;
    return showDialed ? !!l.called : !l.called;
  }), [leads, showDialed]);

  const lists = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      const name = l.list_name || "Uncategorized";
      if (!map.has(name)) map.set(name, 0);
    });
    modeLeads.forEach(l => {
      const name = l.list_name || "Uncategorized";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads, modeLeads]);

  const visibleLeads = useMemo(() => {
    const base = activeList === ALL_LIST
      ? modeLeads
      : modeLeads.filter(l => (l.list_name || "Uncategorized") === activeList);
    if (!showDialed) return base;
    // Most recently dialed first; legacy rows with no dialed_at go last (stable).
    return [...base].sort((a, b) => {
      const ta = a.dialed_at ? Date.parse(a.dialed_at) : -Infinity;
      const tb = b.dialed_at ? Date.parse(b.dialed_at) : -Infinity;
      if (ta === tb) return 0;
      return tb > ta ? 1 : -1;
    });
  }, [modeLeads, activeList, showDialed]);

  const searchMatches = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return [] as Lead[];
    return leads
      .filter(l => (l.owner_name || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [leads, ownerSearch]);

  const jumpToLead = useCallback((lead: Lead) => {
    if (lead.pipeline_stage === "won") {
      setOwnerSearch("");
      toast({
        title: `${lead.business_name} is Won`,
        description: "Won leads live in My Leads under the Won tab.",
        action: <ToastAction altText="Open My Leads" onClick={() => navigate("/employee/leads")}>Open My Leads</ToastAction>,
      });
      return;
    }
    setShowDialed(!!lead.called);
    if (lead.list_name && (lead.list_name || "Uncategorized") !== activeList) {
      setActiveList(lead.list_name || "Uncategorized");
    } else if (!lead.list_name && activeList !== ALL_LIST && activeList !== "Uncategorized") {
      setActiveList(ALL_LIST);
    }
    setOwnerSearch("");
    setHighlightId(lead.id);
    setTimeout(() => {
      rowRefs.current[lead.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setHighlightId(null), 2400);
  }, [activeList, navigate]);


  const stats = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
    let total = 0;
    const visibleIds = new Set(visibleLeads.map(l => l.id));
    for (const o of outcomes) {
      if (activeList !== ALL_LIST && (!o.lead_id || !visibleIds.has(o.lead_id))) continue;
      total += 1;
      if (counts[o.outcome] !== undefined) counts[o.outcome] += 1;
    }
    return { total, counts };
  }, [outcomes, visibleLeads, activeList]);

  const callCounts = useMemo(() => {
    const buckets: Array<"today" | "week" | "month" | "all"> = ["today", "week", "month", "all"];
    const result: Record<"today" | "week" | "month" | "all", number> = {} as any;
    for (const b of buckets) {
      result[b] = dialLog.filter(d => inBucket(d.dialed_at, b)).length;
    }
    return result;
  }, [dialLog]);

  const recordDial = useCallback(async (leadId: string) => {
    if (!userId) return;
    const nowIso = new Date().toISOString();
    setDialLog(prev => [{ dialed_at: nowIso }, ...prev]);
    const { error } = await (supabase as any).from("nl_bdr_dial_log").insert({
      bdr_user_id: userId,
      lead_id: leadId,
      dialed_at: nowIso,
    });
    if (error) {
      setDialLog(prev => prev.filter(d => d.dialed_at !== nowIso));
    }
  }, [userId]);

  const toggleCalled = useCallback(async (lead: Lead) => {
    if (!userId) return;
    const next = !lead.called;
    const prevDialedAt = lead.dialed_at ?? null;
    const nextDialedAt = next ? new Date().toISOString() : null;
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, called: next, dialed_at: nextDialedAt } : l));
    const { error } = await (supabase as any).from("nl_bdr_leads")
      .update({ called: next, dialed_at: nextDialedAt }).eq("id", lead.id).eq("user_id", userId);
    if (error) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, called: !next, dialed_at: prevDialedAt } : l));
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    if (next) {
      recordDial(lead.id);
      logDialerEvent({
        leadId: lead.id,
        businessName: lead.business_name,
        ownerName: lead.owner_name,
        notes: lead.notes,
      }).catch(() => {});
    }
  }, [userId, recordDial]);

  const saveNotes = useCallback(async (lead: Lead, value: string) => {
    if (!userId) return;
    if ((lead.notes || "") === value) return;
    const prev = lead.notes;
    setLeads(p => p.map(l => l.id === lead.id ? { ...l, notes: value } : l));
    const { error } = await (supabase as any).from("nl_bdr_leads")
      .update({ notes: value }).eq("id", lead.id).eq("user_id", userId);
    if (error) {
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, notes: prev } : l));
      toast({ title: "Couldn't save notes", description: error.message, variant: "destructive" });
    }
  }, [userId]);

  const setOutcomeFor = useCallback(async (lead: Lead, label: string, callbackAt?: string | null) => {
    if (!userId || !label) return;
    const def = OUTCOMES.find(o => o.label === label);
    if (!def) return;
    if (def.label === "Schedule Callback" && !callbackAt) {
      // Open the date/time picker; actual save happens after confirmation
      const now = new Date();
      now.setDate(now.getDate() + 1);
      setCallbackLead(lead);
      setCallbackDate(now.toISOString().slice(0, 10));
      setCallbackTime("10:00");
      return;
    }
    setSavingId(lead.id);
    setLatestOutcomeByLead(prev => ({ ...prev, [lead.id]: label }));
    const optimistic: OutcomeRow = { lead_id: lead.id, outcome: label, objection_type: def.objection, logged_at: new Date().toISOString() };
    setOutcomes(prev => [optimistic, ...prev]);
    if (def.label === "Won") {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, pipeline_stage: "won" } : l));
    }
    if (callbackAt) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, callback_at: callbackAt } : l));
    }
    try {
      const { error } = await (supabase as any).from("bdr_call_outcomes").insert({
        bdr_user_id: userId,
        client_id: clientId,
        lead_id: lead.id,
        outcome: def.label,
        objection_type: def.objection,
      });
      if (error) throw error;
      let pipelineStage: "cold" | "warm" | "hot" | "won" = "warm";
      if (def.label === "Won") pipelineStage = "won";
      else if (def.label === "Lost") pipelineStage = "cold";
      else if (def.label === "Schedule Callback") pipelineStage = "hot";
      else if (def.label === "Said They Would Reach Out") pipelineStage = "warm";
      else if (def.label === "Didn't Answer") pipelineStage = (lead.pipeline_stage as any) || "cold";
      else pipelineStage = "warm";
      // Logging an outcome never moves the lead to "dialed" — only the Mark Dialed switch does.
      const leadPatch: Record<string, unknown> = { pipeline_stage: pipelineStage };
      if (callbackAt) {
        leadPatch.callback_at = callbackAt;
        leadPatch.callback_set_at = new Date().toISOString();
      }
      await (supabase as any).from("nl_bdr_leads")
        .update(leadPatch).eq("id", lead.id).eq("user_id", userId);
      logDialerEvent({
        leadId: lead.id,
        businessName: lead.business_name,
        ownerName: lead.owner_name,
        outcome: def.label,
        stage: pipelineStage,
        notes: lead.notes,
      }).catch(() => {});
      if (def.objection) {
        const { count } = await (supabase as any)
          .from("bdr_call_outcomes")
          .select("id", { count: "exact", head: true })
          .eq("bdr_user_id", userId)
          .eq("objection_type", def.objection);
        if (count === 50) {
          toast({
            title: "🎉 Training module unlocked",
            description: `You've logged 50 "${def.objection}" objections. The extension training module is now unlocked.`,
          });
        } else {
          toast({ title: "Outcome logged", description: count ? `${count}/50 toward ${def.objection} unlock.` : undefined });
        }
      } else if (def.label === "Schedule Callback" && callbackAt) {
        toast({ title: "Callback scheduled", description: new Date(callbackAt).toLocaleString() });
      } else {
        toast({ title: "Outcome logged" });
      }
    } catch (e: any) {
      setOutcomes(prev => prev.filter(o => o !== optimistic));
      toast({ title: "Failed to log outcome", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }, [userId, clientId, recordDial]);

  const confirmCallback = useCallback(async () => {
    if (!callbackLead || !callbackDate || !callbackTime) return;
    const iso = new Date(`${callbackDate}T${callbackTime}`).toISOString();
    const lead = callbackLead;
    setCallbackLead(null);
    await setOutcomeFor(lead, "Schedule Callback", iso);
  }, [callbackLead, callbackDate, callbackTime, setOutcomeFor]);

  const handleDeleteLead = async (lead: Lead) => {
    if (!userId) return;
    if (!(await askConfirm("Delete lead", `Delete "${lead.business_name}" permanently? This cannot be undone.`))) return;
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    const { error } = await (supabase as any).from("nl_bdr_leads").delete().eq("id", lead.id).eq("user_id", userId);
    if (error) {
      toast({ title: "Couldn't delete lead", description: error.message, variant: "destructive" });
      setLeads(prev => [...prev, lead]);
      return;
    }
    if (lead.crm_deal_id) {
      await supabase.from("crm_deals").delete().eq("id", lead.crm_deal_id);
    }
    await (supabase as any).from("bdr_calendar_events").delete().eq("lead_id", lead.id);
    toast({ title: "Lead deleted", description: lead.business_name });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">BDR Dialer</h1>
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-8 text-center">
            <p className="text-white/50 text-sm">No leads in your queue. Add leads from the My Leads page to start dialing.</p>
            <Button className="mt-4" onClick={() => navigate("/employee/leads")}>Go to My Leads</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const STAT_PILLS: { label: string; key: string; tone: string }[] = [
    { label: "Total Calls", key: "__total__", tone: "hsl(211,96%,60%)" },
    { label: "Won", key: "Won", tone: "hsl(142,72%,42%)" },
    { label: "Lost", key: "Lost", tone: "hsl(0,72%,55%)" },
    { label: "Will Reach Out", key: "Said They Would Reach Out", tone: "hsl(168,76%,48%)" },
    { label: "No Answer", key: "Didn't Answer", tone: "hsl(215,14%,55%)" },
    { label: "Callbacks", key: "Schedule Callback", tone: "hsl(190,90%,55%)" },
    { label: "Gatekeeper", key: "Gatekeeper", tone: "hsl(38,92%,55%)" },
    { label: "Didn't Get Past Gatekeeper", key: "Didn't Get Past Gatekeeper", tone: "hsl(28,90%,55%)" },
    { label: "Not Interested", key: "Not Interested", tone: "hsl(0,0%,70%)" },
    { label: "Don't See the Value", key: "Don't See the Value", tone: "hsl(0,0%,60%)" },
    { label: "Need to Think", key: "Need to Think", tone: "hsl(48,96%,55%)" },
    { label: "Need to Talk to Someone", key: "Need to Talk to Someone", tone: "hsl(48,80%,45%)" },
    { label: "Too Expensive", key: "Too Expensive", tone: "hsl(280,80%,65%)" },
    { label: "What's Your Pricing", key: "What's Your Pricing", tone: "hsl(280,60%,55%)" },
    { label: "Bad Experience", key: "Bad Experience", tone: "hsl(15,80%,60%)" },
    { label: "Already Have Someone", key: "Already Have Someone", tone: "hsl(15,60%,50%)" },
    { label: "In-House Team", key: "In-House Team", tone: "hsl(25,70%,55%)" },
    { label: "Stacked Objections", key: "Stacked Objections", tone: "hsl(187,80%,55%)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">BDR Dialer</h1>
          <p className="text-xs text-white/50 mt-1">{visibleLeads.length} lead{visibleLeads.length !== 1 ? "s" : ""} {activeList !== ALL_LIST && `in "${activeList}"`}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/employee/training")} className="text-white/60">
          <BookOpen className="h-4 w-4 mr-1" /> Training
        </Button>
      </div>

      {/* Owner search */}
      <div className="relative">
        <div className="flex items-center h-10 rounded-lg px-3 gap-2"
          style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.18)" }}>
          <Search className="h-4 w-4 text-white/40 shrink-0" />
          <input
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            placeholder="Search owner name..."
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/35 w-full"
          />
          {ownerSearch && (
            <button onClick={() => setOwnerSearch("")} className="text-white/40 hover:text-white/70 shrink-0" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {ownerSearch.trim() && (
          <div className="absolute z-40 mt-1 w-full rounded-lg overflow-hidden shadow-lg"
            style={{ background: "hsl(215,35%,10%)", border: "1px solid hsla(211,96%,60%,.25)" }}>
            {searchMatches.length === 0 ? (
              <div className="px-3 py-3 text-xs text-white/40">No owners match "{ownerSearch}".</div>
            ) : searchMatches.map(m => (
              <button key={m.id} onClick={() => jumpToLead(m)}
                className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition-colors border-b border-white/5 last:border-b-0">
                <div className="text-sm text-white break-words">{stripLeadFlags(m.owner_name) || <span className="italic text-white/40">No owner name</span>}</div>
                <div className="text-[11px] text-white/50 break-words">{m.business_name}{m.list_name ? ` · ${m.list_name}` : ""}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Call count summary */}

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex items-stretch gap-2 min-w-max pb-1">
          {[
            { label: "Today", key: "today" as const, tone: "hsl(211,96%,60%)" },
            { label: "This Week", key: "week" as const, tone: "hsl(152,76%,55%)" },
            { label: "This Month", key: "month" as const, tone: "hsl(43,96%,65%)" },
            { label: "Total Calls", key: "all" as const, tone: "hsl(262,80%,72%)" },
          ].map(p => (
            <div key={p.key}
              className="rounded-lg px-3 py-2 flex flex-col justify-between min-w-[100px]"
              style={{ background: "hsla(215,35%,10%,.8)", border: `1px solid ${p.tone}33` }}>
              <span className="text-[9px] uppercase tracking-wider leading-tight text-white/55 line-clamp-2">{p.label}</span>
              <span className="text-lg font-bold mt-1" style={{ color: p.tone }}>{callCounts[p.key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex items-stretch gap-2 min-w-max pb-1">
          {STAT_PILLS.map(p => {
            const count = p.key === "__total__" ? stats.total : (stats.counts[p.key] || 0);
            return (
              <div key={p.key}
                className="rounded-lg px-3 py-2 flex flex-col justify-between min-w-[112px]"
                style={{ background: "hsla(215,35%,10%,.8)", border: `1px solid ${p.tone}33` }}>
                <span className="text-[9px] uppercase tracking-wider leading-tight text-white/55 line-clamp-2">{p.label}</span>
                <span className="text-lg font-bold mt-1" style={{ color: p.tone }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Show Dialed toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={showDialed}
          aria-label="Show Dialed"
          onClick={() => setShowDialed(v => !v)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]"
          style={{
            background: showDialed ? "hsla(211,96%,56%,.15)" : "hsla(215,35%,10%,.6)",
            color: showDialed ? "hsl(211,96%,72%)" : "hsl(0,0%,70%)",
            border: `1px solid ${showDialed ? "hsla(211,96%,56%,.4)" : "hsla(211,96%,60%,.12)"}`,
          }}
        >
          <span className="relative inline-block h-4 w-7 rounded-full transition-colors" style={{ background: showDialed ? "hsl(211,96%,56%)" : "hsla(0,0%,100%,.2)" }}>
            <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" style={{ left: showDialed ? 14 : 2 }} />
          </span>
          Show Dialed
        </button>
        <WonHistoryButton userId={userId} onOpenLead={() => navigate("/employee/leads?filter=stage:won")} />
        <span className="text-[11px] text-white/40">
          {showDialed ? "Dialed, not yet won — most recently dialed first" : "Not yet dialed"}
        </span>
      </div>

      {/* List tabs */}
      <div
        className="flex items-center gap-1.5 flex-nowrap overflow-x-auto -mx-1 px-1 pb-1"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
      >
        <button
          onClick={() => setActiveList(ALL_LIST)}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
          style={{
            background: activeList === ALL_LIST ? "hsla(211,96%,56%,.15)" : "hsla(215,35%,10%,.6)",
            color: activeList === ALL_LIST ? "hsl(211,96%,72%)" : "hsl(0,0%,70%)",
            border: `1px solid ${activeList === ALL_LIST ? "hsla(211,96%,56%,.4)" : "hsla(211,96%,60%,.12)"}`,
          }}
        >
          All Leads <span className="opacity-60 ml-1">{modeLeads.length}</span>
        </button>
        {lists.map(([name, count]) => (
          <div key={name} className="shrink-0 inline-flex items-center rounded-lg"
            style={{
              background: activeList === name ? "hsla(211,96%,56%,.15)" : "hsla(215,35%,10%,.6)",
              color: activeList === name ? "hsl(211,96%,72%)" : "hsl(0,0%,70%)",
              border: `1px solid ${activeList === name ? "hsla(211,96%,56%,.4)" : "hsla(211,96%,60%,.12)"}`,
            }}>
            <button onClick={() => setActiveList(name)}
              className="pl-3 pr-1 py-1.5 text-xs font-medium whitespace-nowrap">
              {name} <span className="opacity-60 ml-1">{count}</span>
            </button>
            {name !== "Uncategorized" && (
              <RenameListButton
                listName={name}
                existingLists={lists.map(([n]) => n).filter(n => n !== "Uncategorized")}
                onRenamed={(oldN, newN) => {
                  setLeads(prev => prev.map(l => l.list_name === oldN ? { ...l, list_name: newN } : l));
                  setActiveList(cur => cur === oldN ? newN : cur);
                }}
                className="mr-1.5 ml-0.5 inline-flex items-center justify-center rounded p-1 hover:bg-white/10 transition-colors"
              />
            )}
          </div>
        ))}
      </div>

      {/* Spreadsheet */}
      <div className="rounded-xl" style={{ border: "1px solid hsla(211,96%,60%,.12)", background: "hsla(215,35%,8%,.8)" }}>
        <div
          className="overflow-x-auto rounded-xl"
          style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain", touchAction: "pan-x" }}
        >
          <table className="text-sm border-collapse w-max">
            <thead className="sticky top-0 z-30" style={{ background: "hsl(215,35%,12%)" }}>
              <tr className="text-left text-[10px] uppercase tracking-wider text-white/55">
                <th className="px-3 py-3 font-semibold border-b border-white/10 w-10 min-w-[40px] max-w-[40px]" style={{ background: "hsl(215,35%,12%)" }}>#</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[200px]" style={{ background: "hsl(215,35%,12%)" }}>Business Name</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[180px]">Owner</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[140px]">Phone</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[180px]">Website</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 w-24 text-center">Booking Sys</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 text-center w-16">Called</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 w-[260px]">Outcome</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[320px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-white/40 py-12 text-xs">No leads in this list.</td>
                </tr>
              ) : visibleLeads.map((lead, i) => {
                const current = latestOutcomeByLead[lead.id] || "";
                const pinned = false;
                return (
                  <tr key={lead.id}
                    ref={(el) => { rowRefs.current[lead.id] = el; }}
                    className={`hover:bg-white/[0.03] transition-colors align-top ${highlightId === lead.id ? "ring-2 ring-[hsl(211,96%,60%)]" : ""}`}
                    style={highlightId === lead.id ? { background: "hsla(211,96%,56%,.12)" } : pinned ? { background: "hsla(38,92%,55%,.08)" } : undefined}>

                    <td className="px-3 py-3 border-b border-white/5 w-10 min-w-[40px] max-w-[40px]" style={{ background: pinned ? "hsla(38,92%,55%,.10)" : "hsl(215,35%,8%)", boxShadow: pinned ? "inset 3px 0 0 hsl(38,92%,55%)" : undefined }} title={pinned ? `Pinned: ${current}` : undefined}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-white/40 text-[11px]">{i + 1}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead); }}
                          aria-label={`Delete ${lead.business_name}`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-white/5 text-white font-medium break-words leading-snug min-w-[200px]" style={{ background: "hsl(215,35%,8%)" }}>{lead.business_name}</td>
                    <td className="px-3 py-3 border-b border-white/5 text-white/70 break-words leading-snug">
                      {(() => {
                        const flags = parseLeadFlags(lead.owner_name);
                        const cleaned = stripLeadFlags(lead.owner_name);
                        return (
                          <div className="flex flex-col gap-1">
                            <span>{cleaned || "—"}</span>
                            {flags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {flags.map(f => {
                                  const isFitRisk = f.startsWith("FIT-RISK");
                                  return (
                                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                      style={isFitRisk
                                        ? { background: "hsla(38,92%,55%,.18)", color: "hsl(38,92%,68%)", border: "1px solid hsla(38,92%,55%,.4)" }
                                        : { background: "hsla(0,72%,50%,.18)", color: "hsl(0,72%,72%)", border: "1px solid hsla(0,72%,50%,.4)" }}>
                                      {f}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3 border-b border-white/5 break-words">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const phones = getLeadPhones(lead);
                          if (phones.length === 0) return <span className="text-white/30">—</span>;
                          return phones.map((p) => {
                            const isOwner = p.kind === "owner_direct" || p.kind === "legacy_owner";
                            const isFrontDesk = p.kind === "front_desk" || p.kind === "legacy_front_desk";
                            return (
                              <span key={p.kind + p.number} className="inline-flex items-center gap-1 flex-wrap">
                                <a href={`tel:${p.number}`}
                                  onClick={() => {
                                    // Count the call for stats only; lead stays in its list until "Mark Dialed" is flipped.
                                    recordDial(lead.id);
                                  }}
                                  className="font-mono inline-flex items-center gap-1 hover:underline text-xs" style={{ color: "hsl(211,96%,68%)" }}>
                                  <Phone className="h-3 w-3" /> {p.number}
                                </a>
                                {isOwner ? (
                                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }}>Owner Direct</span>
                                ) : isFrontDesk ? (
                                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>Front Desk</span>
                                ) : (
                                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>Phone</span>
                                )}
                              </span>
                            );
                          });
                        })()}
                        {(lead.owner_booking_link_send_ready || lead.owner_booking_link) && (
                          <a
                            href={(lead.owner_booking_link_send_ready || lead.owner_booking_link)!.startsWith("http")
                              ? (lead.owner_booking_link_send_ready || lead.owner_booking_link)!
                              : `https://${lead.owner_booking_link_send_ready || lead.owner_booking_link}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold hover:brightness-110 w-fit uppercase tracking-wide"
                            style={{ background: "linear-gradient(135deg, hsla(38,95%,55%,.28), hsla(38,95%,50%,.18))", color: "hsl(38,100%,72%)", border: "1px solid hsla(38,95%,55%,.6)", boxShadow: "0 0 0 1px hsla(38,95%,55%,.15) inset" }}
                            title={`Send-ready owner calendar link: ${lead.owner_booking_link_send_ready || lead.owner_booking_link}`}
                          >
                            <Calendar className="h-3 w-3" />
                            Book with Owner
                          </a>
                        )}
                        {lead.booking_link && !(lead.owner_booking_link_send_ready || lead.owner_booking_link) && (() => {
                          const conf = lead.owner_calendar_confirmed ?? lead.booking_link_is_owner;
                          return (
                            <a
                              href={lead.booking_link.startsWith("http") ? lead.booking_link : `https://${lead.booking_link}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium hover:underline w-fit"
                              style={conf === true
                                ? { background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }
                                : { background: "hsla(211,96%,56%,.12)", color: "hsl(211,96%,68%)", border: "1px dashed hsla(211,96%,60%,.35)" }}
                              title={lead.booking_link}
                            >
                              <Calendar className="h-3 w-3" />
                              {conf === true ? "Owner's Calendar" : conf === false ? "Booking Link (not owner)" : "Booking Link"}
                            </a>
                          );
                        })()}
                        {lead.self_booking_widget_non_owner && (lead.owner_calendar_confirmed ?? lead.booking_link_is_owner) !== true && (
                          <span
                            className="text-[10px] inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium w-fit"
                            style={{ background: "hsla(280,70%,60%,.15)", color: "hsl(280,80%,78%)", border: "1px solid hsla(280,70%,60%,.4)" }}
                            title="Self-booking widget exists but not confirmed as the owner's"
                          >
                            <CalendarClock className="h-3 w-3" />
                            Self-Booking Widget
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-white/5 break-words">
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs hover:underline break-all inline-block align-middle"
                          style={{ color: "hsl(211,96%,68%)" }}
                          title={lead.website}
                        >
                          {lead.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")}
                        </a>
                      ) : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-3 py-3 border-b border-white/5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <BookingSystemBadge lead={lead} />
                        {lead.dialer_bookable === true && (
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" title="Platform supports embedded booking from the dialer" style={{ background: "hsla(142,80%,45%,.22)", color: "hsl(142,85%,68%)", border: "1px solid hsla(142,80%,50%,.55)" }}>Dialer-Bookable</span>
                        )}
                        {lead._claimConflict && (
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" title="This phone number also exists under another rep's account. Contact an admin to resolve." style={{ background: "hsla(38,90%,55%,.18)", color: "hsl(38,95%,68%)", border: "1px solid hsla(38,90%,55%,.55)" }}>Claim Conflict</span>
                        )}

                      </div>
                    </td>

                    <td className="px-3 py-3 border-b border-white/5 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!lead.called}
                        onClick={() => toggleCalled(lead)}
                        aria-label={`Mark ${lead.business_name} as dialed`}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors min-h-[36px]"
                        style={{
                          background: lead.called ? "hsla(142,72%,42%,.15)" : "hsla(215,35%,10%,.6)",
                          color: lead.called ? "hsl(142,72%,62%)" : "hsl(0,0%,70%)",
                          border: `1px solid ${lead.called ? "hsla(142,72%,42%,.45)" : "hsla(211,96%,60%,.12)"}`,
                        }}
                      >
                        <span className="relative inline-block h-4 w-7 rounded-full transition-colors" style={{ background: lead.called ? "hsl(142,72%,42%)" : "hsla(0,0%,100%,.2)" }}>
                          <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" style={{ left: lead.called ? 14 : 2 }} />
                        </span>
                        {lead.called ? "Dialed" : "Mark Dialed"}
                      </button>
                    </td>
                    <td className="px-3 py-3 border-b border-white/5">
                      <select
                        value={current}
                        disabled={savingId === lead.id}
                        onChange={(e) => setOutcomeFor(lead, e.target.value)}
                        className="w-full bg-transparent text-white text-xs px-2 py-2 rounded border border-white/10 hover:border-white/20 focus:border-[hsl(211,96%,56%)] focus:outline-none cursor-pointer"
                        style={{ background: current ? "hsla(211,96%,56%,.08)" : "hsla(0,0%,100%,.02)" }}
                      >
                        <option value="" className="bg-[hsl(220,35%,12%)]">— Select outcome —</option>
                        <optgroup label="No Contact">
                          {OUTCOMES.filter(o => o.category === "no_contact").map(o => (
                            <option key={o.label} value={o.label} className="bg-[hsl(220,35%,12%)]">{o.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Positive">
                          {OUTCOMES.filter(o => o.category === "positive").map(o => (
                            <option key={o.label} value={o.label} className="bg-[hsl(220,35%,12%)]">{o.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Objections">
                          {OUTCOMES.filter(o => o.category === "objection").map(o => (
                            <option key={o.label} value={o.label} className="bg-[hsl(220,35%,12%)]">{o.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Closed">
                          {OUTCOMES.filter(o => o.category === "closed").map(o => (
                            <option key={o.label} value={o.label} className="bg-[hsl(220,35%,12%)]">{o.label}</option>
                          ))}
                        </optgroup>
                      </select>
                      {(lead.pipeline_stage === "hot" || lead.pipeline_stage === "won") && (
                        <Button
                          size="sm"
                          className="mt-2 w-full h-7 text-xs bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]"
                          onClick={() => navigate(`/employee/close-prep/${lead.id}`)}
                        >
                          Close Prep
                        </Button>
                      )}
                    </td>
                    <td className="px-3 py-3 border-b border-white/5">
                      <NotesCell
                        key={lead.id + ":" + (lead.notes || "")}
                        initial={lead.notes || ""}
                        onSave={(v) => saveNotes(lead, v)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!callbackLead} onOpenChange={(o) => !o && setCallbackLead(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Schedule Callback</DialogTitle>
          </DialogHeader>
          {callbackLead && (
            <div className="space-y-3">
              <div className="text-sm text-white/70">
                <p className="font-semibold text-white">{callbackLead.business_name}</p>
                {callbackLead.owner_name && <p className="text-xs">{callbackLead.owner_name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/50">Date</label>
                  <input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)}
                    className="w-full mt-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[hsl(211,96%,56%)]" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-white/50">Time</label>
                  <input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)}
                    className="w-full mt-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[hsl(211,96%,56%)]" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCallbackLead(null)}>Cancel</Button>
            <Button onClick={confirmCallback} disabled={!callbackDate || !callbackTime}>Save Callback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmState}
        onOpenChange={(o) => { if (!o) { confirmState?.resolve(false); setConfirmState(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { confirmState?.resolve(false); setConfirmState(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { confirmState?.resolve(true); setConfirmState(null); }}
            >
              {confirmState?.confirmLabel || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// ─── Won history ─────────────────────────────────────────────────────────────
// Every lead this BDR marked Won (bdr_call_outcomes) or owns at stage "won",
// de-duplicated by lead id, newest first. Read-only; does not affect the queue.
const WON_PAGE = 200;

type WonEntry = { leadId: string; wonAt: string | null };
type WonRow = WonEntry & {
  business_name: string | null;
  owner_name: string | null;
  phone: string | null;
  appointmentAt: string | null;
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function WonHistoryButton({ userId, onOpenLead }: { userId: string | null; onOpenLead: () => void }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<WonEntry[] | null>(null);
  const [rows, setRows] = useState<WonRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!userId) return;
    const [{ data: outs }, { data: wonLeads }] = await Promise.all([
      (supabase as any).from("bdr_call_outcomes").select("lead_id, logged_at")
        .eq("bdr_user_id", userId).eq("outcome", "Won")
        .order("logged_at", { ascending: false }).limit(5000),
      (supabase as any).from("nl_bdr_leads").select("id, updated_at")
        .eq("user_id", userId).eq("pipeline_stage", "won").limit(5000),
    ]);
    const map = new Map<string, string | null>();
    (outs || []).forEach((o: any) => {
      if (!o.lead_id) return;
      const prev = map.get(o.lead_id);
      if (!prev || (o.logged_at && o.logged_at > prev)) map.set(o.lead_id, o.logged_at || null);
    });
    (wonLeads || []).forEach((l: any) => {
      if (!map.has(l.id)) map.set(l.id, l.updated_at || null);
    });
    const list = [...map.entries()].map(([leadId, wonAt]) => ({ leadId, wonAt }))
      .sort((a, b) => (b.wonAt || "").localeCompare(a.wonAt || ""));
    setEntries(list);
    return list;
  }, [userId]);

  const loadDetails = useCallback(async (slice: WonEntry[]) => {
    if (!slice.length) return [] as WonRow[];
    const ids = slice.map((e) => e.leadId);
    const leadMap: Record<string, any> = {};
    const apptMap: Record<string, string> = {};
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const [{ data: leads }, { data: evts }] = await Promise.all([
        (supabase as any).from("nl_bdr_leads")
          .select("id, business_name, owner_name, phone, owner_direct_phone, front_desk_phone").in("id", chunk),
        (supabase as any).from("bdr_calendar_events")
          .select("lead_id, starts_at, source").in("lead_id", chunk).neq("source", "dialer")
          .order("starts_at", { ascending: false }),
      ]);
      (leads || []).forEach((l: any) => { leadMap[l.id] = l; });
      (evts || []).forEach((e: any) => { if (e.lead_id && !apptMap[e.lead_id]) apptMap[e.lead_id] = e.starts_at; });
    }
    // Leads deleted since being won are skipped.
    return slice.filter((e) => leadMap[e.leadId]).map((e) => {
      const l = leadMap[e.leadId];
      return {
        ...e,
        business_name: l.business_name,
        owner_name: l.owner_name,
        phone: l.owner_direct_phone || l.phone || l.front_desk_phone || null,
        appointmentAt: apptMap[e.leadId] || null,
      };
    });
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const openSheet = async () => {
    setOpen(true);
    setRows([]);
    setLoadingMore(true);
    const list = (await loadEntries()) || [];
    setRows(await loadDetails(list.slice(0, WON_PAGE)));
    setLoadingMore(false);
  };

  const loadedCount = useRef(0);
  useEffect(() => { loadedCount.current = rows.length; }, [rows]);
  const [offset, setOffset] = useState(WON_PAGE);
  useEffect(() => { if (open) setOffset(WON_PAGE); }, [open]);

  const loadMore = async () => {
    if (!entries) return;
    setLoadingMore(true);
    const more = await loadDetails(entries.slice(offset, offset + WON_PAGE));
    setRows((prev) => [...prev, ...more]);
    setOffset((o) => o + WON_PAGE);
    setLoadingMore(false);
  };

  const total = entries?.length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        disabled={!userId}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-colors"
        style={{ background: "hsla(142,72%,42%,.12)", color: "hsl(142,72%,62%)", border: "1px solid hsla(142,72%,42%,.35)" }}
      >
        <Trophy className="h-3.5 w-3.5" />
        Won history{entries ? ` (${total})` : ""}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[hsl(215,35%,10%)] border-white/10 text-white p-0 gap-0 flex flex-col overflow-hidden max-h-[100dvh] h-[100dvh] sm:h-auto sm:max-h-[85dvh] w-full max-w-lg">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
            <DialogTitle>Won history{entries ? ` (${total})` : ""}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2" style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}>
            {loadingMore && rows.length === 0 ? (
              <div className="py-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-white/50">
                No won leads yet. When you log a "Won" outcome, the lead shows up here.
              </div>
            ) : (
              <>
                {rows.map((r) => (
                  <button
                    key={r.leadId}
                    type="button"
                    onClick={() => { setOpen(false); onOpenLead(); }}
                    className="w-full text-left rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-3 space-y-1"
                  >
                    <div className="text-sm font-semibold break-words">{r.business_name || "Unnamed firm"}</div>
                    <div className="text-xs text-white/60 break-words">
                      {r.owner_name || "—"}{r.phone ? ` · ${r.phone}` : ""}
                    </div>
                    <div className="text-[11px] text-white/45">
                      Won {fmtDateTime(r.wonAt)}
                      {r.appointmentAt && <span className="text-[hsl(142,72%,62%)]"> · Appointment {fmtDateTime(r.appointmentAt)}</span>}
                    </div>
                  </button>
                ))}
                {entries && offset < entries.length && (
                  <Button variant="ghost" className="w-full text-white/70" disabled={loadingMore} onClick={loadMore}>
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
