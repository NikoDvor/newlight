import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; document_name: string; document_url: string | null };
type Envelope = {
  id: string;
  title: string;
  envelope_type: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  document_envelope_items: Item[];
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-400",
  viewed: "bg-amber-500/10 text-amber-400",
  signed: "bg-emerald-500/10 text-emerald-400",
  declined: "bg-red-500/10 text-red-400",
  expired: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  proposal: "Proposal",
  onboarding_bundle: "Onboarding",
  other: "Document",
};

export default function ClientDocuments() {
  const { activeClientId } = useWorkspace();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("document_envelopes")
        .select(
          "id, title, envelope_type, status, sent_at, viewed_at, completed_at, created_at, document_envelope_items(id, document_name, document_url)"
        )
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false });
      setEnvelopes((data as Envelope[]) || []);
      setLoading(false);
    })();
  }, [activeClientId]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Documents"
        description="Proposals, onboarding bundles, and other documents sent to you."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : envelopes.length === 0 ? (
        <DataCard title="No documents yet">
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Anything your team sends you (proposals, onboarding bundles, agreements) will appear here.
            </p>
          </div>
        </DataCard>
      ) : (
        <div className="space-y-3">
          {envelopes.map((env) => {
            const dateShown =
              env.completed_at || env.sent_at || env.created_at;
            const dateLabel = env.completed_at
              ? "Signed"
              : env.sent_at
              ? "Sent"
              : "Created";
            return (
              <DataCard key={env.id} title={env.title}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABELS[env.envelope_type] || env.envelope_type}
                      </Badge>
                      <Badge className={`text-[10px] ${STATUS_COLORS[env.status] || "bg-muted"}`}>
                        {env.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dateLabel} {new Date(dateShown).toLocaleString()}
                      {env.viewed_at && env.status !== "signed"
                        ? ` · Viewed ${new Date(env.viewed_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                </div>

                {env.document_envelope_items?.length ? (
                  <div className="mt-3 space-y-1">
                    {env.document_envelope_items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between py-2 border-t border-border first:border-0 gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{it.document_name}</span>
                        </div>
                        {it.document_url ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                          >
                            <a href={it.document_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              View
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No file</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3">No files attached.</p>
                )}
              </DataCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
