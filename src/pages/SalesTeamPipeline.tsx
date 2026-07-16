import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Users, TrendingUp, DollarSign, Target, ExternalLink, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pipelineStageFromOutcome } from "@/pages/employee/BDRMyLeads";

/**
 * Client-facing sales team pipeline overview for sub-account owners/admins.
 * Mirrors AdminSalesPipeline's KPI-card + roster structure, but strictly
 * scoped to the current workspace (client_id). No NewLight-internal fields.
 *
 * RLS: `tenant_select_leads` on nl_bdr_leads already scopes via
 * user_can_access_client(auth.uid(), client_id) — a client_owner in
 * workspace_users for their own client already sees every rep's leads.
 */

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
}

interface RawDeal {
  id: string;
  assigned_user: string | null;
  deal_value: number | null;
  pipeline_stage: string | null;
  status: string | null;
}

interface RepRow {
  user_id: string;
  name: string;
  email: string | null;
  role: string | null;
  total: number;
  cold: number;
  warm: number;
  hot: number;
  won: number;
  booked: number;
  convRate: number;         // booked / total
  dealCount: number;
  openPipelineValue: number;
  wonRevenue: number;
}

const STAGE_META: Record<Stage, { label: string; bar: string; text: string; bg: string }> = {
  cold: { label: "Cold",  bar: "hsl(211,90%,60%)",  text: "hsl(211,90%,70%)", bg: "hsla(211,80%,60%,.15)" },
  warm: { label: "Warm",  bar: "hsl(38,92%,55%)",   text: "hsl(38,95%,65%)",  bg: "hsla(38,92%,55%,.15)" },
  hot:  { label: "Hot",   bar: "hsl(14,90%,58%)",   text: "hsl(14,95%,68%)",  bg: "hsla(14,90%,58%,.15)" },
  won:  { label: "Won",   bar: "hsl(142,72%,42%)",  text: "hsl(142,72%,55%)", bg: "hsla(142,72%,42%,.18)" },
};

// Reuse the exact stage-derivation logic from BDRMyLeads.
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

// Which workspace_users role_presets count as "sales-type" reps for this view.
const SALES_ROLES = new Set([
  "bdr", "sdr", "sales", "salesperson", "account_executive", "ae",
  "sales_manager", "closer",
]);

