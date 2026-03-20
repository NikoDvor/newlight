import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { MoneyMeter } from "@/components/MoneyMeter";
import { GrowthAutopilot } from "@/components/GrowthAutopilot";
import { LeadScoringPanel } from "@/components/LeadScoringPanel";
import { CampaignEngine } from "@/components/CampaignEngine";
import { ReactivationEngine } from "@/components/ReactivationEngine";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, TrendingUp, DollarSign, CheckSquare, Brain,
  Heart, Target, Zap, Globe, Search, Megaphone, Share2, Users, Star,
  ArrowUpRight, Plug, Calendar, Upload, Rocket, Play
} from "lucide-react";
import { HealthScoreWidget } from "@/components/HealthScoreWidget";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PredictiveGrowth } from "@/components/PredictiveGrowth";
import { RevenueCalculator } from "@/components/RevenueCalculator";
import { GrowthAdvisorCard } from "@/components/GrowthAdvisorCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NextBestActions } from "@/components/NextBestActions";
import { RecommendedServicesWidget } from "@/components/RecommendedServicesWidget";
import { WorkspaceReadiness } from "@/components/WorkspaceReadiness";
import { ClientPackageView } from "@/components/ClientPackageView";

export default function Dashboard() {
  const { activeClientId, branding } = useWorkspace();
  const navigate = useNavigate();
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [integrationStats, setIntegrationStats] = useState({ connected: 0, total: 0 });
  const [schedulingReady, setSchedulingReady] = useState({ calendars: 0, apptTypes: 0, availability: 0, bookingLinks: 0 });
  const [metrics, setMetrics] = useState({
    contacts: 0, openDeals: 0, pipelineValue: 0, wonValue: 0,
    upcomingEvents: 0, completedEvents: 0, reviewRequests: 0,
    avgRating: 0, ratingCount: 0, openTasks: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!activeClientId) return;

    Promise.all([
      supabase.from("onboarding_progress").select("*").eq("client_id", activeClientId).maybeSingle(),
      supabase.from("client_integrations").select("status").eq("client_id", activeClientId),
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", activeClientId),
      supabase.from("appointments").select("id, status, start_time").eq("client_id", activeClientId),
      supabase.from("review_requests" as any).select("rating").eq("client_id", activeClientId),
      supabase.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", activeClientId).eq("status", "open"),
      supabase.from("crm_activities").select("activity_type, activity_note, created_at").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(8),
    ]).then(([onb, intg, contacts, deals, events, reviews, tasks, acts]) => {
      setOnboardingData(onb.data);
      if (intg.data) {
        setIntegrationStats({ connected: intg.data.filter((d: any) => d.status === "connected").length, total: intg.data.length });
      }

      const dealsData = deals.data || [];
      const openDeals = dealsData.filter((d: any) => d.status === "open");
      const wonDeals = dealsData.filter((d: any) => d.pipeline_stage === "closed_won");
      const eventsData = events.data || [];
      const now = new Date();
      const reviewsData = (reviews.data || []) as any[];
      const rated = reviewsData.filter((r: any) => r.rating);

      setMetrics({
        contacts: contacts.count || 0,
        openDeals: openDeals.length,
        pipelineValue: openDeals.reduce((s: number, d: any) => s + (Number(d.deal_value) || 0), 0),
        wonValue: wonDeals.reduce((s: number, d: any) => s + (Number(d.deal_value) || 0), 0),
        upcomingEvents: eventsData.filter((e: any) => new Date(e.start_time) >= now && !["cancelled", "no_show"].includes(e.status)).length,
        completedEvents: eventsData.filter((e: any) => e.status === "completed").length,
        reviewRequests: reviewsData.length,
        avgRating: rated.length > 0 ? rated.reduce((s: number, r: any) => s + r.rating, 0) / rated.length : 0,
        ratingCount: rated.length,
        openTasks: tasks.count || 0,
      });
      setActivities(acts.data || []);
    });
  }, [activeClientId]);

  const onboardingSteps = onboardingData || {
    business_info: false, website_connected: false, google_business_connected: false,
    review_platform_connected: false, ad_account_connected: false,
    crm_setup: false, team_setup: false, launch_ready: false,
  };

  const completedSteps = Object.values(onboardingSteps).filter(v => v === true).length;
  const totalSteps = 8;
  const setupPercentage = Math.round((completedSteps / totalSteps) * 100);
  const isNewClient = setupPercentage < 50;

  const hasData = metrics.contacts > 0 || metrics.openDeals > 0 || metrics.upcomingEvents > 0;

  const growthSystems = [
    { name: "Website", icon: Globe, url: "/website" },
    { name: "SEO", icon: Search, url: "/seo" },
    { name: "Ads", icon: Megaphone, url: "/paid-ads" },
    { name: "Social", icon: Share2, url: "/social-media" },
    { name: "CRM", icon: Users, url: "/crm" },
    { name: "Reviews", icon: Star, url: "/reviews" },
  ];

  return (
    <div>
      {/* Welcome Header */}
      <div className="flex items-start justify-between mb-2">
        <PageHeader title={branding.welcome_message || "Dashboard"} description="Your AI-powered business command center" />
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate("/welcome")}>
          <Play className="h-3.5 w-3.5" /> Replay Intro
        </Button>
      </div>

      {/* Setup Progress Banner — only for new clients */}
      {isNewClient && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/[0.04] to-transparent">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
                <Rocket className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Welcome to your workspace!</p>
                <p className="text-xs text-muted-foreground">Complete your setup to unlock your full growth system</p>
              </div>
            </div>
            <span className="text-2xl font-bold" style={{ color: "hsl(211 96% 56%)" }}>{setupPercentage}%</span>
          </div>
          <Progress value={setupPercentage} className="h-2 mb-4" />
          <div className="flex flex-wrap gap-2">
            <Link to="/setup-center"><Button size="sm" className="btn-gradient h-8 text-[11px]"><Upload className="h-3 w-3 mr-1" /> Complete Setup</Button></Link>
            <Link to="/integrations"><Button size="sm" variant="outline" className="h-8 text-[11px]"><Plug className="h-3 w-3 mr-1" /> Connect Accounts ({integrationStats.connected}/{integrationStats.total})</Button></Link>
            <Link to="/onboarding"><Button size="sm" variant="outline" className="h-8 text-[11px]"><Calendar className="h-3 w-3 mr-1" /> Book Kickoff</Button></Link>
          </div>
        </motion.div>
      )}

      {/* Next Best Actions */}
      <NextBestActions />

      {/* Recommended Services — Top Revenue Opportunity */}
      <div className="mb-6">
        <RecommendedServicesWidget />
      </div>

      {/* Money Meter */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
          Daily Money Meter
        </h3>
        <MoneyMeter />
      </div>

      {/* Health + Onboarding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <HealthScoreWidget score={73} />
        <div className="lg:col-span-2">
          <OnboardingProgress steps={onboardingSteps} />
        </div>
      </div>

      {/* Real Metrics */}
      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Contacts" value={hasData ? String(metrics.contacts) : "—"} change={hasData ? "In CRM" : "Add contacts"} changeType="neutral" icon={Users} />
        <MetricCard label="Pipeline Value" value={hasData ? `$${metrics.pipelineValue.toLocaleString()}` : "—"} change={hasData ? `${metrics.openDeals} open deals` : "Create deals"} changeType={hasData ? "positive" : "neutral"} icon={DollarSign} />
        <MetricCard label="Revenue Won" value={hasData ? `$${metrics.wonValue.toLocaleString()}` : "—"} change={hasData ? "Closed deals" : "—"} changeType={metrics.wonValue > 0 ? "positive" : "neutral"} icon={TrendingUp} />
        <MetricCard label="Upcoming Appts" value={hasData ? String(metrics.upcomingEvents) : "—"} change={hasData ? `${metrics.completedEvents} completed` : "Book first"} changeType="neutral" icon={Calendar} />
        <MetricCard label="Avg Rating" value={metrics.ratingCount > 0 ? metrics.avgRating.toFixed(1) + "★" : "—"} change={metrics.ratingCount > 0 ? `${metrics.reviewRequests} requests` : "Send requests"} changeType="neutral" icon={Star} />
        <MetricCard label="Open Tasks" value={hasData ? String(metrics.openTasks) : "—"} change="" changeType="neutral" icon={CheckSquare} />
      </WidgetGrid>

      {/* Your Plan */}
      <div className="mt-6">
        <ClientPackageView />
      </div>

      {/* Workspace Readiness */}
      <div className="mt-6">
        <WorkspaceReadiness />
      </div>

      {/* System Status */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
          System Status
        </h3>
        <SystemStatusBar />
      </div>

      {/* AI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <GrowthAdvisorCard />
        <GrowthAutopilot />
        <LeadScoringPanel />
      </div>

      {/* Reactivation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ReactivationEngine />
      </div>

      {/* Activity + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Recent Activity">
          {activities.length === 0 ? (
            <div className="py-6 text-center">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                <Activity className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No activity yet</p>
              <p className="text-xs text-muted-foreground">Activity will appear as you use the platform — adding contacts, booking appointments, and completing tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((a, i) => (
                <motion.div key={a.id || i} className="flex items-start gap-2.5 py-1.5"
                  initial={{ opacity: 0, x: -4 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                  <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Activity className="h-3 w-3" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{a.activity_note || a.activity_type}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))}
              <Link to="/live-activity" className="flex items-center gap-1 text-[11px] font-medium pt-2" style={{ color: "hsl(211 96% 56%)" }}>
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </DataCard>

        <DataCard title="Quick Links">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {growthSystems.map((sys, i) => (
              <Link key={sys.name} to={sys.url}>
                <motion.div className="card-widget text-center cursor-pointer p-3"
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -3, scale: 1.02 }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <sys.icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{sys.name}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </DataCard>
      </div>

      {/* Campaign + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <CampaignEngine />
        <RevenueCalculator />
      </div>
      <div className="mt-6"><PredictiveGrowth /></div>
    </div>
  );
}
