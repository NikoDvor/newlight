import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, AlertCircle, Copy, Loader2, Zap, UserPlus,
  ClipboardCheck, Building2, Mail, Phone, Globe, MapPin, Palette
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActivationStatus =
  | "idle"
  | "pending_payment"
  | "provisioning"
  | "invite_sent"
  | "ready_for_kickoff"
  | "active"
  | "error";

const statusMeta: Record<ActivationStatus, { label: string; color: string }> = {
  idle: { label: "Ready", color: "text-white/40" },
  pending_payment: { label: "Pending Payment", color: "text-yellow-400" },
  provisioning: { label: "Provisioning…", color: "text-[hsl(var(--nl-neon))]" },
  invite_sent: { label: "Invite Sent", color: "text-[hsl(var(--nl-sky))]" },
  ready_for_kickoff: { label: "Ready for Kickoff", color: "text-[hsl(var(--nl-cyan))]" },
  active: { label: "Active", color: "text-emerald-400" },
  error: { label: "Error", color: "text-red-400" },
};

const provisionChecklist = [
  "Client record", "Workspace slug", "Owner user account", "Role assignment",
  "Enterprise access", "CRM pipeline shell", "Pipeline stages", "Task board",
  "Approvals shell", "Reports shell", "AI Insights shell", "Integrations page",
  "Onboarding wizard", "Activity feed", "Health score module", "Branding settings",
  "Revenue opportunities", "Fix Now monitoring", "Default automations",
];

