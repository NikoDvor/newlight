import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PauseCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Shown across the client app when a payment is past due and work is paused (set by the billing runner). */
export default function PausedBanner({ clientId }: { clientId: string | null }) {
  const [paused, setPaused] = useState<{ at: string; reason: string | null } | null>(null);
  const loc = useLocation();
  useEffect(() => {
    if (!clientId) { setPaused(null); return; }
    let cancelled = false;
    (supabase as any).from("clients").select("billing_paused_at, billing_paused_reason").eq("id", clientId).maybeSingle()
      .then(({ data }: any) => { if (!cancelled) setPaused(data?.billing_paused_at ? { at: data.billing_paused_at, reason: data.billing_paused_reason } : null); });
    return () => { cancelled = true; };
  }, [clientId, loc.pathname]);
  if (!paused) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <span className="flex items-start gap-2"><PauseCircle className="h-5 w-5 shrink-0" />
        <span><b>Work is paused — payment needed.</b> {paused.reason ? `${paused.reason}. ` : ""}Your account is read-only until it's paid; everything resumes right away after.</span>
      </span>
      {!loc.pathname.startsWith("/billing") && <Link to="/billing" className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Pay now</Link>}
    </div>
  );
}
