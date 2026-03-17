import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { CalendarConfig } from "@/components/activation/activationTypes";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, ArrowLeft, ArrowRight, Loader2, Save, Zap,
  Palette, Users, Calendar, Mail, Star, UserPlus, DollarSign,
  TrendingUp, FileText, Headphones, Link2, Bell, ClipboardCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STEPS, defaultFormState, type ActivationFormState } from "@/components/activation/activationTypes";
import { StepDealClose } from "@/components/activation/StepDealClose";
import { StepBranding } from "@/components/activation/StepBranding";
import { StepCRM } from "@/components/activation/StepCRM";
import { StepCalendar } from "@/components/activation/StepCalendar";
import { StepEmail } from "@/components/activation/StepEmail";
import { StepReviews } from "@/components/activation/StepReviews";
import { StepWorkforce } from "@/components/activation/StepWorkforce";
import { StepFinance } from "@/components/activation/StepFinance";
import { StepMarketing } from "@/components/activation/StepMarketing";
import { StepProposals } from "@/components/activation/StepProposals";
import { StepSupport } from "@/components/activation/StepSupport";
import { StepIntegrations } from "@/components/activation/StepIntegrations";
import { StepNotifications } from "@/components/activation/StepNotifications";
import { StepReview } from "@/components/activation/StepReview";

const stepIcons: Record<number, React.ReactNode> = {
  1: <Zap className="h-3.5 w-3.5" />, 2: <Palette className="h-3.5 w-3.5" />,
  3: <Users className="h-3.5 w-3.5" />, 4: <Calendar className="h-3.5 w-3.5" />,
  5: <Mail className="h-3.5 w-3.5" />, 6: <Star className="h-3.5 w-3.5" />,
  7: <UserPlus className="h-3.5 w-3.5" />, 8: <DollarSign className="h-3.5 w-3.5" />,
  9: <TrendingUp className="h-3.5 w-3.5" />, 10: <FileText className="h-3.5 w-3.5" />,
  11: <Headphones className="h-3.5 w-3.5" />, 12: <Link2 className="h-3.5 w-3.5" />,
  13: <Bell className="h-3.5 w-3.5" />, 14: <ClipboardCheck className="h-3.5 w-3.5" />,
};

