import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { logDialerEvent } from "@/lib/bdrCalendar";

interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
  niche: string | null;
  list_name: string | null;
  called: boolean | null;
  notes: string | null;
}

interface OutcomeRow {
  lead_id: string | null;
  outcome: string;
  objection_type: string | null;
}

// Outcome -> objection_type mapping. null objection_type means non-objection outcome.
const OUTCOMES: { label: string; objection: string | null }[] = [
  { label: "Won", objection: null },
  { label: "Lost", objection: null },
  { label: "Gatekeeper", objection: "Gatekeeper" },
  { label: "Not Interested / Don't See the Value", objection: "Not Interested" },
  { label: "Need to Think / Need to Talk to Someone", objection: "Need to Think" },
  { label: "Too Expensive / What's Your Pricing", objection: "Pricing" },
  { label: "Bad Experience / Already Have Someone / In-House Team", objection: "Already Have Someone" },
  { label: "Stacked Objections", objection: "Stacked Objections" },
];

const STAT_KEYS = OUTCOMES.map(o => o.label);

const ALL_LIST = "__all__";

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [latestOutcomeByLead, setLatestOutcomeByLead] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<string>(ALL_LIST);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const [{ data: leadRows }, { data: outcomeRows }] = await Promise.all([
        (supabase as any).from("nl_bdr_leads")
          .select("id, business_name, owner_name, phone, city, niche, list_name, called, notes")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        (supabase as any).from("bdr_call_outcomes")
          .select("lead_id, outcome, objection_type, created_at")
          .eq("bdr_user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setLeads(leadRows || []);
      const all: OutcomeRow[] = (outcomeRows || []).map((r: any) => ({
        lead_id: r.lead_id, outcome: r.outcome, objection_type: r.objection_type,
      }));
      setOutcomes(all);
      const latest: Record<string, string> = {};
      for (const r of (outcomeRows || [])) {
        if (r.lead_id && !latest[r.lead_id]) latest[r.lead_id] = r.outcome;
      }
      setLatestOutcomeByLead(latest);
      setLoading(false);
    })();
  }, []);

  const lists = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      const name = l.list_name || "Uncategorized";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads]);

  const visibleLeads = useMemo(() => {
    if (activeList === ALL_LIST) return leads;
    return leads.filter(l => (l.list_name || "Uncategorized") === activeList);
  }, [leads, activeList]);

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

  const toggleCalled = useCallback(async (lead: Lead) => {
    if (!userId) return;
    const next = !lead.called;
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, called: next } : l));
    const { error } = await (supabase as any).from("nl_bdr_leads")
      .update({ called: next }).eq("id", lead.id).eq("user_id", userId);
    if (error) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, called: !next } : l));
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    }
  }, [userId]);

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

  const setOutcomeFor = useCallback(async (lead: Lead, label: string) => {
    if (!userId || !label) return;
    const def = OUTCOMES.find(o => o.label === label);
    if (!def) return;
    setSavingId(lead.id);
    setLatestOutcomeByLead(prev => ({ ...prev, [lead.id]: label }));
    const optimistic: OutcomeRow = { lead_id: lead.id, outcome: label, objection_type: def.objection };
    setOutcomes(prev => [optimistic, ...prev]);
    // Mark lead as called on outcome log
    if (!lead.called) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, called: true } : l));
    }
    try {
      const { error } = await (supabase as any).from("bdr_call_outcomes").insert({
        bdr_user_id: userId,
        lead_id: lead.id,
        outcome: def.label,
        objection_type: def.objection,
      });
      if (error) throw error;
      // Derive pipeline stage from outcome label
      const l = def.label.toLowerCase();
      let pipelineStage: "cold" | "warm" | "hot" | "won" = "warm";
      if (l.includes("won") || l.includes("booked")) pipelineStage = "won";
      else if (l === "lost") pipelineStage = "cold";
      else if (l.includes("call back") || l.includes("callback") || l.includes("follow up")) pipelineStage = "hot";
      else pipelineStage = "warm"; // any objection
      const leadPatch: Record<string, unknown> = { pipeline_stage: pipelineStage };
      if (!lead.called) leadPatch.called = true;
      await (supabase as any).from("nl_bdr_leads")
        .update(leadPatch).eq("id", lead.id).eq("user_id", userId);
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
      } else {
        toast({ title: "Outcome logged" });
      }
    } catch (e: any) {
      // Rollback optimistic
      setOutcomes(prev => prev.filter(o => o !== optimistic));
      toast({ title: "Failed to log outcome", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }, [userId]);

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
    { label: "Gatekeeper", key: "Gatekeeper", tone: "hsl(38,92%,55%)" },
    { label: "Not Interested / Don't See the Value", key: "Not Interested / Don't See the Value", tone: "hsl(0,0%,70%)" },
    { label: "Need to Think / Need to Talk to Someone", key: "Need to Think / Need to Talk to Someone", tone: "hsl(48,96%,55%)" },
    { label: "Too Expensive / What's Your Pricing", key: "Too Expensive / What's Your Pricing", tone: "hsl(280,80%,65%)" },
    { label: "Bad Experience / Already Have Someone / In-House Team", key: "Bad Experience / Already Have Someone / In-House Team", tone: "hsl(15,80%,60%)" },
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

      {/* List tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        <button
          onClick={() => setActiveList(ALL_LIST)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
          style={{
            background: activeList === ALL_LIST ? "hsla(211,96%,56%,.15)" : "hsla(215,35%,10%,.6)",
            color: activeList === ALL_LIST ? "hsl(211,96%,72%)" : "hsl(0,0%,70%)",
            border: `1px solid ${activeList === ALL_LIST ? "hsla(211,96%,56%,.4)" : "hsla(211,96%,60%,.12)"}`,
          }}
        >
          All Leads <span className="opacity-60 ml-1">{leads.length}</span>
        </button>
        {lists.map(([name, count]) => (
          <button key={name}
            onClick={() => setActiveList(name)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background: activeList === name ? "hsla(211,96%,56%,.15)" : "hsla(215,35%,10%,.6)",
              color: activeList === name ? "hsl(211,96%,72%)" : "hsl(0,0%,70%)",
              border: `1px solid ${activeList === name ? "hsla(211,96%,56%,.4)" : "hsla(211,96%,60%,.12)"}`,
            }}>
            {name} <span className="opacity-60 ml-1">{count}</span>
          </button>
        ))}
      </div>

      {/* Spreadsheet */}
      <div className="rounded-xl" style={{ border: "1px solid hsla(211,96%,60%,.12)", background: "hsla(215,35%,8%,.8)" }}>
        <div
          className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] rounded-xl"
          style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
        >
          <table className="text-sm border-collapse w-max">
            <thead className="sticky top-0 z-30" style={{ background: "hsl(215,35%,12%)" }}>
              <tr className="text-left text-[10px] uppercase tracking-wider text-white/55">
                <th className="px-3 py-3 font-semibold border-b border-white/10 w-10 sticky left-0 z-40" style={{ background: "hsl(215,35%,12%)" }}>#</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[200px] sticky z-40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.6)]" style={{ left: 40, background: "hsl(215,35%,12%)" }}>Business Name</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[180px]">Owner</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[140px]">Phone</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 text-center w-16">Called</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 w-[260px]">Outcome</th>
                <th className="px-3 py-3 font-semibold border-b border-white/10 min-w-[320px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-white/40 py-12 text-xs">No leads in this list.</td>
                </tr>
              ) : visibleLeads.map((lead, i) => {
                const current = latestOutcomeByLead[lead.id] || "";
                return (
                  <tr key={lead.id} className="hover:bg-white/[0.03] transition-colors align-top">
                    <td className="px-3 py-3 border-b border-white/5 text-white/40 text-[11px] sticky left-0 z-10" style={{ background: "hsl(215,35%,8%)" }}>{i + 1}</td>
                    <td className="px-3 py-3 border-b border-white/5 text-white font-medium break-words leading-snug sticky z-10 min-w-[200px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.6)]" style={{ left: 40, background: "hsl(215,35%,8%)" }}>{lead.business_name}</td>
                    <td className="px-3 py-3 border-b border-white/5 text-white/70 break-words leading-snug">{lead.owner_name || "—"}</td>
                    <td className="px-3 py-3 border-b border-white/5 break-words">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`}
                          onClick={() => {
                            if (lead.called) return;
                            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, called: true } : l));
                            (supabase as any).from("nl_bdr_leads")
                              .update({ called: true })
                              .eq("id", lead.id)
                              .eq("user_id", userId)
                              .then(() => {});
                          }}
                          className="font-mono inline-flex items-center gap-1 hover:underline text-xs" style={{ color: "hsl(211,96%,68%)" }}>
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </a>
                      ) : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-3 py-3 border-b border-white/5 text-center">
                      <input
                        type="checkbox"
                        checked={!!lead.called}
                        onChange={() => toggleCalled(lead)}
                        aria-label={`Mark ${lead.business_name} as called`}
                        className="h-5 w-5 rounded cursor-pointer accent-[hsl(142,72%,42%)]"
                      />
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
                        {OUTCOMES.map(o => (
                          <option key={o.label} value={o.label} className="bg-[hsl(220,35%,12%)]">{o.label}</option>
                        ))}
                      </select>
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
    </div>
  );
}
