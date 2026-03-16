import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Play, Pause, Mail, MessageSquare, UserCheck, Star, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AutopilotRule {
  id: string;
  name: string;
  description: string;
  rule_type: string;
  enabled: boolean;
  runs_count: number;
  last_triggered_at: string | null;
}

const DEFAULT_RULES = [
  { name: "Auto Review Requests", description: "Send review requests after completed appointments", rule_type: "review_request", icon: Star },
  { name: "Lead Follow-Up", description: "Automatically follow up with new leads after 24 hours", rule_type: "lead_followup", icon: MessageSquare },
  { name: "Appointment Reminders", description: "Send SMS/email reminders before appointments", rule_type: "appointment_reminder", icon: Bell },
  { name: "Customer Reactivation", description: "Re-engage customers inactive for 90+ days", rule_type: "reactivation", icon: UserCheck },
  { name: "Welcome Sequence", description: "Send welcome emails to new contacts", rule_type: "welcome_sequence", icon: Mail },
];

const RULE_ICONS: Record<string, typeof Zap> = {
  review_request: Star,
  lead_followup: MessageSquare,
  appointment_reminder: Bell,
  reactivation: UserCheck,
  welcome_sequence: Mail,
};

export function GrowthAutopilot() {
  const { activeClientId } = useWorkspace();
  const [rules, setRules] = useState<AutopilotRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    if (!activeClientId) return;
    const { data } = await supabase
      .from("autopilot_rules" as any)
      .select("*")
      .eq("client_id", activeClientId)
      .order("created_at", { ascending: true });

    if (data && (data as any[]).length > 0) {
      setRules(data as any);
    } else {
      // Seed default rules
      const inserts = DEFAULT_RULES.map(r => ({
        client_id: activeClientId,
        name: r.name,
        description: r.description,
        rule_type: r.rule_type,
        enabled: false,
      }));
      await supabase.from("autopilot_rules" as any).insert(inserts);
      const { data: seeded } = await supabase
        .from("autopilot_rules" as any)
        .select("*")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: true });
      setRules((seeded as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, [activeClientId]);

  const toggleRule = async (id: string, enabled: boolean) => {
    await supabase.from("autopilot_rules" as any).update({ enabled }).eq("id", id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    toast({ title: enabled ? "Autopilot Enabled" : "Autopilot Paused" });
  };

  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <Card className="card-widget border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
              <Zap className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Growth Autopilot</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">{enabledCount}/{rules.length} active rules</p>
            </div>
          </div>
          <Badge className={enabledCount > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-secondary text-muted-foreground"}>
            {enabledCount > 0 ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
            {enabledCount > 0 ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rules.map((rule, i) => {
          const Icon = RULE_ICONS[rule.rule_type] || Zap;
          return (
            <motion.div key={rule.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0" style={{ color: rule.enabled ? "hsl(211 96% 56%)" : "hsl(var(--muted-foreground))" }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{rule.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{rule.description}</p>
                  {rule.runs_count > 0 && (
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{rule.runs_count} runs</p>
                  )}
                </div>
              </div>
              <Switch checked={rule.enabled} onCheckedChange={(v) => toggleRule(rule.id, v)} />
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
