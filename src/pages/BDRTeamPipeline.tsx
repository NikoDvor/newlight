import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Users, TrendingUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pipelineStageFromOutcome } from "@/pages/employee/BDRMyLeads";
import { BookingSystemBadge } from "@/components/employee/LeadFields";


type Stage = "cold" | "warm" | "hot" | "won";

interface RawLead {
  id: string;
  user_id: string;
  client_id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  status: string;
  pipeline_stage: string | null;
  outcome_history: any;
  list_name: string | null;
  created_at: string;
  has_booking_system: boolean | null;
  booking_system_exists: boolean | null;
  booking_platform: string | null;
  booking_system_platform: string | null;
  booking_system_methods: string[] | null;
  booking_system_checked_at: string | null;
}


interface RepRow {
  user_id: string;
  name: string;
  email: string | null;
  total: number;
  cold: number;
  warm: number;
  hot: number;
  won: number;
  booked: number;
  convRate: number; // booked / total
}

const STAGE_META: Record<Stage, { label: string; bar: string; text: string; bg: string }> = {
  cold: { label: "Cold",  bar: "hsl(211,90%,60%)",  text: "hsl(211,90%,70%)", bg: "hsla(211,80%,60%,.15)" },
  warm: { label: "Warm",  bar: "hsl(38,92%,55%)",   text: "hsl(38,95%,65%)",  bg: "hsla(38,92%,55%,.15)" },
  hot:  { label: "Hot",   bar: "hsl(14,90%,58%)",   text: "hsl(14,95%,68%)",  bg: "hsla(14,90%,58%,.15)" },
  won:  { label: "Won",   bar: "hsl(142,72%,42%)",  text: "hsl(142,72%,55%)", bg: "hsla(142,72%,42%,.18)" },
};

function derivePipelineStage(lead: RawLead): Stage {
  if (lead.pipeline_stage && (STAGE_META as any)[lead.pipeline_stage]) return lead.pipeline_stage as Stage;
  const hist = Array.isArray(lead.outcome_history) ? lead.outcome_history : [];
  const last = hist[hist.length - 1]?.label;
  const fromOutcome = pipelineStageFromOutcome(last);
  if (fromOutcome) return fromOutcome as Stage;
  if (lead.status === "closed_won" || lead.status === "appointment_booked") return "won";
  if (lead.status === "contacted") return "warm";
  return "cold";
}

