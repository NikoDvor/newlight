import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [timedOut, setTimedOut] = useState(false);

  // Safety timeout — if we're stuck loading for >8s, show a fallback
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

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
      navigate("/dashboard", { replace: true });
    }
    // If user exists but userRole is still loading, wait (with timeout fallback)
  }, [state, user, userRole, slug, navigate]);

  if (state === "not_found") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-foreground mb-2">Workspace Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The workspace link may be incorrect or the workspace no longer exists.
          </p>
          <Button variant="outline" onClick={() => navigate("/auth", { replace: true })}>
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-1">Opening your workspace…</p>
        {timedOut && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground/60">Taking longer than expected.</p>
            <div className="flex flex-col gap-2 items-center">
              <Button size="sm" onClick={() => navigate("/", { replace: true })}>
                Open Workspace
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate("/auth?redirect=/w/" + slug, { replace: true })}>
                Sign In
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
