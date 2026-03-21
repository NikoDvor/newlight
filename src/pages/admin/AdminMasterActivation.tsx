import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { emitEvent } from "@/lib/automationEngine";
import { provisionWorkspaceDefaults, syncOnboardingStage } from "@/lib/workspaceProvisioner";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, ArrowLeft, ArrowRight, Loader2, Save, Zap,
  Palette, Users, Calendar, Mail, Star, UserPlus, DollarSign,
  TrendingUp, FileText, Headphones, Link2, Bell, ClipboardCheck, ClipboardList, ShoppingBag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { STEPS, defaultFormState, defaultIntegrations, type ActivationFormState, type CalendarConfig, type ServiceConfig } from "@/components/activation/activationTypes";
import { StepDealClose } from "@/components/activation/StepDealClose";
import { StepBranding } from "@/components/activation/StepBranding";
import { StepCRM } from "@/components/activation/StepCRM";
import { StepCalendar } from "@/components/activation/StepCalendar";
import { StepServices } from "@/components/activation/StepServices";
import { StepBookingForms } from "@/components/activation/StepBookingForms";
import { StepEmail } from "@/components/activation/StepEmail";
import { StepReviews } from "@/components/activation/StepReviews";
import { StepTeamSetup } from "@/components/activation/StepTeamSetup";
import { StepWorkforce } from "@/components/activation/StepWorkforce";
import { StepFinance } from "@/components/activation/StepFinance";
import { StepMarketing } from "@/components/activation/StepMarketing";
import { StepSupport } from "@/components/activation/StepSupport";
import { StepIntegrations } from "@/components/activation/StepIntegrations";
import { StepReview } from "@/components/activation/StepReview";
import { StepNotifications } from "@/components/activation/StepNotifications";

const TOTAL_STEPS = STEPS.length;

const stepIcons: Record<number, React.ReactNode> = {
  1: <Zap className="h-3.5 w-3.5" />, 2: <Palette className="h-3.5 w-3.5" />,
  3: <Users className="h-3.5 w-3.5" />, 4: <Calendar className="h-3.5 w-3.5" />,
  5: <ShoppingBag className="h-3.5 w-3.5" />, 6: <ClipboardList className="h-3.5 w-3.5" />,
  7: <Mail className="h-3.5 w-3.5" />, 8: <Star className="h-3.5 w-3.5" />,
  9: <UserPlus className="h-3.5 w-3.5" />, 10: <DollarSign className="h-3.5 w-3.5" />,
  11: <DollarSign className="h-3.5 w-3.5" />, 12: <TrendingUp className="h-3.5 w-3.5" />,
  13: <Headphones className="h-3.5 w-3.5" />, 14: <Link2 className="h-3.5 w-3.5" />,
  15: <ClipboardCheck className="h-3.5 w-3.5" />,
};

type DraftStatus = "not_started" | "in_progress" | "submitted" | "activated";

