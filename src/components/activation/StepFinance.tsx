import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign } from "lucide-react";
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

export function StepFinance({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Finance + Payroll Ops" items={[
        "Configures payroll frequency, approval workflows, and export settings",
        "Creates accountant handoff tasks if needed",
        "Labor cost tracking links workforce time to financial reports",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Finance Configuration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Finance Dashboard?</label><YN value={form.use_finance} onChange={v => set("use_finance", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Payroll Frequency</label>
            <select value={form.payroll_frequency} onChange={e => set("payroll_frequency", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semi-monthly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className={labelCls}>Require Payroll Approval?</label><YN value={form.require_payroll_approval} onChange={v => set("require_payroll_approval", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Reimbursements Used?</label><YN value={form.reimbursements_used} onChange={v => set("reimbursements_used", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Deductions Used?</label><YN value={form.deductions_used} onChange={v => set("deductions_used", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Bonus Structure?</label><YN value={form.bonus_structure} onChange={v => set("bonus_structure", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Commission Structure?</label><YN value={form.commission_structure} onChange={v => set("commission_structure", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Labor Cost Tracking?</label><YN value={form.labor_cost_tracking} onChange={v => set("labor_cost_tracking", v)} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Accountant + Exports</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Accountant Name</label><Input value={form.accountant_name} onChange={e => set("accountant_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Accountant Email</label><Input value={form.accountant_email} onChange={e => set("accountant_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Payroll Export Frequency</label><Input value={form.payroll_export_frequency} onChange={e => set("payroll_export_frequency", e.target.value)} placeholder="Monthly, quarterly…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Accountant Handoff Exports?</label><YN value={form.accountant_handoff} onChange={v => set("accountant_handoff", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Revenue Categories</label><Input value={form.revenue_categories} onChange={e => set("revenue_categories", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Cost Centers / Departments</label><Input value={form.cost_centers} onChange={e => set("cost_centers", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Payroll Prep Notes</label><Textarea value={form.payroll_prep_notes} onChange={e => set("payroll_prep_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
