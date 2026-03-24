import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2 } from "lucide-react";

/**
 * Public workspace entry route: /w/:slug
 * Looks up the client by workspace_slug, sets workspace context, and redirects to dashboard.
 * Works for both authenticated and unauthenticated users.
 * Preserves workspace context through auth redirects.
 */
export default function WorkspaceEntry() {
  const { slug } = useParams<{ slug: string }>();
  const { setActiveClientId, setViewMode, user, userRole } = useWorkspace();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "not_found" | "ready">("loading");

  useEffect(() => {
    if (!slug) { setState("not_found"); return; }

    const lookup = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, status")
        .eq("workspace_slug", slug)
        .maybeSingle();

      if (!data) { setState("not_found"); return; }

      // Set workspace context immediately
      setActiveClientId(data.id);
      setViewMode("workspace");
      setState("ready");
    };
    lookup();
  }, [slug]);

  useEffect(() => {
    if (state !== "ready") return;

    if (!user) {
      // Not logged in → send to auth with return path back here
      navigate(`/auth?redirect=/w/${slug}`, { replace: true });
    } else if (userRole) {
      // Logged in and role loaded → go to workspace dashboard
      // Context is already set above, so "/" will render the correct workspace
      navigate("/", { replace: true });
    }
    // If user exists but userRole is still loading, wait
  }, [state, user, userRole, slug, navigate]);

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