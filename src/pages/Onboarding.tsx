import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { LogoUploader } from "@/components/LogoUploader";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Building2, Palette, Users, Plug, KeyRound, Settings2,
  ChevronRight, ChevronLeft, Check, Rocket, Plus, Trash2, Smartphone
} from "lucide-react";

const STEPS = [
  { id: "business", label: "Business Info", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "team", label: "Team", icon: Users },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "access", label: "Access Details", icon: KeyRound },
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "download", label: "Download Your App", icon: Smartphone },
];

const INTEGRATION_OPTIONS = [
  { key: "google_analytics", label: "Google Analytics" },
  { key: "search_console", label: "Google Search Console" },
  { key: "google_business", label: "Google Business Profile" },
  { key: "meta", label: "Meta / Instagram / Facebook" },
  { key: "google_ads", label: "Google Ads" },
  { key: "stripe", label: "Stripe" },
  { key: "twilio", label: "Twilio" },
  { key: "zoom", label: "Zoom" },
  { key: "existing_crm", label: "Existing CRM" },
];

interface TeamMember {
  name: string;
  email: string;
  role: string;
}

export default function Onboarding() {
  const { activeClientId, user } = useWorkspace();
  const { install, isInstalled } = usePWAInstall();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [appDownloadAcknowledged, setAppDownloadAcknowledged] = useState(false);

  // Business
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primaryLocation, setPrimaryLocation] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [mainService, setMainService] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [bookingLink, setBookingLink] = useState("");

  // Branding
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [secondaryColor, setSecondaryColor] = useState("#06B6D4");
  const [logoUrl, setLogoUrl] = useState("");
  const [pwaIconUrl, setPwaIconUrl] = useState("");

  // Team
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Integrations
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({});

  // Access
  const [googleEmail, setGoogleEmail] = useState("");
  const [metaEmail, setMetaEmail] = useState("");
  const [adsEmail, setAdsEmail] = useState("");
  const [stripeEmail, setStripeEmail] = useState("");
  const [zoomEmail, setZoomEmail] = useState("");
  const [domainProvider, setDomainProvider] = useState("");
  const [domainEmail, setDomainEmail] = useState("");

  // Preferences
  const [reminderMethod, setReminderMethod] = useState("");
  const [bookingWorkflow, setBookingWorkflow] = useState("");
  const [salesProcess, setSalesProcess] = useState("");
  const [followUpProcess, setFollowUpProcess] = useState("");
  const [reviewPlatform, setReviewPlatform] = useState("");
  const [reportingPriorities, setReportingPriorities] = useState("");
  const [notes, setNotes] = useState("");

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  const addTeamMember = () => setTeamMembers(prev => [...prev, { name: "", email: "", role: "client_team" }]);
  const removeTeamMember = (i: number) => setTeamMembers(prev => prev.filter((_, idx) => idx !== i));
  const updateTeamMember = (i: number, field: keyof TeamMember, value: string) => {
    setTeamMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const handleInstallApp = async () => {
    await install();
    setAppDownloadAcknowledged(true);
  };

  const handleSubmit = async () => {
    if (!activeClientId) {
      toast.error("No active workspace selected");
      return;
    }
    setSaving(true);
    try {
      // 1. Update client record
      await supabase.from("clients").update({
        business_name: businessName || undefined,
        owner_name: ownerName || undefined,
        owner_email: ownerEmail || undefined,
        primary_location: primaryLocation || undefined,
        industry: businessType || undefined,
      }).eq("id", activeClientId);

      // 2. Upsert branding
      await supabase.from("client_branding").upsert({
        client_id: activeClientId,
        company_name: companyName || businessName,
        display_name: displayName,
        dashboard_title: dashboardTitle,
        welcome_message: welcomeMessage || `Welcome to ${businessName || companyName}`,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        logo_url: logoUrl,
        pwa_icon_url: pwaIconUrl,
      }, { onConflict: "client_id" });

      // 3. Create integration records
      const integrationNames: Record<string, string> = {
        google_analytics: "Google Analytics",
        search_console: "Google Search Console",
        google_business: "Google Business Profile",
        meta: "Meta / Instagram / Facebook",
        google_ads: "Google Ads",
        stripe: "Stripe",
        twilio: "Twilio",
        zoom: "Zoom",
        existing_crm: "Existing CRM",
      };

      for (const [key, used] of Object.entries(integrations)) {
        const status = used ? "access_needed" : "not_needed";
        // Upsert by checking existing
        const { data: existing } = await supabase.from("client_integrations")
          .select("id").eq("client_id", activeClientId)
          .eq("integration_name", integrationNames[key] || key).maybeSingle();

        if (existing) {
          await supabase.from("client_integrations").update({ status, config: { onboarding_selected: used } }).eq("id", existing.id);
        } else {
          await supabase.from("client_integrations").insert({
            client_id: activeClientId,
            integration_name: integrationNames[key] || key,
            status,
            config: {
              onboarding_selected: used,
              access_email: key.includes("google") ? googleEmail : key === "meta" ? metaEmail : key === "stripe" ? stripeEmail : key === "zoom" ? zoomEmail : null,
            },
          });
        }
      }

      // 4. Update onboarding progress
      await supabase.from("onboarding_progress").upsert({
        client_id: activeClientId,
        business_info: !!(businessName && businessType),
        website_connected: !!websiteUrl,
        google_business_connected: !!integrations.google_business,
        review_platform_connected: !!reviewPlatform,
        ad_account_connected: !!integrations.google_ads,
        crm_setup: true,
        team_setup: teamMembers.length > 0 || !!ownerName,
      }, { onConflict: "client_id" });

      // 5. Create tasks for integrations needing access
      for (const [key, used] of Object.entries(integrations)) {
        if (used) {
          await supabase.from("crm_tasks").insert({
            client_id: activeClientId,
            title: `Connect ${integrationNames[key] || key}`,
            description: `Set up and authorize ${integrationNames[key] || key} integration`,
            status: "open",
            related_type: "integration",
          });
        }
      }

      // 6. Create default pipeline stages
      const leadPipeline = [
        { stage_name: "New Lead", stage_order: 0, color: "#3B82F6" },
        { stage_name: "Contacted", stage_order: 1, color: "#06B6D4" },
        { stage_name: "Qualified", stage_order: 2, color: "#10B981" },
        { stage_name: "Appointment Booked", stage_order: 3, color: "#8B5CF6" },
        { stage_name: "Proposal Sent", stage_order: 4, color: "#F59E0B" },
        { stage_name: "Negotiation", stage_order: 5, color: "#F97316" },
        { stage_name: "Closed Won", stage_order: 6, color: "#22C55E" },
        { stage_name: "Closed Lost", stage_order: 7, color: "#EF4444" },
      ];
      const customerPipeline = [
        { stage_name: "Active Customer", stage_order: 0, color: "#22C55E" },
        { stage_name: "Repeat Customer", stage_order: 1, color: "#10B981" },
        { stage_name: "Referral Source", stage_order: 2, color: "#3B82F6" },
        { stage_name: "VIP Customer", stage_order: 3, color: "#8B5CF6" },
        { stage_name: "Inactive Customer", stage_order: 4, color: "#6B7280" },
      ];
      const recoveryPipeline = [
        { stage_name: "Negative Feedback Received", stage_order: 0, color: "#EF4444" },
        { stage_name: "Contact Customer", stage_order: 1, color: "#F59E0B" },
        { stage_name: "Issue Resolved", stage_order: 2, color: "#10B981" },
        { stage_name: "Review Request Resent", stage_order: 3, color: "#3B82F6" },
      ];
      await supabase.from("pipeline_stages").insert([
        ...leadPipeline.map(s => ({ ...s, client_id: activeClientId, pipeline_type: "lead" })),
        ...customerPipeline.map(s => ({ ...s, client_id: activeClientId, pipeline_type: "customer" })),
        ...recoveryPipeline.map(s => ({ ...s, client_id: activeClientId, pipeline_type: "review_recovery" })),
      ] as any);

      // 7. Create default availability settings
      const defaultAvailability = [1, 2, 3, 4, 5].map(day => ({
        client_id: activeClientId, day_of_week: day, enabled: true,
        start_time: "09:00", end_time: "17:00",
      }));
      await supabase.from("availability_settings").insert(defaultAvailability);

      // 8. Create default event type
      await supabase.from("event_types").insert({
        client_id: activeClientId, name: "Discovery Call",
        description: "Initial consultation call", duration_minutes: 30,
        color: "#3B82F6", active: true,
      });

      // 9. Log audit
      await supabase.from("audit_logs").insert({
        client_id: activeClientId,
        user_id: user?.id,
        action: "onboarding_form_submitted",
        module: "onboarding",
        metadata: {
          businessName,
          businessType,
          app_download_step_completed: appDownloadAcknowledged || isInstalled,
          app_download_link: `${window.location.origin}/dashboard`,
          integrations_selected: Object.keys(integrations).filter(k => integrations[k]),
        },
      });

      // 10. Create activity
      await supabase.from("crm_activities").insert({
        client_id: activeClientId,
        activity_type: "onboarding_completed",
        activity_note: `Onboarding form submitted for ${businessName}. ${Object.values(integrations).filter(Boolean).length} integrations selected. Default pipelines, calendar availability, and event types created.`,
        created_by: user?.id,
      });

      const { data: client } = await supabase.from("clients").select("business_name, owner_email, owner_phone, preferred_contact_method, sms_consent, workspace_slug").eq("id", activeClientId).maybeSingle();
      if (client?.owner_email && client?.workspace_slug) {
        await supabase.functions.invoke("send-handoff-message", {
          body: {
            client_id: activeClientId,
            business_name: companyName || businessName || client.business_name || "your business",
            owner_email: client.owner_email,
            owner_phone: client.owner_phone,
            preferred_contact_method: client.preferred_contact_method || "email",
            sms_consent: Boolean(client.sms_consent),
            workspace_slug: client.workspace_slug,
            base_url: window.location.origin,
          },
        });
      }

      toast.success("Onboarding complete! Your workspace is being configured.");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Error saving onboarding data");
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">Business Name *</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Corp" /></div>
            <div><Label className="text-xs mb-1.5 block">Website URL</Label><Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://acme.com" /></div>
            <div><Label className="text-xs mb-1.5 block">Primary Location</Label><Input value={primaryLocation} onChange={e => setPrimaryLocation(e.target.value)} placeholder="Los Angeles, CA" /></div>
            <div><Label className="text-xs mb-1.5 block">Business Type / Industry</Label><Input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Dental, Legal, HVAC" /></div>
            <div><Label className="text-xs mb-1.5 block">Main Service / Offer</Label><Input value={mainService} onChange={e => setMainService(e.target.value)} placeholder="Your core service" /></div>
            <div><Label className="text-xs mb-1.5 block">Primary Goal</Label><Input value={primaryGoal} onChange={e => setPrimaryGoal(e.target.value)} placeholder="e.g. Get more leads" /></div>
            <div className="sm:col-span-2"><Label className="text-xs mb-1.5 block">Booking Link</Label><Input value={bookingLink} onChange={e => setBookingLink(e.target.value)} placeholder="https://calendly.com/..." /></div>
          </div>
        </div>
      );
      case 1: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">Company Name</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Display company name" /></div>
            <div><Label className="text-xs mb-1.5 block">Display Name</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Short display name" /></div>
            <div><Label className="text-xs mb-1.5 block">Dashboard Title</Label><Input value={dashboardTitle} onChange={e => setDashboardTitle(e.target.value)} placeholder="Your Growth Dashboard" /></div>
            <div><Label className="text-xs mb-1.5 block">Welcome Message</Label><Input value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} placeholder="Welcome to your workspace!" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-14 rounded-lg border-0 cursor-pointer" />
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-10 w-14 rounded-lg border-0 cursor-pointer" />
                <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LogoUploader value={logoUrl} onChange={setLogoUrl} label="Main Logo" />
            <LogoUploader value={pwaIconUrl} onChange={setPwaIconUrl} label="PWA App Icon · square 512×512 recommended" />
          </div>
          {/* Live preview */}
          <div className="rounded-xl border p-4 mt-2" style={{ borderColor: `${primaryColor}30`, background: `${primaryColor}08` }}>
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">PREVIEW</p>
            <div className="flex items-center gap-3">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-contain" /> : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
                  <span className="text-xs font-bold text-white">{(companyName || businessName || "NL").substring(0, 2).toUpperCase()}</span>
                </div>
              )}
              <div>
                <p className="text-sm font-bold" style={{ color: primaryColor }}>{companyName || businessName || "Your Company"}</p>
                <p className="text-xs text-muted-foreground">{welcomeMessage || "Welcome to your workspace"}</p>
              </div>
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">Owner Name</Label><Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="John Smith" /></div>
            <div><Label className="text-xs mb-1.5 block">Owner Email</Label><Input value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="john@acme.com" type="email" /></div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold">Team Members</Label>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={addTeamMember}>
                <Plus className="h-3 w-3" /> Add Member
              </Button>
            </div>
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No team members added yet. You can add them later.</p>
            )}
            {teamMembers.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 mb-2 items-end">
                <div><Label className="text-[10px] mb-1 block">Name</Label><Input value={m.name} onChange={e => updateTeamMember(i, "name", e.target.value)} placeholder="Name" className="h-9 text-xs" /></div>
                <div><Label className="text-[10px] mb-1 block">Email</Label><Input value={m.email} onChange={e => updateTeamMember(i, "email", e.target.value)} placeholder="email" className="h-9 text-xs" /></div>
                <select value={m.role} onChange={e => updateTeamMember(i, "role", e.target.value)} className="h-9 rounded-md border px-2 text-xs bg-background">
                  <option value="client_team">Team Member</option>
                  <option value="client_owner">Client Owner</option>
                  <option value="read_only">Read Only</option>
                </select>
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => removeTeamMember(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground mb-2">Select which platforms you currently use. We'll set up integration records and create access tasks.</p>
          {INTEGRATION_OPTIONS.map(opt => (
            <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl transition-colors" style={{
              background: integrations[opt.key] ? "hsla(211,96%,56%,.06)" : "hsla(210,40%,94%,.4)",
              border: `1px solid ${integrations[opt.key] ? "hsla(211,96%,56%,.12)" : "transparent"}`,
            }}>
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
              <Switch checked={!!integrations[opt.key]} onCheckedChange={v => setIntegrations(prev => ({ ...prev, [opt.key]: v }))} />
            </div>
          ))}
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2">Provide access emails so our team can request integration access on your behalf.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">Google Access Email</Label><Input value={googleEmail} onChange={e => setGoogleEmail(e.target.value)} placeholder="google@acme.com" /></div>
            <div><Label className="text-xs mb-1.5 block">Meta Access Email</Label><Input value={metaEmail} onChange={e => setMetaEmail(e.target.value)} placeholder="meta@acme.com" /></div>
            <div><Label className="text-xs mb-1.5 block">Ads Account Email</Label><Input value={adsEmail} onChange={e => setAdsEmail(e.target.value)} placeholder="ads@acme.com" /></div>
            <div><Label className="text-xs mb-1.5 block">Stripe Account Email</Label><Input value={stripeEmail} onChange={e => setStripeEmail(e.target.value)} placeholder="billing@acme.com" /></div>
            <div><Label className="text-xs mb-1.5 block">Zoom Email</Label><Input value={zoomEmail} onChange={e => setZoomEmail(e.target.value)} placeholder="zoom@acme.com" /></div>
            <div><Label className="text-xs mb-1.5 block">Domain Provider</Label><Input value={domainProvider} onChange={e => setDomainProvider(e.target.value)} placeholder="GoDaddy, Namecheap, etc." /></div>
            <div className="sm:col-span-2"><Label className="text-xs mb-1.5 block">Domain Login Email</Label><Input value={domainEmail} onChange={e => setDomainEmail(e.target.value)} placeholder="admin@acme.com" /></div>
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2">Help us personalize your workspace experience.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">Preferred Reminder Method</Label><Input value={reminderMethod} onChange={e => setReminderMethod(e.target.value)} placeholder="SMS, Email, or Both" /></div>
            <div><Label className="text-xs mb-1.5 block">Preferred Booking Workflow</Label><Input value={bookingWorkflow} onChange={e => setBookingWorkflow(e.target.value)} placeholder="Auto-confirm, manual, etc." /></div>
            <div><Label className="text-xs mb-1.5 block">Main Sales Process</Label><Input value={salesProcess} onChange={e => setSalesProcess(e.target.value)} placeholder="Describe briefly" /></div>
            <div><Label className="text-xs mb-1.5 block">Customer Follow-up Process</Label><Input value={followUpProcess} onChange={e => setFollowUpProcess(e.target.value)} placeholder="How do you follow up?" /></div>
            <div><Label className="text-xs mb-1.5 block">Main Review Platform</Label><Input value={reviewPlatform} onChange={e => setReviewPlatform(e.target.value)} placeholder="Google, Yelp, etc." /></div>
            <div><Label className="text-xs mb-1.5 block">Reporting Priorities</Label><Input value={reportingPriorities} onChange={e => setReportingPriorities(e.target.value)} placeholder="Revenue, leads, etc." /></div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Notes for NewLight Team</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else we should know..." rows={3} />
          </div>
        </div>
      );
      case 6: {
        const appName = companyName || businessName || displayName || "Your App";
        const icon = pwaIconUrl || logoUrl;
        return (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card/70 p-5">
              <p className="text-sm font-semibold text-foreground mb-1">Download Your App</p>
              <p className="text-xs text-muted-foreground">Tap the button below to add your app to your home screen.</p>
              <div className="mt-5 flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                  {icon ? <img src={icon} alt={`${appName} app icon`} className="h-full w-full object-contain" /> : <span className="text-lg font-bold text-primary">{appName.substring(0, 2).toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground truncate">{appName}</p>
                  <p className="text-xs text-muted-foreground">Home screen app preview</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-2">
                <Button type="button" className="btn-gradient gap-2" onClick={handleInstallApp}>
                  <Smartphone className="h-4 w-4" /> {isInstalled ? "App Installed" : "Install App"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAppDownloadAcknowledged(true)}>
                  Skip for now
                </Button>
              </div>
              {(appDownloadAcknowledged || isInstalled) && (
                <p className="mt-3 text-xs font-medium text-primary">Step complete — you can finish onboarding.</p>
              )}
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div>
      <PageHeader title="Workspace Setup" description="Complete your master onboarding form to auto-configure your workspace" />

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step].label}</p>
          <span className="text-lg font-bold" style={{ color: "hsl(211 96% 56%)" }}>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-secondary" />
      </div>

      {/* Step nav pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STEPS.map((s, i) => {
          const active = step === i;
          const done = i < step;
          return (
            <button key={s.id} onClick={() => setStep(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: active ? "hsla(211,96%,56%,.12)" : done ? "hsla(211,96%,56%,.06)" : "hsla(210,40%,94%,.5)",
                color: active ? "hsl(211 96% 46%)" : done ? "hsl(211 96% 56%)" : undefined,
                border: `1px solid ${active ? "hsla(211,96%,56%,.2)" : "transparent"}`,
              }}>
              {done ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form content */}
      <motion.div className="card-widget" initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={step}>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button className="btn-gradient gap-1" onClick={() => setStep(s => s + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="btn-gradient gap-1" onClick={handleSubmit} disabled={saving || !businessName}>
            {saving ? "Configuring..." : <><Rocket className="h-4 w-4" /> Launch Workspace</>}
          </Button>
        )}
      </div>
    </div>
  );
}
