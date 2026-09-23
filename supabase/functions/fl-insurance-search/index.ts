// Florida DFS business insurance licenses.
// Florida publishes no API — only a static bulk CSV — so this queries the
// locally imported snapshot in public.fl_insurance_licensees and reports when
// that snapshot was last refreshed, so staleness is always visible.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const cityRaw = typeof body.city === "string" ? body.city.trim() : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const maxResults = Math.max(1, Math.min(300, Number(body.max_results) || 50));

    const cities = cityRaw.split(",").map((c) => c.trim()).filter(Boolean);

    // City and keyword are optional narrowing filters — with neither provided
    // this becomes a full-state walk (every row here is Florida by definition),
    // mirroring how the SEC search behaves with no city.


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Paged walk (same pattern as the TX search): the snapshot has ~105k rows,
    // so a single capped query would only ever return the alphabetically-first
    // slice. Walk pages until the caller's Max Results is satisfied, the data
    // runs out, or the time budget hits — one row per license type, collapsed
    // to one entry per licensed business.
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 60; // 60k-row safety cap per request
    const TIME_BUDGET_MS = 45_000;
    const started = Date.now();

    const byLicense = new Map<string, any>();
    const perCity: Record<string, number> = {};
    let rawRows = 0;
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      if (byLicense.size >= maxResults || Date.now() - started >= TIME_BUDGET_MS) break;

      let q = supabase
        .from("fl_insurance_licensees")
        .select("license_number, license_tycl, business_name, license_type, license_status, city, state, zip, address1, address2, county, phone, email, imported_at")
        .eq("license_status", "VALID")
        .order("business_name", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (cities.length) q = q.in("city", cities.map((c) => c.toUpperCase()));
      if (keyword) q = q.ilike("business_name", `%${keyword}%`);

      const { data, error } = await q;
      if (error) return json({ error: `Florida lookup failed: ${error.message}` }, 500);
      if (!data?.length) break;
      rawRows += data.length;

      for (const r of data) {
        const key = r.license_number;
        const existing = byLicense.get(key);
        if (existing) {
          if (r.license_type && !existing.license_type?.includes(r.license_type)) {
            existing.license_type = `${existing.license_type}, ${r.license_type}`;
          }
          continue;
        }
        if (r.city) perCity[r.city] = (perCity[r.city] ?? 0) + 1;
        byLicense.set(key, {
          business_name: r.business_name,
          city: r.city,
          state: r.state ?? "FL",
          address: [r.address1, r.address2].filter(Boolean).join(", ") || null,
          license_type: r.license_type,
          license_number: r.license_number,
          county: r.county,
          phone: r.phone,
          email: r.email,
          source: "FL_DFS",
        });
      }

      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const results = Array.from(byLicense.values()).slice(0, maxResults);


    const { data: freshness } = await supabase
      .from("fl_insurance_licensees")
      .select("imported_at")
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastImport = freshness?.imported_at ?? null;
    const ageDays = lastImport
      ? Math.floor((Date.now() - new Date(lastImport).getTime()) / 86_400_000)
      : null;

    return json({
      results,
      total: byLicense.size,
      returned: results.length,
      raw_rows_walked: rawRows,

      cities_searched: cities,
      per_city_total: perCity,
      source: "FL DFS",
      data_last_imported_at: lastImport,
      data_age_days: ageDays,
      note: lastImport
        ? `Florida DFS "All Valid Licenses - Business" snapshot, last imported ${new Date(lastImport).toLocaleDateString("en-US")}${ageDays != null && ageDays > 30 ? ` (${ageDays} days old — refresh recommended)` : ""}. Florida publishes no live API.`
        : "No Florida snapshot has been imported yet — run the Florida import first.",
    });
  } catch (err) {
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});
