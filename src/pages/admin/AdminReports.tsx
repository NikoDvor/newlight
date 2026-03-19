import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, TrendingUp, DollarSign, Users, Download, BarChart3, Crown,
  Calendar, Star, CreditCard, GraduationCap, Target, Zap, AlertTriangle,
  CheckCircle2, Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
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

const StatCard = ({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) => (
  <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/30 mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="py-12 text-center">
    <BarChart3 className="h-8 w-8 mx-auto mb-3 text-white/20" />
    <p className="text-sm text-white/40">{message}</p>
    <p className="text-xs text-white/25 mt-1">Data will populate as the platform is used</p>
  </div>
);

export default function AdminReports() {
  const [period, setPeriod] = useState("monthly");
  const [sales, setSales] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [reviews, setReviews] = useState<any>(null);

  useEffect(() => {
    // Sales data
    Promise.all([
      supabase.from("crm_contacts").select("id, lead_source", { count: "exact" }),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status, assigned_user_id"),
      supabase.from("proposals").select("id, status"),
      supabase.from("calendar_events").select("id, calendar_status, calendar_id"),
    ]).then(([contacts, deals, proposals, events]) => {
      const d = deals.data || [];
      const p = proposals.data || [];
      const e = events.data || [];
      const closedWon = d.filter((x: any) => x.pipeline_stage === "closed_won");
      const closedLost = d.filter((x: any) => x.pipeline_stage === "closed_lost");
      const qualified = d.filter((x: any) => x.pipeline_stage === "qualified");
      const sent = p.filter((x: any) => ["sent", "viewed", "accepted", "rejected"].includes(x.status));
      const accepted = p.filter((x: any) => x.status === "accepted");
      const completed = e.filter((x: any) => x.calendar_status === "completed");
      const noShows = e.filter((x: any) => x.calendar_status === "no_show");
      const cancelled = e.filter((x: any) => x.calendar_status === "cancelled");
      const totalRevenue = closedWon.reduce((s: number, x: any) => s + (Number(x.deal_value) || 0), 0);
      const avgDeal = closedWon.length > 0 ? totalRevenue / closedWon.length : 0;

      // Lead sources
      const sources: Record<string, number> = {};
      (contacts.data || []).forEach((c: any) => {
        const src = c.lead_source || "Unknown";
        sources[src] = (sources[src] || 0) + 1;
      });
      const sourceData = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      // Pipeline stages for chart
      const stageMap: Record<string, number> = {};
      d.forEach((x: any) => {
        const stage = (x.pipeline_stage || "unknown").replace(/_/g, " ");
        stageMap[stage] = (stageMap[stage] || 0) + 1;
      });
      const stageData = Object.entries(stageMap).map(([name, count]) => ({ name, count }));

      setSales({
        totalLeads: contacts.count || 0,
        meetingsBooked: e.length,
        meetingsCompleted: completed.length,
        qualificationRate: e.length > 0 ? Math.round((qualified.length / Math.max(contacts.count || 1, 1)) * 100) : 0,
        proposalsGenerated: p.length,
        proposalsSent: sent.length,
        acceptanceRate: sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0,
        closedWon: closedWon.length,
        closedLost: closedLost.length,
        totalRevenue,
        avgDeal: Math.round(avgDeal),
        noShows: noShows.length,
        cancelled: cancelled.length,
        sourceData,
        stageData,
      });

      setBooking({
        total: e.length,
        completed: completed.length,
        noShows: noShows.length,
        cancelled: cancelled.length,
        completionRate: e.length > 0 ? Math.round((completed.length / e.length) * 100) : 0,
        cancellationRate: e.length > 0 ? Math.round((cancelled.length / e.length) * 100) : 0,
        noShowRate: e.length > 0 ? Math.round((noShows.length / e.length) * 100) : 0,
      });
    });

    // Billing data
    Promise.all([
      supabase.from("subscriptions" as any).select("status, monthly_amount, setup_fee"),
      supabase.from("invoices" as any).select("status, total_amount"),
      supabase.from("billing_accounts").select("billing_status"),
    ]).then(([subs, invoices, accounts]) => {
      const s = (subs.data || []) as any[];
      const inv = (invoices.data || []) as any[];
      const accts = accounts.data || [];
      const active = s.filter((x: any) => x.status === "active");
      const mrr = active.reduce((sum: number, x: any) => sum + (Number(x.monthly_amount) || 0), 0);
      const setupFees = s.reduce((sum: number, x: any) => sum + (Number(x.setup_fee) || 0), 0);
      const paid = inv.filter((x: any) => x.status === "paid");
      const pastDue = inv.filter((x: any) => x.status === "past_due" || x.status === "overdue");
      const failed = inv.filter((x: any) => x.status === "failed");

      setBilling({
        mrr,
        setupFees,
        invoicesIssued: inv.length,
        invoicesPaid: paid.length,
        pastDue: pastDue.length,
        failed: failed.length,
        activeSubs: active.length,
        totalSubs: s.length,
        delinquent: accts.filter((a: any) => a.billing_status === "past_due").length,
        totalRevenue: paid.reduce((sum: number, x: any) => sum + (Number(x.total_amount) || 0), 0),
      });
    });

    // Reviews data
    supabase.from("review_requests").select("rating, status, recovery_needed, public_review_left").then(({ data }) => {
      const r = (data || []) as any[];
      const rated = r.filter((x: any) => x.rating);
      const avgRating = rated.length > 0 ? rated.reduce((s: number, x: any) => s + x.rating, 0) / rated.length : 0;
      const positive = rated.filter((x: any) => x.rating >= 4).length;
      const negative = rated.filter((x: any) => x.rating < 4).length;
      const recovery = r.filter((x: any) => x.recovery_needed).length;

      setReviews({
        total: r.length,
        avgRating: avgRating.toFixed(1),
        positive,
        negative,
        responseRate: r.length > 0 ? Math.round((rated.length / r.length) * 100) : 0,
        recoveryOpen: recovery,
        publicReviews: r.filter((x: any) => x.public_review_left).length,
      });
    });
  }, []);

  const pieColors = ["hsl(211,96%,56%)", "hsl(197,92%,68%)", "hsl(187,70%,58%)", "hsl(222,68%,44%)", "hsl(152,60%,44%)", "hsl(38,92%,50%)"];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-sm text-white/50 mt-1">Cross-platform performance reporting</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-white/[0.06] border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="bg-white/[0.06] border border-white/10 h-10 rounded-lg">
          <TabsTrigger value="sales" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-md text-xs">Sales</TabsTrigger>
          <TabsTrigger value="booking" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-md text-xs">Bookings</TabsTrigger>
          <TabsTrigger value="reviews" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-md text-xs">Reviews</TabsTrigger>
          <TabsTrigger value="billing" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-md text-xs">Billing</TabsTrigger>
          <TabsTrigger value="team" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 rounded-md text-xs">Team</TabsTrigger>
        </TabsList>

        {/* SALES TAB */}
        <TabsContent value="sales" className="space-y-6">
          {sales ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard label="Total Leads" value={String(sales.totalLeads)} icon={Users} color="hsl(var(--nl-sky))" />
                <StatCard label="Meetings Booked" value={String(sales.meetingsBooked)} icon={Calendar} color="hsl(var(--nl-cyan))" />
                <StatCard label="Proposals Sent" value={String(sales.proposalsSent)} icon={FileText} color="hsl(var(--nl-electric))" />
                <StatCard label="Acceptance Rate" value={`${sales.acceptanceRate}%`} icon={CheckCircle2} color="hsl(var(--nl-neon))" />
                <StatCard label="Closed Won" value={String(sales.closedWon)} icon={Crown} color="hsl(var(--nl-sky))" />
                <StatCard label="Avg Deal Size" value={`$${sales.avgDeal.toLocaleString()}`} icon={DollarSign} color="hsl(var(--nl-neon))" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-white/80">Leads by Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sales.sourceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={sales.sourceData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,60%,.06)" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: "hsla(0,0%,100%,.4)" }} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "hsla(0,0%,100%,.4)" }} />
                          <Tooltip {...chartTooltip} />
                          <Bar dataKey="count" fill="hsl(211, 96%, 56%)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState message="Lead source data will appear as contacts are added" />}
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-white/80">Pipeline Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sales.stageData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <RechartsPie>
                          <Pie data={sales.stageData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="count" stroke="none" paddingAngle={3}>
                            {sales.stageData.map((_: any, i: number) => (
                              <Cell key={i} fill={pieColors[i % pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip {...chartTooltip} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : <EmptyState message="Pipeline data will appear as deals are created" />}
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {sales.stageData.map((s: any, i: number) => (
                        <div key={s.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: pieColors[i % pieColors.length] }} />
                          <span className="text-white/50 capitalize truncate">{s.name}</span>
                          <span className="ml-auto text-white/70 font-semibold">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : <EmptyState message="Loading sales data..." />}
        </TabsContent>

        {/* BOOKING TAB */}
        <TabsContent value="booking" className="space-y-6">
          {booking ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Bookings" value={String(booking.total)} icon={Calendar} color="hsl(var(--nl-sky))" />
              <StatCard label="Completed" value={String(booking.completed)} icon={CheckCircle2} color="hsl(var(--nl-neon))" sub={`${booking.completionRate}% rate`} />
              <StatCard label="No Shows" value={String(booking.noShows)} icon={AlertTriangle} color={booking.noShows > 0 ? "hsl(38 92% 50%)" : "hsl(var(--nl-sky))"} sub={`${booking.noShowRate}% rate`} />
              <StatCard label="Cancelled" value={String(booking.cancelled)} icon={Activity} color="hsl(var(--nl-cyan))" sub={`${booking.cancellationRate}% rate`} />
            </div>
          ) : <EmptyState message="Loading booking data..." />}
        </TabsContent>

        {/* REVIEWS TAB */}
        <TabsContent value="reviews" className="space-y-6">
          {reviews ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Avg Rating" value={`${reviews.avgRating}★`} icon={Star} color="hsl(var(--nl-neon))" />
              <StatCard label="Reviews Collected" value={String(reviews.total)} icon={FileText} color="hsl(var(--nl-sky))" />
              <StatCard label="Response Rate" value={`${reviews.responseRate}%`} icon={Target} color="hsl(var(--nl-electric))" />
              <StatCard label="Positive / Negative" value={`${reviews.positive} / ${reviews.negative}`} icon={TrendingUp} color="hsl(var(--nl-cyan))" />
              <StatCard label="Recovery Open" value={String(reviews.recoveryOpen)} icon={AlertTriangle} color={reviews.recoveryOpen > 0 ? "hsl(0 72% 51%)" : "hsl(var(--nl-sky))"} />
              <StatCard label="Public Reviews" value={String(reviews.publicReviews)} icon={CheckCircle2} color="hsl(var(--nl-neon))" />
            </div>
          ) : <EmptyState message="Loading review data..." />}
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="space-y-6">
          {billing ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="MRR" value={billing.mrr > 0 ? `$${(billing.mrr / 1000).toFixed(1)}K` : "$0"} icon={DollarSign} color="hsl(var(--nl-neon))" />
              <StatCard label="Setup Fees" value={`$${billing.setupFees.toLocaleString()}`} icon={CreditCard} color="hsl(var(--nl-sky))" />
              <StatCard label="Invoices Issued" value={String(billing.invoicesIssued)} icon={FileText} color="hsl(var(--nl-electric))" />
              <StatCard label="Invoices Paid" value={String(billing.invoicesPaid)} icon={CheckCircle2} color="hsl(var(--nl-cyan))" />
              <StatCard label="Past Due" value={String(billing.pastDue)} icon={AlertTriangle} color={billing.pastDue > 0 ? "hsl(38 92% 50%)" : "hsl(var(--nl-sky))"} />
              <StatCard label="Failed Payments" value={String(billing.failed)} icon={AlertTriangle} color={billing.failed > 0 ? "hsl(0 72% 51%)" : "hsl(var(--nl-sky))"} />
              <StatCard label="Active Subs" value={String(billing.activeSubs)} icon={Zap} color="hsl(var(--nl-neon))" />
              <StatCard label="Revenue Collected" value={`$${billing.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="hsl(var(--nl-sky))" />
            </div>
          ) : <EmptyState message="Loading billing data..." />}
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team" className="space-y-6">
          <TeamReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamReportTab() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("workspace_users").select("id, status", { count: "exact" }),
      supabase.from("training_enrollments" as any).select("status"),
      supabase.from("meeting_intelligence" as any).select("id", { count: "exact", head: true }),
    ]).then(([users, training, meetings]) => {
      const u = users.data || [];
      const t = (training.data || []) as any[];
      setData({
        total: users.count || 0,
        active: u.filter((x: any) => x.status === "active").length,
        trainingAssigned: t.length,
        trainingComplete: t.filter((x: any) => x.status === "completed").length,
        meetingIntel: meetings.count || 0,
      });
    });
  }, []);

  if (!data) return <div className="py-12 text-center"><p className="text-sm text-white/40">Loading team data...</p></div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Team Members" value={String(data.total)} icon={Users} color="hsl(var(--nl-sky))" />
      <StatCard label="Active Users" value={String(data.active)} icon={CheckCircle2} color="hsl(var(--nl-neon))" />
      <StatCard label="Training Assigned" value={String(data.trainingAssigned)} icon={GraduationCap} color="hsl(var(--nl-electric))" />
      <StatCard label="Training Complete" value={String(data.trainingComplete)} icon={Target} color="hsl(var(--nl-cyan))"
        sub={data.trainingAssigned > 0 ? `${Math.round((data.trainingComplete / data.trainingAssigned) * 100)}% rate` : undefined} />
    </div>
  );
}
