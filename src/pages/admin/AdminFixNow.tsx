import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FixItem {
  id: string;
  client_id: string;
  issue: string;
  module: string | null;
  severity: string | null;
  status: string | null;
  created_at: string;
  clients: { business_name: string } | null;
}

export default function AdminFixNow() {
  const [items, setItems] = useState<FixItem[]>([]);

  const fetchItems = () => {
    supabase.from("fix_now_items").select("*, clients(business_name)").order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any) ?? []));
  };

  useEffect(() => { fetchItems(); }, []);

  const handleFix = async (id: string) => {
    await supabase.from("fix_now_items").update({ status: "resolved" }).eq("id", id);
    toast.success("Issue marked as resolved");
    fetchItems();
  };

  const severityColor = (s: string | null) => {
    if (s === "critical") return "bg-red-500/15 text-red-400";
    if (s === "high") return "bg-orange-500/15 text-orange-400";
    if (s === "medium") return "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-neon))]";
    return "bg-white/5 text-white/40";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fix Now</h1>
        <p className="text-sm text-white/50 mt-1">System issues requiring immediate attention</p>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm p-4" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.1)" }}>
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{item.issue}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-white/40">{item.clients?.business_name ?? "System"}</span>
                    {item.module && <span className="text-xs text-white/30">{item.module}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${severityColor(item.severity)}`}>{item.severity}</span>
                  </div>
                </div>
                {item.status !== "resolved" ? (
                  <Button size="sm" onClick={() => handleFix(item.id)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                    <Wrench className="h-3.5 w-3.5 mr-1" /> Fix Now
                  </Button>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]">Resolved</span>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
        {items.length === 0 && (
          <Card className="border-0 bg-white/[0.04] p-12 text-center" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <p className="text-white/30">No issues found — all systems operational</p>
          </Card>
        )}
      </div>
    </div>
  );
}
