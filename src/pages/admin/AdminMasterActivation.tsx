import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { emitEvent } from "@/lib/automationEngine";
import { provisionWorkspaceDefaults, syncOnboardingStage } from "@/lib/workspaceProvisioner";
import { hydrateWorkspaceFromActivation, checkSyncStatus } from "@/lib/activationHydration";
import { generateProposalFromWizard, markProposalAccepted } from "@/lib/proposalWizard";
import { createBillingFromProposal } from "@/lib/billingEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, ArrowLeft, ArrowRight, Loader2, Save, Zap,
  Palette, Users, Calendar, Mail, Star, UserPlus, DollarSign,
  TrendingUp, FileText, Headphones, Link2, ClipboardCheck,
  ShoppingBag, Target, CreditCard, Gavel, AlertTriangle, Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { WIZARD_STAGES, TOTAL_WIZARD_STAGES, defaultFormState, defaultIntegrations, type ActivationFormState, type CalendarConfig, type ServiceConfig } from "@/components/activation/activationTypes";
import { StepQualification } from "@/components/activation/StepQualification";
import { StepProposalClosePrep } from "@/components/activation/StepProposalClosePrep";
import { StepCloseOutcome } from "@/components/activation/StepCloseOutcome";
import { StepDealClose } from "@/components/activation/StepDealClose";
import { StepBranding } from "@/components/activation/StepBranding";
import { StepCRM } from "@/components/activation/StepCRM";
import { StepCalendar } from "@/components/activation/StepCalendar";
import { StepServices } from "@/components/activation/StepServices";
import { StepBookingForms } from "@/components/activation/StepBookingForms";
import { StepEmail } from "@/components/activation/StepEmail";
import { StepReviews } from "@/components/activation/StepReviews";
import { StepTeamSetup } from "@/components/activation/StepTeamSetup";
import { StepIntegrations } from "@/components/activation/StepIntegrations";
import { StepReview } from "@/components/activation/StepReview";
import { StepProfileSelection } from "@/components/activation/StepProfileSelection";

const stageIcons: Record<number, React.ReactNode> = {
  1: <Target className="h-3.5 w-3.5" />,
  2: <FileText className="h-3.5 w-3.5" />,
  3: <Gavel className="h-3.5 w-3.5" />,
  4: <CreditCard className="h-3.5 w-3.5" />,
  5: <Palette className="h-3.5 w-3.5" />,
  6: <Mail className="h-3.5 w-3.5" />,
  7: <ClipboardCheck className="h-3.5 w-3.5" />,
};

type DraftStatus = "not_started" | "in_progress" | "close_pending" | "close_lost" | "submitted" | "activated";

/** Clamp legacy 15-step drafts safely into 7-stage range */
function clampStage(step: number): number {
  if (step <= 0) return 1;
  if (step > TOTAL_WIZARD_STAGES) return TOTAL_WIZARD_STAGES;
  return step;
}

/** Map old draft_status values to new set */
function normalizeDraftStatus(s: string): DraftStatus {
  if (s === "activated") return "activated";
  if (s === "submitted") return "submitted";
  if (s === "close_pending") return "close_pending";
  if (s === "close_lost") return "close_lost";
  return s === "not_started" ? "not_started" : "in_progress";
}

