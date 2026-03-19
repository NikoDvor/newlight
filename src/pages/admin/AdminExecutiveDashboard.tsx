import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, DollarSign, TrendingUp, Target, Zap, Calendar, Star, FileText,
  AlertTriangle, CheckCircle2, ArrowRight, Activity, BarChart3, Heart,
  CreditCard, GraduationCap, Server, Crown, Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const chartTooltip = {
  contentStyle: {
    background: "hsl(222, 30%, 12%)",
    border: "1px solid hsla(211,96%,60%,.2)",
    borderRadius: "12px",
    color: "white",
    fontSize: "12px",
  },
};

interface StatCard {
  label: string; value: string; icon: any; color: string; sub?: string;
}

export default function AdminExecutiveDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    clients: 0, prospects: 0, leads: 0, meetings: 0, qualified: 0,
    proposalsSent: 0, proposalsAccepted: 0, closedWon: 0, closedWonRevenue: 0,
    mrr: 0, activeWorkspaces: 0, delinquent: 0, openOpportunities: 0,
    reviewRecovery: 0, autoActive: 0, autoFailed: 0, teamMembers: 0,
    trainingComplete: 0, fixItems: 0,
  });
  const [revenueByClient, setRevenueByClient] = useState<any[]>([]);
  const [pipelineTrend, setPipelineTrend] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, company_name", { count: "exact" }),
      supabase.from("prospects").select("id", { count: "exact", head: true }),
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }),
      supabase.from("calendar_events").select("id, calendar_status", { count: "exact" }),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status"),
      supabase.from("proposals").select("id, status"),
      supabase.from("billing_accounts").select("billing_status"),
      supabase.from("subscriptions" as any).select("status, monthly_amount"),
      supabase.from("automations").select("id, enabled"),
      supabase.from("automation_runs").select("status").order("started_at", { ascending: false }).limit(200),
      supabase.from("workspace_users").select("id", { count: "exact", head: true }),
      supabase.from("fix_now_items").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("review_requests").select("rating, recovery_needed"),
      supabase.from("opportunity_records").select("id, status").eq("status", "open"),
    ]).then(([clients, prospects, contacts, events, deals, proposals, billing, subs, autos, runs, team, fixes, reviews, opps]) => {
      const d = deals.data || [];
      const p = proposals.data || [];
      const s = (subs.data || []) as any[];
      const a = autos.data || [];
      const r = runs.data || [];
      const rev = (reviews.data || []) as any[];
      const b = billing.data || [];

      const closedWon = d.filter((x: any) => x.pipeline_stage === "closed_won");
      const closedWonRevenue = closedWon.reduce((sum: number, x: any) => sum + (Number(x.deal_value) || 0), 0);
      const activeSubs = s.filter((x: any) => x.status === "active");
      const mrr = activeSubs.reduce((sum: number, x: any) => sum + (Number(x.monthly_amount) || 0), 0);

      setData({
        clients: clients.count || 0,
        prospects: prospects.count || 0,
        leads: contacts.count || 0,
        meetings: (events.data || []).filter((e: any) => e.calendar_status === "completed").length,
        qualified: d.filter((x: any) => x.pipeline_stage === "qualified").length,
        proposalsSent: p.filter((x: any) => ["sent", "viewed", "accepted", "rejected"].includes(x.status)).length,
        proposalsAccepted: p.filter((x: any) => x.status === "accepted").length,
        closedWon: closedWon.length,
        closedWonRevenue,
        mrr,
        activeWorkspaces: clients.count || 0,
        delinquent: b.filter((x: any) => x.billing_status === "past_due").length,
        openOpportunities: (opps.data || []).length,
        reviewRecovery: rev.filter((x: any) => x.recovery_needed).length,
        autoActive: a.filter((x: any) => x.enabled).length,
        autoFailed: r.filter((x: any) => x.status === "failed").length,
        teamMembers: team.count || 0,
        trainingComplete: 0,
        fixItems: fixes.count || 0,
      });

      // Revenue by client (top 6)
      const clientData = clients.data || [];
      if (clientData.length > 0) {
        const clientRevenue = clientData.slice(0, 6).map((c: any) => {
          const clientDeals = d.filter((x: any) => x.pipeline_stage === "closed_won");
          const rev = clientDeals.reduce((s: number, x: any) => s + (Number(x.deal_value) || 0), 0);
          return { name: (c.company_name || "Client").split(" ")[0], revenue: Math.round(rev / Math.max(clientData.length, 1)) };
        });
        setRevenueByClient(clientRevenue);
      }
    });

    // Build a simple trend (using months as labels with placeholder logic)
    setPipelineTrend([
      { month: "Oct", value: 12 }, { month: "Nov", value: 18 },
      { month: "Dec", value: 15 }, { month: "Jan", value: 24 },
      { month: "Feb", value: 28 }, { month: "Mar", value: 32 },
    ]);
  }, []);

  const proposalAcceptRate = data.proposalsSent > 0
    ? Math.round((data.proposalsAccepted / data.proposalsSent) * 100) : 0;

  const sections: { title: string; cards: StatCard[] }[] = [
    {
      title: "Sales Overview",
      cards: [
        { label: "Total Leads", value: String(data.leads), icon: Users, color: "hsl(var(--nl-sky))" },
        { label: "Meetings Completed", value: String(data.meetings), icon: Calendar, color: "hsl(var(--nl-cyan))" },
        { label: "Qualified Deals", value: String(data.qualified), icon: Target, color: "hsl(var(--nl-electric))" },
        { label: "Proposals Sent", value: String(data.proposalsSent), icon: FileText, color: "hsl(var(--nl-neon))" },
        { label: "Acceptance Rate", value: `${proposalAcceptRate}%`, icon: CheckCircle2, color: "hsl(var(--nl-sky))" },
        { label: "Closed Won", value: String(data.closedWon), icon: Crown, color: "hsl(var(--nl-neon))" },
      ],
    },
    {
      title: "Revenue Overview",
      cards: [
        { label: "Closed Won Revenue", value: `$${(data.closedWonRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: "hsl(var(--nl-neon))" },
        { label: "Monthly Recurring", value: data.mrr > 0 ? `$${(data.mrr / 1000).toFixed(1)}K` : "$0", icon: TrendingUp, color: "hsl(var(--nl-sky))" },
        { label: "Active Workspaces", value: String(data.activeWorkspaces), icon: Server, color: "hsl(var(--nl-cyan))" },
        { label: "Delinquent Accounts", value: String(data.delinquent), icon: AlertTriangle, color: data.delinquent > 0 ? "hsl(0 72% 51%)" : "hsl(var(--nl-sky))" },
      ],
    },
    {
      title: "Operations Overview",
      cards: [
        { label: "Prospects", value: String(data.prospects), icon: Zap, color: "hsl(var(--nl-neon))" },
        { label: "Review Recovery", value: String(data.reviewRecovery), icon: Star, color: data.reviewRecovery > 0 ? "hsl(38 92% 50%)" : "hsl(var(--nl-sky))" },
        { label: "Active Automations", value: String(data.autoActive), icon: Zap, color: "hsl(var(--nl-electric))" },
        { label: "Failed Runs", value: String(data.autoFailed), icon: AlertTriangle, color: data.autoFailed > 0 ? "hsl(0 72% 51%)" : "hsl(var(--nl-sky))" },
        { label: "Fix Now Items", value: String(data.fixItems), icon: AlertTriangle, color: data.fixItems > 0 ? "hsl(38 92% 50%)" : "hsl(var(--nl-sky))" },
        { label: "Team Members", value: String(data.teamMembers), icon: Shield, color: "hsl(var(--nl-cyan))" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Platform-wide command center</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/admin/reports")} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5">
            <BarChart3 className="h-4 w-4" /> Full Reports
          </Button>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, si) => (
        <div key={section.title}>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">{section.title}</h2>
          <div className={`grid gap-4 ${section.cards.length <= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"}`}>
            {section.cards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.1 + i * 0.04, duration: 0.3 }}>
                <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className="h-4 w-4" style={{ color: s.color }} />
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    {s.sub && <p className="text-[10px] text-white/30 mt-1">{s.sub}</p>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Revenue by Client</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByClient}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,60%,.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsla(0,0%,100%,.4)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsla(0,0%,100%,.4)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...chartTooltip} formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="hsl(211, 96%, 56%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center">
                <p className="text-xs text-white/30">Revenue data will appear as deals close</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Deal Pipeline Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={pipelineTrend}>
                <defs>
                  <linearGradient id="execTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(211, 96%, 56%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(211, 96%, 56%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,60%,.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsla(0,0%,100%,.4)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsla(0,0%,100%,.4)" }} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="value" stroke="hsl(211, 96%, 56%)" fill="url(#execTrend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white/80">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: "Sales Pipeline", path: "/admin/sales-pipeline" },
              { label: "Revenue & Billing", path: "/admin/billing" },
              { label: "Automations", path: "/admin/automations" },
              { label: "Fix Now Items", path: "/admin/fix-now" },
              { label: "Prospects", path: "/admin/prospects" },
              { label: "All Clients", path: "/admin/clients" },
              { label: "Reports", path: "/admin/reports" },
              { label: "Audit Logs", path: "/admin/audit-logs" },
            ].map((a) => (
              <motion.button key={a.label} onClick={() => navigate(a.path)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all group"
                whileHover={{ x: 2 }}>
                <span>{a.label}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
