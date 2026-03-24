import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2 } from "lucide-react";

/**
 * Public workspace entry route: /w/:slug
 * Looks up the client by workspace_slug, sets workspace context, and redirects to dashboard.
 * Works for both authenticated and unauthenticated users.
 */
export default function WorkspaceEntry() {
  const { slug } = useParams<{ slug: string }>();
  const { setActiveClientId, setViewMode, user } = useWorkspace();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "not_found" | "ready">("loading");
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setState("not_found"); return; }

    const lookup = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("workspace_slug", slug)
        .maybeSingle();

      if (!data) { setState("not_found"); return; }

      setClientId(data.id);
      setActiveClientId(data.id);
      setViewMode("workspace");
      setState("ready");
    };
    lookup();
  }, [slug]);

  useEffect(() => {
    if (state !== "ready") return;

    if (!user) {
      // Not logged in → send to auth with return path to this workspace
      navigate(`/auth?redirect=/w/${slug}`, { replace: true });
    } else {
      // Logged in → go to workspace dashboard
      navigate("/", { replace: true });
    }
  }, [state, user, slug, navigate]);

  if (state === "not_found") {
    return <Navigate to="/get-started" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Opening your workspace…</p>
      </div>
    </div>
  );
}