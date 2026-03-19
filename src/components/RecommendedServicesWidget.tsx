import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, ArrowRight, DollarSign, Zap, Star,
  AlertTriangle, ChevronRight, Sparkles,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import {
  generateRecommendations, buildWorkspaceContext,
  type ServiceRecommendation,
} from "@/lib/recommendationEngine";

const urgencyStyles: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: "hsla(0,70%,50%,.08)", text: "hsl(0 70% 45%)", border: "hsla(0,70%,50%,.2)" },
  High:     { bg: "hsla(25,95%,53%,.08)", text: "hsl(25 95% 45%)", border: "hsla(25,95%,53%,.2)" },
  Medium:   { bg: "hsla(211,96%,56%,.08)", text: "hsl(211 96% 50%)", border: "hsla(211,96%,56%,.2)" },
  Low:      { bg: "hsla(var(--muted),.5)", text: "hsl(var(--muted-foreground))", border: "hsl(var(--border))" },
};

export function RecommendedServicesWidget() {
  const { activeClientId } = useWorkspace();
  const [recs, setRecs] = useState<ServiceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);

    Promise.all([
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, status, pipeline_stage").eq("client_id", activeClientId),
      supabase.from("appointments").select("status, start_time").eq("client_id", activeClientId),
      supabase.from("review_requests" as any).select("rating").eq("client_id", activeClientId),
      supabase.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", activeClientId).eq("status", "open"),
      supabase.from("client_integrations").select("status").eq("client_id", activeClientId),
      supabase.from("calendar_integrations").select("id").eq("client_id", activeClientId),
      supabase.from("automations").select("automation_category, enabled").eq("client_id", activeClientId),
      supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
    ]).then(([contacts, deals, events, reviews, tasks, intg, calIntg, autos, team]) => {
      const ctx = buildWorkspaceContext({
        contacts: contacts.count || 0,
        deals: (deals.data || []) as any,
        events: (events.data || []) as any,
        reviews: (reviews.data || []) as any,
        tasks: tasks.count || 0,
        integrations: (intg.data || []) as any,
        calendarIntegrations: calIntg.data || [],
        automations: (autos.data || []) as any,
        teamSize: team.count || 1,
      });
      setRecs(generateRecommendations(ctx));
      setLoading(false);
    });
  }, [activeClientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded animate-pulse w-48" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (recs.length === 0) return null;

  const top = recs[0];
  const secondary = recs.slice(1, 4);
  const topStyle = urgencyStyles[top.urgency] || urgencyStyles.Medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
          <Sparkles className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
        </div>
        <h3 className="text-sm font-bold text-foreground">Top Revenue Opportunity</h3>
      </div>

      {/* Hero recommendation */}
      <Card className="relative overflow-hidden border-2" style={{ borderColor: topStyle.border }}>
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20" style={{
          background: `radial-gradient(circle at 100% 0%, ${topStyle.text}, transparent 70%)`
        }} />
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-foreground">{top.name}</h4>
                <Badge className="text-[10px] font-bold" style={{ background: topStyle.bg, color: topStyle.text, border: `1px solid ${topStyle.border}` }}>
                  {top.urgency} Priority
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{top.reason}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Projected</span>
              </div>
              <p className="text-xl font-black text-foreground">${top.projectedMonthly.toLocaleString()}<span className="text-xs font-medium text-muted-foreground">/mo</span></p>
              <p className="text-[11px] font-semibold text-primary">${top.projectedAnnual.toLocaleString()}/yr</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Fit: <strong className="text-foreground">{top.fitScore}%</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Confidence: <strong className="text-foreground">{top.confidence}%</strong></span>
              </span>
            </div>
            <div className="flex-1" />
            <Link to="/revenue-opportunities">
              <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                <DollarSign className="h-3.5 w-3.5" /> Implement Now <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Secondary recommendations */}
      {secondary.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-3">
          {secondary.map((rec, i) => {
            const style = urgencyStyles[rec.urgency] || urgencyStyles.Medium;
            return (
              <motion.div
                key={rec.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow group cursor-pointer">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px]" style={{ borderColor: style.border, color: style.text }}>
                        {rec.urgency}
                      </Badge>
                      <span className="text-[10px] font-semibold text-muted-foreground">#{rec.priorityRank}</span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground leading-snug">{rec.name}</h5>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-foreground">${rec.projectedMonthly.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{rec.reason}</p>
                    <Link to="/revenue-opportunities" className="flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Details <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
