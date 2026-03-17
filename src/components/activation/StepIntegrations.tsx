import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link2 } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import { INTEGRATION_KEYS, type StepProps } from "./activationTypes";

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

export function StepIntegrations({ form, setIntegration, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Integrations + Access" items={[
        "Creates integration records with access statuses",
        "Generates missing-access tasks for the team",
        "Each integration can be connected later when credentials are available",
      ]} />

      {INTEGRATION_KEYS.map(name => {
        const int = form.integrations[name];
        if (!int) return null;
        return (
          <div key={name} className={sectionCls} style={sectionStyle}>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="h-3 w-3" /> {name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Used?</label><YN value={int.used} onChange={v => setIntegration(name, "used", v)} disabled={submitting} /></div>
              <div><label className={labelCls}>Access Ready?</label><YN value={int.access_ready} onChange={v => setIntegration(name, "access_ready", v)} disabled={submitting} /></div>
              <div><label className={labelCls}>Priority</label>
                <select value={int.priority} onChange={e => setIntegration(name, "priority", e.target.value)} disabled={submitting} className={selectCls}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
            </div>
            {int.used === "yes" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Access Owner</label><Input value={int.access_owner} onChange={e => setIntegration(name, "access_owner", e.target.value)} className={inputCls} disabled={submitting} /></div>
                <div><label className={labelCls}>Admin Email</label><Input value={int.admin_email} onChange={e => setIntegration(name, "admin_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Notes</label><Textarea value={int.notes} onChange={e => setIntegration(name, "notes", e.target.value)} className={`${inputCls} min-h-[40px]`} disabled={submitting} /></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
