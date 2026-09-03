import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BackArrow } from "@/components/BackArrow";
import { AlertTriangle, Loader2, FileSignature, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface MergeField { key: string; label: string; }

interface PaymentSettings {
  accepts_wire: boolean;
  accepts_stripe: boolean;
  stripe_charges_enabled: boolean;
}

export default function ClientCloseAndSend() {
  const { dealId } = useParams();
  const { activeClientId } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deal, setDeal] = useState<any>(null);
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [template, setTemplate] = useState<{ id: string; template_name: string; merge_fields: MergeField[] } | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Optional payment request (client's own collection — separate from NewLight billing)
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDueDate, setPayDueDate] = useState("");
  const [payMethod, setPayMethod] = useState<"wire" | "stripe">("wire");


  useEffect(() => {
    if (!activeClientId || !dealId) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const [dealRes, tplRes, payRes] = await Promise.all([
        supabase
          .from("crm_deals")
          .select("*, crm_contacts(full_name, email), crm_companies(company_name)")
          .eq("id", dealId)
          .eq("client_id", activeClientId)
          .maybeSingle(),
        supabase
          .from("client_agreement_templates")
          .select("id, template_name, merge_fields")
          .eq("client_id", activeClientId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("client_payment_settings")
          .select("accepts_wire, accepts_stripe, stripe_charges_enabled")
          .eq("client_id", activeClientId)
          .maybeSingle(),
      ]);

      if (!active) return;

      const d: any = dealRes.data;
      if (d) {
        setDeal(d);
        setContactName(d.crm_contacts?.full_name || "");
        setCompanyName(d.crm_companies?.company_name || "");
        setRecipientName(d.crm_contacts?.full_name || d.crm_companies?.company_name || "");
        setRecipientEmail(d.crm_contacts?.email || "");
      }

      const t: any = tplRes.data;
      if (t) {
        const mf = Array.isArray(t.merge_fields) ? (t.merge_fields as any[]) : [];
        setTemplate({
          id: t.id,
          template_name: t.template_name || "Agreement",
          merge_fields: mf
            .map((f) => ({ key: String(f?.key ?? ""), label: String(f?.label ?? "") }))
            .filter((f) => f.key),
        });
      }

      const p: any = payRes.data;
      if (p && (p.accepts_wire || p.accepts_stripe)) {
        setPaySettings({
          accepts_wire: Boolean(p.accepts_wire),
          accepts_stripe: Boolean(p.accepts_stripe),
          stripe_charges_enabled: Boolean(p.stripe_charges_enabled),
        });
        setPayMethod(p.accepts_wire ? "wire" : "stripe");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [activeClientId, dealId]);

  const bothMethods = Boolean(paySettings?.accepts_wire && paySettings?.accepts_stripe);
  const paymentFilledIn = Boolean(payAmount.trim() && payDueDate);

  const generate = async () => {
    if (!activeClientId) return toast.error("No active workspace");
    if (!recipientName.trim() || !recipientEmail.trim()) return toast.error("Recipient name and email are required");
    if (paySettings && (payAmount.trim() || payDueDate) && !paymentFilledIn) {
      return toast.error("Enter both an amount and a due date, or clear the payment section");
    }
    const amountNum = Number(payAmount);
    if (paymentFilledIn && (!Number.isFinite(amountNum) || amountNum <= 0)) {
      return toast.error("Enter a valid payment amount");
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("generate-client-envelope", {
      body: {
        client_id: activeClientId,
        deal_id: dealId,
        recipient_name: recipientName.trim(),
        recipient_email: recipientEmail.trim(),
        field_values: values,
      },
    });
    if (error || (data as any)?.error) {
      setSending(false);
      return toast.error((data as any)?.error || error?.message || "Failed to generate agreement");
    }
    const token = (data as any)?.share_token;
    const envelopeId = (data as any)?.envelope_id;
    if (!token) {
      setSending(false);
      return toast.error("Agreement created but no share link was returned");
    }

    if (paySettings && paymentFilledIn) {
      const { data: auth } = await supabase.auth.getUser();
      const { error: payErr } = await supabase.from("client_payment_requests").insert({
        client_id: activeClientId,
        deal_id: dealId || null,
        envelope_id: envelopeId || null,
        amount: amountNum,
        currency: "usd",
        method: bothMethods ? payMethod : (paySettings.accepts_wire ? "wire" : "stripe"),
        due_date: payDueDate,
        payer_name: recipientName.trim(),
        payer_email: recipientEmail.trim(),
        created_by: auth?.user?.id || null,
      });
      if (payErr) toast.error(`Agreement sent, but the payment request failed: ${payErr.message}`);
    }

    setSending(false);
    setShareUrl(`https://newlight-app.com/close-and-sign/${token}`);
    toast.success("Agreement generated");
  };


  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <BackArrow />

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <FileSignature className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Generate &amp; Send Agreement</h1>
          <p className="text-sm text-muted-foreground">
            Fill in your agreement's fields for this deal, then share the signing link with your customer.
          </p>
        </div>
      </div>

      <Card className="p-4 border-amber-500/40 bg-amber-500/10">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            <strong>This is the client's own agreement — NewLight does not draft or review this content.</strong>
          </p>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !deal ? (
        <Card className="p-8 text-center space-y-2">
          <p className="text-sm font-medium">Deal not found</p>
          <p className="text-sm text-muted-foreground">This deal doesn't exist in the current workspace.</p>
        </Card>
      ) : !template ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-base font-semibold">No agreement template set up yet</p>
          <p className="text-sm text-muted-foreground">
            Add your own agreement text and merge fields once, then reuse it for every deal.
          </p>
          <Button asChild variant="outline">
            <Link to="/agreement-template">Set up agreement template <ExternalLink className="h-4 w-4 ml-1" /></Link>
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-6 space-y-1">
            <p className="text-xs text-muted-foreground">Deal</p>
            <p className="text-sm font-semibold">{deal.deal_name || "Untitled deal"}</p>
            <p className="text-sm text-muted-foreground">
              {[contactName, companyName].filter(Boolean).join(" · ") || "No contact linked"}
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold">Recipient</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Recipient name</label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Recipient email</label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Agreement Fields</h2>
              <p className="text-xs text-muted-foreground">
                From your template "{template.template_name}". Anything left blank stays visible as a gap in the document.
              </p>
            </div>
            {template.merge_fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your template has no merge fields — the agreement will be sent as written.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {template.merge_fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{f.label || f.key}</label>
                    <Input
                      name={f.key}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={`{{${f.key}}}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={generate} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
              Generate &amp; Send
            </Button>
          </div>

          {shareUrl && (
            <Card className="p-6 space-y-3 border-emerald-500/40 bg-emerald-500/5">
              <h2 className="text-base font-semibold">Signing link ready</h2>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} className="font-mono text-xs" />
                <Button variant="outline" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this link to your recipient by email or text — this page does not deliver it automatically.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
