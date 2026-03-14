import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import {
  Loader2, Save, CheckCircle2, Building2, Globe, Palette,
  Search, Share2, CreditCard, Phone, Video, Users, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

type YesNo = "yes" | "no" | "";

export default function ClientSetup() {
  const { activeClientId } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    business_name: "", website_url: "", booking_link: "",
    logo_url: "", primary_color: "#3B82F6", secondary_color: "#06B6D4",
    welcome_message: "", dashboard_title: "",
    ga_connected: "" as YesNo, ga_email: "",
    sc_connected: "" as YesNo, sc_email: "",
    gbp_connected: "" as YesNo, gbp_email: "",
    instagram_url: "", facebook_url: "", meta_email: "",
    gads_connected: "" as YesNo, gads_email: "",
    stripe_connected: "" as YesNo, stripe_email: "",
    twilio_connected: "" as YesNo, twilio_number: "",
    zoom_connected: "" as YesNo, zoom_email: "",
    domain_provider: "", domain_email: "", existing_platform: "",
    need_new_website: "" as YesNo,
    team_emails: "", team_roles: "",
    main_services: "", main_offer: "", primary_goal: "",
    priority_channel: "", internal_notes: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!activeClientId) return;
    Promise.all([
      supabase.from("clients").select("*").eq("id", activeClientId).single(),
      supabase.from("client_branding").select("*").eq("client_id", activeClientId).maybeSingle(),
    ]).then(([{ data: c }, { data: b }]) => {
      if (c) setForm(f => ({ ...f, business_name: c.business_name || "" }));
      if (b) setForm(f => ({
        ...f,
        logo_url: b.logo_url || "",
        primary_color: b.primary_color || "#3B82F6",
        secondary_color: b.secondary_color || "#06B6D4",
        welcome_message: b.welcome_message || "",
      }));
    });
  }, [activeClientId]);

  const handleSave = async () => {
    if (!activeClientId) return;
    setSaving(true);
    try {
      await supabase.from("client_branding").upsert({
        client_id: activeClientId,
        company_name: form.business_name,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        welcome_message: form.welcome_message || "Welcome to your business dashboard",
        app_display_name: form.dashboard_title || form.business_name,
      }, { onConflict: "client_id" });

      const integrationMap: Record<string, YesNo> = {
        "Google Analytics": form.ga_connected,
        "Google Search Console": form.sc_connected,
        "Google Business Profile": form.gbp_connected,
        "Google Ads": form.gads_connected,
        "Stripe": form.stripe_connected,
        "Twilio": form.twilio_connected,
        "Zoom": form.zoom_connected,
      };

      for (const [name, val] of Object.entries(integrationMap)) {
        if (val) {
          await supabase.from("client_integrations")
            .update({ status: val === "yes" ? "connected" : "disconnected" })
            .eq("client_id", activeClientId)
            .eq("integration_name", name);
        }
      }

      await supabase.from("onboarding_progress").update({
        business_info: true,
        website_connected: !!form.website_url,
        google_business_connected: form.gbp_connected === "yes",
        ad_account_connected: form.gads_connected === "yes",
      }).eq("client_id", activeClientId);

      await supabase.from("audit_logs").insert({
        action: "client_setup_form_completed",
        client_id: activeClientId,
        module: "setup",
      });

      setSaved(true);
      toast.success("Setup saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "bg-primary/[0.03] border-primary/10 text-foreground placeholder:text-muted-foreground/50";
  const labelCls = "text-xs text-muted-foreground mb-1 block";
  const sectionCls = "rounded-xl p-4 space-y-3 border border-primary/[0.06] bg-primary/[0.02]";

  const YesNoSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 rounded-md bg-primary/[0.03] border border-primary/10 text-foreground text-sm px-3">
      <option value="">Select...</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );

  return (
    <div>
      <PageHeader title="Complete Your Setup" description="Fill in the remaining details to fully activate your workspace" />

      {saved && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl border border-primary/10 bg-primary/[0.04] flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Setup saved! Your workspace has been updated.</p>
        </motion.div>
      )}

      <div className="space-y-5 max-w-3xl">
        {/* Business + Brand */}
        <div className={sectionCls}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Business + Brand</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Business Name</label><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Website URL</label><Input value={form.website_url} onChange={e => set("website_url", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Booking Link</label><Input value={form.booking_link} onChange={e => set("booking_link", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Logo URL</label><Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Primary Color</label><div className="flex gap-2"><input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" /><Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className={`${inputCls} flex-1`} /></div></div>
            <div><label className={labelCls}>Secondary Color</label><div className="flex gap-2"><input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" /><Input value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className={`${inputCls} flex-1`} /></div></div>
            <div className="sm:col-span-2"><label className={labelCls}>Welcome Message</label><Input value={form.welcome_message} onChange={e => set("welcome_message", e.target.value)} className={inputCls} /></div>
          </div>
        </div>

        {/* Google / Local */}
        <div className={sectionCls}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Search className="h-3 w-3" /> Google / Local</p>
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
        <div className={sectionCls}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Share2 className="h-3 w-3" /> Social / Ads</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Instagram URL</label><Input value={form.instagram_url} onChange={e => set("instagram_url", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Facebook URL</label><Input value={form.facebook_url} onChange={e => set("facebook_url", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Meta Business Manager Email</label><Input value={form.meta_email} onChange={e => set("meta_email", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Google Ads Connected?</label><YesNoSelect value={form.gads_connected} onChange={v => set("gads_connected", v)} /></div>
            <div><label className={labelCls}>Google Ads Access Email</label><Input value={form.gads_email} onChange={e => set("gads_email", e.target.value)} className={inputCls} /></div>
          </div>
        </div>

        {/* Payments / Messaging / Meetings */}
        <div className={sectionCls}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Payments / Messaging / Meetings</p>
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
        <div className={sectionCls}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Globe className="h-3 w-3" /> Website / Domain</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Domain Provider</label><Input value={form.domain_provider} onChange={e => set("domain_provider", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Domain Login Email</label><Input value={form.domain_email} onChange={e => set("domain_email", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Existing Website Platform</label><Input value={form.existing_platform} onChange={e => set("existing_platform", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Need New Website Build?</label><YesNoSelect value={form.need_new_website} onChange={v => set("need_new_website", v)} /></div>
          </div>
        </div>

        {/* Team */}
        <div className={sectionCls}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3 w-3" /> Team Access</p>
          <div className="grid grid-cols-1 gap-3">
            <div><label className={labelCls}>Team Member Emails (comma-separated)</label><Textarea value={form.team_emails} onChange={e => set("team_emails", e.target.value)} className={`${inputCls} min-h-[50px]`} /></div>
            <div><label className={labelCls}>Team Member Roles</label><Input value={form.team_roles} onChange={e => set("team_roles", e.target.value)} className={inputCls} /></div>
          </div>
        </div>

        {/* Business / Service */}
        <div className={sectionCls}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Zap className="h-3 w-3" /> Business / Service Setup</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Main Services</label><Input value={form.main_services} onChange={e => set("main_services", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Main Offer</label><Input value={form.main_offer} onChange={e => set("main_offer", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Primary Goal</label><Input value={form.primary_goal} onChange={e => set("primary_goal", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Highest Priority Channel</label><Input value={form.priority_channel} onChange={e => set("priority_channel", e.target.value)} className={inputCls} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Internal Notes</label><Textarea value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} className={`${inputCls} min-h-[60px]`} /></div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-11 btn-gradient">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Setup</>}
        </Button>
      </div>
    </div>
  );
}
