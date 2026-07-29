// Shared helper: when a deal transitions to paid_signed, fire SMS + email to the ops team.
// Uses conditional update so only the one transition actually notifies.

const OPS_SMS_TO = "+18058363557"; // (805) 836-3557
const OPS_EMAIL_TO = "team@newlightgen.com";
const TWILIO_FROM = "+18058940908";

async function sendSms(to: string, body: string): Promise<{ ok: boolean; detail: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[paid-signed SMS QUEUED - no creds] to=${to}`);
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
      console.error("[paid-signed Twilio error]", res.status, t);
      return { ok: false, detail: `${res.status}: ${t}` };
    }
    return { ok: true, detail: "sent" };
  } catch (e) {
    console.error("[paid-signed SMS error]", e);
    return { ok: false, detail: String((e as Error).message) };
  }
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; detail: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[paid-signed EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return { ok: false, detail: "resend credentials missing" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, text, html }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[paid-signed Resend error]", res.status, t);
      return { ok: false, detail: `${res.status}: ${t}` };
    }
    return { ok: true, detail: "sent" };
  } catch (e) {
    console.error("[paid-signed Email error]", e);
    return { ok: false, detail: String((e as Error).message) };
  }
}

/**
 * Atomically transition a deal to paid_signed and notify ops if we win the race.
 * Returns { transitioned, sms, email } — falsy transitioned means somebody else already did it.
 */
// deno-lint-ignore no-explicit-any
export async function notifyPaidSignedIfTransition(supabase: any, dealId: string, opts: { paySignUrl?: string; envelopeId?: string } = {}) {
  const { data: deal, error } = await supabase
    .from("crm_deals")
    .update({ pay_sign_status: "paid_signed" })
    .eq("id", dealId)
    .neq("pay_sign_status", "paid_signed")
    .select("id, deal_name, initial_fee, pricing_model, recurring_fee, commission_rate, client_id, contact_id")
    .maybeSingle();

  if (error) {
    console.error("[paid-signed transition error]", error);
    return { transitioned: false, sms: null, email: null, error: error.message };
  }
  if (!deal) {
    return { transitioned: false, sms: null, email: null };
  }

  // Resolve display bits
  let businessName = deal.deal_name || "Client";
  if (deal.client_id) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", deal.client_id).maybeSingle();
    if (client?.name) businessName = client.name;
  }
  const initFmt = `$${Number(deal.initial_fee || 0).toLocaleString()}`;
  const priceLine = deal.pricing_model === "retainer"
    ? `Retainer — Initial ${initFmt} + $${Number(deal.recurring_fee || 0).toLocaleString()}/mo`
    : `Commission — Initial ${initFmt} + ${Number(deal.commission_rate || 0)}% of revenue`;

  const link = opts.paySignUrl || "";
  const subj = `PAID & SIGNED: ${businessName} · ${initFmt}`;
  const text = [
    `${businessName} has paid the initial fee AND signed the service agreement.`,
    ``,
    `Terms: ${priceLine}`,
    link ? `Pay & Sign record: ${link}` : ``,
    ``,
    `Kick off onboarding.`,
  ].filter(Boolean).join("\n");

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#10b981;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;text-align:center;letter-spacing:0.5px;">
      ✓ PAID & SIGNED
    </div>
    <h1 style="font-size:22px;margin:20px 0 6px;">${businessName}</h1>
    <p style="color:#6b7280;margin:0 0 20px;font-size:13px;">Initial fee received. Service agreement signed with verified audit trail.</p>
    <table style="width:100%;font-size:14px;line-height:1.7;border-collapse:collapse;">
      <tr><td style="color:#6b7280;width:130px;">Amount</td><td><strong>${initFmt}</strong></td></tr>
      <tr><td style="color:#6b7280;">Terms</td><td><strong>${priceLine}</strong></td></tr>
    </table>
    ${link ? `<div style="margin-top:20px;"><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;">View signed document</a></div>` : ""}
    <p style="font-size:12px;color:#6b7280;margin-top:28px;">Automatic notification from NewLight platform.</p>
  </div>
</body></html>`;

  const smsBody = `NewLight: ${businessName} paid & signed. ${initFmt}.${link ? " " + link : ""}`;

  const [smsRes, emailRes] = await Promise.all([
    sendSms(OPS_SMS_TO, smsBody),
    sendEmail(OPS_EMAIL_TO, subj, html, text),
  ]);

  return { transitioned: true, sms: smsRes, email: emailRes };
}
