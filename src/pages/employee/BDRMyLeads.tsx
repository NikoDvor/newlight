import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Upload, Search, Phone, ExternalLink, ChevronDown, ChevronUp, BookOpen, CheckCircle2, Trash2, HelpCircle, Calendar, MapPin, Copy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomerProfilePanel from "@/components/CustomerProfilePanel";
import { useEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { parseLeadFlags, getLeadPhones } from "@/lib/leadFlags";
import RenameListButton from "@/components/employee/RenameListButton";

/* ─── types ─── */
interface OutcomeEntry { label: string; note?: string; timestamp: string }
interface BdrLead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  front_desk_phone: string | null;
  owner_direct_phone: string | null;
  website: string | null;
  niche: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  crm_deal_id: string | null;
  outcome_history: OutcomeEntry[];
  objection_category: string | null;
  has_booking_system: boolean | null;
  booking_system_exists: boolean | null;
  list_name: string | null;
  pipeline_stage: string | null;
  phone_type: string | null;
  booking_link: string | null;
  booking_link_is_owner: boolean | null;
  owner_calendar_confirmed: boolean | null;
  owner_booking_link: string | null;
  owner_booking_link_send_ready: string | null;
  dialer_bookable: boolean | null;
  created_at: string;
}

/* ─── pipeline stages ─── */
type PipelineStageKey = "cold" | "warm" | "hot" | "won";
interface PipelineStageDef {
  key: PipelineStageKey;
  label: string;
  description: string;
  bg: string;
  text: string;
  border: string;
  bar: string;
}
const PIPELINE_STAGES: PipelineStageDef[] = [
  { key: "cold", label: "Cold Lead",            description: "New contact, not yet reached",
    bg: "hsla(211,80%,60%,.15)", text: "hsl(211,90%,70%)", border: "hsla(211,80%,60%,.4)", bar: "hsl(211,90%,60%)" },
  { key: "warm", label: "Contacted / Warm Lead", description: "Reached owner, showed interest",
    bg: "hsla(38,92%,55%,.15)",  text: "hsl(38,95%,65%)",  border: "hsla(38,92%,55%,.4)",  bar: "hsl(38,92%,55%)" },
  { key: "hot",  label: "Follow Up / Hot Lead",  description: "Requested callback or follow up",
    bg: "hsla(14,90%,58%,.15)",  text: "hsl(14,95%,68%)",  border: "hsla(14,90%,58%,.4)",  bar: "hsl(14,90%,58%)" },
  { key: "won",  label: "Won",                   description: "Appointment booked or deal closed",
    bg: "hsla(142,72%,42%,.18)", text: "hsl(142,72%,55%)", border: "hsla(142,72%,42%,.5)", bar: "hsl(142,72%,42%)" },
];
const STAGE_BY_KEY: Record<PipelineStageKey, PipelineStageDef> =
  PIPELINE_STAGES.reduce((acc, s) => { acc[s.key] = s; return acc; }, {} as any);

export function pipelineStageFromOutcome(label: string | null | undefined): PipelineStageKey | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("won") || l.includes("booked") || l.includes("closed on the spot")) return "won";
  if (l.includes("call back") || l.includes("callback") || l.includes("follow up") ||
      l.includes("follow-up") || l.includes("owner wasn't") || l.includes("asked for info") ||
      l.includes("left owner")) return "hot";
  if (l === "lost") return "cold";
  // objections / any other contacted outcome
  return "warm";
}

function derivePipelineStage(lead: BdrLead): PipelineStageKey {
  if (lead.pipeline_stage && (STAGE_BY_KEY as any)[lead.pipeline_stage]) {
    return lead.pipeline_stage as PipelineStageKey;
  }
  const last = lead.outcome_history?.[lead.outcome_history.length - 1]?.label;
  const fromOutcome = pipelineStageFromOutcome(last);
  if (fromOutcome) return fromOutcome;
  if (lead.status === "closed_won" || lead.status === "appointment_booked") return "won";
  if (lead.status === "contacted") return "warm";
  return "cold";
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
  { key: "WE_WILL_REACH_OUT", label: "WE WILL REACH OUT — Prospect said they'd reach out", chapter: "19" },
];

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  new_lead:    { label: "New Lead",    bg: "hsla(211,96%,56%,.15)", text: "hsl(211,96%,56%)" },
  contacted:   { label: "Contacted",   bg: "hsla(187,80%,50%,.15)", text: "hsl(187,80%,50%)" },
  appointment_booked: { label: "Booked", bg: "hsla(263,70%,55%,.15)", text: "hsl(263,70%,55%)" },
  closed_won:  { label: "Closed Won",  bg: "hsla(142,72%,42%,.15)", text: "hsl(142,72%,42%)" },
  closed_lost: { label: "Closed Lost", bg: "hsla(0,0%,50%,.15)",    text: "hsl(0,0%,60%)" },
};

const FILTER_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  ...PIPELINE_STAGES.map(s => ({ key: `stage:${s.key}`, label: s.label })),
];

