import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileSignature, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Packet } from "@/lib/contractorPaperwork";

/** A reminder strip while the agreement is unsigned. It never blocks anything. */
export default function PaperworkBanner() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    let alive = true;
    supabase.rpc("nl_contractor_my_packet" as any).then(({ data }) => {
      const p = data as Packet | null;
      if (alive) setOpen(!!p && p.docs.some((d) => !d.signature));
    });
    return () => { alive = false; };
  }, [pathname === "/employee/paperwork"]);
  if (!open || pathname === "/employee/paperwork") return null;
  return (
    <Link to="/employee/paperwork"
      className="mb-4 flex items-center gap-3 rounded-xl border border-[hsla(35,92%,62%,.5)] bg-[hsl(30,45%,12%)] px-4 py-3 text-sm font-semibold text-white">
      <FileSignature className="h-5 w-5 shrink-0 text-[hsl(35,92%,66%)]" />
      <span className="min-w-0 flex-1">Sign your contractor agreement so we can pay your commission. Takes 2 minutes.</span>
      <ChevronRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}
