import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UserPlus, Plus, Trash2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps, TeamMemberConfig } from "./activationTypes";
import { defaultTeamMemberConfig, ROLE_PRESET_OPTIONS } from "./activationTypes";

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

function TeamMemberCard({ member, index, onChange, onRemove, canRemove, disabled }: {
  member: TeamMemberConfig; index: number;
  onChange: (i: number, k: keyof TeamMemberConfig, v: string) => void;
  onRemove: (i: number) => void;
  canRemove: boolean; disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const set = (k: keyof TeamMemberConfig, v: string) => onChange(index, k, v);

  return (
    <div className={sectionCls} style={sectionStyle}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white/80 transition-colors">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <UserPlus className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
          <span>{member.full_name || `Team Member ${index + 1}`}</span>
          {member.role_preset && (
            <span className="text-[10px] text-white/30 font-normal ml-1">
              {ROLE_PRESET_OPTIONS.find(r => r.value === member.role_preset)?.label || member.role_preset}
            </span>
          )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Full Name *</label><Input value={member.full_name} onChange={e => set("full_name", e.target.value)} placeholder="John Smith" className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Email *</label><Input value={member.email} onChange={e => set("email", e.target.value)} placeholder="john@company.com" className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Phone</label><Input value={member.phone} onChange={e => set("phone", e.target.value)} className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Job Title</label><Input value={member.job_title} onChange={e => set("job_title", e.target.value)} className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Department</label><Input value={member.department} onChange={e => set("department", e.target.value)} className={inputCls} disabled={disabled} /></div>
            <div><label className={labelCls}>Role Preset *</label>
              <select value={member.role_preset} onChange={e => set("role_preset", e.target.value)} className={selectCls} disabled={disabled}>
                <option value="">Select role…</option>
                {ROLE_PRESET_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className={labelCls}>Calendar Access?</label><YN value={member.calendar_access} onChange={v => set("calendar_access", v)} disabled={disabled} /></div>
            <div><label className={labelCls}>Bookable Staff?</label><YN value={member.bookable_staff} onChange={v => set("bookable_staff", v)} disabled={disabled} /></div>
            <div><label className={labelCls}>CRM Access?</label><YN value={member.crm_access} onChange={v => set("crm_access", v)} disabled={disabled} /></div>
            <div><label className={labelCls}>Training Access?</label><YN value={member.training_access} onChange={v => set("training_access", v)} disabled={disabled} /></div>
          </div>
          {member.calendar_access === "yes" && (
            <div><label className={labelCls}>Assigned Calendars</label><Input value={member.assigned_calendars} onChange={e => set("assigned_calendars", e.target.value)} placeholder="Main Calendar, Sales…" className={inputCls} disabled={disabled} /></div>
          )}
        </div>
      )}
    </div>
  );
}

export function StepTeamSetup({ form, set, submitting }: StepProps) {
  const members = form.team_member_configs || [];

  const updateMembers = (newMembers: TeamMemberConfig[]) => {
    (form as any).team_member_configs = newMembers;
    set("num_team_members", String(newMembers.length));
  };

  const handleAdd = () => updateMembers([...members, defaultTeamMemberConfig()]);
  const handleRemove = (i: number) => {
    const updated = members.filter((_, idx) => idx !== i);
    updateMembers(updated.length === 0 ? [defaultTeamMemberConfig()] : updated);
  };
  const handleChange = (i: number, k: keyof TeamMemberConfig, v: string) => {
    const updated = [...members];
    updated[i] = { ...updated[i], [k]: v };
    updateMembers(updated);
  };

  if (form.need_team_now === "no") {
    return (
      <div className="space-y-4">
        <ActivationHelp title="Team / Employee Setup" items={[
          "Team members can be added later from Team & Users",
          "Skipping now means only the owner will have access initially",
        ]} />
        <div className={sectionCls} style={sectionStyle}>
          <div><label className={labelCls}>Add Team Members Now?</label><YN value={form.need_team_now} onChange={v => set("need_team_now", v)} disabled={submitting} /></div>
          <p className="text-xs text-white/30 italic">Team setup skipped — only the owner will have workspace access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ActivationHelp title="Team / Employee Setup" items={[
        "Creates workspace user accounts with role presets",
        "Assigns calendar access and notification preferences",
        "Sends invite links when the workspace is activated",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Team Configuration
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Add Team Members Now? *</label><YN value={form.need_team_now} onChange={v => set("need_team_now", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Need Employee Portal?</label><YN value={form.employee_portal} onChange={v => set("employee_portal", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Need Training Access?</label><YN value={form.need_training_access} onChange={v => set("need_training_access", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Need Meeting Intelligence?</label><YN value={form.need_meeting_intel_access} onChange={v => set("need_meeting_intel_access", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Workforce Manager / Approver</label><Input value={form.workforce_manager} onChange={e => set("workforce_manager", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Departments</label><Input value={form.departments} onChange={e => set("departments", e.target.value)} placeholder="Sales, Support, Ops…" className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      {form.need_team_now === "yes" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/50">{members.length} Team Member{members.length !== 1 ? "s" : ""}</p>
            <Button type="button" size="sm" variant="ghost" onClick={handleAdd} disabled={submitting}
              className="text-[hsl(var(--nl-sky))] hover:bg-white/10 text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Add Member
            </Button>
          </div>
          {members.map((m, i) => (
            <TeamMemberCard key={i} member={m} index={i} onChange={handleChange} onRemove={handleRemove} canRemove={members.length > 1} disabled={submitting} />
          ))}
        </>
      )}
    </div>
  );
}
