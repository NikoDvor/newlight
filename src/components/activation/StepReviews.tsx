import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
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

export function StepReviews({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Reviews + Reputation" items={[
        "Configures review request workflows and public review links",
        "Enables service recovery for negative feedback automatically",
        "Links to appointment completion for automated requests",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Star className="h-3 w-3" /> Reputation Setup</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Native Reviews?</label><YN value={form.use_native_reviews} onChange={v => set("use_native_reviews", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Primary Review Platform</label>
            <select value={form.primary_review_platform} onChange={e => set("primary_review_platform", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="google">Google</option><option value="facebook">Facebook</option><option value="yelp">Yelp</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className={labelCls}>Google Review Link</label><Input value={form.google_review_link} onChange={e => set("google_review_link", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Facebook Review Link</label><Input value={form.facebook_review_link} onChange={e => set("facebook_review_link", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Other Review Link</label><Input value={form.other_review_link} onChange={e => set("other_review_link", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Review Send Timing</label>
            <select value={form.review_send_timing} onChange={e => set("review_send_timing", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="after_appointment">After Appointment</option><option value="manual">Manual Only</option><option value="after_purchase">After Purchase</option>
            </select>
          </div>
          <div><label className={labelCls}>Preferred Review Channel</label>
            <select value={form.preferred_review_channel} onChange={e => set("preferred_review_channel", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="email">Email</option><option value="sms">SMS</option><option value="both">Both</option>
            </select>
          </div>
          <div><label className={labelCls}>Recovery Owner</label><Input value={form.recovery_owner} onChange={e => set("recovery_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Auto-Send After Appointment?</label><YN value={form.auto_send_after_appointment} onChange={v => set("auto_send_after_appointment", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Service Recovery Enabled?</label><YN value={form.service_recovery_enabled} onChange={v => set("service_recovery_enabled", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Review Templates Needed?</label><YN value={form.review_templates_needed} onChange={v => set("review_templates_needed", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Reputation Goal / Target Rating</label><Input value={form.reputation_goal} onChange={e => set("reputation_goal", e.target.value)} placeholder="4.8 stars" className={inputCls} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Reputation Notes</label><Textarea value={form.reputation_notes} onChange={e => set("reputation_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
