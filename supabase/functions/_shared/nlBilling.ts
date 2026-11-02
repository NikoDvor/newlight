// NewLight package billing — shared server logic (Nov 2026).
// Used by: nl-billing (daily runner + admin actions), pay-sign-context (Pay & Sign), stripe-webhook.
// Prices/schedules come from ./packages.ts (identical copy of src/lib/packages.ts).

import {
  buildPlan, mergeDefaults, parseYmd, pacificDate, ymd, addMonthsUTC, addYearsUTC, firstMonthlyCharge,
  firstOfNextMonth, round2, money, type PackageKey, type PackageDefaults,
} from "./packages.ts";
import { sendPaymentConfirmation } from "./pay-sign-notify.ts";
import { notifyPaidSignedIfTransition } from "./paid-signed-notify.ts";

export const OPS_EMAIL = "team@newlightgen.com";
export const OPS_SMS = "+18058363557";
const TWILIO_FROM = "+18555066111";
export const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://newlight-app.com";

// deno-lint-ignore no-explicit-any
type SB = any;

// ─── messaging ─────────────────────────────────────────────────────────────
export async function sendEmail(to: (string | null | undefined)[], subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const recipients = Array.from(new Set(to.filter((e): e is string => !!e && /@/.test(e)).map((e) => e.trim().toLowerCase())));
  if (!recipients.length) return;
  if (!key) { console.log(`[nlBilling EMAIL QUEUED] to=${recipients.join(",")} subject="${subject}"`); return; }
  for (const r of recipients) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [r], subject, html }),
      });
      if (!res.ok) console.error("[nlBilling email] failed", r, await res.text());
    } catch (e) { console.error("[nlBilling email] error", e); }
  }
}

function e164(p: string | null | undefined): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return p.startsWith("+") ? p : null;
}

export async function sendSms(to: (string | null | undefined)[], body: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const nums = Array.from(new Set(to.map(e164).filter((n): n is string => !!n)));
  for (const n of nums) {
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) { console.log(`[nlBilling SMS QUEUED] to=${n} body="${body.slice(0, 120)}"`); continue; }
    try {
      const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TWILIO_API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: n, From: TWILIO_FROM, Body: body }),
      });
      if (!res.ok) console.error("[nlBilling sms] failed", n, await res.text());
    } catch (e) { console.error("[nlBilling sms] error", e); }
  }
}

export interface Contacts { clientEmails: string[]; clientPhones: string[]; clientCanText: boolean; repEmail: string | null; businessName: string }

/** Everyone we notify about a deal's billing: client (all emails/phones on the account), the salesman, ops. */
export async function dealContacts(sb: SB, deal: any): Promise<Contacts> {
  const cid = deal.provisioned_client_id || null;
  let client: any = null;
  if (cid) {
    const { data } = await sb.from("clients").select("business_name, owner_email, owner_phone, secondary_contact_email, secondary_contact_phone, sms_consent, allow_sms").eq("id", cid).maybeSingle();
    client = data;
  }
  const emails: string[] = [client?.owner_email, client?.secondary_contact_email].filter(Boolean);
  const phones: string[] = [client?.owner_phone, client?.secondary_contact_phone].filter(Boolean);
  if (cid) {
    const { data: wus } = await sb.from("workspace_users").select("email, phone").eq("client_id", cid);
    for (const w of wus || []) { if (w.email) emails.push(w.email); if (w.phone) phones.push(w.phone); }
  }
  // Envelope recipient (the person who signed) as a fallback.
  if (deal.service_agreement_envelope_id) {
    const { data: env } = await sb.from("document_envelopes").select("recipient_email").eq("id", deal.service_agreement_envelope_id).maybeSingle();
    if (env?.recipient_email) emails.push(env.recipient_email);
  }
  let repEmail: string | null = null;
  if (deal.assigned_user) {
    const { data: ep } = await sb.from("employee_profiles").select("email").eq("user_id", deal.assigned_user).maybeSingle();
    repEmail = ep?.email ?? null;
  }
  return {
    clientEmails: emails, clientPhones: phones,
    clientCanText: !!(client?.sms_consent ?? client?.allow_sms),
    repEmail, businessName: client?.business_name || deal.deal_name || "Client",
  };
}

