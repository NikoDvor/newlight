import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, Users, Plug, CreditCard, FileText, CheckCircle2,
  AlertCircle, ChevronRight
} from "lucide-react";

interface ReadinessItem {
  key: string;
  label: string;
  icon: any;
  status: "ready" | "needs_setup" | "partial";
  detail: string;
  link: string;
}

export function WorkspaceReadiness() {
  const { activeClientId } = useWorkspace();
  const [items, setItems] = useState<ReadinessItem[]>([]);

  useEffect(() => {
    if (!activeClientId) return;

    Promise.all([
      supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("client_integrations").select("status").eq("client_id", activeClientId),
      supabase.from("subscriptions").select("subscription_status").eq("client_id", activeClientId).limit(1).maybeSingle(),
      supabase.from("client_forms" as any).select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
    ]).then(([cal, team, intg, sub, forms]) => {
      const calCount = cal.count || 0;
      const teamCount = team.count || 0;
      const intgs = intg.data || [];
      const connected = intgs.filter((i: any) => i.status === "connected").length;
      const formCount = forms.count || 0;

      setItems([
        {
          key: "calendar",
          label: "Calendars",
          icon: Calendar,
          status: calCount > 0 ? "ready" : "needs_setup",
          detail: calCount > 0 ? `${calCount} active` : "Create first calendar",
          link: "/calendar-management",
        },
        {
          key: "team",
          label: "Team",
          icon: Users,
          status: teamCount > 1 ? "ready" : "needs_setup",
          detail: teamCount > 1 ? `${teamCount} members` : "Invite staff",
          link: "/team",
        },
        {
          key: "forms",
          label: "Forms",
          icon: FileText,
          status: formCount > 0 ? "ready" : "needs_setup",
          detail: formCount > 0 ? `${formCount} published` : "Create a form",
          link: "/forms",
        },
        {
          key: "integrations",
          label: "Integrations",
          icon: Plug,
          status: connected >= 2 ? "ready" : connected > 0 ? "partial" : "needs_setup",
          detail: connected > 0 ? `${connected} connected` : "Connect accounts",
          link: "/integrations",
        },
        {
          key: "billing",
          label: "Billing",
          icon: CreditCard,
          status: sub.data?.subscription_status === "Active" ? "ready" : "needs_setup",
          detail: sub.data ? sub.data.subscription_status : "Not set up",
          link: "/billing",
        },
      ]);
    });
  }, [activeClientId]);

  if (items.length === 0) return null;

  const readyCount = items.filter(i => i.status === "ready").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-widget"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-foreground">Workspace Readiness</p>
          <p className="text-[11px] text-muted-foreground">
            {readyCount}/{items.length} systems ready
          </p>
        </div>
        <Link
          to="/setup-center"
          className="text-[11px] font-medium flex items-center gap-1"
          style={{ color: "hsl(211 96% 56%)" }}
        >
          Setup Center <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {items.map((item) => {
          const isReady = item.status === "ready";
          const isPartial = item.status === "partial";
          return (
            <Link key={item.key} to={item.link}>
              <motion.div
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:shadow-sm cursor-pointer"
                style={{
                  background: isReady
                    ? "hsla(152,60%,44%,.06)"
                    : isPartial
                    ? "hsla(38,92%,50%,.06)"
                    : "hsla(210,40%,94%,.4)",
                  border: `1px solid ${
                    isReady
                      ? "hsla(152,60%,44%,.12)"
                      : isPartial
                      ? "hsla(38,92%,50%,.12)"
                      : "transparent"
                  }`,
                }}
                whileHover={{ y: -2 }}
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: isReady
                      ? "hsla(152,60%,44%,.12)"
                      : "hsla(211,96%,56%,.08)",
                  }}
                >
                  {isReady ? (
                    <CheckCircle2
                      className="h-4 w-4"
                      style={{ color: "hsl(152 60% 44%)" }}
                    />
                  ) : (
                    <item.icon
                      className="h-4 w-4"
                      style={{ color: "hsl(211 96% 56%)" }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-foreground text-center">
                  {item.label}
                </span>
                <span
                  className="text-[9px] text-center"
                  style={{
                    color: isReady
                      ? "hsl(152 60% 44%)"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {item.detail}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
