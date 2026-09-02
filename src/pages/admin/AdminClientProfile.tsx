import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { computeWorkspaceReadiness, type WorkspaceReadinessResult } from "@/lib/workspaceProvisioner";
import { buildAppDownloadUrl } from "@/lib/appDownloadLink";
import { toast } from "@/hooks/use-toast";
import { toast as sonner } from "sonner";
import RecurringMeetingsTab from "@/components/admin/RecurringMeetingsTab";
import {
  Loader2, ExternalLink, Copy, FileText, Smartphone, ArrowLeft, Building2,
  Zap, ClipboardList, CreditCard, Wrench, CheckCircle2, ChevronRight,
} from "lucide-react";

const cardStyle = { background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" };

function money(n: number | null | undefined) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}
function dt(v: string | null | undefined) {
  return v ? new Date(v).toLocaleString() : "—";
}
function d(v: string | null | undefined) {
  return v ? new Date(v).toLocaleDateString() : "—";
}

const statusColor = (s: string) => {
  if (s === "active") return "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]";
  if (s === "provisioning") return "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-neon))]";
  if (s === "setup_in_progress") return "bg-[hsla(40,96%,60%,.15)] text-[hsl(40,96%,68%)]";
  if (s === "suspended") return "bg-[hsla(0,70%,50%,.15)] text-[hsl(0,70%,68%)]";
  return "bg-white/5 text-white/40";
};

