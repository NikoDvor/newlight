import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, CheckCircle2, Calendar, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ActivationHelp } from "./ActivationHelp";
import { supabase } from "@/integrations/supabase/client";
import { ensureBdrCalendar } from "@/lib/bdrCalendar";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

interface Props extends StepProps {
  clientId?: string;
}

export function StepProposalClosePrep({ form, set, submitting, clientId }: Props) {
  const [prefilledFromRep, setPrefilledFromRep] = useState<{
    rep: string;
    completedAt: string;
  } | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [overrideEdit, setOverrideEdit] = useState(false);
  const [meeting2Copied, setMeeting2Copied] = useState(false);

  // Ensure the current logged-in user has a personal BDR calendar and
  // persist its booking_slug into the wizard draft.
  useEffect(() => {
    if (form.meeting_2_booking_slug) return;
    let cancelled = false;
    (async () => {
      const cal = await ensureBdrCalendar();
      if (cancelled || !cal?.booking_slug) return;
      set("meeting_2_booking_slug", cal.booking_slug);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.meeting_2_booking_slug]);

  const meeting2Url = form.meeting_2_booking_slug
    ? `${window.location.origin}/bdr/book/${form.meeting_2_booking_slug}`
    : null;
  const copyMeeting2 = () => {
    if (!meeting2Url) return;
    navigator.clipboard.writeText(meeting2Url);
    setMeeting2Copied(true);
    toast.success("Booking link copied");
    setTimeout(() => setMeeting2Copied(false), 1500);
  };

  // Look up the linked deal for this client where the sales rep already completed close prep.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const { data: deal } = await supabase
        .from("crm_deals")
        .select("id, initial_fee, pricing_model, recurring_fee, commission_rate, closing_notes, close_prep_completed_at, assigned_user")
        .eq("client_id", clientId)
        .not("close_prep_completed_at", "is", null)
        .order("close_prep_completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !deal || !deal.close_prep_completed_at) return;

      // Only prefill blank form fields (never stomp user edits already in progress)
      if (!form.initial_fee && deal.initial_fee != null) set("initial_fee", String(deal.initial_fee));
      if (!form.pricing_model && deal.pricing_model) set("pricing_model", deal.pricing_model);
      if (!form.recurring_fee && deal.recurring_fee != null) set("recurring_fee", String(deal.recurring_fee));
      if (!form.commission_rate && deal.commission_rate != null) set("commission_rate", String(deal.commission_rate));
      if (!form.closing_notes && deal.closing_notes) set("closing_notes", deal.closing_notes);

      let repLabel = "sales rep";
      if (deal.assigned_user) {
        const { data: emp } = await supabase
          .from("employee_profiles")
          .select("full_name, email")
          .eq("user_id", deal.assigned_user)
          .maybeSingle();
        if (emp) repLabel = emp.full_name || emp.email || repLabel;
      }
      if (cancelled) return;
      setPrefilledFromRep({ rep: repLabel, completedAt: deal.close_prep_completed_at });
      setReadOnly(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const locked = readOnly && !overrideEdit;
  const pricingModel = form.pricing_model || "retainer";

  return (
    <div className="space-y-4">
      <ActivationHelp title="Close Prep" items={[
        "Confirm the fee the client is agreeing to",
        "Pick a pricing model — flat retainer or commission on revenue",
        "Capture anything the closer needs to know",
      ]} />

      {prefilledFromRep && (
        <div
          className="rounded-xl p-3 flex items-start gap-3 text-xs"
          style={{ background: "hsla(142,71%,45%,.08)", border: "1px solid hsla(142,71%,45%,.25)" }}
        >
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
          <div className="flex-1">
            <p className="text-white/90">
              Completed by <span className="font-semibold">{prefilledFromRep.rep}</span> during close prep
              {" · "}
              {new Date(prefilledFromRep.completedAt).toLocaleString()}
              {" — "}edit if terms changed.
            </p>
          </div>
          {locked && (
            <button
              type="button"
              onClick={() => setOverrideEdit(true)}
              className="text-[11px] px-2 py-1 rounded-md border border-white/15 text-white/80 hover:bg-white/10"
            >
              Edit terms
            </button>
          )}
        </div>
      )}

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" /> Deal Terms
        </p>

        <div>
          <label className={labelCls}>Initial Fee (USD)</label>
          <Input
            type="number" min="0" step="0.01"
            value={form.initial_fee}
            onChange={e => set("initial_fee", e.target.value)}
            placeholder="e.g. 2500"
            className={inputCls}
            disabled={submitting || locked}
          />
        </div>

        <div>
          <label className={labelCls}>Pricing Model</label>
          <div className="grid grid-cols-2 gap-2">
            {(["retainer", "commission"] as const).map(m => (
              <button
                type="button" key={m}
                onClick={() => !locked && !submitting && set("pricing_model", m)}
                disabled={submitting || locked}
                className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                  pricingModel === m
                    ? "border-[hsl(211,96%,56%)] bg-[hsl(211,96%,56%)]/15 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                } ${locked || submitting ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {m === "retainer" ? "Retainer" : "Commission"}
              </button>
            ))}
          </div>
        </div>

        {pricingModel === "retainer" ? (
          <div>
            <label className={labelCls}>Recurring Fee (USD / month)</label>
            <Input
              type="number" min="0" step="0.01"
              value={form.recurring_fee}
              onChange={e => set("recurring_fee", e.target.value)}
              placeholder="e.g. 1500"
              className={inputCls}
              disabled={submitting || locked}
            />
          </div>
        ) : (
          <div>
            <label className={labelCls}>Commission Rate (%)</label>
            <Input
              type="number" min="0" step="0.01"
              value={form.commission_rate}
              onChange={e => set("commission_rate", e.target.value)}
              placeholder="e.g. 15"
              className={inputCls}
              disabled={submitting || locked}
            />
            <p className="text-[11px] text-white/45 mt-1">
              We'll track revenue generated and automatically calculate what's owed each cycle based on this rate.
            </p>
          </div>
        )}

        <div>
          <label className={labelCls}>Internal Closing Notes</label>
          <Textarea
            value={form.closing_notes}
            onChange={e => set("closing_notes", e.target.value)}
            placeholder="What did they care about? Objections? Anything to bring to the closing meeting."
            className={`${inputCls} min-h-[80px]`}
            disabled={submitting || locked}
          />
        </div>
      </div>
    </div>
  );
}
