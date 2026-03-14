import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Plug, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Integration {
  id: string;
  integration_name: string;
  status: string | null;
  updated_at?: string;
}

const integrationDefs = [
  { name: "Google Analytics", emoji: "📊", category: "Analytics" },
  { name: "Google Search Console", emoji: "🔍", category: "SEO" },
  { name: "Google Business Profile", emoji: "📍", category: "Local" },
  { name: "Meta / Instagram / Facebook", emoji: "📸", category: "Social" },
  { name: "Google Ads", emoji: "📢", category: "Advertising" },
  { name: "Stripe", emoji: "💳", category: "Payments" },
  { name: "Twilio", emoji: "📱", category: "Communication" },
  { name: "Zoom", emoji: "📹", category: "Meetings" },
  { name: "Domain / Website", emoji: "🌐", category: "Website" },
  { name: "Optional CRM", emoji: "👥", category: "CRM" },
];

const statusConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  connected: { icon: CheckCircle2, label: "Connected", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)" },
  disconnected: { icon: XCircle, label: "Disconnected", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)" },
  needs_reconnect: { icon: AlertTriangle, label: "Needs Reconnect", color: "hsl(222 68% 44%)", bg: "hsla(222,68%,44%,.1)" },
};

export default function Integrations() {
  const { activeClientId } = useWorkspace();
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    if (!activeClientId) return;
    supabase.from("client_integrations").select("*").eq("client_id", activeClientId)
      .then(({ data }) => setIntegrations(data ?? []));
  }, [activeClientId]);

  const toggleConnection = async (integration: Integration) => {
    const newStatus = integration.status === "connected" ? "disconnected" : "connected";
    await supabase.from("client_integrations").update({ status: newStatus }).eq("id", integration.id);
    toast.success(`${integration.integration_name} ${newStatus}`);
    setIntegrations(prev => prev.map(i => i.id === integration.id ? { ...i, status: newStatus } : i));
  };

  const getIntegrationStatus = (name: string): Integration => {
    const found = integrations.find(i => i.integration_name === name);
    return found || { id: name, integration_name: name, status: "disconnected" };
  };

  return (
    <div>
      <PageHeader title="Integrations" description="Connect your business tools and services to power your growth system" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrationDefs.map((def, i) => {
          const intg = getIntegrationStatus(def.name);
          const status = statusConfig[intg.status || "disconnected"] || statusConfig.disconnected;
          const StatusIcon = status.icon;
          const lastSynced = intg.updated_at ? new Date(intg.updated_at).toLocaleDateString() : null;

          return (
            <motion.div
              key={def.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="card-widget">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{def.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{def.name}</p>
                        <span className="text-[10px] text-muted-foreground">{def.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: status.bg }}>
                    <StatusIcon className="h-3.5 w-3.5" style={{ color: status.color }} />
                    <span className="text-xs font-medium" style={{ color: status.color }}>{status.label}</span>
                  </div>

                  {/* Last synced */}
                  {lastSynced && (
                    <div className="flex items-center gap-1.5 mb-3 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last synced: {lastSynced}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {intg.status === "connected" ? (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px]" onClick={() => toggleConnection(intg)}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Reconnect
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-[11px] text-muted-foreground">
                          View Status
                        </Button>
                      </>
                    ) : intg.status === "needs_reconnect" ? (
                      <Button size="sm" className="flex-1 h-8 text-[11px] btn-gradient" onClick={() => toggleConnection(intg)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Reconnect Now
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1 h-8 text-[11px]" onClick={() => toggleConnection(intg)}>
                        <Plug className="h-3 w-3 mr-1" /> Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
