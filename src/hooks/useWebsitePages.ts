import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WebsitePage {
  id: string;
  client_id: string;
  page_name: string;
  page_url: string | null;
  page_type: string | null;
  slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  noindex: boolean;
  sort_order: number;
  publish_status: string;
  page_template: string | null;
  status: string | null;
  visits: number | null;
  conversions: number | null;
  conversion_rate: number | null;
  leads_generated: number | null;
  created_at: string;
  updated_at: string;
}

const PAGE_TEMPLATES = [
  { label: "Home", slug: "home", template: "home" },
  { label: "About", slug: "about", template: "about" },
  { label: "Services", slug: "services", template: "services" },
  { label: "Contact", slug: "contact", template: "contact" },
  { label: "FAQ", slug: "faq", template: "faq" },
  { label: "Testimonials", slug: "testimonials", template: "testimonials" },
  { label: "Landing Page", slug: "", template: "landing" },
  { label: "Blank Page", slug: "", template: "blank" },
];

export { PAGE_TEMPLATES };

export function useWebsitePages() {
  const { activeClientId } = useWorkspace();
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("website_pages")
      .select("*")
      .eq("client_id", activeClientId)
      .order("sort_order");
    setPages((data as any as WebsitePage[]) || []);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createPage = async (name: string, slug: string, template: string) => {
    if (!activeClientId) return null;
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await supabase.from("website_pages").insert({
      client_id: activeClientId,
      page_name: name,
      slug: finalSlug,
      page_type: template,
      page_template: template,
      publish_status: "draft",
      sort_order: pages.length,
      status: "active",
    } as any).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Page created");
    await fetch();
    return data;
  };

  const updatePage = async (id: string, updates: Partial<WebsitePage>) => {
    const { error } = await supabase.from("website_pages").update(updates as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePage = async (id: string) => {
    const { error } = await supabase.from("website_pages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Page deleted");
    await fetch();
  };

  return { pages, loading, createPage, updatePage, deletePage, refetch: fetch };
}
