// Shared helpers for Form 3 (Pay & Sign) notifications:
//  - sendPaymentConfirmation: ops SMS + ops/payer/rep email + client invoice receipt
//  - sendWelcomeDocument: warm client welcome, only once paid + signed + scheduled
// Both are idempotent via boolean flags on invoices / crm_deals.

const OPS_SMS_TO = "+18058363557";
const OPS_PHONE_DISPLAY = "(805) 836-3557";
const OPS_EMAIL_TO = "team@newlightgen.com";
const TWILIO_FROM = "+18058940908";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; detail: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[pay-sign SMS QUEUED - no creds] to=${to}`);
    return { ok: false, detail: "twilio credentials missing" };
  }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: Deno.env.get("TWILIO_FROM_NUMBER") || TWILIO_FROM,
        Body: body,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[pay-sign Twilio error]", res.status, t);
      return { ok: false, detail: `${res.status}: ${t}` };
    }
    return { ok: true, detail: "sent" };
  } catch (e) {
    console.error("[pay-sign SMS error]", e);
    return { ok: false, detail: String((e as Error).message) };
  }
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; detail: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[pay-sign EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return { ok: false, detail: "resend credentials missing" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <noreply@newlightgen.com>", to: [to], subject, text, html }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[pay-sign Resend error]", res.status, t);
      return { ok: false, detail: `${res.status}: ${t}` };
    }
    return { ok: true, detail: "sent" };
  } catch (e) {
    console.error("[pay-sign Email error]", e);
    return { ok: false, detail: String((e as Error).message) };
  }
}

function money(n: unknown): string {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function termsLine(deal: any): string {
  const init = `$${Number(deal?.initial_fee || 0).toLocaleString()}`;
  return deal?.pricing_model === "retainer"
    ? `Retainer — Initial ${init} + $${Number(deal?.recurring_fee || 0).toLocaleString()}/mo`
    : `Commission — Initial ${init} + ${Number(deal?.commission_rate || 0)}% of attributable revenue`;
}

// deno-lint-ignore no-explicit-any
async function resolveRep(supabase: any, userId: string | null) {
  if (!userId) return null;
  const { data } = await supabase
    .from("employee_profiles")
    .select("user_id, full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return { id: data.user_id, name: data.full_name || "Your NewLight rep", email: data.email || null };
  const { data: wu } = await supabase
    .from("workspace_users")
    .select("user_id, full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (wu) return { id: wu.user_id, name: wu.full_name || "Your NewLight rep", email: wu.email || null };
  return null;
}

/**
 * Fires all payment confirmations exactly once per invoice.
 */
// deno-lint-ignore no-explicit-any
export async function sendPaymentConfirmation(
  supabase: any,
  dealId: string,
  opts: { invoiceId: string; payerEmail?: string | null; paySignUrl?: string },
) {
  // Idempotency guard — conditional update wins the race exactly once.
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .update({ payment_confirmation_sent: true })
    .eq("id", opts.invoiceId)
    .eq("payment_confirmation_sent", false)
    .select("id, invoice_number, total_amount, amount_paid, paid_at, issued_at")
    .maybeSingle();
  if (invErr) {
    console.error("[pay-sign payment confirmation guard error]", invErr);
    return { sent: false, error: invErr.message };
  }
  if (!inv) return { sent: false, reason: "already_sent" };

  const { data: deal } = await supabase
    .from("crm_deals")
    .select("id, deal_name, client_id, initial_fee, pricing_model, recurring_fee, commission_rate, assigned_user")
    .eq("id", dealId)
    .maybeSingle();

  let businessName = deal?.deal_name || "Client";
  if (deal?.client_id) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", deal.client_id).maybeSingle();
    if (client?.name) businessName = client.name;
  }
  const rep = await resolveRep(supabase, deal?.assigned_user ?? null);

  const amount = money(inv.amount_paid ?? inv.total_amount);
  const terms = termsLine(deal);
  const link = opts.paySignUrl || "";
  const paidDate = new Date(inv.paid_at || Date.now()).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  // --- Internal / ops-style alert ---
  const opsSubject = `PAYMENT RECEIVED: ${businessName} · ${amount}`;
  const opsText = [
    `${businessName} paid the initial fee.`,
    ``,
    `Amount: ${amount}`,
    `Invoice: ${inv.invoice_number}`,
    `Terms: ${terms}`,
    rep?.name ? `Rep: ${rep.name}` : ``,
    link ? `Pay & Sign record: ${link}` : ``,
  ].filter(Boolean).join("\n");
  const opsHtml = `<!DOCTYPE html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#0f172a;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;text-align:center;letter-spacing:0.5px;">
      PAYMENT RECEIVED
    </div>
    <h1 style="font-size:22px;margin:20px 0 6px;">${esc(businessName)}</h1>
    <table style="width:100%;font-size:14px;line-height:1.7;border-collapse:collapse;">
      <tr><td style="color:#6b7280;width:140px;">Amount paid</td><td><strong>${amount}</strong></td></tr>
      <tr><td style="color:#6b7280;">Invoice</td><td><strong>${esc(inv.invoice_number)}</strong></td></tr>
      <tr><td style="color:#6b7280;">Terms</td><td><strong>${esc(terms)}</strong></td></tr>
      ${rep?.name ? `<tr><td style="color:#6b7280;">Rep</td><td><strong>${esc(rep.name)}</strong></td></tr>` : ""}
    </table>
    ${link ? `<div style="margin-top:20px;"><a href="${esc(link)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Open Pay &amp; Sign record</a></div>` : ""}
    <p style="font-size:12px;color:#6b7280;margin-top:28px;">Automatic notification from the NewLight platform.</p>
  </div>
