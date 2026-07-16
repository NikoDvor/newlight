import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const captionCls = "text-[10px] text-white/40 mt-1";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
const selectCls = "w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3";

const YN = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={selectCls}>
    <option value="">Select…</option><option value="yes">Yes</option><option value="no">No</option>
  </select>
);

export function StepSalesTeamTools({ form, set, submitting }: StepProps) {
  const f = form as unknown as Record<string, string>;
  const hasSalesTeam = f.client_has_sales_team === "yes";
  return (
    <div className="space-y-4">
      <ActivationHelp title="Sales Team" items={[
        "Configures whether this client has their own sales team",
        "Gates Sales Team Pipeline, My Leads, and BDR tooling visibility for the client workspace",
        "Purely UI-visibility — underlying RLS already scopes by client_id",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3 w-3" /> Sales Team Configuration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Client Has Sales Team?</label>
            <YN value={f.client_has_sales_team || ""} onChange={v => set("client_has_sales_team", v)} disabled={submitting} />
          </div>
          {hasSalesTeam && (
            <>
              <div>
                <label className={labelCls}>How many reps at launch?</label>
                <Input type="number" value={f.sales_team_rep_count || ""} onChange={e => set("sales_team_rep_count", e.target.value)} className={inputCls} disabled={submitting} />
              </div>
              <div>
                <label className={labelCls}>Enable Sales Pipeline View?</label>
                <YN value={f.enable_sales_pipeline_view || ""} onChange={v => set("enable_sales_pipeline_view", v)} disabled={submitting} />
                <p className={captionCls}>Turns on /sales-team for this client's admin</p>
              </div>
              <div>
                <label className={labelCls}>Enable My Leads?</label>
                <YN value={f.enable_my_leads || ""} onChange={v => set("enable_my_leads", v)} disabled={submitting} />
                <p className={captionCls}>Turns on per-rep lead management access</p>
              </div>
              <div>
                <label className={labelCls}>Enable SEC IAPD Sourcing?</label>
                <YN value={f.enable_sec_iapd_sourcing || ""} onChange={v => set("enable_sec_iapd_sourcing", v)} disabled={submitting} />
                <p className={captionCls}>Only relevant if this client's reps prospect registered investment advisers — leave No for most clients</p>
              </div>
              <div>
                <label className={labelCls}>Enable BDR Dialer + Calendar?</label>
                <YN value={f.enable_bdr_dialer_calendar || ""} onChange={v => set("enable_bdr_dialer_calendar", v)} disabled={submitting} />
              </div>
              <div>
                <label className={labelCls}>Enable Referral Attribution?</label>
                <YN value={f.enable_referral_attribution || ""} onChange={v => set("enable_referral_attribution", v)} disabled={submitting} />
                <p className={captionCls}>General sales referral tracking — separate from the advisor-compliance promoter registry</p>
              </div>
            </>
          )}
        </div>
        <div><label className={labelCls}>Sales Team Notes</label><Textarea value={f.sales_team_notes || ""} onChange={e => set("sales_team_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
