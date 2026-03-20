import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  CheckCircle2, Circle, AlertTriangle, Rocket, Palette, ShoppingBag,
  Calendar, FileText, Users, Plug, Star, Globe, CreditCard,
  ExternalLink, ArrowLeft, ClipboardCheck, Package, Wand2, Loader2
} from "lucide-react";
import { provisionWorkspaceDefaults } from "@/lib/workspaceProvisioner";

type ItemStatus = "ready" | "partial" | "missing";

interface CheckItem {
  key: string;
  label: string;
  status: ItemStatus;
  detail: string;
  link: string;
}

const statusMeta: Record<ItemStatus, { label: string; color: string; bg: string; icon: any }> = {
  ready: { label: "Ready", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  partial: { label: "In Progress", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)", icon: AlertTriangle },
  missing: { label: "Not Started", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: Circle },
};

export default function AdminHandoffChecklist() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { setViewMode, setActiveClientId } = useWorkspace();
  const [clientName, setClientName] = useState("");
  const [clientIndustry, setClientIndustry] = useState<string | null>(null);
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [onboardingStage, setOnboardingStage] = useState<string>("lead");
  const [autoProvisionLog, setAutoProvisionLog] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const evaluate = async () => {
      const [
        clientRes, brandRes, svcRes, calRes, apptRes, availRes, blinkRes,
        formRes, formRes2, teamRes, intgRes, contactRes, dealRes, recRes, irRes,
        proposalRes, subRes, billingRes,
      ] = await Promise.all([
        supabase.from("clients").select("business_name, industry, onboarding_stage").eq("id", clientId).single(),
        supabase.from("client_branding").select("logo_url, primary_color, company_name").eq("client_id", clientId).maybeSingle(),
        supabase.from("service_catalog" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
        supabase.from("calendar_appointment_types").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
        supabase.from("calendar_availability").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
        supabase.from("calendar_booking_links").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
        supabase.from("client_forms" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("client_integrations").select("status").eq("client_id", clientId),
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("crm_deals").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("recommendation_snapshots" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("implementation_requests").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("proposals").select("id, proposal_status", { count: "exact" }).eq("client_id", clientId),
        supabase.from("subscriptions").select("id, subscription_status", { count: "exact" }).eq("client_id", clientId),
        supabase.from("billing_accounts").select("id, billing_status").eq("client_id", clientId).maybeSingle(),
      ]);

      setClientName(clientRes.data?.business_name || "Client");
      setClientIndustry((clientRes.data as any)?.industry || null);
      setOnboardingStage((clientRes.data as any)?.onboarding_stage || "lead");

      // Check for auto-provisioning log
      const { data: provLog } = await supabase.from("audit_logs")
        .select("metadata, created_at")
        .eq("client_id", clientId)
        .eq("action", "starter_template_applied")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (provLog) {
        const meta = provLog.metadata as any;
        setAutoProvisionLog(`Template "${meta?.template || "General"}" applied on ${new Date(provLog.created_at).toLocaleDateString()} — ${meta?.items?.length || 0} item(s)`);
      }

      const hasBrand = !!(brandRes.data?.logo_url && brandRes.data?.primary_color && brandRes.data.primary_color !== "#3B82F6");
      const brandPartial = !!(brandRes.data?.logo_url || (brandRes.data?.primary_color && brandRes.data.primary_color !== "#3B82F6"));
      const svcCount = svcRes.count || 0;
      const calCount = calRes.count || 0;
      const apptCount = apptRes.count || 0;
      const availCount = availRes.count || 0;
      const blinkCount = blinkRes.count || 0;
      const formCount = (formRes.count || 0) + (formRes2.count || 0);
      const teamCount = teamRes.count || 0;
      const intgs = intgRes.data || [];
      const connectedIntgs = intgs.filter((i: any) => i.status === "connected").length;
      const contactCount = contactRes.count || 0;
      const dealCount = dealRes.count || 0;
      const recCount = recRes.count || 0;
      const irCount = irRes.count || 0;
      const proposalData = proposalRes.data || [];
      const proposalCount = proposalData.length;
      const hasSentProposal = proposalData.some((p: any) => ["sent", "viewed", "accepted", "signed"].includes(p.proposal_status));
      const hasAcceptedProposal = proposalData.some((p: any) => ["accepted", "signed"].includes(p.proposal_status));
      const subData = subRes.data || [];
      const hasActiveSub = subData.some((s: any) => s.subscription_status === "active");
      const hasBillingAccount = !!billingRes.data;
      const billingStatus = billingRes.data?.billing_status;

      const calParts = [calCount > 0, apptCount > 0, availCount > 0, blinkCount > 0];
      const calReady = calParts.filter(Boolean).length;

      const s = (full: boolean, partial: boolean): ItemStatus => full ? "ready" : partial ? "partial" : "missing";

      setChecks([
        { key: "branding", label: "Branding Complete", status: s(hasBrand, brandPartial), detail: hasBrand ? "Logo + colors configured" : brandPartial ? "Partially set up" : "No branding configured", link: "/branding-settings" },
        { key: "services", label: "Services / Products", status: s(svcCount >= 2, svcCount > 0), detail: svcCount > 0 ? `${svcCount} service(s)` : "No services added", link: "/services" },
        { key: "calendar", label: "Calendar Ready", status: s(calReady >= 4, calReady > 0), detail: calReady >= 4 ? `${calCount} calendar(s), booking link active` : calCount > 0 ? `Calendar exists — ${4 - calReady} step(s) remaining` : "No calendar created", link: "/calendar-management" },
        { key: "forms", label: "Booking Form Ready", status: s(formCount > 0, false), detail: formCount > 0 ? `${formCount} form(s)` : "No forms created", link: "/forms" },
        { key: "crm", label: "CRM Ready", status: s(contactCount > 0 && dealCount > 0, contactCount > 0 || dealCount > 0), detail: `${contactCount} contact(s), ${dealCount} deal(s)`, link: "/crm" },
        { key: "team", label: "Team Ready", status: s(teamCount >= 2, teamCount > 0), detail: teamCount > 0 ? `${teamCount} member(s)` : "No team members", link: "/team" },
        { key: "integrations", label: "Integrations Reviewed", status: s(connectedIntgs >= 3, connectedIntgs > 0), detail: `${connectedIntgs} connected of ${intgs.length}`, link: "/integrations" },
        { key: "recommendation", label: "Recommendation Active", status: s(recCount > 0, false), detail: recCount > 0 ? "Recommendations generated" : "No recommendations yet", link: "/" },
        { key: "request_path", label: "Request Path Working", status: s(irCount > 0, false), detail: irCount > 0 ? `${irCount} request(s) submitted` : "No requests yet — verify CTA", link: "/" },
        { key: "proposal", label: "Proposal Ready", status: s(hasAcceptedProposal, hasSentProposal || proposalCount > 0), detail: hasAcceptedProposal ? "Proposal accepted" : hasSentProposal ? "Proposal sent — awaiting response" : proposalCount > 0 ? `${proposalCount} draft(s) — send to client` : "No proposal created", link: "/proposals" },
        { key: "billing", label: "Billing Ready", status: s(hasActiveSub, hasBillingAccount), detail: hasActiveSub ? "Active subscription" : hasBillingAccount ? `Billing account: ${billingStatus}` : "No billing account set up", link: "/billing" },
      ]);

      setLoading(false);
    };

    evaluate();
  }, [clientId]);

  const readyCount = checks.filter(c => c.status === "ready").length;
  const percentage = checks.length > 0 ? Math.round((readyCount / checks.length) * 100) : 0;

  const openWorkspace = () => {
    if (!clientId) return;
    setViewMode("workspace");
    setActiveClientId(clientId);
    navigate("/");
  };

  const handleLaunch = async () => {
    if (!clientId) return;
    setLaunching(true);
    try {
      const result = await launchWorkspace(clientId);
      if (result.success) {
        setOnboardingStage("active");
        toast.success(`${clientName} is now live!`);
      } else {
        toast.error("Launch blocked: " + result.blockers[0]);
      }
    } catch {
      toast.error("Launch failed");
    }
    setLaunching(false);
  };

  const isActive = onboardingStage === "active";
  const canLaunch = percentage >= 60 && !isActive;
    if (!clientId) return;
    setProvisioning(true);
    try {
      const result = await provisionWorkspaceDefaults(clientId, {
        industry: clientIndustry,
        skipIfExists: true,
      });
      if (result.provisionedItems.length > 0) {
        setAutoProvisionLog(`Template "${clientIndustry || "General"}" applied just now — ${result.provisionedItems.length} item(s)`);
        // Re-evaluate checks
        window.location.reload();
      } else {
        setAutoProvisionLog(prev => prev || "All starter content already exists");
      }
    } catch {}
    setProvisioning(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/clients")} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="h-4 w-4 text-white/50" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[hsl(var(--nl-sky))]" />
            Handoff Checklist
          </h1>
          <p className="text-sm text-white/40 mt-0.5">{clientName}{clientIndustry ? ` · ${clientIndustry}` : ""}</p>
        </div>
        <Button onClick={handleReProvision} disabled={provisioning} variant="outline" size="sm" className="text-white border-white/10 hover:bg-white/[0.06] mr-2">
          {provisioning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
          {provisioning ? "Provisioning…" : "Apply Template"}
        </Button>
        <Button onClick={openWorkspace} variant="outline" size="sm" className="text-white border-white/10 hover:bg-white/[0.06]">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Workspace
        </Button>
      </div>

      {/* Auto-provisioning indicator */}
      {autoProvisionLog && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: "hsla(270,60%,50%,.08)", border: "1px solid hsla(270,60%,50%,.15)" }}>
          <Wand2 className="h-4 w-4 shrink-0" style={{ color: "hsl(270 60% 65%)" }} />
          <p className="text-xs text-white/60"><span className="text-white/80 font-medium">Auto-provisioned:</span> {autoProvisionLog}</p>
        </div>
      )}

      {/* Score */}
      <Card className="p-5 border-0" style={{ background: "hsla(211,96%,60%,.06)", borderColor: "hsla(211,96%,60%,.12)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.15)" }}>
              <Rocket className="h-5 w-5 text-[hsl(var(--nl-sky))]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Handoff Readiness</p>
              <p className="text-xs text-white/40">{readyCount} of {checks.length} items ready</p>
            </div>
          </div>
          <span className="text-3xl font-bold" style={{ color: percentage === 100 ? "hsl(152 60% 55%)" : "hsl(var(--nl-sky))" }}>
            {percentage}%
          </span>
        </div>
        <Progress value={percentage} className="h-2.5" />
        {isActive ? (
          <div className="flex items-center gap-2 mt-3">
            <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(152 60% 55%)" }} />
            <p className="text-xs font-medium" style={{ color: "hsl(152 60% 55%)" }}>This workspace is live</p>
          </div>
        ) : percentage === 100 ? (
          <p className="text-xs mt-3 font-medium" style={{ color: "hsl(152 60% 55%)" }}>✓ This workspace is ready for client handoff</p>
        ) : null}
      </Card>

      {/* Launch Action */}
      {!isActive && (
        <Card className="p-5 border-0" style={{
          background: canLaunch ? "hsla(152,60%,44%,.06)" : "hsla(0,0%,100%,.02)",
          borderColor: canLaunch ? "hsla(152,60%,44%,.12)" : "hsla(0,0%,100%,.06)",
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: canLaunch ? "hsla(152,60%,44%,.15)" : "hsla(0,0%,100%,.06)" }}>
                <Zap className="h-5 w-5" style={{ color: canLaunch ? "hsl(152 60% 55%)" : "hsl(var(--muted-foreground))" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {canLaunch ? "Ready to launch" : "Not ready yet"}
                </p>
                <p className="text-xs text-white/40">
                  {canLaunch
                    ? "Mark this workspace as live for the client"
                    : `${checks.filter(c => c.status !== "ready").length} item(s) still need attention`}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLaunch}
              disabled={!canLaunch || launching}
              size="sm"
              className={canLaunch
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-white/[0.06] text-white/30 cursor-not-allowed"}
            >
              {launching ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
              {launching ? "Launching…" : "Launch Client"}
            </Button>
          </div>
        </Card>
      )}

      {/* Items */}
      <div className="space-y-2">
        {checks.map((check, i) => {
          const sm = statusMeta[check.status];
          const StatusIcon = sm.icon;
          return (
            <motion.div key={check.key}
              initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-3.5 rounded-xl border transition-colors"
              style={{
                background: "hsla(0,0%,100%,.02)",
                borderColor: check.status === "ready" ? "hsla(152,60%,44%,.15)" : "hsla(0,0%,100%,.06)",
              }}
            >
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: sm.bg }}>
                <StatusIcon className="h-4 w-4" style={{ color: sm.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{check.label}</p>
                <p className="text-[11px] text-white/40">{check.detail}</p>
              </div>
              <Badge variant="outline" className="text-[10px] px-2 shrink-0 border-0" style={{ color: sm.color, background: sm.bg }}>
                {sm.label}
              </Badge>
              {check.status !== "ready" && (
                <button
                  onClick={() => { setViewMode("workspace"); setActiveClientId(clientId!); navigate(check.link); }}
                  className="text-[10px] font-medium px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                  style={{ background: "hsla(211,96%,60%,.1)", color: "hsl(var(--nl-sky))" }}
                >
                  Fix
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
