import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Message templates
const templates = {
  booking_confirmation: (p: any) =>
    `Hi ${p.full_name}! Your strategy session with NewLight is confirmed for ${formatDate(p.meeting_date)}. We're now preparing your custom app demo, website demo, and growth analysis. You'll receive these before your meeting. Need to reschedule? ${p.cancel_link}`,

  asset_delivery: (p: any) =>
    `${p.full_name}, your custom growth materials for ${p.business_name} are ready!\n\n🚀 Demo App: ${p.demo_app_link}\n🌐 Demo Website: ${p.demo_website_link}\n📊 Growth Analysis: ${p.audit_link}\n\nYour meeting is ${formatDate(p.meeting_date)}. Need to change? ${p.cancel_link}`,

  reminder_24h: (p: any) =>
    `Reminder: Your strategy session for ${p.business_name} is tomorrow at ${formatTime(p.meeting_date)}.\n\n${p.has_assets ? `📱 Demo App: ${p.demo_app_link}\n🌐 Website: ${p.demo_website_link}\n📊 Analysis: ${p.audit_link}\n\n` : "We're finalizing your custom materials. "}Need to reschedule? ${p.cancel_link}`,

  reminder_3h: (p: any) =>
    `${p.full_name}, your strategy session is in 3 hours at ${formatTime(p.meeting_date)}.\n\n${p.has_assets ? `Review your materials:\n📱 ${p.demo_app_link}\n🌐 ${p.demo_website_link}\n📊 ${p.audit_link}\n\n` : ""}Can't make it? ${p.cancel_link}`,

  reminder_30m: (p: any) =>
    `Starting in 30 minutes! Your strategy session for ${p.business_name} at ${formatTime(p.meeting_date)}.\n\n${p.has_assets ? `📱 ${p.demo_app_link}\n🌐 ${p.demo_website_link}\n` : ""}See you soon! Need to cancel? ${p.cancel_link}`,

  cancellation_confirmation: (p: any) =>
    `Your meeting for ${p.business_name} has been cancelled. Reason: ${p.cancellation_reason || "Not specified"}. To rebook, visit our website or reply to this message.`,

  reschedule_confirmation: (p: any) =>
    `Your meeting for ${p.business_name} has been rescheduled. We'll confirm your new time shortly.`,

  internal_notification: (p: any, event: string) =>
    `[NewLight Internal] ${event} — ${p.business_name} (${p.full_name}). Meeting: ${p.meeting_date ? formatDate(p.meeting_date) : "TBD"}. ${p.cancellation_reason ? `Reason: ${p.cancellation_reason}` : ""}`,
};

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "process_queue";

    if (action === "queue_booking_confirmation") {
      return await queueBookingConfirmation(supabase, body, supabaseUrl);
    }

    if (action === "check_asset_delivery") {
      return await checkAssetDelivery(supabase, supabaseUrl);
    }

    if (action === "process_queue") {
      return await processReminderQueue(supabase, supabaseUrl);
    }

    if (action === "cancel_meeting") {
      return await handleCancellation(supabase, body);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function queueBookingConfirmation(supabase: any, body: any, supabaseUrl: string) {
  const { prospect_id, meeting_date } = body;
  if (!prospect_id) throw new Error("prospect_id required");

  const { data: prospect } = await supabase
    .from("prospects").select("*").eq("id", prospect_id).single();
  if (!prospect) throw new Error("Prospect not found");

  // Generate cancellation token
  const cancellationToken = crypto.randomUUID();
  const baseUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
  const cancelLink = `${baseUrl}/meeting/cancel/${cancellationToken}`;

  // Create meeting status record
  await supabase.from("meeting_status").insert({
    prospect_id,
    meeting_date: meeting_date || prospect.meeting_date,
    status: "booked",
    cancellation_token: cancellationToken,
    assigned_salesman: prospect.assigned_to,
  });

  const msgData = { ...prospect, cancel_link: cancelLink, meeting_date: meeting_date || prospect.meeting_date };

  // Queue SMS confirmation
  const smsBody = templates.booking_confirmation(msgData);
  await queueReminder(supabase, prospect_id, "booking_confirmation", "sms", smsBody, new Date().toISOString());

  // Queue email confirmation
  await queueReminder(supabase, prospect_id, "booking_confirmation", "email", smsBody, new Date().toISOString());

  // Queue internal notification
  const internalMsg = templates.internal_notification(msgData, "Meeting Booked");
  await queueReminder(supabase, prospect_id, "booking_confirmation", "internal", internalMsg, new Date().toISOString());

  // Schedule future reminders
  const mtgDate = new Date(meeting_date || prospect.meeting_date);
  const now = new Date();

  const hoursUntil = (mtgDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil > 24) {
    const r24 = new Date(mtgDate.getTime() - 24 * 60 * 60 * 1000);
    await queueReminder(supabase, prospect_id, "reminder_24h", "sms", null, r24.toISOString());
    await queueReminder(supabase, prospect_id, "reminder_24h", "email", null, r24.toISOString());
  }

  if (hoursUntil > 3) {
    const r3 = new Date(mtgDate.getTime() - 3 * 60 * 60 * 1000);
    await queueReminder(supabase, prospect_id, "reminder_3h", "sms", null, r3.toISOString());
    await queueReminder(supabase, prospect_id, "reminder_3h", "email", null, r3.toISOString());
  }

  const r30 = new Date(mtgDate.getTime() - 30 * 60 * 1000);
  await queueReminder(supabase, prospect_id, "reminder_30m", "sms", null, r30.toISOString());
  await queueReminder(supabase, prospect_id, "reminder_30m", "email", null, r30.toISOString());

  // Update prospect stage
  await supabase.from("prospects").update({ stage: "booking_submitted", meeting_date: meeting_date || prospect.meeting_date }).eq("id", prospect_id);

  // Audit log
  await supabase.from("audit_logs").insert({
    action: "booking_confirmed",
    module: "meetings",
    metadata: { prospect_id, meeting_date, cancellation_token: cancellationToken },
  });

  return new Response(JSON.stringify({ success: true, cancellation_token: cancellationToken }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function checkAssetDelivery(supabase: any, supabaseUrl: string) {
  // Find meetings where all assets are ready but not yet delivered
  const { data: meetings } = await supabase
    .from("meeting_status")
    .select("*, prospects(*)")
    .eq("demo_app_ready", true)
    .eq("demo_website_ready", true)
    .eq("audit_ready", true)
    .eq("assets_sent", false)
    .neq("status", "cancelled");

  if (!meetings?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const baseUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
  let processed = 0;

  for (const meeting of meetings) {
    const prospect = meeting.prospects;
    if (!prospect) continue;

    const cancelLink = `${baseUrl}/meeting/cancel/${meeting.cancellation_token}`;
    const msgData = {
      ...prospect,
      demo_app_link: meeting.demo_app_link || `${baseUrl}/demo/${prospect.id}`,
      demo_website_link: meeting.demo_website_link || `${baseUrl}/demo-site/${prospect.id}`,
      audit_link: meeting.audit_link || `${baseUrl}/audit/${prospect.id}`,
      cancel_link: cancelLink,
      has_assets: true,
    };

    const smsBody = templates.asset_delivery(msgData);
    await queueReminder(supabase, prospect.id, "asset_delivery", "sms", smsBody, new Date().toISOString());
    await queueReminder(supabase, prospect.id, "asset_delivery", "email", smsBody, new Date().toISOString());

    const internalMsg = templates.internal_notification(msgData, "Demo Assets Ready & Delivered");
    await queueReminder(supabase, prospect.id, "asset_delivery", "internal", internalMsg, new Date().toISOString());

    await supabase.from("meeting_status").update({ assets_sent: true, status: "demo_ready" }).eq("id", meeting.id);
    processed++;
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function processReminderQueue(supabase: any, supabaseUrl: string) {
  const now = new Date().toISOString();

  // Get pending reminders that are due
  const { data: reminders } = await supabase
    .from("meeting_reminders")
    .select("*, prospects(*)")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (!reminders?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const baseUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
  let processed = 0;

  for (const reminder of reminders) {
    // Check if meeting is cancelled
    const { data: meetingStatus } = await supabase
      .from("meeting_status")
      .select("*")
      .eq("prospect_id", reminder.prospect_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (meetingStatus?.status === "cancelled") {
      await supabase.from("meeting_reminders").update({ status: "cancelled" }).eq("id", reminder.id);
      continue;
    }

    const prospect = reminder.prospects;
    if (!prospect) continue;

    // Build message content if not pre-built
    let messageContent = reminder.message_content;
    if (!messageContent && prospect) {
      const cancelLink = meetingStatus?.cancellation_token
        ? `${baseUrl}/meeting/cancel/${meetingStatus.cancellation_token}`
        : `${baseUrl}/meeting/cancel`;

      const msgData = {
        ...prospect,
        cancel_link: cancelLink,
        has_assets: meetingStatus?.assets_sent || false,
        demo_app_link: meetingStatus?.demo_app_link || "",
        demo_website_link: meetingStatus?.demo_website_link || "",
        audit_link: meetingStatus?.audit_link || "",
      };

      const templateFn = (templates as any)[reminder.reminder_type];
      if (templateFn) messageContent = templateFn(msgData);
    }

    // Attempt to send via configured channels
    let sendSuccess = false;
    try {
      if (reminder.channel === "sms" && prospect.phone) {
        sendSuccess = await sendSms(prospect.phone, messageContent || "");
      } else if (reminder.channel === "email" && prospect.email) {
        sendSuccess = await sendEmail(prospect.email, `NewLight - ${reminder.reminder_type.replace(/_/g, " ")}`, messageContent || "");
      } else if (reminder.channel === "internal") {
        sendSuccess = true; // Internal notifications are logged
      }
    } catch (e) {
      console.error(`Send failed for ${reminder.id}:`, e);
    }

    // Log the send attempt
    await supabase.from("message_send_log").insert({
      prospect_id: reminder.prospect_id,
      channel: reminder.channel,
      template_name: reminder.reminder_type,
      recipient: reminder.channel === "sms" ? (prospect.phone || "") : (prospect.email || ""),
      status: sendSuccess ? "sent" : "queued",
      message_body: messageContent,
      metadata: { reminder_id: reminder.id },
    });

    // Update reminder status
    await supabase.from("meeting_reminders").update({
      status: sendSuccess ? "sent" : "pending",
      sent_at: sendSuccess ? new Date().toISOString() : null,
      message_content: messageContent,
    }).eq("id", reminder.id);

    // Update meeting_status flags
    if (sendSuccess && meetingStatus) {
      const flagMap: Record<string, string> = {
        booking_confirmation: "confirmation_sent",
        reminder_24h: "reminder_24h_sent",
        reminder_3h: "reminder_3h_sent",
        reminder_30m: "reminder_30m_sent",
      };
      const flag = flagMap[reminder.reminder_type];
      if (flag) {
        await supabase.from("meeting_status").update({ [flag]: true }).eq("id", meetingStatus.id);
      }
    }

    processed++;
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCancellation(supabase: any, body: any) {
  const { cancellation_token, reason, reschedule, new_date } = body;
  if (!cancellation_token) throw new Error("cancellation_token required");

  const { data: meeting } = await supabase
    .from("meeting_status")
    .select("*, prospects(*)")
    .eq("cancellation_token", cancellation_token)
    .maybeSingle();

  if (!meeting) throw new Error("Meeting not found");
  if (meeting.status === "cancelled") throw new Error("Meeting already cancelled");

  const newStatus = reschedule ? "reschedule_requested" : "cancelled";

  await supabase.from("meeting_status").update({
    status: newStatus,
    cancellation_reason: reason || null,
    reschedule_requested: reschedule || false,
    new_requested_date: new_date || null,
  }).eq("id", meeting.id);

  // Cancel pending reminders
  if (!reschedule) {
    await supabase.from("meeting_reminders")
      .update({ status: "cancelled" })
      .eq("prospect_id", meeting.prospect_id)
      .eq("status", "pending");
  }

  // Update prospect status
  await supabase.from("prospects").update({
    stage: reschedule ? "booking_submitted" : "new_submission",
    status: reschedule ? "reschedule_requested" : "cancelled",
  }).eq("id", meeting.prospect_id);

  // Internal notification
  const prospect = meeting.prospects;
  if (prospect) {
    const eventName = reschedule ? "Reschedule Requested" : "Meeting Cancelled";
    const internalMsg = templates.internal_notification({ ...prospect, cancellation_reason: reason }, eventName);
    await queueReminder(supabase, meeting.prospect_id, reschedule ? "reschedule_confirmation" : "cancellation_confirmation", "internal", internalMsg, new Date().toISOString());

    // Send confirmation to prospect
    const confirmFn = reschedule ? templates.reschedule_confirmation : templates.cancellation_confirmation;
    const confirmMsg = confirmFn({ ...prospect, cancellation_reason: reason });
    await queueReminder(supabase, meeting.prospect_id, reschedule ? "reschedule_confirmation" : "cancellation_confirmation", "sms", confirmMsg, new Date().toISOString());
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    action: reschedule ? "meeting_reschedule_requested" : "meeting_cancelled",
    module: "meetings",
    metadata: { prospect_id: meeting.prospect_id, reason, new_date },
  });

  return new Response(JSON.stringify({ success: true, status: newStatus }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function queueReminder(supabase: any, prospectId: string, type: string, channel: string, content: string | null, scheduledAt: string) {
  await supabase.from("meeting_reminders").insert({
    prospect_id: prospectId,
    reminder_type: type,
    channel,
    status: "pending",
    scheduled_at: scheduledAt,
    message_content: content,
  });
}

async function sendSms(to: string, body: string): Promise<boolean> {
  // Check if Twilio is configured
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[SMS QUEUED] To: ${to} | Body: ${body.substring(0, 100)}...`);
    return false; // Will be retried when Twilio is configured
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
      body: new URLSearchParams({ To: to, From: Deno.env.get("TWILIO_FROM_NUMBER") || "+18058363557", Body: body }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Twilio error:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("SMS send error:", e);
    return false;
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  // Email sending - log for now, will integrate with email provider
  console.log(`[EMAIL QUEUED] To: ${to} | Subject: ${subject} | Body: ${body.substring(0, 100)}...`);
  return false; // Return false so it stays queued for retry when email is configured
}
