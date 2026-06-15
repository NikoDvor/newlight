import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import { Calendar, Target, TrendingUp, Star, ArrowUpRight, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

const OUTCOME_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  qualified: "bg-emerald-50 text-emerald-700",
  not_qualified: "bg-red-50 text-red-600",
  proposal_needed: "bg-amber-50 text-amber-700",
  closed_won: "bg-emerald-50 text-emerald-700",
  closed_lost: "bg-red-50 text-red-600",
  follow_up_needed: "bg-blue-50 text-blue-700",
};

const OUTCOME_LABELS: Record<string, string> = {
  pending: "Pending",
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  proposal_needed: "Proposal Needed",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  follow_up_needed: "Follow-Up Needed",
};

const TYPE_LABELS: Record<string, string> = {
  intro_call: "Intro Call",
  discovery_call: "Discovery Call",
  demo_call: "Demo Call",
  closing_call: "Closing Call",
  follow_up_call: "Follow-Up Call",
};

export default function MeetingIntelligence() {
  const { activeClientId, isAdmin } = useWorkspace();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, [activeClientId]);

  const fetchMeetings = async () => {
    setLoading(true);
    let query = supabase
      .from("sales_meetings")
      .select("*, crm_contacts(full_name, email), crm_companies(company_name), crm_deals(deal_name, deal_value)")
      .order("start_time", { ascending: false })
      .limit(50);

    if (activeClientId) {
      query = query.eq("client_id", activeClientId);
    }

    const { data } = await query;
    setMeetings(data || []);
    setLoading(false);
  };

  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter(m => m.status === "completed");
  const qualifiedMeetings = meetings.filter(m => m.meeting_outcome === "qualified" || m.meeting_outcome === "closed_won");
  const closeRate = completedMeetings.length > 0
    ? Math.round((qualifiedMeetings.length / completedMeetings.length) * 100)
    : 0;
  const pipelineValue = meetings
    .filter(m => m.crm_deals?.deal_value)
    .reduce((s, m) => s + (Number(m.crm_deals.deal_value) || 0), 0);

  return (
    <div>
      <PageHeader title="Meeting Intelligence" description="AI-powered meeting analysis and coaching insights">
        <Button size="sm" onClick={() => navigate("/meeting-outcome")}>
          <Plus className="h-4 w-4 mr-1" />
          Log Outcome
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Meetings This Month" value={String(totalMeetings)} change="From sales pipeline" changeType="positive" icon={Calendar} />
        <MetricCard label="Avg Meeting Score" value="—" change="Coming soon" changeType={closeRate >= 50 ? "positive" : "negative"} icon={Star} />
        <MetricCard label="Close Rate" value={`${closeRate}%`} change="Qualified / Completed" changeType={closeRate >= 50 ? "positive" : "negative"} icon={Target} />
        <MetricCard label="Pipeline from Meetings" value={`$${(pipelineValue / 1000).toFixed(1)}K`} change="Deal value linked" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <div className="space-y-4 mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : meetings.length === 0 ? (
          <DataCard>
            <div className="text-center py-12">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">No meetings yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Meetings are created from the admin sales pipeline or booking system.
              </p>
              <Button onClick={() => navigate("/meeting-outcome")}>Log Outcome</Button>
            </div>
          </DataCard>
        ) : (
          meetings.map((m, i) => (
            <motion.div
              key={m.id}
              className="card-widget cursor-pointer"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/admin/meetings/${m.id}`)}
            >
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[m.meeting_type] || m.meeting_type}
                    {m.start_time && ` · ${new Date(m.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                    {m.start_time && m.end_time && ` · ${Math.round((new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000)} min`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={OUTCOME_COLORS[m.meeting_outcome] || "bg-muted text-muted-foreground"}>
                    {OUTCOME_LABELS[m.meeting_outcome] || m.meeting_outcome || "Pending"}
                  </Badge>
                </div>
              </div>

              {m.summary_notes && (
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{m.summary_notes}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {m.crm_contacts && (
                  <Badge variant="outline">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> {m.crm_contacts.full_name}
                  </Badge>
                )}
                {m.crm_companies && (
                  <Badge variant="outline">{m.crm_companies.company_name}</Badge>
                )}
                {m.crm_deals && (
                  <Badge variant="outline" className="text-emerald-700">
                    ${Number(m.crm_deals.deal_value || 0).toLocaleString()}
                  </Badge>
                )}
                {m.action_items && (
                  <Badge variant="outline" className="text-amber-700">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Has action items
                  </Badge>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
