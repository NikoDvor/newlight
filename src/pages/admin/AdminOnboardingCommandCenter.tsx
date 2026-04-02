import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  DollarSign, Send, UserCheck, AlertTriangle, Wrench, CheckCircle2,
  Clock, ExternalLink, Search, Users, ShieldAlert, Rocket, Copy, RotateCcw,
  MoreVertical, ArrowRight, Eye, ClipboardList, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import ClientDetailDrawer from "@/components/admin/ClientDetailDrawer";

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
  setup_total: number;
  setup_completed: number;
  setup_action_needed: number;
  setup_overdue: number;
  setup_requested: number;
  setup_reminded: number;
  setup_revision: number;
  setup_blocked: number;
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

const BUCKET_PRIORITY: Record<Bucket, number> = {
  awaiting_payment: 0,
  portal_not_sent: 1,
  invite_no_login: 2,
  client_action: 3,
  team_pending: 4,
  impl_blocked: 5,
  ready_impl: 6,
  ready_complete: 7,
  all: 99,
};

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

function getNextBestAction(c: ClientRow): { label: string; icon: any; color: string } {
  if (c.payment_status !== "paid")
    return { label: "Collect payment", icon: DollarSign, color: "text-amber-400" };
  if (!c.portal_access_enabled || c.portal_invite_status === "not_sent")
    return { label: "Send setup invite", icon: Send, color: "text-orange-400" };
  if (c.portal_invite_status === "sent" && !c.portal_last_login_at)
    return { label: "Follow up on invite", icon: Clock, color: "text-blue-400" };
  if (c.setup_overdue > 0)
    return { label: `${c.setup_overdue} overdue item${c.setup_overdue > 1 ? "s" : ""}`, icon: AlertTriangle, color: "text-red-400" };
  if (c.setup_action_needed > 0)
    return { label: "Follow up on setup", icon: ClipboardList, color: "text-amber-400" };
  if (c.team_pending > 0)
    return { label: "Review team access", icon: Users, color: "text-purple-400" };
  if (c.impl_blocked > 0)
    return { label: "Resolve blocker", icon: ShieldAlert, color: "text-red-500" };
  if (c.implementation_status === "waiting_on_client")
    return { label: "Waiting on client", icon: Clock, color: "text-amber-400" };
  if (c.payment_status === "paid" && c.implementation_status !== "complete" && c.setup_completed >= c.setup_total * 0.5)
    return { label: "Start implementation", icon: Wrench, color: "text-emerald-400" };
  if (c.impl_total > 0 && c.impl_done >= c.impl_total * 0.9)
    return { label: "Final QA / complete", icon: CheckCircle2, color: "text-green-400" };
  return { label: "Review status", icon: Eye, color: "text-white/50" };
}

function sortClients(list: ClientRow[]): ClientRow[] {
  return [...list].sort((a, b) => {
    const aBuckets = classifyClient(a);
    const bBuckets = classifyClient(b);
    const aPri = Math.min(...aBuckets.map((bk) => BUCKET_PRIORITY[bk] ?? 99), 99);
    const bPri = Math.min(...bBuckets.map((bk) => BUCKET_PRIORITY[bk] ?? 99), 99);
    if (aPri !== bPri) return aPri - bPri;
    // within same priority: overdue first, then oldest next_due
    if (b.setup_overdue !== a.setup_overdue) return b.setup_overdue - a.setup_overdue;
    if (b.setup_action_needed !== a.setup_action_needed) return b.setup_action_needed - a.setup_action_needed;
    if (a.next_due && b.next_due) return a.next_due.localeCompare(b.next_due);
    if (a.next_due) return -1;
    if (b.next_due) return 1;
    return a.business_name.localeCompare(b.business_name);
  });
}

