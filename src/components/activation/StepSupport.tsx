import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Headphones } from "lucide-react";
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

export function StepSupport({ form, set, submitting }: StepProps) {
  if (form.use_helpdesk === "no") {
    return (
      <div className="space-y-4">
        <ActivationHelp title="Support / Help Desk" items={["Can be enabled later"]} />
        <div className={sectionCls} style={sectionStyle}>
          <div><label className={labelCls}>Use Native Help Desk?</label><YN value={form.use_helpdesk} onChange={v => set("use_helpdesk", v)} disabled={submitting} /></div>
          <p className="text-xs text-white/30 italic">Help Desk disabled — skip to next step.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ActivationHelp title="Support / Help Desk" items={[
        "Creates support inbox and owner assignments",
        "Configures ticket categories and escalation workflows",
      ]} />
      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Headphones className="h-3 w-3" /> Help Desk Setup</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Native Help Desk?</label><YN value={form.use_helpdesk} onChange={v => set("use_helpdesk", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Support Email</label><Input value={form.support_email} onChange={e => set("support_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Support Inbox Owner</label><Input value={form.support_inbox_owner} onChange={e => set("support_inbox_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Ticket Categories</label><Input value={form.ticket_categories} onChange={e => set("ticket_categories", e.target.value)} placeholder="Billing, Technical, General…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Priority Contact</label><Input value={form.priority_contact} onChange={e => set("priority_contact", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Customer Support Portal?</label><YN value={form.customer_support_portal} onChange={v => set("customer_support_portal", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Internal Escalation?</label><YN value={form.internal_escalation} onChange={v => set("internal_escalation", v)} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>SLA Notes</label><Textarea value={form.sla_notes} onChange={e => set("sla_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
        <div><label className={labelCls}>Help Desk Notes</label><Textarea value={form.helpdesk_notes} onChange={e => set("helpdesk_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
