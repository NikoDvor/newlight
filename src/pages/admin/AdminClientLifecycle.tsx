import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, FileSignature, CreditCard, Wrench, CheckCircle2, Clock, AlertTriangle, Package, RefreshCw } from "lucide-react";
import { seedSetupItems, CATEGORY_LABELS, CATEGORY_ORDER, ITEM_STATUS_OPTIONS } from "@/lib/setupItemsSeeder";

interface ClientData {
  id: string;
  business_name: string;
  proposal_status: string;
  agreement_status: string;
  payment_status: string;
  implementation_status: string;
  onboarding_stage: string;
  status: string;
}

interface SetupItem {
  id: string;
  category: string;
  item_key: string;
  item_label: string;
  item_status: string;
  notes: string | null;
  submitted_by_client: boolean;
  client_value: string | null;
  admin_notes: string | null;
}

const STATUS_CONFIGS: Record<string, { icon: any; steps: { value: string; label: string }[] }> = {
  proposal: {
    icon: FileSignature,
    steps: [
      { value: "not_sent", label: "Not Sent" },
      { value: "sent", label: "Sent" },
      { value: "viewed", label: "Viewed" },
      { value: "approved", label: "Approved" },
      { value: "declined", label: "Declined" },
    ],
  },
  agreement: {
    icon: Package,
    steps: [
      { value: "not_sent", label: "Not Sent" },
      { value: "sent", label: "Sent" },
      { value: "signed", label: "Signed" },
    ],
  },
  payment: {
    icon: CreditCard,
    steps: [
      { value: "unpaid", label: "Unpaid" },
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
      { value: "failed", label: "Failed" },
    ],
  },
  implementation: {
    icon: Wrench,
    steps: [
      { value: "not_started", label: "Not Started" },
      { value: "waiting_on_client", label: "Waiting on Client" },
      { value: "access_requested", label: "Access Requested" },
      { value: "access_received", label: "Access Received" },
      { value: "in_progress", label: "In Progress" },
      { value: "complete", label: "Complete" },
    ],
  },
};

const statusStepColor = (value: string, current: string, allSteps: { value: string }[]) => {
  const idx = allSteps.findIndex(s => s.value === current);
  const thisIdx = allSteps.findIndex(s => s.value === value);
  if (value === current) {
    if (["approved", "signed", "paid", "complete", "access_received"].includes(value)) return "bg-emerald-500 text-white";
    if (["declined", "failed"].includes(value)) return "bg-red-500 text-white";
    return "bg-[hsl(var(--nl-electric))] text-white";
  }
  if (thisIdx < idx) return "bg-emerald-500/20 text-emerald-300";
  return "bg-white/5 text-white/25";
};

