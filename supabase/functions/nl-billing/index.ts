// nl-billing — NewLight package billing runner + admin actions (Nov 2026).
//
// POST { action: "run" }                      daily cron (x-cron-secret) or admin: charges, retries, reminders, guarantee nudges
// POST { action: "wire_received", schedule_id, reference? }     admin
// POST { action: "confirm_made_back", deal_id }                 admin
// POST { action: "retry_now", schedule_id }                     admin
// POST { action: "waive", schedule_id }                         admin
// POST { action: "resume", deal_id }                            admin (manual un-pause)
// POST { action: "approve_price" | "reject_price", deal_id }    admin
// POST { action: "client_plan", client_id }                    client user with access to that workspace (or admin)
// POST { action: "client_add_revenue", client_id, new_client_label, client_started_on, month, revenue }   client user
// POST { action: "ping" }

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  chargeRow, confirmMadeBack, ensureCommission, ensureNextMonthly, madeBackSoFar, markRowPaid, maybeResume,
  notifyAll, once, pauseWork, setClientPaused, stripeClient, APP_BASE_URL, OPS_EMAIL, sendEmail, emailHtml, wireInstructions,
} from "../_shared/nlBilling.ts";
import { pacificDate, ymd, parseYmd, addDaysUTC, money } from "../_shared/packages.ts";

const VERSION = "2026-11-02-packages";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action || "run";
  if (action === "ping") return json({ ok: true, version: VERSION });

  // Client-facing reads/writes: any signed-in user who can see that workspace (checked with their own JWT + RLS).
  if (action === "client_plan" || action === "client_add_revenue") {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const userSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await userSb.auth.getUser(token);
    if (!u?.user || !body.client_id) return json({ error: "Unauthorized" }, 401);
    const { data: visible } = await userSb.from("clients").select("id").eq("id", body.client_id).maybeSingle();
    if (!visible) return json({ error: "No access" }, 403);
    try { return json(await clientAction(sb, action, body, u.user.id)); }
    catch (e) { console.error("[nl-billing client]", e); return json({ error: (e as Error).message }, 500); }
  }

  // Auth: cron secret for "run", otherwise an admin/operator JWT.
  // Cron: header matches the CRON_SECRET env var, or the NL_BILLING_CRON_SECRET stored in the database vault.
  const cronHeader = req.headers.get("x-cron-secret") || "";
  let cronOk = !!Deno.env.get("CRON_SECRET") && cronHeader === Deno.env.get("CRON_SECRET");
  if (!cronOk && cronHeader.length > 20) {
    const { data: ok } = await sb.rpc("nl_billing_cron_ok", { p: cronHeader });
    cronOk = ok === true;
  }
  let userId: string | null = null;
  if (!cronOk) {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(token);
    userId = u?.user?.id ?? null;
    if (!userId) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.schema("private").rpc("is_admin_or_operator", { _user_id: userId });
    if (!isAdmin) {
      const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
      if (!(roles || []).some((r: any) => r.role === "admin" || r.role === "operator")) return json({ error: "Admins only" }, 403);
    }
  }

  const getDeal = async (id: string) => (await sb.from("crm_deals").select("*").eq("id", id).maybeSingle()).data;
  const getRow = async (id: string) => (await sb.from("nl_billing_schedule").select("*").eq("id", id).maybeSingle()).data;

  try {
    if (action === "wire_received") {
      const row = await getRow(body.schedule_id);
      if (!row) return json({ error: "Charge not found" }, 404);
      if (row.status === "paid") return json({ ok: true, already: true });
      const deal = await getDeal(row.deal_id);
      await markRowPaid(sb, row, deal, { via: "wire", by: userId, reference: body.reference || null });
      await afterFirstPayment(sb, deal, row);
      return json({ ok: true });
    }
    if (action === "confirm_made_back") {
      const deal = await getDeal(body.deal_id);
      if (!deal) return json({ error: "Deal not found" }, 404);
      if (deal.package !== "growth") return json({ error: "Only Growth has a guarantee" }, 400);
      if (deal.billing_start_date) return json({ ok: true, already: true, billing_start_date: deal.billing_start_date });
      const start = await confirmMadeBack(sb, deal, userId);
      return json({ ok: true, billing_start_date: start });
    }
    if (action === "retry_now") {
      const row = await getRow(body.schedule_id);
      if (!row || row.method !== "stripe") return json({ error: "Only Stripe charges can be retried" }, 400);
      const stripe = await stripeClient();
      if (!stripe) return json({ error: "Stripe not configured" }, 503);
      await chargeRow(sb, stripe, row, await getDeal(row.deal_id));
      return json({ ok: true, row: await getRow(row.id) });
    }
    if (action === "waive") {
      await sb.from("nl_billing_schedule").update({ status: "waived", updated_at: new Date().toISOString() }).eq("id", body.schedule_id);
      const row = await getRow(body.schedule_id);
      if (row) await maybeResume(sb, await getDeal(row.deal_id));
      return json({ ok: true });
    }
    if (action === "resume") {
      await sb.from("crm_deals").update({ work_paused_at: null, work_paused_reason: null }).eq("id", body.deal_id);
      const d = await getDeal(body.deal_id);
      if (d) await setClientPaused(sb, d, null, null);
      return json({ ok: true });
    }
    if (action === "approve_price" || action === "reject_price") {
      const status = action === "approve_price" ? "approved" : "rejected";
      await sb.from("crm_deals").update({ price_approval_status: status, price_approved_by: userId, price_approved_at: new Date().toISOString() }).eq("id", body.deal_id);
      const deal = await getDeal(body.deal_id);
      if (deal?.assigned_user) {
        const { data: ep } = await sb.from("employee_profiles").select("email").eq("user_id", deal.assigned_user).maybeSingle();
        await sendEmail([ep?.email], `Price ${status} — ${deal.deal_name}`, emailHtml(`Your custom price was ${status}`, [
          status === "approved" ? "You can now send the Pay & Sign link." : "Update the price on Form 2 or talk to your team leader.",
        ]));
      }
      return json({ ok: true });
    }
    if (action === "run") return json(await runDaily(sb));
    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("[nl-billing]", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});

