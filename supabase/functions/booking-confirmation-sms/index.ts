// Triggered on new row insert into public.bdr_calendar_events (BDR confirmed bookings).
// Wire this up as a Database Webhook: Table = bdr_calendar_events, Event = INSERT,
// Type = Supabase Edge Function → booking-confirmation-sms.
//
// Sends two SMS via the Twilio connector gateway (same pattern as
// supabase/functions/process-meeting-reminders/index.ts):
//   1. To the client who booked — appointment confirmation.
//   2. To the BDR who owns the calendar — new booking notification.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[SMS QUEUED] To: ${to} | Body: ${body.substring(0, 120)}...`);
    return false;
  }

  try {
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: Deno.env.get("TWILIO_FROM_NUMBER") || "+18058363557",
        Body: body,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Twilio error:", response.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("SMS send error:", e);
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL QUEUED - no RESEND_API_KEY] To: ${to} | Subject: ${subject}`);
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NewLight <noreply@newlightgen.com>",
        to: [to],
        subject,
        text,
        html,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("Resend error:", response.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json().catch(() => ({} as any));
    // Supabase database webhooks send { type, table, record, old_record, schema }
    // Allow direct manual invocation too: { record: {...} } or a raw record.
    const record = payload.record ?? payload;

    if (!record || typeof record !== "object") {
      return new Response(JSON.stringify({ error: "No record in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only act on INSERTs into bdr_calendar_events (defensive).
    if (payload.type && payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: "non-insert event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payload.table && payload.table !== "bdr_calendar_events") {
      return new Response(JSON.stringify({ skipped: "unexpected table" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startsAt: string | undefined = record.starts_at;
    const meta = (record.metadata || {}) as Record<string, any>;
    const bdrUserId: string | undefined = record.user_id;
    const leadId: string | undefined = record.lead_id;

    if (!startsAt) throw new Error("Missing starts_at on booking record");

    // --- Resolve client (booker) name + phone + email ------------------------
    let clientName: string = meta.customer_name || "";
    let clientPhone: string = meta.phone || "";
    let clientEmail: string = meta.email || meta.owner_email || "";

    if ((!clientName || !clientPhone || !clientEmail) && leadId) {
      const { data: lead } = await supabase
        .from("nl_bdr_leads")
        .select("owner_name, business_name, phone, owner_email")
        .eq("id", leadId)
        .maybeSingle();
      if (lead) {
        if (!clientName) clientName = lead.owner_name || lead.business_name || "";
        if (!clientPhone) clientPhone = lead.phone || "";
        if (!clientEmail) clientEmail = lead.owner_email || "";
      }
    }

    // --- Resolve BDR phone + email (owner of the calendar) -------------------
    let bdrPhone = "";
    let bdrEmail = "";
    let bdrName = "";
    if (bdrUserId) {
      const { data: userResp, error: userErr } = await supabase.auth.admin.getUserById(bdrUserId);
      if (userErr) console.error("[BDR lookup] auth.admin.getUserById error:", userErr);
      const u = userResp?.user;
      if (u) {
        bdrPhone = u.phone || (u.user_metadata as any)?.phone || "";
        bdrEmail = u.email || "";
        bdrName =
          (u.user_metadata as any)?.full_name ||
          (u.user_metadata as any)?.name ||
          u.email ||
          "";
      }
      if (!bdrName) {
        const { data: emp } = await supabase
          .from("employee_profiles")
          .select("full_name")
          .eq("user_id", bdrUserId)
          .maybeSingle();
        if (emp?.full_name) bdrName = emp.full_name;
      }
    }
    console.log(`[BDR contact] user_id=${bdrUserId} name="${bdrName}" phone="${bdrPhone}" email="${bdrEmail}"`);

    // ---- Kick off notification + provisioning chain in the background ------
    // pg_net (the webhook caller) waits at most 5s for a response. Everything
    // below — provision-from-booking, SMS to client, SMS to BDR, Resend email,
    // temp password issuance, follow-up SMS — is decoupled via
    // EdgeRuntime.waitUntil so the isolate stays alive after we return 202.
    const contacts = {
      clientName, clientPhone, clientEmail,
      bdrUserId, bdrPhone, bdrEmail, bdrName,
      startsAt, meta, recordId: record.id as string,
    };

    // deno-lint-ignore no-explicit-any
    const waitUntil = (globalThis as any)?.EdgeRuntime?.waitUntil?.bind((globalThis as any).EdgeRuntime);
    const bgTask = runNotifications(supabase, record, contacts).catch((e) => {
      console.error("[booking-confirmation-sms] runNotifications uncaught:", e);
    });
    if (typeof waitUntil === "function") {
      waitUntil(bgTask);
    } else {
      // Fallback: no waitUntil available (e.g. local dev) — do not await, but
      // also do not lose the promise. Best-effort.
      console.warn("[booking-confirmation-sms] EdgeRuntime.waitUntil unavailable; running detached");
      void bgTask;
    }

    return new Response(
      JSON.stringify({ accepted: true, booking_id: record.id }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("booking-confirmation-sms error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------------------------------------------------------------------------
// Background: full notification + provisioning chain. Wrapped in try/catch so
// no failure inside can crash the isolate — the HTTP response has already been
// sent by the time this runs.
// ---------------------------------------------------------------------------
async function runNotifications(
  supabase: ReturnType<typeof createClient>,
  record: any,
  contacts: {
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    bdrUserId: string | undefined;
    bdrPhone: string;
    bdrEmail: string;
    bdrName: string;
    startsAt: string;
    meta: Record<string, any>;
    recordId: string;
  },
): Promise<void> {
  try {
    const { clientName, clientPhone, clientEmail, bdrUserId, bdrPhone, bdrEmail, bdrName, startsAt, meta, recordId } = contacts;
    const when = formatDateTime(startsAt);

    // --- 1. SMS to client ----------------------------------------------------
    const clientMsg = `Your appointment with NewLight is confirmed for ${when}. We'll see you then! Questions? Call (805) 836-3557\n\nDownload the NewLight app and get your system ready before we meet: https://newlight-app.com`;
    let clientSent = false;
    if (clientPhone) {
      clientSent = await sendSms(clientPhone, clientMsg);
      console.log(`[SMS→client] to=${clientPhone} success=${clientSent}`);
    } else {
      console.warn("No client phone available for booking", recordId);
    }

    // --- 2. SMS to BDR -------------------------------------------------------
    const bdrMsg = `New booking confirmed: ${clientName || "New lead"} at ${when}. Check your calendar.`;
    let bdrSent = false;
    if (bdrPhone) {
      bdrSent = await sendSms(bdrPhone, bdrMsg);
      console.log(`[SMS→BDR] to=${bdrPhone} success=${bdrSent}`);
    } else {
      console.warn("No BDR phone available for user", bdrUserId);
    }

    // --- 2b. Email to BDR ----------------------------------------------------
    let bdrEmailSent = false;
    if (bdrEmail) {
      const label = clientName || "New lead";
      const subj = `New Booking: ${label} at ${when}`;
      const text = `Hi ${bdrName || "there"},\n\nYou have a new booking.\n\nClient: ${label}\nWhen: ${when}\nPhone: ${clientPhone || "n/a"}\nEmail: ${clientEmail || "n/a"}\n${meta.notes ? `Notes: ${meta.notes}\n` : ""}${meta.improvement_area ? `Interest: ${meta.improvement_area}\n` : ""}\nCheck your calendar in the NewLight app.`;
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">New booking confirmed</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Hi ${bdrName || "there"},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">You have a new appointment on your NewLight calendar.</p>
    <table style="width:100%;font-size:14px;line-height:1.6;border-collapse:collapse;margin:0 0 20px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:110px;">Client</td><td style="padding:6px 0;"><strong>${label}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">When</td><td style="padding:6px 0;"><strong>${when}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;">${clientPhone || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${clientEmail || "—"}</td></tr>
      ${meta.improvement_area ? `<tr><td style="padding:6px 0;color:#6b7280;">Interest</td><td style="padding:6px 0;">${meta.improvement_area}</td></tr>` : ""}
      ${meta.notes ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Notes</td><td style="padding:6px 0;">${meta.notes}</td></tr>` : ""}
    </table>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">Check your calendar in the NewLight app.</p>
  </div>
</body></html>`;
      bdrEmailSent = await sendEmail(bdrEmail, subj, html, text);
      console.log(`[EMAIL→BDR] to=${bdrEmail} subject="${subj}" success=${bdrEmailSent}`);
    } else {
      console.warn("No BDR email available for user", bdrUserId);
    }

    // --- 3. Provision client workspace + temp password -----------------------
    let tempPassword: string | null = null;
    let provisionOk = false;
    let workspaceUrl: string | null = null;
    if (clientEmail) {
      try {
        const rand = crypto.getRandomValues(new Uint8Array(9));
        tempPassword = "NL-" + btoa(String.fromCharCode(...rand)).replace(/[^A-Za-z0-9]/g, "").slice(0, 9);

        const industry = meta.improvement_area || meta.industry || null;
        const businessName = meta.business_name || meta.company_name || clientName || clientEmail.split("@")[0];

        const { data: provResp, error: provErr } = await supabase.functions.invoke("provision-from-booking", {
          body: {
            business_name: businessName,
            contact_name: clientName || clientEmail.split("@")[0],
            contact_email: clientEmail,
            contact_phone: clientPhone || null,
            industry,
            appointment_id: recordId,
            main_goal: meta.improvement_area || null,
            interested_service: meta.improvement_area || null,
            preferred_contact_method: clientPhone ? "sms" : "email",
            sms_consent: Boolean(clientPhone),
            booking_source: "bdr_booking",
          },
        });
        if (provErr) throw provErr;
        provisionOk = Boolean(provResp?.success);
        workspaceUrl = provResp?.workspace_url || null;
        const linkedUserId: string | null = provResp?.linked_user_id || null;
        console.log(`[provision-from-booking] success=${provisionOk} user_id=${linkedUserId} workspace=${workspaceUrl}`);

        if (linkedUserId && tempPassword) {
          const { error: updErr } = await supabase.auth.admin.updateUserById(linkedUserId, {
            password: tempPassword,
            email_confirm: true,
            user_metadata: { must_change_password: true },
          });
          if (updErr) {
            console.error("[provision-from-booking] set temp password failed:", updErr);
            tempPassword = null;
          }
        } else {
          tempPassword = null;
        }
      } catch (e) {
        console.error("[provision-from-booking] error:", e);
        tempPassword = null;
      }
    }

    // --- 4. Email to client (with credentials if available) ------------------
    let clientEmailSent = false;
    if (clientEmail) {
      const greeting = clientName ? `Hi ${clientName},` : "Hi there,";
      const appUrl = "https://newlight-app.com";
      const loginUrl = "https://newlight-app.com/auth";
      const credsBlockText = tempPassword
        ? `\n\nYour NewLight workspace is ready.\nLogin: ${loginUrl}\nEmail: ${clientEmail}\nTemporary password: ${tempPassword}\n(You'll be asked to change it on first login.)\n`
        : "";
      const credsBlockHtml = tempPassword
        ? `<div style="margin:24px 0;padding:20px;background:#F1F5F9;border-radius:12px;border:1px solid #E2E8F0;">
             <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0F172A;">Your NewLight workspace is ready</p>
             <p style="margin:0 0 4px;font-size:14px;color:#334155;"><strong>Email:</strong> ${clientEmail}</p>
             <p style="margin:0 0 14px;font-size:14px;color:#334155;"><strong>Temporary password:</strong> <code style="background:#fff;padding:3px 8px;border-radius:6px;border:1px solid #CBD5E1;font-size:13px;">${tempPassword}</code></p>
             <div style="text-align:center;margin-top:8px;">
               <a href="${loginUrl}" style="display:inline-block;background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Login to NewLight</a>
             </div>
             <p style="margin:12px 0 0;font-size:12px;color:#64748B;">You'll be asked to change your password on first login.</p>
           </div>`
        : "";
      const emailText = `${greeting}\n\nYour appointment with NewLight is confirmed for ${when}.${credsBlockText}\n\nBefore we meet, download the NewLight app so your system is ready to go:\n${appUrl}\n\nQuestions? Call (805) 836-3557.\n\nSee you soon,\nThe NewLight Team`;
      const emailHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Your appointment is confirmed</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">Your strategy session with NewLight is confirmed for <strong>${when}</strong>.</p>
    ${credsBlockHtml}
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">Before we meet, download the NewLight app so your system is ready to go:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${appUrl}" style="display:inline-block;background:#0EA5E9;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Download the NewLight App</a>
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">Questions? Call (805) 836-3557.</p>
    <p style="font-size:12px;color:#9ca3af;margin:32px 0 0;">— The NewLight Team</p>
  </div>
</body></html>`;
      clientEmailSent = await sendEmail(
        clientEmail,
        "Your NewLight appointment is confirmed",
        emailHtml,
        emailText,
      );
      console.log(`[EMAIL→client] to=${clientEmail} success=${clientEmailSent}`);
    } else {
      console.warn("No client email available for booking", recordId);
    }

    // --- 5. Follow-up SMS to client with credentials -------------------------
    if (clientPhone && tempPassword) {
      const credsSms = `Your NewLight workspace is ready. Login at https://newlight-app.com/auth — Email: ${clientEmail} Temporary password: ${tempPassword} — Change your password on first login.`;
      const credsSent = await sendSms(clientPhone, credsSms);
      console.log(`[SMS→client creds] to=${clientPhone} success=${credsSent}`);
    }

    console.log(`[booking-confirmation-sms] background chain complete for booking=${recordId} client_sms=${clientSent} bdr_sms=${bdrSent} bdr_email=${bdrEmailSent} provisioned=${provisionOk} client_email=${clientEmailSent} temp_password=${Boolean(tempPassword)}`);
  } catch (err) {
    console.error("[booking-confirmation-sms] runNotifications fatal:", err);
  }
}

