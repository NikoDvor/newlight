import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SiteData {
  site_name: string;
  tagline: string;
  primary_color: string;
  secondary_color: string;
  font_preset: string;
  button_style: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  social_facebook: string;
  social_instagram: string;
  social_linkedin: string;
  social_twitter: string;
  global_cta_text: string;
  global_cta_url: string;
}

interface PageData {
  page_name: string;
  slug: string;
  seo_title: string;
  seo_description: string;
}

interface SectionData {
  block_type: string;
  block_label: string;
  content_json: any;
  is_active: boolean;
  display_order: number;
  page_key: string;
}

export default function PublicSite() {
  const { clientSlug, pageSlug } = useParams();
  const [site, setSite] = useState<SiteData | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSite();
  }, [clientSlug, pageSlug]);

  const loadSite = async () => {
    setLoading(true);
    // Find client by workspace slug
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("workspace_slug", clientSlug)
      .maybeSingle();

    if (!client) { setError("Site not found"); setLoading(false); return; }

    // Load latest published snapshot
    const { data: snapshot } = await supabase
      .from("website_publish_snapshots")
      .select("snapshot_data")
      .eq("client_id", client.id)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!snapshot) {
      // Fallback: load live data
      const [siteRes, pagesRes, sectionsRes] = await Promise.all([
        supabase.from("website_sites").select("*").eq("client_id", client.id).maybeSingle(),
        supabase.from("website_pages").select("*").eq("client_id", client.id).order("sort_order"),
        supabase.from("website_content_blocks").select("*").eq("client_id", client.id).order("display_order"),
      ]);
      setSite(siteRes.data as any);
      setPages((pagesRes.data as any) || []);
      setSections((sectionsRes.data as any) || []);
    } else {
      const snap = snapshot.snapshot_data as any;
      setSite(snap.site);
      setPages(snap.pages || []);
      setSections(snap.sections || []);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Site Not Found</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  const currentSlug = pageSlug || "home";
  const currentSections = sections.filter(s => s.page_key === currentSlug && s.is_active).sort((a, b) => a.display_order - b.display_order);
  const primary = site?.primary_color || "#3B82F6";
  const btnRadius = site?.button_style === "pill" ? "9999px" : site?.button_style === "square" ? "4px" : "12px";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: getFontFamily(site?.font_preset) }}>
      {/* Head meta */}
      {(() => {
        const pg = pages.find((p: any) => (p.slug || "home") === currentSlug) as any;
        if (pg?.seo_title) document.title = pg.seo_title;
        return null;
      })()}

      {/* Navigation */}
      <nav className="border-b" style={{ borderColor: `${primary}15` }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-lg font-bold" style={{ color: primary }}>{site?.site_name || "Website"}</span>
          <div className="flex items-center gap-6">
            {pages.map((p: any) => (
              <a
                key={p.slug || p.page_name}
                href={`/site/${clientSlug}/${p.slug || p.page_name?.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: (p.slug || "home") === currentSlug ? primary : "#666", fontWeight: (p.slug || "home") === currentSlug ? 600 : 400 }}
              >
                {p.page_name}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto">
        {currentSections.length === 0 ? (
          <div className="py-24 text-center text-gray-400">
            <p>This page has no content yet.</p>
          </div>
        ) : (
          currentSections.map((section, i) => {
            const cj = typeof section.content_json === "string" ? JSON.parse(section.content_json) : (section.content_json || {});
            return (
              <div key={i} style={{ background: cj.bgStyle === "dark" ? "#111" : cj.bgStyle === "gradient" ? `linear-gradient(135deg, ${primary}11, ${primary}05)` : "transparent" }}>
                {renderPublicSection(section.block_type, cj, primary, btnRadius, cj.bgStyle === "dark")}
              </div>
            );
          })
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12" style={{ borderColor: `${primary}15` }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} {site?.site_name || "Business"}. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-3">
            {site?.social_facebook && <a href={site.social_facebook} className="text-xs text-gray-400 hover:text-gray-600">Facebook</a>}
            {site?.social_instagram && <a href={site.social_instagram} className="text-xs text-gray-400 hover:text-gray-600">Instagram</a>}
            {site?.social_linkedin && <a href={site.social_linkedin} className="text-xs text-gray-400 hover:text-gray-600">LinkedIn</a>}
            {site?.social_twitter && <a href={site.social_twitter} className="text-xs text-gray-400 hover:text-gray-600">Twitter</a>}
          </div>
          {site?.contact_email && <p className="text-xs text-gray-400 mt-2">{site.contact_email} {site.contact_phone ? `· ${site.contact_phone}` : ""}</p>}
          {site?.address && <p className="text-xs text-gray-400">{site.address}</p>}
        </div>
      </footer>
    </div>
  );
}

function getFontFamily(preset?: string): string {
  switch (preset) {
    case "elegant": return "'Playfair Display', serif";
    case "clean": return "'DM Sans', sans-serif";
    case "bold": return "'Space Grotesk', sans-serif";
    case "figtree": return "'Figtree', sans-serif";
    default: return "'Inter', sans-serif";
  }
}

function renderPublicSection(type: string, cj: any, primary: string, btnRadius: string, isDark: boolean) {
  const textColor = isDark ? "#fff" : "#111";
  const mutedColor = isDark ? "#aaa" : "#666";

  switch (type) {
    case "Hero":
      return (
        <div className="py-16 px-6 text-center">
          {cj.imageUrl && <img src={cj.imageUrl} alt={cj.heading || ""} className="w-full max-h-64 object-cover rounded-xl mb-6 mx-auto max-w-4xl" />}
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: primary }}>{cj.heading || "Welcome"}</h1>
          {cj.subheading && <p className="text-lg mb-2" style={{ color: mutedColor }}>{cj.subheading}</p>}
          {cj.body && <p className="text-base max-w-2xl mx-auto mb-6" style={{ color: mutedColor }}>{cj.body}</p>}
          {cj.buttonText && (
            <a href={cj.buttonUrl || "#"} className="inline-block px-8 py-3 text-sm font-semibold text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText}
            </a>
          )}
        </div>
      );
    case "RichText":
      return (
        <div className="py-10 px-6">
          {cj.heading && <h2 className="text-2xl font-semibold mb-3" style={{ color: textColor }}>{cj.heading}</h2>}
          {cj.body && <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: mutedColor }}>{cj.body}</p>}
        </div>
      );
    case "ImageText":
      return (
        <div className="py-10 px-6 flex flex-col md:flex-row gap-8 items-center">
          {cj.imageUrl && <img src={cj.imageUrl} alt="" className="w-full md:w-1/2 rounded-xl object-cover max-h-72" />}
          <div className="flex-1">
            {cj.heading && <h2 className="text-2xl font-semibold mb-3" style={{ color: textColor }}>{cj.heading}</h2>}
            {cj.body && <p className="text-base leading-relaxed" style={{ color: mutedColor }}>{cj.body}</p>}
          </div>
        </div>
      );
    case "CTA":
      return (
        <div className="py-14 px-6 text-center">
          {cj.heading && <h2 className="text-2xl font-bold mb-3" style={{ color: textColor }}>{cj.heading}</h2>}
          {cj.body && <p className="text-base mb-6" style={{ color: mutedColor }}>{cj.body}</p>}
          {cj.buttonText && (
            <a href={cj.buttonUrl || "#"} className="inline-block px-8 py-3 text-sm font-semibold text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText}
            </a>
          )}
        </div>
      );
    case "ContactBlock":
      return (
        <div className="py-10 px-6">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: textColor }}>{cj.heading || "Contact Us"}</h2>
          {cj.body && <p className="text-base mb-6" style={{ color: mutedColor }}>{cj.body}</p>}
          <form className="max-w-lg space-y-3" onSubmit={e => e.preventDefault()}>
            <input className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Your Name" style={{ borderColor: `${primary}30` }} />
            <input className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Your Email" style={{ borderColor: `${primary}30` }} />
            <textarea className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="Your Message" rows={4} style={{ borderColor: `${primary}30` }} />
            <button className="px-6 py-2.5 text-sm font-semibold text-white" style={{ background: primary, borderRadius: btnRadius }}>
              {cj.buttonText || "Send Message"}
            </button>
          </form>
        </div>
      );
    default:
      return (
        <div className="py-8 px-6">
          {cj.heading && <h2 className="text-xl font-semibold mb-2" style={{ color: textColor }}>{cj.heading}</h2>}
          {cj.body && <p className="text-base" style={{ color: mutedColor }}>{cj.body}</p>}
        </div>
      );
  }
}
