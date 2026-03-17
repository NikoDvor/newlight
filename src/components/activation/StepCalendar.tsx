import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
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

export function StepCalendar({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Calendar Setup" items={[
        "Creates calendars, booking links, and availability rules",
        "Supports multiple calendars for different team members or services",
        "Branded booking pages are created automatically",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Calendar Configuration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Native Calendar? *</label><YN value={form.use_native_calendar} onChange={v => set("use_native_calendar", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Number of Calendars</label><Input type="number" value={form.num_calendars} onChange={e => set("num_calendars", e.target.value)} min="1" max="20" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Default Timezone</label>
            <select value={form.default_timezone} onChange={e => set("default_timezone", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="America/New_York">Eastern</option>
              <option value="America/Chicago">Central</option>
              <option value="America/Denver">Mountain</option>
              <option value="America/Los_Angeles">Pacific</option>
              <option value="Europe/London">London</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>
          <div><label className={labelCls}>External Calendar Sync?</label><YN value={form.external_calendar_sync} onChange={v => set("external_calendar_sync", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Default Meeting Types</label><Input value={form.default_meeting_types} onChange={e => set("default_meeting_types", e.target.value)} placeholder="Consultation, Follow-up, Demo…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Booking Page Branded?</label><YN value={form.booking_page_branded} onChange={v => set("booking_page_branded", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Round Robin Needed?</label><YN value={form.round_robin} onChange={v => set("round_robin", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Team Assignment Logic</label><Input value={form.team_assignment_logic} onChange={e => set("team_assignment_logic", e.target.value)} placeholder="Round robin, specific owners…" className={inputCls} disabled={submitting} /></div>
        </div>
      </div>
    </div>
  );
}
