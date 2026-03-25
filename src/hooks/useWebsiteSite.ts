import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WebsiteSite {
  id: string;
  client_id: string;
  site_name: string;
  tagline: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  font_preset: string;
  button_style: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  business_hours: string;
  social_facebook: string;
  social_instagram: string;
  social_linkedin: string;
  social_twitter: string;
  social_youtube: string;
  global_cta_text: string;
  global_cta_url: string;
  nav_items: any[];
  footer_content: any;
  custom_domain: string;
  publish_status: string;
  last_published_at: string | null;
  last_published_by: string | null;
}

const defaults: Omit<WebsiteSite, "id" | "client_id"> = {
  site_name: "", tagline: "", favicon_url: "", primary_color: "#3B82F6",
  secondary_color: "#06B6D4", font_preset: "modern", button_style: "rounded",
  contact_email: "", contact_phone: "", address: "", business_hours: "",
  social_facebook: "", social_instagram: "", social_linkedin: "",
  social_twitter: "", social_youtube: "", global_cta_text: "Get Started",
  global_cta_url: "", nav_items: [], footer_content: {},
  custom_domain: "", publish_status: "draft",
  last_published_at: null, last_published_by: null,
};

export function useWebsiteSite() {
  const { activeClientId } = useWorkspace();
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("website_sites")
      .select("*")
      .eq("client_id", activeClientId)
      .maybeSingle();
    if (data) {
      setSite({ ...defaults, ...data, nav_items: data.nav_items as any[] ?? [], footer_content: data.footer_content ?? {} } as WebsiteSite);
    } else {
      // Auto-create site record
      const { data: created } = await supabase
        .from("website_sites")
        .insert({ client_id: activeClientId })
        .select()
        .single();
      if (created) setSite({ ...defaults, ...created, nav_items: [], footer_content: {} } as WebsiteSite);
    }
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateSite = async (updates: Partial<WebsiteSite>) => {
    if (!site) return;
    const { error } = await supabase.from("website_sites").update(updates as any).eq("id", site.id);
    if (error) { toast.error(error.message); return; }
    setSite(prev => prev ? { ...prev, ...updates } : prev);
    toast.success("Site settings saved");
  };

  return { site, loading, updateSite, refetch: fetch };
}
