import { supabase } from "@/integrations/supabase/client";

export interface BdrCalendar {
  id: string;
  user_id: string;
  name: string;
  availability: Record<string, { enabled: boolean; start: string; end: string }>;
  booking_slug: string | null;
  timezone: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "bdr";
}

/** Ensure the current user has a personal BDR calendar. Returns it. */
export async function ensureBdrCalendar(opts?: { firstName?: string | null; fullName?: string | null }): Promise<BdrCalendar | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await (supabase as any)
    .from("bdr_calendars")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return existing as BdrCalendar;

  const display = opts?.firstName
    || opts?.fullName?.split(" ")[0]
    || (user.user_metadata as any)?.first_name
    || (user.user_metadata as any)?.full_name?.split(" ")[0]
    || user.email?.split("@")[0]
    || "My";
  const baseSlug = slugify(`${display}-${user.id.slice(0, 6)}`);

  const { data: created, error } = await (supabase as any)
    .from("bdr_calendars")
    .insert({
      user_id: user.id,
      name: `${display}'s Pipeline Calendar`,
      booking_slug: baseSlug,
    })
    .select("*")
    .single();
  if (error) {
    // Race: another tab created it
    const { data: again } = await (supabase as any)
      .from("bdr_calendars").select("*").eq("user_id", user.id).maybeSingle();
    return (again as BdrCalendar) || null;
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
