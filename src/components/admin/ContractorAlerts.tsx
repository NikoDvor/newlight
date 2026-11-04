import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Bell, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Alert = { key: string; level: "urgent" | "soon" | "info"; title: string; detail: string; link: string };
const STYLE = {
  urgent: { border: "hsla(0,80%,66%,.55)", bg: "hsl(0,45%,12%)", icon: "hsl(0,80%,72%)" },
  soon: { border: "hsla(35,92%,62%,.5)", bg: "hsl(30,45%,11%)", icon: "hsl(35,92%,66%)" },
  info: { border: "rgba(255,255,255,.14)", bg: "hsl(222,40%,9%)", icon: "hsl(197,100%,70%)" },
};

/** What needs doing for contractors right now: late or ready commissions, state reports, countersigning, tax-ID checks, yearly re-signing. */
export default function ContractorAlerts({ only }: { only?: string[] }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { pathname } = useLocation();
  useEffect(() => {
    supabase.rpc("nl_contractor_alerts" as any).then(({ data }) => setAlerts(((data as Alert[]) ?? []).filter((a) => !only || only.some((p) => a.key.startsWith(p)))));
  }, [pathname]);
  if (!alerts.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/75"><Bell className="h-3.5 w-3.5" />Needs your attention ({alerts.length})</p>
      {alerts.map((a) => {
        const s = STYLE[a.level] ?? STYLE.info;
        const Icon = a.level === "info" ? Info : AlertTriangle;
        const to = pathname.startsWith("/admin") ? a.link : a.link.replace(/^\/admin/, "");
        return (
          <Link key={a.key} to={to} className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5" style={{ borderColor: s.border, background: s.bg }}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: s.icon }} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">{a.title}</span>
              <span className="block text-xs text-white/80">{a.detail}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
