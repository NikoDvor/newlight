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
    if (!cities.length && !keyword) {
      return json({ error: "Provide at least a city or a keyword for the Florida insurance search." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let q = supabase
      .from("fl_insurance_licensees")
      .select("license_number, license_tycl, business_name, license_type, license_status, city, state, zip, address1, address2, county, phone, email, imported_at")
      .eq("license_status", "VALID")
      .order("business_name", { ascending: true })
      .limit(Math.min(1500, maxResults * 6));

    if (cities.length) q = q.in("city", cities.map((c) => c.toUpperCase()));
    if (keyword) q = q.ilike("business_name", `%${keyword}%`);

    const { data, error } = await q;
    if (error) return json({ error: `Florida lookup failed: ${error.message}` }, 500);

    // One row per license type — collapse to one row per licensed business.
    const byLicense = new Map<string, any>();
    const perCity: Record<string, number> = {};
    for (const r of data ?? []) {
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
