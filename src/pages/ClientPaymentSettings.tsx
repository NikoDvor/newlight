import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BackArrow } from "@/components/BackArrow";
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export default function ClientPaymentSettings() {
  const { activeClientId } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptsWire, setAcceptsWire] = useState(false);
  const [acceptsStripe, setAcceptsStripe] = useState(false);
  const [wireInstructions, setWireInstructions] = useState("");
  const [stripeChargesEnabled, setStripeChargesEnabled] = useState(false);
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("client_payment_settings")
        .select("*")
        .eq("client_id", activeClientId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setAcceptsWire(Boolean(data.accepts_wire));
        setAcceptsStripe(Boolean(data.accepts_stripe));
        setWireInstructions(data.wire_instructions || "");
        setStripeChargesEnabled(Boolean(data.stripe_charges_enabled));
        setConnectAccountId(data.stripe_connect_account_id || null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [activeClientId]);

  const save = async () => {
    if (!activeClientId) return toast.error("No active workspace");
    setSaving(true);
    const { error } = await supabase
      .from("client_payment_settings")
      .upsert({
        client_id: activeClientId,
        accepts_wire: acceptsWire,
        accepts_stripe: acceptsStripe,
        wire_instructions: acceptsWire ? wireInstructions : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Payment settings saved");
  };

  const connectStripe = async () => {
    if (!activeClientId) return toast.error("No active workspace");
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
      body: { client_id: activeClientId },
    });
    setConnecting(false);
    if (error || data?.error || !data?.onboarding_url) {
      return toast.error(error?.message || data?.error || "Could not start Stripe onboarding");
    }
    window.location.href = data.onboarding_url;
  };

  const connectStatus = stripeChargesEnabled
    ? { label: "Connected and active", cls: "text-emerald-500" }
    : connectAccountId
      ? { label: "Connected — finishing setup", cls: "text-amber-500" }
      : { label: "Not connected", cls: "text-muted-foreground" };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <BackArrow />

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Payment Settings</h1>
          <p className="text-sm text-muted-foreground">
            Choose how your customers pay you. These are your own payment details — separate from your NewLight billing.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <Card className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Accept wire transfers</p>
                <p className="text-xs text-muted-foreground">Share your banking details with customers on payment requests.</p>
              </div>
              <Switch checked={acceptsWire} onCheckedChange={setAcceptsWire} />
            </div>

            {acceptsWire && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Wire instructions</label>
                <Textarea
                  rows={6}
                  value={wireInstructions}
                  onChange={(e) => setWireInstructions(e.target.value)}
                  placeholder={"Bank name\nRouting number\nAccount number\nReference: invoice or customer name"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown exactly as written to anyone you send a payment request to.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Accept Stripe payments</p>
                <p className="text-xs text-muted-foreground">Collect card payments online through your own Stripe account.</p>
              </div>
              <Switch checked={acceptsStripe} onCheckedChange={setAcceptsStripe} />
            </div>

            {acceptsStripe && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-2">
                    {stripeChargesEnabled
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    <div>
                      <p className="text-xs text-muted-foreground">Stripe connection status</p>
                      <p className={`text-sm font-semibold ${connectStatus.cls}`}>{connectStatus.label}</p>
                    </div>
                  </div>
                  {!stripeChargesEnabled && (
                    <Button onClick={connectStripe} disabled={connecting}>
                      {connecting
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <ExternalLink className="h-4 w-4 mr-2" />}
                      {connectAccountId ? "Finish Stripe setup" : "Connect Stripe"}
                    </Button>
                  )}
                </div>
                {!stripeChargesEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Payouts go directly to your own Stripe account. You can complete onboarding at any time.
                  </p>
                )}
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save settings
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