/* ─── page ─── */
export default function BDRMyLeads() {
  const { user } = useWorkspace();
  const { clientId } = useEmployeeClientId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<BdrLead[]>([]);
  const [calledLeadIds, setCalledLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showStreetSweepGuide, setShowStreetSweepGuide] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [outcomeLead, setOutcomeLead] = useState<BdrLead | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profileLeadId, setProfileLeadId] = useState<string | null>(null);
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

  useEffect(() => {
    const f = searchParams.get("filter") || "all";
    if (FILTER_TABS.some(t => t.key === f)) setFilter(f);
  }, [searchParams]);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  const isCreatedToday = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return false;
    return createdTime >= todayStart && createdTime < tomorrowStart;
  };
  const todayCount = leads.filter(l => isCreatedToday(l.created_at)).length;

  const lists = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      const key = l.list_name || "Unsorted";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads]);

  const existingListsByRecency = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      if (!l.list_name) return;
      const t = new Date(l.created_at).getTime();
      map.set(l.list_name, Math.max(map.get(l.list_name) || 0, t));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [leads]);

  const listScopedLeads = useMemo(() => {
    if (activeList === "__all__") return leads;
    if (activeList === "Unsorted") return leads.filter(l => !l.list_name);
    return leads.filter(l => l.list_name === activeList);
  }, [leads, activeList]);

  const filtered = useMemo(() => {
    let list = listScopedLeads;
    if (filter === "today") list = list.filter(l => isCreatedToday(l.created_at));
    else if (filter.startsWith("stage:")) {
      const target = filter.slice(6) as PipelineStageKey;
      list = list.filter(l => derivePipelineStage(l) === target);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.business_name.toLowerCase().includes(q) || (l.owner_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [listScopedLeads, filter, search, todayStart, tomorrowStart]);

  const stageCounts = useMemo(() => {
    const counts: Record<PipelineStageKey, number> = { cold: 0, warm: 0, hot: 0, won: 0 };
    listScopedLeads.forEach(l => { counts[derivePipelineStage(l)] += 1; });
    return counts;
  }, [listScopedLeads]);

  const stats = useMemo(() => {
    const scope = listScopedLeads;
    const total = scope.length;
    const contacted = scope.filter(l => l.status === "contacted").length;
    const booked = scope.filter(l => l.status === "appointment_booked").length;
    const won = scope.filter(l => l.status === "closed_won").length;
    return { total, contacted, booked, won, rate: total ? Math.round((booked / total) * 100) : 0 };
  }, [listScopedLeads]);

  const handleChangeStage = async (lead: BdrLead, stage: PipelineStageKey) => {
    if (!user?.id) return;
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, pipeline_stage: stage } : l));
    const { error } = await (supabase as any).from("nl_bdr_leads")
      .update({ pipeline_stage: stage }).eq("id", lead.id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Couldn't update stage", description: error.message, variant: "destructive" });
      fetchLeads();
      return;
    }
    toast({ title: `Moved to ${STAGE_BY_KEY[stage].label}`, description: lead.business_name });
  };


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

  const checkClaim = async (phone?: string | null, website?: string | null) => {
    try {
      const { data } = await (supabase as any).rpc("check_lead_claimed", {
        _phone: phone || null,
        _website: website || null,
      });
      const row = Array.isArray(data) ? data[0] : data;
      return row as { claimed: boolean; claimed_by_self: boolean; claimed_by_name: string | null } | null;
    } catch {
      return null;
    }
  };

  const handleAddLead = async (form: Record<string, string>) => {
    if (!user?.id) return;
    const primaryPhone = form.owner_direct_phone || form.front_desk_phone || "";
    // Claim check runs against whichever phone the rep entered (owner takes
    // precedence when both are present, matching how getPrimaryLeadPhone picks).
    const claim = await checkClaim(primaryPhone, form.website);
    if (claim?.claimed && !claim.claimed_by_self) {
      toast({ title: "Lead already claimed", description: `This phone/website is already owned by ${claim.claimed_by_name || "another rep"}.`, variant: "destructive" });
      return;
    }
    const { data, error } = await (supabase as any).from("nl_bdr_leads").insert({
      user_id: user.id, client_id: clientId, business_name: form.business_name, owner_name: form.owner_name || null,
      front_desk_phone: form.front_desk_phone || null,
      owner_direct_phone: form.owner_direct_phone || null,
      website: form.website || null, niche: form.niche || null,
      city: form.city || null, notes: form.notes || null,
    }).select("id").single();
    if (error) {
      const msg = (error as any).code === "23505"
        ? "This phone number is already claimed by another rep."
        : error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }
    await createCRMRecords({ business_name: form.business_name, owner_name: form.owner_name, phone: primaryPhone, website: form.website }, data.id);
    toast({ title: "Lead added" }); setShowAdd(false); fetchLeads();
  };


  const handleImport = async (rows: any[], listName: string) => {
    if (!user?.id) return;
    const cleanList = listName.trim() || null;
    // Dedup scoped to the target list, not global
    const existingNames = new Set(
      leads
        .filter(l => (l.list_name || null) === cleanList)
        .map(l => (l.business_name || "").trim().toLowerCase())
    );
    const seenInBatch = new Set<string>();
    let count = 0;
    let skipped = 0;
    let claimedByOther = 0;
    const inserted: { id: string; street_number: number | null; side_of_street: string | null }[] = [];
    for (const row of rows) {
      const key = (row.business_name || "").trim().toLowerCase();
      if (!key || existingNames.has(key) || seenInBatch.has(key)) { skipped++; continue; }
      seenInBatch.add(key);

      // Pre-flight cross-rep claim check (owner-direct first, then front-desk,
      // then legacy phone, then website fallback). Owner wins because it's the
      // more distinctive identifier when both exist.
      const primaryPhone = row.owner_direct_phone || row.front_desk_phone || row.phone || null;
      const claim = await checkClaim(primaryPhone, row.website);
      if (claim?.claimed && !claim.claimed_by_self) {
        claimedByOther++;
        continue;
      }

      const { data, error } = await (supabase as any).from("nl_bdr_leads").insert({
        user_id: user.id, client_id: clientId,
        business_name: row.business_name,
        owner_name: row.owner_name || null,
        // New-format columns
        front_desk_phone: row.front_desk_phone || null,
        owner_direct_phone: row.owner_direct_phone || null,
        // Legacy fallthrough: only populate legacy phone/phone_type if the new
        // columns weren't produced by the parser (i.e. pasting old V17 data).
        phone: (!row.front_desk_phone && !row.owner_direct_phone) ? (row.phone || null) : null,
        phone_type: (!row.front_desk_phone && !row.owner_direct_phone) ? (row.phone_type ?? null) : null,
        website: row.website || null,
        booking_platform: row.booking_platform ?? null,
        has_booking_system: row.has_booking_system,
        booking_system_exists: row.booking_system_exists ?? row.has_booking_system ?? null,
        booking_link: row.booking_link || null,
        booking_link_is_owner: row.booking_link_is_owner ?? row.owner_calendar_confirmed ?? null,
        owner_calendar_confirmed: row.owner_calendar_confirmed ?? row.booking_link_is_owner ?? null,
        owner_booking_link: row.owner_booking_link || row.owner_booking_link_send_ready || null,
        owner_booking_link_send_ready: row.owner_booking_link_send_ready || row.owner_booking_link || null,
        self_booking_widget_non_owner: row.self_booking_widget_non_owner ?? null,
        dialer_bookable: row.dialer_bookable ?? null,
        meeting_booked: row.meeting_booked || null,
        crd: row.crd || null,
        city: row.city || null,
        niche: row.niche || null,
        street_address: row.street_address || null,
        street_number: row.street_number ?? null,
        side_of_street: row.side_of_street ?? null,
        source_type: row.street_address ? "street_sweep" : null,
        notes: [
          row.notes || null,
          row.rapport_note ? `Rapport: ${row.rapport_note}` : null,
        ].filter(Boolean).join("\n") || null,
        list_name: cleanList,
      }).select("id").single();
      // Safety net: unique index race
      if (error && (error as any).code === "23505") { claimedByOther++; continue; }
      if (data) {
        await createCRMRecords({ ...row, phone: primaryPhone }, data.id);
        inserted.push({ id: data.id, street_number: row.street_number ?? null, side_of_street: row.side_of_street ?? null });
        count++;
      }
    }

    // Walk order: only for this import's rows, keyed on the ids we just got back
    // (never re-queried by list name, so unrelated leads are untouched).
    const withStreet = inserted.filter(r => r.street_number != null);
    if (withStreet.length > 0) {
      withStreet.sort((a, b) => {
        const sa = a.side_of_street || "zz", sb = b.side_of_street || "zz";
        if (sa !== sb) return sa.localeCompare(sb);
        return (a.street_number || 0) - (b.street_number || 0);
      });
      await Promise.all(withStreet.map((r, i) =>
        (supabase as any).from("nl_bdr_leads").update({ sequence_order: i + 1 }).eq("id", r.id)
      ));
    }

    const parts: string[] = [];
    if (skipped > 0) parts.push(`${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped`);
    if (claimedByOther > 0) parts.push(`${claimedByOther} already claimed by another rep`);
    toast({
      title: `${count} leads imported${cleanList ? ` to "${cleanList}"` : ""}`,
      description: parts.length ? parts.join(" · ") : undefined,
    });
    if (cleanList) setActiveList(cleanList);
    setShowImport(false); fetchLeads();
  };


  const handleSaveOutcome = async (outcome: OutcomeDef, note: string): Promise<{ promptObjection: boolean; lead: BdrLead; outcomeLabel: string }> => {
    if (!outcomeLead || !user?.id) return { promptObjection: false, lead: outcomeLead!, outcomeLabel: "" };
    const lead = outcomeLead;
    const entry: OutcomeEntry = { label: outcome.label, timestamp: new Date().toISOString(), ...(note ? { note } : {}) };
    const newHistory = [...(lead.outcome_history || []), entry];

    const newStage = pipelineStageFromOutcome(outcome.label) ?? derivePipelineStage({ ...lead, outcome_history: newHistory });
    await (supabase as any).from("nl_bdr_leads").update({
      status: outcome.status, outcome_history: newHistory,
      pipeline_stage: newStage,
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
          <Button variant="outline" size="sm" onClick={() => setShowHowTo(true)} aria-label="How to get leads"><HelpCircle className="h-4 w-4 mr-1" /> Guide</Button>
          <Button variant="outline" size="sm" onClick={() => setShowStreetSweepGuide(true)} aria-label="Street sweep guide"><MapPin className="h-4 w-4 mr-1" /> Street Sweep</Button>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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

          {/* Pipeline strip */}
          <div className="rounded-2xl p-3" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</p>
              <p className="text-[10px] text-muted-foreground">{listScopedLeads.length} total</p>
            </div>
            {(() => {
              const total = Math.max(1, listScopedLeads.length);
              return (
                <>
                  <div className="flex h-2 w-full rounded-full overflow-hidden" style={{ background: "hsla(0,0%,100%,.04)" }}>
                    {PIPELINE_STAGES.map(s => {
                      const pct = (stageCounts[s.key] / total) * 100;
                      if (pct === 0) return null;
                      return <div key={s.key} title={`${s.label}: ${stageCounts[s.key]}`} style={{ width: `${pct}%`, background: s.bar }} />;
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {PIPELINE_STAGES.map(s => {
                      const active = filter === `stage:${s.key}`;
                      return (
                        <button
                          key={s.key}
                          onClick={() => setFilter(active ? "all" : `stage:${s.key}`)}
                          className="text-left rounded-lg px-2 py-1.5 transition-all"
                          style={{
                            background: active ? s.bg : "hsla(0,0%,100%,.02)",
                            border: `1px solid ${active ? s.border : "transparent"}`,
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.bar }} />
                            <span className="text-[10px] font-semibold uppercase tracking-wide truncate" style={{ color: s.text }}>{s.label}</span>
                          </div>
                          <p className="text-base font-bold text-foreground leading-tight mt-0.5">{stageCounts[s.key]}</p>
                          <p className="text-[9px] text-muted-foreground leading-tight truncate">{s.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {lists.length > 0 && (
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="flex gap-2 pb-2 w-max">
                <button onClick={() => setActiveList("__all__")}
                  className="shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5"
                  style={{ background: activeList === "__all__" ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.08)", color: activeList === "__all__" ? "#fff" : "hsl(211,96%,56%)" }}>
                  All Lists <span className="opacity-70">({leads.length})</span>
                </button>
                {lists.map(([name, count]) => (
                  <div key={name} className="shrink-0 inline-flex items-center rounded-full"
                    style={{ background: activeList === name ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.08)", color: activeList === name ? "#fff" : "hsl(211,96%,56%)" }}>
                    <button onClick={() => setActiveList(name)}
                      className="pl-4 pr-1.5 py-2 text-xs font-medium whitespace-nowrap flex items-center gap-1.5">
                      {name} <span className="opacity-70">({count})</span>
                    </button>
                    {name !== "Unsorted" && (
                      <RenameListButton
                        listName={name}
                        existingLists={lists.map(([n]) => n).filter(n => n !== "Unsorted")}
                        onRenamed={(oldN, newN) => {
                          setLeads(prev => prev.map(l => l.list_name === oldN ? { ...l, list_name: newN } : l));
                          setActiveList(cur => cur === oldN ? newN : cur);
                        }}
                        className="mr-2 ml-0.5 inline-flex items-center justify-center rounded-full p-1 hover:bg-white/10 transition-colors"
                      />
                    )}
                  </div>
                ))}
              </div>
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
                const stage = STAGE_BY_KEY[derivePipelineStage(lead)];
                const history = lead.outcome_history || [];
                const expanded = expandedId === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={selectMode ? () => toggleSelect(lead.id) : () => setProfileLeadId(lead.id)}
                    role="button"
                    aria-pressed={selectMode ? selectedIds.has(lead.id) : undefined}
                    className={`rounded-2xl overflow-hidden transition-all cursor-pointer active:scale-[0.99]`}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                title="Tap to change pipeline stage"
                                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 transition-opacity hover:opacity-80"
                                style={{ background: stage.bg, color: stage.text, border: `1px solid ${stage.border}` }}
                              >
                                {stage.label}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                              {PIPELINE_STAGES.map(s => (
                                <DropdownMenuItem key={s.key} onClick={() => handleChangeStage(lead, s.key)}>
                                  <span className="h-2 w-2 rounded-full mr-2" style={{ background: s.bar }} />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium">{s.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{s.description}</span>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <span className="rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                        </div>
                        {lead.owner_name && <p className="text-sm text-muted-foreground">{lead.owner_name}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {getLeadPhones(lead).map((p) => {
                            const isOwner = p.kind === "owner_direct" || p.kind === "legacy_owner";
                            const isFrontDesk = p.kind === "front_desk" || p.kind === "legacy_front_desk";
                            return (
                              <span key={p.kind + p.number} className="inline-flex items-center gap-1">
                                <a href={`tel:${p.number}`} onClick={e => e.stopPropagation()} className="text-xs flex items-center gap-1" style={{ color: "hsl(211,96%,56%)" }}><Phone className="h-3 w-3" /> {p.number}</a>
                                {isOwner ? (
                                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }}>Owner Direct</span>
                                ) : isFrontDesk ? (
                                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>Front Desk</span>
                                ) : (
                                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>Phone</span>
                                )}
                              </span>
                            );
                          })}
                          {(lead.owner_booking_link_send_ready || lead.owner_booking_link) && (
                            <a
                              href={(lead.owner_booking_link_send_ready || lead.owner_booking_link)!.startsWith("http")
                                ? (lead.owner_booking_link_send_ready || lead.owner_booking_link)!
                                : `https://${lead.owner_booking_link_send_ready || lead.owner_booking_link}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold hover:brightness-110 uppercase tracking-wide"
                              style={{ background: "linear-gradient(135deg, hsla(38,95%,55%,.28), hsla(38,95%,50%,.18))", color: "hsl(38,100%,72%)", border: "1px solid hsla(38,95%,55%,.6)" }}
                              title="Send-ready owner calendar link"
                            >
                              <Calendar className="h-3 w-3" /> Book with Owner
                            </a>
                          )}
                          {lead.booking_link && !(lead.owner_booking_link_send_ready || lead.owner_booking_link) && (
                            <a
                              href={lead.booking_link.startsWith("http") ? lead.booking_link : `https://${lead.booking_link}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs flex items-center gap-1 rounded-full px-2 py-0.5 font-medium hover:underline"
                              style={(lead.owner_calendar_confirmed ?? lead.booking_link_is_owner) === true
                                ? { background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }
                                : (lead.owner_calendar_confirmed ?? lead.booking_link_is_owner) === false
                                  ? { background: "hsla(211,96%,56%,.12)", color: "hsl(211,96%,56%)", border: "1px dashed hsla(211,96%,60%,.35)" }
                                  : { background: "hsla(211,96%,56%,.12)", color: "hsl(211,96%,56%)" }}
                              title={lead.booking_link}
                            >
                              <Calendar className="h-3 w-3" />
                              {(lead.owner_calendar_confirmed ?? lead.booking_link_is_owner) === true
                                ? "Owner's Calendar"
                                : (lead.owner_calendar_confirmed ?? lead.booking_link_is_owner) === false
                                  ? "Booking Link (not owner)"
                                  : "Booking Link"}
                            </a>
                          )}
                          {lead.dialer_bookable === true && (
                            <span className="text-[10px] rounded-full px-2 py-0.5 font-bold uppercase tracking-wide" title="Platform supports embedded booking from the dialer"
                              style={{ background: "hsla(142,80%,45%,.22)", color: "hsl(142,85%,68%)", border: "1px solid hsla(142,80%,50%,.55)" }}>
                              Dialer-Bookable
                            </span>
                          )}
                          {lead.website ? (
                            <a
                              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs flex items-center gap-1 hover:underline truncate max-w-[180px]"
                              style={{ color: "hsl(211,96%,56%)" }}
                              title={lead.website}
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {lead.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {lead.city && <span className="text-xs text-muted-foreground">{lead.city}</span>}
                          {lead.has_booking_system === true ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,42%)" }}>Yes</span>
                          ) : lead.has_booking_system === false ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,65%)" }}>No</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
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
                        {!selectMode && (derivePipelineStage(lead) === "hot" || derivePipelineStage(lead) === "won") && (
                          <Button
                            size="sm"
                            className="text-xs h-7 bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]"
                            onClick={(e) => { e.stopPropagation(); navigate(`/employee/close-prep/${lead.id}`); }}
                          >
                            Close Prep
                          </Button>
                        )}
                        {!selectMode && lead.crm_deal_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-[hsl(150,70%,50%)]/40 text-[hsl(150,70%,60%)] hover:bg-[hsl(150,70%,50%)]/10"
                            onClick={(e) => { e.stopPropagation(); navigate(`/employee/pay-sign/${lead.crm_deal_id}`); }}
                          >
                            Pay &amp; Sign
                          </Button>
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
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} existingLists={existingListsByRecency} />
      <HowToImportModal open={showHowTo} onClose={() => setShowHowTo(false)} />
      <StreetSweepGuideModal open={showStreetSweepGuide} onClose={() => setShowStreetSweepGuide(false)} />
      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddLead} />
      <OutcomeSheet lead={outcomeLead} onClose={() => setOutcomeLead(null)} onSaveOutcome={handleSaveOutcome} onSaveObjection={handleSaveObjection} />
      <CustomerProfilePanel
        open={!!profileLeadId}
        onOpenChange={(v) => { if (!v) setProfileLeadId(null); }}
        leadId={profileLeadId}
        onUpdated={fetchLeads}
      />
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
function ImportModal({ open, onClose, onImport, existingLists }: { open: boolean; onClose: () => void; onImport: (rows: any[], listName: string) => void; existingLists: string[] }) {
  const [raw, setRaw] = useState("");
  const [listName, setListName] = useState("");
  const [listMode, setListMode] = useState<"existing" | "new">("new");
  const [parsed, setParsed] = useState<any[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  useEffect(() => {
    if (!open) { setRaw(""); setParsed([]); setChecked([]); setSkippedCount(0); return; }
    if (existingLists.length > 0) {
      setListMode("existing");
      setListName(existingLists[0]);
    } else {
      setListMode("new");
      setListName("");
    }
  }, [open, existingLists]);

  const parse = () => {
    // Extract "RAPPORT NOTES" addendum section (V17) before splitting the table.
    // Pattern: a header line matching /^rapport notes/i, followed by lines of
    // "Business Name: fact, source: where." — terminated by blank line or EOF.
    const rapportMap: Record<string, string> = {};
    const rapportHeaderRe = /^\s*rapport\s+notes\s*:?\s*$/i;
    const rawLinesForRapport = raw.split("\n");
    for (let i = 0; i < rawLinesForRapport.length; i++) {
      if (rapportHeaderRe.test(rawLinesForRapport[i])) {
        for (let j = i + 1; j < rawLinesForRapport.length; j++) {
          const line = rawLinesForRapport[j].trim();
          if (!line) break;
          if (/^(confidence\s+flag|session[-\s]?cap|━|---|===)/i.test(line)) break;
          const colon = line.indexOf(":");
          if (colon <= 0) continue;
          const name = line.slice(0, colon).trim().toLowerCase();
          const rest = line.slice(colon + 1).trim().replace(/^[-–—]\s*/, "");
          if (name && rest) rapportMap[name] = rest;
        }
        break;
      }
    }

    const linesRaw = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (!linesRaw.length) return;

    // Detect delimiter from first line
    const first = linesRaw[0];
    const delim = first.includes("|") ? "|" : first.includes("\t") ? "\t" : ",";

    // Split all lines
    const allRows = linesRaw.map(l => l.split(delim).map(c => c.trim()));

    // Locate a header row (any of the first 3 rows containing "business name")
    let headerIdx = -1;
    for (let i = 0; i < Math.min(3, allRows.length); i++) {
      const joined = allRows[i].join(" ").toLowerCase();
      if (/business\s*name/.test(joined)) { headerIdx = i; break; }
    }

    // Column indices — -1 means "not present in this header"
    let biIdx = 0, owIdx = 1, phIdx = 2, ptIdx = -1, webIdx = 3,
        fdpIdx = -1,    // NEW V17.1 "Front Desk Phone"
        odpIdx = -1,    // NEW V17.1 "Owner Direct Phone"
        bkIdx = -1,     // legacy "Booking System" (platform name in old prompt)
        bseIdx = -1,    // "Booking System Exists" (Yes/No)
        bpIdx = -1,     // "Booking Platform" (name)
        blIdx = -1,
        bloIdx = -1,    // legacy V13 "Booking Link is Owner"
        occIdx = -1,    // V16 "Owner's Calendar Confirmed"
        oblIdx = -1,    // legacy V13 "Owner Booking Link"
        oblsrIdx = -1,  // V16 "Owner Booking Link (Send-Ready)"
        swIdx = -1, dbIdx = -1, mbIdx = -1, crdIdx = -1, cityIdx = -1,
        nicheIdx = -1, notesIdx = -1, lnIdx = -1, saIdx = -1;
    let expectedCols = -1;
    let dataRows: string[][];

    if (headerIdx >= 0) {
      const header = allRows[headerIdx].map(c => c.toLowerCase());
      expectedCols = header.length;
      biIdx = owIdx = phIdx = webIdx = -1;
      header.forEach((c, i) => {
        if (/business\s*name/.test(c)) biIdx = i;
        else if (/owner\s*name/.test(c)) owIdx = i;
        else if (/front\s*desk\s*phone/.test(c)) fdpIdx = i;
        else if (/owner\s*direct\s*phone/.test(c)) odpIdx = i;
        else if (/phone\s*type|number\s*type/.test(c)) ptIdx = i;
        else if (/^phone$|^phone\s|\sphone$/.test(c)) phIdx = i;
        else if (/website|url|site/.test(c)) webIdx = i;
        else if (/owner.?s?\s*calendar\s*confirmed/.test(c)) occIdx = i;
        else if (/booking\s*link\s*is\s*owner/.test(c)) bloIdx = i;
        else if (/owner\s*booking\s*link\s*\(?\s*send.?ready/.test(c)) oblsrIdx = i;
        else if (/owner\s*booking\s*link/.test(c)) oblIdx = i;
        else if (/self.?booking\s*widget/.test(c)) swIdx = i;
        else if (/dialer.?bookable/.test(c)) dbIdx = i;
        else if (/booking\s*link/.test(c)) blIdx = i;
        else if (/booking\s*system\s*exists/.test(c)) bseIdx = i;
        else if (/booking\s*platform/.test(c)) bpIdx = i;
        else if (/booking\s*system/.test(c)) bkIdx = i;
        else if (/meeting\s*booked/.test(c)) mbIdx = i;
        else if (/^crd$|crd\s*(number|#|no\.?)/.test(c)) crdIdx = i;
        else if (/street[\s_-]*address|^address$/.test(c)) saIdx = i;
        else if (/^city$|city\s*\/?\s*state|location/.test(c)) cityIdx = i;
        else if (/niche|category|industry/.test(c)) nicheIdx = i;
        else if (/list[\s_-]*name|^list$/.test(c)) lnIdx = i;
        else if (/note/.test(c)) notesIdx = i;
      });
      dataRows = allRows.slice(headerIdx + 1);
      // Drop separator rows like "---|---|---"
      dataRows = dataRows.filter(r => !r.every(c => /^-{2,}$/.test(c) || c === ""));
    } else {
      dataRows = allRows;
      expectedCols = allRows[0].length;
    }

    // Skip trailing lines that don't match the expected column count
    // (e.g., "Confidence flag: ..." lines that follow the table) and track how many
    let malformedSkipped = 0;
    if (expectedCols > 1) {
      const before = dataRows.length;
      dataRows = dataRows.filter(r => r.length === expectedCols);
      malformedSkipped = before - dataRows.length;
    }

    // Tri-state: true=Yes, false=No, null=N/A/blank. Callers that need bool-only
    // fall back to null.
    const parseYesNoNA = (v: string): boolean | null => {
      const s = (v || "").trim().toLowerCase();
      if (!s || s === "n/a" || s === "na" || s === "-" || s === "—") return null;
      if (/^(y|yes|true|✓)$/.test(s)) return true;
      if (/^(n|no|false)$/.test(s)) return false;
      return null;
    };
    const parsePhoneType = (v: string): string | null => {
      const s = (v || "").trim().toLowerCase();
      if (!s) return null;
      if (/owner|personal|cell|mobile|direct/.test(s)) return "owner";
      if (/front|desk|reception|main/.test(s)) return "front_desk";
      return "front_desk";
    };
    // CSV cells may arrive wrapped in quotes ("Main St, Suite 2")
    const unquote = (v: string): string =>
      (v || "").trim().replace(/^"(.*)"$/s, "$1").replace(/""/g, '"').trim();

    // Legacy path: "Booking System" column held the platform name OR "No"
    const parseLegacyBookingSystem = (v: string): { platform: string | null; has: boolean } => {
      const s = (v || "").trim();
      if (!s || /^no$/i.test(s) || s === "-" || s === "—") return { platform: null, has: false };
      return { platform: s, has: true };
    };
    const parsePlatformName = (v: string): string | null => {
      const s = (v || "").trim();
      if (!s || /^no$/i.test(s) || s === "-" || s === "—" || /^n\/a$/i.test(s)) return null;
      return s;
    };
    const cleanLink = (v: string): string | null => {
      const s = (v || "").trim();
      if (!s || s === "-" || s === "—" || /^n\/a$/i.test(s) || /^blank$/i.test(s)) return null;
      return s;
    };

    const result = dataRows
      .filter(r => biIdx >= 0 && r[biIdx]?.trim())
      .map(r => {
        // V16 prefers separate "Booking System Exists" (Yes/No) + "Booking Platform" name
        let booking_system_exists: boolean | null;
        let has_booking_system: boolean | null;
        let booking_platform: string | null;
        if (bseIdx >= 0 || bpIdx >= 0) {
          const yes = bseIdx >= 0 ? parseYesNoNA(r[bseIdx] || "") : null;
          booking_platform = bpIdx >= 0 ? parsePlatformName(r[bpIdx] || "") : null;
          booking_system_exists = yes !== null ? yes : (booking_platform != null ? true : null);
          has_booking_system = booking_system_exists;
        } else {
          const bk = parseLegacyBookingSystem(bkIdx >= 0 ? r[bkIdx] : "");
          booking_platform = bk.platform;
          has_booking_system = bk.has;
          booking_system_exists = bk.has;
        }
        // Owner's Calendar Confirmed (V16) vs Booking Link is Owner (V13 legacy)
        // Yes = confirmed owner calendar; No = system exists but not owner's;
        // null = N/A (no system) or missing column
        const owner_calendar_confirmed = occIdx >= 0
          ? parseYesNoNA(r[occIdx] || "")
          : (bloIdx >= 0 ? parseYesNoNA(r[bloIdx] || "") : null);
        // Send-ready is the V16 rep-ready deep link; legacy owner_booking_link is fallback
        const owner_booking_link_send_ready = oblsrIdx >= 0
          ? cleanLink(r[oblsrIdx] || "")
          : (oblIdx >= 0 ? cleanLink(r[oblIdx] || "") : null);
        const owner_booking_link = oblIdx >= 0
          ? cleanLink(r[oblIdx] || "")
          : owner_booking_link_send_ready;

        // New V17.1 dual-phone columns take precedence when present. If only
        // the legacy "Phone"+"Phone Type" pair is in the header, map the
        // single phone into whichever new-format slot matches its type — that
        // way legacy pastes still get normalized into the new schema.
        const legacyPhone = phIdx >= 0 ? (r[phIdx]?.trim() || "") : "";
        const legacyPhoneType = ptIdx >= 0 ? parsePhoneType(r[ptIdx] || "") : null;
        const newFrontDesk = fdpIdx >= 0 ? (r[fdpIdx]?.trim() || "") : "";
        const newOwnerDirect = odpIdx >= 0 ? (r[odpIdx]?.trim() || "") : "";
        const hasNewCols = fdpIdx >= 0 || odpIdx >= 0;
        const front_desk_phone = hasNewCols
          ? (newFrontDesk || null)
          : (legacyPhoneType === "front_desk" ? (legacyPhone || null) : null);
        const owner_direct_phone = hasNewCols
          ? (newOwnerDirect || null)
          : (legacyPhoneType === "owner" ? (legacyPhone || null) : null);

        return {
          business_name: r[biIdx]?.trim() || "",
          owner_name: owIdx >= 0 ? (r[owIdx]?.trim() || "") : "",
          front_desk_phone,
          owner_direct_phone,
          // Legacy-shape fields kept only for the fallback branch in handleImport
          // (used when neither new column produced a value).
          phone: hasNewCols ? "" : legacyPhone,
          phone_type: hasNewCols ? null : legacyPhoneType,
          website: webIdx >= 0 ? (r[webIdx]?.trim() || "") : "",
          booking_platform,
          has_booking_system,
          booking_system_exists,
          booking_link: blIdx >= 0 ? cleanLink(r[blIdx] || "") : null,
          booking_link_is_owner: owner_calendar_confirmed, // kept in sync w/ V16
          owner_calendar_confirmed,
          owner_booking_link,
          owner_booking_link_send_ready,
          self_booking_widget_non_owner: swIdx >= 0 ? parseYesNoNA(r[swIdx] || "") : null,
          dialer_bookable: dbIdx >= 0 ? parseYesNoNA(r[dbIdx] || "") : null,
          meeting_booked: mbIdx >= 0 ? (r[mbIdx]?.trim() || null) : null,
          crd: crdIdx >= 0 ? (r[crdIdx]?.trim().replace(/[^0-9]/g, "") || null) : null,
          city: cityIdx >= 0 ? (unquote(r[cityIdx]) || null) : null,
          niche: nicheIdx >= 0 ? unquote(r[nicheIdx]) : "",
          notes: notesIdx >= 0 ? unquote(r[notesIdx]) : "",
          list_name: lnIdx >= 0 ? unquote(r[lnIdx]) : "",
          ...(() => {
            const street_address = saIdx >= 0 ? (unquote(r[saIdx]) || "") : "";
            const m = street_address.match(/^\s*(\d+)/);
            const street_number = m ? parseInt(m[1], 10) : null;
            const side_of_street = street_number == null ? null : (street_number % 2 === 0 ? "even" : "odd");
            return { street_address, street_number, side_of_street };
          })(),
          rapport_note: rapportMap[(r[biIdx] || "").trim().toLowerCase()] || null,
        };
      });
    setParsed(result); setChecked(result.map(() => true)); setSkippedCount(malformedSkipped);
    // Auto-fill the List Name input from the pasted list_name column when the
    // rep hasn't typed one themselves.
    if (lnIdx >= 0 && !listName.trim()) {
      const fromCsv = result.find(r => r.list_name)?.list_name;
      if (fromCsv) { setListMode("new"); setListName(fromCsv); }
    }
  };

  const flagsFor = (ownerName: string): string[] => parseLeadFlags(ownerName);

  const toggle = (i: number) => setChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  const selectedCount = checked.filter(Boolean).length;
  const finalListName = listName.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Claude</DialogTitle>
          <DialogDescription>Paste your cleaned lead table from the Lead Researcher prompt.</DialogDescription>
        </DialogHeader>
        {parsed.length === 0 ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">List</label>
              {existingLists.length > 0 && (
                <div className="mt-1 flex gap-1 mb-2">
                  <button type="button" onClick={() => { setListMode("existing"); setListName(existingLists[0]); }}
                    className="text-[11px] px-2 py-1 rounded-md border"
                    style={{ background: listMode === "existing" ? "hsla(211,96%,56%,.15)" : "transparent",
                             borderColor: listMode === "existing" ? "hsla(211,96%,56%,.5)" : "hsla(211,96%,60%,.15)",
                             color: listMode === "existing" ? "hsl(211,96%,70%)" : "hsl(var(--muted-foreground))" }}>
                    Append to existing
                  </button>
                  <button type="button" onClick={() => { setListMode("new"); setListName(""); }}
                    className="text-[11px] px-2 py-1 rounded-md border"
                    style={{ background: listMode === "new" ? "hsla(211,96%,56%,.15)" : "transparent",
                             borderColor: listMode === "new" ? "hsla(211,96%,56%,.5)" : "hsla(211,96%,60%,.15)",
                             color: listMode === "new" ? "hsl(211,96%,70%)" : "hsl(var(--muted-foreground))" }}>
                    Create new list
                  </button>
                </div>
              )}
              {listMode === "existing" && existingLists.length > 0 ? (
                <select value={listName} onChange={e => setListName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  style={{ borderColor: "hsla(211,96%,60%,.2)" }}>
                  {existingLists.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              ) : (
                <Input value={listName} onChange={e => setListName(e.target.value)} placeholder='e.g. "Ojai Hair Salons — State Street SB"' className="mt-1 h-9" />
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {listMode === "existing" ? "Adds these leads to the selected list; duplicates by business name within the list are skipped." : "Name this batch so you can switch between lists later."}
              </p>
            </div>
            <Textarea value={raw} onChange={e => setRaw(e.target.value)} rows={10}
              placeholder={"Paste the Lead Researcher output (pipe-delimited table). Columns:\nBusiness Name | Owner Name | Front Desk Phone | Owner Direct Phone | Website | Booking System Exists | Booking Platform | Booking Link | Owner's Calendar Confirmed | Owner Booking Link (Send-Ready) | Dialer-Bookable | Meeting Booked"} />
            <Button onClick={parse} disabled={!raw.trim() || !finalListName} className="w-full">Parse Leads</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">{parsed.length} leads found → <span className="text-foreground font-medium">"{finalListName}"</span></p>
              {skippedCount > 0 && (
                <span className="text-[11px] px-2 py-1 rounded" style={{ background: "hsla(0,72%,50%,.15)", color: "hsl(0,72%,68%)", border: "1px solid hsla(0,72%,50%,.35)" }}>
                  ⚠ {skippedCount} row{skippedCount !== 1 ? "s" : ""} skipped (wrong column count)
                </span>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {parsed.map((r, i) => {
                const flags = flagsFor(r.owner_name);
                return (
                <label key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer flex-wrap"
                  style={{ background: checked[i] ? "hsla(211,96%,56%,.06)" : "transparent", border: "1px solid hsla(211,96%,60%,.1)" }}>
                  <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} className="accent-[hsl(211,96%,56%)]" />
                  <span className="font-medium text-foreground truncate flex-1 min-w-0">{r.business_name}</span>
                  {flags.map(f => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "hsla(0,72%,50%,.18)", color: "hsl(0,72%,72%)", border: "1px solid hsla(0,72%,50%,.4)" }}>{f}</span>
                  ))}
                  {r.booking_platform && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,55%)" }}>{r.booking_platform}</span>
                  )}
                  {(r.owner_direct_phone || r.phone_type === "owner") && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsla(38,92%,55%,.15)", color: "hsl(38,92%,65%)" }}>Owner Direct</span>
                  )}
                  {r.front_desk_phone && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsla(211,50%,55%,.15)", color: "hsl(211,60%,72%)" }}>Front Desk</span>
                  )}
                </label>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setParsed([]); setChecked([]); setSkippedCount(0); }}>Back</Button>
              <Button onClick={() => onImport(parsed.filter((_, i) => checked[i]), finalListName)} disabled={!selectedCount} className="flex-1">
                Import {selectedCount} Lead{selectedCount !== 1 ? "s" : ""} to "{finalListName}"
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
  const emptyForm = { business_name: "", owner_name: "", front_desk_phone: "", owner_direct_phone: "", website: "", niche: "", city: "", notes: "" };
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) setForm(emptyForm); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps


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
          {field("front_desk_phone", "Front Desk Phone")}
          {field("owner_direct_phone", "Owner Direct Phone")}
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

/* ──────────────────────────────────────────────── */
/* How to Import Leads Modal                         */
/* ──────────────────────────────────────────────── */
const MASTER_PROMPT_CHAPTER_ID = "96ab38ae-6b56-4536-af0d-a809b4ea181a";

function HowToImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [promptText, setPromptText] = React.useState<string>("");
  const [loadingPrompt, setLoadingPrompt] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copiedHandoff, setCopiedHandoff] = React.useState(false);

  const promptVersion = useMemo(() => {
    const match = promptText.match(/—\s*(V\d+)/);
    return match?.[1] ?? null;
  }, [promptText]);


  const SEC_HANDOFF_LINE = "This list came from the SEC IAPD tool — go ahead and research each one.";

  React.useEffect(() => {
    if (!open) return;
    // Refetch every open — chapter content can change server-side; caching
    // in state across the whole session would silently serve stale prompts.
    let cancelled = false;
    setLoadingPrompt(true);
    supabase
      .from("nl_training_chapters")
      .select("content")
      .eq("id", MASTER_PROMPT_CHAPTER_ID)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setPromptText((data?.content as string) ?? "");
        setLoadingPrompt(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  const copyPrompt = async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      toast({ title: "Master Prompt copied", description: `${promptText.length.toLocaleString()} characters copied to clipboard.` });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const copyHandoff = async () => {
    try {
      await navigator.clipboard.writeText(SEC_HANDOFF_LINE);
      setCopiedHandoff(true);
      toast({ title: "Handoff line copied" });
      setTimeout(() => setCopiedHandoff(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const proTips = [
    "Use the Copy Master Prompt button on the In-Person page to get the current desk-research protocol, then paste it into a fresh Claude chat with web search ON",
    "Paste the raw SEC output directly into the Master Prompt — Business Name | City | CRD is all it needs to start Phase 0",
    "For firms missing public contact info, the Master Prompt's tiered phone research (Phase 3, Tier 0 government databases plus the full route waterfall) will locate the best number",
    "If phone research only turns up a front-desk number, check data broker sites (RocketReach, Seamless.AI) for a partially-masked personal mobile — it won't give you the full number for free, but confirms whether a direct line exists at all before you spend on a paid lookup. No browser tool needed for this, only search.",
    "Verify each lead isn't already claimed by another rep before dialing — the import flow will flag duplicates automatically",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to Import Leads</DialogTitle>
          <DialogDescription>Use the SEC IAPD Sourcing Tool to pull registered financial advisor leads, then enrich them with the Master Prompt before importing. Chrome / browser tools are only needed for the booking-system verification piece (the flow-walk in the booking-verification section) — owner name and phone research are pure search and work without any browser connector.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "hsla(158,70%,40%,.08)", border: "1px solid hsla(158,70%,45%,.35)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: "hsla(158,70%,45%,.2)", color: "hsl(158,70%,65%)" }}>Recommended</span>
              <h3 className="text-sm font-semibold text-foreground">SEC IAPD Sourcing Tool (Financial Advisors)</h3>
            </div>
            <p className="text-xs leading-relaxed text-foreground/85 mb-3">
              For registered financial advisor / RIA leads, use the in-app SEC IAPD tool to pull a
              clean <span className="font-mono text-[11px]">Business Name | City | CRD</span> list by state + city, then paste it straight into
              the Master Prompt below — Phase 0 is already done for you.
            </p>
            <Button size="sm" onClick={() => { onClose(); navigate("/employee/lead-sourcing"); }}
              style={{ background: "hsla(158,70%,45%,.9)", color: "hsl(215,40%,8%)" }}>
              Open SEC Lead Sourcing Tool →
            </Button>

            <div className="mt-3 rounded-lg p-3" style={{ background: "hsla(158,70%,45%,.06)", border: "1px solid hsla(158,70%,45%,.2)" }}>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <Label className="text-xs font-medium text-foreground/90">Paste this before your list:</Label>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={copyHandoff}>
                  {copiedHandoff ? "Copied ✓" : "Copy"}
                </Button>
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs text-foreground/85 italic">{SEC_HANDOFF_LINE}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,56%,.3)" }}>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: "hsla(211,96%,56%,.2)", color: "hsl(211,96%,70%)" }}>
                  {promptVersion ? `Master Prompt · ${promptVersion}` : "Master Prompt"}
                </span>

                <h3 className="text-sm font-semibold text-foreground">Lead Researcher Protocol</h3>
              </div>
              <Button size="sm" onClick={copyPrompt} disabled={loadingPrompt || !promptText}>
                {copied ? "Copied ✓" : loadingPrompt ? "Loading…" : "Copy Prompt"}
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-foreground/85">
              Paste this into your Lead Researcher Claude Project (see Module 3 for setup) or a fresh Claude chat with web search ON.
              Then feed it your raw list from the SEC tool — it returns enriched, dial-ready rows.
              {promptText ? <span className="ml-1 text-foreground/60">({promptText.length.toLocaleString()} chars)</span> : null}
            </p>
          </div>

          <div className="rounded-xl p-4" style={{ background: "hsla(38,92%,55%,.08)", border: "1px solid hsla(38,92%,55%,.25)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: "hsla(38,92%,55%,.2)", color: "hsl(38,95%,70%)" }}>Pro Tips</span>
            </div>
            <ul className="space-y-2">
              {proTips.map((t, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/85">
                  <span style={{ color: "hsl(38,95%,65%)" }}>•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl p-4 space-y-4" style={{ background: "hsla(220,12%,25%,.18)", border: "1px solid hsla(220,12%,40%,.25)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: "hsla(220,12%,40%,.25)", color: "hsl(220,12%,70%)" }}>New Here? Follow These Steps</span>
            </div>
            <p className="text-xs leading-relaxed text-foreground/80">
              <span className="font-semibold text-foreground">Only use the SEC tool for financial advisors/RIAs.</span> For any other business type, skip straight to Path B — just tell Claude the state and business type directly.
            </p>

            <div className="space-y-3">
              <div className="rounded-lg p-3" style={{ background: "hsla(158,70%,40%,.06)", border: "1px solid hsla(158,70%,45%,.2)" }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(158,70%,65%)" }}>Path A — Financial Advisors (Use SEC)</h4>
                <ol className="space-y-1.5 text-xs leading-relaxed text-foreground/85 list-decimal list-inside">
                  <li>Tap the green <span className="font-semibold text-foreground">Open SEC Lead Sourcing Tool</span> button above</li>
                  <li>Type a state (like Texas) and a word like <span className="italic">wealth</span> or <span className="italic">financial advisor</span></li>
                  <li>Tap <span className="font-semibold text-foreground">Search</span></li>
                  <li>Tap <span className="font-semibold text-foreground">Copy for Claude Research</span></li>
                  <li>Open a new chat with Claude (make sure <span className="font-semibold text-foreground">web search</span> is turned on)</li>
                  <li>Paste the Master Prompt (copy button above) as your first message</li>
                  <li>Paste the small line <span className="italic text-foreground/70">"This list came from the SEC IAPD tool..."</span> (copy button above) as your second message, then paste your list right after it in the same message</li>
                  <li>Claude will research each business and give you a finished list</li>
                  <li>Copy that finished list</li>
                  <li>Come back here, tap <span className="font-semibold text-foreground">Import</span>, paste it, then tap <span className="font-semibold text-foreground">Parse Leads</span></li>
                </ol>
              </div>

              <div className="rounded-lg p-3" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,56%,.2)" }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(211,96%,70%)" }}>Path B — Any Other Business Type</h4>
                <ol className="space-y-1.5 text-xs leading-relaxed text-foreground/85 list-decimal list-inside">
                  <li>Open a new chat with Claude (web search turned on)</li>
                  <li>Paste the Master Prompt as your first message</li>
                  <li>As your second message, just type the state and business type, like: <span className="font-mono text-[11px] text-foreground/80">"Texas, hair salons"</span> or <span className="font-mono text-[11px] text-foreground/80">"Ohio, HVAC contractors"</span></li>
                  <li>Claude will find the businesses itself and research each one</li>
                  <li>Copy the finished list</li>
                  <li>Come back here, tap <span className="font-semibold text-foreground">Import</span>, paste it, then tap <span className="font-semibold text-foreground">Parse Leads</span></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────── */
/* In-Person Street Sweep Guide Modal                */
/* ──────────────────────────────────────────────── */
const STREET_SOURCING_PROMPT = `# ROLE
You are a meticulous local-commerce field researcher compiling a storefront census for one street. Accuracy and COMPLETE COVERAGE matter more than speed. Do not oversell your results as "perfect," "complete," or "guaranteed" — report realistic confidence and flag every uncertainty. Use web search for every verification step.

# INPUT
Street: [STREET NAME]
City: [CITY]
State: [STATE]
Side(s): [both / odd side only / even side only]
Block range (optional): [e.g., 400–1300; if blank, establish it in STEP 0]

# STEP 0 — ESTABLISH THE FULL ADDRESS RANGE BEFORE LISTING ANY BUSINESS
1. Determine the full commercial address range of this street using, in priority order: (a) city/county GIS parcel situs data or assessor parcel lookup, (b) Google Maps scrolled end to end, (c) OpenStreetMap/Overpass.
2. State the established range explicitly with your source.
3. Build a MASTER CHECKLIST of every plausible street number in the range, ascending, unchecked.

# STEP 1 — STRICT ASCENDING ORDER, 5 BUSINESSES PER BATCH
Process addresses from lowest number upward. Output EXACTLY 5 businesses per batch. Vacant/closed/no-address entries are logged inline but don't count toward the 5.

# PER-BUSINESS VERIFICATION — 7 NAMED METHODS
For each address, attempt all 7 and record which succeeded:
1. Google Maps/Business Profile — name, category, phone, website, open/closed status banner.
2. City business license/tax data.
3. GIS parcel situs data.
4. OpenStreetMap/Overpass.
5. Chamber/BID/downtown business directory.
6. Recent Google/Yelp reviews and photos (closure/new-tenant signals).
7. Local news/trade press + state business-entity status as corroboration.

# STEP 2 — FLAG, DON'T OMIT
Every address resolves to: FOUND / VACANT-FOR-LEASE / CLOSED / NOT FOUND / MULTI-TENANT (list each suite).

# OUTPUT FORMAT
Start every batch with: "BATCH n | addresses [x]–[y] of range [lo]–[hi] | businesses so far: [count] | remaining: [y+1]–[hi]"
Then per entry: [number] [name or —] | STATUS | category | phone | website | owner if found | methods confirmed | confidence High/Med/Low | notes

# CONTINUATION RULES
After each batch, continue automatically to the next. Do not ask to continue. Do not start mid-range. Do not stop early. If running low on room, end cleanly with "PAUSE — resume at address [N]."

# FINAL SELF-CHECK
Confirm every number in the range is marked found/vacant/closed/not-found/multi-tenant. Report totals. Compare business count to commercial-parcel frontage count and flag if it looks short.

# CLOSING DISCLAIMER (REQUIRED)
State an honest coverage confidence estimate and known limitations. Do not claim the list is perfect or complete.`;

const LEADS_ENRICHMENT_PROMPT = `# ROLE
You enrich a storefront census into CRM-ready lead records. Work in the SAME strict batches of 5. Be honest about missing/low-confidence fields — never invent an owner name or phone. Use web search for every verification step.

# INPUT
Use the business list compiled above in this conversation. Also: City = [CITY]; list_name = [e.g., "State St 400-1300 Sweep 2026-07"].

# TASK
For each FOUND/MULTI-TENANT business (skip pure VACANT/NOT-FOUND; keep CLOSED entries flagged, don't rework them), produce one record with exactly these fields: business_name, owner_name (research via business license ownership data, state business registry, the business's own site/About page, LinkedIn; leave blank and note "owner unverified" if not found — never guess), phone, website, niche (best-fit category; flag if unsure), city, street_address (the literal street number + street name + suite if any, e.g. "1114 State St, Suite 12" — this is its own required field, do NOT fold it into notes), notes (closure/verification flags, confidence, which sources confirmed), list_name.

# BATCH & CONTINUATION RULES
Output exactly 5 records per batch. Continue automatically after each batch — do not wait for "continue." Start with the first business in the input; never start mid-list; don't stop until all are enriched. If running low on room, end cleanly with "PAUSE — resume at [business_name]."

# OUTPUT FORMAT
Emit each batch as BOTH a human-readable table AND a fenced CSV block with header row exactly:
business_name,owner_name,phone,website,niche,city,street_address,notes,list_name
One row per record, quoted fields.

# CLOSING (REQUIRED)
After the final batch, report: # records enriched, # with unverified owner, # with low-confidence status, and remind that owner names/phones for small independents are the least reliable fields and should be confirmed on the call.`;

function StreetSweepGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({ title: "Copied!", description: `${text.length.toLocaleString()} characters copied to clipboard.` });
      setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 2500);
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const steps = [
    'Open this Claude project. Tap + (or the slider icon) and confirm "Web search" is toggled ON — it must be blue/on.',
    "Copy the STREET SOURCING PROMPT below. Paste it into the Claude chat, filling in the street, city, and state at the top.",
    'Let it run through every batch of 5 until it reaches the top of the address range on its own — don\'t say "continue," it should keep going automatically.',
    'In the SAME chat, right after it finishes, copy and paste the LEADS ENRICHMENT PROMPT below. Add this line above it: "Run this on the full business list you just compiled above." Do not open a new chat — it needs Prompt 1\'s output already in view.',
    "Let it run through every batch until finished.",
    "Copy ONLY the CSV code block(s) from the final output — not the human-readable table above it.",
    "Come back here, tap Import, and paste the CSV in.",
    "Review the preview before confirming. Anything flagged vacant, not-found, multi-tenant, or low-confidence needs your judgment call — don't import those blind.",
  ];

  const proTips = [
    "A fresh Claude chat resets the Web search toggle — check it's on again each time you start a new street.",
    'If Prompt 1 pauses mid-street with "PAUSE — resume at address N," just reply "resume at N" — don\'t restart from the beginning.',
    "This is a real research pass, not a database lookup — expect it to take a few minutes per batch, and expect it to miss a small percentage of businesses (upstairs offices, unlisted shops, brand-new openings).",
    "The in-person walk is what catches what the prompts can't see remotely — treat flagged/uncertain addresses as things to verify on foot, not errors.",
  ];

  const promptCard = (key: string, badge: string, title: string, text: string) => (
    <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,56%,.3)" }}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ background: "hsla(211,96%,56%,.2)", color: "hsl(211,96%,70%)" }}>{badge}</span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <Button size="sm" onClick={() => copy(key, text)}>
          <Copy className="h-3.5 w-3.5 mr-1" />{copiedKey === key ? "Copied ✓" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[11px] leading-relaxed font-mono text-foreground/80"
           style={{ background: "hsla(215,35%,10%,.6)", border: "1px solid hsla(211,96%,60%,.15)" }}>{text}</pre>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>In-Person Street Sweep Guide</DialogTitle>
          <DialogDescription>Turn any street into an ordered, research-backed lead list.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "hsla(158,70%,40%,.08)", border: "1px solid hsla(158,70%,45%,.35)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: "hsla(158,70%,45%,.2)", color: "hsl(158,70%,65%)" }}>Steps</span>
              <h3 className="text-sm font-semibold text-foreground">How This Works</h3>
            </div>
            <ol className="space-y-1.5 text-xs leading-relaxed text-foreground/85 list-decimal list-inside">
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

          <div className="rounded-xl p-4" style={{ background: "hsla(38,92%,55%,.08)", border: "1px solid hsla(38,92%,55%,.25)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: "hsla(38,92%,55%,.2)", color: "hsl(38,95%,70%)" }}>Pro Tips</span>
              <h3 className="text-sm font-semibold text-foreground">Keep It Accurate</h3>
            </div>
            <ul className="space-y-2">
              {proTips.map((t, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/85">
                  <span style={{ color: "hsl(38,95%,65%)" }}>•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {promptCard("p1", "Prompt 1 of 2", "Street Sourcing Prompt — tap to copy", STREET_SOURCING_PROMPT)}
          {promptCard("p2", "Prompt 2 of 2", "Leads Enrichment Prompt — tap to copy", LEADS_ENRICHMENT_PROMPT)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
