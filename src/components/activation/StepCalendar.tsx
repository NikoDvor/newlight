import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Trash2, ChevronDown, ChevronUp, Lightbulb, Info } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import {
  type StepProps,
  type CalendarConfig,
  defaultCalendarConfig,
  INDUSTRY_CALENDAR_SUGGESTIONS,
} from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
const selectCls = "w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3";
const helpBoxStyle = { background: "hsla(211,96%,60%,.06)", border: "1px solid hsla(211,96%,60%,.10)" };

const YN = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={selectCls}>
    <option value="">Select…</option><option value="yes">Yes</option><option value="no">No</option>
  </select>
);

const CALENDAR_TYPES = [
  { value: "single", label: "Single", desc: "One owner, one booking link" },
  { value: "team", label: "Team", desc: "Shared by multiple team members" },
  { value: "round_robin", label: "Round Robin", desc: "Auto-assigns to next available staff" },
  { value: "department", label: "Department", desc: "Organized by department/team pool" },
  { value: "staff", label: "Staff", desc: "Dedicated to one staff member" },
  { value: "internal", label: "Internal", desc: "Internal only — no public booking" },
];

function CalendarConfigCard({
  config,
  index,
  onChange,
  onRemove,
  canRemove,
  disabled,
}: {
  config: CalendarConfig;
  index: number;
  onChange: (index: number, field: keyof CalendarConfig, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const set = (field: keyof CalendarConfig, value: string) => onChange(index, field, value);

  return (
    <div className={sectionCls} style={sectionStyle}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white/80 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <Calendar className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
          <span>{config.calendar_name || `Calendar ${index + 1}`}</span>
          <span className="text-[10px] text-white/30 font-normal ml-1">
            {CALENDAR_TYPES.find(t => t.value === config.calendar_type)?.label || "Single"}
          </span>
        </button>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} disabled={disabled}
            className="text-white/30 hover:text-red-400 transition-colors p-1">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-3 mt-2">
          {/* Basic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Calendar Name *</label>
              <Input value={config.calendar_name} onChange={e => set("calendar_name", e.target.value)}
                placeholder="Main Calendar" className={inputCls} disabled={disabled} />
            </div>
            <div>
              <label className={labelCls}>Calendar Type *</label>
              <select value={config.calendar_type} onChange={e => set("calendar_type", e.target.value)}
                className={selectCls} disabled={disabled}>
                {CALENDAR_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <Input value={config.description} onChange={e => set("description", e.target.value)}
                placeholder="What this calendar is used for…" className={inputCls} disabled={disabled} />
            </div>
          </div>

          {/* Round Robin extras */}
          {config.calendar_type === "round_robin" && (
            <div className="rounded-lg p-3 space-y-2" style={helpBoxStyle}>
              <p className="text-[10px] font-semibold text-[hsl(var(--nl-sky))]/70 uppercase tracking-wider">Round Robin Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Staff Pool</label>
                  <Input value={config.staff_pool} onChange={e => set("staff_pool", e.target.value)}
                    placeholder="staff1@co.com, staff2@co.com" className={inputCls} disabled={disabled} /></div>
                <div><label className={labelCls}>Distribution Method</label>
                  <select value={config.distribution_method} onChange={e => set("distribution_method", e.target.value)}
                    className={selectCls} disabled={disabled}>
                    <option value="round_robin">Round Robin</option>
                    <option value="least_busy">Least Busy</option>
                  </select></div>
                <div><label className={labelCls}>Fallback Owner</label>
                  <Input value={config.fallback_owner} onChange={e => set("fallback_owner", e.target.value)}
                    placeholder="fallback@co.com" className={inputCls} disabled={disabled} /></div>
              </div>
            </div>
          )}

          {/* Department extras */}
          {config.calendar_type === "department" && (
            <div className="rounded-lg p-3 space-y-2" style={helpBoxStyle}>
              <p className="text-[10px] font-semibold text-[hsl(var(--nl-sky))]/70 uppercase tracking-wider">Department Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Department Name</label>
                  <Input value={config.department_name} onChange={e => set("department_name", e.target.value)}
                    placeholder="Sales, Support…" className={inputCls} disabled={disabled} /></div>
                <div><label className={labelCls}>Team Pool</label>
                  <Input value={config.assigned_users} onChange={e => set("assigned_users", e.target.value)}
                    placeholder="user1@co.com, user2@co.com" className={inputCls} disabled={disabled} /></div>
              </div>
            </div>
          )}

          {/* Staff extras */}
          {config.calendar_type === "staff" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Assigned Staff Member</label>
                <Input value={config.owner_user} onChange={e => set("owner_user", e.target.value)}
                  placeholder="staff@company.com" className={inputCls} disabled={disabled} /></div>
            </div>
          )}

          {/* Scheduling */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className={labelCls}>Appointment Types</label>
              <Input value={config.appointment_types} onChange={e => set("appointment_types", e.target.value)}
                placeholder="Consultation, Demo" className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Duration (min)</label>
              <Input type="number" value={config.default_duration} onChange={e => set("default_duration", e.target.value)}
                className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Buffer Before</label>
              <Input type="number" value={config.buffer_before} onChange={e => set("buffer_before", e.target.value)}
                className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Buffer After</label>
              <Input type="number" value={config.buffer_after} onChange={e => set("buffer_after", e.target.value)}
                className={inputCls} disabled={disabled} /></div>
          </div>

          {/* Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={labelCls}>Availability Days</label>
              <Input value={config.availability_days} onChange={e => set("availability_days", e.target.value)}
                placeholder="1,2,3,4,5" className={inputCls} disabled={disabled} />
              <span className="text-[9px] text-white/30 mt-0.5 block">0=Sun, 1=Mon…6=Sat</span>
            </div>
            <div><label className={labelCls}>Hours Start</label>
              <Input type="time" value={config.availability_hours_start} onChange={e => set("availability_hours_start", e.target.value)}
                className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Hours End</label>
              <Input type="time" value={config.availability_hours_end} onChange={e => set("availability_hours_end", e.target.value)}
                className={inputCls} disabled={disabled} /></div>
          </div>

          {/* Booking */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={labelCls}>Slot Interval (min)</label>
              <Input type="number" value={config.slot_interval} onChange={e => set("slot_interval", e.target.value)}
                className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Booking Link Slug</label>
              <Input value={config.booking_link_slug} onChange={e => set("booking_link_slug", e.target.value)}
                placeholder="main-calendar" className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Location Type</label>
              <select value={config.location_type} onChange={e => set("location_type", e.target.value)}
                className={selectCls} disabled={disabled}>
                <option value="virtual">Virtual</option>
                <option value="in_person">In Person</option>
                <option value="phone">Phone</option>
                <option value="flexible">Flexible</option>
              </select></div>
          </div>

          {/* Advanced */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.calendar_type !== "staff" && config.calendar_type !== "round_robin" && config.calendar_type !== "department" && (
              <div><label className={labelCls}>Owner User</label>
                <Input value={config.owner_user} onChange={e => set("owner_user", e.target.value)}
                  placeholder="owner@company.com" className={inputCls} disabled={disabled} /></div>
            )}
            <div><label className={labelCls}>Reminders Enabled</label>
              <YN value={config.reminders_enabled} onChange={v => set("reminders_enabled", v)} disabled={disabled} /></div>
          </div>

          <div>
            <label className={labelCls}>Confirmation Message</label>
            <Textarea value={config.confirmation_message} onChange={e => set("confirmation_message", e.target.value)}
              placeholder="Thank you for booking…" className={`${inputCls} min-h-[40px]`} disabled={disabled} />
          </div>
        </div>
      )}
    </div>
  );
}

