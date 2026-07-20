import { supabase } from "@/integrations/supabase/client";

/** Daily dial expectation for BDRs/Salesmen — matches Role training module. */
export const DAILY_DIAL_GOAL = 200;

/** Start of the current calendar week (Sunday 00:00 local), matching CallTracking.tsx. */
export function startOfCurrentWeek(): Date {
  const now = new Date();
  const s = new Date(now);
  s.setDate(now.getDate() - now.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

/** Start of the current calendar month (day 1, 00:00 local). */
export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Start of today (00:00 local). */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export interface BdrCalendar {
  id: string;
  user_id: string;
  name: string;
  availability: Record<string, { enabled: boolean; start: string; end: string }>;
  booking_slug: string | null;
  timezone: string;
  booking_title: string | null;
  booking_description: string | null;
  booking_active: boolean;
  closing_booking_slug?: string | null;
  closing_booking_title?: string | null;
  closing_booking_description?: string | null;
  closing_booking_active?: boolean;
  closing_booking_form_id?: string | null;
  payment_booking_slug?: string | null;
  payment_booking_title?: string | null;
  payment_booking_description?: string | null;
  payment_booking_active?: boolean;
  payment_booking_form_id?: string | null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "bdr";
}

const NEWLIGHT_INTERNAL_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";

async function resolveEmployeeClientId(userId: string): Promise<string> {
  const { data: emp } = await (supabase as any)
    .from("employee_profiles").select("client_id").eq("user_id", userId).maybeSingle();
  if (emp?.client_id) return emp.client_id as string;
  const { data: ws } = await (supabase as any)
    .from("workspace_users").select("client_id").eq("user_id", userId)
    .eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle();
  return (ws?.client_id as string) || NEWLIGHT_INTERNAL_CLIENT_ID;
}

/** Ensure the current user has a personal BDR calendar. Returns it. */
export async function ensureBdrCalendar(opts?: { firstName?: string | null; fullName?: string | null }): Promise<BdrCalendar | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await (supabase as any)
    .from("bdr_calendars")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) {
    // Backfill closing slug for pre-feature calendars so the Meeting 2 link always resolves.
    if (!(existing as any).closing_booking_slug && (existing as any).booking_slug) {
      const closingSlug = `${(existing as any).booking_slug}-closing`;
      await (supabase as any)
        .from("bdr_calendars")
        .update({ closing_booking_slug: closingSlug })
        .eq("id", (existing as any).id);
      (existing as any).closing_booking_slug = closingSlug;
    }
    return existing as BdrCalendar;
  }

  const display = opts?.firstName
    || opts?.fullName?.split(" ")[0]
    || (user.user_metadata as any)?.first_name
    || (user.user_metadata as any)?.full_name?.split(" ")[0]
    || user.email?.split("@")[0]
    || "My";
  const baseSlug = slugify(`${display}-${user.id.slice(0, 6)}`);
  const clientId = await resolveEmployeeClientId(user.id);

  const { data: created, error } = await (supabase as any)
    .from("bdr_calendars")
    .insert({
      user_id: user.id,
      client_id: clientId,
      name: `${display}'s Pipeline Calendar`,
      booking_slug: baseSlug,
      closing_booking_slug: `${baseSlug}-closing`,
      payment_booking_slug: `${baseSlug}-payment`,
    })
    .select("*")
    .single();
  if (error) {
    const { data: again } = await (supabase as any)
      .from("bdr_calendars").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    return (again as BdrCalendar) || null;
  }
  // Ensure closing slug is filled in for calendars created before the closing feature.
  if (created && !(created as any).closing_booking_slug && (created as any).booking_slug) {
    const closingSlug = `${(created as any).booking_slug}-closing`;
    await (supabase as any)
      .from("bdr_calendars")
      .update({ closing_booking_slug: closingSlug })
      .eq("id", (created as any).id);
    (created as any).closing_booking_slug = closingSlug;
  }
  return created as BdrCalendar;
}

/** Log a calendar event when a lead interaction happens in the dialer. */
export async function logDialerEvent(params: {
  leadId: string;
  businessName: string;
  ownerName: string | null;
  outcome?: string | null;
  stage?: string | null;
  notes?: string | null;
}) {
  const cal = await ensureBdrCalendar();
  if (!cal) return;
  const now = new Date();
  const end = new Date(now.getTime() + 15 * 60_000);
  const ownerPart = params.ownerName ? ` (${params.ownerName})` : "";
  const outcomePart = params.outcome ? ` — ${params.outcome}` : " — Called";
  await (supabase as any).from("bdr_calendar_events").insert({
    user_id: cal.user_id,
    client_id: (cal as any).client_id,
    calendar_id: cal.id,
    title: `${params.businessName}${ownerPart}${outcomePart}`,
    description: params.notes || null,
    starts_at: now.toISOString(),
    ends_at: end.toISOString(),
    lead_id: params.leadId,
    outcome: params.outcome || null,
    stage: params.stage || null,
    source: "dialer",
    notes: params.notes || null,
  });
}
