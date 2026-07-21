// Public booking endpoint for a BDR's personal calendar.
// Supports round-robin pool: if the matched calendar is in the round-robin pool,
// the booking is reassigned to the least-recently-assigned active pool member.
// Creates a lead in nl_bdr_leads (stage = hot) and an event in bdr_calendar_events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { booking_slug, meeting_kind, customer_name, business_name, phone, email, starts_at, duration_minutes, notes, modules_of_interest, logo_url, has_sales_team, sales_team_size } = body || {};
    const isClosing = meeting_kind === "closing";
    const isPayment = meeting_kind === "payment";
    if (!booking_slug || !customer_name || !starts_at) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const modulesClean = Array.isArray(modules_of_interest)
      ? modules_of_interest.filter((m: unknown) => typeof m === "string" && m.length > 0).slice(0, 20)
      : null;
    const logoClean = typeof logo_url === "string" && logo_url.trim() ? logo_url.trim().slice(0, 2000) : null;
    const hasSalesTeamClean: boolean | null = typeof has_sales_team === "boolean" ? has_sales_team : null;
    const ALLOWED_TEAM_SIZES = new Set(["1-2", "3-5", "6-10", "10+"]);
    const salesTeamSizeClean: string | null =
      typeof sales_team_size === "string" && ALLOWED_TEAM_SIZES.has(sales_team_size) ? sales_team_size : null;


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Find the originating calendar by booking slug first, then UUID fallback.
    const lookupValue = String(booking_slug).trim();
    const slugColumn = isPayment ? "payment_booking_slug" : isClosing ? "closing_booking_slug" : "booking_slug";
    const activeColumn = isPayment ? "payment_booking_active" : isClosing ? "closing_booking_active" : "booking_active";
    const { data: slugCal, error: slugErr } = await supabase
      .from("bdr_calendars")
      .select(`id, user_id, client_id, name, booking_active, closing_booking_active, payment_booking_active, round_robin_pool, min_notice_minutes`)
      .eq(slugColumn, lookupValue)
      .maybeSingle();
    let originCal = slugCal;
    let calErr = slugErr;
    if (!originCal && uuidRegex.test(lookupValue)) {
      const { data: idCal, error: idErr } = await supabase
        .from("bdr_calendars")
        .select("id, user_id, client_id, name, booking_active, closing_booking_active, payment_booking_active, round_robin_pool, min_notice_minutes")
        .eq("id", lookupValue)
        .maybeSingle();
      originCal = idCal;
      calErr = idErr || calErr;
    }
    if (calErr || !originCal) {
      return new Response(JSON.stringify({ error: "Booking link not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((originCal as any)[activeColumn] === false) {
      return new Response(JSON.stringify({ error: "Bookings are paused" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Round-robin assignment (even rotation = least-recently-assigned) — scoped to the same client tenant
    let assignedCal: { id: string; user_id: string; client_id: string; name: string } = originCal as any;
    let roundRobin = false;
    if (originCal.round_robin_pool) {
      const { data: pool } = await supabase
        .from("bdr_calendars")
        .select("id, user_id, client_id, name, last_assigned_at")
        .eq("round_robin_pool", true)
        .eq("booking_active", true)
        .eq("client_id", originCal.client_id)
        .order("last_assigned_at", { ascending: true, nullsFirst: true })
        .limit(1);
      if (pool && pool.length) {
        assignedCal = pool[0] as any;
        roundRobin = true;
      }
    }

    const start = new Date(starts_at);
    const end = new Date(start.getTime() + (Number(duration_minutes) || 30) * 60_000);

    // Enforce per-calendar minimum notice server-side (defense in depth; the
    // DB trigger also enforces this on insert).
    const minNoticeMinutes = Number((originCal as any).min_notice_minutes ?? 60);
    if (Number.isFinite(minNoticeMinutes) && minNoticeMinutes > 0) {
      const cutoff = new Date(Date.now() + minNoticeMinutes * 60_000);
      if (start < cutoff) {
        return new Response(
          JSON.stringify({ error: `Bookings must be at least ${minNoticeMinutes} minutes from now.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 3. Resolve lead — dedupe by email/phone within this BDR's leads first.
    //    Applies to ALL meeting kinds (discovery/closing/payment): re-collecting
    //    contact info on a follow-up booking must not create a fresh row.
    const noteParts: string[] = [];
    if (roundRobin && assignedCal.user_id !== originCal.user_id) {
      noteParts.push(`Round-robin from ${originCal.name}`);
    }
    if (notes) noteParts.push(notes);

    const emailNorm = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    const phoneDigits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
    const phoneNorm = phoneDigits.length === 11 && phoneDigits.startsWith("1")
      ? phoneDigits.slice(1)
      : phoneDigits.length >= 10 ? phoneDigits.slice(-10) : null;

    let existingLead: any = null;
    if (emailNorm || phoneNorm) {
      const orClauses: string[] = [];
      if (emailNorm) orClauses.push(`email.ilike.${emailNorm}`);
      if (phoneNorm) orClauses.push(`phone_normalized.eq.${phoneNorm}`);
      const { data: matches } = await supabase
        .from("nl_bdr_leads")
        .select("id, business_name, owner_name, phone, email")
        .eq("user_id", assignedCal.user_id)
        .or(orClauses.join(","))
        .order("created_at", { ascending: true })
        .limit(1);
      if (matches && matches.length) existingLead = matches[0];
    }

    let lead: { id: string };
    if (existingLead) {
      const patch: Record<string, any> = {};
      if (!existingLead.business_name && (business_name || customer_name)) patch.business_name = business_name || customer_name;
      if (!existingLead.owner_name && customer_name) patch.owner_name = customer_name;
      if (!existingLead.phone && phone) patch.phone = phone;
      if (!existingLead.email && email) patch.email = email;
      if (Object.keys(patch).length) {
        await supabase.from("nl_bdr_leads").update(patch).eq("id", existingLead.id);
      }
      lead = { id: existingLead.id };
      console.log(`[bdr-book] reused existing lead ${lead.id} for kind=${isPayment ? "payment" : isClosing ? "closing" : "discovery"}`);
    } else {
      const { data: newLead, error: leadErr } = await supabase
        .from("nl_bdr_leads")
        .insert({
          user_id: assignedCal.user_id,
          client_id: assignedCal.client_id,
          business_name: business_name || customer_name,
          owner_name: customer_name,
          phone: phone || null,
          email: email || null,
          lead_source: "booking_form",
          status: "follow_up",
          pipeline_stage: "hot",
          notes: noteParts.join("\n") || null,
          list_name: "Booking Form",
          modules_of_interest: modulesClean,
          logo_url: logoClean,
          has_sales_team: hasSalesTeamClean,
          sales_team_size: salesTeamSizeClean,
        })
        .select("id")
        .single();
      if (leadErr) throw leadErr;
      lead = newLead;
    }


    // 4. Create event on assigned BDR's calendar
    const { data: evt, error: evtErr } = await supabase
      .from("bdr_calendar_events")
      .insert({
        user_id: assignedCal.user_id,
        client_id: assignedCal.client_id,
        calendar_id: assignedCal.id,
        title: `${isPayment ? "Onboarding & Payment" : isClosing ? "Closing" : "Booking"}: ${customer_name}${business_name ? " — " + business_name : ""}`,
        description: notes || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        lead_id: lead.id,
        stage: isPayment ? "payment" : isClosing ? "closing" : "hot",
        source: isPayment ? "payment_booking" : isClosing ? "closing_booking" : (roundRobin ? "round_robin" : "booking_form"),
        notes: notes || null,
        metadata: {
          customer_name,
          business_name,
          phone,
          email,
          round_robin: roundRobin,
          origin_calendar_id: originCal.id,
          meeting_kind: isPayment ? "payment" : isClosing ? "closing" : "discovery",
        },
      })
      .select("id")
      .single();
    if (evtErr) throw evtErr;

    // 5. Stamp last_assigned_at for fair rotation
    if (roundRobin) {
      await supabase
        .from("bdr_calendars")
        .update({ last_assigned_at: new Date().toISOString() })
        .eq("id", assignedCal.id);
    }

    // 6. Fire-and-forget notifications (owner + universal). Never blocks response.
    const notifyTask = sendBookingNotifications(supabase, {
      ownerUserId: assignedCal.user_id,
      customerName: customer_name,
      businessName: business_name || null,
      startsAt: start.toISOString(),
    }).catch((e) => console.error("[bdr-book notifications] uncaught:", e));
    // deno-lint-ignore no-explicit-any
    const waitUntil = (globalThis as any)?.EdgeRuntime?.waitUntil?.bind((globalThis as any).EdgeRuntime);
    if (typeof waitUntil === "function") waitUntil(notifyTask); else void notifyTask;

    return new Response(JSON.stringify({
      ok: true,
      event_id: evt.id,
      lead_id: lead.id,
      assigned_to: assignedCal.user_id,
      assigned_calendar: assignedCal.name,
      round_robin: roundRobin,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[bdr-book] failed:", (e as Error).stack || e);
    return new Response(
      JSON.stringify({ error: (e as Error).message, stack: (e as Error).stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ---------------------------------------------------------------------------
// Booking notifications — isolated block. Safe to remove without touching the
// booking creation logic above. Mirrors Twilio + Resend patterns from
// supabase/functions/booking-confirmation-sms/index.ts.
// ---------------------------------------------------------------------------
const UNIVERSAL_SMS_TO = "+18053408945";
const UNIVERSAL_EMAIL_TO = "team@newlightgen.com";
const TWILIO_FROM = "+18058940908";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[SMS QUEUED] to=${to} body="${body.substring(0, 100)}"`);
    return false;
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
      console.error("Twilio error:", res.status, await res.text().catch(() => ""));
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
    console.log(`[EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "NewLight <noreply@newlightgen.com>",
        to: [to], subject, text, html,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Email send error:", e);
    return false;
  }
}

// deno-lint-ignore no-explicit-any
async function sendBookingNotifications(supabase: any, args: {
  ownerUserId: string;
  customerName: string;
  businessName: string | null;
  startsAt: string;
}): Promise<void> {
  const { ownerUserId, customerName, businessName, startsAt } = args;
  const when = formatWhen(startsAt);
  const who = businessName ? `${customerName} (${businessName})` : customerName;

  // Resolve calendar owner contact info
  let ownerEmail = "";
  let ownerPhone = "";
  let ownerName = "";
  try {
    const { data: userResp } = await supabase.auth.admin.getUserById(ownerUserId);
    const u = userResp?.user;
    if (u) {
      ownerEmail = (u.email || "").toLowerCase();
      ownerPhone = u.phone || (u.user_metadata as any)?.phone || "";
      ownerName =
        (u.user_metadata as any)?.display_name ||
        (u.user_metadata as any)?.full_name ||
        (u.user_metadata as any)?.name ||
        u.email || "";
    }
    if (!ownerName) {
      const { data: emp } = await supabase
        .from("employee_profiles").select("full_name").eq("user_id", ownerUserId).maybeSingle();
      if (emp?.full_name) ownerName = emp.full_name;
    }
  } catch (e) {
    console.error("[bdr-book notifications] owner lookup failed:", e);
  }

  // NOTE: BDR-facing SMS and email were removed from this path. The
  // booking-confirmation-sms database webhook is now the single source of
  // client + BDR notifications (it also includes the Zoom join link).
  // This function only fires the universal ops notification below.


  // 2) Universal notifications for every booking
  const bdrLabel = ownerName || "Unknown BDR";
  await sendSms(UNIVERSAL_SMS_TO, `NewLight booking: ${who} booked ${bdrLabel} for ${when}.`);

  // Skip universal email if owner already IS team@newlightgen.com (already emailed above)
  if (ownerEmail !== UNIVERSAL_EMAIL_TO) {
    const subj = `NewLight Booking: ${who} → ${bdrLabel} at ${when}`;
    const text = `New booking confirmed.\n\nBDR: ${bdrLabel}\nClient: ${who}\nWhen: ${when}\n`;
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">New NewLight booking</h1>
    <table style="width:100%;font-size:14px;line-height:1.6;border-collapse:collapse;margin:0 0 20px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:110px;">BDR</td><td style="padding:6px 0;"><strong>${bdrLabel}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;"><strong>${who}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">When</td><td style="padding:6px 0;"><strong>${when}</strong></td></tr>
    </table>
  </div>
</body></html>`;
    await sendEmail(UNIVERSAL_EMAIL_TO, subj, html, text);
  }
}
