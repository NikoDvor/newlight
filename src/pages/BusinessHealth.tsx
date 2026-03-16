import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Activity, Globe, Search, Share2, Users, Star, Megaphone,
  Heart, Shield, TrendingUp, CheckCircle, AlertTriangle, XCircle,
  DollarSign, Calendar, RefreshCw, Zap, Calculator
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface CategoryScore {
  name: string; score: number; status: string; icon: any; detail: string; weight: number;
}

const scoreColor = (score: number) => {
  if (score >= 75) return "hsl(152 60% 44%)";
  if (score >= 50) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
};

const statusFromScore = (score: number) => {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Needs Improvement";
  return "Critical";
};

const statusIcon = (status: string) => {
  if (status === "Strong") return <CheckCircle className="h-4 w-4" style={{ color: "hsl(152 60% 44%)" }} />;
  if (status === "Needs Improvement") return <AlertTriangle className="h-4 w-4" style={{ color: "hsl(38 92% 50%)" }} />;
  return <XCircle className="h-4 w-4" style={{ color: "hsl(0 72% 51%)" }} />;
};

export default function BusinessHealth() {
  const { activeClientId } = useWorkspace();
  const [categories, setCategories] = useState<CategoryScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState<any>(null);
  // Revenue simulator
  const [simConvRate, setSimConvRate] = useState(3);
  const [simReviewRating, setSimReviewRating] = useState(4.2);
  const [simTraffic, setSimTraffic] = useState(5000);
  const [simRetention, setSimRetention] = useState(40);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    computeScores();
  }, [activeClientId]);

  const computeScores = async () => {
    if (!activeClientId) return;
    setLoading(true);

    const [
      { count: contactCount },
      { data: deals },
      { data: events },
      { data: reviews },
      { data: integrations },
      { data: healthRow },
      { data: campaigns },
    ] = await Promise.all([
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", activeClientId),
      supabase.from("calendar_events").select("calendar_status").eq("client_id", activeClientId),
      supabase.from("review_requests").select("rating, status, public_review_left").eq("client_id", activeClientId),
      supabase.from("client_integrations").select("integration_name, status").eq("client_id", activeClientId),
      supabase.from("client_health_scores").select("*").eq("client_id", activeClientId).maybeSingle(),
      supabase.from("ad_campaigns").select("spend, leads, roas, status").eq("client_id", activeClientId),
    ]);

    const d = deals || [];
    const e = events || [];
    const r = reviews || [];
    const c = campaigns || [];
    const intg = integrations || [];

    // Compute individual category scores
    const totalContacts = contactCount || 0;
    const openDeals = d.filter(x => x.status === "open");
    const wonDeals = d.filter(x => x.pipeline_stage === "closed_won");
    const completedAppts = e.filter(x => x.calendar_status === "completed").length;
    const totalAppts = e.length;
    const noShows = e.filter(x => x.calendar_status === "no_show").length;
    const ratedReviews = r.filter(x => x.rating);
    const avgRating = ratedReviews.length > 0 ? ratedReviews.reduce((s, x) => s + x.rating, 0) / ratedReviews.length : 0;
    const connectedIntg = intg.filter(i => i.status === "connected").length;

    // Website: based on integrations connected
    const websiteScore = Math.min(100, connectedIntg >= 3 ? 80 : connectedIntg >= 1 ? 60 : 30);
    // SEO: based on search console connection + content
    const seoConnected = intg.some(i => i.integration_name?.includes("Search Console") && i.status === "connected");
    const seoScore = seoConnected ? 75 : intg.some(i => i.integration_name?.includes("Search Console")) ? 45 : 25;
    // Lead Gen: contacts + deals
    const leadScore = Math.min(100, totalContacts >= 50 ? 90 : totalContacts >= 20 ? 70 : totalContacts >= 5 ? 50 : totalContacts > 0 ? 30 : 10);
    // Appointment Conversion
    const apptConvRate = totalAppts > 0 ? (completedAppts / totalAppts) * 100 : 0;
    const apptScore = Math.min(100, totalAppts === 0 ? 20 : apptConvRate >= 80 ? 90 : apptConvRate >= 60 ? 70 : apptConvRate >= 40 ? 50 : 30);
    // Review Reputation
    const reviewScore = avgRating >= 4.5 ? 90 : avgRating >= 4.0 ? 70 : avgRating >= 3.0 ? 50 : r.length > 0 ? 30 : 15;
    // CRM Health: pipeline + tasks
    const crmScore = Math.min(100, d.length >= 10 ? 85 : d.length >= 5 ? 70 : d.length > 0 ? 50 : totalContacts > 0 ? 35 : 10);
    // Customer Retention: repeat customers (won deals)
    const retentionScore = Math.min(100, wonDeals.length >= 10 ? 85 : wonDeals.length >= 5 ? 70 : wonDeals.length > 0 ? 50 : 20);
    // Revenue Growth
    const totalRevenue = wonDeals.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
    const revenueScore = Math.min(100, totalRevenue >= 50000 ? 90 : totalRevenue >= 20000 ? 75 : totalRevenue >= 5000 ? 55 : totalRevenue > 0 ? 35 : 10);

    const cats: CategoryScore[] = [
      { name: "Website Performance", score: websiteScore, status: statusFromScore(websiteScore), icon: Globe, detail: `${connectedIntg} integrations connected`, weight: 10 },
      { name: "SEO Visibility", score: seoScore, status: statusFromScore(seoScore), icon: Search, detail: seoConnected ? "Search Console connected" : "Search Console not connected", weight: 12 },
      { name: "Lead Generation", score: leadScore, status: statusFromScore(leadScore), icon: Users, detail: `${totalContacts} contacts in CRM`, weight: 18 },
      { name: "Appointment Conversion", score: apptScore, status: statusFromScore(apptScore), icon: Calendar, detail: `${completedAppts}/${totalAppts} completed (${apptConvRate.toFixed(0)}%)`, weight: 15 },
      { name: "Review Reputation", score: reviewScore, status: statusFromScore(reviewScore), icon: Star, detail: avgRating > 0 ? `${avgRating.toFixed(1)}★ avg · ${r.length} requests` : `${r.length} review requests`, weight: 12 },
      { name: "CRM Health", score: crmScore, status: statusFromScore(crmScore), icon: Heart, detail: `${d.length} deals · ${openDeals.length} open`, weight: 13 },
      { name: "Customer Retention", score: retentionScore, status: statusFromScore(retentionScore), icon: RefreshCw, detail: `${wonDeals.length} customers won`, weight: 10 },
      { name: "Revenue Growth", score: revenueScore, status: statusFromScore(revenueScore), icon: DollarSign, detail: `$${totalRevenue.toLocaleString()} total revenue`, weight: 10 },
    ];

    setCategories(cats);

    // Funnel data
    setFunnelData({
      traffic: simTraffic,
      leads: totalContacts,
      bookedAppts: totalAppts,
      completedAppts,
      customers: wonDeals.length,
      repeatCustomers: wonDeals.length > 3 ? Math.floor(wonDeals.length * 0.3) : 0,
      reviews: r.length,
      revenue: totalRevenue,
    });

    // Save to health scores table
    const overallScore = Math.round(cats.reduce((s, c) => s + c.score * (c.weight / 100), 0));
    await supabase.from("client_health_scores").upsert({
      client_id: activeClientId,
      overall_score: overallScore,
      website_score: websiteScore,
      seo_score: seoScore,
      leads_score: leadScore,
      reviews_score: reviewScore,
      social_score: 50,
      ads_score: c.length > 0 ? 70 : 20,
      automation_score: intg.length > 0 ? 60 : 20,
      conversion_score: apptScore,
    }, { onConflict: "client_id" });

    setLoading(false);
  };

  const overallScore = categories.length > 0
    ? Math.round(categories.reduce((s, c) => s + c.score * (c.weight / 100), 0))
    : 0;

  const healthyCount = categories.filter(c => c.status === "Strong").length;
  const issueCount = categories.filter(c => c.status !== "Strong").length;

  // Revenue simulator computation
  const simBaseRevenue = simTraffic * (simConvRate / 100) * 200;
  const simReviewMultiplier = simReviewRating >= 4.5 ? 1.15 : simReviewRating >= 4.0 ? 1.0 : 0.85;
  const simRetentionMultiplier = 1 + (simRetention / 100) * 0.3;
  const simProjectedRevenue = Math.round(simBaseRevenue * simReviewMultiplier * simRetentionMultiplier);

  // Funnel stages
  const funnelStages = funnelData ? [
    { label: "Traffic", value: funnelData.traffic, color: "hsl(211 96% 56%)" },
    { label: "Leads", value: funnelData.leads, color: "hsl(197 92% 58%)" },
    { label: "Booked Appts", value: funnelData.bookedAppts, color: "hsl(211 80% 65%)" },
    { label: "Completed Appts", value: funnelData.completedAppts, color: "hsl(152 60% 44%)" },
    { label: "Customers", value: funnelData.customers, color: "hsl(38 92% 50%)" },
    { label: "Repeat Customers", value: funnelData.repeatCustomers, color: "hsl(211 96% 46%)" },
    { label: "Reviews", value: funnelData.reviews, color: "hsl(197 92% 48%)" },
    { label: "Revenue", value: `$${funnelData.revenue.toLocaleString()}`, color: "hsl(152 60% 44%)" },
  ] : [];

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Business Health" description="Complete health overview of your business systems" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view Business Health.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Business Health" description="Complete health overview of your business systems">
        <Button variant="outline" size="sm" onClick={computeScores} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Scores
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Growth Score" value={`${overallScore}`} change="Weighted average" changeType={overallScore >= 60 ? "positive" : "neutral"} icon={Activity} />
        <MetricCard label="Categories Strong" value={`${healthyCount}/${categories.length}`} change="Performing well" changeType="positive" icon={Shield} />
        <MetricCard label="Issues Detected" value={`${issueCount}`} change="Need attention" changeType={issueCount > 3 ? "negative" : "neutral"} icon={AlertTriangle} />
        <MetricCard label="Growth Potential" value={`+${Math.max(0, 100 - overallScore)}%`} change="Room for improvement" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      {/* Overall Score Visual */}
      <DataCard title="Growth Score" className="mt-6">
        <div className="flex items-center justify-center py-6">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="hsla(211,96%,56%,.1)" strokeWidth="8" />
              <motion.circle cx="64" cy="64" r="56" fill="none" stroke={scoreColor(overallScore)} strokeWidth="8"
                strokeDasharray={`${overallScore * 3.52} ${352 - overallScore * 3.52}`}
                strokeDashoffset="88" strokeLinecap="round"
                initial={{ strokeDasharray: "0 352" }}
                animate={{ strokeDasharray: `${overallScore * 3.52} ${352 - overallScore * 3.52}` }}
                transition={{ duration: 1.2 }}
              />
            </svg>
            <div className="text-center">
              <span className="metric-value text-4xl">{overallScore}</span>
              <p className="text-xs text-muted-foreground mt-1">/ 100</p>
            </div>
          </div>
        </div>
      </DataCard>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {categories.map((cat, i) => (
          <motion.div key={cat.name} className="card-widget"
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <cat.icon className="h-4 w-4" style={{ color: scoreColor(cat.score) }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {statusIcon(cat.status)}
                    <span className="text-[10px] font-semibold" style={{ color: scoreColor(cat.score) }}>{cat.status}</span>
                  </div>
                </div>
              </div>
              <span className="metric-value text-2xl">{cat.score}</span>
            </div>
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
              <motion.div className="h-full rounded-full" style={{ background: scoreColor(cat.score) }}
                initial={{ width: 0 }} whileInView={{ width: `${cat.score}%` }}
                viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.04 }} />
            </div>
            <p className="text-xs text-muted-foreground">{cat.detail}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Weight: {cat.weight}%</p>
          </motion.div>
        ))}
      </div>

      {/* Business Health Funnel */}
      {funnelData && (
        <DataCard title="Business Health Map — Funnel" className="mt-6">
          <div className="space-y-2">
            {funnelStages.map((stage, i) => {
              const prevValue = i > 0 && typeof funnelStages[i - 1].value === "number" ? funnelStages[i - 1].value as number : null;
              const currValue = typeof stage.value === "number" ? stage.value : null;
              const convRate = prevValue && currValue && prevValue > 0 ? ((currValue / prevValue) * 100).toFixed(1) : null;
              const dropOff = prevValue && currValue && prevValue > 0 ? (((prevValue - currValue) / prevValue) * 100).toFixed(1) : null;
              const maxVal = Math.max(...funnelStages.filter(s => typeof s.value === "number").map(s => s.value as number), 1);
              const barWidth = currValue ? Math.max(8, (currValue / maxVal) * 100) : 50;

              return (
                <motion.div key={stage.label} className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <span className="text-[11px] font-medium text-muted-foreground w-28 shrink-0 text-right">{stage.label}</span>
                  <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: "hsla(211,96%,56%,.04)" }}>
                    <motion.div className="h-full rounded-lg flex items-center px-3"
                      style={{ background: `${stage.color}20`, borderLeft: `3px solid ${stage.color}` }}
                      initial={{ width: 0 }} whileInView={{ width: `${barWidth}%` }}
                      viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.06 }}>
                      <span className="text-xs font-bold" style={{ color: stage.color }}>
                        {typeof stage.value === "number" ? stage.value.toLocaleString() : stage.value}
                      </span>
                    </motion.div>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    {convRate && (
                      <span className="text-[10px] text-muted-foreground">
                        {convRate}% conv
                      </span>
                    )}
                    {dropOff && Number(dropOff) > 30 && (
                      <p className="text-[9px] font-semibold" style={{ color: "hsl(0 72% 51%)" }}>
                        ⚠ {dropOff}% drop
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </DataCard>
      )}

      {/* Revenue Simulator */}
      <DataCard title="Revenue Growth Simulator" className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Conversion Rate: {simConvRate}%
            </label>
            <Slider value={[simConvRate]} min={1} max={10} step={0.5}
              onValueChange={([v]) => setSimConvRate(v)} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Review Rating: {simReviewRating.toFixed(1)}★
            </label>
            <Slider value={[simReviewRating]} min={1} max={5} step={0.1}
              onValueChange={([v]) => setSimReviewRating(v)} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Monthly Traffic: {simTraffic.toLocaleString()}
            </label>
            <Slider value={[simTraffic]} min={500} max={50000} step={500}
              onValueChange={([v]) => setSimTraffic(v)} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Customer Retention: {simRetention}%
            </label>
            <Slider value={[simRetention]} min={10} max={90} step={5}
              onValueChange={([v]) => setSimRetention(v)} />
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "hsla(211,96%,56%,.04)", border: "1px solid hsla(211,96%,56%,.1)" }}>
          <Calculator className="h-8 w-8 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
          <div>
            <p className="text-xs text-muted-foreground">Projected Monthly Revenue</p>
            <p className="metric-value text-2xl">${simProjectedRevenue.toLocaleString()}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-muted-foreground">vs current baseline</p>
            <p className="text-sm font-bold" style={{ color: "hsl(152 60% 44%)" }}>
              {simProjectedRevenue > (funnelData?.revenue || 0) ? "+" : ""}
              ${(simProjectedRevenue - (funnelData?.revenue || 0)).toLocaleString()}
            </p>
          </div>
        </div>
      </DataCard>
    </div>
  );
}