/** Sends to everyone: ops (email + text), salesman (email), client (email; text only with consent). */
export async function notifyAll(sb: SB, deal: any, subject: string, lines: string[], sms: string, opts: { clientToo?: boolean; ctaUrl?: string; ctaLabel?: string } = {}) {
  const c = await dealContacts(sb, deal);
  const html = emailHtml(subject, lines, opts.ctaUrl, opts.ctaLabel);
  await sendEmail([OPS_EMAIL, c.repEmail], subject, html);
  await sendSms([OPS_SMS], `NewLight: ${sms}`);
  if (opts.clientToo !== false) {
    await sendEmail(c.clientEmails, subject, html);
    if (c.clientCanText) await sendSms(c.clientPhones, `NewLight: ${sms}${opts.ctaUrl ? ` ${opts.ctaUrl}` : ""}`);
  }
}

export function emailHtml(title: string, lines: string[], ctaUrl?: string, ctaLabel?: string) {
  const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#f5f7fb;margin:0;">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;"><div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
<div style="font-size:11px;letter-spacing:.2em;color:#00B4FF;font-weight:700;">NEWLIGHT BILLING</div>
<h1 style="font-size:19px;margin:8px 0 14px;color:#001A3D;">${esc(title)}</h1>
${lines.map((l) => `<p style="font-size:14px;line-height:1.6;margin:0 0 10px;">${esc(l)}</p>`).join("")}
${ctaUrl ? `<p style="margin:20px 0 0;"><a href="${ctaUrl}" style="background:#00B4FF;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;font-size:14px;">${esc(ctaLabel || "Open")}</a></p>` : ""}
</div><p style="font-size:11px;color:#6b7280;text-align:center;margin-top:14px;">NewLight will never change our bank details by email.</p></div></body></html>`;
}

/** Records a once-only event. Returns false if it already happened (dedupe). */
export async function once(sb: SB, dedupeKey: string, kind: string, dealId: string | null, scheduleId: string | null = null, detail: unknown = null): Promise<boolean> {
  const { error } = await sb.from("nl_billing_events").insert({ dedupe_key: dedupeKey, kind, deal_id: dealId, schedule_id: scheduleId, detail });
  return !error;
}

// ─── defaults / plan ───────────────────────────────────────────────────────
export async function loadDefaults(sb: SB): Promise<Record<PackageKey, PackageDefaults>> {
  const { data } = await sb.from("nl_package_defaults").select("*");
  return mergeDefaults(data || []);
}

export async function wireInstructions(sb: SB) {
  const { data } = await sb.from("nl_wire_settings").select("account_name, bank_name, routing_number, account_number, swift_code, bank_address, note").eq("id", true).maybeSingle();
  return data || null;
}

/** Plan preview for a deal (amounts + dates), as if signed on `signDate`. */
export async function planForDeal(sb: SB, deal: any, signDate: Date) {
  const defs = await loadDefaults(sb);
  const pkg = defs[(deal.package || "command_center") as PackageKey];
  return buildPlan({
    pkg, setup: Number(deal.initial_fee || 0), monthly: Number(deal.recurring_fee || 0),
    cadence: deal.billing_cadence === "annual" ? "annual" : "monthly",
    paymentPlan: !!deal.payment_plan,
    ongoing: deal.pricing_model === "commission" ? "commission" : "retainer",
    commissionRate: deal.commission_rate ?? undefined, commissionRateOngoing: deal.commission_rate_ongoing ?? undefined,
    signDate, madeBackDate: deal.made_back_at ? new Date(deal.made_back_at) : null,
  });
}

/**
 * Creates the signing-time schedule rows (setup / installments / annual / CC+Enterprise first monthly).
 * Growth monthly rows are created when "Made it back" is confirmed. Idempotent.
 */
export async function materializeSigning(sb: SB, deal: any, signDate: Date = pacificDate()) {
  const { count } = await sb.from("nl_billing_schedule").select("id", { count: "exact", head: true }).eq("deal_id", deal.id).neq("status", "cancelled");
  if ((count ?? 0) > 0) return;
  const plan = await planForDeal(sb, deal, signDate);
  const cid = deal.provisioned_client_id || null;
  const rows: any[] = [];
  for (const l of plan.lines) {
    const signing = ["setup", "setup_installment_1", "setup_installment_2", "annual"].includes(l.kind);
    const firstMonthlyFixed = l.kind === "monthly" && deal.package !== "growth" && rows.every((r) => r.kind !== "monthly");
    if (!signing && !firstMonthlyFixed) continue;
    rows.push({ deal_id: deal.id, client_id: cid, kind: l.kind, method: l.method, amount: l.amount, label: l.label, covers: l.covers ?? null, due_date: l.date });
  }
  if (rows.length) await sb.from("nl_billing_schedule").insert(rows);
  const patch: Record<string, unknown> = { setup_method: plan.lines[0]?.method ?? null };
  if (deal.billing_cadence === "annual") {
    patch.annual_amount_first = plan.annualFirst; patch.annual_amount_renewal = plan.annualRenewal; patch.annual_anchor_date = ymd(signDate);
  }
  if (deal.package !== "growth" && deal.billing_cadence !== "annual") patch.billing_start_date = ymd(signDate);
  if (deal.payment_plan) patch.payment_plan_total = plan.paymentPlanTotal;
  await sb.from("crm_deals").update(patch).eq("id", deal.id);
}

/** Ensures the next monthly retainer row exists (one ahead). Called daily. */
export async function ensureNextMonthly(sb: SB, deal: any) {
  if (deal.billing_cadence === "annual" || deal.pricing_model === "commission" || !deal.billing_start_date) return;
  const { data: last } = await sb.from("nl_billing_schedule").select("due_date").eq("deal_id", deal.id).eq("kind", "monthly").neq("status", "cancelled").order("due_date", { ascending: false }).limit(1).maybeSingle();
  const monthly = Number(deal.recurring_fee || 0);
  if (!(monthly > 0)) return;
  if (!last) {
    const f = firstMonthlyCharge(parseYmd(deal.billing_start_date), monthly);
    await sb.from("nl_billing_schedule").insert({ deal_id: deal.id, client_id: deal.provisioned_client_id, kind: "monthly", method: "stripe", amount: f.amount, label: "Monthly — first charge", covers: f.covers, due_date: ymd(f.date) });
    return;
  }
  const today = pacificDate();
  const lastDate = parseYmd(last.due_date);
  if (lastDate <= today) {
    const next = addMonthsUTC(lastDate, 1);
    const label = next.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    await sb.from("nl_billing_schedule").insert({ deal_id: deal.id, client_id: deal.provisioned_client_id, kind: "monthly", method: "stripe", amount: round2(monthly), label: "Monthly", covers: label, due_date: ymd(next) });
  }
}

/** On the 1st: creates last month's commission row from attributed revenue. */
export async function ensureCommission(sb: SB, deal: any, today: Date) {
  if (deal.pricing_model !== "commission" || !deal.billing_start_date || today.getUTCDate() !== 1) return;
  const start = parseYmd(deal.billing_start_date);
  if (today < firstOfNextMonth(start)) return;
  const prev = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const { data: rev } = await sb.from("nl_attributed_revenue").select("revenue, client_started_on").eq("deal_id", deal.id).eq("month", ymd(prev));
  let amount = 0;
  const r1 = Number(deal.commission_rate ?? 25), r2 = Number(deal.commission_rate_ongoing ?? 10);
  for (const r of rev || []) {
    const firstYear = prev < addYearsUTC(parseYmd(r.client_started_on), 1);
    amount += Number(r.revenue) * (firstYear ? r1 : r2) / 100;
  }
  amount = round2(amount);
  const label = prev.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  await sb.from("nl_billing_schedule").insert({
    deal_id: deal.id, client_id: deal.provisioned_client_id, kind: "commission", method: "stripe", amount,
    label: "Commission", covers: `New-client revenue in ${label}`, due_date: ymd(today), status: amount > 0 ? "scheduled" : "waived",
  }).select("id");
}

// ─── Stripe ────────────────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
export async function stripeClient(): Promise<any | null> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
  return new Stripe(key, { apiVersion: "2024-04-10" });
}

/** Customer + saved method for the client's real workspace. */
export async function savedMethod(sb: SB, deal: any): Promise<{ customerId: string | null; paymentMethodId: string | null }> {
  const cid = deal.provisioned_client_id || deal.client_id;
  const { data: c } = await sb.from("clients").select("stripe_customer_id, stripe_payment_method_id").eq("id", cid).maybeSingle();
  return { customerId: c?.stripe_customer_id ?? null, paymentMethodId: c?.stripe_payment_method_id ?? null };
}

/** Charges one schedule row off-session. ACH ends in "processing" (webhook finishes it). */
export async function chargeRow(sb: SB, stripe: any, row: any, deal: any) {
  const { customerId, paymentMethodId } = await savedMethod(sb, deal);
  const now = new Date().toISOString();
  if (!customerId || !paymentMethodId) {
    await failRow(sb, row, deal, "No saved payment method on file");
    return;
  }
  try {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(Number(row.amount) * 100), currency: "usd",
      customer: customerId, payment_method: paymentMethodId,
      off_session: true, confirm: true,
      payment_method_types: ["card", "us_bank_account"],
      description: `NewLight — ${row.label}${row.covers ? ` (${row.covers})` : ""}`,
      metadata: { nl_schedule_id: row.id, deal_id: deal.id },
    }, { idempotencyKey: `nl-${row.id}-${row.attempts + 1}` });
    const patch: Record<string, unknown> = { stripe_payment_intent_id: pi.id, attempts: row.attempts + 1, last_attempt_at: now, updated_at: now };
    if (pi.status === "succeeded") {
      await sb.from("nl_billing_schedule").update(patch).eq("id", row.id);
      await markRowPaid(sb, { ...row, ...patch }, deal, { via: "stripe" });
    } else if (pi.status === "processing") {
      await sb.from("nl_billing_schedule").update({ ...patch, status: "processing" }).eq("id", row.id);
    } else {
      await sb.from("nl_billing_schedule").update(patch).eq("id", row.id);
      await failRow(sb, { ...row, ...patch }, deal, `Stripe status: ${pi.status}`);
    }
  } catch (e: any) {
    await sb.from("nl_billing_schedule").update({ attempts: row.attempts + 1, last_attempt_at: now }).eq("id", row.id);
    await failRow(sb, { ...row, attempts: row.attempts + 1 }, deal, e?.raw?.message || e?.message || String(e));
  }
}

/** Failure policy: alert now; retry day 1 and day 3; after the 3rd failure pause work. */
export async function failRow(sb: SB, row: any, deal: any, reason: string) {
  const attempts = Number(row.attempts || 1);
  const now = Date.now();
  const nextRetry = attempts === 1 ? new Date(now + 86400_000) : attempts === 2 ? new Date(now + 2 * 86400_000) : null;
  await sb.from("nl_billing_schedule").update({ status: "failed", failure_reason: reason, next_retry_at: nextRetry?.toISOString() ?? null, updated_at: new Date().toISOString() }).eq("id", row.id);
  const amt = money(row.amount, true);
  const billUrl = `${APP_BASE_URL}/billing`;
  if (nextRetry) {
    await notifyAll(sb, deal, `Payment failed — ${amt}`, [
      `We couldn't collect ${amt} for ${row.label}${row.covers ? ` (${row.covers})` : ""}.`,
      `Reason: ${reason}.`,
      `We'll try again automatically on ${nextRetry.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" })}. Please update the payment method if needed. If it still fails after the third try, work will pause.`,
    ], `payment of ${amt} failed (try ${attempts} of 3). We'll retry automatically.`, { ctaUrl: billUrl, ctaLabel: "Update payment method" });
  } else {
    await pauseWork(sb, deal, `Payment of ${amt} failed 3 times`);
  }
}

