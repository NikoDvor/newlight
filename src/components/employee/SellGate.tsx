import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileSignature, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Contractors can't open the Dialer (lead lists and phone numbers) until their paperwork is signed.
 * The database enforces the same rule on pulling leads and loading numbers; this just explains it.
 * Anyone who isn't a contractor (owner, staff) passes straight through. Training is never gated.
 */
export default function SellGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; reason: string | null }>({ loading: true, reason: null });
  useEffect(() => {
    let alive = true;
    supabase.rpc("nl_contractor_my_sell_status" as any).then(({ data, error }) => {
      if (!alive) return;
      // If the check itself fails, fall through: the database still blocks leads and numbers.
      setState({ loading: false, reason: error ? null : ((data as string | null) ?? null) });
    });
    return () => { alive = false; };
  }, []);
  if (state.loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;
  if (!state.reason) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[hsla(35,92%,62%,.5)] bg-[hsl(30,45%,10%)] p-6 text-center">
      <FileSignature className="mx-auto h-8 w-8 text-[hsl(35,92%,66%)]" />
      <p className="mt-3 text-lg font-bold text-white">Paperwork first</p>
      <p className="mt-1 text-sm text-white/85">{state.reason}</p>
      <p className="mt-1 text-xs text-white/70">It's quick, and Training stays open the whole time.</p>
      <Link to="/employee/paperwork" className="mt-4 inline-flex h-10 items-center rounded-md bg-[hsl(197,100%,45%)] px-4 text-sm font-semibold text-white">Open My Paperwork &amp; Pay</Link>
    </div>
  );
}
