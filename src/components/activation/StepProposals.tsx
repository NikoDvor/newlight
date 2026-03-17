import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
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

export function StepProposals({ form, set, submitting }: StepProps) {
  if (form.use_proposals === "no") {
    return (
      <div className="space-y-4">
        <ActivationHelp title="Proposals / Signers" items={["Can be enabled later from Settings"]} />
        <div className={sectionCls} style={sectionStyle}>
          <div><label className={labelCls}>Use Proposal / Sign Center?</label><YN value={form.use_proposals} onChange={v => set("use_proposals", v)} disabled={submitting} /></div>
          <p className="text-xs text-white/30 italic">Proposals disabled — skip to next step.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ActivationHelp title="Proposals / Signers" items={[
        "Creates signer records and agreement workflow settings",
        "Generates document setup tasks for NDA/agreement templates",
      ]} />
      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><FileText className="h-3 w-3" /> Signer + Legal</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Proposals?</label><YN value={form.use_proposals} onChange={v => set("use_proposals", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Legal Business Name</label><Input value={form.signer_legal_name} onChange={e => set("signer_legal_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Signer Full Name</label><Input value={form.signer_name} onChange={e => set("signer_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Signer Title</label><Input value={form.signer_title} onChange={e => set("signer_title", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Signer Email</label><Input value={form.signer_email} onChange={e => set("signer_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Additional Approver Name</label><Input value={form.additional_approver_name} onChange={e => set("additional_approver_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Additional Approver Email</label><Input value={form.additional_approver_email} onChange={e => set("additional_approver_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Approval Order</label>
            <select value={form.approval_order} onChange={e => set("approval_order", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="sequential">Sequential</option><option value="parallel">Parallel</option>
            </select>
          </div>
          <div><label className={labelCls}>Need NDA?</label><YN value={form.need_nda} onChange={v => set("need_nda", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Need Service Agreement?</label><YN value={form.need_service_agreement} onChange={v => set("need_service_agreement", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Need Proposal Template?</label><YN value={form.need_proposal_template} onChange={v => set("need_proposal_template", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Internal Approval Chain?</label><YN value={form.need_internal_approval} onChange={v => set("need_internal_approval", v)} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Document Notes</label><Textarea value={form.document_notes} onChange={e => set("document_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
