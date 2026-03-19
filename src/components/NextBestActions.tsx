import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Palette, Users, Calendar, Plug, ShoppingBag, Star, FileText,
  Globe, ChevronRight, Sparkles, Upload
} from "lucide-react";

interface Action {
  key: string;
  label: string;
  desc: string;
  icon: any;
  link: string;
  priority: number;
}

export function NextBestActions() {
  const { activeClientId, branding } = useWorkspace();
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    if (!activeClientId) return;

    const evaluate = async () => {
      const [brandRes, calRes, teamRes, intgRes, svcRes, formRes] = await Promise.all([
        supabase.from("client_branding").select("logo_url").eq("client_id", activeClientId).maybeSingle(),
        supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
        supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
        supabase.from("client_integrations").select("status").eq("client_id", activeClientId),
        supabase.from("service_catalog" as any).select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
        supabase.from("client_forms" as any).select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      ]);

      const next: Action[] = [];

      if (!brandRes.data?.logo_url) next.push({ key: "logo", label: "Upload your logo", desc: "Add your brand identity", icon: Upload, link: "/branding-settings", priority: 1 });
      if (!calRes.count) next.push({ key: "cal", label: "Create a calendar", desc: "Set up appointment booking", icon: Calendar, link: "/calendar-management", priority: 2 });
      if ((svcRes.count || 0) === 0) next.push({ key: "svc", label: "Add your services", desc: "List what you offer", icon: ShoppingBag, link: "/services", priority: 3 });
      if ((teamRes.count || 0) <= 1) next.push({ key: "team", label: "Invite team members", desc: "Add staff and assign roles", icon: Users, link: "/team", priority: 4 });

      const intgs = intgRes.data || [];
      const connected = intgs.filter((i: any) => i.status === "connected").length;
      if (connected < 2) next.push({ key: "intg", label: "Connect integrations", desc: `${connected} connected`, icon: Plug, link: "/integrations", priority: 5 });

      if ((formRes.count || 0) === 0) next.push({ key: "form", label: "Create a booking form", desc: "Capture leads automatically", icon: FileText, link: "/forms", priority: 6 });

      setActions(next.sort((a, b) => a.priority - b.priority).slice(0, 4));
    };

    evaluate();
  }, [activeClientId]);

  if (actions.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="card-widget mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
          <Sparkles className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Next Best Actions</p>
          <p className="text-[11px] text-muted-foreground">Complete these to get the most from your workspace</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <Link key={action.key} to={action.link}>
            <motion.div
              className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-primary/10 hover:bg-primary/[0.02] transition-all cursor-pointer group"
              initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                <action.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{action.label}</p>
                <p className="text-[10px] text-muted-foreground">{action.desc}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