export async function pauseWork(sb: SB, deal: any, reason: string) {
  if (deal.work_paused_at) return;
  const at = new Date().toISOString();
  await sb.from("crm_deals").update({ work_paused_at: at, work_paused_reason: reason }).eq("id", deal.id);
  await setClientPaused(sb, deal, at, reason);
  await notifyAll(sb, deal, "Work is paused — payment needed", [
    reason + ".",
    "Work on your account is paused and your Command Center is read-only until the balance is paid.",
    "Pay now and everything resumes right away.",
  ], `work is paused: ${reason}. Pay to resume.`, { ctaUrl: `${APP_BASE_URL}/billing`, ctaLabel: "Pay now" });
}

/** Mirror of the pause on the client workspace (clients can't read crm_deals) — drives the read-only banner in their app. */
export async function setClientPaused(sb: SB, deal: any, at: string | null, reason: string | null) {
  if (!deal.provisioned_client_id) return;
  await sb.from("clients").update({ billing_paused_at: at, billing_paused_reason: reason }).eq("id", deal.provisioned_client_id);
}

export async function maybeResume(sb: SB, deal: any) {
  if (!deal.work_paused_at) return;
  const { count } = await sb.from("nl_billing_schedule").select("id", { count: "exact", head: true }).eq("deal_id", deal.id).eq("status", "failed");
  const today = ymd(pacificDate());
  const { count: lateWires } = await sb.from("nl_billing_schedule").select("id", { count: "exact", head: true }).eq("deal_id", deal.id).eq("method", "wire").eq("status", "scheduled").lt("due_date", today);
  if ((count ?? 0) === 0 && (lateWires ?? 0) === 0) {
    await sb.from("crm_deals").update({ work_paused_at: null, work_paused_reason: null }).eq("id", deal.id);
    await setClientPaused(sb, deal, null, null);
    await notifyAll(sb, deal, "Payment received — work resumed", ["Thank you. Your account is active again."], "payment received, work resumed.");
  }
}