const Pill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${className || "bg-white/5 text-white/40"}`}>{children}</span>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold">{label}</p>
    <div className="text-sm text-white/80 mt-0.5 break-words">{value ?? "—"}</div>
  </div>
);

export default function AdminClientProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { setViewMode, setActiveClientId } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [readiness, setReadiness] = useState<WorkspaceReadinessResult | null>(null);
  const [bdrLead, setBdrLead] = useState<any>(null);
  const [deal, setDeal] = useState<any>(null);
  const [activating, setActivating] = useState(false);
  const [repNames, setRepNames] = useState<Record<string, string>>({});
  const [subs, setSubs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [clientRes, leadRes, dealRes, subRes, invRes, logRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
        (supabase as any).from("nl_bdr_leads").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1),
        (supabase as any).from("crm_deals").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1),
        (supabase as any).from("subscriptions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        (supabase as any).from("invoices").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        (supabase as any).from("audit_logs").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
      ]);
      if (cancelled) return;

      const lead = (leadRes.data || [])[0] || null;
      const dl = (dealRes.data || [])[0] || null;
      setClient(clientRes.data || null);
      setBdrLead(lead);
      setDeal(dl);
      setSubs(subRes.data || []);
      setInvoices(invRes.data || []);
      setLogs(logRes.data || []);

      const userIds = [lead?.user_id, dl?.assigned_user].filter(Boolean) as string[];
      if (userIds.length) {
        const { data: emps } = await (supabase as any)
          .from("employee_profiles").select("user_id, full_name").in("user_id", [...new Set(userIds)]);
        const map: Record<string, string> = {};
        (emps || []).forEach((e: any) => { if (e.full_name) map[e.user_id] = e.full_name; });
        if (!cancelled) setRepNames(map);
      }

      try {
        const r = await computeWorkspaceReadiness(clientId);
        if (!cancelled) setReadiness(r);
      } catch { /* readiness is best-effort */ }

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const repName = (id: string | null | undefined) => (id ? repNames[id] || id.slice(0, 8) : "Unassigned");

  const openWorkspace = () => {
    if (!client) return;
    setViewMode("workspace");
    setActiveClientId(client.id);
    navigate("/dashboard");
  };

  async function markFullyActivated(dealId: string) {
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("mark-fully-activated", { body: { deal_id: dealId } });
      if (error || !(data as any)?.ok) {
        toast({ title: "Could not mark activated", description: "Please try again.", variant: "destructive" });
        return;
      }
      const { data: fresh } = await (supabase as any).from("crm_deals").select("*").eq("id", dealId).maybeSingle();
      if (fresh) setDeal(fresh);
      else setDeal((prev: any) => (prev ? { ...prev, fully_activated_at: new Date().toISOString() } : prev));
      toast({ title: "Client marked fully activated" });
    } catch {
      toast({ title: "Could not mark activated", description: "Please try again.", variant: "destructive" });
    } finally {
      setActivating(false);
    }
  }

  async function viewAgreement(dealId: string) {
    setAgreementLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-signed-agreement", {
        body: { deal_id: dealId },
      });
      if (error) {
        const status = (error as any)?.context?.status;
        toast({
          title: status === 404 ? "No agreement found" : "Could not load agreement",
          description: status === 404 ? "This deal doesn't have a signed agreement on file yet." : "Please try again.",
          variant: "destructive",
        });
        return;
      }
      const url = (data as any)?.url;
      if (!url) {
        toast({ title: "No agreement found", description: "This deal doesn't have a signed agreement on file yet.", variant: "destructive" });
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast({ title: "Could not load agreement", description: "Please try again.", variant: "destructive" });
    } finally {
      setAgreementLoading(false);
    }
  }

  const deliveryPill = (val: string | null, label: string) => {
    if (!val || val === "not_attempted") return null;
    const cls = val === "sent" ? "bg-emerald-500/10 text-emerald-400"
      : val === "failed" ? "bg-red-500/10 text-red-400"
      : "bg-white/5 text-white/30";
    return <Pill className={cls}>{label}: {val === "not_configured" ? "not configured" : val.replace(/_/g, " ")}</Pill>;
  };

  const workspaceUrl = useMemo(
    () => (client ? `${window.location.origin}/w/${client.workspace_slug}` : ""),
    [client]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading client profile…
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-2xl mx-auto text-center p-12 rounded-xl" style={cardStyle}>
        <p className="text-white/60">Client not found.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/clients")}>Back to Clients</Button>
      </div>
    );
  }

  const deeperTools = [
    { label: "Master Setup Form", icon: Zap, to: `/admin/clients/${clientId}/activate` },
    { label: "Lifecycle & Setup", icon: ClipboardList, to: `/admin/clients/${clientId}/lifecycle` },
    { label: "Close Center", icon: CreditCard, to: `/admin/clients/${clientId}/close` },
    { label: "Implementation", icon: Wrench, to: `/admin/clients/${clientId}/implementation` },
    { label: "Handoff Checklist", icon: CheckCircle2, to: `/admin/clients/${clientId}/handoff` },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <button onClick={() => navigate("/admin/clients")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
      </button>

      {/* Header */}
      <div className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" style={cardStyle}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-5 w-5 text-[hsl(var(--nl-sky))]" />
            <h1 className="text-2xl font-bold text-white truncate">{client.business_name}</h1>
            <Pill className={statusColor(client.status)}>{String(client.status).replace(/_/g, " ")}</Pill>
          </div>
          <p className="text-sm text-white/45 mt-1">{client.industry || "No industry set"} · {client.workspace_slug}</p>
        </div>
        <Button onClick={openWorkspace} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white shrink-0">
          <ExternalLink className="h-4 w-4 mr-1.5" /> Open Workspace
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales &amp; Deal</TabsTrigger>
          <TabsTrigger value="billing">Agreement &amp; Billing</TabsTrigger>
          <TabsTrigger value="workspace">Workspace &amp; Access</TabsTrigger>
          <TabsTrigger value="recurring">Recurring Meetings</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="rounded-xl p-5 grid grid-cols-2 md:grid-cols-3 gap-5" style={cardStyle}>
            <Field label="Owner" value={client.owner_name || "—"} />
            <Field label="Email" value={client.owner_email || "—"} />
            <Field label="Phone" value={client.owner_phone || "—"} />
            <Field label="Workspace Slug" value={<code className="text-xs text-white/60">{client.workspace_slug}</code>} />
            <Field label="Created" value={d(client.created_at)} />
            <Field label="Onboarding Stage" value={<Pill className="bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-sky))]">{String(client.onboarding_stage || "").replace(/_/g, " ")}</Pill>} />
            <Field label="Sales Team" value={client.has_sales_team === true ? "Yes" : client.has_sales_team === false ? "No" : "—"} />
            <Field label="Compliance Requirements" value={client.has_compliance_requirements === true ? "Yes" : client.has_compliance_requirements === false ? "No" : "—"} />
            <Field
              label="Readiness"
              value={readiness ? (
                <div className="flex items-center gap-2">
                  <Progress value={readiness.percentage} className="h-1.5 flex-1 max-w-[120px]" />
                  <span className="text-[11px] text-white/50">{readiness.percentage}%</span>
                </div>
              ) : "—"}
            />
          </div>

          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-2">Invite &amp; Delivery</p>
            <div className="flex items-center gap-2 flex-wrap">
              {client.invite_status ? (
                <Pill className={
                  client.invite_status === "invite_sent" ? "bg-emerald-500/10 text-emerald-400"
                  : client.invite_status === "invite_failed" ? "bg-red-500/10 text-red-400"
                  : client.invite_status === "access_link_generated" ? "bg-blue-500/10 text-blue-400"
                  : "bg-white/5 text-white/30"
                }>{client.invite_status.replace(/_/g, " ")}</Pill>
              ) : <Pill>no invite</Pill>}
              {deliveryPill(client.email_delivery_status, "email")}
              {deliveryPill(client.sms_delivery_status, "sms")}
            </div>
          </div>
        </TabsContent>

        {/* SALES & DEAL */}
        <TabsContent value="sales" className="mt-4 space-y-4">
          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold text-white mb-3">BDR Origin</p>
            {bdrLead ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Field label="Business" value={bdrLead.business_name} />
                <Field label="Owner" value={bdrLead.owner_name || "—"} />
                <Field label="Pipeline Stage" value={<Pill className="bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-sky))]">{String(bdrLead.pipeline_stage || "—").replace(/_/g, " ")}</Pill>} />
                <Field label="Assigned Rep" value={repName(bdrLead.user_id)} />
              </div>
            ) : (
              <p className="text-sm text-white/40">This client did not come through the BDR lead pipeline.</p>
            )}
          </div>

          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-3 gap-3">
              <p className="text-sm font-semibold text-white">Deal</p>
              {deal?.fully_activated_at ? (
                <Pill className="bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]">Fully Activated</Pill>
              ) : deal?.pay_sign_status === "paid_signed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activating}
                  onClick={() => markFullyActivated(deal.id)}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  {activating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                  Mark Fully Activated
                </Button>
              ) : null}
            </div>
            {deal ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <Field label="Deal Name" value={deal.deal_name} />
                <Field label="Pricing Model" value={<span className="capitalize">{deal.pricing_model || "—"}</span>} />
                <Field label="Initial Fee" value={money(deal.initial_fee)} />
                <Field label="Recurring Fee" value={`${money(deal.recurring_fee)}/mo`} />
                <Field label="Retainer KPI" value={deal.retainer_kpi || "—"} />
                <Field label="Pay & Sign Status" value={<Pill className={deal.pay_sign_status === "paid_signed" ? "bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]" : "bg-[hsla(40,96%,60%,.15)] text-[hsl(40,96%,68%)]"}>{String(deal.pay_sign_status || "—").replace(/_/g, " ")}</Pill>} />
                <Field label="Close Prep Completed" value={dt(deal.close_prep_completed_at)} />
                <Field label="Fully Activated" value={dt(deal.fully_activated_at)} />
                <Field label="Assigned Rep" value={repName(deal.assigned_user)} />
                <Field label="Created" value={d(deal.created_at)} />
              </div>
            ) : (
              <p className="text-sm text-white/40">No deal has been created for this client yet.</p>
            )}
          </div>

        </TabsContent>

        {/* AGREEMENT & BILLING */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold text-white mb-3">Signed Agreement</p>
            {deal?.service_agreement_envelope_id ? (
              <Button
                onClick={() => viewAgreement(deal.id)}
                disabled={agreementLoading}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                {agreementLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1.5" />}
                View Signed Agreement
              </Button>
            ) : (
              <p className="text-sm text-white/40">No signed agreement on file for this client yet.</p>
            )}
          </div>

          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold text-white mb-3">Subscriptions</p>
            {subs.length === 0 ? (
              <p className="text-sm text-white/40">No subscriptions.</p>
            ) : (
              <div className="space-y-3">
                {subs.map((s) => (
                  <div key={s.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-white/[0.06] first:border-0 first:pt-0">
                    <Field label="Monthly" value={`${money(s.monthly_amount)}/mo`} />
                    <Field label="Status" value={<Pill className={s.subscription_status === "active" ? "bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]" : "bg-white/5 text-white/40"}>{String(s.subscription_status || "—").replace(/_/g, " ")}</Pill>} />
                    <Field label="Next Invoice" value={d(s.next_invoice_date)} />
                    <Field label="Setup Fee" value={money(s.setup_fee_amount)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold text-white mb-3">Invoices</p>
            {invoices.length === 0 ? (
              <p className="text-sm text-white/40">No invoices.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Invoice #", "Type", "Status", "Total", "Paid At"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-white/[0.04]">
                        <td className="px-3 py-2 text-white/80">{inv.invoice_number}</td>
                        <td className="px-3 py-2 text-white/50 capitalize">{String(inv.invoice_type || "—").replace(/_/g, " ")}</td>
                        <td className="px-3 py-2">
                          <Pill className={
                            inv.invoice_status === "paid" ? "bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]"
                            : inv.invoice_status === "failed" ? "bg-[hsla(0,70%,50%,.15)] text-[hsl(0,70%,68%)]"
                            : "bg-[hsla(40,96%,60%,.15)] text-[hsl(40,96%,68%)]"
                          }>{String(inv.invoice_status || "—").replace(/_/g, " ")}</Pill>
                        </td>
                        <td className="px-3 py-2 text-white/80">{money(inv.total_amount)}</td>
                        <td className="px-3 py-2 text-white/50">{d(inv.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* WORKSPACE & ACCESS */}
        <TabsContent value="workspace" className="mt-4 space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs text-white/60 truncate">{workspaceUrl}</code>
              <Button size="sm" variant="outline" className="border-white/10 text-white/70"
                onClick={() => { navigator.clipboard.writeText(workspaceUrl); sonner.success("Workspace link copied!"); }}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs text-white/60 truncate">{buildAppDownloadUrl(client.workspace_slug)}</code>
              <Button size="sm" variant="outline" className="border-white/10 text-white/70"
                onClick={() => { navigator.clipboard.writeText(buildAppDownloadUrl(client.workspace_slug)); sonner.success("App download link copied!"); }}>
                <Smartphone className="h-3.5 w-3.5 mr-1" /> Copy App Link
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 pt-2 border-t border-white/[0.06]">
              <Field label="Portal Invite Status" value={<Pill className={client.portal_invite_status === "sent" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30"}>{String(client.portal_invite_status || "not sent").replace(/_/g, " ")}</Pill>} />
              <Field label="Last Invited" value={dt(client.portal_last_invited_at)} />
              <Field label="Portal Access" value={client.portal_access_enabled ? "Enabled" : "Disabled"} />
            </div>
          </div>

          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold text-white">Deeper tools live here</p>
            <p className="text-xs text-white/40 mt-1 mb-4">
              These specialized workflows aren't duplicated on this page — this profile just links you straight to them.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {deeperTools.map((t) => (
                <button
                  key={t.to}
                  onClick={() => navigate(t.to)}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm text-white/80">
                    <t.icon className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> {t.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* RECURRING MEETINGS */}
        <TabsContent value="recurring" className="mt-4">
          <RecurringMeetingsTab clientId={clientId!} client={client} />
        </TabsContent>

        {/* ACTIVITY LOG */}
        <TabsContent value="activity" className="mt-4">
          <div className="rounded-xl p-5" style={cardStyle}>
            {logs.length === 0 ? (
              <p className="text-sm text-white/40">No activity recorded for this client yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {logs.map((l) => (
                  <div key={l.id} className="py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 capitalize">{String(l.action || "—").replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-white/35">{l.module || "—"} · {dt(l.created_at)}</p>
                      </div>
                      {l.metadata && (
                        <button
                          onClick={() => setExpandedLog(expandedLog === l.id ? null : l.id)}
                          className="text-[11px] text-[hsl(var(--nl-sky))] hover:underline shrink-0"
                        >
                          {expandedLog === l.id ? "Hide details" : "View details"}
                        </button>
                      )}
                    </div>
                    {expandedLog === l.id && l.metadata && (
                      <pre className="mt-2 text-[11px] text-white/50 bg-black/30 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(l.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
