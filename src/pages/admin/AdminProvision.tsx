import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface QueueItem {
  id: string;
  client_id: string;
  provision_status: string;
  automation_setup: boolean | null;
  crm_setup: boolean | null;
  integrations_status: string | null;
  errors: string[] | null;
  created_at: string;
  clients: { business_name: string } | null;
}

export default function AdminProvision() {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    supabase.from("provision_queue").select("*, clients(business_name)").order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any) ?? []));
  }, []);

  const statusIcon = (s: string) => {
    if (s === "ready") return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />;
    if (s === "qa_review") return <Clock className="h-4 w-4 text-[hsl(var(--nl-neon))]" />;
    return <Loader2 className="h-4 w-4 text-white/40 animate-spin" />;
  };

  const boolIcon = (v: boolean | null) => v
    ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
    : <Clock className="h-3.5 w-3.5 text-white/30" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Provision Queue</h1>
        <p className="text-sm text-white/50 mt-1">Track new client workspace setup progress</p>
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Client", "Status", "Automation", "CRM", "Integrations", "Errors", "Ready"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">{item.clients?.business_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(item.provision_status)}
                      <span className="text-white/60 capitalize text-xs">{item.provision_status.replace("_", " ")}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{boolIcon(item.automation_setup)}</td>
                  <td className="px-4 py-3">{boolIcon(item.crm_setup)}</td>
                  <td className="px-4 py-3 text-white/60 text-xs capitalize">{item.integrations_status}</td>
                  <td className="px-4 py-3">
                    {item.errors && item.errors.length > 0 ? (
                      <span className="text-xs text-red-400">{item.errors.length} error(s)</span>
                    ) : (
                      <span className="text-xs text-white/30">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.provision_status === "ready" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]">Ready</span>
                    ) : (
                      <span className="text-[10px] text-white/30">Pending</span>
                    )}
                  </td>
                </motion.tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-white/30">No items in queue</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