/** Marks a row paid and runs follow-ups (guarantee start, annual renewal row, resume, receipts). */
export async function markRowPaid(sb: SB, row: any, deal: any, opts: { via: "stripe" | "wire"; by?: string | null; reference?: string | null }) {
  const now = new Date().toISOString();
  // Atomic claim: only the first caller (webhook, browser return, or admin) runs the follow-ups.
  const { data: claimed } = await sb.from("nl_billing_schedule").update({ status: "paid", paid_at: now, paid_marked_by: opts.by ?? null, wire_reference: opts.reference ?? row.wire_reference ?? null, failure_reason: null, next_retry_at: null, updated_at: now })
    .eq("id", row.id).neq("status", "paid").select("id");
  if (!claimed || claimed.length === 0) return;
  const isFirst = ["setup", "setup_installment_1", "annual"].includes(row.kind);
  if (isFirst && deal.package === "growth" && !deal.guarantee_started_at) {
    const g = new Date(Date.now() + 90 * 86400_000);
    await sb.from("crm_deals").update({ has_guarantee: true, guarantee_started_at: now, guarantee_ends_at: g.toISOString() }).eq("id", deal.id);
  }
  if (row.kind === "annual" || row.kind === "annual_renewal") {
    const next = addYearsUTC(parseYmd(row.due_date), 1);
    const renewal = Number(deal.annual_amount_renewal || 0);
    if (renewal > 0) {
      await sb.from("nl_billing_schedule").insert({ deal_id: deal.id, client_id: deal.provisioned_client_id, kind: "annual_renewal", method: "wire", amount: renewal, label: "Annual renewal", covers: "12 months, 20% off", due_date: ymd(next) });
      await sb.from("crm_deals").update({ next_charge_at: next.toISOString() }).eq("id", deal.id);
    }
  }
  await maybeResume(sb, { ...deal });
  if (isFirst) {
    await firstPaymentFollowUps(sb, deal, row);
    return;
  }
  const c = await dealContacts(sb, deal);
  await sendEmail(c.clientEmails, `Payment received — ${money(row.amount, true)}`, emailHtml("Payment received — thank you", [
    `We received ${money(row.amount, true)} for ${row.label}${row.covers ? ` (${row.covers})` : ""}.`,
    `Paid by ${opts.via === "wire" ? "bank wire" : "automatic payment"} on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })}.`,
  ]));
}

