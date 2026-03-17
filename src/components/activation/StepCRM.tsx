import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users } from "lucide-react";
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

export function StepCRM({ form, set, submitting }: StepProps) {
  const isExternal = form.crm_mode === "external";

  return (
    <div className="space-y-4">
      <ActivationHelp title="CRM Setup" items={[
        "Choose native CRM or connect an external one (HubSpot, GHL, etc.)",
        "Creates default pipelines and statuses automatically",
        "External CRM creates sync tasks and access records",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3 w-3" /> CRM Configuration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>CRM Mode *</label>
            <select value={form.crm_mode} onChange={e => set("crm_mode", e.target.value)} disabled={submitting} className={selectCls}>
              <option value="native">Native NewLight CRM</option>
              <option value="external">External CRM Connected</option>
            </select>
          </div>
          <div><label className={labelCls}>Sales Process Type</label><Input value={form.sales_process_type} onChange={e => set("sales_process_type", e.target.value)} placeholder="e.g. Consultative, Transactional" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Default Sales Owner</label><Input value={form.default_sales_owner} onChange={e => set("default_sales_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Default Pipeline Owner</label><Input value={form.default_pipeline_owner} onChange={e => set("default_pipeline_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Lead Sources</label><Input value={form.lead_sources} onChange={e => set("lead_sources", e.target.value)} placeholder="Google, Referral, Social…" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Multiple Pipelines?</label><YN value={form.multiple_pipelines} onChange={v => set("multiple_pipelines", v)} disabled={submitting} /></div>
          {form.multiple_pipelines === "yes" && (
            <div className="sm:col-span-2"><label className={labelCls}>Pipeline Types Needed</label><Input value={form.pipeline_types} onChange={e => set("pipeline_types", e.target.value)} placeholder="Sales, Onboarding, Retention…" className={inputCls} disabled={submitting} /></div>
          )}
        </div>
      </div>

      {isExternal && (
        <div className={sectionCls} style={sectionStyle}>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">External CRM Connection</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>CRM Provider</label><Input value={form.crm_provider} onChange={e => set("crm_provider", e.target.value)} placeholder="HubSpot, GoHighLevel…" className={inputCls} disabled={submitting} /></div>
            <div><label className={labelCls}>CRM Admin Email</label><Input value={form.crm_admin_email} onChange={e => set("crm_admin_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
            <div><label className={labelCls}>CRM Workspace Name</label><Input value={form.crm_workspace_name} onChange={e => set("crm_workspace_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
            <div><label className={labelCls}>Sync Priority</label>
              <select value={form.sync_priority} onChange={e => set("sync_priority", e.target.value)} disabled={submitting} className={selectCls}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div><label className={labelCls}>Import Existing Contacts?</label><YN value={form.import_contacts_now} onChange={v => set("import_contacts_now", v)} disabled={submitting} /></div>
            <div><label className={labelCls}>Field Mapping Contact</label><Input value={form.field_mapping_contact} onChange={e => set("field_mapping_contact", e.target.value)} className={inputCls} disabled={submitting} /></div>
          </div>
        </div>
      )}

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Data Import</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Existing Contact Count</label><Input value={form.existing_contact_count} onChange={e => set("existing_contact_count", e.target.value)} placeholder="~500" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Existing Deal Count</label><Input value={form.existing_deal_count} onChange={e => set("existing_deal_count", e.target.value)} placeholder="~50" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>CSV Import Needed?</label><YN value={form.csv_import} onChange={v => set("csv_import", v)} disabled={submitting} /></div>
          <div><label className={labelCls}>Custom Fields Needed?</label><YN value={form.custom_fields} onChange={v => set("custom_fields", v)} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>CRM Notes</label><Textarea value={form.crm_notes} onChange={e => set("crm_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
