import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * 5-method booking-system check, run against a lead's already-known website.
 * No new website lookup — we only inspect the site already on file.
 *
 * 1. url_path        — common booking paths / booking subdomains
 * 2. embed_script    — third-party booking widget or SDK references in source
 * 3. cta_text        — visible booking-intent CTA text
 * 4. structured_data — schema.org Reservation / ReserveAction, OG/meta hints
 * 5. footer_linkout  — footer/contact link-outs to a third-party booking domain
 */

const PLATFORMS: { name: string; patterns: RegExp[] }[] = [
  { name: "Calendly", patterns: [/calendly\.com/i] },
  { name: "Square Appointments", patterns: [/squareup\.com\/appointments/i, /square\.site\/book/i, /book\.squareup\.com/i] },
  { name: "Acuity", patterns: [/acuityscheduling\.com/i, /squarespacescheduling\.com/i] },
  { name: "GoHighLevel", patterns: [/msgsndr\.com/i, /leadconnectorhq\.com/i, /gohighlevel/i] },
  { name: "Vagaro", patterns: [/vagaro\.com/i] },
  { name: "Booksy", patterns: [/booksy\.com/i] },
  { name: "OpenTable", patterns: [/opentable\.com/i] },
  { name: "Resy", patterns: [/resy\.com/i] },
  { name: "SimplyBook", patterns: [/simplybook\.(me|it)/i] },
  { name: "Setmore", patterns: [/setmore\.com/i] },
  { name: "Fresha", patterns: [/fresha\.com/i] },
  { name: "Mindbody", patterns: [/mindbodyonline\.com/i, /mindbody\.io/i] },
  { name: "Tock", patterns: [/exploretock\.com/i] },
  { name: "Yelp Reservations", patterns: [/yelp\.com\/reservations/i] },
  { name: "Housecall Pro", patterns: [/housecallpro\.com/i] },
  { name: "Jobber", patterns: [/getjobber\.com/i] },
  { name: "Schedulicity", patterns: [/schedulicity\.com/i] },
  { name: "Zocdoc", patterns: [/zocdoc\.com/i] },
  { name: "Doctolib", patterns: [/doctolib\./i] },
  { name: "Booker", patterns: [/booker\.com/i] },
  { name: "Appointy", patterns: [/appointy\.com/i] },
  { name: "TimeTap", patterns: [/timetap\.com/i] },
  { name: "YouCanBookMe", patterns: [/youcanbook\.me/i] },
  { name: "HubSpot Meetings", patterns: [/meetings\.hubspot\.com/i] },
  { name: "Microsoft Bookings", patterns: [/outlook\.office365\.com\/owa\/calendar/i, /bookings\.ms/i] },
  { name: "Google Appointments", patterns: [/calendar\.app\.google/i, /calendar\.google\.com\/calendar\/appointments/i] },
];

const BOOKING_PATHS = ["/book", "/book-now", "/book-online", "/booking", "/bookings", "/schedule", "/scheduling", "/appointment", "/appointments", "/reservations", "/reserve", "/make-a-reservation"];

const CTA_RE = /(book\s+(now|online|an?\s+appointment|a\s+table|with\s+us|your\s+(visit|appointment)))|(schedule\s+(now|online|an?\s+(appointment|consultation|visit|call)))|(reserve\s+(a\s+)?(table|now|your\s+spot))|(make\s+an?\s+(reservation|appointment))|(request\s+an?\s+appointment)|(book\s+a\s+(demo|consultation))/i;

const STRUCTURED_RE = /(schema\.org\/?(Reservation|FoodEstablishmentReservation|LodgingReservation))|("@type"\s*:\s*"?(ReserveAction|Reservation|OrderAction|ScheduleAction)")|(potentialAction[\s\S]{0,200}?Reserve)/i;