</body></html>`;

  // --- Client-facing invoice receipt (plain business-document styling) ---
  const receiptSubject = `Receipt — Invoice ${inv.invoice_number} · ${amount}`;
  const receiptText = [
    `Receipt for Invoice ${inv.invoice_number}`,
    ``,
    `Billed to: ${businessName}`,
    `Date: ${paidDate}`,
    `Amount paid: ${amount}`,
    `Payment method: Card via Stripe`,
    ``,
    `Thank you. Questions: ${OPS_EMAIL_TO} · ${OPS_PHONE_DISPLAY}`,
  ].join("\n");
  const receiptHtml = `<!DOCTYPE html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:600px;margin:0 auto;padding:40px 32px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      <tr>
        <td style="font-size:18px;font-weight:700;">NewLight Generation</td>
        <td style="text-align:right;font-size:13px;color:#6b7280;">Invoice Receipt</td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
    <table style="width:100%;font-size:14px;line-height:1.9;border-collapse:collapse;">
      <tr><td style="color:#6b7280;width:170px;">Invoice number</td><td>${esc(inv.invoice_number)}</td></tr>
      <tr><td style="color:#6b7280;">Date paid</td><td>${esc(paidDate)}</td></tr>
      <tr><td style="color:#6b7280;">Billed to</td><td>${esc(businessName)}</td></tr>
      <tr><td style="color:#6b7280;">Payment method</td><td>Card via Stripe</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <table style="width:100%;font-size:15px;border-collapse:collapse;">
      <tr>
        <td style="padding:6px 0;">Initial fee</td>
        <td style="padding:6px 0;text-align:right;">${amount}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-weight:700;border-top:1px solid #e5e7eb;">Total paid</td>
        <td style="padding:10px 0;text-align:right;font-weight:700;border-top:1px solid #e5e7eb;">${amount}</td>
      </tr>
    </table>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin-top:28px;">
      Ongoing terms: ${esc(terms)}.<br>
      Questions about this receipt? Contact ${OPS_EMAIL_TO} or ${OPS_PHONE_DISPLAY}.
    </p>
  </div>
