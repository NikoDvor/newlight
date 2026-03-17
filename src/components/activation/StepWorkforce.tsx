import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
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

export function StepWorkforce({ form, set, submitting }: StepProps) {
  if (form.use_workforce === "no") {
    return (
      <div className="space-y-4">
        <ActivationHelp title="Team + Workforce" items={[
          "Skip this section if the client doesn't need time tracking or payroll ops",
          "Can be enabled later from Settings",
        ]} />
        <div className={sectionCls} style={sectionStyle}>
          <div><label className={labelCls}>Use Workforce / Time Tracking?</label><YN value={form.use_workforce} onChange={v => set("use_workforce", v)} disabled={submitting} /></div>
          <p className="text-xs text-white/30 italic">Workforce is disabled — skip to next step or enable above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ActivationHelp title="Team + Workforce" items={[
        "Creates worker records and workforce settings",
        "Configures timesheet approval workflows and pay types",
        "Workers can be added individually later",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><UserPlus className="h-3 w-3" /> Workforce Settings</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Workforce?</label><YN value={form.use_workforce} onChange={v => set("use_workforce", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Need Payroll Ops?</label><YN value={form.need_payroll} onChange={v => set("need_payroll", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Number of Workers</label><Input value={form.num_workers} onChange={e => set("num_workers", e.target.value)} placeholder="e.g. 5" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Departments</label><Input value={form.departments} onChange={e => set("departments", e.target.value)} placeholder="Sales, Support, Ops…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Labor Categories</label><Input value={form.labor_categories} onChange={e => set("labor_categories", e.target.value)} placeholder="Billable, Admin…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Require Timesheet Approval?</label><YN value={form.require_timesheet_approval} onChange={v => set("require_timesheet_approval", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Default Pay Frequency</label>
            <select value={form.default_pay_frequency} onChange={e => set("default_pay_frequency", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semi-monthly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className={labelCls}>Overtime Enabled?</label><YN value={form.overtime_enabled} onChange={v => set("overtime_enabled", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Commission Enabled?</label><YN value={form.commission_enabled} onChange={v => set("commission_enabled", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Workforce Manager / Approver</label><Input value={form.workforce_manager} onChange={e => set("workforce_manager", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Employee Portal Access?</label><YN value={form.employee_portal} onChange={v => set("employee_portal", v)} disabled={submitting} /></div>
        </div>
      </div>
    </div>
  );
}
