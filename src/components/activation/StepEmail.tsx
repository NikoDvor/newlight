import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone } from "lucide-react";
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

export function StepEmail({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Email + Messaging" items={[
        "Configures inboxes, sender names, and messaging channels",
        "Creates integration records for email/SMS providers",
        "Connects review requests and booking reminders to messaging",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email Setup</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Native Email Hub?</label><YN value={form.use_native_email} onChange={v => set("use_native_email", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Email Provider</label><Input value={form.email_provider} onChange={e => set("email_provider", e.target.value)} placeholder="Gmail, Outlook…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Main Inbox Address</label><Input value={form.main_inbox} onChange={e => set("main_inbox", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Sender Name</label><Input value={form.sender_name} onChange={e => set("sender_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Reply-To Email</label><Input value={form.reply_to_email} onChange={e => set("reply_to_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Shared Inbox?</label><YN value={form.shared_inbox} onChange={v => set("shared_inbox", v)} disabled={submitting} /></div>
          {form.shared_inbox === "yes" && <div className="sm:col-span-2"><label className={labelCls}>Shared Inbox Users</label><Input value={form.shared_inbox_users} onChange={e => set("shared_inbox_users", e.target.value)} placeholder="email1, email2…" className={inputCls} disabled={submitting} /></div>}
          <div><label className={labelCls}>Sales Inbox?</label><YN value={form.sales_inbox} onChange={v => set("sales_inbox", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Support Inbox?</label><YN value={form.support_inbox} onChange={v => set("support_inbox", v)} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Phone className="h-3 w-3" /> Messaging + SMS</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Review Request Messaging?</label><YN value={form.review_messaging} onChange={v => set("review_messaging", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Booking Reminder Messaging?</label><YN value={form.booking_reminder_messaging} onChange={v => set("booking_reminder_messaging", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Follow-Up Messaging?</label><YN value={form.followup_messaging} onChange={v => set("followup_messaging", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Messaging Owner</label><Input value={form.messaging_owner} onChange={e => set("messaging_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Preferred Reminder Channel</label>
            <select value={form.preferred_reminder_channel} onChange={e => set("preferred_reminder_channel", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="email">Email</option><option value="sms">SMS</option><option value="both">Both</option>
            </select>
          </div>
          <div><label className={labelCls}>Business Phone Number</label><Input value={form.business_phone} onChange={e => set("business_phone", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Twilio / SMS Rail Needed?</label><YN value={form.twilio_needed} onChange={v => set("twilio_needed", v)} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Email / Messaging Notes</label><Textarea value={form.email_notes} onChange={e => set("email_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
