import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  client: { id: string; business_name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

export function RevenueWebhookDialog({ client, open, onOpenChange }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !client) { setToken(null); return; }
    setLoading(true);
    supabase
      .from("clients")
      .select("revenue_webhook_token")
      .eq("id", client.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("Could not load webhook token");
        setToken((data as any)?.revenue_webhook_token ?? null);
        setLoading(false);
      });
  }, [open, client?.id]);

  const url = token ? `${FN_BASE}/revenue-webhook?token=${token}` : "";
  const samplePayload = client
    ? JSON.stringify({ client_id: client.id, amount: 1500, description: "Invoice #1042 paid", occurred_at: new Date().toISOString() }, null, 2)
    : "";

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const block = "rounded-lg bg-black/30 border border-white/10 p-3 text-[11px] text-white/70 font-mono break-all whitespace-pre-wrap";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden"
        style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Webhook className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
            Revenue Webhook — {client?.business_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-white/50 text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading token…
          </div>
        ) : !token ? (
          <p className="text-sm text-white/50 py-6">No webhook token found for this client.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-white/50">
              Give this URL to the client's CRM (HubSpot, GoHighLevel, Zapier, Make) to post closed revenue
              into billing. Send a POST with a JSON body. This token is unique to this client — never share it
              with another workspace.
            </p>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Webhook URL (POST)</p>
              <div className={block}>{url}</div>
              <Button size="sm" variant="outline" className="mt-2 h-8 gap-1.5 text-xs border-white/10 bg-white/[0.04] text-white/70" onClick={() => copy(url, "Webhook URL")}>
                <Copy className="h-3 w-3" /> Copy URL
              </Button>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Alternative auth header</p>
              <div className={block}>{`x-webhook-token: ${token}`}</div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Sample JSON body</p>
              <div className={block}>{samplePayload}</div>
              <Button size="sm" variant="outline" className="mt-2 h-8 gap-1.5 text-xs border-white/10 bg-white/[0.04] text-white/70" onClick={() => copy(samplePayload, "Sample payload")}>
                <Copy className="h-3 w-3" /> Copy sample body
              </Button>
            </div>

            <p className="text-[11px] text-white/35">
              <span className="text-white/50">description</span> and <span className="text-white/50">occurred_at</span> are
              optional. Every call is recorded in Audit Logs as <span className="text-white/50">external_revenue_webhook_received</span>.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
