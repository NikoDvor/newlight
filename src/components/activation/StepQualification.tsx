import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Target, UserPlus, Mail, Phone, Globe, MapPin, Briefcase } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

export function StepQualification({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Qualification" items={[
        "Capture contact information and business overview",
        "Identify lead source and primary goal",
        "Qualify the prospect before proposal stage",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="h-3 w-3" /> Business Overview
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Business Name *</label><Input value={form.business_name_confirmed} onChange={e => set("business_name_confirmed", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Legal Business Name</label><Input value={form.legal_business_name} onChange={e => set("legal_business_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Display Name</label><Input value={form.display_name} onChange={e => set("display_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Industry</label><Input value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="e.g. Salon, Med Spa, Agency" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}><Globe className="h-3 w-3 inline mr-1" />Website</label><Input value={form.website_url} onChange={e => set("website_url", e.target.value)} placeholder="https://" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}><MapPin className="h-3 w-3 inline mr-1" />Primary Location</label><Input value={form.primary_location} onChange={e => set("primary_location", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <UserPlus className="h-3 w-3" /> Primary Contact
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Owner Full Name *</label><Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Owner Email *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
          <div><label className={labelCls}>Owner Phone</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
          <div><label className={labelCls}>Secondary Contact Name</label><Input value={form.secondary_contact_name} onChange={e => set("secondary_contact_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Secondary Contact Email</label><Input value={form.secondary_contact_email} onChange={e => set("secondary_contact_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Secondary Contact Phone</label><Input value={form.secondary_contact_phone} onChange={e => set("secondary_contact_phone", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="h-3 w-3" /> Lead Context
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Main Service / Product</label><Input value={form.main_service} onChange={e => set("main_service", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Primary Goal</label><Input value={form.primary_goal} onChange={e => set("primary_goal", e.target.value)} placeholder="e.g. More bookings, better reviews" className={inputCls} disabled={submitting} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Growth Challenge</label><Textarea value={form.growth_challenge} onChange={e => set("growth_challenge", e.target.value)} placeholder="What's holding them back?" className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Internal Sales Notes</label><Textarea value={form.sales_notes} onChange={e => set("sales_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
