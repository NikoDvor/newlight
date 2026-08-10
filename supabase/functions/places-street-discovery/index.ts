import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Street-sweep business discovery via Google Places API (New) Text Search.
 * Runs several category-scoped queries for the same street and merges/dedupes
 * by place id to reduce the miss rate of a single broad query.
 * Field mask is intentionally limited to Pro-tier fields only (cost control).
 */

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.types";

const CATEGORY_PREFIXES = [
  "businesses on",
  "restaurants on",
  "retail stores on",
  "salons and spas on",
  "offices and services on",
  "bars and cafes on",
  "medical and professional services on",
];

interface PlaceRow {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  types: string[];
  primaryType: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return json({ error: "GOOGLE_PLACES_API_KEY is not configured." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const street = String(body?.street ?? "").trim();
    const city = String(body?.city ?? "").trim();
    const state = String(body?.state ?? "").trim();
    const clientId = body?.client_id ? String(body.client_id) : null;

    if (!street || !city || !state) {
      return json({ error: "street, city and state are all required." }, 400);
    }

    const suffix = `${street}, ${city}, ${state}`;
    const merged = new Map<string, PlaceRow>();
    const apiErrors: string[] = [];

    for (const prefix of CATEGORY_PREFIXES) {
      const textQuery = `${prefix} ${suffix}`;
      let res: Response;
      try {
        res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": FIELD_MASK,
          },
          body: JSON.stringify({ textQuery, maxResultCount: 20 }),
        });
      } catch (e) {
        apiErrors.push(`${textQuery}: network error — ${(e as Error).message}`);
        continue;
      }

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          payload?.error?.message ??
          payload?.error?.status ??
          `HTTP ${res.status}`;
        apiErrors.push(`${textQuery}: ${msg}`);
        continue;
      }

      for (const p of payload?.places ?? []) {
        if (!p?.id || merged.has(p.id)) continue;
        merged.set(p.id, {
          id: p.id,
          name: p.displayName?.text ?? "(unnamed)",
          address: p.formattedAddress ?? "",
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          types: Array.isArray(p.types) ? p.types : [],
          primaryType: Array.isArray(p.types) && p.types.length ? p.types[0] : null,
        });
      }
    }

    const results = [...merged.values()].sort((a, b) =>
      a.address.localeCompare(b.address, undefined, { numeric: true })
    );

    // Every query failed — surface the Google error instead of an empty list.
    if (results.length === 0 && apiErrors.length === CATEGORY_PREFIXES.length) {
      return json(
        {
          error: "Google Places API returned an error for every query.",
          details: apiErrors,
        },
        502
      );
    }

    // Cost / usage visibility
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await admin.from("audit_logs").insert({
        client_id: clientId,
        action: "places_street_discovery",
        module: "street_sweep",
        status: apiErrors.length ? "partial" : "success",
        metadata: {
          street,
          city,
          state,
          queries_run: CATEGORY_PREFIXES.length,
          business_count: results.length,
          api_errors: apiErrors,
        },
      });
    } catch (_) {
      // logging must never break discovery
    }

    return json({ results, count: results.length, warnings: apiErrors });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
