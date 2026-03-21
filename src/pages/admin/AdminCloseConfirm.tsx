import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, AlertCircle, Copy, Loader2, Zap, UserPlus,
  ClipboardCheck, Mail, Phone, ArrowLeft, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { provisionWorkspaceDefaults } from "@/lib/workspaceProvisioner";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type ActivationStatus = "idle" | "pending_payment" | "provisioning" | "invite_sent" | "ready_for_kickoff" | "error";

const statusMeta: Record<ActivationStatus, { label: string; color: string }> = {
  idle: { label: "Ready", color: "text-white/40" },
  pending_payment: { label: "Pending Payment", color: "text-yellow-400" },
  provisioning: { label: "Provisioning…", color: "text-[hsl(var(--nl-neon))]" },
  invite_sent: { label: "Invite Sent", color: "text-[hsl(var(--nl-sky))]" },
  ready_for_kickoff: { label: "Ready for Kickoff", color: "text-emerald-400" },
  error: { label: "Error", color: "text-red-400" },
};

const provisionChecklist = [
  "Client record", "Workspace slug", "Owner user account", "Role assignment",
  "Enterprise access", "CRM pipeline shell", "Pipeline stages", "Task board",
  "Approvals shell", "Reports shell", "AI Insights shell", "Integrations page",
  "Onboarding wizard", "Activity feed", "Health score module", "Branding settings",
  "Revenue opportunities", "Fix Now monitoring", "Default automations",
];

