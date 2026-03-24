import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { provisionWorkspaceDefaults } from "@/lib/workspaceProvisioner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LogoUploader } from "@/components/LogoUploader";
import {
  Building2, User, Globe, MapPin, Phone, Mail, Briefcase,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Rocket,
  ExternalLink, ArrowRight, Sparkles, Clock
} from "lucide-react";
import { WorkspaceHandoff } from "@/components/WorkspaceHandoff";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "Pacific/Honolulu", "America/Toronto", "Europe/London",
  "Europe/Paris", "Asia/Tokyo", "Australia/Sydney",
];

const INDUSTRIES = [
  "Agency", "Dental", "Med Spa", "Salon", "Legal", "HVAC",
  "Real Estate", "Fitness", "Restaurant", "Automotive",
  "Construction", "Consulting", "Healthcare", "E-commerce", "Other",
];

type FormStep = "info" | "details";
type PageState = "form" | "submitting" | "success" | "error";

export default function GetStarted() {
  // Required
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");

  // Optional
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [interestedService, setInterestedService] = useState("");

  // Slug
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // UI state
  const [step, setStep] = useState<FormStep>("info");
  const [pageState, setPageState] = useState<PageState>("form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  // Auto-generate slug from business name
  useEffect(() => {
    if (!slugEdited && businessName) {
      setSlug(businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [businessName, slugEdited]);

  const canProceed = businessName.trim() && ownerName.trim() && ownerEmail.trim();
  const progress = step === "info" ? 50 : 100;

  const handleSubmit = async () => {
    if (!canProceed) return;
    setPageState("submitting");
    setError("");

    try {
      // 1. Call the provisioning edge function
      const { data, error: fnError } = await supabase.functions.invoke(
        "provision-from-booking",
        {
          body: {
            business_name: businessName,
            contact_name: ownerName,
            contact_email: ownerEmail,
            contact_phone: phone || null,
            company_name: businessName,
            logo_url: logoUrl || null,
            primary_color: "#3B82F6",
            secondary_color: "#06B6D4",
            industry: industry || null,
            location: location || null,
            website: website || null,
            timezone,
            main_goal: mainGoal || null,
            interested_service: interestedService || null,
            appointment_id: null,
            calendar_client_id: null,
            custom_slug: slug || null,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      // Track invite status for the handoff page (don't fail the flow)
      const inviteWarning = data?.invite_error
        ? `Invite could not be sent: ${data.invite_error}`
        : null;
      if (inviteWarning) {
        console.warn("Invite issue (non-blocking):", inviteWarning);
      }

      // 2. Run full-app provisioning if newly created
      if (data?.client_id && !data?.already_exists) {
        try {
          await provisionWorkspaceDefaults(data.client_id, {
            industry: industry || null,
            timezone,
            skipIfExists: true,
            ownerEmail,
            ownerName,
          });
        } catch (provErr) {
          console.warn("Provisioning partial:", provErr);
        }

        // Update slug if custom
        if (slug && slug !== data.workspace_slug) {
          await supabase.from("clients").update({ workspace_slug: slug }).eq("id", data.client_id);
          data.workspace_slug = slug;
          data.workspace_url = `/w/${slug}`;
        }

        // 3. Create a discovery appointment on the first available calendar
        try {
          const { data: calendars } = await supabase.from("calendars")
            .select("id")
            .eq("client_id", data.client_id)
            .eq("is_active", true)
            .limit(1);

          if (calendars && calendars.length > 0) {
            const startTime = new Date();
            startTime.setDate(startTime.getDate() + 3); // 3 days from now
            startTime.setHours(10, 0, 0, 0);
            const endTime = new Date(startTime.getTime() + 30 * 60000);

            await supabase.from("calendar_events").insert({
              client_id: data.client_id,
              calendar_id: calendars[0].id,
              title: "Discovery / Kickoff Call",
              description: `Onboarding kickoff for ${businessName}. Goal: ${mainGoal || "Discuss needs"}. Interest: ${interestedService || "TBD"}.`,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              timezone,
              contact_name: ownerName,
              contact_email: ownerEmail,
              contact_phone: phone || null,
              calendar_status: "scheduled",
              booking_source: "onboarding_form",
            });
          }
        } catch (calErr) {
          console.warn("Discovery appointment creation skipped:", calErr);
        }

        // 4. Create onboarding reminder automations
        try {
          await supabase.from("automations").insert([
            {
              client_id: data.client_id,
              name: "Continue Setup Reminder",
              trigger_event: "onboarding_form_saved",
              action_type: "notification",
              action_config: { type: "continue_setup_reminder", delay_hours: 24 },
              automation_category: "onboarding",
              automation_key: "onboarding_continue_setup",
              enabled: true,
            },
            {
              client_id: data.client_id,
              name: "Activation Incomplete Reminder",
              trigger_event: "setup_progress_updated",
              action_type: "notification",
              action_config: { type: "activation_incomplete", delay_hours: 72 },
              automation_category: "onboarding",
              automation_key: "onboarding_activation_reminder",
              enabled: true,
            },
            {
              client_id: data.client_id,
              name: "Payment Pending Reminder",
              trigger_event: "activation_form_submitted",
              action_type: "notification",
              action_config: { type: "payment_pending", delay_hours: 48, condition: "payment_not_confirmed" },
              automation_category: "onboarding",
              automation_key: "onboarding_payment_reminder",
              enabled: true,
            },
          ]);
        } catch (autoErr) {
          console.warn("Onboarding automations creation skipped:", autoErr);
        }

        // 5. Audit
        await supabase.from("audit_logs").insert({
          client_id: data.client_id,
          action: "workspace_created_via_onboarding_form",
          module: "onboarding",
          metadata: { businessName, industry, ownerEmail, source: "get-started-form", main_goal: mainGoal, interested_service: interestedService },
        });

        await supabase.from("crm_activities").insert({
          client_id: data.client_id,
          activity_type: "workspace_created",
          activity_note: `Workspace created via onboarding form for ${businessName} (${ownerEmail})`,
        });
      }

      setResult({
        ...data,
        invite_warning: data?.invite_error || null,
      });
      setPageState("success");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setPageState("error");
    }
  };

  // ─── Submitting ────────────────────────────────────────────────────
  if (pageState === "submitting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Creating your workspace…</h2>
          <p className="text-sm text-muted-foreground">
            Setting up your personalized business dashboard with all the tools you need.
          </p>
          <div className="mt-6 space-y-2">
            {["Creating workspace", "Setting up calendar & forms", "Configuring CRM", "Applying industry defaults"].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.8 }}
                className="flex items-center gap-2 text-xs text-muted-foreground justify-center"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                {s}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────
  if (pageState === "success" && result) {
    return (
      <WorkspaceHandoff
        businessName={businessName}
        workspaceUrl={result.workspace_url || "/"}
        workspaceSlug={result.workspace_slug || slug}
        setupLink={result.setup_link}
        inviteSent={result.invite_sent}
        alreadyExists={result.already_exists}
      />
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Setup Failed</h2>
          <p className="text-sm text-muted-foreground mb-2">We couldn't create your workspace. Please try again.</p>
          <p className="text-xs text-destructive mb-6 font-mono">{error}</p>
          <Button onClick={() => { setPageState("form"); setError(""); }} variant="outline">
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Get Started with NewLight</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create your personalized business workspace in under a minute.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className={step === "info" ? "font-semibold text-foreground" : ""}>Business Info</span>
            <span className={step === "details" ? "font-semibold text-foreground" : ""}>Details & Preferences</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <AnimatePresence mode="wait">
            {step === "info" ? (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs mb-1.5 block">Business Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Dental"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Your Name <span className="text-destructive">*</span></Label>
                    <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="John Smith" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Email <span className="text-destructive">*</span></Label>
                    <Input value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="john@acme.com" type="email" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Industry</Label>
                    <select
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select…</option>
                      {INDUSTRIES.map(i => <option key={i} value={i.toLowerCase()}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Primary Location</Label>
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Los Angeles, CA" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">Timezone</Label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                  </select>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => setStep("details")}
                    disabled={!canProceed}
                    className="w-full gap-2"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs mb-1.5 block">Workspace URL</Label>
                  <div className="flex items-center gap-0">
                    <span className="h-10 px-3 flex items-center text-xs text-muted-foreground bg-muted rounded-l-md border border-r-0 border-input whitespace-nowrap">
                      newlight.app/
                    </span>
                    <Input
                      value={slug}
                      onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
                      className="rounded-l-none"
                      placeholder="your-business"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Website</Label>
                    <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://acme.com" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Phone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">Main Goal</Label>
                  <Input value={mainGoal} onChange={e => setMainGoal(e.target.value)} placeholder="e.g. Get more leads, grow revenue" />
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">Interested Service</Label>
                  <Input value={interestedService} onChange={e => setInterestedService(e.target.value)} placeholder="e.g. SEO, Social Media, Website" />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep("info")} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleSubmit} className="flex-1 gap-2">
                    <Rocket className="h-4 w-4" />
                    Create My Workspace
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          By creating a workspace you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}