import { useState } from "react";
import { DemoDataLabel } from "@/components/SetupBanner";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FileText, BarChart3, TrendingUp, Download, Calendar, Users, DollarSign,
  Target, Zap, ArrowDown, Mail, Clock, Sparkles, PieChart
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, AreaChart, Area
} from "recharts";

// Mock data
const leadsOverTime = [
  { month: "Oct", leads: 68 }, { month: "Nov", leads: 82 }, { month: "Dec", leads: 75 },
  { month: "Jan", leads: 98 }, { month: "Feb", leads: 112 }, { month: "Mar", leads: 142 },
];

const bookingsOverTime = [
  { month: "Oct", bookings: 18 }, { month: "Nov", bookings: 24 }, { month: "Dec", bookings: 20 },
  { month: "Jan", bookings: 28 }, { month: "Feb", bookings: 32 }, { month: "Mar", bookings: 38 },
];

const revenueGrowth = [
  { month: "Oct", revenue: 32400 }, { month: "Nov", revenue: 38200 }, { month: "Dec", revenue: 35100 },
  { month: "Jan", revenue: 44800 }, { month: "Feb", revenue: 51200 }, { month: "Mar", revenue: 58300 },
];

const revenueBySource = [
  { name: "Google Ads", value: 22400, color: "hsl(211, 96%, 56%)" },
  { name: "SEO", value: 19100, color: "hsl(197, 92%, 68%)" },
  { name: "Facebook Ads", value: 11200, color: "hsl(187, 70%, 58%)" },
  { name: "Referrals", value: 5600, color: "hsl(222, 68%, 44%)" },
];

const channelAttribution = [
  { channel: "Google Ads", revenue: "$22,400", leads: 64, bookings: 18, deals: 12 },
  { channel: "SEO", revenue: "$19,100", leads: 42, bookings: 14, deals: 9 },
  { channel: "Facebook Ads", revenue: "$11,200", leads: 24, bookings: 8, deals: 5 },
  { channel: "Referrals", revenue: "$5,600", leads: 12, bookings: 6, deals: 4 },
];

const funnelStages = [
  { stage: "Leads Created", value: 142, pct: 100 },
  { stage: "Appointments Booked", value: 38, pct: 26.8 },
  { stage: "Appointments Completed", value: 30, pct: 21.1 },
  { stage: "Deals Closed", value: 18, pct: 12.7 },
  { stage: "Revenue Earned", value: 58300, pct: 100, isCurrency: true },
];

const dealPipeline = [
  { stage: "Qualified", count: 24 },
  { stage: "Proposal", count: 16 },
  { stage: "Negotiation", count: 8 },
  { stage: "Closed Won", count: 18 },
  { stage: "Closed Lost", count: 4 },
];

const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(222, 30%, 12%)",
    border: "1px solid hsla(211,96%,60%,.2)",
    borderRadius: "12px",
    color: "white",
    fontSize: "12px",
  },
};

