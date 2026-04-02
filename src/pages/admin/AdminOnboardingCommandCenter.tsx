import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, Send, UserCheck, AlertTriangle, Wrench, CheckCircle2,
  Clock, ExternalLink, Search, Users, ShieldAlert, Rocket, Copy, RotateCcw
} from "lucide-react";
import { toast } from "sonner";

interface ClientRow {
  id: string;
  business_name: string;
  business_type: string | null;
  proposal_status: string | null;
  agreement_status: string | null;
  payment_status: string | null;
  implementation_status: string | null;
  portal_access_enabled: boolean;
  portal_invite_status: string | null;
  portal_last_login_at: string | null;
  status: string;
  workspace_slug: string | null;
  owner_email: string | null;
  // computed
  setup_total: number;
  setup_completed: number;
  setup_action_needed: number;
  setup_overdue: number;
  team_pending: number;
  impl_total: number;
  impl_done: number;
  impl_blocked: number;
  profile_name: string | null;
  next_due: string | null;
}

type Bucket =
  | "awaiting_payment"
  | "portal_not_sent"
  | "invite_no_login"
  | "client_action"
  | "team_pending"
  | "ready_impl"
  | "impl_blocked"
  | "ready_complete"
  | "all";

const BUCKET_CONFIG: { key: Bucket; label: string; icon: any; color: string }[] = [
  { key: "awaiting_payment", label: "Awaiting Payment", icon: DollarSign, color: "text-amber-400" },
  { key: "portal_not_sent", label: "Portal Not Sent", icon: Send, color: "text-orange-400" },
  { key: "invite_no_login", label: "Invited / No Login", icon: Clock, color: "text-blue-400" },
  { key: "client_action", label: "Client Action Needed", icon: AlertTriangle, color: "text-red-400" },
  { key: "team_pending", label: "Team Access Pending", icon: Users, color: "text-purple-400" },
  { key: "ready_impl", label: "Ready for Implementation", icon: Wrench, color: "text-emerald-400" },
  { key: "impl_blocked", label: "Implementation Blocked", icon: ShieldAlert, color: "text-red-500" },
  { key: "ready_complete", label: "Ready to Complete", icon: CheckCircle2, color: "text-green-400" },
];

function classifyClient(c: ClientRow): Bucket[] {
  const buckets: Bucket[] = [];
  if (c.payment_status !== "paid") buckets.push("awaiting_payment");
  if (!c.portal_access_enabled || c.portal_invite_status === "not_sent") buckets.push("portal_not_sent");
  if (c.portal_invite_status === "sent" && !c.portal_last_login_at) buckets.push("invite_no_login");
  if (c.setup_action_needed > 0 || c.setup_overdue > 0) buckets.push("client_action");
  if (c.team_pending > 0) buckets.push("team_pending");
  if (c.payment_status === "paid" && c.implementation_status !== "complete" && c.impl_blocked === 0 && c.setup_completed >= c.setup_total * 0.5)
    buckets.push("ready_impl");
  if (c.implementation_status === "waiting_on_client" || c.impl_blocked > 0) buckets.push("impl_blocked");
  if (c.impl_total > 0 && c.impl_done >= c.impl_total * 0.9) buckets.push("ready_complete");
  return buckets;
}

