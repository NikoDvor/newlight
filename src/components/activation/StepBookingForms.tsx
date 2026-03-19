import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
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

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multi_select", label: "Multi Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "file_upload", label: "File Upload" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

interface CustomField {
  label: string;
  type: string;
  required: string;
  placeholder: string;
}

function CustomFieldCard({ field, index, onChange, onRemove, disabled }: {
  field: CustomField; index: number;
  onChange: (i: number, k: keyof CustomField, v: string) => void;
  onRemove: (i: number) => void; disabled?: boolean;
}) {
  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "hsla(211,96%,60%,.06)", border: "1px solid hsla(211,96%,60%,.10)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 font-medium">Field {index + 1}</span>
        <button type="button" onClick={() => onRemove(index)} disabled={disabled} className="text-white/30 hover:text-red-400 p-1">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Label</label><Input value={field.label} onChange={e => onChange(index, "label", e.target.value)} placeholder="Field name" className={inputCls} disabled={disabled} /></div>
        <div><label className={labelCls}>Type</label>
          <select value={field.type} onChange={e => onChange(index, "type", e.target.value)} className={selectCls} disabled={disabled}>
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Required?</label><YN value={field.required} onChange={v => onChange(index, "required", v)} disabled={disabled} /></div>
        <div><label className={labelCls}>Placeholder</label><Input value={field.placeholder} onChange={e => onChange(index, "placeholder", e.target.value)} className={inputCls} disabled={disabled} /></div>
      </div>
    </div>
  );
}

export function StepBookingForms({ form, set, submitting }: StepProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showCustom, setShowCustom] = useState(false);

  const addField = () => setCustomFields(f => [...f, { label: "", type: "short_text", required: "no", placeholder: "" }]);
  const removeField = (i: number) => setCustomFields(f => f.filter((_, idx) => idx !== i));
  const updateField = (i: number, k: keyof CustomField, v: string) =>
    setCustomFields(f => f.map((fld, idx) => idx === i ? { ...fld, [k]: v } : fld));

  return (
    <div className="space-y-4">
      <ActivationHelp title="Booking Forms Setup" items={[
        "Creates starter forms and links them to calendars",
        "Custom intake questions can be added per form",
        "Forms can be edited later inside the client workspace",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardList className="h-3 w-3" /> Form Types
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Use Native Forms?</label><YN value={form.use_native_forms} onChange={v => set("use_native_forms", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Customer Booking Form?</label><YN value={form.need_booking_form} onChange={v => set("need_booking_form", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Intake Form?</label><YN value={form.need_intake_form} onChange={v => set("need_intake_form", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Quote / Estimate Form?</label><YN value={form.need_quote_form} onChange={v => set("need_quote_form", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Support Form?</label><YN value={form.need_support_form} onChange={v => set("need_support_form", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Contact Form?</label><YN value={form.need_contact_form} onChange={v => set("need_contact_form", v)} disabled={submitting} /></div>
        </div>
      </div>

      {form.use_native_forms !== "no" && (
        <>
          <div className={sectionCls} style={sectionStyle}>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Form Behavior</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Link to Calendar?</label>
                <select value={form.form_calendar_link} onChange={e => set("form_calendar_link", e.target.value)} className={selectCls} disabled={submitting}>
                  <option value="">No link</option><option value="primary">Primary Calendar</option><option value="all">All Calendars</option>
                </select>
              </div>
              <div><label className={labelCls}>Create CRM Contact?</label><YN value={form.form_creates_contact} onChange={v => set("form_creates_contact", v)} disabled={submitting} /></div>
              <div><label className={labelCls}>Trigger Reminders?</label><YN value={form.form_triggers_reminders} onChange={v => set("form_triggers_reminders", v)} disabled={submitting} /></div>
              <div><label className={labelCls}>Form Notification Owner</label><Input value={form.form_notification_owner} onChange={e => set("form_notification_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
              <div><label className={labelCls}>Form Tone / Style</label>
                <select value={form.form_tone} onChange={e => set("form_tone", e.target.value)} className={selectCls} disabled={submitting}>
                  <option value="professional">Professional</option><option value="friendly">Friendly</option><option value="minimal">Minimal</option><option value="detailed">Detailed</option>
                </select>
              </div>
              <div><label className={labelCls}>Custom Intake Questions?</label>
                <YN value={form.need_custom_fields} onChange={v => { set("need_custom_fields", v); setShowCustom(v === "yes"); }} disabled={submitting} />
              </div>
            </div>
          </div>

          {(showCustom || form.need_custom_fields === "yes") && (
            <div className={sectionCls} style={sectionStyle}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Custom Intake Fields</p>
                <Button type="button" size="sm" variant="ghost" onClick={addField} disabled={submitting} className="text-[hsl(var(--nl-sky))] hover:bg-white/10 text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" /> Add Field
                </Button>
              </div>
              {customFields.length === 0 && <p className="text-xs text-white/30 italic">No custom fields added yet.</p>}
              <div className="space-y-2">
                {customFields.map((f, i) => (
                  <CustomFieldCard key={i} field={f} index={i} onChange={updateField} onRemove={removeField} disabled={submitting} />
                ))}
              </div>
            </div>
          )}

          <div className={sectionCls} style={sectionStyle}>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Form Notes</p>
            <Textarea value={form.form_notes} onChange={e => set("form_notes", e.target.value)} placeholder="Any notes about forms or intake…" className={`${inputCls} min-h-[50px]`} disabled={submitting} />
          </div>
        </>
      )}
    </div>
  );
}