export default function AdminMasterActivation() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ActivationFormState>(defaultFormState());
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(!!clientId);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("not_started");
  const [clientName, setClientName] = useState("");

  // ── Existing-client mode: load client data + existing draft ──
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      setLoading(true);
      try {
        // Load client record
        const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
        if (!client) { toast.error("Client not found"); navigate("/admin/clients"); return; }

        setClientName(client.business_name);

        // Check for existing draft
        const { data: drafts } = await supabase
          .from("activation_drafts")
          .select("*")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (drafts && drafts.length > 0) {
          const draft = drafts[0];
          const saved = draft.form_data as any;
          if (saved && typeof saved === "object") {
            // Merge with defaults to handle any new fields
            setForm({ ...defaultFormState(), ...saved, integrations: { ...defaultIntegrations(), ...(saved.integrations || {}) } });
          }
          setStep(draft.current_step || 1);
          setDraftId(draft.id);
          setDraftStatus((draft.draft_status || "in_progress") as DraftStatus);
          if (draft.draft_status === "activated") setActivated(true);
        } else {
          // Pre-populate from client record
          setForm(prev => ({
            ...prev,
            business_name_confirmed: client.business_name || "",
            display_name: client.business_name || "",
            owner_name: (client as any).owner_name || "",
            owner_email: (client as any).owner_email || "",
            industry: (client as any).industry || "",
            primary_location: (client as any).primary_location || "",
            default_timezone: (client as any).timezone || "America/Los_Angeles",
            service_package: (client as any).service_package || "enterprise",
            company_name: client.business_name || "",
          }));
        }
      } catch (err: any) {
        toast.error("Failed to load client data");
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, navigate]);

  const set = useCallback((key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (draftStatus === "not_started") setDraftStatus("in_progress");
  }, [draftStatus]);

  const setIntegration = useCallback((name: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [name]: { ...prev.integrations[name], [field]: value },
      },
    }));
    if (draftStatus === "not_started") setDraftStatus("in_progress");
  }, [draftStatus]);

  const stepProps = { form, set, setIntegration, submitting };

  // ── Save Draft ──
  const handleSaveDraft = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const draftName = form.business_name_confirmed || form.display_name || clientName || "Untitled Draft";

      const draftPayload: any = {
        created_by: user.user?.id || null,
        client_id: clientId || null,
        draft_name: draftName,
        form_data: form as any,
        current_step: step,
        draft_status: draftStatus === "not_started" ? "in_progress" : draftStatus,
      };

      if (draftId) {
        await supabase.from("activation_drafts").update(draftPayload).eq("id", draftId);
      } else {
        const { data: newDraft } = await supabase.from("activation_drafts").insert(draftPayload).select().single();
        if (newDraft) setDraftId(newDraft.id);
      }

      if (draftStatus === "not_started") setDraftStatus("in_progress");
      toast.success("Draft saved successfully");
      await emitEvent({ eventKey: "onboarding_form_saved", payload: { step, draft_name: draftName, client_id: clientId } });
    } catch {
      toast.error("Failed to save draft");
    }
  };

  // ── Activate (existing client mode) ──
  const handleActivateExisting = async () => {
    if (!clientId) return;
    const paymentPending = form.payment_confirmed !== "confirmed";


    setSubmitting(true);
    try {
      // 1. Update client branding
      await supabase.from("client_branding").upsert({
        client_id: clientId,
        company_name: form.company_name || form.business_name_confirmed,
        display_name: form.display_name || null,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color || null,
        welcome_message: form.welcome_message || "Welcome to your business dashboard",
        tagline: form.tagline || null,
        app_display_name: form.app_display_name || null,
        workspace_header_name: form.workspace_header_name || null,
        calendar_title: form.calendar_title || null,
        finance_dashboard_title: form.finance_dashboard_title || null,
        report_header_title: form.report_header_title || null,
        login_branding_text: form.login_branding_text || null,
        dashboard_title: form.dashboard_title || null,
      }, { onConflict: "client_id" });

      // 2. Update billing
      await supabase.from("billing_accounts").upsert({
        client_id: clientId,
        billing_status: "active",
      }, { onConflict: "client_id" });

      // 3. Service catalog from configs
      const serviceConfigs: ServiceConfig[] = form.service_configs || [];
      for (const svc of serviceConfigs) {
        if (!svc.service_name) continue;
        await supabase.from("service_catalog" as any).upsert({
          client_id: clientId,
          service_name: svc.service_name,
          service_description: svc.service_description || null,
          display_price_text: svc.display_price_text || null,
          service_status: svc.service_status || "draft",
          display_order: 0,
        }, { onConflict: "client_id,service_name" as any }).select();
      }

      // 4. Calendar setup from configs (if any new ones)
      if (form.use_native_calendar === "yes") {
        const configs: CalendarConfig[] = form.calendar_configs || [];
        for (const cfg of configs) {
          if (!cfg.calendar_name) continue;
          const tz = form.default_timezone || "America/Los_Angeles";
          // Check if calendar already exists
          const { data: existingCal } = await supabase.from("calendars")
            .select("id").eq("client_id", clientId).eq("calendar_name", cfg.calendar_name).maybeSingle();
          if (existingCal) continue;

          const { data: cal } = await supabase.from("calendars").insert({
            client_id: clientId,
            calendar_name: cfg.calendar_name,
            calendar_type: cfg.calendar_type === "single" ? "booking" : cfg.calendar_type,
            timezone: tz,
            description: cfg.description || null,
            default_location: cfg.location_type || null,
          }).select().single();
          if (!cal) continue;

          const days = (cfg.availability_days || "1,2,3,4,5").split(",").map(d => parseInt(d.trim())).filter(d => !isNaN(d));
          for (const day of days) {
            await supabase.from("calendar_availability").insert({
              client_id: clientId, calendar_id: cal.id, day_of_week: day,
              start_time: cfg.availability_hours_start || "09:00",
              end_time: cfg.availability_hours_end || "17:00",
              slot_interval_minutes: parseInt(cfg.slot_interval) || 30, is_active: true,
            });
          }

          const typeNames = (cfg.appointment_types || "Consultation").split(",").map(t => t.trim()).filter(Boolean);
          for (const typeName of typeNames) {
            await supabase.from("calendar_appointment_types").insert({
              client_id: clientId, calendar_id: cal.id, name: typeName,
              duration_minutes: parseInt(cfg.default_duration) || 30,
              buffer_before: parseInt(cfg.buffer_before) || 0,
              buffer_after: parseInt(cfg.buffer_after) || 0,
              location_type: cfg.location_type || "virtual",
              meeting_link_type: cfg.meeting_link_type || null,
              confirmation_message: cfg.confirmation_message || null,
              reminders_enabled: cfg.reminders_enabled !== "no",
              is_active: cfg.active !== "no",
            });
          }
        }
      }

      // 5. Full-app provisioning (idempotent)
      await provisionWorkspaceDefaults(clientId, {
        industry: form.industry,
        timezone: form.default_timezone,
        skipIfExists: true,
        ownerEmail: form.owner_email,
        ownerName: form.owner_name,
      });

      // 6. Advance workspace to active
      await supabase.from("clients").update({
        onboarding_stage: "active",
        status: "active",
      } as any).eq("id", clientId);

      await supabase.from("provision_queue").update({
        provision_status: "ready_for_kickoff",
      }).eq("client_id", clientId);

      // 7. Audit + activity
      await Promise.all([
        supabase.from("audit_logs").insert({
          action: "client_activated_via_master_form",
          client_id: clientId,
          module: "activation",
          metadata: {
            payment_method: form.payment_method,
            monthly_fee: form.monthly_fee || null,
            setup_fee: form.setup_fee || null,
            account_manager: form.assigned_account_manager || null,
            package: form.service_package,
          },
        }),
        supabase.from("crm_activities").insert({
          client_id: clientId,
          activity_type: "client_activated",
          activity_note: `${form.business_name_confirmed || clientName} activated via master activation form`,
        }),
      ]);

      // 8. Update draft status
      if (draftId) {
        await supabase.from("activation_drafts").update({
          draft_status: "activated",
          form_data: form as any,
          current_step: step,
        }).eq("id", draftId);
      } else {
        const { data: user } = await supabase.auth.getUser();
        await supabase.from("activation_drafts").insert({
          client_id: clientId,
          created_by: user.user?.id || null,
          draft_name: form.business_name_confirmed || clientName,
          form_data: form as any,
          current_step: step,
          draft_status: "activated",
        });
      }

      // 9. Sync stage + emit events
      await syncOnboardingStage(clientId, "active");
      await emitEvent({
        eventKey: "activation_form_submitted",
        clientId,
        payload: { package: form.service_package },
      });

      setActivated(true);
      setDraftStatus("activated");
      toast.success(`${form.business_name_confirmed || clientName} is now live!`);
    } catch (err: any) {
      toast.error(err.message || "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Activate (new client / standalone mode – original behavior) ──
  const handleActivateNew = async () => {
    if (!form.business_name_confirmed || !form.owner_email) {
      toast.error("Business name and owner email are required");
      return;
    }
    const paymentPending = form.payment_confirmed !== "confirmed";


    setSubmitting(true);
    const slug = (form.display_name || form.business_name_confirmed).toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
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
      ]);

      await supabase.functions.invoke("invite-user", {
        body: { email: form.owner_email, role: "client_owner", client_id: client.id },
      });

      // Calendar setup from configs
      if (form.use_native_calendar === "yes") {
        const configs: CalendarConfig[] = form.calendar_configs || [];
        for (const cfg of configs) {
          if (!cfg.calendar_name) continue;
          const tz = form.default_timezone || "America/Los_Angeles";
          const { data: cal } = await supabase.from("calendars").insert({
            client_id: client.id, calendar_name: cfg.calendar_name,
            calendar_type: cfg.calendar_type === "single" ? "booking" : cfg.calendar_type,
            timezone: tz, description: cfg.description || null, default_location: cfg.location_type || null,
          }).select().single();
          if (!cal) continue;

          const days = (cfg.availability_days || "1,2,3,4,5").split(",").map(d => parseInt(d.trim())).filter(d => !isNaN(d));
          for (const day of days) {
            await supabase.from("calendar_availability").insert({
              client_id: client.id, calendar_id: cal.id, day_of_week: day,
              start_time: cfg.availability_hours_start || "09:00", end_time: cfg.availability_hours_end || "17:00",
              slot_interval_minutes: parseInt(cfg.slot_interval) || 30, is_active: true,
            });
          }
          const typeNames = (cfg.appointment_types || "Consultation").split(",").map(t => t.trim()).filter(Boolean);
          for (const typeName of typeNames) {
            await supabase.from("calendar_appointment_types").insert({
              client_id: client.id, calendar_id: cal.id, name: typeName,
              duration_minutes: parseInt(cfg.default_duration) || 30,
              buffer_before: parseInt(cfg.buffer_before) || 0, buffer_after: parseInt(cfg.buffer_after) || 0,
              location_type: cfg.location_type || "virtual", meeting_link_type: cfg.meeting_link_type || null,
              confirmation_message: cfg.confirmation_message || null,
              reminders_enabled: cfg.reminders_enabled !== "no", is_active: cfg.active !== "no",
            });
          }
        }
      }

      // Service catalog
      const serviceConfigs: ServiceConfig[] = form.service_configs || [];
      for (const svc of serviceConfigs) {
        if (!svc.service_name) continue;
        await supabase.from("service_catalog" as any).insert({
          client_id: client.id, service_name: svc.service_name,
          service_description: svc.service_description || null,
          display_price_text: svc.display_price_text || null,
          service_status: svc.service_status || "draft", display_order: 0,
        });
      }

      await Promise.all([
        supabase.from("provision_queue").update({ provision_status: "ready_for_kickoff", crm_setup: true, automation_setup: true }).eq("client_id", client.id),
        supabase.from("audit_logs").insert({
          action: "master_activation_completed", client_id: client.id, module: "activation",
          metadata: { package: form.service_package, crm_mode: form.crm_mode },
        }),
      ]);

      await provisionWorkspaceDefaults(client.id, {
        industry: form.industry, timezone: form.default_timezone, skipIfExists: true,
      });
      await syncOnboardingStage(client.id, "active");
      await emitEvent({ eventKey: "activation_form_submitted", clientId: client.id, payload: { package: form.service_package } });

      setActivated(true);
      toast.success(`${form.business_name_confirmed} activated successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = clientId ? handleActivateExisting : handleActivateNew;

  const renderStep = () => {
    switch (step) {
      case 1: return <StepDealClose {...stepProps} />;
      case 2: return <StepBranding {...stepProps} />;
      case 3: return <StepCRM {...stepProps} />;
      case 4: return <StepCalendar {...stepProps} />;
      case 5: return <StepServices {...stepProps} />;
      case 6: return <StepBookingForms {...stepProps} />;
      case 7: return <StepEmail {...stepProps} />;
      case 8: return <StepReviews {...stepProps} />;
      case 9: return <StepTeamSetup {...stepProps} />;
      case 10: return <StepWorkforce {...stepProps} />;
      case 11: return <StepFinance {...stepProps} />;
      case 12: return <StepMarketing {...stepProps} />;
      case 13: return <StepSupport {...stepProps} />;
      case 14: return <StepIntegrations {...stepProps} />;
      case 15: return <StepReview {...stepProps} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-white/40 animate-spin" />
      </div>
    );
  }

  const draftStatusLabel: Record<DraftStatus, { text: string; cls: string }> = {
    not_started: { text: "Not Started", cls: "bg-white/10 text-white/50" },
    in_progress: { text: "In Progress", cls: "bg-[hsla(40,96%,60%,.15)] text-[hsl(40,96%,68%)]" },
    submitted: { text: "Submitted", cls: "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-sky))]" },
    activated: { text: "Activated", cls: "bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(clientId ? "/admin/clients" : "/admin/activation")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="h-3 w-3" /> {clientId ? "Back to Clients" : "Back to Activation"}
          </button>
          <h1 className="text-xl font-bold text-white">
            {clientId ? `Activate — ${clientName}` : "Master Activation Form"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-white/50">Step {step} of {STEPS.length}</p>
            <Badge className={`text-[10px] px-2 py-0 ${draftStatusLabel[draftStatus].cls} border-0`}>
              {draftStatusLabel[draftStatus].text}
            </Badge>
          </div>
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
          <div className="flex items-center gap-3 flex-wrap">
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
              disabled={submitting || activated}
              className="border-white/10 text-white hover:bg-white/10"
            >
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>

            <div className="flex-1" />

            {step < TOTAL_STEPS ? (
              <Button
                onClick={() => setStep(Math.min(TOTAL_STEPS, step + 1))}
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
