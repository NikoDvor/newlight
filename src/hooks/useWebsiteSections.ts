import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WebsiteSection {
  id: string;
  client_id: string;
  block_key: string;
  block_label: string | null;
  block_type: string;
  content_json: any;
  page_key: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const SECTION_TYPES = [
  { value: "Hero", label: "Hero Banner", icon: "Sparkles" },
  { value: "RichText", label: "Text Block", icon: "Type" },
  { value: "ImageText", label: "Image + Text", icon: "Image" },
  { value: "ServiceList", label: "Services List", icon: "ShoppingBag" },
  { value: "ProductGrid", label: "Products Grid", icon: "Package" },
  { value: "CTA", label: "Call to Action", icon: "MousePointerClick" },
  { value: "Testimonial", label: "Testimonials", icon: "MessageSquare" },
  { value: "FAQ", label: "FAQ Section", icon: "HelpCircle" },
  { value: "ContactBlock", label: "Contact Block", icon: "Mail" },
  { value: "Gallery", label: "Gallery", icon: "Image" },
  { value: "BookingBlock", label: "Booking CTA", icon: "Calendar" },
  { value: "ReviewsCTA", label: "Reviews CTA", icon: "Star" },
] as const;

export function useWebsiteSections(pageKey: string | null) {
  const { activeClientId } = useWorkspace();
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeClientId || !pageKey) { setSections([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("website_content_blocks")
      .select("*")
      .eq("client_id", activeClientId)
      .eq("page_key", pageKey)
      .order("display_order");
    setSections((data as any as WebsiteSection[]) || []);
    setLoading(false);
  }, [activeClientId, pageKey]);

  useEffect(() => { fetch(); }, [fetch]);

  const addSection = async (blockType: string) => {
    if (!activeClientId || !pageKey) return;
    const key = `${blockType.toLowerCase()}_${Date.now()}`;
    const defaultContent: any = { heading: "", body: "", buttonText: "", buttonUrl: "", imageUrl: "" };
    const { error } = await supabase.from("website_content_blocks").insert({
      client_id: activeClientId,
      block_key: key,
      block_type: blockType,
      block_label: SECTION_TYPES.find(s => s.value === blockType)?.label || blockType,
      content_json: defaultContent,
      page_key: pageKey,
      is_active: true,
      display_order: sections.length,
    } as any);
    if (error) { toast.error(error.message); return; }
    await fetch();
  };

  const updateSection = async (id: string, updates: Partial<WebsiteSection>) => {
    const { error } = await supabase.from("website_content_blocks").update(updates as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from("website_content_blocks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await fetch();
  };

  const reorderSections = async (orderedIds: string[]) => {
    const promises = orderedIds.map((id, i) =>
      supabase.from("website_content_blocks").update({ display_order: i } as any).eq("id", id)
    );
    await Promise.all(promises);
    await fetch();
  };

  return { sections, loading, addSection, updateSection, deleteSection, reorderSections, refetch: fetch };
}