export default function AdminClientLifecycle() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(null);
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!clientId) return;
    const [clientRes, itemsRes] = await Promise.all([
      supabase.from("clients").select("id, business_name, proposal_status, agreement_status, payment_status, implementation_status, onboarding_stage, status").eq("id", clientId).single(),
      supabase.from("client_setup_items" as any).select("*").eq("client_id", clientId).order("created_at"),
    ]);
    if (clientRes.data) setClient(clientRes.data as any);
    const items = (itemsRes.data || []) as any as SetupItem[];
    if (items.length === 0) {
      await seedSetupItems(clientId);
      const { data: seeded } = await supabase.from("client_setup_items" as any).select("*").eq("client_id", clientId).order("created_at");
      setSetupItems((seeded || []) as any as SetupItem[]);
    } else {
      setSetupItems(items);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const updateLifecycleStatus = async (field: string, value: string) => {
    if (!clientId) return;
    setSaving(true);
    await supabase.from("clients").update({ [field]: value } as any).eq("id", clientId);
    // Audit log
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: `lifecycle_status_change`,
      module: "lifecycle",
      metadata: { field, value } as any,
    });
    setClient(prev => prev ? { ...prev, [field]: value } : prev);
    toast.success(`Updated ${field.replace(/_/g, " ")}`);
    setSaving(false);
  };

  const updateSetupItemStatus = async (itemId: string, newStatus: string) => {
    await supabase.from("client_setup_items" as any).update({ item_status: newStatus }).eq("id", itemId);
    setSetupItems(prev => prev.map(i => i.id === itemId ? { ...i, item_status: newStatus } : i));
  };

  const updateSetupItemNotes = async (itemId: string, notes: string) => {
    await supabase.from("client_setup_items" as any).update({ admin_notes: notes }).eq("id", itemId);
    setSetupItems(prev => prev.map(i => i.id === itemId ? { ...i, admin_notes: notes } : i));
  };

  if (loading || !client) return <div className="text-white/40 text-center py-20">Loading…</div>;

  const isPaid = client.payment_status === "paid";
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: setupItems.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  const totalItems = setupItems.length;
  const completedItems = setupItems.filter(i => i.item_status === "completed").length;
  const missingItems = setupItems.filter(i => i.item_status === "missing").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/clients")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="h-4 w-4 text-white/40" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{client.business_name}</h1>
          <p className="text-sm text-white/40">Client Lifecycle & Setup Center</p>
        </div>
      </div>

      {/* Lifecycle Status Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(["proposal", "agreement", "payment", "implementation"] as const).map(key => {
          const config = STATUS_CONFIGS[key];
          const Icon = config.icon;
          const fieldName = `${key}_status`;
          const currentValue = (client as any)[fieldName] as string;
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                    {key} Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {config.steps.map(step => (
                      <button
                        key={step.value}
                        onClick={() => updateLifecycleStatus(fieldName, step.value)}
                        disabled={saving}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${statusStepColor(step.value, currentValue, config.steps)}`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Payment Gate Banner */}
      {!isPaid && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{
          background: "hsla(38,92%,50%,.08)",
          border: "1px solid hsla(38,92%,50%,.2)",
        }}>
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">Payment Required</p>
            <p className="text-xs text-white/50">Setup and implementation actions are blocked until payment is confirmed. Mark payment as "Paid" to unlock.</p>
          </div>
        </div>
      )}

      {/* Setup Progress Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Items", value: totalItems, color: "hsl(var(--nl-sky))" },
          { label: "Completed", value: completedItems, color: "hsl(152 60% 44%)" },
          { label: "Missing", value: missingItems, color: "hsl(0 70% 60%)" },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setup Items by Category */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Setup & Integration Tracker</h2>
        {grouped.map(group => (
          <Card key={group.category} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white/70">{group.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.map(item => {
                const statusOpt = ITEM_STATUS_OPTIONS.find(o => o.value === item.item_status);
                const hasClientData = !!(item.client_value || item.client_file_url);
                return (
                  <div key={item.id} className={`p-3 rounded-xl border transition-colors ${
                    !isPaid && item.category !== "internal" ? "opacity-50 pointer-events-none" : ""
                  }`} style={{ borderColor: hasClientData ? "hsla(211,96%,60%,.15)" : "hsla(211,96%,60%,.06)", background: hasClientData ? "hsla(211,96%,60%,.04)" : "hsla(211,96%,60%,.02)" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white">{item.item_label}</p>
                        {item.client_submitted_at && (
                          <p className="text-[9px] text-white/25 mt-0.5">
                            Client submitted {new Date(item.client_submitted_at).toLocaleDateString()} {new Date(item.client_submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.submitted_by_client && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasClientData ? "bg-[hsla(211,96%,60%,.12)] text-[hsl(var(--nl-sky))]" : "bg-white/5 text-white/25"}`}>
                            {hasClientData ? "submitted" : "client"}
                          </span>
                        )}
                        <select
                          value={item.item_status}
                          onChange={e => updateSetupItemStatus(item.id, e.target.value)}
                          className="text-[10px] rounded-md px-2 py-1 bg-white/[0.06] border border-white/10 text-white"
                          style={{ color: statusOpt?.color }}
                        >
                          {ITEM_STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {/* Client submitted data */}
                    {item.client_value && (
                      <div className="mt-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-[10px] text-white/30 mb-0.5 uppercase tracking-wider font-semibold">Client Response</p>
                        <p className="text-xs text-white/70 whitespace-pre-wrap">{item.client_value}</p>
                      </div>
                    )}
                    {item.client_file_url && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <a href={item.client_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[hsl(var(--nl-sky))] hover:underline truncate flex items-center gap-1">
                          📎 {item.client_file_url.split("/").pop()}
                        </a>
                      </div>
                    )}
                    {/* Admin notes inline edit */}
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Add internal note…"
                        defaultValue={item.admin_notes || ""}
                        onBlur={e => { if (e.target.value !== (item.admin_notes || "")) updateSetupItemNotes(item.id, e.target.value); }}
                        className="w-full text-[10px] px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05] text-white/40 placeholder:text-white/15 focus:border-white/20 focus:text-white/60 outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate(`/admin/clients/${clientId}/activate`)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
          <Wrench className="h-3.5 w-3.5 mr-1.5" /> Master Activation
        </Button>
        <Button onClick={() => navigate(`/admin/clients/${clientId}/handoff`)} variant="outline" className="border-white/10 text-white hover:bg-white/10">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Handoff Checklist
        </Button>
        <Button onClick={load} variant="outline" className="border-white/10 text-white hover:bg-white/10">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>
    </div>
  );
}
