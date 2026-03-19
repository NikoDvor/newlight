import { Input } from "@/components/ui/input";
import { Building2, Palette } from "lucide-react";
import { LogoUploader } from "@/components/LogoUploader";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

export function StepBranding({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Business Identity + Branding" items={[
        "Configures workspace branding, colors, logos, and display names",
        "Updates dashboard text, calendar titles, and client portal branding",
        "All fields can be changed later in Settings",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Business Identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Company Name</label><Input value={form.company_name} onChange={e => set("company_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Display Name</label><Input value={form.display_name} onChange={e => set("display_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Dashboard Title</label><Input value={form.dashboard_title} onChange={e => set("dashboard_title", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>App Display Name</label><Input value={form.app_display_name} onChange={e => set("app_display_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Welcome Message</label><Input value={form.welcome_message} onChange={e => set("welcome_message", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Tagline</label><Input value={form.tagline} onChange={e => set("tagline", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Website URL</label><Input value={form.website_url} onChange={e => set("website_url", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Industry</label><Input value={form.industry} onChange={e => set("industry", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Primary Location</label><Input value={form.primary_location} onChange={e => set("primary_location", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Additional Locations</label><Input value={form.additional_locations} onChange={e => set("additional_locations", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Main Service / Offer</label><Input value={form.main_service} onChange={e => set("main_service", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Primary Goal</label><Input value={form.primary_goal} onChange={e => set("primary_goal", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Biggest Growth Challenge</label><Input value={form.growth_challenge} onChange={e => set("growth_challenge", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Brand Personality</label><Input value={form.brand_personality} onChange={e => set("brand_personality", e.target.value)} placeholder="e.g. Professional, Friendly, Bold" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Tone of Voice</label><Input value={form.tone_of_voice} onChange={e => set("tone_of_voice", e.target.value)} placeholder="e.g. Conversational, Authoritative" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Workspace Header Name</label><Input value={form.workspace_header_name} onChange={e => set("workspace_header_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Palette className="h-3 w-3" /> Visual Branding</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={labelCls}>Primary Color</label><div className="flex gap-2"><input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" /><Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} /></div></div>
          <div><label className={labelCls}>Secondary Color</label><div className="flex gap-2"><input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" /><Input value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} /></div></div>
          <div><label className={labelCls}>Accent Color</label><div className="flex gap-2"><input type="color" value={form.accent_color} onChange={e => set("accent_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" /><Input value={form.accent_color} onChange={e => set("accent_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} /></div></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Logo URL</label><Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Login / Welcome Branding Text</label><Input value={form.login_branding_text} onChange={e => set("login_branding_text", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Calendar Title</label><Input value={form.calendar_title} onChange={e => set("calendar_title", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Finance Dashboard Title</label><Input value={form.finance_dashboard_title} onChange={e => set("finance_dashboard_title", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Report Header Title</label><Input value={form.report_header_title} onChange={e => set("report_header_title", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      </div>
    </div>
  );
}