function statusBadge(status: string | null, type: "proposal" | "agreement" | "payment" | "implementation") {
  if (!status) return <Badge variant="outline" className="text-[10px]">—</Badge>;
  const colorMap: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    signed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    complete: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    viewed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    unpaid: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    not_sent: "bg-white/10 text-white/50 border-white/20",
    not_started: "bg-white/10 text-white/50 border-white/20",
    draft: "bg-white/10 text-white/50 border-white/20",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    declined: "bg-red-500/20 text-red-300 border-red-500/30",
    waiting_on_client: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colorMap[status] || "bg-white/10 text-white/50"}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function AdminOnboardingCommandCenter() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeBucket, setActiveBucket] = useState<Bucket>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // Fetch clients
    const { data: rawClients } = await supabase
      .from("clients")
      .select("id, business_name, business_type, proposal_status, agreement_status, payment_status, implementation_status, portal_access_enabled, portal_invite_status, portal_last_login_at, status, workspace_slug, owner_email")
      .neq("status", "archived");

    if (!rawClients) { setLoading(false); return; }

    // Fetch setup items counts per client
    const { data: setupItems } = await supabase
      .from("client_setup_items" as any)
      .select("client_id, item_status");

    // Fetch implementation tasks per client
    const { data: implTasks } = await supabase
      .from("implementation_tasks")
      .select("client_id, task_status, blocked_by, due_date");

    // Fetch workspace users pending provisioning
    const { data: wsUsers } = await supabase
      .from("workspace_users")
      .select("client_id, provisioning_status");

    // Fetch workspace profiles
    const { data: profiles } = await supabase
      .from("workspace_profiles" as any)
      .select("client_id, applied_profile");

    const setupMap = new Map<string, { total: number; completed: number; action: number; overdue: number }>();
    ((setupItems || []) as any[]).forEach((si: any) => {
      const e = setupMap.get(si.client_id) || { total: 0, completed: 0, action: 0, overdue: 0 };
      e.total++;
      if (si.item_status === "completed") e.completed++;
      if (["requested", "reminded", "revision_needed", "blocked"].includes(si.item_status)) e.action++;
      if (si.item_status === "overdue") e.overdue++;
      setupMap.set(si.client_id, e);
    });

    const implMap = new Map<string, { total: number; done: number; blocked: number; nextDue: string | null }>();
    ((implTasks || []) as any[]).forEach((t: any) => {
      const e = implMap.get(t.client_id) || { total: 0, done: 0, blocked: 0, nextDue: null };
      e.total++;
      if (t.task_status === "done") e.done++;
      if (t.blocked_by) e.blocked++;
      if (t.due_date && t.task_status !== "done") {
        if (!e.nextDue || t.due_date < e.nextDue) e.nextDue = t.due_date;
      }
      implMap.set(t.client_id, e);
    });

    const teamMap = new Map<string, number>();
    ((wsUsers || []) as any[]).forEach((u: any) => {
      if (u.provisioning_status && !["active", "deferred"].includes(u.provisioning_status)) {
        teamMap.set(u.client_id, (teamMap.get(u.client_id) || 0) + 1);
      }
    });

    const profileMap = new Map<string, string>();
    ((profiles || []) as any[]).forEach((p: any) => {
      profileMap.set(p.client_id, p.applied_profile);
    });

    const enriched: ClientRow[] = rawClients.map((c: any) => {
      const s = setupMap.get(c.id) || { total: 0, completed: 0, action: 0, overdue: 0 };
      const im = implMap.get(c.id) || { total: 0, done: 0, blocked: 0, nextDue: null };
      return {
        ...c,
        setup_total: s.total,
        setup_completed: s.completed,
        setup_action_needed: s.action,
        setup_overdue: s.overdue,
        team_pending: teamMap.get(c.id) || 0,
        impl_total: im.total,
        impl_done: im.done,
        impl_blocked: im.blocked,
        profile_name: profileMap.get(c.id) || c.business_type || null,
        next_due: im.nextDue,
      };
    });

    setClients(enriched);
    setLoading(false);
  }

  const bucketCounts = useMemo(() => {
    const counts: Record<Bucket, number> = {
      awaiting_payment: 0, portal_not_sent: 0, invite_no_login: 0,
      client_action: 0, team_pending: 0, ready_impl: 0,
      impl_blocked: 0, ready_complete: 0, all: clients.length,
    };
    clients.forEach((c) => {
      classifyClient(c).forEach((b) => counts[b]++);
    });
    return counts;
  }, [clients]);

  const filtered = useMemo(() => {
    let list = clients;
    if (activeBucket !== "all") {
      list = list.filter((c) => classifyClient(c).includes(activeBucket));
    }
    if (paymentFilter !== "all") {
      list = list.filter((c) => c.payment_status === paymentFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.business_name?.toLowerCase().includes(q) || c.owner_email?.toLowerCase().includes(q));
    }
    return list;
  }, [clients, activeBucket, paymentFilter, search]);

  const copyPortalLink = (slug: string | null) => {
    if (!slug) { toast.error("No workspace slug"); return; }
    navigator.clipboard.writeText(`${window.location.origin}/setup-portal`);
    toast.success("Portal link copied");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Onboarding Command Center</h1>
        <p className="text-sm text-white/50 mt-1">Manage all post-sale clients from one operational dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {BUCKET_CONFIG.map((b) => (
          <button
            key={b.key}
            onClick={() => setActiveBucket(activeBucket === b.key ? "all" : b.key)}
            className={`rounded-xl p-3 text-left transition-all border ${
              activeBucket === b.key
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/8"
            }`}
          >
            <b.icon className={`h-4 w-4 ${b.color} mb-1`} />
            <div className="text-lg font-bold text-white">{bucketCounts[b.key]}</div>
            <div className="text-[10px] text-white/50 leading-tight">{b.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        {activeBucket !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setActiveBucket("all")} className="text-white/60 hover:text-white">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear Filter
          </Button>
        )}
      </div>

      {/* Active bucket label */}
      {activeBucket !== "all" && (
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            {BUCKET_CONFIG.find((b) => b.key === activeBucket)?.label} ({bucketCounts[activeBucket]})
          </Badge>
        </div>
      )}

      {/* Client Table */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60 text-[11px]">Client</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Profile</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Proposal</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Agreement</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Payment</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Portal</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Setup</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Action Items</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Team</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Implementation</TableHead>
                  <TableHead className="text-white/60 text-[11px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={11} className="text-center py-12 text-white/40">
                      No clients match current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const setupPct = c.setup_total > 0 ? Math.round((c.setup_completed / c.setup_total) * 100) : 0;
                    const implPct = c.impl_total > 0 ? Math.round((c.impl_done / c.impl_total) * 100) : 0;
                    return (
                      <TableRow key={c.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white text-xs font-medium">
                          <div>{c.business_name}</div>
                          {c.owner_email && <div className="text-[10px] text-white/40">{c.owner_email}</div>}
                        </TableCell>
                        <TableCell>
                          {c.profile_name ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                              {c.profile_name}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-white/30">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(c.proposal_status, "proposal")}</TableCell>
                        <TableCell>{statusBadge(c.agreement_status, "agreement")}</TableCell>
                        <TableCell>{statusBadge(c.payment_status, "payment")}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {statusBadge(c.portal_invite_status, "proposal")}
                            {c.portal_last_login_at ? (
                              <div className="text-[9px] text-green-400">Logged in</div>
                            ) : c.portal_invite_status === "sent" ? (
                              <div className="text-[9px] text-amber-400">No login</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.setup_total > 0 ? (
                            <div className="space-y-1">
                              <div className="text-xs text-white font-medium">{setupPct}%</div>
                              <div className="h-1 w-14 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${setupPct}%` }} />
                              </div>
                              <div className="text-[9px] text-white/40">{c.setup_completed}/{c.setup_total}</div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/30">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.setup_action_needed > 0 || c.setup_overdue > 0 ? (
                            <div className="space-y-0.5">
                              {c.setup_action_needed > 0 && (
                                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-300 border-amber-500/20">
                                  {c.setup_action_needed} action
                                </Badge>
                              )}
                              {c.setup_overdue > 0 && (
                                <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-300 border-red-500/20">
                                  {c.setup_overdue} overdue
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-white/30">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.team_pending > 0 ? (
                            <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                              {c.team_pending} pending
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-white/30">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {statusBadge(c.implementation_status, "implementation")}
                            {c.impl_total > 0 && (
                              <div className="text-[9px] text-white/40">{implPct}% ({c.impl_done}/{c.impl_total})</div>
                            )}
                            {c.impl_blocked > 0 && (
                              <div className="text-[9px] text-red-400">{c.impl_blocked} blocked</div>
                            )}
                            {c.next_due && (
                              <div className="text-[9px] text-white/40">Due: {new Date(c.next_due).toLocaleDateString()}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Link to={`/admin/clients/${c.id}/lifecycle`}>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 w-full justify-start px-2">
                                <ExternalLink className="h-3 w-3 mr-1" /> Lifecycle
                              </Button>
                            </Link>
                            <Link to={`/admin/clients/${c.id}/close`}>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-white/60 hover:text-white hover:bg-white/10 w-full justify-start px-2">
                                <ExternalLink className="h-3 w-3 mr-1" /> Close Center
                              </Button>
                            </Link>
                            <Link to={`/admin/clients/${c.id}/implementation`}>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-white/60 hover:text-white hover:bg-white/10 w-full justify-start px-2">
                                <Wrench className="h-3 w-3 mr-1" /> Implementation
                              </Button>
                            </Link>
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 text-[10px] text-white/60 hover:text-white hover:bg-white/10 w-full justify-start px-2"
                              onClick={() => copyPortalLink(c.workspace_slug)}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Portal Link
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="text-[11px] text-white/30 text-right">
        Showing {filtered.length} of {clients.length} clients
      </div>
    </div>
  );
}
