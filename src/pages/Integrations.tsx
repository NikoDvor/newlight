import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Plug, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Integration {
  id: string;
  integration_name: string;
  status: string | null;
}

const integrationIcons: Record<string, string> = {
  "Google Analytics": "📊",
  "Google Search Console": "🔍",
  "Google Business Profile": "📍",
  "Meta / Instagram": "📸",
  "Twilio": "📱",
  "Stripe": "💳",
  "Zoom": "📹",
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

  // Show mock data if no client is selected
  const displayIntegrations = integrations.length > 0 ? integrations : [
    { id: "1", integration_name: "Google Analytics", status: "disconnected" },
    { id: "2", integration_name: "Google Search Console", status: "disconnected" },
    { id: "3", integration_name: "Google Business Profile", status: "disconnected" },
    { id: "4", integration_name: "Meta / Instagram", status: "disconnected" },
    { id: "5", integration_name: "Twilio", status: "disconnected" },
    { id: "6", integration_name: "Stripe", status: "disconnected" },
    { id: "7", integration_name: "Zoom", status: "disconnected" },
  ];

  return (
    <div>
      <PageHeader title="Integrations" description="Connect your business tools and services" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayIntegrations.map((intg, i) => (
          <motion.div
            key={intg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="card-widget">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integrationIcons[intg.integration_name] || "🔗"}</span>
                    <div>
                      <p className="text-sm font-medium">{intg.integration_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {intg.status === "connected" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-primary">Connected</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Disconnected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={intg.status === "connected" ? "outline" : "default"}
                  onClick={() => toggleConnection(intg)}
                  className="w-full"
                >
                  {intg.status === "connected" ? (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Reconnect</>
                  ) : (
                    <><Plug className="h-3.5 w-3.5 mr-1" /> Connect</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