/** Called after any payment lands: first payment of a plan → CC/Enterprise monthly row, etc. */
async function afterFirstPayment(sb: any, deal: any, row: any) {
  const fresh = (await sb.from("crm_deals").select("*").eq("id", deal.id).maybeSingle()).data;
  if (["setup", "setup_installment_1"].includes(row.kind) && fresh.package !== "growth") await ensureNextMonthly(sb, fresh);
}

const DEAL_PUBLIC = "id, deal_name, package, billing_cadence, initial_fee, recurring_fee, pricing_model, commission_rate, commission_rate_ongoing, payment_plan, payment_plan_total, has_guarantee, guarantee_started_at, guarantee_ends_at, made_back_at, billing_start_date, annual_amount_first, annual_amount_renewal, annual_anchor_date, work_paused_at, work_paused_reason, recurring_method_saved_at, pay_sign_status, paid_signed_at";

async function clientAction(sb: any, action: string, body: any, userId: string) {
  const { data: deal } = await sb.from("crm_deals").select(DEAL_PUBLIC).eq("provisioned_client_id", body.client_id)
    .not("package", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!deal) return { plan: null };
  if (action === "client_add_revenue") {
    const revenue = Number(body.revenue);
    const label = String(body.new_client_label || "").trim().slice(0, 120);
    if (!label || !(revenue >= 0) || !body.client_started_on || !body.month) throw new Error("Client name, start date, month and revenue are required");
    const month = String(body.month).slice(0, 7) + "-01";
    await sb.from("nl_attributed_revenue").insert({
      deal_id: deal.id, client_id: body.client_id, new_client_label: label, client_started_on: String(body.client_started_on).slice(0, 10),
      month, revenue, source: "client_confirmed", entry_kind: "client_confirmed", entered_by: userId,
    });
    await sendEmail([OPS_EMAIL], `Revenue reported — ${deal.deal_name}`, emailHtml("Client reported revenue", [
      `${deal.deal_name} reported ${money(revenue)} from ${label} for ${month.slice(0, 7)}.`,
    ], `${APP_BASE_URL}/admin/client-records`, "Review in Client Records"));
    return { ok: true };
  }
  const [{ data: schedule }, { data: revenue }] = await Promise.all([
    sb.from("nl_billing_schedule").select("id, kind, method, amount, label, covers, due_date, status, paid_at, failure_reason").eq("deal_id", deal.id).neq("status", "cancelled").order("due_date"),
    sb.from("nl_attributed_revenue").select("id, new_client_label, client_started_on, month, revenue, entry_kind").eq("deal_id", deal.id).order("month", { ascending: false }),
  ]);
  const wireDue = (schedule || []).some((r: any) => r.method === "wire" && r.status === "scheduled");
  return {
    plan: deal, schedule: schedule || [], revenue: revenue || [],
    made_back: await madeBackSoFar(sb, deal.id),
    wire: wireDue ? await wireInstructions(sb) : null,
    wire_reference: `NL-${String(deal.id).slice(0, 8).toUpperCase()}`,
  };
}

