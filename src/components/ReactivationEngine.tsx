import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserX, Mail, MessageSquare, Gift, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InactiveCustomer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  last_interaction_date: string | null;
  daysSince: number;
  lifetime_revenue: number;
}

export function ReactivationEngine() {
  const { activeClientId } = useWorkspace();
  const [inactive, setInactive] = useState<InactiveCustomer[]>([]);

  useEffect(() => {
    if (!activeClientId) return;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    supabase
      .from("crm_contacts")
      .select("id, full_name, email, phone, last_interaction_date, lifetime_revenue")
      .eq("client_id", activeClientId)
      .lt("last_interaction_date", ninetyDaysAgo)
      .not("pipeline_stage", "eq", "closed_lost")
      .order("last_interaction_date", { ascending: true })
      .limit(15)
      .then(({ data }) => {
        setInactive((data || []).map(c => ({
          ...c,
          daysSince: c.last_interaction_date
            ? Math.round((Date.now() - new Date(c.last_interaction_date).getTime()) / 86400000)
            : 999,
        })));
      });
  }, [activeClientId]);

  const triggerReactivation = async (contact: InactiveCustomer, channel: "sms" | "email") => {
    await supabase.from("crm_activities").insert({
      client_id: activeClientId!,
      activity_type: "reactivation_triggered",
      activity_note: `Reactivation ${channel} sent to ${contact.full_name}`,
      related_type: "contact",
      related_id: contact.id,
    });
    toast({ title: `Reactivation ${channel.toUpperCase()} queued for ${contact.full_name}` });
  };

  const totalLostRevenue = inactive.reduce((s, c) => s + Number(c.lifetime_revenue || 0), 0);

  return (
    <Card className="card-widget border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
            <UserX className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Customer Reactivation</CardTitle>
            <p className="text-[10px] text-muted-foreground">
              {inactive.length} inactive (90+ days) · ${totalLostRevenue.toLocaleString()} at risk
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {inactive.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No inactive customers detected. Great retention!</p>
        ) : inactive.slice(0, 6).map((c, i) => (
          <motion.div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{c.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{c.daysSince} days inactive</span>
                {Number(c.lifetime_revenue) > 0 && (
                  <span className="text-[10px] tabular-nums" style={{ color: "hsl(211 96% 56%)" }}>
                    ${Number(c.lifetime_revenue).toLocaleString()} LTV
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {c.phone && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => triggerReactivation(c, "sms")}>
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              )}
              {c.email && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => triggerReactivation(c, "email")}>
                  <Mail className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
