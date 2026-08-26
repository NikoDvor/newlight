import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Calendar, User } from "lucide-react";

const STAGES = [
  { key: "Fully Activated", color: "#10b981", bg: "rgba(16,185,129,.12)" },
  { key: "Onboarding Scheduled", color: "#a855f7", bg: "rgba(168,85,247,.12)" },
  { key: "Paid & Signed — Awaiting Onboarding", color: "#3b82f6", bg: "rgba(59,130,246,.12)" },
  { key: "Paid — Awaiting Signature", color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  { key: "Payment Pending", color: "#6b7280", bg: "rgba(107,114,128,.12)" },
];

const FILTER_OPTIONS = ["All Stages", ...STAGES.map((s) => s.key)];

const cardStyle = { background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" };

function formatCurrency(n: number | null | undefined) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

function computeStage(deal: any) {
  if (deal.welcome_email_sent) return STAGES[0].key;
  if (deal.onboarding_meeting_id) return STAGES[1].key;
  if (deal.pay_sign_status === "paid_signed") return STAGES[2].key;
  if (deal.pay_sign_status === "paid") return STAGES[3].key;
  return STAGES[4].key;
}

export default function AdminClientActivation() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [repMap, setRepMap] = useState<Record<string, string>>({});
  const [clientMap, setClientMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: rows } = await (supabase as any)
        .from("crm_deals")
        .select(
          "id, deal_name, client_id, pay_sign_status, onboarding_meeting_id, welcome_email_sent, initial_fee, pricing_model, recurring_fee, commission_rate, assigned_user, updated_at"
        )
        .not("pay_sign_status", "is", null)
        .order("updated_at", { ascending: false });

      const dealRows = rows || [];
      setDeals(dealRows);

      const assignedUserIds = [...new Set(dealRows.map((d: any) => d.assigned_user).filter(Boolean))];
      const clientIds = [...new Set(dealRows.map((d: any) => d.client_id).filter(Boolean))];

      if (assignedUserIds.length) {
        const [{ data: employees }, { data: workspaceUsers }] = await Promise.all([
          (supabase as any).from("employee_profiles").select("user_id, full_name").in("user_id", assignedUserIds),
          (supabase as any).from("workspace_users").select("user_id, full_name").in("user_id", assignedUserIds),
        ]);
        const map: Record<string, string> = {};
        (employees || []).forEach((u: any) => { if (u.full_name) map[u.user_id] = u.full_name; });
        (workspaceUsers || []).forEach((u: any) => { if (u.full_name && !map[u.user_id]) map[u.user_id] = u.full_name; });
        setRepMap(map);
      }

      if (clientIds.length) {
        const { data: clients } = await (supabase as any)
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        const map: Record<string, string> = {};
        (clients || []).forEach((c: any) => { map[c.id] = c.name || c.id; });
        setClientMap(map);
      }

      setLoading(false);
    })();
  }, []);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach((d) => { const s = computeStage(d); counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [deals]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deals.filter((d) => {
      const stage = computeStage(d);
      if (stageFilter !== "All Stages" && stage !== stageFilter) return false;
      if (!term) return true;
      const name = (d.deal_name || clientMap[d.client_id] || "").toLowerCase();
      return name.includes(term);
    });
  }, [deals, stageFilter, search, clientMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading activation data…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Activation</h1>
          <p className="text-sm text-muted-foreground">Every deal that's completed Pay & Sign, tracked through onboarding.</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAGES.map((s) => (
          <div
            key={s.key}
            className="rounded-xl p-4 transition-all hover:brightness-110"
            style={{ ...cardStyle, background: s.bg }}
          >
            <p className="text-xs font-medium opacity-80" style={{ color: s.color }}>{s.key}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{stageCounts[s.key] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or deal name"
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {deals.length === 0 && (
        <div className="text-center p-12 rounded-xl" style={cardStyle}>
          <p className="text-muted-foreground">No deals have completed Pay & Sign yet.</p>
        </div>
      )}

      {/* Deal cards */}
      {deals.length > 0 && filtered.length === 0 && (
        <div className="text-center p-8 rounded-xl" style={cardStyle}>
          <p className="text-muted-foreground">No deals match the current filter.</p>
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map((deal) => {
          const stage = computeStage(deal);
          const stageMeta = STAGES.find((s) => s.key === stage) || STAGES[4];
          const repName = deal.assigned_user ? repMap[deal.assigned_user] || deal.assigned_user.slice(0, 8) : "Unassigned";
          const clientName = clientMap[deal.client_id] || deal.deal_name || "Unknown client";
          const title = deal.deal_name || clientName;
          const pricingText =
            deal.pricing_model === "retainer"
              ? `${formatCurrency(deal.initial_fee)} + ${formatCurrency(deal.recurring_fee)}/mo`
              : `${formatCurrency(deal.initial_fee)} + ${Number(deal.commission_rate || 0)}% commission`;

          return (
            <button
              key={deal.id}
              onClick={() => navigate(`/admin/deals/${deal.id}`)}
              className="text-left rounded-xl p-4 transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={cardStyle}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: stageMeta.bg, color: stageMeta.color }}
                    >
                      {stage}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {repName}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Updated {new Date(deal.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right min-w-[140px]">
                  <p className="text-xs text-muted-foreground capitalize">{deal.pricing_model || "—"}</p>
                  <p className="text-sm font-semibold text-foreground">{pricingText}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
