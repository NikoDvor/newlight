import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Employee-facing Form 3 entry point.
 * Route: /employee/pay-sign/:leadId
 *
 * Resolves the deal's service_agreement envelope, then hands the salesman
 * either a shareable Pay & Sign link (to send to the client) or redirects
 * them straight into the existing public PaySign flow to review the state.
 */
export default function EmployeePaySign() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deal, setDeal] = useState<any>(null);
  const [envelope, setEnvelope] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!leadId) { setError("Missing lead id"); setLoading(false); return; }
      const { data: dealRow, error: dealErr } = await supabase
        .from("crm_deals")
        .select("id, deal_name, pay_sign_status, service_agreement_envelope_id, payment_invoice_id, proposal_id_current, contact_id, contact_name, contact_email")
        .eq("id", leadId)
        .maybeSingle();
      if (dealErr || !dealRow) { setError(dealErr?.message || "Deal not found"); setLoading(false); return; }
      setDeal(dealRow);

      if (dealRow.service_agreement_envelope_id) {
        const { data: env } = await supabase
          .from("document_envelopes")
          .select("id, title, status, share_token, recipient_name, recipient_email")
          .eq("id", dealRow.service_agreement_envelope_id)
          .maybeSingle();
        setEnvelope(env);
      }
      if (dealRow.payment_invoice_id) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("id, invoice_number, total_amount, invoice_status")
          .eq("id", dealRow.payment_invoice_id)
          .maybeSingle();
        setInvoice(inv);
      }
      setLoading(false);
    })();
  }, [leadId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = envelope?.share_token ? `${origin}/pay-sign/${envelope.share_token}` : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <Card className="max-w-xl mx-auto mt-12 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold">Cannot open Pay & Sign</h2>
            <p className="text-xs text-muted-foreground mt-1">{error || "Deal not found"}</p>
            <Button asChild size="sm" variant="ghost" className="mt-3">
              <Link to="/employee/leads">Back to leads</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">Form 3 · Pay &amp; Sign</p>
        <h1 className="text-2xl font-bold text-foreground">{deal.deal_name || "Untitled deal"}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Status: <span className="font-medium text-foreground">{deal.pay_sign_status || "pending"}</span>
        </p>
      </div>

      {!envelope ? (
        <Card className="p-5 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-medium">Form 2 not submitted yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Complete Close Prep for this lead first — Form 2 generates the proposal, service agreement envelope, and closing meeting.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to={`/employee/close-prep/${leadId}`}>Open Close Prep (Form 2)</Link>
          </Button>
        </Card>
      ) : (
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Service Agreement Envelope</p>
            <p className="text-sm font-medium">{envelope.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Envelope status: <span className="font-medium">{envelope.status}</span>
              {invoice && <> · Invoice: <span className="font-medium">{invoice.invoice_status}</span> (${(Number(invoice.total_amount) || 0).toFixed(2)})</>}
            </p>
          </div>

          {publicUrl && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Client-facing Pay &amp; Sign link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={publicUrl}
                  className="flex-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs font-mono"
                />
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl)}>
                  Copy
                </Button>
                <Button size="sm" onClick={() => window.open(publicUrl, "_blank")}>
                  Open
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Sends the client into the same Stripe + e-sign flow used at /pay-sign/:token.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/employee/close-prep/${leadId}`)}>
              Back to Close Prep
            </Button>
            {publicUrl && (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/pay-sign/${envelope.share_token}`)}>
                Preview client view
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
