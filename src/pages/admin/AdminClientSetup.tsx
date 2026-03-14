import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BackArrow } from "@/components/BackArrow";
import { LogoUploader } from "@/components/LogoUploader";
import {
  Loader2, Save, CheckCircle2, ArrowLeft, Building2, Globe, Palette,
  MapPin, Search, Share2, CreditCard, Phone, Video, Users, Plug, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type YesNo = "yes" | "no" | "";

export default function AdminClientSetup() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<any>(null);

  const [form, setForm] = useState({
    business_name: "", website_url: "", booking_link: "",
    logo_url: "", primary_color: "#3B82F6", secondary_color: "#06B6D4",
    welcome_message: "", dashboard_title: "",
    // Google / Local
    ga_connected: "" as YesNo, ga_email: "",
    sc_connected: "" as YesNo, sc_email: "",
    gbp_connected: "" as YesNo, gbp_email: "",
    // Social / Ads
    instagram_url: "", facebook_url: "", meta_email: "",
    gads_connected: "" as YesNo, gads_email: "",
    // Payments / Messaging / Meetings
    stripe_connected: "" as YesNo, stripe_email: "",
    twilio_connected: "" as YesNo, twilio_number: "",
    zoom_connected: "" as YesNo, zoom_email: "",
    // Website / Domain
    domain_provider: "", domain_email: "", existing_platform: "",
    need_new_website: "" as YesNo,
    // Team
    team_emails: "", team_roles: "",
    // Business
    main_services: "", main_offer: "", primary_goal: "",
    priority_channel: "", internal_notes: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("client_branding").select("*").eq("client_id", clientId).maybeSingle(),
    ]).then(([{ data: c }, { data: b }]) => {
      if (c) {
        setClient(c);
        setForm(f => ({
          ...f,
          business_name: c.business_name || "",
          primary_goal: (c as any).primary_goal || "",
        }));
      }
      if (b) {
        setForm(f => ({
          ...f,
          logo_url: b.logo_url || "",
          primary_color: b.primary_color || "#3B82F6",
          secondary_color: b.secondary_color || "#06B6D4",
          welcome_message: b.welcome_message || "",
        }));
      }
      setLoading(false);
    });
  }, [clientId]);

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);

    try {
      // Update branding
      await supabase.from("client_branding").upsert({
        client_id: clientId,
        company_name: form.business_name,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        welcome_message: form.welcome_message || "Welcome to your business dashboard",
        app_display_name: form.dashboard_title || form.business_name,
      }, { onConflict: "client_id" });

      // Update integration statuses
      const integrationMap: Record<string, { connected: YesNo; email?: string }> = {
        "Google Analytics": { connected: form.ga_connected, email: form.ga_email },
        "Google Search Console": { connected: form.sc_connected, email: form.sc_email },
        "Google Business Profile": { connected: form.gbp_connected, email: form.gbp_email },
        "Meta / Instagram": { connected: form.meta_email ? "yes" : form.ga_connected },
        "Google Ads": { connected: form.gads_connected, email: form.gads_email },
        "Stripe": { connected: form.stripe_connected, email: form.stripe_email },
        "Twilio": { connected: form.twilio_connected },
        "Zoom": { connected: form.zoom_connected, email: form.zoom_email },
      };

      for (const [name, val] of Object.entries(integrationMap)) {
        if (val.connected === "yes") {
          await supabase.from("client_integrations")
            .update({ status: "connected", config: { access_email: val.email || null } })
            .eq("client_id", clientId)
            .eq("integration_name", name);
        } else if (val.connected === "no") {
          await supabase.from("client_integrations")
            .update({ status: "disconnected" })
            .eq("client_id", clientId)
            .eq("integration_name", name);
        }
      }

      // Update onboarding progress
      await supabase.from("onboarding_progress").update({
        business_info: true,
        website_connected: form.website_url ? true : false,
        google_business_connected: form.gbp_connected === "yes",
        ad_account_connected: form.gads_connected === "yes",
        review_platform_connected: form.gbp_connected === "yes",
      }).eq("client_id", clientId);

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "post_payment_setup_completed",
        client_id: clientId,
        module: "setup",
        metadata: { submitted_by: "admin", integrations_configured: Object.keys(integrationMap).filter(k => integrationMap[k].connected === "yes") },
      });

      toast.success("Setup saved! Client workspace updated.");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
  const labelCls = "text-xs text-white/50 mb-1 block";
  const sectionCls = "rounded-xl p-4 space-y-3";
  const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
  const sectionHeader = "text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5";

  const YesNoSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3">
      <option value="">Select...</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <BackArrow to="/admin/clients" label="Back to Clients" />
        <h1 className="text-2xl font-bold text-white">Post-Payment Integration + Setup</h1>
        <p className="text-sm text-white/50 mt-1">Complete the remaining setup details for <span className="text-white/70">{client?.business_name}</span></p>
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-5 space-y-5">

          {/* Business + Brand */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Building2 className="h-3 w-3" /> Business + Brand</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Business Name</label><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Website URL</label><Input value={form.website_url} onChange={e => set("website_url", e.target.value)} placeholder="https://..." className={inputCls} /></div>
              <div><label className={labelCls}>Booking Link</label><Input value={form.booking_link} onChange={e => set("booking_link", e.target.value)} placeholder="https://calendly.com/..." className={inputCls} /></div>
              <div><label className={labelCls}>Logo URL</label><Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." className={inputCls} /></div>
              <div><label className={labelCls}>Primary Color</label><div className="flex gap-2"><input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" /><Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className={`${inputCls} flex-1`} /></div></div>
              <div><label className={labelCls}>Secondary Color</label><div className="flex gap-2"><input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" /><Input value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className={`${inputCls} flex-1`} /></div></div>
              <div className="sm:col-span-2"><label className={labelCls}>Welcome Message</label><Input value={form.welcome_message} onChange={e => set("welcome_message", e.target.value)} placeholder="Welcome to your business dashboard" className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Dashboard Title</label><Input value={form.dashboard_title} onChange={e => set("dashboard_title", e.target.value)} placeholder="My Business HQ" className={inputCls} /></div>
            </div>
          </div>

          {/* Google / Local */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Search className="h-3 w-3" /> Google / Local</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Google Analytics Connected?</label><YesNoSelect value={form.ga_connected} onChange={v => set("ga_connected", v)} /></div>
              <div><label className={labelCls}>GA Access Email</label><Input value={form.ga_email} onChange={e => set("ga_email", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Search Console Connected?</label><YesNoSelect value={form.sc_connected} onChange={v => set("sc_connected", v)} /></div>
              <div><label className={labelCls}>SC Access Email</label><Input value={form.sc_email} onChange={e => set("sc_email", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Google Business Profile Connected?</label><YesNoSelect value={form.gbp_connected} onChange={v => set("gbp_connected", v)} /></div>
              <div><label className={labelCls}>GBP Access Email</label><Input value={form.gbp_email} onChange={e => set("gbp_email", e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          {/* Social / Ads */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Share2 className="h-3 w-3" /> Social / Ads</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Instagram URL</label><Input value={form.instagram_url} onChange={e => set("instagram_url", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Facebook URL</label><Input value={form.facebook_url} onChange={e => set("facebook_url", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Meta Business Manager Email</label><Input value={form.meta_email} onChange={e => set("meta_email", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Google Ads Connected?</label><YesNoSelect value={form.gads_connected} onChange={v => set("gads_connected", v)} /></div>
              <div><label className={labelCls}>Google Ads Access Email</label><Input value={form.gads_email} onChange={e => set("gads_email", e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          {/* Payments / Messaging / Meetings */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><CreditCard className="h-3 w-3" /> Payments / Messaging / Meetings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Stripe Connected?</label><YesNoSelect value={form.stripe_connected} onChange={v => set("stripe_connected", v)} /></div>
              <div><label className={labelCls}>Stripe Account Email</label><Input value={form.stripe_email} onChange={e => set("stripe_email", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Twilio Connected?</label><YesNoSelect value={form.twilio_connected} onChange={v => set("twilio_connected", v)} /></div>
              <div><label className={labelCls}>Preferred Business Number</label><Input value={form.twilio_number} onChange={e => set("twilio_number", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Zoom Connected?</label><YesNoSelect value={form.zoom_connected} onChange={v => set("zoom_connected", v)} /></div>
              <div><label className={labelCls}>Zoom Email</label><Input value={form.zoom_email} onChange={e => set("zoom_email", e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          {/* Website / Domain */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Globe className="h-3 w-3" /> Website / Domain</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Domain Provider</label><Input value={form.domain_provider} onChange={e => set("domain_provider", e.target.value)} placeholder="GoDaddy, Namecheap..." className={inputCls} /></div>
              <div><label className={labelCls}>Domain Login Email</label><Input value={form.domain_email} onChange={e => set("domain_email", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Existing Website Platform</label><Input value={form.existing_platform} onChange={e => set("existing_platform", e.target.value)} placeholder="WordPress, Squarespace..." className={inputCls} /></div>
              <div><label className={labelCls}>Need New Website Build?</label><YesNoSelect value={form.need_new_website} onChange={v => set("need_new_website", v)} /></div>
            </div>
          </div>

          {/* Team */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Users className="h-3 w-3" /> Team Access</p>
            <div className="grid grid-cols-1 gap-3">
              <div><label className={labelCls}>Team Member Emails (comma-separated)</label><Textarea value={form.team_emails} onChange={e => set("team_emails", e.target.value)} placeholder="john@example.com, jane@example.com" className={`${inputCls} min-h-[50px]`} /></div>
              <div><label className={labelCls}>Team Member Roles</label><Input value={form.team_roles} onChange={e => set("team_roles", e.target.value)} placeholder="e.g. Marketing Manager, Office Admin" className={inputCls} /></div>
            </div>
          </div>

          {/* Business / Service */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Zap className="h-3 w-3" /> Business / Service Setup</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Main Services</label><Input value={form.main_services} onChange={e => set("main_services", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Main Offer</label><Input value={form.main_offer} onChange={e => set("main_offer", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Primary Goal</label><Input value={form.primary_goal} onChange={e => set("primary_goal", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Highest Priority Channel</label><Input value={form.priority_channel} onChange={e => set("priority_channel", e.target.value)} placeholder="SEO, Ads, Social..." className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Internal Notes</label><Textarea value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} className={`${inputCls} min-h-[60px]`} /></div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-11">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Setup</>}
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline" className="border-white/10 text-white hover:bg-white/10">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