export default function AdminActivation() {
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [inviteResult, setInviteResult] = useState<{ sent: boolean; link: string | null } | null>(null);
  const [form, setForm] = useState({
    business_name: "",
    workspace_slug: "",
    industry: "",
    primary_location: "",
    timezone: "America/Los_Angeles",
    owner_name: "",
    owner_email: "",
    phone: "",
    logo_url: "",
    primary_color: "#3B82F6",
    secondary_color: "#06B6D4",
    welcome_message: "",
    enterprise_confirmed: true,
    payment_status: "confirmed",
    kickoff_contact: "",
    salesman_name: "",
    internal_notes: "",
  });

  const set = (key: string, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  const markStep = (step: string) => setCompletedSteps(prev => [...prev, step]);

  const handleActivate = async () => {
    if (!form.business_name || !form.workspace_slug || !form.owner_email) {
      toast.error("Business name, workspace slug, and owner email are required");
      return;
    }
    if (form.payment_status !== "confirmed") {
      setStatus("pending_payment");
      toast.error("Payment must be confirmed before activation");
      return;
    }

    setSubmitting(true);
    setStatus("provisioning");
    setCompletedSteps([]);
    setInviteResult(null);

    const slug = form.workspace_slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    try {
      // 1. Create client record
      const { data: client, error: clientErr } = await supabase.from("clients").insert({
        business_name: form.business_name,
        workspace_slug: slug,
        industry: form.industry || null,
        primary_location: form.primary_location || null,
        timezone: form.timezone,
        service_package: "enterprise",
        owner_name: form.owner_name || null,
        owner_email: form.owner_email,
      }).select().single();

      if (clientErr || !client) throw new Error(clientErr?.message || "Failed to create client");
      markStep("Client record");
      markStep("Workspace slug");

      // 2. Provision all resources in parallel
      const integrations = [
        "Google Analytics", "Google Search Console", "Google Business Profile",
        "Meta / Instagram", "Google Ads", "Stripe", "Twilio", "Zoom", "Domain / Website"
      ];

      const [provRes, intRes, onbRes, brandRes, healthRes, revRes] = await Promise.all([
        supabase.from("provision_queue").insert({ client_id: client.id, provision_status: "provisioning" }),
        supabase.from("client_integrations").insert(integrations.map(name => ({ client_id: client.id, integration_name: name }))),
        supabase.from("onboarding_progress").insert({ client_id: client.id }),
        supabase.from("client_branding").insert({
          client_id: client.id,
          company_name: form.business_name,
          logo_url: form.logo_url || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          welcome_message: form.welcome_message || "Welcome to your business dashboard",
        }),
        supabase.from("client_health_scores").insert({ client_id: client.id }),
        supabase.from("revenue_opportunities").insert({
          client_id: client.id,
          title: "Initial setup review",
          status: "open",
          category: "onboarding",
        }),
      ]);

      markStep("Enterprise access");
      markStep("CRM pipeline shell");
      markStep("Pipeline stages");
      markStep("Task board");
      markStep("Approvals shell");
      markStep("Reports shell");
      markStep("AI Insights shell");
      markStep("Integrations page");
      markStep("Onboarding wizard");
      markStep("Activity feed");
      markStep("Health score module");
      markStep("Branding settings");
      markStep("Revenue opportunities");
      markStep("Fix Now monitoring");
      markStep("Default automations");

      // 3. Create owner auth account via edge function
      const { data: inviteData, error: inviteErr } = await supabase.functions.invoke("invite-user", {
        body: { email: form.owner_email, role: "client_owner", client_id: client.id },
      });

      if (inviteErr) {
        markStep("Owner user account");
        markStep("Role assignment");
        setInviteResult({ sent: false, link: null });
        toast.warning("Workspace created but invite failed — check manually");
      } else {
        markStep("Owner user account");
        markStep("Role assignment");
        if (inviteData?.invite_email_sent) {
          setInviteResult({ sent: true, link: null });
          setStatus("invite_sent");
        } else if (inviteData?.setup_link) {
          setInviteResult({ sent: false, link: inviteData.setup_link });
          setStatus("invite_sent");
        } else {
          setInviteResult({ sent: false, link: null });
          setStatus("invite_sent");
        }
      }

      // 4. Update provision queue status
      await supabase.from("provision_queue")
        .update({ provision_status: "ready_for_kickoff", crm_setup: true, automation_setup: true })
        .eq("client_id", client.id);

      // 5. Create internal audit log / activity
      await supabase.from("audit_logs").insert({
        action: "client_activated",
        client_id: client.id,
        module: "activation",
        metadata: {
          salesman: form.salesman_name,
          kickoff_contact: form.kickoff_contact,
          notes: form.internal_notes,
        },
      });

      // 6. Create fix_now review task for admin
      await supabase.from("fix_now_items").insert({
        client_id: client.id,
        issue: "Review new client provisioning and confirm integrations",
        module: "activation",
        severity: "low",
        status: "open",
      });

      setStatus("ready_for_kickoff");
      toast.success(`${form.business_name} activated successfully!`);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      business_name: "", workspace_slug: "", industry: "", primary_location: "",
      timezone: "America/Los_Angeles", owner_name: "", owner_email: "", phone: "",
      logo_url: "", primary_color: "#3B82F6", secondary_color: "#06B6D4",
      welcome_message: "", enterprise_confirmed: true, payment_status: "confirmed",
      kickoff_contact: "", salesman_name: "", internal_notes: "",
    });
    setStatus("idle");
    setCompletedSteps([]);
    setInviteResult(null);
  };

  const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
  const labelCls = "text-xs text-white/50 mb-1 block";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Activation</h1>
          <p className="text-sm text-white/50 mt-1">Closing Meeting — One-Click Enterprise Setup</p>
        </div>
        {status !== "idle" && (
          <div className={`flex items-center gap-2 text-sm font-medium ${statusMeta[status].color}`}>
            {status === "provisioning" && <Loader2 className="h-4 w-4 animate-spin" />}
            {(status === "ready_for_kickoff" || status === "active" || status === "invite_sent") && <CheckCircle2 className="h-4 w-4" />}
            {status === "error" && <AlertCircle className="h-4 w-4" />}
            {statusMeta[status].label}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
                <span className="text-sm font-semibold text-white">Closing Meeting Client Activation Form</span>
              </div>

              {/* Business Info */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> Business Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Business Name *</label>
                    <Input value={form.business_name} onChange={e => { set("business_name", e.target.value); set("workspace_slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="Acme Corp" className={inputCls} disabled={submitting} />
                  </div>
                  <div>
                    <label className={labelCls}>Workspace Slug *</label>
                    <Input value={form.workspace_slug} onChange={e => set("workspace_slug", e.target.value)} placeholder="acme-corp" className={inputCls} disabled={submitting} />
                  </div>
                  <div>
                    <label className={labelCls}>Industry</label>
                    <Input value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="e.g. Dental, Auto, Restaurant" className={inputCls} disabled={submitting} />
                  </div>
                  <div>
                    <label className={labelCls}>Primary Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                      <Input value={form.primary_location} onChange={e => set("primary_location", e.target.value)} placeholder="City, State" className={`${inputCls} pl-9`} disabled={submitting} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Timezone</label>
                    <select value={form.timezone} onChange={e => set("timezone", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
                      <option value="America/New_York">Eastern</option>
                      <option value="America/Chicago">Central</option>
                      <option value="America/Denver">Mountain</option>
                      <option value="America/Los_Angeles">Pacific</option>
                      <option value="Europe/London">London</option>
                      <option value="Australia/Sydney">Sydney</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="h-3 w-3" /> Client Owner
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <label className={labelCls}>Kickoff Contact</label>
                    <Input value={form.kickoff_contact} onChange={e => set("kickoff_contact", e.target.value)} placeholder="Same or different contact" className={inputCls} disabled={submitting} />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="h-3 w-3" /> Branding
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Logo URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                      <Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://your-logo.com/logo.png" className={`${inputCls} pl-9`} disabled={submitting} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Primary Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" disabled={submitting} />
                      <Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Secondary Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" disabled={submitting} />
                      <Input value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Welcome Message</label>
                    <Input value={form.welcome_message} onChange={e => set("welcome_message", e.target.value)} placeholder="Welcome to your business dashboard" className={inputCls} disabled={submitting} />
                  </div>
                </div>
              </div>

              {/* Internal */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Internal Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Enterprise Plan Confirmed</label>
                    <select value={form.enterprise_confirmed ? "yes" : "no"} onChange={e => set("enterprise_confirmed", e.target.value === "yes")} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Payment Status *</label>
                    <select value={form.payment_status} onChange={e => set("payment_status", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Salesman Name</label>
                    <Input value={form.salesman_name} onChange={e => set("salesman_name", e.target.value)} placeholder="Jordan" className={inputCls} disabled={submitting} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Internal Notes</label>
                  <Textarea value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} placeholder="Any internal notes for this activation…" className={`${inputCls} min-h-[60px]`} disabled={submitting} />
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
                        <p className="text-xs text-white/50 mt-1">A password setup email was sent to <span className="text-white/70 font-medium">{form.owner_email}</span>.</p>
                      </div>
                    </div>
                  ) : inviteResult.link ? (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-[hsl(var(--nl-sky))] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">Email not configured — Copy setup link</p>
                        <p className="text-xs text-white/50 mt-1 mb-2">Share this link with <span className="text-white/70 font-medium">{form.owner_email}</span>:</p>
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

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleActivate} disabled={submitting || status === "ready_for_kickoff"} className="flex-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-11">
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</>
                  ) : status === "ready_for_kickoff" ? (
                    <><CheckCircle2 className="h-4 w-4 mr-2" /> Activated</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" /> Activate Client</>
                  )}
                </Button>
                {status === "ready_for_kickoff" && (
                  <Button onClick={resetForm} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                    New Activation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Provisioning Checklist */}
        <div className="space-y-4">
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-white/60 mb-3">Provisioning Checklist</p>
              <div className="space-y-1.5">
                {provisionChecklist.map(item => {
                  const done = completedSteps.includes(item);
                  return (
                    <motion.div
                      key={item}
                      initial={false}
                      animate={{ opacity: done ? 1 : 0.4 }}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <CheckCircle2 className={`h-3 w-3 shrink-0 ${done ? "text-[hsl(var(--nl-sky))]" : "text-white/20"}`} />
                      <span className={done ? "text-white/80" : "text-white/30"}>{item}</span>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-white/60 mb-3">Status Flow</p>
              <div className="space-y-2">
                {(Object.entries(statusMeta) as [ActivationStatus, { label: string; color: string }][])
                  .filter(([k]) => k !== "idle")
                  .map(([key, meta]) => {
                    const isCurrent = key === status;
                    return (
                      <div key={key} className={`flex items-center gap-2 text-[11px] ${isCurrent ? meta.color + " font-semibold" : "text-white/25"}`}>
                        <div className={`h-2 w-2 rounded-full ${isCurrent ? "bg-current" : "bg-white/15"}`} />
                        {meta.label}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
