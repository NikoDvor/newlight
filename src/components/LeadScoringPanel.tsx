import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface ScoredLead {
  id: string;
  full_name: string;
  email: string | null;
  lead_score: number;
  lead_source: string | null;
  pipeline_stage: string;
  lifetime_revenue: number;
  number_of_appointments: number;
}

function calculateScore(contact: any): number {
  let score = contact.lead_score || 0;
  // Source bonus
  if (contact.lead_source === "Referral") score += 20;
  else if (contact.lead_source === "Google Ads") score += 15;
  else if (contact.lead_source === "Organic") score += 10;
  // Engagement
  if (contact.number_of_appointments > 0) score += contact.number_of_appointments * 10;
  if (contact.number_of_purchases > 0) score += contact.number_of_purchases * 15;
  // Revenue
  if (Number(contact.lifetime_revenue) > 1000) score += 20;
  else if (Number(contact.lifetime_revenue) > 500) score += 10;
  // Activity recency
  if (contact.last_interaction_date) {
    const daysSince = (Date.now() - new Date(contact.last_interaction_date).getTime()) / 86400000;
    if (daysSince < 7) score += 15;
    else if (daysSince < 30) score += 5;
  }
  return Math.min(100, Math.max(0, score));
}

const scoreColor = (s: number) => {
  if (s >= 70) return "bg-emerald-50 text-emerald-700";
  if (s >= 40) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-600";
};

const scoreLabel = (s: number) => {
  if (s >= 70) return "Hot";
  if (s >= 40) return "Warm";
  return "Cold";
};

export function LeadScoringPanel() {
  const { activeClientId } = useWorkspace();
  const [leads, setLeads] = useState<ScoredLead[]>([]);

  useEffect(() => {
    if (!activeClientId) return;
    supabase
      .from("crm_contacts")
      .select("id, full_name, email, lead_score, lead_source, pipeline_stage, lifetime_revenue, number_of_appointments, number_of_purchases, last_interaction_date")
      .eq("client_id", activeClientId)
      .not("pipeline_stage", "in", "(closed_won,closed_lost)")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const scored = (data || []).map(c => ({
          ...c,
          lead_score: calculateScore(c),
        })).sort((a, b) => b.lead_score - a.lead_score);
        setLeads(scored);
        // Update scores in DB
        scored.forEach(s => {
          supabase.from("crm_contacts").update({ lead_score: s.lead_score } as any).eq("id", s.id).then(() => {});
        });
      });
  }, [activeClientId]);

  return (
    <Card className="card-widget border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
            <Target className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Lead Scoring</CardTitle>
            <p className="text-[10px] text-muted-foreground">Prioritize high-value leads</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Add contacts to see lead scores.</p>
        ) : leads.slice(0, 8).map((lead, i) => (
          <motion.div key={lead.id} className="flex items-center justify-between py-2 border-b border-border last:border-0"
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{lead.full_name}</p>
              <p className="text-[10px] text-muted-foreground">{lead.lead_source || "Unknown source"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`text-[10px] ${scoreColor(lead.lead_score)}`}>
                {scoreLabel(lead.lead_score)} · {lead.lead_score}
              </Badge>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
