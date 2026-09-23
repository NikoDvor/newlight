import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url : "https://licenseesearch.fldfs.com/BulkDownload";
  const grep = typeof body.grep === "string" ? body.grep : "href|action|Download|\\.zip|\\.csv|\\.txt|\\.exe";
  const out: Record<string, unknown> = { url };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    const resp = await fetch(url, {
      method: typeof body.method === "string" ? body.method : "GET",
      headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    out.status = resp.status;
    out.content_type = resp.headers.get("content-type");
    out.content_length = resp.headers.get("content-length");
    if (body.head_only) {
      await resp.body?.cancel();
      return json(out);
    }
    const limit = Number(body.byte_limit) || 0;
    let text = "";
    if (limit > 0 && resp.body) {
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      while (text.length < limit) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => {});
      out.truncated = true;
    } else {
      text = await resp.text();
    }
    out.length = text.length;
    const re = new RegExp(`.{0,120}(?:${grep}).{0,160}`, "gi");
    out.matches = Array.from(new Set(text.match(re) ?? [])).slice(0, 120);
    if (body.full_snippet) out.snippet = text.slice(0, 20000);
  } catch (e) {
    out.error = String(e);
  }
  return json(out);
});

function json(o: unknown) {
  return new Response(JSON.stringify(o), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
