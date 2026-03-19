import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart, AlertTriangle, TrendingUp, DollarSign, Headphones, RefreshCw,
  Users, CheckCircle2, XCircle, Clock, ArrowRight, Shield, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "bg-destructive/10 text-destructive",
  High: "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-secondary text-muted-foreground",
};
const STATUS_COLOR: Record<string, string> = {
  Open: "bg-blue-50 text-blue-700",
  "In Progress": "bg-indigo-50 text-indigo-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Archived: "bg-secondary text-muted-foreground",
};
const RENEWAL_COLOR: Record<string, string> = {
  "Not Started": "bg-secondary text-muted-foreground",
  Upcoming: "bg-amber-50 text-amber-600",
  "In Review": "bg-blue-50 text-blue-700",
  Offered: "bg-indigo-50 text-indigo-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Declined: "bg-red-50 text-red-600",
  Completed: "bg-emerald-50 text-emerald-700",
};

export default function AdminClientSuccess() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [upsells, setUpsells] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, company_name, status, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("client_risk_records" as any).select("*").eq("status", "Open").order("detected_at", { ascending: false }).limit(20),
      supabase.from("renewal_records" as any).select("*").order("renewal_date", { ascending: true }).limit(20),
      supabase.from("upsell_opportunities" as any).select("*").eq("status", "Open").order("created_at", { ascending: false }).limit(20),
      supabase.from("support_tickets" as any).select("*").in("ticket_status", ["New", "Open", "In Progress", "Escalated"]).order("created_at", { ascending: false }).limit(20),
      supabase.from("client_health_records" as any).select("*").order("calculated_at", { ascending: false }).limit(50),
      supabase.from("client_success_milestones" as any).select("*").order("created_at", { ascending: false }).limit(100),
    ]).then(([c, r, rn, u, t, h, m]) => {
      setClients(c.data ?? []);
      setRisks(r.data ?? []);
      setRenewals(rn.data ?? []);
      setUpsells(u.data ?? []);
      setTickets(t.data ?? []);
      setHealthRecords(h.data ?? []);
      setMilestones(m.data ?? []);
    });
  }, []);

  const activeClients = clients.filter(c => c.status === "active").length;
  const avgHealth = healthRecords.length > 0
    ? Math.round(healthRecords.reduce((s, h) => s + (h.health_score_total || 0), 0) / healthRecords.length)
    : null;

  const completedMilestones = milestones.filter(m => m.milestone_status === "Completed").length;
  const totalMilestones = milestones.length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Client Success</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor health, risks, renewals, and upsell opportunities</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Active Clients", value: activeClients, icon: Users, color: "text-primary" },
          { label: "Avg Health", value: avgHealth ?? "—", icon: Heart, color: "text-emerald-600" },
          { label: "Open Risks", value: risks.length, icon: AlertTriangle, color: "text-destructive" },
          { label: "Open Tickets", value: tickets.length, icon: Headphones, color: "text-amber-600" },
          { label: "Renewals Due", value: renewals.length, icon: RefreshCw, color: "text-indigo-600" },
          { label: "Upsell Opps", value: upsells.length, icon: TrendingUp, color: "text-emerald-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4 text-center">
              <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="risks" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="risks">Churn Risks</TabsTrigger>
          <TabsTrigger value="tickets">Support</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="upsells">Upsells</TabsTrigger>
          <TabsTrigger value="adoption">Adoption</TabsTrigger>
        </TabsList>

        {/* RISKS */}
        <TabsContent value="risks" className="space-y-3">
          {risks.length === 0 ? (
            <Card className="border-border"><CardContent className="p-8 text-center">
              <Shield className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
              <p className="font-semibold text-foreground">No Open Risks</p>
              <p className="text-sm text-muted-foreground mt-1">All clients are in good standing. Risks will appear here when detected.</p>
            </CardContent></Card>
          ) : risks.map(r => (
            <Card key={r.id} className="border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={SEVERITY_COLOR[r.severity] || "bg-secondary"}>{r.severity}</Badge>
                    <Badge variant="outline">{r.risk_type?.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TICKETS */}
        <TabsContent value="tickets" className="space-y-3">
          {tickets.length === 0 ? (
            <Card className="border-border"><CardContent className="p-8 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
              <p className="font-semibold text-foreground">No Open Tickets</p>
              <p className="text-sm text-muted-foreground mt-1">Support tickets from clients will appear here.</p>
            </CardContent></Card>
          ) : tickets.map(t => (
            <Card key={t.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">{t.ticket_subject}</p>
                  <Badge className={STATUS_COLOR[t.ticket_status] || "bg-secondary"}>{t.ticket_status}</Badge>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{t.ticket_category}</Badge>
                  <Badge variant="outline">{t.ticket_priority}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* RENEWALS */}
        <TabsContent value="renewals" className="space-y-3">
          {renewals.length === 0 ? (
            <Card className="border-border"><CardContent className="p-8 text-center">
              <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold text-foreground">No Upcoming Renewals</p>
              <p className="text-sm text-muted-foreground mt-1">Contract renewals will appear here as they approach.</p>
            </CardContent></Card>
          ) : renewals.map(r => (
            <Card key={r.id} className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">Renewal #{r.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{r.renewal_date ? new Date(r.renewal_date).toLocaleDateString() : "No date set"}</p>
                </div>
                <Badge className={RENEWAL_COLOR[r.renewal_status] || "bg-secondary"}>{r.renewal_status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* UPSELLS */}
        <TabsContent value="upsells" className="space-y-3">
          {upsells.length === 0 ? (
            <Card className="border-border"><CardContent className="p-8 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold text-foreground">No Upsell Opportunities</p>
              <p className="text-sm text-muted-foreground mt-1">Smart upsell/cross-sell opportunities will surface here based on usage patterns.</p>
            </CardContent></Card>
          ) : upsells.map(u => (
            <Card key={u.id} className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{u.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.description}</p>
                  <Badge variant="outline" className="mt-1">{u.opportunity_type?.replace(/_/g, " ")}</Badge>
                </div>
                {u.estimated_value > 0 && (
                  <span className="text-sm font-bold text-emerald-600">${Number(u.estimated_value).toLocaleString()}/mo</span>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ADOPTION */}
        <TabsContent value="adoption" className="space-y-3">
          {totalMilestones === 0 ? (
            <Card className="border-border"><CardContent className="p-8 text-center">
              <Zap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold text-foreground">Adoption Tracking</p>
              <p className="text-sm text-muted-foreground mt-1">Client milestones like first booking, first review, and training completion will be tracked here.</p>
            </CardContent></Card>
          ) : (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Milestone Completion</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{completedMilestones} <span className="text-sm font-normal text-muted-foreground">/ {totalMilestones} milestones completed</span></p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
