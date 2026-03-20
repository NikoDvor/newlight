import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Rocket, FileSignature, Clock, CheckCircle2, Send, Inbox } from "lucide-react";
import { motion } from "framer-motion";

interface StatusItem {
  label: string;
  status: string;
  detail: string;
  icon: any;
  color: string;
}

export function ImplementationStatusWidget() {
  const { activeClientId } = useWorkspace();
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    const load = async () => {
      const [reqRes, propRes, subRes] = await Promise.all([
        supabase.from("implementation_requests").select("request_status, recommendation_name, package_name, created_at")
          .eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(3),
        supabase.from("proposals").select("proposal_title, proposal_status, created_at")
          .eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(3),
        supabase.from("subscriptions").select("subscription_name, subscription_status")
          .eq("client_id", activeClientId).eq("subscription_status", "active").limit(1).maybeSingle(),
      ]);

      const result: StatusItem[] = [];

      // Active subscription
      if (subRes.data) {
        result.push({
          label: subRes.data.subscription_name || "Active Plan",
          status: "Active",
          detail: "Your plan is active",
          icon: CheckCircle2,
          color: "hsl(152 60% 44%)",
        });
      }

      // Proposals
      (propRes.data || []).forEach((p: any) => {
        const statusMap: Record<string, { detail: string; color: string }> = {
          draft: { detail: "Being prepared", color: "hsl(38 92% 50%)" },
          sent: { detail: "Sent for your review", color: "hsl(211 96% 56%)" },
          viewed: { detail: "Under review", color: "hsl(197 92% 58%)" },
          accepted: { detail: "Accepted", color: "hsl(152 60% 44%)" },
          signed: { detail: "Signed & active", color: "hsl(152 60% 44%)" },
        };
        const info = statusMap[p.proposal_status];
        if (info) {
          result.push({
            label: p.proposal_title || "Service Proposal",
            status: p.proposal_status.charAt(0).toUpperCase() + p.proposal_status.slice(1),
            detail: info.detail,
            icon: FileSignature,
            color: info.color,
          });
        }
      });

      // Implementation requests
      (reqRes.data || []).forEach((r: any) => {
        const statusMap: Record<string, { detail: string; color: string }> = {
          New: { detail: "Request received", color: "hsl(211 96% 56%)" },
          "In Review": { detail: "Our team is reviewing", color: "hsl(38 92% 50%)" },
          "Proposal Needed": { detail: "Proposal being prepared", color: "hsl(270 60% 60%)" },
          "Proposal Sent": { detail: "Proposal sent for review", color: "hsl(197 92% 58%)" },
          Approved: { detail: "Approved — implementation starting", color: "hsl(152 60% 44%)" },
        };
        const info = statusMap[r.request_status];
        if (info) {
          result.push({
            label: r.recommendation_name || r.package_name || "Implementation Request",
            status: r.request_status,
            detail: info.detail,
            icon: r.request_status === "Approved" ? CheckCircle2 : Clock,
            color: info.color,
          });
        }
      });

      setItems(result);
      setLoading(false);
    };
    load();
  }, [activeClientId]);

  if (loading || items.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-2 bg-primary/[0.03]">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 hover:border-primary/10 transition-colors">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}15` }}>
                <item.icon className="h-4 w-4" style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.detail}</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0 border-0" style={{ color: item.color, background: `${item.color}10` }}>
                {item.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}