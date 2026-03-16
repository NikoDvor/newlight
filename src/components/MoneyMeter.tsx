import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface MoneyData {
  today: number;
  week: number;
  month: number;
  automationRecovered: number;
}

export function MoneyMeter() {
  const { activeClientId } = useWorkspace();
  const [data, setData] = useState<MoneyData>({ today: 0, week: 0, month: 0, automationRecovered: 0 });

  useEffect(() => {
    if (!activeClientId) return;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getTime() - now.getDay() * 86400000).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    Promise.all([
      supabase.from("financial_adjustments").select("amount, type").eq("client_id", activeClientId).eq("type", "revenue").gte("created_at", startOfDay),
      supabase.from("financial_adjustments").select("amount, type").eq("client_id", activeClientId).eq("type", "revenue").gte("created_at", startOfWeek),
      supabase.from("financial_adjustments").select("amount, type").eq("client_id", activeClientId).eq("type", "revenue").gte("created_at", startOfMonth),
      supabase.from("crm_deals").select("deal_value").eq("client_id", activeClientId).eq("pipeline_stage", "closed_won").gte("created_at", startOfMonth),
    ]).then(([dayRes, weekRes, monthRes, dealsRes]) => {
      const sum = (arr: any[]) => arr.reduce((s, a) => s + (Number(a.amount || a.deal_value) || 0), 0);
      const dealRevenue = sum(dealsRes.data || []);
      setData({
        today: sum(dayRes.data || []),
        week: sum(weekRes.data || []) + dealRevenue,
        month: sum(monthRes.data || []) + dealRevenue,
        automationRecovered: Math.round(dealRevenue * 0.15),
      });
    });
  }, [activeClientId]);

  const meters = [
    { label: "Today", value: data.today, icon: DollarSign },
    { label: "This Week", value: data.week, icon: TrendingUp },
    { label: "This Month", value: data.month, icon: TrendingUp },
    { label: "Automation Recovery", value: data.automationRecovered, icon: Zap },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {meters.map((m, i) => (
        <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="card-widget border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <m.icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{m.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                ${m.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
