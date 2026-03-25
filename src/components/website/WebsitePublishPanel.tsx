import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Clock, User, RotateCcw, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { WebsiteSite } from "@/hooks/useWebsiteSite";

interface Snapshot {
  id: string;
  published_at: string;
  version_label: string;
  published_by: string | null;
}

interface Props {
  site: WebsiteSite | null;
  onPublish: () => void;
  pages: any[];
}

export function WebsitePublishPanel({ site, onPublish, pages }: Props) {
  const { activeClientId, user } = useWorkspace();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!activeClientId) return;
    supabase
      .from("website_publish_snapshots")
      .select("id, published_at, version_label, published_by")
      .eq("client_id", activeClientId)
      .order("published_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setSnapshots((data as any) || []));
  }, [activeClientId]);

  const handlePublish = async () => {
    if (!activeClientId || !site) return;
    setPublishing(true);

    // Fetch all sections
    const { data: allSections } = await supabase
      .from("website_content_blocks")
      .select("*")
      .eq("client_id", activeClientId);

    // Create snapshot
    const snapshotData = {
      site: { ...site },
      pages,
      sections: allSections || [],
    };

    await supabase.from("website_publish_snapshots").insert({
      client_id: activeClientId,
      snapshot_data: snapshotData as any,
      published_by: user?.id || null,
      version_label: `v${snapshots.length + 1}`,
    } as any);

    // Update site publish status
    await supabase.from("website_sites").update({
      publish_status: "published",
      last_published_at: new Date().toISOString(),
      last_published_by: user?.id || null,
    } as any).eq("id", site.id);

    // Update all pages to published
    for (const page of pages) {
      await supabase.from("website_pages").update({ publish_status: "published" } as any).eq("id", page.id);
    }

    toast.success("Website published!");
    setPublishing(false);
    onPublish();

    // Refresh snapshots
    const { data: updated } = await supabase
      .from("website_publish_snapshots")
      .select("id, published_at, version_label, published_by")
      .eq("client_id", activeClientId)
      .order("published_at", { ascending: false })
      .limit(10);
    setSnapshots((updated as any) || []);
  };

  const draftPages = pages.filter(p => p.publish_status !== "published").length;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="p-5 rounded-2xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Publish Status</h3>
          <Badge variant="outline" className={site?.publish_status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
            {site?.publish_status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        {site?.last_published_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <Clock className="h-3 w-3" /> Last published: {new Date(site.last_published_at).toLocaleString()}
          </p>
        )}
        <p className="text-xs text-muted-foreground mb-4">
          {draftPages > 0 ? `${draftPages} page(s) with unpublished changes` : "All pages are up to date"}
        </p>
        <Button onClick={handlePublish} disabled={publishing} className="w-full gap-1.5">
          <Upload className="h-4 w-4" /> {publishing ? "Publishing..." : "Publish Website"}
        </Button>
      </div>

      {/* Version History */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Version History</h3>
        {snapshots.length === 0 ? (
          <p className="text-xs text-muted-foreground">No versions published yet.</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap, i) => (
              <div key={snap.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {i === 0 ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{snap.version_label || `Version ${snapshots.length - i}`}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(snap.published_at).toLocaleString()}</p>
                </div>
                {i === 0 && <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700">Current</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
