import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, ChevronRight, Dumbbell, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDiscoveryNumbers } from "@/hooks/useDiscoveryNumbers";
import { loadDiscoveryScript, parseScript, type DiscoveryScript } from "@/lib/discoveryScript";
import ScriptView from "@/components/calculator/ScriptView";
import CalculationsView from "@/components/calculator/CalculationsView";
import { C, CalcStyles, Kick, glass, money } from "@/components/calculator/kit";

/**
 * Calculator — /employee/calculator (salesmen) and /admin/calculator (admin).
 * Pick a client (or Practice) → Page 1 Script with blanks → "Calculations" → Page 2.
 * ?view=calc keeps both pages on one mounted screen so practice numbers survive the switch.
 */
export default function CalculatorPage() {
  const { leadId } = useParams<{ leadId?: string }>();
  const loc = useLocation();
  const base = loc.pathname.startsWith("/admin") ? "/admin/calculator" : "/employee/calculator";
  if (!leadId) return <><CalcStyles /><LeadPicker base={base} admin={base.startsWith("/admin")} /></>;
  return <><CalcStyles /><Session key={leadId} base={base} leadId={leadId === "practice" ? null : leadId} /></>;
}

function Session({ base, leadId }: { base: string; leadId: string | null }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "calc" ? "calc" : "script";
  const calc = useDiscoveryNumbers(leadId);
  const [script, setScript] = useState<DiscoveryScript | null>(null);
  useEffect(() => { loadDiscoveryScript().then(setScript).catch(() => setScript(parseScript(""))); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [view]);

  const title = leadId ? calc.businessName || "Client" : "Practice";
  if (calc.loading || !script) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div key={view} initial={{ opacity: 0, x: view === "calc" ? 40 : -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: view === "calc" ? -40 : 40 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        {view === "script" ? (
          <ScriptView script={script} calc={calc} title={title} onBack={() => navigate(base)} onCalculations={() => setParams({ view: "calc" })} />
        ) : (
          <CalculationsView calc={calc} title={title} onBack={() => setParams({})} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function LeadPicker({ base, admin }: { base: string; admin: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [withNumbers, setWithNumbers] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const db = supabase as any;
      const { data: u } = await supabase.auth.getUser();
      let query = db.from("nl_bdr_leads").select("id, business_name, owner_name, city, pipeline_stage").order("updated_at", { ascending: false }).limit(40);
      if (!admin && u.user) query = query.eq("user_id", u.user.id);
      if (q.trim()) query = query.or(`business_name.ilike.%${q.trim().replace(/[%,()]/g, "")}%,owner_name.ilike.%${q.trim().replace(/[%,()]/g, "")}%`);
      const { data } = await query;
      if (cancelled) return;
      const list = data || [];
      setRows(list);
      const ids = list.map((l: any) => l.id);
      if (ids.length) {
        const { data: nums } = await db.from("nl_discovery_numbers").select("lead_id, goal_revenue, goal_revenue_period, current_revenue, current_revenue_period, updated_at").in("lead_id", ids);
        if (!cancelled) setWithNumbers(Object.fromEntries((nums || []).map((n: any) => [n.lead_id, n])));
      }
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, admin]);

  const sorted = useMemo(() => [...(rows || [])].sort((a, b) => Number(!!withNumbers[b.id]) - Number(!!withNumbers[a.id])), [rows, withNumbers]);
  const yearly = (v: any, p: string) => (v == null ? null : p === "month" ? Number(v) * 12 : Number(v));

  return (
    <div className="mx-auto w-full max-w-3xl pb-16">
      <Kick color={C.sky}>{admin ? "Admin · Calculator" : "Calculator"}</Kick>
      <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold text-white"><Calculator className="h-7 w-7 text-[hsl(197,100%,65%)]" />Who's the call with?</h1>
      <p className="mt-1 text-sm text-white/55">Pick the client. Their numbers save as you type and come back every time you open them.</p>

      <button onClick={() => navigate(`${base}/practice`)}
        className={`${glass} relative mt-5 flex min-h-[72px] w-full items-center gap-4 overflow-hidden p-4 text-left transition hover:border-[hsla(205,100%,88%,.5)]`}>
        <span className="calc-sheen" aria-hidden />
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[hsla(205,100%,88%,.15)] text-[hsl(205,100%,90%)]"><Dumbbell className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block font-bold text-white">Practice</span><span className="block text-[12px] text-white/50">Role-play the script. Nothing is saved.</span></span>
        <ChevronRight className="h-5 w-5 text-white/40" />
      </button>

      <label htmlFor="calc-search" className="sr-only">Search clients</label>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input id="calc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by business or owner name" autoComplete="off"
          className="min-h-[48px] w-full rounded-xl border border-white/12 bg-white/[0.04] pl-10 pr-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[hsla(197,100%,60%,.6)]" />
      </div>

      <div className="mt-3 space-y-2">
        {rows == null ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-white/40" /></div>
          : sorted.length === 0 ? <p className="py-8 text-center text-sm text-white/45">{q ? "No clients match that." : "No leads yet."}</p>
          : sorted.map((l, i) => {
            const n = withNumbers[l.id];
            return (
              <motion.button key={l.id} onClick={() => navigate(`${base}/${l.id}`)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.025 }}
                className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left transition hover:border-[hsla(197,100%,60%,.4)] hover:bg-[hsla(197,100%,55%,.06)]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">{l.business_name || "Unnamed"}</span>
                  <span className="block truncate text-[12px] text-white/45">{[l.owner_name, l.city].filter(Boolean).join(" · ")}</span>
                </span>
                {n && (
                  <span className="shrink-0 text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(188,95%,72%)]">Numbers saved</span>
                    <span className="block text-[11px] tabular-nums text-white/50">{money(yearly(n.current_revenue, n.current_revenue_period))} → {money(yearly(n.goal_revenue, n.goal_revenue_period))}</span>
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </motion.button>
            );
          })}
      </div>
    </div>
  );
}
