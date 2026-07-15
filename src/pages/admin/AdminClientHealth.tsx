import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowUpDown } from "lucide-react";
import { MOCK_CLIENTS, scoreColor } from "@/lib/clientHealthMock";

export default function AdminClientHealth() {
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const rows = useMemo(
    () => [...MOCK_CLIENTS].sort((a, b) => sortDir === "desc" ? b.score - a.score : a.score - b.score),
    [sortDir]
  );

  const avg = Math.round(MOCK_CLIENTS.reduce((s, c) => s + c.score, 0) / MOCK_CLIENTS.length);
  const healthy = MOCK_CLIENTS.filter(c => c.score >= 70).length;
  const risk = MOCK_CLIENTS.filter(c => c.score < 50).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Health Scores</h1>
        <p className="text-sm text-white/50 mt-1">Composite score per client based on activity, engagement, and results.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Average Score", value: avg, color: "hsl(211 96% 62%)" },
          { label: "Healthy (≥70)", value: healthy, color: "hsl(152 60% 55%)" },
          { label: "At Risk (<50)", value: risk, color: "hsl(0 72% 61%)" },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 bg-white/[0.04] overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Heart className="h-4 w-4" /> Client Roster
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Client</th>
                <th className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Industry</th>
                <th className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  <button className="flex items-center gap-1 hover:text-white/80" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
                    Score <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Bar</th>
                <th className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const col = scoreColor(c.score);
                return (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{c.industry}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${col.bg} ${col.text}`}>{c.score}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: col.raw }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs capitalize">{c.status}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
