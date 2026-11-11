// Shared senders for NewLight notices (Twilio via the Lovable connector, Resend for email).
export async function sendSms(to: string, body: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!to) return false;
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) { console.log(`[SMS QUEUED - missing key] to=${to}`); return false; }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: "+18555066111", Body: body }),
    });
    if (!res.ok) { console.error("Twilio error", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("SMS send error", e); return false; }
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!to) return false;
  if (!RESEND_API_KEY) { console.log(`[EMAIL QUEUED - no RESEND_API_KEY] to=${to}`); return false; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, html, text }),
    });
    if (!res.ok) { console.error("Resend error", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("Email send error", e); return false; }
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function formatPT(d: string) {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Los_Angeles",
  }) + " PT";
}

/** Rep's email, phone (auth phone or profile metadata) and name. */
export async function repContact(admin: any, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  const u = data?.user;
  const meta = (u?.user_metadata || {}) as Record<string, any>;
  return {
    email: (u?.email as string) || "",
    phone: (u?.phone ? `+${String(u.phone).replace(/^\+/, "")}` : "") || meta.phone || "",
    name: meta.full_name || meta.name || meta.display_name || (u?.email as string) || "Your salesman",
  };
}