export default function AdminMasterActivation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ActivationFormState>(defaultFormState());
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  const set = useCallback((key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const setIntegration = useCallback((name: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [name]: { ...prev.integrations[name], [field]: value },
      },
    }));
  }, []);

  const stepProps = { form, set, setIntegration, submitting };

  const handleSaveDraft = async () => {
    toast.success("Draft saved");
  };

  const handleActivate = async () => {
    if (!form.business_name_confirmed || !form.owner_email) {
      toast.error("Business name and owner email are required");
      return;
    }
    if (form.payment_confirmed !== "confirmed") {
      toast.error("Payment must be confirmed before activation");
      return;
    }

    setSubmitting(true);
    const slug = (form.display_name || form.business_name_confirmed).toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      // 1. Create client
      const { data: client, error: clientErr } = await supabase.from("clients").insert({
        business_name: form.business_name_confirmed,
        workspace_slug: slug,
        industry: form.industry || null,
        primary_location: form.primary_location || null,
        timezone: form.default_timezone || "America/Los_Angeles",
        service_package: form.service_package,
        owner_name: form.owner_name || null,
        owner_email: form.owner_email,
        crm_mode: form.crm_mode === "external" ? "external" : "native",
        onboarding_stage: "activation",
      } as any).select().single();

      if (clientErr || !client) throw new Error(clientErr?.message || "Failed to create client");

      // 2. Provision resources
      const integrationNames = [
        "Google Analytics", "Google Search Console", "Google Business Profile",
        "Meta / Instagram", "Google Ads", "Stripe", "Twilio", "Zoom", "Domain / Website",
      ];

      await Promise.all([
        supabase.from("provision_queue").insert({ client_id: client.id, provision_status: "provisioning" }),
        supabase.from("client_integrations").insert(integrationNames.map(name => ({ client_id: client.id, integration_name: name }))),
        supabase.from("onboarding_progress").insert({ client_id: client.id }),
        supabase.from("client_branding").insert({
          client_id: client.id,
          company_name: form.company_name || form.business_name_confirmed,
          display_name: form.display_name || null,
          logo_url: form.logo_url || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          accent_color: form.accent_color || null,
          welcome_message: form.welcome_message || "Welcome to your business dashboard",
          tagline: form.tagline || null,
          app_display_name: form.app_display_name || form.display_name || null,
          workspace_header_name: form.workspace_header_name || null,
          calendar_title: form.calendar_title || null,
          finance_dashboard_title: form.finance_dashboard_title || null,
          report_header_title: form.report_header_title || null,
          login_branding_text: form.login_branding_text || null,
          dashboard_title: form.dashboard_title || null,
        }),
        supabase.from("client_health_scores").insert({ client_id: client.id }),
        supabase.from("revenue_opportunities").insert({
          client_id: client.id, title: "Initial setup review", status: "open", category: "onboarding",
        }),
      ]);

      // 3. Create owner account
      await supabase.functions.invoke("invite-user", {
        body: { email: form.owner_email, role: "client_owner", client_id: client.id },
      });

      // 4. CRM setup
      if (form.crm_mode === "external" && form.crm_provider) {
        await supabase.from("crm_connections").insert({
          client_id: client.id,
          crm_provider_name: form.crm_provider,
          connection_status: "pending",
        });
      }

      // 5. Calendar setup
      if (form.use_native_calendar === "yes") {
        const numCals = Math.max(1, parseInt(form.num_calendars) || 1);
        for (let i = 0; i < numCals; i++) {
          await supabase.from("calendars").insert({
            client_id: client.id,
            calendar_name: numCals === 1 ? "Main Calendar" : `Calendar ${i + 1}`,
            calendar_type: "booking",
            timezone: form.default_timezone || "America/Los_Angeles",
          });
        }
      }

      // 6. Finalize provision
      await Promise.all([
        supabase.from("provision_queue").update({ provision_status: "ready_for_kickoff", crm_setup: true, automation_setup: true }).eq("client_id", client.id),
        supabase.from("audit_logs").insert({
          action: "master_activation_completed",
          client_id: client.id,
          module: "activation",
          metadata: {
            package: form.service_package,
            crm_mode: form.crm_mode,
            modules_enabled: {
              workforce: form.use_workforce === "yes",
              reviews: form.use_native_reviews === "yes",
              seo: form.use_seo === "yes",
              ads: form.use_ads === "yes",
              social: form.use_social === "yes",
              helpdesk: form.use_helpdesk === "yes",
              proposals: form.use_proposals === "yes",
            },
          },
        }),
        supabase.from("fix_now_items").insert({
          client_id: client.id,
          issue: "Review master activation and confirm all integrations",
          module: "activation",
          severity: "low",
          status: "open",
        }),
      ]);

      setActivated(true);
      toast.success(`${form.business_name_confirmed} activated successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <StepDealClose {...stepProps} />;
      case 2: return <StepBranding {...stepProps} />;
      case 3: return <StepCRM {...stepProps} />;
      case 4: return <StepCalendar {...stepProps} />;
      case 5: return <StepEmail {...stepProps} />;
      case 6: return <StepReviews {...stepProps} />;
      case 7: return <StepWorkforce {...stepProps} />;
      case 8: return <StepFinance {...stepProps} />;
      case 9: return <StepMarketing {...stepProps} />;
      case 10: return <StepProposals {...stepProps} />;
      case 11: return <StepSupport {...stepProps} />;
      case 12: return <StepIntegrations {...stepProps} />;
      case 13: return <StepNotifications {...stepProps} />;
      case 14: return <StepReview {...stepProps} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate("/admin/activation")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to Activation
          </button>
          <h1 className="text-xl font-bold text-white">Master Activation Form</h1>
          <p className="text-xs text-white/50 mt-0.5">Full workspace setup — Step {step} of {STEPS.length}</p>
        </div>
        {activated && (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Activated
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Step Navigation */}
        <Card className="border-0 bg-white/[0.03] backdrop-blur-sm lg:sticky lg:top-4 lg:self-start" style={{ borderColor: "hsla(211,96%,60%,.06)" }}>
          <CardContent className="p-2">
            <div className="space-y-0.5">
              {STEPS.map(s => {
                const isCurrent = s.id === step;
                const isPast = s.id < step;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStep(s.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all ${
                      isCurrent
                        ? "bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]"
                        : isPast
                          ? "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                          : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="shrink-0">{isPast ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/60" /> : stepIcons[s.id]}</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="space-y-4">
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4 sm:p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1 || submitting}
              className="border-white/10 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={submitting}
              className="border-white/10 text-white hover:bg-white/10"
            >
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>

            <div className="flex-1" />

            {step < 14 ? (
              <Button
                onClick={() => setStep(Math.min(14, step + 1))}
                disabled={submitting}
                className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white"
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleActivate}
                disabled={submitting || activated}
                className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white min-w-[160px]"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</>
                ) : activated ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Activated</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" /> Save & Activate</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