export default function AdminMasterActivation() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();

  const [stage, setStage] = useState(1);
  const [form, setForm] = useState<ActivationFormState>(defaultFormState());
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(!!clientId);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("not_started");
  const [clientName, setClientName] = useState("");
  const [syncStatus, setSyncStatus] = useState<{ complete: boolean; missing: string[] } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // ── Load existing client + draft ──
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
        if (!client) { toast.error("Client not found"); navigate("/admin/clients"); return; }

        setClientName(client.business_name);

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
            setForm({ ...defaultFormState(), ...saved, integrations: { ...defaultIntegrations(), ...(saved.integrations || {}) } });
          }
          setStage(clampStage(draft.current_step || 1));
          setDraftId(draft.id);
          setDraftStatus(normalizeDraftStatus(draft.draft_status || "in_progress"));
          if (draft.draft_status === "activated") setActivated(true);
        } else {
          // Already-provisioned client with no draft → auto-create at Stage 4
          const isProvisioned = client.status === "active" || client.status === "provisioned" || !!(client as any).source_appointment_id;
          const startStage = isProvisioned ? 4 : 1;
          const initialForm = {
            ...defaultFormState(),
            business_name_confirmed: client.business_name || "",
            display_name: client.business_name || "",
            owner_name: (client as any).owner_name || "",
            owner_email: (client as any).owner_email || "",
            industry: (client as any).industry || "",
            primary_location: (client as any).primary_location || "",
            default_timezone: (client as any).timezone || "America/Los_Angeles",
            service_package: (client as any).service_package || "enterprise",
            company_name: client.business_name || "",
            ...(isProvisioned ? {
              close_outcome: "won",
              provisional_profile: (client as any).provisional_profile || "",
              business_type: (client as any).business_type || "",
            } : {}),
          };
          setForm(initialForm);
          setStage(startStage);

          if (isProvisioned) {
            // Persist the auto-created draft so future opens resume at Stage 4
            const { data: user } = await supabase.auth.getUser();
            const { data: newDraft } = await supabase.from("activation_drafts").insert({
              client_id: clientId,
              current_step: startStage,
              draft_status: "in_progress",
              draft_name: client.business_name || "Untitled",
              form_data: initialForm as any,
              created_by: user.user?.id || null,
            }).select().single();
            if (newDraft) setDraftId(newDraft.id);
            setDraftStatus("in_progress");
          }
        }
      } catch {
        toast.error("Failed to load client data");
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, navigate]);

  useEffect(() => {
    if (!clientId) return;
    checkSyncStatus(clientId).then(setSyncStatus).catch(() => {});
  }, [clientId, activated]);

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

  // ── Close outcome state checks ──
  const isWon = form.close_outcome === "won";
  const isLost = form.close_outcome === "lost";
  const isPending = form.close_outcome === "pending";
  const isRevised = form.close_outcome === "revised";
  const postCloseUnlocked = isWon; // only Won unlocks stages 4-7

  // ── Can navigate to stage? ──
  const canAccessStage = (s: number): boolean => {
    if (s <= 3) return true; // stages 1-3 always accessible
    if (s <= 7) return postCloseUnlocked; // stages 4-7 only after Won
    return false;
  };

  // ── Save Draft ──
  const handleSaveDraft = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const draftName = form.business_name_confirmed || form.display_name || clientName || "Untitled Draft";

      // Determine draft status from close outcome
      let newDraftStatus = draftStatus;
      if (draftStatus === "not_started") newDraftStatus = "in_progress";
      if (isLost) newDraftStatus = "close_lost";
      if (isPending) newDraftStatus = "close_pending";

      const draftPayload: any = {
        created_by: user.user?.id || null,
        client_id: clientId || null,
        draft_name: draftName,
        form_data: form as any,
        current_step: stage,
        draft_status: newDraftStatus,
      };

      if (draftId) {
        await supabase.from("activation_drafts").update(draftPayload).eq("id", draftId);
      } else {
        const { data: newDraft } = await supabase.from("activation_drafts").insert(draftPayload).select().single();
        if (newDraft) setDraftId(newDraft.id);
      }

      setDraftStatus(newDraftStatus);
      toast.success("Draft saved successfully");
      await emitEvent({ eventKey: "onboarding_form_saved", payload: { stage, draft_name: draftName, client_id: clientId } });
    } catch {
      toast.error("Failed to save draft");
    }
  };

  // ── CRM sync on stage transition ──
  const syncDealOnOutcome = async () => {
    if (!clientId) return;

    // Find the deal linked to this client
    const { data: deals } = await supabase.from("crm_deals")
      .select("id, pipeline_stage")
      .eq("client_id", clientId)
      .neq("pipeline_stage", "closed_won")
      .neq("pipeline_stage", "closed_lost")
      .order("created_at", { ascending: false })
      .limit(1);

    const deal = deals?.[0];
    if (!deal) return;

    let pipelineStage = deal.pipeline_stage;
    let dealStatus = "open";

    switch (form.close_outcome) {
      case "won":
        pipelineStage = "closed_won";
        dealStatus = "won";
        break;
      case "lost":
        pipelineStage = "closed_lost";
        dealStatus = "lost";
        break;
      case "pending":
      case "revised":
        pipelineStage = "negotiation";
        dealStatus = "open";
        break;
    }

    await supabase.from("crm_deals").update({
      pipeline_stage: pipelineStage,
      status: dealStatus,
      ...(form.close_outcome === "won" || form.close_outcome === "lost"
        ? { close_date: new Date().toISOString().split("T")[0] }
        : {}),
    }).eq("id", deal.id);

    // Update lead status
    const { data: leads } = await supabase.from("crm_leads")
      .select("id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (leads?.[0]) {
      const leadStatus = form.close_outcome === "won" ? "converted"
        : form.close_outcome === "lost" ? "lost" : "new_lead";
      await supabase.from("crm_leads").update({ lead_status: leadStatus }).eq("id", leads[0].id);
    }

    // Log
    await Promise.all([
      supabase.from("crm_activities").insert({
        client_id: clientId,
        activity_type: `deal_${form.close_outcome}`,
        activity_note: `Deal marked as ${form.close_outcome}${form.close_outcome === "lost" ? `: ${form.lost_reason || "No reason given"}` : ""}${form.close_outcome === "pending" ? `: ${form.pending_reason || ""}` : ""}`,
      }),
      supabase.from("audit_logs").insert({
        action: `wizard_close_outcome_${form.close_outcome}`,
        client_id: clientId,
        module: "activation",
        metadata: {
          close_outcome: form.close_outcome,
          deal_id: deal.id,
          pending_reason: form.pending_reason || null,
          revision_notes: form.revision_notes || null,
          lost_reason: form.lost_reason || null,
          next_follow_up_at: form.next_follow_up_at || null,
        },
      }),
    ]);
  };

  // ── Stage 2 → Proposal creation/update ──
  const handleStage2Proposal = async () => {
    if (!clientId) return;

    // Find deal for this client
    const { data: deals } = await supabase.from("crm_deals")
      .select("id, contact_id, company_id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1);
    const deal = deals?.[0];

    const isRevision = form.close_outcome === "revised" || form.proposal_status === "revised";

    const result = await generateProposalFromWizard({
      proposalId: form.proposal_id || undefined,
      clientId,
      dealId: deal?.id,
      contactId: deal?.contact_id || undefined,
      companyId: deal?.company_id || undefined,
      servicePackage: form.service_package,
      setupFee: form.setup_fee,
      monthlyFee: form.monthly_fee,
      contractTerm: form.contract_term,
      salesNotes: form.sales_notes,
      businessName: form.business_name_confirmed || clientName,
      isRevision,
    });

    if (result) {
      // Persist proposal_id immediately into form state
      set("proposal_id", result.proposalId);
      set("proposal_status", isRevision ? "revised" : "generated");
      toast.success(`Proposal ${result.action === "created" ? "created" : `updated to v${result.version}`}`);
    } else {
      toast.error("Failed to create/update proposal");
    }
  };

  // ── Stage 3 Won → Billing + contract creation ──
  const handleWonBilling = async () => {
    if (!clientId || !form.proposal_id) return;

    // Mark proposal accepted
    await markProposalAccepted(form.proposal_id, clientId);
    set("proposal_status", "accepted");

    // Create billing (deduplicated internally)
    const billingResult = await createBillingFromProposal(form.proposal_id, { pendingSignature: true });

    if (billingResult) {
      set("billing_account_id", billingResult.billingAccountId);
      set("contract_record_id", billingResult.contractRecordId || "");
      set("invoice_id", billingResult.invoiceId || "");

      await supabase.from("crm_activities").insert({
        client_id: clientId,
        activity_type: billingResult.reused ? "billing_reused" : "billing_created",
        activity_note: `Billing ${billingResult.reused ? "reused existing" : "created"} on Won — proposal ${form.proposal_id}`,
      });

      toast.success(billingResult.reused ? "Billing records already exist — reused" : "Billing + contract records created");
    }
  };

  // ── Stage navigation with outcome branching ──
  const handleNext = async () => {
    // Stage 2: create/update proposal before moving forward
    if (stage === 2) {
      await handleStage2Proposal();
      await handleSaveDraft();
    }

    // Stage 3: Close Outcome — sync deal before proceeding
    if (stage === 3 && form.close_outcome) {
      await syncDealOnOutcome();

      // Won: create billing
      if (isWon) {
        await handleWonBilling();
      }

      await handleSaveDraft();

      if (isRevised) {
        setStage(2); // go back to Proposal
        toast.info("Returning to Proposal stage for revision");
        return;
      }
      if (isPending) {
        toast.info("Deal marked as Pending — saved for follow-up");
        return; // stay on stage 3
      }
      if (isLost) {
        // Don't mark proposal as accepted on Lost
        if (form.proposal_id) {
          await supabase.from("proposals").update({
            proposal_status: "rejected",
          } as any).eq("id", form.proposal_id);
          set("proposal_status", "rejected");
        }
        toast.info("Deal marked as Lost");
        return; // stay on stage 3
      }
    }

    // Normal forward
    const next = Math.min(TOTAL_WIZARD_STAGES, stage + 1);
    if (canAccessStage(next)) {
      setStage(next);
    }
  };

  // ── Activate (Stage 7) ──
  const handleActivate = async () => {
    if (!clientId) return;
    const paymentPending = form.payment_confirmed !== "confirmed";
    if (paymentPending) toast.warning("Activating with pending payment — billing will show Pending Payment");

    const targetStage = paymentPending ? "awaiting_payment" : "active";

    setSubmitting(true);
    try {
      // 1. Hydration sync
      const hydrationResult = await hydrateWorkspaceFromActivation(clientId, form);
      if (hydrationResult.errors.length > 0) {
        // Hydration had sync issues
        toast.warning(`Some fields had sync issues: ${hydrationResult.errors.length} error(s)`);
      }

      // 2. Calendar setup from configs
      if (form.use_native_calendar === "yes") {
        const configs: CalendarConfig[] = form.calendar_configs || [];
        for (const cfg of configs) {
          if (!cfg.calendar_name) continue;
          const tz = form.default_timezone || "America/Los_Angeles";
          const { data: existingCal } = await supabase.from("calendars")
            .select("id").eq("client_id", clientId).eq("calendar_name", cfg.calendar_name).maybeSingle();
          if (existingCal) continue;

          const { data: cal } = await supabase.from("calendars").insert({
            client_id: clientId, calendar_name: cfg.calendar_name,
            calendar_type: cfg.calendar_type === "single" ? "booking" : cfg.calendar_type,
            timezone: tz, description: cfg.description || null, default_location: cfg.location_type || null,
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
              buffer_before: parseInt(cfg.buffer_before) || 0, buffer_after: parseInt(cfg.buffer_after) || 0,
              location_type: cfg.location_type || "virtual", meeting_link_type: cfg.meeting_link_type || null,
              confirmation_message: cfg.confirmation_message || null,
              reminders_enabled: cfg.reminders_enabled !== "no", is_active: cfg.active !== "no",
            });
          }
        }
      }

      // 3. Full-app provisioning
      await provisionWorkspaceDefaults(clientId, {
        industry: form.industry, timezone: form.default_timezone,
        skipIfExists: true, ownerEmail: form.owner_email, ownerName: form.owner_name,
      });

      // 4. Set onboarding_stage — only here, not at Close Outcome
      await supabase.from("clients").update({
        onboarding_stage: targetStage,
        status: targetStage === "active" ? "active" : "activation_in_progress",
      } as any).eq("id", clientId);

      await supabase.from("provision_queue").update({
        provision_status: "ready_for_kickoff",
      }).eq("client_id", clientId);

      // 5. Audit + activity
      await Promise.all([
        supabase.from("audit_logs").insert({
          action: "client_activated_via_wizard",
          client_id: clientId,
          module: "activation",
          metadata: {
            payment_method: form.payment_method,
            monthly_fee: form.monthly_fee || null,
            setup_fee: form.setup_fee || null,
            account_manager: form.assigned_account_manager || null,
            package: form.service_package,
            hydration_synced: hydrationResult.synced.length,
            hydration_errors: hydrationResult.errors.length,
          },
        }),
        supabase.from("crm_activities").insert({
          client_id: clientId,
          activity_type: "client_activated",
          activity_note: `${form.business_name_confirmed || clientName} activated via master wizard — Stage 7`,
        }),
      ]);

      // 6. Update draft
      if (draftId) {
        await supabase.from("activation_drafts").update({
          draft_status: "activated", form_data: form as any, current_step: stage,
        }).eq("id", draftId);
      }

      // 7. Sync + emit
      await syncOnboardingStage(clientId, targetStage);
      await emitEvent({
        eventKey: "activation_form_submitted", clientId,
        payload: { package: form.service_package, payment_status: form.payment_confirmed },
      });

      setActivated(true);
      setDraftStatus("activated");
      toast.success(paymentPending
        ? `${form.business_name_confirmed || clientName} activated — awaiting payment`
        : `${form.business_name_confirmed || clientName} is now live!`
      );
    } catch (err: any) {
      toast.error(err.message || "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Manual re-sync ──
  const handleResync = async () => {
    if (!clientId) return;
    setSyncing(true);
    try {
      const result = await hydrateWorkspaceFromActivation(clientId, form);
      const status = await checkSyncStatus(clientId);
      setSyncStatus(status);
      if (result.errors.length > 0) {
        toast.warning(`Sync completed with ${result.errors.length} error(s)`);
      } else {
        toast.success(`Data sync complete — ${result.synced.length} items synced`);
      }
    } catch (e: any) {
      toast.error("Sync failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Render current stage content ──
  const renderStage = () => {
    switch (stage) {
      case 1: return <StepQualification {...stepProps} />;
      case 2: return <StepProposalClosePrep {...stepProps} />;
      case 3: return <StepCloseOutcome {...stepProps} />;
      case 4:
        return (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-white/[0.04] border border-white/10 mb-4">
              <TabsTrigger value="profile" className="text-[11px] data-[state=active]:bg-white/10">Automation Profile</TabsTrigger>
              <TabsTrigger value="payment" className="text-[11px] data-[state=active]:bg-white/10">Payment / Details</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              {clientId ? (
                <StepProfileSelection form={form} set={set} clientId={clientId} />
              ) : (
                <p className="text-xs text-white/40">Save client first to configure profile.</p>
              )}
            </TabsContent>
            <TabsContent value="payment"><StepDealClose {...stepProps} /></TabsContent>
          </Tabs>
        );
      case 5:
        return (
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-white/[0.04] border border-white/10 mb-4">
              <TabsTrigger value="branding" className="text-[11px] data-[state=active]:bg-white/10">Branding</TabsTrigger>
              <TabsTrigger value="crm" className="text-[11px] data-[state=active]:bg-white/10">CRM</TabsTrigger>
              <TabsTrigger value="calendar" className="text-[11px] data-[state=active]:bg-white/10">Calendar</TabsTrigger>
              <TabsTrigger value="services" className="text-[11px] data-[state=active]:bg-white/10">Services</TabsTrigger>
            </TabsList>
            <TabsContent value="branding"><StepBranding {...stepProps} /></TabsContent>
            <TabsContent value="crm"><StepCRM {...stepProps} /></TabsContent>
            <TabsContent value="calendar"><StepCalendar {...stepProps} /></TabsContent>
            <TabsContent value="services"><StepServices {...stepProps} /></TabsContent>
          </Tabs>
        );
      case 6:
        return (
          <Tabs defaultValue="messaging" className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-white/[0.04] border border-white/10 mb-4">
              <TabsTrigger value="messaging" className="text-[11px] data-[state=active]:bg-white/10">Messaging</TabsTrigger>
              <TabsTrigger value="reviews" className="text-[11px] data-[state=active]:bg-white/10">Reviews</TabsTrigger>
              <TabsTrigger value="team" className="text-[11px] data-[state=active]:bg-white/10">Team</TabsTrigger>
              <TabsTrigger value="integrations" className="text-[11px] data-[state=active]:bg-white/10">Integrations</TabsTrigger>
            </TabsList>
            <TabsContent value="messaging"><StepEmail {...stepProps} /></TabsContent>
            <TabsContent value="reviews"><StepReviews {...stepProps} /></TabsContent>
            <TabsContent value="team"><StepTeamSetup {...stepProps} /></TabsContent>
            <TabsContent value="integrations"><StepIntegrations {...stepProps} /></TabsContent>
          </Tabs>
        );
      case 7: return <StepReview {...stepProps} />;
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
    close_pending: { text: "Close Pending", cls: "bg-[hsla(40,96%,60%,.15)] text-[hsl(40,96%,68%)]" },
    close_lost: { text: "Lost", cls: "bg-red-500/15 text-red-400" },
    submitted: { text: "Submitted", cls: "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-sky))]" },
    activated: { text: "Activated", cls: "bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]" },
  };

  // Determine if Next button should show vs Activate
  const isLastStage = stage === TOTAL_WIZARD_STAGES;
  const showActivateButton = isLastStage && postCloseUnlocked;

  // Stage 3 special next label
  const getNextLabel = () => {
    if (stage === 3) {
      if (!form.close_outcome) return "Select Outcome";
      if (isWon) return "Continue to Activation";
      if (isPending) return "Save as Pending";
      if (isRevised) return "Return to Proposal";
      if (isLost) return "Save as Lost";
    }
    return "Next";
  };

  const nextDisabled = () => {
    if (submitting) return true;
    if (stage === 3 && !form.close_outcome) return true;
    if (stage > 3 && !postCloseUnlocked) return true;
    return false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(clientId ? "/admin/clients" : "/admin/activation")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="h-3 w-3" /> {clientId ? "Back to Clients" : "Back to Activation"}
          </button>
          <h1 className="text-xl font-bold text-white">
            {clientId ? `Sales Wizard — ${clientName}` : "Master Sales Wizard"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-white/50">Stage {stage} of {TOTAL_WIZARD_STAGES}</p>
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

      {/* Data Sync Status */}
      {clientId && syncStatus && (
        <div className={`rounded-xl p-3 flex items-center justify-between ${syncStatus.complete ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
          <div className="flex items-center gap-2">
            {syncStatus.complete ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span className="text-xs font-medium text-emerald-300">Data Sync Complete</span></>
            ) : (
              <><Loader2 className="h-4 w-4 text-amber-400" /><span className="text-xs font-medium text-amber-300">Missing: {syncStatus.missing.join(", ")}</span></>
            )}
          </div>
          {!syncStatus.complete && (
            <Button size="sm" variant="ghost" onClick={handleResync} disabled={syncing}
              className="text-[10px] h-6 text-amber-300 hover:bg-amber-500/10">
              {syncing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Syncing…</> : "Sync Now"}
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Stage Navigation */}
        <Card className="border-0 bg-white/[0.03] backdrop-blur-sm lg:sticky lg:top-4 lg:self-start" style={{ borderColor: "hsla(211,96%,60%,.06)" }}>
          <CardContent className="p-2">
            <div className="space-y-0.5">
              {WIZARD_STAGES.map(s => {
                const isCurrent = s.id === stage;
                const isPast = s.id < stage;
                const locked = !canAccessStage(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => { if (!locked) setStage(s.id); }}
                    disabled={locked}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all ${
                      locked
                        ? "text-white/20 cursor-not-allowed"
                        : isCurrent
                          ? "bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]"
                          : isPast
                            ? "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                            : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="shrink-0">
                      {locked ? <Lock className="h-3.5 w-3.5 text-white/15" /> : isPast ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/60" /> : stageIcons[s.id]}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Close outcome indicator */}
            {form.close_outcome && (
              <div className={`mt-3 mx-1 rounded-lg px-2.5 py-2 text-[10px] font-medium ${
                isWon ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isLost ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : isPending ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}>
                Outcome: {form.close_outcome === "won" ? "Won" : form.close_outcome === "lost" ? "Lost" : form.close_outcome === "pending" ? "Pending" : "Revised"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Content */}
        <div className="space-y-4">
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4 sm:p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStage()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setStage(Math.max(1, stage - 1))}
              disabled={stage === 1 || submitting}
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

            {showActivateButton ? (
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
            ) : (
              <Button
                onClick={handleNext}
                disabled={nextDisabled()}
                className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white"
              >
                {getNextLabel()} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