export function StepCalendar({ form, set, submitting }: StepProps) {
  const configs = form.calendar_configs || [defaultCalendarConfig()];
  const numCals = parseInt(form.num_calendars) || 1;
  const isNative = form.use_native_calendar === "yes";

  const updateConfigs = (newConfigs: CalendarConfig[]) => {
    // Store as JSON string in a way that works with the string-based set function
    (form as any).calendar_configs = newConfigs;
    // Force re-render by setting a related field
    set("num_calendars", String(newConfigs.length));
  };

  const handleCalendarCountChange = (val: string) => {
    const count = parseInt(val) || 1;
    set("num_calendars", val);
    const current = [...configs];
    while (current.length < count) current.push(defaultCalendarConfig());
    while (current.length > count) current.pop();
    (form as any).calendar_configs = current;
  };

  const handleConfigChange = (index: number, field: keyof CalendarConfig, value: string) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    (form as any).calendar_configs = updated;
    // Trigger re-render
    set("num_calendars", String(updated.length));
  };

  const handleRemoveCalendar = (index: number) => {
    const updated = configs.filter((_, i) => i !== index);
    if (updated.length === 0) updated.push(defaultCalendarConfig());
    updateConfigs(updated);
  };

  const handleAddCalendar = () => {
    const updated = [...configs, defaultCalendarConfig()];
    updateConfigs(updated);
  };

  // Industry suggestions
  const industry = (form.industry || "").toLowerCase();
  const suggestions = Object.entries(INDUSTRY_CALENDAR_SUGGESTIONS).find(([key]) =>
    industry.includes(key)
  )?.[1];

  const applySuggestions = () => {
    if (!suggestions) return;
    const newConfigs = suggestions.map(s => ({
      ...defaultCalendarConfig(),
      calendar_name: s.name,
      calendar_type: s.type,
      appointment_types: s.types,
    }));
    (form as any).calendar_configs = newConfigs;
    set("num_calendars", String(newConfigs.length));
  };

  return (
    <div className="space-y-4">
      <ActivationHelp title="Calendar Setup" items={[
        "Configure one or multiple calendars based on business needs",
        "Simple businesses only need one calendar — advanced options appear as needed",
        "Calendars, booking links, and availability are created automatically on activation",
      ]} />

      {/* Top-level questions */}
      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="h-3 w-3" /> Calendar Configuration
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Native Calendar? *</label>
            <YN value={form.use_native_calendar} onChange={v => set("use_native_calendar", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>External Calendar Sync?</label>
            <YN value={form.external_calendar_sync} onChange={v => set("external_calendar_sync", v)} disabled={submitting} /></div>
        </div>

        {isNative && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div><label className={labelCls}>How Many Calendars? *</label>
              <select value={form.num_calendars} onChange={e => handleCalendarCountChange(e.target.value)}
                className={selectCls} disabled={submitting}>
                <option value="1">1 — Simple setup</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5+</option>
              </select></div>
            <div><label className={labelCls}>Default Timezone</label>
              <select value={form.default_timezone} onChange={e => set("default_timezone", e.target.value)}
                className={selectCls} disabled={submitting}>
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="Europe/London">London</option>
                <option value="Australia/Sydney">Sydney</option>
              </select></div>
            <div><label className={labelCls}>Different Booking Links per Staff?</label>
              <YN value={form.different_booking_links} onChange={v => set("different_booking_links", v)} disabled={submitting} /></div>
            <div><label className={labelCls}>Need Round Robin?</label>
              <YN value={form.round_robin} onChange={v => set("round_robin", v)} disabled={submitting} /></div>
            <div><label className={labelCls}>Need Department Calendars?</label>
              <YN value={form.need_department_calendars} onChange={v => set("need_department_calendars", v)} disabled={submitting} /></div>
            <div><label className={labelCls}>Default Reminder Preference</label>
              <select value={form.default_reminder_preference} onChange={e => set("default_reminder_preference", e.target.value)}
                className={selectCls} disabled={submitting}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Both</option>
                <option value="none">None</option>
              </select></div>
          </div>
        )}
      </div>

      {/* External calendar only */}
      {!isNative && form.use_native_calendar === "no" && (
        <div className="rounded-xl p-4" style={{ background: "hsla(40,90%,50%,.06)", border: "1px solid hsla(40,90%,50%,.12)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4 text-yellow-400" />
            <p className="text-xs font-semibold text-yellow-400">External Calendar Mode</p>
          </div>
          <p className="text-[11px] text-yellow-300/60">
            Native calendar creation will be skipped. An integration setup task will be created for external calendar connection.
          </p>
        </div>
      )}

      {/* Industry suggestions */}
      {isNative && suggestions && (
        <div className="rounded-xl p-4" style={helpBoxStyle}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
              <p className="text-xs font-semibold text-white/60">Suggested Setup for {form.industry}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={applySuggestions}
              disabled={submitting}
              className="border-white/10 text-white/60 hover:bg-white/10 text-[10px] h-7 px-2">
              Apply Suggestions
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]">
                {s.name} ({CALENDAR_TYPES.find(t => t.value === s.type)?.label})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Help panel */}
      {isNative && (
        <div className="rounded-xl p-3" style={helpBoxStyle}>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Calendar Types Guide</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CALENDAR_TYPES.map(t => (
              <div key={t.value} className="text-[10px]">
                <span className="text-[hsl(var(--nl-sky))] font-medium">{t.label}</span>
                <span className="text-white/30 ml-1">— {t.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar repeaters */}
      {isNative && configs.map((config, i) => (
        <CalendarConfigCard
          key={i}
          config={config}
          index={i}
          onChange={handleConfigChange}
          onRemove={handleRemoveCalendar}
          canRemove={configs.length > 1}
          disabled={submitting}
        />
      ))}

      {isNative && (
        <Button type="button" variant="outline" onClick={handleAddCalendar} disabled={submitting}
          className="border-white/10 text-white/50 hover:bg-white/10 w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Calendar
        </Button>
      )}

      {/* Policies */}
      {isNative && (
        <div className={sectionCls} style={sectionStyle}>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Default Policies</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Default Cancellation Policy</label>
              <Input value={form.default_cancellation_policy} onChange={e => set("default_cancellation_policy", e.target.value)}
                placeholder="24 hours notice required…" className={inputCls} disabled={submitting} /></div>
            <div><label className={labelCls}>Default Reschedule Policy</label>
              <Input value={form.default_reschedule_policy} onChange={e => set("default_reschedule_policy", e.target.value)}
                placeholder="Can reschedule up to 12 hours before…" className={inputCls} disabled={submitting} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