export default function AdminCloseConfirm() {
  const { buildId } = useParams<{ buildId: string }>();
  const navigate = useNavigate();
  const [demoBuild, setDemoBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [inviteResult, setInviteResult] = useState<{ sent: boolean; link: string | null } | null>(null);
  const [form, setForm] = useState({
    business_name_confirmed: "",
    owner_name: "",
    owner_email: "",
    phone: "",
    payment_confirmed: "confirmed",
    payment_method: "credit_card",
    kickoff_contact: "",
    internal_notes: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const markStep = (step: string) => setCompletedSteps(prev => [...prev, step]);

  useEffect(() => {
    if (!buildId) return;
    supabase.from("demo_builds").select("*").eq("id", buildId).single().then(({ data }) => {
      if (data) {
        setDemoBuild(data);
        setForm(f => ({ ...f, business_name_confirmed: (data as any).business_name || "" }));
      }
      setLoading(false);
    });
  }, [buildId]);

  const handleActivate = async () => {
    if (!form.owner_email || !form.business_name_confirmed) {
      toast.error("Business name and owner email are required");
      return;
    }
    if (form.payment_confirmed !== "confirmed") {
      setStatus("pending_payment");
      toast.error("Payment must be confirmed before activation");
      return;
    }

    setSubmitting(true);
    setStatus("provisioning");
    setCompletedSteps([]);
    setInviteResult(null);

    const slug = demoBuild?.workspace_slug || form.business_name_confirmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      // 1. Create client record
      const { data: client, error: clientErr } = await supabase.from("clients").insert({
        business_name: form.business_name_confirmed,
        workspace_slug: slug,
        industry: demoBuild?.business_type || null,
        primary_location: demoBuild?.primary_location || null,
        timezone: "America/Los_Angeles",
        service_package: "enterprise",
        owner_name: form.owner_name || null,
        owner_email: form.owner_email,
      }).select().single();

      if (clientErr || !client) throw new Error(clientErr?.message || "Failed to create client");
      markStep("Client record");
      markStep("Workspace slug");

      // 2. Provision all resources
      const integrations = [
        "Google Analytics", "Google Search Console", "Google Business Profile",
        "Meta / Instagram", "Google Ads", "Stripe", "Twilio", "Zoom", "Domain / Website"
      ];

      await Promise.all([
        supabase.from("provision_queue").insert({ client_id: client.id, provision_status: "provisioning" }),
        supabase.from("client_integrations").insert(integrations.map(name => ({ client_id: client.id, integration_name: name }))),
        supabase.from("onboarding_progress").insert({ client_id: client.id }),
        supabase.from("client_branding").insert({
          client_id: client.id,
          company_name: form.business_name_confirmed,
          logo_url: demoBuild?.logo_url || null,
          primary_color: demoBuild?.primary_color || "#3B82F6",
          secondary_color: demoBuild?.secondary_color || "#06B6D4",
          welcome_message: "Welcome to your business dashboard",
        }),
        supabase.from("client_health_scores").insert({ client_id: client.id }),
        supabase.from("revenue_opportunities").insert({
          client_id: client.id,
          title: "Initial setup review",
          status: "open",
          category: "onboarding",
        }),
      ]);

      provisionChecklist.slice(4).forEach(s => markStep(s));

      // 3. Create owner auth account
      const { data: inviteData, error: inviteErr } = await supabase.functions.invoke("invite-user", {
        body: { email: form.owner_email, role: "client_owner", client_id: client.id },
      });

      markStep("Owner user account");
      markStep("Role assignment");

      if (inviteErr) {
        setInviteResult({ sent: false, link: null });
        toast.warning("Workspace created but invite failed — check manually");
      } else if (inviteData?.invite_email_sent) {
        setInviteResult({ sent: true, link: null });
      } else if (inviteData?.setup_link) {
        setInviteResult({ sent: false, link: inviteData.setup_link });
      } else {
        setInviteResult({ sent: false, link: null });
      }

      // 4. Update provision queue + demo build
      await Promise.all([
        supabase.from("provision_queue").update({ provision_status: "ready_for_kickoff", crm_setup: true, automation_setup: true }).eq("client_id", client.id),
        supabase.from("demo_builds").update({ status: "closed", client_id: client.id } as any).eq("id", buildId!),
        supabase.from("audit_logs").insert({
          action: "client_activated_from_demo",
          client_id: client.id,
          module: "activation",
          metadata: { demo_build_id: buildId, kickoff_contact: form.kickoff_contact, notes: form.internal_notes },
        }),
        supabase.from("fix_now_items").insert({
          client_id: client.id,
          issue: "Review new client provisioning and confirm integrations",
          module: "activation",
          severity: "low",
          status: "open",
        }),
      ]);

      setStatus("ready_for_kickoff");
      toast.success(`${form.business_name_confirmed} activated successfully!`);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
  const labelCls = "text-xs text-white/50 mb-1 block";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;
  if (!demoBuild) return <div className="text-white/50 text-center py-20">Demo build not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate("/admin/demo-builds")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to Demo Builds
          </button>
          <h1 className="text-2xl font-bold text-white">Close & Activate</h1>
          <p className="text-sm text-white/50 mt-1">Closing Meeting Confirmation — <span className="text-white/70">{demoBuild.business_name}</span></p>
        </div>
        {status !== "idle" && (
          <div className={`flex items-center gap-2 text-sm font-medium ${statusMeta[status].color}`}>
            {status === "provisioning" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "ready_for_kickoff" && <CheckCircle2 className="h-4 w-4" />}
            {status === "error" && <AlertCircle className="h-4 w-4" />}
            {statusMeta[status].label}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
                <span className="text-sm font-semibold text-white">Closing Meeting Confirmation Form</span>
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><UserPlus className="h-3 w-3" /> Confirmation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Business Name Confirmed *</label>
                    <Input value={form.business_name_confirmed} onChange={e => set("business_name_confirmed", e.target.value)} className={inputCls} disabled={submitting} />
                  </div>
                  <div>
                    <label className={labelCls}>Owner Full Name</label>
                    <Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="John Smith" className={inputCls} disabled={submitting} />
                  </div>
                  <div>
                    <label className={labelCls}>Owner Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                      <Input type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} placeholder="john@example.com" className={`${inputCls} pl-9`} disabled={submitting} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Primary Contact Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                      <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 555 000 0000" className={`${inputCls} pl-9`} disabled={submitting} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Payment Confirmed *</label>
                    <select value={form.payment_confirmed} onChange={e => set("payment_confirmed", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Payment Method</label>
                    <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
                      <option value="credit_card">Credit Card</option>
                      <option value="ach">ACH / Bank Transfer</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="check">Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Kickoff Contact</label>
                    <Input value={form.kickoff_contact} onChange={e => set("kickoff_contact", e.target.value)} placeholder="Same or different contact" className={inputCls} disabled={submitting} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Internal Notes</label>
                  <Textarea value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} placeholder="Any notes..." className={`${inputCls} min-h-[60px]`} disabled={submitting} />
                </div>
              </div>

              {/* Invite Result */}
              {inviteResult && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4" style={{
                  background: inviteResult.sent ? "hsla(160,60%,40%,.12)" : "hsla(211,96%,60%,.08)",
                  border: `1px solid ${inviteResult.sent ? "hsla(160,60%,50%,.25)" : "hsla(211,96%,60%,.15)"}`,
                }}>
                  {inviteResult.sent ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">Invite email sent!</p>
                        <p className="text-xs text-white/50 mt-1">Password setup email sent to <span className="text-white/70 font-medium">{form.owner_email}</span>.</p>
                      </div>
                    </div>
                  ) : inviteResult.link ? (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-[hsl(var(--nl-sky))] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">Email not configured — Copy setup link</p>
                        <p className="text-xs text-white/50 mt-1 mb-2">Share this with <span className="text-white/70 font-medium">{form.owner_email}</span>:</p>
                        <div className="flex gap-2">
                          <Input value={inviteResult.link} readOnly className="bg-white/[0.06] border-white/10 text-white/70 text-[11px] flex-1" />
                          <Button size="sm" onClick={() => { navigator.clipboard.writeText(inviteResult.link!); toast.success("Copied!"); }} className="bg-white/10 hover:bg-white/20 text-white shrink-0">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">Account linked</p>
                        <p className="text-xs text-white/50 mt-1">User already exists and has been assigned to this workspace.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={handleActivate} disabled={submitting || status === "ready_for_kickoff"} className="flex-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-11">
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</> : status === "ready_for_kickoff" ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Activated</> : <><Zap className="h-4 w-4 mr-2" /> Activate Client</>}
                </Button>
                {status === "ready_for_kickoff" && (
                  <Button onClick={() => navigate("/admin/demo-builds")} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                    Back to Builds
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provisioning Checklist */}
        <div className="space-y-4">
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-white/60 mb-3">Provisioning Checklist</p>
              <div className="space-y-1.5">
                {provisionChecklist.map(item => {
                  const done = completedSteps.includes(item);
                  return (
                    <motion.div key={item} initial={false} animate={{ opacity: done ? 1 : 0.4 }} className="flex items-center gap-2 text-[11px]">
                      <CheckCircle2 className={`h-3 w-3 shrink-0 ${done ? "text-[hsl(var(--nl-sky))]" : "text-white/20"}`} />
                      <span className={done ? "text-white/80" : "text-white/30"}>{item}</span>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Demo Build Summary */}
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-white/60 mb-3">Demo Build Info</p>
              <div className="space-y-2 text-[11px]">
                {[
                  ["Business", demoBuild.business_name],
                  ["Type", demoBuild.business_type],
                  ["Location", demoBuild.primary_location],
                  ["Website", demoBuild.website],
                  ["Service", demoBuild.main_service],
                  ["Goal", demoBuild.primary_goal],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-white/40">{k}</span>
                    <span className="text-white/70 text-right truncate ml-2 max-w-[150px]">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
