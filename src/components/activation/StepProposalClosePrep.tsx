import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, DollarSign, UserPlus } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

export function StepProposalClosePrep({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Proposal + Close Prep" items={[
        "Set package, pricing, and contract terms",
        "Assign internal team members",
        "Prepare for the close conversation",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> Package + Terms
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Service Package</label>
            <select value={form.service_package} onChange={e => set("service_package", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
              <option value="enterprise">Enterprise</option>
              <option value="growth">Growth</option>
              <option value="starter">Starter</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div><label className={labelCls}>Contract Term</label><Input value={form.contract_term} onChange={e => set("contract_term", e.target.value)} placeholder="12 months" className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" /> Pricing
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Setup Fee</label><Input value={form.setup_fee} onChange={e => set("setup_fee", e.target.value)} placeholder="$0" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Monthly Fee</label><Input value={form.monthly_fee} onChange={e => set("monthly_fee", e.target.value)} placeholder="$0" className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <UserPlus className="h-3 w-3" /> Internal Assignment
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Assigned Account Manager</label><Input value={form.assigned_account_manager} onChange={e => set("assigned_account_manager", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Assigned Sales Rep</label><Input value={form.assigned_sales_rep} onChange={e => set("assigned_sales_rep", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Activation Priority</label>
            <select value={form.activation_priority} onChange={e => set("activation_priority", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
              <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div><label className={labelCls}>Requested Launch Date</label><Input type="date" value={form.requested_launch_date} onChange={e => set("requested_launch_date", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Internal Closing Notes</label><Textarea value={form.closing_notes} onChange={e => set("closing_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
