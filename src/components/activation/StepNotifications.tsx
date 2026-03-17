import { Input } from "@/components/ui/input";
import { Bell } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
const selectCls = "w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3";

export function StepNotifications({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Notifications + Permissions" items={[
        "Configures who receives which notification types",
        "Creates role/access assignments for the workspace",
        "Notification channels can be updated in Settings later",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Bell className="h-3 w-3" /> Notification Owners</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Booking Notifications To</label><Input value={form.booking_notify} onChange={e => set("booking_notify", e.target.value)} placeholder="email1, email2…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Cancellation Notifications To</label><Input value={form.cancellation_notify} onChange={e => set("cancellation_notify", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Review Recovery Notifications To</label><Input value={form.review_recovery_notify} onChange={e => set("review_recovery_notify", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Payroll Approval Notifications To</label><Input value={form.payroll_approval_notify} onChange={e => set("payroll_approval_notify", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Support Ticket Notifications To</label><Input value={form.support_ticket_notify} onChange={e => set("support_ticket_notify", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Onboarding Notifications To</label><Input value={form.onboarding_notify} onChange={e => set("onboarding_notify", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Channels + Roles</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Preferred Channels</label>
            <select value={form.preferred_channels} onChange={e => set("preferred_channels", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="in_app">In-App</option><option value="email">Email</option><option value="sms">SMS</option><option value="all">All</option>
            </select>
          </div>
          <div><label className={labelCls}>Quiet Hours</label><Input value={form.quiet_hours} onChange={e => set("quiet_hours", e.target.value)} placeholder="e.g. 9pm-8am" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Manager Roles</label><Input value={form.manager_roles} onChange={e => set("manager_roles", e.target.value)} placeholder="Names or emails" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Read Only Users</label><Input value={form.readonly_users} onChange={e => set("readonly_users", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Client Team Members</label><Input value={form.client_team_members} onChange={e => set("client_team_members", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Worker Portal Users</label><Input value={form.worker_portal_users} onChange={e => set("worker_portal_users", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      </div>
    </div>
  );
}