function statusBadge(status: string | null) {
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
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: rawClients } = await supabase
      .from("clients")
      .select("id, business_name, business_type, proposal_status, agreement_status, payment_status, implementation_status, portal_access_enabled, portal_invite_status, portal_last_login_at, status, workspace_slug, owner_email")
      .neq("status", "archived");

    if (!rawClients) { setLoading(false); return; }

    const { data: setupItems } = await supabase.from("client_setup_items" as any).select("client_id, item_status");
    const { data: implTasks } = await supabase.from("implementation_tasks").select("client_id, task_status, blocked_by, due_date");
    const { data: wsUsers } = await supabase.from("workspace_users").select("client_id, provisioning_status");
    const { data: profiles } = await supabase.from("workspace_profiles" as any).select("client_id, applied_profile");

    const setupMap = new Map<string, { total: number; completed: number; action: number; overdue: number; requested: number; reminded: number; revision: number; blocked: number }>();
    ((setupItems || []) as any[]).forEach((si: any) => {
      const e = setupMap.get(si.client_id) || { total: 0, completed: 0, action: 0, overdue: 0, requested: 0, reminded: 0, revision: 0, blocked: 0 };
      e.total++;
      if (si.item_status === "completed") e.completed++;
      if (["requested", "reminded", "revision_needed", "blocked"].includes(si.item_status)) e.action++;
      if (si.item_status === "overdue") { e.overdue++; e.action++; }
      if (si.item_status === "requested") e.requested++;
      if (si.item_status === "reminded") e.reminded++;
      if (si.item_status === "revision_needed") e.revision++;
      if (si.item_status === "blocked") e.blocked++;
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
    ((profiles || []) as any[]).forEach((p: any) => { profileMap.set(p.client_id, p.applied_profile); });

    const enriched: ClientRow[] = rawClients.map((c: any) => {
      const s = setupMap.get(c.id) || { total: 0, completed: 0, action: 0, overdue: 0, requested: 0, reminded: 0, revision: 0, blocked: 0 };
      const im = implMap.get(c.id) || { total: 0, done: 0, blocked: 0, nextDue: null };
      return {
        ...c,
        setup_total: s.total,
        setup_completed: s.completed,
        setup_action_needed: s.action,
        setup_overdue: s.overdue,
        setup_requested: s.requested,
        setup_reminded: s.reminded,
        setup_revision: s.revision,
        setup_blocked: s.blocked,
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
    clients.forEach((c) => { classifyClient(c).forEach((b) => counts[b]++); });
    return counts;
  }, [clients]);

  const filtered = useMemo(() => {
    let list = clients;
    if (activeBucket !== "all") list = list.filter((c) => classifyClient(c).includes(activeBucket));
    if (paymentFilter !== "all") list = list.filter((c) => c.payment_status === paymentFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.business_name?.toLowerCase().includes(q) || c.owner_email?.toLowerCase().includes(q));
    }
    return sortClients(list);
  }, [clients, activeBucket, paymentFilter, search]);

  const copyPortalLink = (slug: string | null) => {
    if (!slug) { toast.error("No workspace slug"); return; }
    navigator.clipboard.writeText(`${window.location.origin}/setup-portal`);
    toast.success("Portal link copied");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="page-title">Onboarding Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
          Manage all post-sale clients from one operational dashboard
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {BUCKET_CONFIG.map((b, i) => (
          <motion.button
            key={b.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
            onClick={() => setActiveBucket(activeBucket === b.key ? "all" : b.key)}
            className={`rounded-xl p-3 text-left transition-all duration-200 border group ${
              activeBucket === b.key
                ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20 shadow-[0_0_16px_-4px_hsla(211,96%,60%,.15)]"
                : "border-border bg-card hover:bg-accent/40 hover:border-primary/15 hover:shadow-[0_4px_16px_-4px_hsla(211,96%,56%,.08)]"
            }`}
          >
            <b.icon className={`h-4 w-4 ${b.color} mb-1 transition-transform duration-200 group-hover:scale-110`} />
            <div className="text-lg font-bold text-foreground tabular-nums">{bucketCounts[b.key]}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{b.label}</div>
          </motion.button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-44">
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
          <Button variant="ghost" size="sm" onClick={() => setActiveBucket("all")} className="text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear Filter
          </Button>
        )}
      </div>

      {/* Active bucket label */}
      {activeBucket !== "all" && (
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {BUCKET_CONFIG.find((b) => b.key === activeBucket)?.label} ({bucketCounts[activeBucket]})
          </Badge>
        </div>
      )}

      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <Card className="hidden md:block border-border bg-card overflow-hidden" style={{
          boxShadow: "0 1px 3px 0 hsla(215,50%,35%,.04), inset 0 1px 0 0 hsla(0,0%,100%,.6)"
        }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Client</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Next Action</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Payment</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Portal</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Setup</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Items</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Team</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">Impl.</TableHead>
                    <TableHead className="text-muted-foreground text-[11px] w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        No clients match current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c, i) => <DesktopRow key={c.id} c={c} copyPortalLink={copyPortalLink} onSelect={() => setSelectedClient(c)} index={i} />)
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No clients match current filters</div>
        ) : (
          filtered.map((c) => <MobileCard key={c.id} c={c} copyPortalLink={copyPortalLink} onSelect={() => setSelectedClient(c)} />)
        )}
      </div>

      <div className="text-[11px] text-muted-foreground text-right">
        Showing {filtered.length} of {clients.length} clients
      </div>

      <ClientDetailDrawer
        client={selectedClient}
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}

/* ───── Desktop Table Row ───── */
function DesktopRow({ c, copyPortalLink, onSelect, index }: { c: ClientRow; copyPortalLink: (s: string | null) => void; onSelect: () => void; index: number }) {
  const setupPct = c.setup_total > 0 ? Math.round((c.setup_completed / c.setup_total) * 100) : 0;
  const implPct = c.impl_total > 0 ? Math.round((c.impl_done / c.impl_total) * 100) : 0;
  const nba = getNextBestAction(c);
  const NbaIcon = nba.icon;

  return (
    <TableRow
      className="border-border hover:bg-primary/[0.03] cursor-pointer transition-colors duration-150"
      onClick={onSelect}
    >
      <TableCell>
        <div className="text-foreground text-xs font-semibold">{c.business_name}</div>
        {c.profile_name && <div className="text-[10px] text-muted-foreground mt-0.5">{c.profile_name}</div>}
      </TableCell>
      <TableCell>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${nba.color}`}>
          <NbaIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{nba.label}</span>
        </div>
      </TableCell>
      <TableCell>{statusBadge(c.payment_status)}</TableCell>
      <TableCell>
        <div className="space-y-0.5">
          {statusBadge(c.portal_invite_status)}
          {c.portal_last_login_at ? (
            <div className="text-[9px] text-[hsl(152,60%,44%)] font-medium">Logged in</div>
          ) : c.portal_invite_status === "sent" ? (
            <div className="text-[9px] text-[hsl(38,92%,50%)] font-medium">No login</div>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {c.setup_total > 0 ? (
          <div className="space-y-1">
            <div className="text-xs text-foreground font-semibold tabular-nums">{setupPct}%</div>
            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${setupPct}%` }}
              />
            </div>
            <div className="text-[9px] text-muted-foreground tabular-nums">{c.setup_completed}/{c.setup_total}</div>
          </div>
        ) : <span className="text-[10px] text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        <ItemBadges c={c} />
      </TableCell>
      <TableCell>
        {c.team_pending > 0 ? (
          <Badge variant="outline" className="text-[9px] bg-[hsla(280,60%,50%,.08)] text-[hsl(280,60%,50%)] border-[hsla(280,60%,50%,.15)]">
            {c.team_pending} pending
          </Badge>
        ) : <span className="text-[10px] text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        <div className="space-y-0.5">
          {statusBadge(c.implementation_status)}
          {c.impl_total > 0 && <div className="text-[9px] text-muted-foreground tabular-nums">{implPct}% ({c.impl_done}/{c.impl_total})</div>}
          {c.impl_blocked > 0 && <div className="text-[9px] text-[hsl(0,72%,51%)]">{c.impl_blocked} blocked</div>}
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <QuickMenu c={c} copyPortalLink={copyPortalLink} />
      </TableCell>
    </TableRow>
  );
}

/* ───── Mobile Card ───── */
function MobileCard({ c, copyPortalLink, onSelect }: { c: ClientRow; copyPortalLink: (s: string | null) => void; onSelect: () => void }) {
  const setupPct = c.setup_total > 0 ? Math.round((c.setup_completed / c.setup_total) * 100) : 0;
  const implPct = c.impl_total > 0 ? Math.round((c.impl_done / c.impl_total) * 100) : 0;
  const nba = getNextBestAction(c);
  const NbaIcon = nba.icon;

  return (
    <Card className="border-border bg-card cursor-pointer hover:bg-accent/30 transition-colors" onClick={onSelect}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">{c.business_name}</div>
            {c.profile_name && <div className="text-[11px] text-muted-foreground">{c.profile_name}</div>}
          </div>
          <QuickMenu c={c} copyPortalLink={copyPortalLink} />
        </div>

        {/* Next Best Action */}
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${nba.color} bg-accent/30 rounded-lg px-2.5 py-1.5`}>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <NbaIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{nba.label}</span>
        </div>

        {/* Status row */}
        <div className="flex flex-wrap gap-1.5">
          {statusBadge(c.payment_status)}
          {statusBadge(c.portal_invite_status)}
          {c.portal_last_login_at && <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">logged in</Badge>}
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs font-bold text-foreground">{setupPct}%</div>
            <div className="text-[9px] text-muted-foreground">Setup</div>
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{implPct}%</div>
            <div className="text-[9px] text-muted-foreground">Impl</div>
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{c.team_pending}</div>
            <div className="text-[9px] text-muted-foreground">Team</div>
          </div>
        </div>

        {/* Item badges */}
        <ItemBadges c={c} />
      </CardContent>
    </Card>
  );
}

/* ───── Shared: item status badges ───── */
function ItemBadges({ c }: { c: ClientRow }) {
  const badges: { count: number; label: string; cls: string }[] = [
    { count: c.setup_overdue, label: "overdue", cls: "bg-red-500/10 text-red-300 border-red-500/20" },
    { count: c.setup_blocked, label: "blocked", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
    { count: c.setup_revision, label: "revision", cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
    { count: c.setup_requested, label: "requested", cls: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
    { count: c.setup_reminded, label: "reminded", cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  ];
  const active = badges.filter((b) => b.count > 0);
  if (active.length === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((b) => (
        <Badge key={b.label} variant="outline" className={`text-[9px] ${b.cls}`}>
          {b.count} {b.label}
        </Badge>
      ))}
    </div>
  );
}

/* ───── Quick action dropdown ───── */
function QuickMenu({ c, copyPortalLink }: { c: ClientRow; copyPortalLink: (s: string | null) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link to={`/admin/clients/${c.id}/lifecycle`} className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5" /> Lifecycle & Setup
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/admin/clients/${c.id}/close`} className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5" /> Close Center
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/admin/clients/${c.id}/implementation`} className="flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5" /> Implementation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open(`${window.location.origin}/auth?redirect=/setup-portal`, "_blank")}>
          <Eye className="h-3.5 w-3.5 mr-2" /> Preview Setup Portal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyPortalLink(c.workspace_slug)}>
          <Copy className="h-3.5 w-3.5 mr-2" /> Copy Portal Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
