import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
const selectCls = "w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3";

const YN = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={selectCls}>
    <option value="">Select…</option><option value="yes">Yes</option><option value="no">No</option>
  </select>
);

export function StepMarketing({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Marketing Systems" items={[
        "Enables SEO, website, ads, social, and content planner modules",
        "Creates starter keyword/competitor records if provided",
        "Example data shown automatically until live integrations exist",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Module Activation</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>SEO Command Center?</label><YN value={form.use_seo} onChange={v => set("use_seo", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Website Workspace?</label><YN value={form.use_website_workspace} onChange={v => set("use_website_workspace", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Ads Workspace?</label><YN value={form.use_ads} onChange={v => set("use_ads", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Social Workspace?</label><YN value={form.use_social} onChange={v => set("use_social", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Content Planner?</label><YN value={form.use_content_planner} onChange={v => set("use_content_planner", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Local Visibility Tracking?</label><YN value={form.local_visibility} onChange={v => set("local_visibility", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Content Workflow / Approvals?</label><YN value={form.content_workflow} onChange={v => set("content_workflow", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Show Example Data?</label><YN value={form.example_data} onChange={v => set("example_data", v)} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Marketing Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Main Website Platform</label><Input value={form.main_website_platform} onChange={e => set("main_website_platform", e.target.value)} placeholder="WordPress, Wix, Shopify…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Service Areas / Locations</label><Input value={form.service_areas} onChange={e => set("service_areas", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>SEO Priority Keywords</label><Input value={form.seo_keywords} onChange={e => set("seo_keywords", e.target.value)} placeholder="keyword1, keyword2…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Competitors</label><Input value={form.competitors} onChange={e => set("competitors", e.target.value)} placeholder="competitor1.com, competitor2.com…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Ad Platforms Used</label><Input value={form.ad_platforms} onChange={e => set("ad_platforms", e.target.value)} placeholder="Google Ads, Meta…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Social Platforms Used</label><Input value={form.social_platforms} onChange={e => set("social_platforms", e.target.value)} placeholder="Instagram, Facebook, LinkedIn…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Content Approval Owner</label><Input value={form.content_approval_owner} onChange={e => set("content_approval_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Main KPIs</label><Input value={form.main_kpis} onChange={e => set("main_kpis", e.target.value)} placeholder="Leads, Revenue, Traffic…" className={inputCls} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Marketing Notes</label><Textarea value={form.marketing_notes} onChange={e => set("marketing_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