</body></html>`;

  const smsBody = `NewLight: ${businessName} paid ${amount} (inv ${inv.invoice_number}).${link ? " " + link : ""}`;

  const targets: Promise<{ ok: boolean; detail: string }>[] = [
    sendSms(OPS_SMS_TO, smsBody),
    sendEmail(OPS_EMAIL_TO, opsSubject, opsHtml, opsText),
  ];
  if (rep?.email) targets.push(sendEmail(rep.email, opsSubject, opsHtml, opsText));
  if (opts.payerEmail) {
    targets.push(sendEmail(opts.payerEmail, opsSubject, opsHtml, opsText));
    targets.push(sendEmail(opts.payerEmail, receiptSubject, receiptHtml, receiptText));
  }

  const results = await Promise.all(targets);
  return { sent: true, results };
}

/**
 * Warm client welcome — only once paid + signed + scheduled are ALL true.
 */
// deno-lint-ignore no-explicit-any
export async function sendWelcomeDocument(
  supabase: any,
  dealId: string,
  opts: {
    clientEmail?: string | null;
    clientName?: string | null;
    repName?: string | null;
    repEmail?: string | null;
    onboardingMeetingStartsAt?: string | null;
    paySignUrl?: string;
  },
) {
  const { data: check } = await supabase
    .from("crm_deals")
    .select("id, deal_name, client_id, initial_fee, pricing_model, recurring_fee, commission_rate, pay_sign_status, onboarding_meeting_id, payment_invoice_id, service_agreement_envelope_id, welcome_email_sent, assigned_user")
    .eq("id", dealId)
    .maybeSingle();
  if (!check) return { sent: false, reason: "deal_not_found" };
  if (check.welcome_email_sent) return { sent: false, reason: "already_sent" };
  if (!check.onboarding_meeting_id) return { sent: false, reason: "not_scheduled" };

  const { data: invoice } = check.payment_invoice_id
    ? await supabase.from("invoices").select("invoice_status").eq("id", check.payment_invoice_id).maybeSingle()
    : { data: null };
  if (invoice?.invoice_status !== "paid") return { sent: false, reason: "not_paid" };

  const { data: envelope } = check.service_agreement_envelope_id
    ? await supabase.from("document_envelopes").select("status").eq("id", check.service_agreement_envelope_id).maybeSingle()
    : { data: null };
  if (envelope?.status !== "signed") return { sent: false, reason: "not_signed" };

  // Atomic once-only guard
  const { data: won } = await supabase
    .from("crm_deals")
    .update({ welcome_email_sent: true })
    .eq("id", dealId)
    .eq("welcome_email_sent", false)
    .select("id")
    .maybeSingle();
  if (!won) return { sent: false, reason: "already_sent" };

  let businessName = opts.clientName || check.deal_name || "there";
  if (!opts.clientName && check.client_id) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", check.client_id).maybeSingle();
    if (client?.name) businessName = client.name;
  }

  let rep = { name: opts.repName || null, email: opts.repEmail || null };
  if (!rep.name || !rep.email) {
    const r = await resolveRep(supabase, check.assigned_user ?? null);
    rep = { name: rep.name || r?.name || "Your NewLight account manager", email: rep.email || r?.email || OPS_EMAIL_TO };
  }

  const when = opts.onboardingMeetingStartsAt
    ? new Date(opts.onboardingMeetingStartsAt).toLocaleString(undefined, {
        weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
      })
    : null;
  const terms = termsLine(check);

  const subject = `Welcome to NewLight, ${businessName}`;
  const text = [
    `Welcome to NewLight, ${businessName}.`,
    ``,
    `Your payment is received and your service agreement is signed and on file.`,
    when ? `Onboarding meeting: ${when}` : `We'll confirm your onboarding meeting shortly.`,
    `Your account manager: ${rep.name}${rep.email ? ` (${rep.email})` : ""}`,
    `Terms: ${terms}`,
    ``,
    `Anything at all: ${OPS_EMAIL_TO} · ${OPS_PHONE_DISPLAY}`,
    opts.paySignUrl ? `Your signed documents: ${opts.paySignUrl}` : ``,
  ].filter(Boolean).join("\n");

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:600px;margin:0 auto;padding:0 0 40px;">
    <div style="background:#0f172a;color:#ffffff;padding:28px 32px;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#93c5fd;">NewLight Generation</div>
      <div style="font-size:24px;font-weight:700;margin-top:6px;">Welcome aboard, ${esc(businessName)}.</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:15px;line-height:1.7;margin:0 0 20px;">
        Everything's official — your initial payment is received and your signed service agreement is on file.
        Here's what happens next.
      </p>

      ${when ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px 18px;margin-bottom:20px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#0369a1;">Your onboarding meeting</div>
        <div style="font-size:17px;font-weight:700;margin-top:4px;">${esc(when)}</div>
        <div style="font-size:13px;color:#0369a1;margin-top:4px;">45 minutes · calendar invite to follow</div>
      </div>` : `<p style="font-size:14px;line-height:1.7;">We'll confirm your onboarding meeting time shortly.</p>`}

      <table style="width:100%;font-size:14px;line-height:1.9;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="color:#6b7280;width:170px;">Your account manager</td><td><strong>${esc(rep.name)}</strong>${rep.email ? `<br><a href="mailto:${esc(rep.email)}" style="color:#0369a1;">${esc(rep.email)}</a>` : ""}</td></tr>
        <tr><td style="color:#6b7280;">Your terms</td><td>${esc(terms)}</td></tr>
        <tr><td style="color:#6b7280;">Agreement</td><td>Signed and retained with a verified audit trail</td></tr>
      </table>

      ${opts.paySignUrl ? `<div style="margin:0 0 24px;"><a href="${esc(opts.paySignUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:11px 18px;border-radius:6px;text-decoration:none;font-size:13px;">View your signed documents</a></div>` : ""}

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0;">
        Need anything before then? Reach the team at
        <a href="mailto:${OPS_EMAIL_TO}" style="color:#0369a1;">${OPS_EMAIL_TO}</a> or ${OPS_PHONE_DISPLAY}.
      </p>
    </div>
  </div>
</body></html>`;

  const sends: Promise<{ ok: boolean; detail: string }>[] = [];
  if (opts.clientEmail) sends.push(sendEmail(opts.clientEmail, subject, html, text));
  sends.push(sendEmail(OPS_EMAIL_TO, `Onboarding scheduled — ${businessName}`, html, text));
  if (rep.email && rep.email !== OPS_EMAIL_TO) sends.push(sendEmail(rep.email, `Onboarding scheduled — ${businessName}`, html, text));

  const results = await Promise.all(sends);
  return { sent: true, results };
}