export default function SalesTeamPipeline() {
  const { activeClientId } = useWorkspace();
  const [leads, setLeads] = useState<RawLead[]>([]);
  const [deals, setDeals] = useState<RawDeal[]>([]);
  const [members, setMembers] = useState<Array<{ user_id: string; name: string; email: string | null; role: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);

  useEffect(() => {
    if (!activeClientId) return;
    (async () => {
      setLoading(true);

      // Leads scoped to this workspace (RLS enforces the same thing).
      const { data: leadRows } = await (supabase as any)
        .from("nl_bdr_leads")
        .select("id,user_id,client_id,business_name,owner_name,phone,website,city,status,pipeline_stage,outcome_history,list_name,created_at")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false });
      const leadList: RawLead[] = leadRows || [];
      setLeads(leadList);

      // Deals scoped to this workspace — used for per-rep pipeline value.
      const { data: dealRows } = await (supabase as any)
        .from("crm_deals")
        .select("id,assigned_user,deal_value,pipeline_stage,status")
        .eq("client_id", activeClientId);
      setDeals((dealRows || []) as RawDeal[]);

      // Sales-type workspace members (so reps appear even with zero leads).
      const { data: memberRows } = await supabase
        .from("workspace_users")
        .select("user_id,full_name,email,role_preset,status")
        .eq("client_id", activeClientId)
        .eq("status", "active");
      const salesMembers = (memberRows || [])
        .filter((m: any) => m.user_id && (!m.role_preset || SALES_ROLES.has(String(m.role_preset).toLowerCase())))
        .map((m: any) => ({
          user_id: m.user_id as string,
          name: (m.full_name || m.email || "Team member") as string,
          email: (m.email || null) as string | null,
          role: (m.role_preset || null) as string | null,
        }));
      setMembers(salesMembers);

      setLoading(false);
    })();
  }, [activeClientId]);

  const reps = useMemo<RepRow[]>(() => {
    const byUser = new Map<string, RepRow>();

    // Seed from workspace sales members so zero-lead reps still appear.
    for (const m of members) {
      byUser.set(m.user_id, {
        user_id: m.user_id, name: m.name, email: m.email, role: m.role,
        total: 0, cold: 0, warm: 0, hot: 0, won: 0, booked: 0, convRate: 0,
        dealCount: 0, openPipelineValue: 0, wonRevenue: 0,
      });
    }

    for (const lead of leads) {
      const row = byUser.get(lead.user_id) ?? {
        user_id: lead.user_id,
        name: `Rep ${lead.user_id.slice(0, 6)}`,
        email: null, role: null,
        total: 0, cold: 0, warm: 0, hot: 0, won: 0, booked: 0, convRate: 0,
        dealCount: 0, openPipelineValue: 0, wonRevenue: 0,
      };
      row.total += 1;
      row[derivePipelineStage(lead)] += 1;
      if (lead.status === "appointment_booked" || lead.status === "closed_won") row.booked += 1;
      byUser.set(lead.user_id, row);
    }

    for (const d of deals) {
      if (!d.assigned_user) continue;
      const row = byUser.get(d.assigned_user);
      if (!row) continue; // deals for non-sales users aren't shown here
      row.dealCount += 1;
      const value = Number(d.deal_value) || 0;
      if (d.pipeline_stage === "closed_won" || d.status === "won") {
        row.wonRevenue += value;
      } else if (d.pipeline_stage !== "closed_lost" && d.status !== "lost") {
        row.openPipelineValue += value;
      }
    }

    return Array.from(byUser.values())
      .map((r) => ({ ...r, convRate: r.total > 0 ? Math.round((r.booked / r.total) * 1000) / 10 : 0 }))
      .sort((a, b) => b.openPipelineValue - a.openPipelineValue || b.total - a.total);
  }, [leads, deals, members]);

  const overall = useMemo(() => {
    const totals = { total: 0, cold: 0, warm: 0, hot: 0, won: 0, booked: 0, openPipelineValue: 0, wonRevenue: 0, dealCount: 0 };
    for (const r of reps) {
      totals.total += r.total; totals.cold += r.cold; totals.warm += r.warm;
      totals.hot += r.hot; totals.won += r.won; totals.booked += r.booked;
      totals.openPipelineValue += r.openPipelineValue;
      totals.wonRevenue += r.wonRevenue;
      totals.dealCount += r.dealCount;
    }
    const conv = totals.total > 0 ? Math.round((totals.booked / totals.total) * 1000) / 10 : 0;
    return { ...totals, conv };
  }, [reps]);

  const activeRep = selectedRep ? reps.find((r) => r.user_id === selectedRep) : null;
  const activeRepLeads = useMemo(
    () => (selectedRep ? leads.filter((l) => l.user_id === selectedRep) : []),
    [selectedRep, leads],
  );

  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Sales Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every rep on your workspace · pipeline value · lead stages · conversion. Click a rep for their lead list.
        </p>
      </motion.div>

      {/* KPI cards — mirror AdminSalesPipeline pattern */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <KpiCard label="Open Pipeline" value={money(overall.openPipelineValue)} icon={DollarSign} accent />
        <KpiCard label="Won Revenue" value={money(overall.wonRevenue)} icon={TrendingUp} accent />
        <KpiCard label="Total Leads" value={String(overall.total)} icon={Users} />
        <KpiCard label="Active Deals" value={String(overall.dealCount)} icon={Briefcase} />
        <KpiCard label="Team Conv." value={`${overall.conv}%`} icon={Target} />
        <KpiCard label="Reps" value={String(reps.length)} icon={Users} />
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
              <p className="text-sm text-muted-foreground text-center py-10">Loading sales team…</p>
            ) : reps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No sales-role team members yet. Invite BDRs/SDRs from Team Management.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      <Th>Rep</Th>
                      <Th>Leads</Th>
                      <Th>Cold</Th><Th>Warm</Th><Th>Hot</Th><Th>Won</Th>
                      <Th>Conv %</Th>
                      <Th>Deals</Th>
                      <Th>Open Pipeline</Th>
                      <Th>Won Revenue</Th>
                      <Th className="min-w-[160px]">Pipeline</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map((r, i) => (
                      <motion.tr key={r.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer"
                        onClick={() => setSelectedRep(r.user_id)}>
                        <Td>
                          <div className="font-medium text-foreground">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            {r.email && <span>{r.email}</span>}
                            {r.role && <Badge variant="outline" className="text-[9px] py-0 px-1 h-4">{r.role}</Badge>}
                          </div>
                        </Td>
                        <Td className="tabular-nums font-semibold">{r.total}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.cold.text }}>{r.cold}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.warm.text }}>{r.warm}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.hot.text }}>{r.hot}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.won.text }}>{r.won}</Td>
                        <Td className="tabular-nums font-semibold">{r.convRate}%</Td>
                        <Td className="tabular-nums">{r.dealCount}</Td>
                        <Td className="tabular-nums font-semibold" style={{ color: "hsl(211,96%,62%)" }}>{money(r.openPipelineValue)}</Td>
                        <Td className="tabular-nums" style={{ color: STAGE_META.won.text }}>{money(r.wonRevenue)}</Td>
                        <Td><StageBar counts={r} total={r.total} compact /></Td>
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

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: boolean }) {
  return (
    <div className="rounded-xl p-3"
      style={{
        background: accent ? "hsla(211,96%,60%,.08)" : "hsla(215,35%,10%,.8)",
        border: `1px solid ${accent ? "hsla(211,96%,60%,.28)" : "hsla(211,96%,60%,.12)"}`,
      }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-lg font-bold text-foreground mt-1 tabular-nums">{value}</p>
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
        <div className="grid grid-cols-4 gap-2 mt-2 text-[11px]">
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

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={`px-3 py-2.5 ${className}`} style={style}>{children}</td>;
}

function RepDetail({ rep, leads, onBack }: { rep: RepRow; leads: RawLead[]; onBack: () => void }) {
  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
  return (
    <Card>
      <CardHeader className="pb-3">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
          <ChevronLeft className="h-3 w-3" /> Back to roster
        </button>
        <CardTitle className="text-base font-semibold">{rep.name}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {rep.total} leads · {rep.convRate}% conv · {rep.dealCount} deals · {money(rep.openPipelineValue)} open · {money(rep.wonRevenue)} won
        </p>
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
      </CardContent>
    </Card>
  );
}