function normalizeUrl(raw: string): URL | null {
  try {
    const s = raw.trim();
    return new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch { return null; }
}

async function fetchText(url: string, timeoutMs = 9000): Promise<{ ok: boolean; status: number; text: string; finalUrl: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewLightLeadBot/1.0)", "Accept": "text/html,*/*" },
    });
    const text = res.ok ? (await res.text()).slice(0, 900_000) : "";
    return { ok: res.ok, status: res.status, text, finalUrl: res.url || url };
  } catch {
    return { ok: false, status: 0, text: "", finalUrl: url };
  } finally {
    clearTimeout(t);
  }
}

function detectPlatform(haystack: string): string | null {
  for (const p of PLATFORMS) {
    if (p.patterns.some(rx => rx.test(haystack))) return p.name;
  }
  return null;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

export interface BookingCheckResult {
  has_booking_system: boolean | null;
  methods: string[];
  platform: string | null;
  reason: string;
}

export async function checkBookingSystem(website: string | null | undefined): Promise<BookingCheckResult> {
  const url = website ? normalizeUrl(website) : null;
  if (!url) {
    return { has_booking_system: null, methods: [], platform: null, reason: "No website on file — Unknown." };
  }

  const methods = new Set<string>();
  let platform: string | null = null;

  const home = await fetchText(url.toString());
  if (!home.ok || !home.text) {
    return { has_booking_system: null, methods: [], platform: null, reason: `Website unreachable (status ${home.status}) — Unknown.` };
  }

  const html = home.text;
  const visible = stripTags(html);
  const hrefs = Array.from(html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).map(m => m[1]);
  const srcs = Array.from(html.matchAll(/src\s*=\s*["']([^"']+)["']/gi)).map(m => m[1]);

  // ── Method 1: URL / path pattern check ────────────────────────────────
  const pathHit = hrefs.some(h => {
    const low = h.toLowerCase();
    return BOOKING_PATHS.some(p => low === p || low.startsWith(p + "/") || low.startsWith(p + "?") || low.includes(p + "/") || new RegExp(`(^|/)${p.slice(1)}(/|$|\\?)`).test(low));
  });
  const subdomainHit = /https?:\/\/(book|booking|schedule|reservations|appointments)\./i.test(html);
  if (pathHit || subdomainHit) methods.add("url_path");
  if (!pathHit && !subdomainHit) {
    // Probe a couple of canonical paths directly on the known domain.
    for (const p of ["/book", "/booking", "/schedule", "/appointments", "/reservations"]) {
      const probe = await fetchText(new URL(p, url.origin).toString(), 6000);
      if (probe.ok && probe.text.length > 500) { methods.add("url_path"); break; }
    }
  }

  // ── Method 2: embedded widget / SDK detection ─────────────────────────
  const scriptHay = [...srcs, ...Array.from(html.matchAll(/<script[\s\S]{0,4000}?<\/script>/gi)).map(m => m[0]), ...Array.from(html.matchAll(/<iframe[^>]*>/gi)).map(m => m[0])].join(" ");
  const embedPlatform = detectPlatform(scriptHay);
  if (embedPlatform) { methods.add("embed_script"); platform = embedPlatform; }

  // ── Method 3: visible CTA text ────────────────────────────────────────
  if (CTA_RE.test(visible)) methods.add("cta_text");

  // ── Method 4: structured data / meta ──────────────────────────────────
  if (STRUCTURED_RE.test(html)) methods.add("structured_data");

  // ── Method 5: footer / contact-page link-out ──────────────────────────
  const externalBooking = hrefs.filter(h => /^https?:\/\//i.test(h) && !h.includes(url.hostname));
  const linkoutPlatform = detectPlatform(externalBooking.join(" "));
  if (linkoutPlatform) { methods.add("footer_linkout"); platform = platform || linkoutPlatform; }

  if (methods.size === 0) {
    const contactHref = hrefs.find(h => /contact/i.test(h));
    if (contactHref) {
      const contactUrl = contactHref.startsWith("http") ? contactHref : new URL(contactHref, url.origin).toString();
      const contact = await fetchText(contactUrl, 7000);
      if (contact.ok && contact.text) {
        const cHrefs = Array.from(contact.text.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).map(m => m[1]);
        const cPlatform = detectPlatform(cHrefs.join(" ") + " " + contact.text.slice(0, 200_000));
        if (cPlatform) { methods.add("footer_linkout"); platform = platform || cPlatform; }
        else if (CTA_RE.test(stripTags(contact.text))) methods.add("cta_text");
      }
    }
  }

  if (!platform && methods.size > 0) {
    platform = detectPlatform(html) || (methods.has("url_path") ? "custom/native" : "unknown");
  }

  const has = methods.size > 0;
  return {
    has_booking_system: has,
    methods: Array.from(methods),
    platform,
    reason: has
      ? `Confirmed by ${methods.size} of 5 routes.`
      : "Site checked; none of the 5 routes found a booking mechanism.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawIds = Array.isArray(body?.lead_ids) ? body.lead_ids : (body?.lead_id ? [body.lead_id] : []);
    const leadIds: string[] = rawIds
      .filter((v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v))
      .slice(0, 100);
    if (leadIds.length === 0) {
      return new Response(JSON.stringify({ error: "lead_ids must contain 1-100 lead UUIDs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RLS on nl_bdr_leads keeps this scoped to leads the caller may touch.
    const { data: leads, error } = await supabase
      .from("nl_bdr_leads")
      .select("id, website")
      .in("id", leadIds);
    if (error) throw error;

    const results: Record<string, BookingCheckResult> = {};
    const CONCURRENCY = 4;
    const queue = [...(leads || [])];
    async function worker() {
      while (queue.length) {
        const lead = queue.shift();
        if (!lead) break;
        const res = await checkBookingSystem(lead.website);
        results[lead.id] = res;
        await supabase.from("nl_bdr_leads").update({
          has_booking_system: res.has_booking_system,
          booking_system_exists: res.has_booking_system,
          booking_system_methods: res.methods,
          booking_system_platform: res.platform,
          booking_system_checked_at: new Date().toISOString(),
        }).eq("id", lead.id);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    const summary = {
      checked: Object.keys(results).length,
      yes: Object.values(results).filter(r => r.has_booking_system === true).length,
      no: Object.values(results).filter(r => r.has_booking_system === false).length,
      unknown: Object.values(results).filter(r => r.has_booking_system === null).length,
    };

    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
