import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeartCrack, Search, Sparkles } from "lucide-react";
import { MOCK_RETENTION, STATUS_COLOR, type RetentionStatus } from "@/lib/retentionMock";
import { motion } from "framer-motion";

const FILTERS: (RetentionStatus | "all")[] = ["all", "cancelling", "saved", "churned"];

export default function AdminRetention() {
  const [filter, setFilter] = useState<RetentionStatus | "all">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return MOCK_RETENTION.filter(r =>
      (filter === "all" || r.status === filter) &&
      (q === "" || r.client.toLowerCase().includes(q.toLowerCase()) || r.reasonLabel.toLowerCase().includes(q.toLowerCase()))
    );
  }, [filter, q]);

  const stats = {
    cancelling: MOCK_RETENTION.filter(r => r.status === "cancelling").length,
    saved: MOCK_RETENTION.filter(r => r.status === "saved").length,
    churned: MOCK_RETENTION.filter(r => r.status === "churned").length,
    saveRate: Math.round(
      (MOCK_RETENTION.filter(r => r.status === "saved").length /
        MOCK_RETENTION.filter(r => r.offerShown).length) * 100
    ),
    mrrAtRisk: MOCK_RETENTION.filter(r => r.status === "cancelling").reduce((s, r) => s + r.mrr, 0),
    mrrLost: MOCK_RETENTION.filter(r => r.status === "churned").reduce((s, r) => s + r.mrr, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HeartCrack className="h-6 w-6" /> Retention
        </h1>
        <p className="text-sm text-white/50 mt-1">Cancellation requests, win-back offers, and save rate.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Cancelling", value: stats.cancelling, color: "hsl(35 92% 60%)" },
          { label: "Saved", value: stats.saved, color: "hsl(152 60% 55%)" },
          { label: "Churned", value: stats.churned, color: "hsl(0 72% 61%)" },
          { label: "Save Rate", value: `${stats.saveRate}%`, color: "hsl(211 96% 62%)" },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-4">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-4">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">MRR at risk</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">${stats.mrrAtRisk.toLocaleString()}/mo</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-4">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">MRR lost</p>
            <p className="text-2xl font-bold text-red-300 mt-1">${stats.mrrLost.toLocaleString()}/mo</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className={filter === f ? "" : "border-white/10 text-white/70 hover:bg-white/10"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
        <div className="relative ml-auto w-full md:w-64">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-white/40" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search client or reason…"
            className="pl-8 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <Card className="border-0 bg-white/[0.04] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Client", "Reason", "Requested", "Offer", "MRR", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 text-white/90 font-medium">
                    {r.client}
                    {r.notes && <p className="text-[11px] text-white/40 mt-0.5">{r.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-white/70">{r.reasonLabel}</td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{r.requestedAt}</td>
                  <td className="px-4 py-3">
                    {r.offerShown ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className={r.offerAccepted ? "text-emerald-300" : "text-white/50"}>
                          {r.offerAccepted ? "Accepted" : "Declined"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-white/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/80 tabular-nums">${r.mrr.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] ${STATUS_COLOR[r.status]}`}>{r.status}</Badge>
                  </td>
                </motion.tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-white/30">No records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
