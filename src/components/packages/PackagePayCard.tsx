import { useState } from "react";
import { Loader2, Landmark, CreditCard, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, parseYmd, type PlanResult } from "@/lib/packages";
import { cn } from "@/lib/utils";

const PK: Record<string, string> = { growth: "Growth", command_center: "Command Center", enterprise: "Enterprise" };
const fmtD = (s: string) => parseYmd(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export interface PackagePlanCtx {
  preview: PlanResult;
  schedule: any[];
  wire: Record<string, string | null> | null;
  wire_reference: string;
  method_saved: boolean;
}

/** First charge of a package plan. */
export function firstRow(pp: PackagePlanCtx | null | undefined) {
  return (pp?.schedule || []).find((r) => ["setup", "setup_installment_1", "annual"].includes(r.kind)) || null;
}

/** Pay step is done when the first payment is paid / clearing, or (wire first) the wire is pending and a method is saved for the automatic charges. */
export function packagePayDone(pp: PackagePlanCtx | null | undefined) {
  const f = firstRow(pp);
  if (!pp || !f) return false;
  if (f.status === "paid" || f.status === "processing") return pp.method_saved || f.method === "stripe";
  return f.method === "wire" && pp.method_saved;
}

/**
 * Pay & Sign "Step 2" for package deals. Growth: pay setup through Stripe (bank first, card second) — this also saves
 * the method for later charges. Wire-first (Command Center / Enterprise setup, every annual): show wire instructions and
 * require saving a bank account / card for the automatic charges.
 */
export default function PackagePayCard({ token, deal, plan, enabled, onChanged }: {
  token: string; deal: any; plan: PackagePlanCtx; enabled: boolean; onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"pay" | "method" | null>(null);
  const [wireShown, setWireShown] = useState(false);
  const pv = plan.preview;
  const first = firstRow(plan);
  const firstLine = pv.lines[0];
  const isWireFirst = first ? first.method === "wire" : firstLine?.method === "wire";
  const firstAmount = first?.amount ?? firstLine?.amount ?? 0;
  const done = packagePayDone(plan);
  const paid = first?.status === "paid";
  const clearing = first?.status === "processing";
  const awaitingApproval = deal?.price_approval_status === "pending" || deal?.price_approval_status === "rejected";

  const call = async (action: "plan_pay" | "save_method") => {
    setBusy(action === "plan_pay" ? "pay" : "method");
    const { data, error } = await supabase.functions.invoke("pay-sign-context", { body: { share_token: token, action } });
    setBusy(null);
    const err = (error as any)?.message || (data as any)?.error;
    if (err) { toast.error(err); return; }
    if ((data as any)?.url) { window.location.href = (data as any).url; return; }
    if ((data as any)?.wire) { setWireShown(true); onChanged(); return; }
    onChanged();
  };

  const next = pv.lines.slice(1, 4);
  const showWire = isWireFirst && (wireShown || !!first) && plan.wire && !paid;

  return (
    <Card className={cn("p-6 mb-6 transition-opacity", !enabled && "opacity-50 pointer-events-none")}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", done ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary")}>
            {done ? <CheckCircle2 className="h-5 w-5" /> : isWireFirst ? <Landmark className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-semibold">Step 2 · {PK[deal.package]} — {isWireFirst ? "first payment by wire" : "first payment"}</h2>
            <p className="text-xs text-muted-foreground">
              {paid ? "Payment received." : clearing ? "Bank payment is clearing (1–4 business days). You can continue." : `${firstLine?.label || "Due today"}: ${money(firstAmount, true)}`}
            </p>
          </div>
        </div>
        {paid && <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">Paid</span>}
        {clearing && <span className="text-xs px-2 py-1 rounded bg-sky-500/15 text-sky-500">Clearing</span>}
      </div>

      {awaitingApproval && (
        <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">Your pricing is being finalized by NewLight. Your rep will let you know as soon as it's ready.</p>
      )}

      {/* What happens after today */}
      <div className="mb-4 rounded-lg border border-border p-3">
        <p className="text-xs font-semibold mb-2">Your schedule</p>
        <ul className="space-y-1 text-xs">
          {[firstLine, ...next].filter(Boolean).map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{fmtD(l.date)} · {l.label}{l.covers ? ` (${l.covers})` : ""}</span>
              <span className="tabular-nums font-medium whitespace-nowrap">{l.amount != null ? money(l.amount, true) : "Varies"} · {l.method === "wire" ? "wire" : "automatic"}</span>
            </li>
          ))}
        </ul>
        {pv.guaranteeEnds && <p className="mt-2 text-[11px] text-muted-foreground"><ShieldCheck className="inline h-3 w-3 mr-1" />Growth commitment: if your setup isn't made back within 90 days of your first payment, we keep working at no extra charge until it is. This is continued service, not a refund or a promise of results. Ongoing billing starts the 1st after day 90 and once your setup has been made back.</p>}
      </div>

      {!isWireFirst && !paid && !clearing && (
        <Button onClick={() => call("plan_pay")} disabled={!!busy || awaitingApproval} className="w-full sm:w-auto">
          {busy === "pay" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
          Pay {money(firstAmount, true)} — bank account or card
        </Button>
      )}
      {!isWireFirst && !paid && !clearing && <p className="mt-2 text-[11px] text-muted-foreground">Your payment method is saved for the automatic monthly charges on the 1st. Bank account (ACH) is listed first.</p>}

      {isWireFirst && !paid && !showWire && (
        <Button onClick={() => call("plan_pay")} disabled={!!busy || awaitingApproval} className="w-full sm:w-auto">
          {busy === "pay" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Landmark className="h-4 w-4 mr-2" />}
          Show wire instructions
        </Button>
      )}

      {showWire && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-2">
          <p className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4" />Wire {money(firstAmount, true)}</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {[["Account name", plan.wire!.account_name], ["Bank", plan.wire!.bank_name], ["Routing (ABA)", plan.wire!.routing_number], ["Account number", plan.wire!.account_number], ["SWIFT", plan.wire!.swift_code], ["Bank address", plan.wire!.bank_address], ["Reference", plan.wire_reference]]
              .filter(([, v]) => v).map(([k, v]) => <div key={k as string}><span className="text-muted-foreground">{k}:</span> <b className="select-all">{v}</b></div>)}
          </div>
          {plan.wire!.note && <p className="text-xs">{plan.wire!.note}</p>}
          <p className="text-[11px] text-muted-foreground">Include the reference. Work starts when the wire arrives — we'll confirm by email. NewLight will never change bank details by email; if you get a message saying otherwise, call us first.</p>
        </div>
      )}
      {isWireFirst && !plan.wire && first && !paid && (
        <p className="text-sm text-muted-foreground">Wire instructions will be sent to you by your NewLight rep.</p>
      )}

      {/* Saved method for the automatic charges (required when the first payment is a wire). */}
      {isWireFirst && (
        <div className="mt-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{plan.method_saved ? "Payment method saved" : "Save a payment method for the automatic charges"}</p>
              <p className="text-xs text-muted-foreground">
                {deal.billing_cadence === "annual" ? "Used only if anything is ever billed automatically (annual payments stay by wire)." : "Monthly charges run automatically on the 1st. Bank account (ACH) is listed first; card also works."}
              </p>
            </div>
            {plan.method_saved ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : (
              <Button variant="outline" onClick={() => call("save_method")} disabled={!!busy || awaitingApproval || !first}>
                {busy === "method" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save bank or card
              </Button>
            )}
          </div>
          {!first && <p className="mt-2 text-[11px] text-muted-foreground"><Clock className="inline h-3 w-3 mr-1" />Show the wire instructions first.</p>}
        </div>
      )}
    </Card>
  );
}
