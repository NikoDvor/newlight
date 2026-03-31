import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, RotateCcw, XCircle, Gavel } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

const OUTCOMES = [
  { value: "won", label: "Won", icon: CheckCircle2, color: "border-emerald-500/40 bg-emerald-500/10", textColor: "text-emerald-400", desc: "Deal closed — proceed to activation" },
  { value: "pending", label: "Pending", icon: Clock, color: "border-amber-500/40 bg-amber-500/10", textColor: "text-amber-400", desc: "Still in negotiation — follow up later" },
  { value: "revised", label: "Revised Proposal Needed", icon: RotateCcw, color: "border-blue-500/40 bg-blue-500/10", textColor: "text-blue-400", desc: "Return to Proposal stage with changes" },
  { value: "lost", label: "Lost", icon: XCircle, color: "border-red-500/40 bg-red-500/10", textColor: "text-red-400", desc: "Deal lost — record reason and close" },
] as const;

export function StepCloseOutcome({ form, set, submitting }: StepProps) {
  return (
    <div className="space-y-4">
      <ActivationHelp title="Close Outcome" items={[
        "Select the deal outcome after the close conversation",
        "Won unlocks activation stages",
        "Pending or Revised keeps the deal open for follow-up",
        "Lost records the reason and closes the deal",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <Gavel className="h-3 w-3" /> Deal Outcome
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OUTCOMES.map(o => {
            const Icon = o.icon;
            const selected = form.close_outcome === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={submitting}
                onClick={() => set("close_outcome", o.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected ? `${o.color} ring-1 ring-white/10` : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${selected ? o.textColor : "text-white/40"}`} />
                  <span className={`text-sm font-semibold ${selected ? o.textColor : "text-white/70"}`}>{o.label}</span>
                </div>
                <p className="text-[11px] text-white/40">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending details */}
      {form.close_outcome === "pending" && (
        <div className={sectionCls} style={{ background: "hsla(40,96%,60%,.04)", border: "1px solid hsla(40,96%,60%,.12)" }}>
          <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Pending Details
          </p>
          <div><label className={labelCls}>Pending Reason</label><Textarea value={form.pending_reason} onChange={e => set("pending_reason", e.target.value)} placeholder="Why is this deal still pending?" className={`${inputCls} min-h-[60px]`} disabled={submitting} /></div>
          <div><label className={labelCls}>Next Follow-Up Date</label><Input type="date" value={form.next_follow_up_at} onChange={e => set("next_follow_up_at", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      )}

      {/* Revised proposal details */}
      {form.close_outcome === "revised" && (
        <div className={sectionCls} style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.15)" }}>
          <p className="text-[10px] font-semibold text-blue-400/60 uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3" /> Revision Details
          </p>
          <div><label className={labelCls}>What needs to change?</label><Textarea value={form.revision_notes} onChange={e => set("revision_notes", e.target.value)} placeholder="Describe what the revised proposal should address" className={`${inputCls} min-h-[60px]`} disabled={submitting} /></div>
          <div><label className={labelCls}>Next Follow-Up Date</label><Input type="date" value={form.next_follow_up_at} onChange={e => set("next_follow_up_at", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-300">
            After saving, you can return to Stage 2 (Proposal + Close Prep) to revise the terms.
          </div>
        </div>
      )}

      {/* Lost details */}
      {form.close_outcome === "lost" && (
        <div className={sectionCls} style={{ background: "hsla(0,70%,50%,.04)", border: "1px solid hsla(0,70%,50%,.15)" }}>
          <p className="text-[10px] font-semibold text-red-400/60 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="h-3 w-3" /> Lost Reason
          </p>
          <div><label className={labelCls}>Why was the deal lost?</label><Textarea value={form.lost_reason || form.closing_notes} onChange={e => set("lost_reason", e.target.value)} placeholder="Reason for lost deal" className={`${inputCls} min-h-[60px]`} disabled={submitting} /></div>
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
            The deal will be marked as Closed Lost. No activation stages will be unlocked.
          </div>
        </div>
      )}

      {/* Won confirmation */}
      {form.close_outcome === "won" && (
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Deal Won</span>
          </div>
          <p className="text-xs text-emerald-300/70">
            Continue to the next stage to complete activation details, branding, and system setup.
          </p>
        </div>
      )}
    </div>
  );
}
