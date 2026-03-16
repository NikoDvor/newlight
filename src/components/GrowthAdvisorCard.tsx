import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, ArrowUpRight, AlertTriangle, DollarSign, Zap, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

export function GrowthAdvisorCard() {
  const { activeClientId } = useWorkspace();
  const [topInsight, setTopInsight] = useState<string>("Loading insights...");
  const [missedRevenue, setMissedRevenue] = useState<string>("—");
  const [nextAction, setNextAction] = useState<string>("Analyzing your data...");
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!activeClientId) return;
    computeQuickInsights();
  }, [activeClientId]);

  const computeQuickInsights = async () => {
    if (!activeClientId) return;

    const [
      { data: deals },
      { data: events },
      { data: reviews },
      { count: contactCount },
    ] = await Promise.all([
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", activeClientId),
      supabase.from("calendar_events").select("calendar_status").eq("client_id", activeClientId),
      supabase.from("review_requests").select("rating, recovery_needed").eq("client_id", activeClientId),
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
    ]);

    const d = deals || [];
    const e = events || [];
    const r = reviews || [];
    const contacts = contactCount || 0;

    const newLeads = d.filter(x => x.pipeline_stage === "new_lead").length;
    const lostDeals = d.filter(x => x.pipeline_stage === "closed_lost");
    const lostValue = lostDeals.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
    const noShows = e.filter(x => x.calendar_status === "no_show").length;
    const completedAppts = e.filter(x => x.calendar_status === "completed").length;
    const recoveryNeeded = r.filter(x => x.recovery_needed).length;

    // Compute total missed
    let totalMissed = newLeads * 500 + lostValue * 0.2 + noShows * 300;
    if (completedAppts > r.length) totalMissed += (completedAppts - r.length) * 200;

    setHasData(contacts > 0 || d.length > 0 || e.length > 0);

    // Top insight
    if (contacts === 0) {
      setTopInsight("Import contacts to activate your CRM");
    } else if (newLeads > 3) {
      setTopInsight(`${newLeads} leads need follow-up — act now`);
    } else if (recoveryNeeded > 0) {
      setTopInsight(`${recoveryNeeded} customers need service recovery`);
    } else if (lostDeals.length > 2) {
      setTopInsight(`${lostDeals.length} lost deals may be recoverable`);
    } else {
      setTopInsight("Pipeline is healthy — keep building");
    }

    setMissedRevenue(totalMissed > 0 ? `$${(totalMissed / 1000).toFixed(1)}K/mo opportunity` : "No missed revenue detected");

    // Next action
    if (contacts === 0) setNextAction("Import contacts · Foundation step");
    else if (newLeads > 3) setNextAction(`Follow up with ${newLeads} leads · Est. $${(newLeads * 500).toLocaleString()}/mo`);
    else if (noShows > 0) setNextAction(`Reduce no-shows · Est. $${(noShows * 300).toLocaleString()}/mo`);
    else if (completedAppts > r.length + 2) setNextAction(`Send ${completedAppts - r.length} review requests`);
    else setNextAction("Add more contacts and deals to grow");
  };

  return (
    <motion.div className="card-widget relative overflow-hidden"
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.3 }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(135deg, hsla(211,96%,56%,.05) 0%, hsla(197,92%,68%,.03) 100%)"
      }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{
              background: "hsla(211,96%,56%,.1)", boxShadow: "0 0 16px -4px hsla(211,96%,56%,.2)"
            }}>
              <Brain className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <h3 className="section-title !mb-0">AI Growth Advisor</h3>
          </div>
          <Link to="/growth-advisor" className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "hsl(211 96% 56%)" }}>
            View All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5 py-1.5">
            <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(215,75%,48%,.1)" }}>
              <AlertTriangle className="h-3 w-3" style={{ color: "hsl(215 75% 42%)" }} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Top Insight</p>
              <p className="text-[10px] text-muted-foreground">{topInsight}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 py-1.5">
            <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(197,92%,48%,.1)" }}>
              <DollarSign className="h-3 w-3" style={{ color: "hsl(197 92% 48%)" }} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Revenue Impact</p>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>{missedRevenue}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 py-1.5">
            <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.1)" }}>
              <Zap className="h-3 w-3" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Next Best Action</p>
              <p className="text-[10px] text-muted-foreground">{nextAction}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
