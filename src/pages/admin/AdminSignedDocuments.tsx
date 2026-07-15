import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSignature, Search } from "lucide-react";
import { MOCK_SIGNED_DOCS, DOC_STATUS_COLOR, type SignatureDocStatus } from "@/lib/retentionMock";
import { motion } from "framer-motion";

const FILTERS: (SignatureDocStatus | "all")[] = ["all", "sent", "viewed", "signed", "completed"];

export default function AdminSignedDocuments() {
  const [filter, setFilter] = useState<SignatureDocStatus | "all">("all");
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      MOCK_SIGNED_DOCS.filter(
        (d) =>
          (filter === "all" || d.status === filter) &&
          (q === "" ||
            d.title.toLowerCase().includes(q.toLowerCase()) ||
            d.recipient.toLowerCase().includes(q.toLowerCase()))
      ),
    [filter, q]
  );

  const stats = {
    total: MOCK_SIGNED_DOCS.length,
    outstanding: MOCK_SIGNED_DOCS.filter(d => d.status === "sent" || d.status === "viewed").length,
    signed: MOCK_SIGNED_DOCS.filter(d => d.status === "signed").length,
    completed: MOCK_SIGNED_DOCS.filter(d => d.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileSignature className="h-6 w-6" /> Signed Documents
        </h1>
        <p className="text-sm text-white/50 mt-1">E-signature envelopes sent to clients and prospects.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Envelopes", value: stats.total, color: "hsl(211 96% 62%)" },
          { label: "Outstanding", value: stats.outstanding, color: "hsl(35 92% 60%)" },
          { label: "Signed", value: stats.signed, color: "hsl(45 92% 60%)" },
          { label: "Completed", value: stats.completed, color: "hsl(152 60% 55%)" },
        ].map((s) => (
          <Card key={s.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-4">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
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
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search document or recipient…"
            className="pl-8 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <Card className="border-0 bg-white/[0.04] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Document", "Recipient", "Sent", "Signed", "IP", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 text-white/90 font-medium">
                    {d.title}
                    <p className="text-[11px] text-white/40 mt-0.5">{d.pages} page{d.pages !== 1 ? "s" : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {d.recipient}
                    <p className="text-[11px] text-white/40">{d.recipientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{d.sentAt}</td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{d.signedAt || "—"}</td>
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">{d.ip || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] ${DOC_STATUS_COLOR[d.status]}`}>{d.status}</Badge>
                  </td>
                </motion.tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-white/30">No documents</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