export default function BDRTeamPipeline() {
  const { activeClientId } = useWorkspace();
  const [leads, setLeads] = useState<RawLead[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);

  useEffect(() => {
    if (!activeClientId) return;
    (async () => {
      setLoading(true);
      // RLS-scoped by tenant_select_leads: any workspace member sees all leads for their client_id.
      const { data: leadRows } = await (supabase as any)
        .from("nl_bdr_leads")
        .select("id,user_id,client_id,business_name,owner_name,phone,website,city,status,pipeline_stage,outcome_history,list_name,created_at,has_booking_system,booking_system_exists,booking_platform,booking_system_platform,booking_system_methods,booking_system_checked_at")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false });
      const rows: RawLead[] = leadRows || [];
      setLeads(rows);

      const ids = Array.from(new Set(rows.map((l) => l.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("employee_profiles")
          .select("user_id,full_name,email")
          .in("user_id", ids);
        const map: Record<string, { name: string; email: string | null }> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = { name: p.full_name || p.email || "Unknown rep", email: p.email };
        });
        ids.forEach((id) => { if (!map[id]) map[id] = { name: `Rep ${id.slice(0, 6)}`, email: null }; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [activeClientId]);

  const reps = useMemo<RepRow[]>(() => {
    const byUser = new Map<string, RepRow>();
    for (const lead of leads) {
      const row = byUser.get(lead.user_id) ?? {
        user_id: lead.user_id,
        name: profiles[lead.user_id]?.name ?? "Loading…",
        email: profiles[lead.user_id]?.email ?? null,
        total: 0, cold: 0, warm: 0, hot: 0, won: 0, booked: 0, convRate: 0,
      };
      row.name = profiles[lead.user_id]?.name ?? row.name;
      row.email = profiles[lead.user_id]?.email ?? row.email;
      row.total += 1;
      row[derivePipelineStage(lead)] += 1;
      if (lead.status === "appointment_booked" || lead.status === "closed_won") row.booked += 1;
      byUser.set(lead.user_id, row);
    }
    return Array.from(byUser.values())
      .map((r) => ({ ...r, convRate: r.total > 0 ? Math.round((r.booked / r.total) * 1000) / 10 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [leads, profiles]);

  const overall = useMemo(() => {
    const totals: Record<Stage | "total" | "booked", number> = { cold: 0, warm: 0, hot: 0, won: 0, total: 0, booked: 0 };
    for (const r of reps) {
      totals.total += r.total; totals.cold += r.cold; totals.warm += r.warm;
      totals.hot += r.hot; totals.won += r.won; totals.booked += r.booked;
    }
    const conv = totals.total > 0 ? Math.round((totals.booked / totals.total) * 1000) / 10 : 0;
    return { ...totals, conv };
  }, [reps]);

  const activeRep = selectedRep ? reps.find((r) => r.user_id === selectedRep) : null;
  const activeRepLeads = useMemo(
    () => (selectedRep ? leads.filter((l) => l.user_id === selectedRep) : []),
    [selectedRep, leads],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">BDR Team Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Roster-wide view of every rep's outbound leads and pipeline movement for this workspace.
        </p>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatBox label="Total Leads" value={overall.total} />
        <StatBox label="Cold" value={overall.cold} color={STAGE_META.cold.bar} />
        <StatBox label="Warm" value={overall.warm} color={STAGE_META.warm.bar} />
        <StatBox label="Hot" value={overall.hot} color={STAGE_META.hot.bar} />
        <StatBox label="Won" value={overall.won} color={STAGE_META.won.bar} />
        <StatBox label="Conv %" value={`${overall.conv}%`} color="hsl(211,96%,62%)" />
      </div>

      {/* Overall pipeline bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Roster Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StageBar counts={overall} total={overall.total} />
        </CardContent>
      </Card>

      {/* Reps table */}
      {!selectedRep ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Reps ({reps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-10">Loading team pipeline…</p>
            ) : reps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No BDR leads on this workspace yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <Th>Rep</Th><Th>Total</Th><Th>Cold</Th><Th>Warm</Th><Th>Hot</Th><Th>Won</Th><Th>Conv %</Th><Th>Pipeline</Th><Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map((r, i) => (
                      <motion.tr key={r.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer"
                        onClick={() => setSelectedRep(r.user_id)}>
                        <Td>
                          <div className="font-medium text-foreground">{r.name}</div>
                          {r.email && <div className="text-[10px] text-muted-foreground">{r.email}</div>}
                        </Td>
                        <Td className="tabular-nums font-semibold">{r.total}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.cold.text }}>{r.cold}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.warm.text }}>{r.warm}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.hot.text }}>{r.hot}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.won.text }}>{r.won}</Td>
                        <Td className="tabular-nums font-semibold">{r.convRate}%</Td>
                        <Td className="min-w-[160px]"><StageBar counts={r} total={r.total} compact /></Td>
                        <Td><Button variant="ghost" size="sm">Open →</Button></Td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <RepDetail rep={activeRep!} leads={activeRepLeads} onBack={() => setSelectedRep(null)} />
      )}
    </div>
  );
}

/* ── small pieces ── */

function StatBox({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
      <p className="text-lg font-bold" style={{ color: color || "hsl(0 0% 100%)" }}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function StageBar({ counts, total, compact }: { counts: Record<Stage, number>; total: number; compact?: boolean }) {
  const denom = Math.max(1, total);
  return (
    <div>
      <div className={`flex w-full rounded-full overflow-hidden ${compact ? "h-1.5" : "h-2.5"}`} style={{ background: "hsla(0,0%,100%,.04)" }}>
        {(["cold", "warm", "hot", "won"] as Stage[]).map((k) => {
          const pct = (counts[k] / denom) * 100;
          if (pct === 0) return null;
          return <div key={k} title={`${STAGE_META[k].label}: ${counts[k]}`} style={{ width: `${pct}%`, background: STAGE_META[k].bar }} />;
        })}
      </div>
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
          {(["cold", "warm", "hot", "won"] as Stage[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STAGE_META[k].bar }} />
              <span className="text-muted-foreground uppercase tracking-wide">{STAGE_META[k].label}</span>
              <span className="ml-auto font-semibold text-foreground tabular-nums">{counts[k]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{children}</th>;
}
function Td({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={`px-3 py-2.5 ${className}`} style={style}>{children}</td>;
}

function RepDetail({ rep, leads, onBack }: { rep: RepRow; leads: RawLead[]; onBack: () => void }) {
  const booking = leads.reduce(
    (acc, l) => {
      const s = bookingSystemState(l);
      acc[s] += 1;
      return acc;
    },
    { yes: 0, no: 0, unknown: 0 } as Record<"yes" | "no" | "unknown", number>,
  );
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
            <ChevronLeft className="h-3 w-3" /> Back to roster
          </button>
          <CardTitle className="text-base font-semibold">{rep.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {rep.total} leads · {rep.convRate}% conversion · {rep.won} won
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Booking system — {booking.yes} yes · {booking.no} no · {booking.unknown} unchecked
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <StageBar counts={rep} total={rep.total} />
        <div className="mt-4 space-y-2">
          {leads.map((l) => {
            const stage = STAGE_META[derivePipelineStage(l)];
            return (
              <div key={l.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">{l.business_name}</span>
                    <Badge variant="outline" style={{ background: stage.bg, color: stage.text, borderColor: "transparent" }}>{stage.label}</Badge>
                    <BookingSystemBadge lead={l} />
                    {l.list_name && <span className="text-[10px] text-muted-foreground">· {l.list_name}</span>}
                  </div>

                  <div className="text-xs text-muted-foreground truncate">
                    {[l.owner_name, l.phone, l.city].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {l.website && (
                  <a href={l.website.startsWith("http") ? l.website : `https://${l.website}`} target="_blank" rel="noreferrer"
                     className="text-xs inline-flex items-center gap-1" style={{ color: "hsl(211,96%,62%)" }}>
                    <ExternalLink className="h-3 w-3" /> site
                  </a>
                )}
              </div>
            );
          })}
          {leads.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">This rep has no leads yet.</p>
          )}
        </div>
        <div className="pt-3 mt-3 border-t border-white/[0.06]">
          <Link to="/team-management" className="text-xs text-muted-foreground hover:text-foreground">← Team management</Link>
        </div>
      </CardContent>
    </Card>
  );
}
