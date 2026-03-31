import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LogoUploader } from "@/components/LogoUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle, Upload, Users, Settings, Shield, Plug } from "lucide-react";

const PLATFORMS = [
  { name: "Google Analytics", emoji: "📊" },
  { name: "Google Search Console", emoji: "🔍" },
  { name: "Google Business Profile", emoji: "📍" },
  { name: "Meta / Facebook", emoji: "📸" },
  { name: "Google Ads", emoji: "📢" },
  { name: "Stripe", emoji: "💳" },
  { name: "Twilio", emoji: "📱" },
  { name: "Zoom", emoji: "📹" },
  { name: "External CRM", emoji: "👥" },
  { name: "External Calendar", emoji: "📅" },
  { name: "Email Provider", emoji: "✉️" },
];

const labelCls = "text-sm font-medium text-foreground";
const inputCls = "mt-1";

interface IntegrationRow {
  platform: string;
  uses: boolean;
  handling: "use_existing" | "use_newlight" | "skip" | "";
  access_ready: boolean;
  access_owner_name: string;
  access_owner_email: string;
  notes: string;
}

export default function ClientIntakeForm() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clientId, setClientId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [hasLogo, setHasLogo] = useState(false);

  // Form state
  const [logoUrl, setLogoUrl] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocSameAsOwner, setPocSameAsOwner] = useState(false);
  const [dmNames, setDmNames] = useState("");
  const [dmEmails, setDmEmails] = useState("");
  const [dmPhones, setDmPhones] = useState("");
  const [dmSameAsOwner, setDmSameAsOwner] = useState(false);

  const [serviceAreas, setServiceAreas] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [teamEmails, setTeamEmails] = useState("");

  const [complianceRestrictions, setComplianceRestrictions] = useState("");
  const [importantNotes, setImportantNotes] = useState("");

  const [integrations, setIntegrations] = useState<IntegrationRow[]>(
    PLATFORMS.map(p => ({
      platform: p.name,
      uses: false,
      handling: "",
      access_ready: false,
      access_owner_name: "",
      access_owner_email: "",
      notes: "",
    }))
  );

  // Validate token on load
  useEffect(() => {
    if (!token) {
      setError("No intake token provided. Please use the link sent by your account manager.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("client-intake", {
          body: null,
          headers: {},
          method: "GET",
        });

        // Use fetch directly since we need query params
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-intake?action=validate&token=${encodeURIComponent(token)}`,
          { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const result = await res.json();

        if (!res.ok) {
          if (result.used) {
            setError("This intake form has already been submitted. Thank you!");
          } else {
            setError(result.error || "Invalid or expired link.");
          }
          setLoading(false);
          return;
        }

        setClientId(result.client_id);
        setBusinessName(result.client?.business_name || "");
        setHasLogo(!!result.logo_url);
        if (result.logo_url) setLogoUrl(result.logo_url);

        // Prefill known data
        if (result.client) {
          setOwnerName(result.client.owner_name || "");
          setOwnerEmail(result.client.owner_email || "");
          setOwnerPhone(result.client.owner_phone || "");
          if (result.client.primary_location) setServiceAreas(result.client.primary_location);
        }

        // Prefill existing integrations
        if (result.existing_integrations?.length) {
          setIntegrations(prev => prev.map(row => {
            const existing = result.existing_integrations.find(
              (e: any) => e.integration_name === row.platform
            );
            if (existing?.config) {
              return {
                ...row,
                uses: existing.config.mode !== "skipped" && existing.status !== "not_needed",
                handling: existing.config.handling || "",
                access_ready: existing.config.access_ready || false,
                access_owner_name: existing.config.access_owner_name || "",
                access_owner_email: existing.config.access_owner_email || "",
                notes: existing.config.notes || "",
              };
            }
            return row;
          }));
        }
      } catch {
        setError("Failed to validate link. Please try again or contact your account manager.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Sync POC/DM with owner
  useEffect(() => {
    if (pocSameAsOwner) { setPocName(ownerName); setPocEmail(ownerEmail); setPocPhone(ownerPhone); }
  }, [pocSameAsOwner, ownerName, ownerEmail, ownerPhone]);
  useEffect(() => {
    if (dmSameAsOwner) { setDmNames(ownerName); setDmEmails(ownerEmail); setDmPhones(ownerPhone); }
  }, [dmSameAsOwner, ownerName, ownerEmail, ownerPhone]);

  const updateIntegration = (idx: number, field: keyof IntegrationRow, value: any) => {
    setIntegrations(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    if (!ownerName || !ownerEmail) {
      toast.error("Owner name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        token,
        logo_url: logoUrl || null,
        contacts: {
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_phone: ownerPhone,
          poc_name: pocSameAsOwner ? ownerName : pocName,
          poc_email: pocSameAsOwner ? ownerEmail : pocEmail,
          poc_phone: pocSameAsOwner ? ownerPhone : pocPhone,
          decision_makers: [{ names: dmNames, emails: dmEmails, phones: dmPhones }],
          secondary_contact_name: pocSameAsOwner ? "" : pocName,
          secondary_contact_email: pocSameAsOwner ? "" : pocEmail,
          secondary_contact_phone: pocSameAsOwner ? "" : pocPhone,
        },
        operations: {
          service_areas: serviceAreas,
          booking_link: bookingLink,
          team_emails: teamEmails,
        },
        restrictions: {
          compliance: complianceRestrictions,
          important_notes: importantNotes,
        },
        integrations: integrations
          .filter(r => r.uses || r.handling)
          .map(r => ({
            platform: r.platform,
            handling: r.handling || "skip",
            access_ready: r.access_ready,
            access_owner_name: r.access_owner_name,
            access_owner_email: r.access_owner_email,
            notes: r.notes,
          })),
      };

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-intake?action=submit`,
        {
          method: "POST",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");

      setSubmitted(true);
      toast.success("Thank you! Your information has been submitted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              If you need help, contact your NewLight Marketing account manager.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Thank You!</h2>
            <p className="text-sm text-muted-foreground">
              Your information has been submitted successfully. Your NewLight team will review everything and follow up shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Welcome, {businessName || "Client"}</h1>
          <p className="text-sm text-muted-foreground">
            Please complete this short form so we can set up your workspace. This usually takes 5–10 minutes.
          </p>
        </div>

        {/* A. Logo */}
        {!hasLogo && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Your Logo</h3>
              </div>
              <LogoUploader
                currentLogo={logoUrl}
                onUpload={(url) => setLogoUrl(url)}
                bucket="client-logos"
                path={`${clientId}/logo`}
              />
            </CardContent>
          </Card>
        )}

        {/* B. Contacts */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Contacts</h3>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Owner</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label className={labelCls}>Name</Label><Input className={inputCls} value={ownerName} onChange={e => setOwnerName(e.target.value)} /></div>
                <div><Label className={labelCls}>Email</Label><Input className={inputCls} type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} /></div>
                <div><Label className={labelCls}>Phone</Label><Input className={inputCls} type="tel" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} /></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Point of Contact</p>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={pocSameAsOwner} onCheckedChange={(v) => setPocSameAsOwner(!!v)} />
                  Same as owner
                </label>
              </div>
              {!pocSameAsOwner && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label className={labelCls}>Name</Label><Input className={inputCls} value={pocName} onChange={e => setPocName(e.target.value)} /></div>
                  <div><Label className={labelCls}>Email</Label><Input className={inputCls} type="email" value={pocEmail} onChange={e => setPocEmail(e.target.value)} /></div>
                  <div><Label className={labelCls}>Phone</Label><Input className={inputCls} type="tel" value={pocPhone} onChange={e => setPocPhone(e.target.value)} /></div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Decision Maker(s)</p>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={dmSameAsOwner} onCheckedChange={(v) => setDmSameAsOwner(!!v)} />
                  Same as owner
                </label>
              </div>
              {!dmSameAsOwner && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label className={labelCls}>Name(s)</Label><Input className={inputCls} value={dmNames} onChange={e => setDmNames(e.target.value)} placeholder="Comma-separated" /></div>
                  <div><Label className={labelCls}>Email(s)</Label><Input className={inputCls} value={dmEmails} onChange={e => setDmEmails(e.target.value)} placeholder="Comma-separated" /></div>
                  <div><Label className={labelCls}>Phone(s)</Label><Input className={inputCls} value={dmPhones} onChange={e => setDmPhones(e.target.value)} placeholder="Comma-separated" /></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* C. Operations */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Operations</h3>
            </div>
            <div><Label className={labelCls}>Service Areas / Cities Served</Label><Input className={inputCls} value={serviceAreas} onChange={e => setServiceAreas(e.target.value)} placeholder="e.g. Los Angeles, Orange County" /></div>
            <div><Label className={labelCls}>Booking Link (if you have one)</Label><Input className={inputCls} value={bookingLink} onChange={e => setBookingLink(e.target.value)} placeholder="https://..." /></div>
            <div><Label className={labelCls}>Team Member Emails (comma-separated)</Label><Input className={inputCls} value={teamEmails} onChange={e => setTeamEmails(e.target.value)} placeholder="team@company.com, tech@company.com" /></div>
          </CardContent>
        </Card>

        {/* D. Restrictions */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Restrictions & Notes</h3>
            </div>
            <div><Label className={labelCls}>Any compliance / messaging restrictions?</Label><Textarea className={inputCls} value={complianceRestrictions} onChange={e => setComplianceRestrictions(e.target.value)} placeholder="e.g. HIPAA, no cold SMS..." /></div>
            <div><Label className={labelCls}>Anything important we should know?</Label><Textarea className={inputCls} value={importantNotes} onChange={e => setImportantNotes(e.target.value)} placeholder="Special requests, preferences, etc." /></div>
          </CardContent>
        </Card>

        {/* E. Integrations */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Plug className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Integrations</h3>
            </div>
            <p className="text-xs text-muted-foreground">For each platform, let us know how you'd like to handle it.</p>

            {integrations.map((row, idx) => {
              const plat = PLATFORMS[idx];
              return (
                <div key={row.platform} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{plat.emoji} {plat.name}</span>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox checked={row.uses} onCheckedChange={(v) => {
                        updateIntegration(idx, "uses", !!v);
                        if (!v) updateIntegration(idx, "handling", "skip");
                      }} />
                      I use this
                    </label>
                  </div>

                  {row.uses && (
                    <div className="space-y-3 pl-1">
                      <div>
                        <Label className="text-xs text-muted-foreground">How should we handle this?</Label>
                        <select
                          className="mt-1 w-full h-9 rounded-md border border-input bg-background text-sm px-3"
                          value={row.handling}
                          onChange={e => updateIntegration(idx, "handling", e.target.value)}
                        >
                          <option value="">Select…</option>
                          <option value="use_existing">Use My Existing Account</option>
                          <option value="use_newlight">Use NewLight's System</option>
                          <option value="skip">Skip For Now</option>
                        </select>
                      </div>

                      {row.handling === "use_existing" && (
                        <>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox checked={row.access_ready} onCheckedChange={(v) => updateIntegration(idx, "access_ready", !!v)} />
                            Access is ready / credentials available
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><Label className="text-xs text-muted-foreground">Access Owner Name</Label><Input className="mt-1" value={row.access_owner_name} onChange={e => updateIntegration(idx, "access_owner_name", e.target.value)} /></div>
                            <div><Label className="text-xs text-muted-foreground">Access Owner Email</Label><Input className="mt-1" type="email" value={row.access_owner_email} onChange={e => updateIntegration(idx, "access_owner_email", e.target.value)} /></div>
                          </div>
                        </>
                      )}

                      <div><Label className="text-xs text-muted-foreground">Notes</Label><Input className="mt-1" value={row.notes} onChange={e => updateIntegration(idx, "notes", e.target.value)} placeholder="Optional" /></div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-center pt-2 pb-8">
          <Button onClick={handleSubmit} disabled={submitting} className="px-8 h-11">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</> : "Submit Information"}
          </Button>
        </div>
      </div>
    </div>
  );
}
