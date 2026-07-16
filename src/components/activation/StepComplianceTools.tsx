import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const captionCls = "text-[10px] text-white/40 mt-1";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
const selectCls = "w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3";

const YN = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={selectCls}>
    <option value="">Select…</option><option value="yes">Yes</option><option value="no">No</option>
  </select>
);

export function StepComplianceTools({ form, set, submitting }: StepProps) {
  const f = form as Record<string, string>;
  return (
    <div className="space-y-4">
      <ActivationHelp title="Advisor & Compliance Tools" items={[
        "Configures compliance-aware marketing review for regulated clients",
        "Enables household CRM, review cadence, and KYC tools where relevant",
        "Admin-managed — client does not self-serve these settings",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Compliance Configuration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Needs Compliance Review?</label>
            <YN value={f.needs_compliance_review || ""} onChange={v => set("needs_compliance_review", v)} disabled={submitting} />
            <p className={captionCls}>Turns on internal marketing review/testimonial/promoter workflow for this client</p>
          </div>
          <div>
            <label className={labelCls}>SEC / FINRA Regulated?</label>
            <YN value={f.is_sec_finra_regulated || ""} onChange={v => set("is_sec_finra_regulated", v)} disabled={submitting} />
            <p className={captionCls}>Enforces strict disclosure-gate rules on this client's materials vs. optional best-practice</p>
          </div>
          <div>
            <label className={labelCls}>Needs Household CRM?</label>
            <YN value={f.needs_household_crm || ""} onChange={v => set("needs_household_crm", v)} disabled={submitting} />
            <p className={captionCls}>Relevant for financial advisor clients grouping contacts by household</p>
          </div>
          <div>
            <label className={labelCls}>Review Cadence Enabled?</label>
            <YN value={f.review_cadence_enabled || ""} onChange={v => set("review_cadence_enabled", v)} disabled={submitting} />
          </div>
          {f.review_cadence_enabled === "yes" && (
            <div>
              <label className={labelCls}>Default Review Cadence</label>
              <select value={f.review_cadence_default || ""} onChange={e => set("review_cadence_default", e.target.value)} disabled={submitting} className={selectCls}>
                <option value="">Select…</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Age / Life-Event Triggers Enabled?</label>
            <YN value={f.age_life_event_triggers_enabled || ""} onChange={v => set("age_life_event_triggers_enabled", v)} disabled={submitting} />
            <p className={captionCls}>Only meaningful for advisor-type clients with contact birthdates on file</p>
          </div>
          <div>
            <label className={labelCls}>KYC Tool Enabled?</label>
            <YN value={f.kyc_tool_enabled || ""} onChange={v => set("kyc_tool_enabled", v)} disabled={submitting} />
            <p className={captionCls}>Turns on the risk-profile fact-finder for this client's contacts</p>
          </div>
          <div>
            <label className={labelCls}>Compliant Texting Log Enabled?</label>
            <YN value={f.compliant_texting_log_enabled || ""} onChange={v => set("compliant_texting_log_enabled", v)} disabled={submitting} />
          </div>
          {f.compliant_texting_log_enabled === "yes" && (
            <div className="sm:col-span-2">
              <label className="flex items-start gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  required
                  checked={f.compliant_texting_ack === "yes"}
                  onChange={e => set("compliant_texting_ack", e.target.checked ? "yes" : "")}
                  disabled={submitting}
                  className="mt-0.5"
                />
                <span>Client confirms their business type (RIA vs. broker-dealer) has been reviewed with counsel regarding recordkeeping requirements</span>
              </label>
            </div>
          )}
          <div>
            <label className={labelCls}>Meeting Notetaker Path</label>
            <select value={f.meeting_notetaker_path || "manual"} onChange={e => set("meeting_notetaker_path", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="manual">Manual / Transcript Paste (default)</option>
              <option value="vendor_webhook">Vendor Webhook (Jump/Zocks/Zeplyn)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Webinar Module Enabled?</label>
            <YN value={f.webinar_module_enabled || ""} onChange={v => set("webinar_module_enabled", v)} disabled={submitting} />
          </div>
          <div>
            <label className={labelCls}>Compliance Template Library Access?</label>
            <YN value={f.compliance_template_library_access || ""} onChange={v => set("compliance_template_library_access", v)} disabled={submitting} />
          </div>
        </div>
        <div><label className={labelCls}>Compliance Notes</label><Textarea value={f.compliance_notes || ""} onChange={e => set("compliance_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
