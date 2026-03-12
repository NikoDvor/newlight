import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  user_id: string | null;
  client_id: string | null;
  action: string;
  module: string | null;
  status: string | null;
  created_at: string;
  clients: { business_name: string } | null;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    supabase.from("audit_logs").select("*, clients(business_name)").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setLogs((data as any) ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-sm text-white/50 mt-1">System-wide activity trail</p>
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Timestamp", "Action", "Client", "Module", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/80">{log.action}</td>
                  <td className="px-4 py-3 text-white/60">{log.clients?.business_name ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50">{log.module ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      log.status === "success" ? "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]"
                        : log.status === "error" ? "bg-red-500/15 text-red-400"
                        : "bg-white/5 text-white/40"
                    }`}>{log.status}</span>
                  </td>
                </motion.tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-white/30">No audit logs recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
