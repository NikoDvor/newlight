import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, AlertTriangle, CheckCircle2, Clock, Activity,
  PhoneCall, ArrowUpDown, Inbox, Play, Loader2, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


type PaymentRow = {
  id: string;
  amount: number | null;
  method: string | null;
  due_date: string | null;
  status: string | null;
  payer_name: string | null;
  clients?: { business_name?: string | null } | null;
};

type EventRow = {
  id: string;
  client_id: string;
  channel: string | null;
  event_type: string | null;
  occurred_at: string;
  clients?: { business_name?: string | null } | null;
};

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const statusClass: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  overdue: "bg-red-500/20 text-red-400",
  cancelled: "bg-white/10 text-white/40",
};

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: any; sub?: string }) {
  return (
    <Card className="bg-card/60 border-border">
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 py-10 text-center px-6">
      <Inbox className="h-5 w-5 mx-auto text-muted-foreground/50 mb-2" />
      <div className="text-sm font-medium text-foreground/80">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{description}</div>
    </div>
  );
}

function SortHead({
  label, active, dir, onClick, className = "",
}: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string }) {
  return (
    <th className={`text-left px-3 py-2 font-medium ${className}`}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "text-primary" : "opacity-40"}`} />
        {active && <span className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

export default function AdminClientRevenue() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paySort, setPaySort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "due_date", dir: "asc" });

  const [rangeDays, setRangeDays] = useState<number>(30);
  const [attrSort, setAttrSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "count", dir: "desc" });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sugLoading, setSugLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("client_payment_requests")
      .select("id, amount, method, due_date, status, payer_name, clients(business_name)")
      .order("due_date", { ascending: true })
      .then((r) => {
        setPayments((r.data as any[] as PaymentRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setEventsLoading(true);
    const since = new Date(Date.now() - rangeDays * 86400000).toISOString();
    supabase
      .from("attribution_events")
      .select("id, client_id, channel, event_type, occurred_at, clients(business_name)")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .then((r) => {
        setEvents((r.data as any[] as EventRow[]) ?? []);
        setEventsLoading(false);
      });
  }, [rangeDays]);

  // --- Suggested revenue attribution (NewLight commission review) ---
  const loadSuggestions = useCallback(async () => {
    setSugLoading(true);
    const { data } = await supabase
      .from("attribution_revenue_links")
      .select(
        "id, client_id, matched_amount, match_method, created_at, clients(business_name), crm_deals(deal_name, deal_value), attribution_events(channel, event_type, occurred_at)"
      )
      .eq("status", "suggested")
      .order("created_at", { ascending: false });
    setSuggestions((data as any[]) ?? []);
    setSugLoading(false);
  }, []);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const runMatching = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("match-attribution-to-deals", { body: {} });
    setRunning(false);
    if (error) {
      toast.error(error.message || "Matching failed");
      return;
    }
    toast.success(
      `Checked ${data?.deals_checked ?? 0} closed-won deals — ${data?.matches_created ?? 0} new suggestion(s).`
    );
    loadSuggestions();
  };

  const approveSuggestion = async (row: any) => {
    setActingId(row.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      const channel = row.attribution_events?.channel || "unknown";
      const eventDate = row.attribution_events?.occurred_at
        ? new Date(row.attribution_events.occurred_at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })
        : "unknown date";
      const dealName = row.crm_deals?.deal_name || "deal";

      const { data: adj, error: adjErr } = await supabase
        .from("financial_adjustments")
        .insert({
          client_id: row.client_id,
          type: "revenue",
          amount: Number(row.matched_amount || 0),
          reason: `Attribution match — ${channel} event on ${eventDate} → deal "${dealName}"`,
          created_by: uid,
        })
        .select("id")
        .single();
      if (adjErr) throw adjErr;

      const { error: updErr } = await supabase
        .from("attribution_revenue_links")
        .update({
          status: "approved",
          reviewed_by: uid,
          reviewed_at: new Date().toISOString(),
          financial_adjustment_id: adj.id,
        })
        .eq("id", row.id);
      if (updErr) throw updErr;

      toast.success("Approved — financial adjustment created.");
      setSuggestions((prev) => prev.filter((s) => s.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message || "Approve failed");
    } finally {
      setActingId(null);
    }
  };

  const rejectSuggestion = async (row: any) => {
    setActingId(row.id);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("attribution_revenue_links")
      .update({ status: "rejected", reviewed_by: auth?.user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    setActingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Match rejected.");
    setSuggestions((prev) => prev.filter((s) => s.id !== row.id));
  };


  const payStats = useMemo(() => {
    const sum = (s: string) =>
      payments.filter((p) => (p.status || "") === s).reduce((a, p) => a + Number(p.amount || 0), 0);
    return {
      pending: sum("pending"),
      paid: sum("paid"),
      overdue: sum("overdue"),
      overdueCount: payments.filter((p) => p.status === "overdue").length,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const rows = statusFilter === "all" ? payments : payments.filter((p) => p.status === statusFilter);
    const { key, dir } = paySort;
    const val = (p: PaymentRow) => {
      switch (key) {
        case "client": return (p.clients?.business_name || "").toLowerCase();
        case "amount": return Number(p.amount || 0);
        case "method": return p.method || "";
        case "due_date": return p.due_date || "";
        case "status": return p.status || "";
        case "payer": return (p.payer_name || "").toLowerCase();
        default: return "";
      }
    };
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (dir === "asc" ? 1 : -1);
    });
  }, [payments, statusFilter, paySort]);

  const attrStats = useMemo(() => {
    const calls = events.filter(
      (e) => (e.event_type || "").toLowerCase().includes("call") || (e.channel || "").toLowerCase() === "call"
    ).length;
    return { total: events.length, calls };
  }, [events]);

  const attrRows = useMemo(() => {
    const map = new Map<string, { client: string; channel: string; count: number; last: string }>();
    for (const e of events) {
      const client = e.clients?.business_name || "Unknown client";
      const channel = e.channel || "unknown";
      const k = `${e.client_id}::${channel}`;
      const existing = map.get(k);
      if (existing) {
        existing.count += 1;
        if (e.occurred_at > existing.last) existing.last = e.occurred_at;
      } else {
        map.set(k, { client, channel, count: 1, last: e.occurred_at });
      }
    }
    const rows = Array.from(map.values());
    const { key, dir } = attrSort;
    const val = (r: typeof rows[number]) =>
      key === "client" ? r.client.toLowerCase() : key === "channel" ? r.channel : key === "last" ? r.last : r.count;
    return rows.sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (dir === "asc" ? 1 : -1);
    });
  }, [events, attrSort]);

  const togglePaySort = (key: string) =>
    setPaySort((p) => ({ key, dir: p.key === key && p.dir === "asc" ? "desc" : "asc" }));
  const toggleAttrSort = (key: string) =>
    setAttrSort((p) => ({ key, dir: p.key === key && p.dir === "asc" ? "desc" : "asc" }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 space-y-8 max-w-[1400px] mx-auto"
    >
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Client Revenue & Attribution</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only view across every sub-account. Nothing here modifies payment or attribution data.
        </p>
      </div>

      {/* SECTION 1 — Payment Requests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Payment Requests</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Pending" value={money(payStats.pending)} icon={Clock} />
          <StatCard label="Paid (all-time)" value={money(payStats.paid)} icon={CheckCircle2} />
          <StatCard label="Overdue" value={money(payStats.overdue)} icon={AlertTriangle} />
          <StatCard label="Overdue Count" value={String(payStats.overdueCount)} icon={DollarSign} />
        </div>

        <Card className="bg-card/60 border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="text-sm">All Payment Requests</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
            ) : filteredPayments.length === 0 ? (
              <EmptyState
                title={payments.length === 0 ? "No payment requests yet" : "No requests match this filter"}
                description={
                  payments.length === 0
                    ? "Payment requests appear here once sub-accounts start sending agreements with a payment attached."
                    : "Try a different status filter."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <SortHead label="Client" active={paySort.key === "client"} dir={paySort.dir} onClick={() => togglePaySort("client")} />
                      <SortHead label="Amount" active={paySort.key === "amount"} dir={paySort.dir} onClick={() => togglePaySort("amount")} />
                      <SortHead label="Method" active={paySort.key === "method"} dir={paySort.dir} onClick={() => togglePaySort("method")} />
                      <SortHead label="Due Date" active={paySort.key === "due_date"} dir={paySort.dir} onClick={() => togglePaySort("due_date")} />
                      <SortHead label="Status" active={paySort.key === "status"} dir={paySort.dir} onClick={() => togglePaySort("status")} />
                      <SortHead label="Payer" active={paySort.key === "payer"} dir={paySort.dir} onClick={() => togglePaySort("payer")} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-white/[0.03]">
                        <td className="px-3 py-2 text-foreground font-medium">{p.clients?.business_name || "—"}</td>
                        <td className="px-3 py-2 text-foreground">{money(Number(p.amount || 0))}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="border-0 text-[10px] bg-white/10 text-white/70 capitalize">
                            {p.method || "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{p.due_date || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={`border-0 text-[10px] font-semibold capitalize ${statusClass[p.status || ""] || "bg-white/10 text-white/50"}`}
                          >
                            {p.status || "unknown"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{p.payer_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 2 — Attribution */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Attribution</h2>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={rangeDays === d ? "default" : "outline"}
                className="h-7 text-[11px] px-3"
                onClick={() => setRangeDays(d)}
              >
                Last {d}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Tracked Events" value={String(attrStats.total)} icon={Activity} sub={`Last ${rangeDays} days, all clients`} />
          <StatCard label="Calls" value={String(attrStats.calls)} icon={PhoneCall} sub="Tracked-number calls in range" />
        </div>

        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Events by Client & Channel</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Event volume only — dollar attribution requires linking tracked events to closed-won deals, which isn't
              built yet. financial_adjustments still requires manual entry.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {eventsLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
            ) : attrRows.length === 0 ? (
              <EmptyState
                title="No tracked events in this range"
                description="Attribution tracking is new. Events show up here once tracking numbers or tracked forms start receiving traffic."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <SortHead label="Client" active={attrSort.key === "client"} dir={attrSort.dir} onClick={() => toggleAttrSort("client")} />
                      <SortHead label="Channel" active={attrSort.key === "channel"} dir={attrSort.dir} onClick={() => toggleAttrSort("channel")} />
                      <SortHead label="Event Count" active={attrSort.key === "count"} dir={attrSort.dir} onClick={() => toggleAttrSort("count")} />
                      <SortHead label="Last Event At" active={attrSort.key === "last"} dir={attrSort.dir} onClick={() => toggleAttrSort("last")} />
                    </tr>
                  </thead>
                  <tbody>
                    {attrRows.map((r) => (
                      <tr key={`${r.client}-${r.channel}`} className="border-b border-border/50 hover:bg-white/[0.03]">
                        <td className="px-3 py-2 text-foreground font-medium">{r.client}</td>
                        <td className="px-3 py-2 capitalize text-muted-foreground">{r.channel}</td>
                        <td className="px-3 py-2 text-foreground">{r.count}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(r.last).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 3 — Suggested Revenue Attribution (NewLight commission review) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Suggested Revenue Attribution
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-2xl">
              Approving creates a real financial_adjustments entry that feeds commission billing. Review the match
              before approving.
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={runMatching} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            Run Matching Now
          </Button>
        </div>

        <Card className="bg-card/60 border-border">
          <CardContent className="p-4">
            {sugLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
            ) : suggestions.length === 0 ? (
              <EmptyState
                title="No suggested matches yet"
                description="No suggested matches yet — run matching, or check back after the daily job runs."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Client</th>
                      <th className="text-left px-3 py-2 font-medium">Deal</th>
                      <th className="text-left px-3 py-2 font-medium">Channel</th>
                      <th className="text-left px-3 py-2 font-medium">Matched Amount</th>
                      <th className="text-left px-3 py-2 font-medium">Event Date</th>
                      <th className="text-right px-3 py-2 font-medium">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-white/[0.03]">
                        <td className="px-3 py-2 text-foreground font-medium">{s.clients?.business_name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.crm_deals?.deal_name || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="border-0 text-[10px] bg-white/10 text-white/70 capitalize">
                            {s.attribution_events?.channel || "unknown"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-foreground">{money(Number(s.matched_amount || 0))}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {s.attribution_events?.occurred_at
                            ? new Date(s.attribution_events.occurred_at).toLocaleDateString("en-US", {
                                timeZone: "America/Los_Angeles",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={actingId === s.id}
                              onClick={() => approveSuggestion(s)}
                            >
                              {actingId === s.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <CheckCircle2 className="h-3 w-3 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              disabled={actingId === s.id}
                              onClick={() => rejectSuggestion(s)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
}