async function runDaily(sb: any) {
  const today = pacificDate();
  const todayS = ymd(today);
  const out = { charged: 0, retried: 0, wire_reminders: 0, late_wires: 0, guarantee: 0, commission: 0, monthly_rows: 0 };
  const stripe = await stripeClient();

  const { data: deals } = await sb.from("crm_deals").select("*").not("package", "is", null).not("paid_signed_at", "is", null);

  for (const deal of deals || []) {
    // 0. Rows created before the workspace existed get its id (so the client can see them).
    if (deal.provisioned_client_id) {
      await sb.from("nl_billing_schedule").update({ client_id: deal.provisioned_client_id }).eq("deal_id", deal.id).is("client_id", null);
      await sb.from("nl_attributed_revenue").update({ client_id: deal.provisioned_client_id }).eq("deal_id", deal.id).is("client_id", null);
    }
    // 1. Keep the next monthly row / commission row in place.
    try { await ensureNextMonthly(sb, deal); out.monthly_rows++; } catch (e) { console.error("ensureNextMonthly", deal.id, e); }
    try { await ensureCommission(sb, deal, today); out.commission++; } catch (e) { console.error("ensureCommission", deal.id, e); }

    // 2. Growth guarantee: reminders + "made it back" suggestion.
    if (deal.package === "growth" && deal.guarantee_started_at && !deal.billing_start_date && deal.billing_cadence !== "annual") {
      const day = Math.floor((Date.now() - new Date(deal.guarantee_started_at).getTime()) / 86400_000);
      const made = await madeBackSoFar(sb, deal.id);
      const goal = Number(deal.initial_fee || 0);
      const pct = goal ? Math.round((made / goal) * 100) : 0;
      const recordsUrl = `${APP_BASE_URL}/admin/client-records`;
      if (goal > 0 && made >= goal && await once(sb, `madeback-suggest:${deal.id}`, "made_back_suggest", deal.id)) {
        await sendEmail([OPS_EMAIL], `Made it back — confirm billing for ${deal.deal_name}`, emailHtml(`${deal.deal_name} has made it back`, [
          `${money(made)} of ${money(goal)} recorded. Confirm and ongoing billing starts on the next 1st after day 90.`,
        ], recordsUrl, "Confirm in Client Records"));
        out.guarantee++;
      }
      const checkpoints = [30, 60, 85, 90];
      for (const cp of checkpoints) {
        if (day >= cp && day < cp + 7 && await once(sb, `guarantee:${deal.id}:${cp}`, "guarantee_reminder", deal.id, null, { day, made, pct })) {
          await notifyAll(sb, deal, `Guarantee check — day ${cp} of 90`, [
            `${deal.deal_name}: ${money(made)} of ${money(goal)} made back (${pct}%).`,
            cp === 85 ? `5 days left — ${money(Math.max(0, goal - made))} to go.` : cp === 90 ? (made >= goal ? "Made it back — confirm to start billing." : "Not made back yet — we keep working free until it is.") : (pct < (cp / 90) * 100 ? "Behind pace." : "On pace."),
          ], `${deal.deal_name} day ${cp}/90: ${pct}% made back.`, { clientToo: false, ctaUrl: recordsUrl, ctaLabel: "Open Client Records" });
          out.guarantee++;
        }
      }
      if (day > 90) {
        const week = Math.floor((day - 90) / 7);
        if (week >= 1 && await once(sb, `guarantee:${deal.id}:week${week}`, "guarantee_reminder", deal.id)) {
          await notifyAll(sb, deal, `Working free — week ${week} past day 90`, [`${deal.deal_name}: ${money(made)} of ${money(goal)} made back (${pct}%).`], `${deal.deal_name}: working free, ${pct}% made back.`, { clientToo: false });
        }
      }
    }
  }

  // 3. Charge due Stripe rows.
  const { data: due } = await sb.from("nl_billing_schedule").select("*").eq("method", "stripe").eq("status", "scheduled").lte("due_date", todayS).gt("amount", 0);
  for (const row of due || []) {
    const deal = (deals || []).find((d: any) => d.id === row.deal_id) || (await sb.from("crm_deals").select("*").eq("id", row.deal_id).maybeSingle()).data;
    if (!stripe) break;
    if (!deal || !["paid", "paid_signed"].includes(deal.pay_sign_status)) continue; // nothing ongoing until the first payment lands
    await chargeRow(sb, stripe, row, deal); out.charged++;
  }

  // 4. Retries (day 1, day 3).
  const { data: retry } = await sb.from("nl_billing_schedule").select("*").eq("method", "stripe").eq("status", "failed").not("next_retry_at", "is", null).lte("next_retry_at", new Date().toISOString());
  for (const row of retry || []) {
    if (!stripe) break;
    const deal = (await sb.from("crm_deals").select("*").eq("id", row.deal_id).maybeSingle()).data;
    await chargeRow(sb, stripe, row, deal); out.retried++;
  }

  // 5. Wires: reminders 30 / 7 / 1 days before, alerts day 0 / 1 / 3 after, then pause.
  const { data: wires } = await sb.from("nl_billing_schedule").select("*").eq("method", "wire").eq("status", "scheduled");
  for (const row of wires || []) {
    const deal = (await sb.from("crm_deals").select("*").eq("id", row.deal_id).maybeSingle()).data;
    if (!deal?.paid_signed_at && row.kind !== "annual_renewal") continue; // signing-time wires are handled on Pay & Sign
    const dueD = parseYmd(row.due_date);
    const daysTo = Math.round((dueD.getTime() - today.getTime()) / 86400_000);
    const billUrl = `${APP_BASE_URL}/billing`;
    for (const d of [30, 7, 1]) {
      if (daysTo === d && await once(sb, `wire-remind:${row.id}:${d}`, "wire_reminder", deal.id, row.id)) {
        await notifyAll(sb, deal, `Wire due in ${d} day${d === 1 ? "" : "s"} — ${money(row.amount, true)}`, [
          `${row.label}: ${money(row.amount, true)} is due ${row.due_date} by bank wire.`,
          "Wire instructions are on your billing page in the app. Use the reference shown there.",
        ], `wire of ${money(row.amount)} due in ${d} day(s). Instructions in your billing page.`, { ctaUrl: billUrl, ctaLabel: "See wire instructions" });
        out.wire_reminders++;
      }
    }
    if (daysTo <= 0) {
      const late = -daysTo;
      for (const d of [0, 1, 3]) {
        if (late >= d && await once(sb, `wire-late:${row.id}:${d}`, "wire_late", deal.id, row.id)) {
          if (d === 3) { await pauseWork(sb, deal, `Wire of ${money(row.amount, true)} is 3 days late`); }
          else {
            await notifyAll(sb, deal, `Wire not received — ${money(row.amount, true)}`, [
              `${row.label} (${money(row.amount, true)}) was due ${row.due_date} and hasn't arrived.`,
              "If it isn't received within 3 days of the due date, work will pause.",
            ], `wire of ${money(row.amount)} not received. Work pauses after 3 days.`, { ctaUrl: billUrl, ctaLabel: "See wire instructions" });
          }
          out.late_wires++;
        }
      }
    }
  }
  return { ok: true, version: VERSION, date: todayS, ...out };
}