/** "Made it back" confirmed → ongoing billing starts on the 1st after the later of day 90 / today. */
export async function confirmMadeBack(sb: SB, deal: any, byUser: string | null) {
  const today = pacificDate();
  const gEnd = deal.guarantee_ends_at ? pacificDate(new Date(deal.guarantee_ends_at)) : today;
  const start = gEnd > today ? gEnd : today;
  await sb.from("crm_deals").update({ made_back_at: new Date().toISOString(), made_back_confirmed_by: byUser, billing_start_date: ymd(start) }).eq("id", deal.id);
  const fresh = { ...deal, billing_start_date: ymd(start) };
  await ensureNextMonthly(sb, fresh);
  const first = deal.pricing_model === "commission"
    ? `Commission billing starts ${firstOfNextMonth(start).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}.`
    : `Your plan starts ${ymd(start)}; the first charge is on ${ymd(firstMonthlyCharge(start, Number(deal.recurring_fee || 0)).date)}.`;
  await notifyAll(sb, deal, "You've made your investment back", [
    "Great news — the new clients we brought you have covered your setup investment.",
    first,
  ], "you've made your investment back. " + first);
  return ymd(start);
}

/** Revenue made back so far (sum of attributed revenue). */
export async function madeBackSoFar(sb: SB, dealId: string): Promise<number> {
  const { data } = await sb.from("nl_attributed_revenue").select("revenue").eq("deal_id", dealId);
  return round2((data || []).reduce((s: number, r: any) => s + Number(r.revenue || 0), 0));
}

