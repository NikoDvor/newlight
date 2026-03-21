import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { provisionWorkspaceDefaults } from "@/lib/workspaceProvisioner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { LogoUploader } from "@/components/LogoUploader";
import {
  Building2, User, Globe, MapPin, Phone, Mail, Briefcase,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Rocket,
  ExternalLink, ArrowRight, Sparkles, Clock
} from "lucide-react";

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
            appointment_id: null,
            calendar_client_id: null,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

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
        }

        // Set initial stage
        await supabase.from("clients").update({
          onboarding_stage: "discovery",
          status: "active",
        }).eq("id", data.client_id);

        // Audit
        await supabase.from("audit_logs").insert({
          client_id: data.client_id,
          action: "workspace_created_via_onboarding_form",
          module: "onboarding",
          metadata: { businessName, industry, ownerEmail, source: "get-started-form" },
        });

        await supabase.from("crm_activities").insert({
          client_id: data.client_id,
          activity_type: "workspace_created",
          activity_note: `Workspace created via onboarding form for ${businessName} (${ownerEmail})`,
        });
      }

      setResult(data);
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {result.already_exists ? "Workspace Ready!" : "Your Workspace Has Been Created!"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {result.invite_sent
              ? "Check your email for login instructions to access your new workspace."
              : "Your personalized business dashboard is ready to use."}
          </p>

          <div className="space-y-3">
            {result.workspace_url && (
              <a href={result.workspace_url} className="block">
                <Button className="w-full gap-2 h-12 text-sm" size="lg">
                  <ExternalLink className="h-4 w-4" />
                  Open Workspace
                </Button>
              </a>
            )}
            <a href={result.workspace_url || "/"}>
              <Button variant="outline" className="w-full gap-2 h-12 text-sm" size="lg">
                <ArrowRight className="h-4 w-4" />
                Continue Setup
              </Button>
            </a>
          </div>

          {result.workspace_url && (
            <div className="mt-6 p-4 rounded-xl border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Your workspace link</p>
              <p className="text-sm font-mono text-foreground break-all">{result.workspace_url}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6">
            Tip: Open this link on your phone and tap "Add to Home Screen" for the full app experience.
          </p>
        </motion.div>
      </div>
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
