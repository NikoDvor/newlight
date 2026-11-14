import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
type R = Record<string, number>;
const usd = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;

export default function AdminRevenueCash() {
  const [r, setR] = useState<R | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    db.rpc("nl_revenue_overview").then(({ data, error }: any) => { if (error) setErr(error.message); else setR(data as R); });
  }, []);
  if (err) return <p className="p-6 text-sm text-red-300">{err}</p>;
  if (!r) return <Loader2 className="mx-auto my-10 h-5 w-5 animate-spin text-white/60" />;
  const net = (r.collected_month || 0) - (r.payouts_month || 0);
  const groups: { title: string; tiles: { k: string; v: string; sub?: string; warn?: boolean }[] }[] = [
    { title: "Recurring", tiles: [{ k: "MRR", v: usd(r.mrr), sub: "Paid and signed deals only" }] },
    { title: "Cash this month", tiles: [
      { k: "Collected", v: usd(r.collected_month) }, { k: "Of which setup", v: usd(r.setup_month) },
      { k: "Rep payments", v: usd(r.payouts_month) }, { k: "Net", v: usd(net) },
    ] },
    { title: "Coming and late", tiles: [
      { k: "Due next 30 days", v: usd(r.due_30d) },
      { k: "Overdue", v: usd(r.overdue), sub: r.overdue_count ? `${r.overdue_count} charge${r.overdue_count === 1 ? "" : "s"}` : undefined, warn: r.overdue > 0 },
    ] },
    { title: "Pipeline", tiles: [
      { k: "Open pipeline", v: usd(r.open_pipeline), sub: `${r.open_deals} open deal${r.open_deals === 1 ? "" : "s"} · setup fees` },
      { k: "Won this month", v: String(r.won_month) },
    ] },
    { title: "All time", tiles: [{ k: "Collected", v: usd(r.collected_all) }, { k: "Paid to reps", v: usd(r.payouts_all) }] },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Revenue & Cash</h1>
        <p className="text-xs text-white/50">Real deals only (the practice workspace is excluded). Collected = charges marked paid; rep payments = what you recorded in Commission Payments.</p>
      </div>
      {groups.map((g) => (
        <div key={g.title}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">{g.title}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {g.tiles.map((t) => (
              <div key={t.k} className="rounded-xl px-4 py-3" style={{ background: "hsla(215,35%,10%,.8)", border: `1px solid ${t.warn ? "hsla(0,80%,60%,.5)" : "hsla(211,96%,60%,.12)"}` }}>
                <p className="text-[11px] text-white/55">{t.k}</p>
                <p className={`text-xl font-semibold tabular-nums ${t.warn ? "text-red-300" : "text-white"}`}>{t.v}</p>
                {t.sub && <p className="text-[11px] text-white/45">{t.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