export default function Reports() {
  const [reportType, setReportType] = useState("monthly");
  const [scheduleWeekly, setScheduleWeekly] = useState(true);
  const [scheduleMonthly, setScheduleMonthly] = useState(true);
  const [scheduleQuarterly, setScheduleQuarterly] = useState(false);

  const aiSummary = reportType === "weekly"
    ? "Revenue increased 12% this week. Google Ads produced the highest ROI with 18 new bookings. Conversion rate improved after increasing appointment follow-ups."
    : reportType === "monthly"
    ? "Revenue increased 18% this month to $58,300. Google Ads remains your top-performing channel at $22,400 in attributed revenue. SEO traffic grew 24% and is now your second largest revenue source. Appointment completion rate improved to 78.9%."
    : "Q1 revenue reached $154,300, up 32% from Q4. Lead generation increased by 42% driven by Google Ads and SEO optimizations. Average deal size grew from $2,800 to $3,239.";

  return (
    <div>
      <PageHeader title="Reports" description="Automated performance reports and analytics">
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly Report</SelectItem>
              <SelectItem value="monthly">Monthly Report</SelectItem>
              <SelectItem value="quarterly">Quarterly Report</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> PDF</Button>
          <Button variant="outline" className="gap-1.5"><Mail className="h-4 w-4" /> Email</Button>
        </div>
      </PageHeader>

      {/* AI Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-widget mb-6"
        style={{
          background: "linear-gradient(135deg, hsla(211,96%,60%,.08), hsla(197,92%,68%,.04))",
          borderColor: "hsla(211,96%,60%,.15)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl shrink-0" style={{
            background: "linear-gradient(135deg, hsla(211,96%,60%,.15), hsla(197,92%,68%,.08))",
            boxShadow: "0 0 16px -4px hsla(211,96%,60%,.25)"
          }}>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">AI Report Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Leads Generated" value="142" change="+26.8% vs prior" changeType="positive" icon={Users} />
        <MetricCard label="Appts Booked" value="38" change="+18.7% vs prior" changeType="positive" icon={Calendar} />
        <MetricCard label="Appts Completed" value="30" change="78.9% show rate" changeType="positive" icon={Target} />
        <MetricCard label="Deals Closed" value="18" change="60% close rate" changeType="positive" icon={Zap} />
        <MetricCard label="Revenue Earned" value="$58,300" change="+18% vs prior" changeType="positive" icon={DollarSign} />
        <MetricCard label="Avg Deal Size" value="$3,239" change="+$439 vs prior" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Conversion Rate" value="12.7%" change="+2.1% vs prior" changeType="positive" icon={BarChart3} />
        <MetricCard label="Top Channel" value="Google Ads" change="$22,400 revenue" changeType="positive" icon={PieChart} />
      </WidgetGrid>

      {/* Tabs: Funnel / Marketing / Charts / Schedule */}
      <div className="mt-8">
        <Tabs defaultValue="funnel">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="funnel" className="rounded-md text-sm">Funnel</TabsTrigger>
            <TabsTrigger value="marketing" className="rounded-md text-sm">Marketing</TabsTrigger>
            <TabsTrigger value="charts" className="rounded-md text-sm">Charts</TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-md text-sm">Schedule</TabsTrigger>
          </TabsList>

          {/* FUNNEL TAB */}
          <TabsContent value="funnel" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <DataCard title="Conversion Funnel">
                <div className="space-y-0">
                  {funnelStages.map((s, i) => (
                    <div key={s.stage}>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm font-medium text-foreground">{s.stage}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {s.isCurrency ? `$${s.value.toLocaleString()}` : s.value}
                          </span>
                          {!s.isCurrency && i > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {((funnelStages[i].value / funnelStages[i - 1].value) * 100).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      {i < funnelStages.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </DataCard>

              <DataCard title="Deal Pipeline">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dealPipeline} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(215,20%,50%,.1)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} />
                    <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} />
                    <Tooltip {...chartTooltipStyle} />
                    <Bar dataKey="count" fill="hsl(211, 96%, 56%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DataCard>
            </div>
          </TabsContent>

          {/* MARKETING TAB */}
          <TabsContent value="marketing" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <DataCard title="Revenue by Channel">
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <RechartsPie>
                      <Pie
                        data={revenueBySource}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={55}
                        dataKey="value"
                        stroke="none"
                        paddingAngle={3}
                      >
                        {revenueBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...chartTooltipStyle} formatter={(value: number) => `$${value.toLocaleString()}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {revenueBySource.map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="ml-auto font-semibold tabular-nums">${(s.value / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </DataCard>

              <DataCard title="Channel Attribution">
                <div className="space-y-0">
                  <div className="grid grid-cols-5 gap-2 pb-2 border-b border-border">
                    {["Channel", "Revenue", "Leads", "Bookings", "Deals"].map((h) => (
                      <span key={h} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{h}</span>
                    ))}
                  </div>
                  {channelAttribution.map((c) => (
                    <div key={c.channel} className="grid grid-cols-5 gap-2 py-2.5 border-b border-border/50 last:border-0">
                      <span className="text-sm font-medium text-foreground">{c.channel}</span>
                      <span className="text-sm tabular-nums font-semibold text-foreground">{c.revenue}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{c.leads}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{c.bookings}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{c.deals}</span>
                    </div>
                  ))}
                </div>
              </DataCard>
            </div>
          </TabsContent>

          {/* CHARTS TAB */}
          <TabsContent value="charts" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <DataCard title="Leads Over Time">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={leadsOverTime}>
                    <defs>
                      <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(211, 96%, 56%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(211, 96%, 56%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(215,20%,50%,.1)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} />
                    <Tooltip {...chartTooltipStyle} />
                    <Area type="monotone" dataKey="leads" stroke="hsl(211, 96%, 56%)" fill="url(#leadsFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </DataCard>

              <DataCard title="Bookings Over Time">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={bookingsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(215,20%,50%,.1)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} />
                    <Tooltip {...chartTooltipStyle} />
                    <Bar dataKey="bookings" fill="hsl(197, 92%, 68%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DataCard>

              <DataCard title="Revenue Growth">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueGrowth}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(187, 70%, 58%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(187, 70%, 58%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(215,20%,50%,.1)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip {...chartTooltipStyle} formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(187, 70%, 58%)" fill="url(#revFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </DataCard>

              <DataCard title="Revenue by Source">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueBySource}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(215,20%,50%,.1)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215,16%,50%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215,16%,50%)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip {...chartTooltipStyle} formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {revenueBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </DataCard>
            </div>
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="mt-4">
            <DataCard title="Automated Report Schedule">
              <div className="space-y-4">
                {[
                  { label: "Weekly Performance Report", desc: "Sent every Monday at 8:00 AM", value: scheduleWeekly, setter: setScheduleWeekly },
                  { label: "Monthly Performance Report", desc: "Sent on the 1st of each month", value: scheduleMonthly, setter: setScheduleMonthly },
                  { label: "Quarterly Performance Report", desc: "Sent at the start of each quarter", value: scheduleQuarterly, setter: setScheduleQuarterly },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: "hsla(211,96%,60%,.08)" }}>
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={s.value ? "default" : "secondary"} className="text-[10px]">
                        {s.value ? "Active" : "Off"}
                      </Badge>
                      <Switch checked={s.value} onCheckedChange={s.setter} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl" style={{ background: "hsla(211,96%,60%,.05)", border: "1px solid hsla(211,96%,60%,.1)" }}>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Reports are delivered via email to the client workspace owner and any additional recipients configured in settings.
                  </span>
                </div>
              </div>
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
