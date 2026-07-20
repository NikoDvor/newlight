import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, CreditCard, FileSignature, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ctx = {
  envelope: any;
  deal: any;
  invoice: any;
  client: any;
  items: any[];
};

export default function PaySign() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [payBusy, setPayBusy] = useState(false);
  const [signBusy, setSignBusy] = useState(false);
  const [sigMode, setSigMode] = useState<"type" | "draw">("type");
  const [typedSig, setTypedSig] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [drawn, setDrawn] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("pay-sign-context", {
      body: { share_token: token, action: "context" },
    });
    if (error || data?.error) {
      setErr(error?.message || data?.error || "Unable to load");
    } else {
      setCtx(data);
      setSignerName(data?.envelope?.recipient_name || "");
      setSignerEmail(data?.envelope?.recipient_email || "");
      if (data?.envelope?.status === "signed") setSigned(true);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  // After stripe redirect back, try to mark_paid
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (paymentStatus === "success" && sessionId && token) {
      supabase.functions.invoke("pay-sign-context", {
        body: { share_token: token, action: "mark_paid", session_id: sessionId },
      }).then(({ data, error }) => {
        if (error || data?.error) {
          console.warn("mark_paid failed", error || data?.error);
        } else {
          toast.success("Payment received. Thank you!");
          load();
        }
      });
    }
    if (paymentStatus === "cancelled") {
      toast.info("Payment was cancelled.");
    }
    // eslint-disable-next-line
  }, [token]);

  const priceLine = useMemo(() => {
    const d = ctx?.deal;
    if (!d) return "";
    if (d.pricing_model === "retainer") {
      return `Initial $${Number(d.initial_fee ?? 0).toLocaleString()} + $${Number(d.recurring_fee ?? 0).toLocaleString()}/month retainer`;
    }
    return `Initial $${Number(d.initial_fee ?? 0).toLocaleString()} + ${Number(d.commission_rate ?? 0)}% commission on generated revenue`;
  }, [ctx]);

  const isPaid = ctx?.invoice?.invoice_status === "paid";

  const handlePay = async () => {
    if (!token) return;
    setPayBusy(true);
    const { data, error } = await supabase.functions.invoke("pay-sign-context", {
      body: { share_token: token, action: "create_payment" },
    });
    setPayBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Failed to start payment");
      return;
    }
    window.location.href = data.url;
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const c = canvasRef.current!; const ctx2 = c.getContext("2d")!;
    ctx2.strokeStyle = "hsl(var(--primary))"; ctx2.lineWidth = 2; ctx2.beginPath();
    const rect = c.getBoundingClientRect();
    ctx2.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const moveDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current!; const ctx2 = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx2.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx2.stroke();
    setDrawn(true);
  };
  const endDraw = () => { drawing.current = false; };
  const clearDraw = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setDrawn(false);
  };

  const handleSign = async () => {
    if (!token) return;
    if (!signerName.trim() || !signerEmail.trim()) return toast.error("Name and email required");
    if (sigMode === "type" && !typedSig.trim()) return toast.error("Type your signature");
    if (sigMode === "draw" && !drawn) return toast.error("Draw your signature");
    const signatureData = sigMode === "type" ? typedSig : canvasRef.current?.toDataURL() || null;
    setSignBusy(true);
    const { data, error } = await supabase.functions.invoke("document-envelope-action", {
      body: { share_token: token, action: "sign", signer_name: signerName, signer_email: signerEmail, signature_data: signatureData },
    });
    setSignBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Signing failed");
      return;
    }
    toast.success("Service agreement signed.");
    setSigned(true);
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (err || !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-lg font-semibold mb-2">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{err || "This Pay & Sign link is invalid or has expired."}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Form 3 · Pay & Sign</p>
            <h1 className="text-2xl font-semibold">Welcome{ctx.client?.name ? `, ${ctx.client.name}` : ""}</h1>
          </div>
        </div>

        {/* Terms summary */}
        <Card className="p-6 mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Your agreement</p>
          <p className="text-lg font-medium mb-1">{ctx.envelope.title}</p>
          <p className="text-sm text-muted-foreground">{priceLine || "Terms will be confirmed during your closing meeting."}</p>
        </Card>

        {/* Payment card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPaid ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary"}`}>
                {isPaid ? <CheckCircle2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-semibold">Step 1 · Initial payment</h2>
                <p className="text-xs text-muted-foreground">
                  {isPaid ? "Payment received." : `Amount due: $${Number(ctx.deal?.initial_fee ?? 0).toLocaleString()}`}
                </p>
              </div>
            </div>
            {isPaid && <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">Paid</span>}
          </div>
          {!isPaid && (
            <Button onClick={handlePay} disabled={payBusy || !(Number(ctx.deal?.initial_fee ?? 0) > 0)} className="w-full sm:w-auto">
              {payBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay with card
            </Button>
          )}
        </Card>

        {/* Signature card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${signed ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary"}`}>
                {signed ? <CheckCircle2 className="h-5 w-5" /> : <FileSignature className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-semibold">Step 2 · Sign your service agreement</h2>
                <p className="text-xs text-muted-foreground">
                  {signed ? "Signature recorded with a verified audit trail." : "Type or draw your signature below."}
                </p>
              </div>
            </div>
            {signed && <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">Signed</span>}
          </div>

          {!signed && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full name</label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                </div>
              </div>
              <Tabs value={sigMode} onValueChange={(v) => setSigMode(v as any)}>
                <TabsList className="grid grid-cols-2 w-full max-w-xs">
                  <TabsTrigger value="type">Type</TabsTrigger>
                  <TabsTrigger value="draw">Draw</TabsTrigger>
                </TabsList>
                <TabsContent value="type" className="pt-3">
                  <Input value={typedSig} onChange={(e) => setTypedSig(e.target.value)}
                    placeholder="Type your full name" className="text-2xl h-16" style={{ fontFamily: "cursive" }} />
                </TabsContent>
                <TabsContent value="draw" className="pt-3 space-y-2">
                  <canvas ref={canvasRef} width={600} height={140}
                    className="w-full border border-border rounded bg-white/[0.02] cursor-crosshair"
                    onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw} />
                  <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={clearDraw}>Clear</Button></div>
                </TabsContent>
              </Tabs>
              <Button onClick={handleSign} disabled={signBusy} className="mt-4 w-full sm:w-auto">
                {signBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Adopt & Sign
              </Button>
            </>
          )}
        </Card>

        {/* Documents */}
        {ctx.items && ctx.items.length > 0 && (
          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-3">Documents in this envelope</h3>
            <ul className="space-y-2">
              {ctx.items.map((it: any) => (
                <li key={it.id} className="flex items-center justify-between text-sm">
                  <span>{it.document_name}</span>
                  {it.document_url && (
                    <a href={it.document_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">View</a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secured with a cryptographic audit trail. IP address, timestamp, and user agent are recorded on signature.
        </div>
      </div>
    </div>
  );
}