/** First payment of a plan: the deal's Pay & Sign invoice is paid → existing confirmations + Paid & Signed (→ lead Won). */
async function firstPaymentFollowUps(sb: SB, deal: any, row: any) {
  try {
    let invId = deal.payment_invoice_id as string | null;
    if (!invId) {
      let { data: ba } = await sb.from("billing_accounts").select("id").eq("client_id", deal.client_id).order("created_at").limit(1).maybeSingle();
      if (!ba) ba = (await sb.from("billing_accounts").insert({ client_id: deal.client_id }).select("id").single()).data;
      const { data: inv } = await sb.from("invoices").insert({
        client_id: deal.client_id, billing_account_id: ba.id, invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
        provisioned_client_id: deal.provisioned_client_id ?? null, invoice_type: row.kind === "annual" ? "annual" : "initial_fee",
        invoice_status: "pending", subtotal_amount: row.amount, tax_amount: 0, total_amount: row.amount, amount_paid: 0,
        issued_at: new Date().toISOString(), deal_id: deal.id,
      }).select("id").single();
      invId = inv?.id ?? null;
      if (invId) await sb.from("crm_deals").update({ payment_invoice_id: invId }).eq("id", deal.id);
    }
    if (invId) {
      await sb.from("invoices").update({ invoice_status: "paid", amount_paid: row.amount, paid_at: new Date().toISOString(), payment_method: row.method }).eq("id", invId);
      await sb.from("nl_billing_schedule").update({ invoice_id: invId }).eq("id", row.id);
    }
    let paySignUrl: string | undefined; let envStatus: string | null = null;
    if (deal.service_agreement_envelope_id) {
      const { data: env } = await sb.from("document_envelopes").select("status, share_token").eq("id", deal.service_agreement_envelope_id).maybeSingle();
      envStatus = env?.status ?? null;
      if (env?.share_token) paySignUrl = `${APP_BASE_URL}/pay-sign/${env.share_token}`;
    }
    if (invId) await sendPaymentConfirmation(sb, deal.id, { invoiceId: invId, paySignUrl });
    if (envStatus === "signed") await notifyPaidSignedIfTransition(sb, deal.id, { envelopeId: deal.service_agreement_envelope_id, paySignUrl });
    else await sb.from("crm_deals").update({ pay_sign_status: "paid" }).eq("id", deal.id).neq("pay_sign_status", "paid_signed");
    const paidClient = deal.provisioned_client_id || deal.client_id;
    if (paidClient) await sb.from("clients").update({ payment_status: "paid" }).eq("id", paidClient);
  } catch (e) { console.error("[nlBilling firstPaymentFollowUps]", e); }
}
