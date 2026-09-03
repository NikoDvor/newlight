import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, Eye, FileSignature, FileText, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StepKey = "review" | "sign" | "done";

function StepIndicator({ current, signed }: { current: StepKey; signed: boolean }) {
  const steps: { key: StepKey; label: string; done: boolean }[] = [
    { key: "review", label: "Review", done: current !== "review" },
    { key: "sign", label: "Sign", done: signed },
    { key: "done", label: "Done", done: signed },
  ];
  return (
    <div className="flex items-center justify-between gap-2 mb-6 px-1">
      {steps.map((s, i) => {
        const active = current === s.key;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                s.done ? "bg-emerald-500 border-emerald-500 text-white"
                  : active ? "bg-primary border-primary text-primary-foreground"
                  : "bg-muted border-border text-muted-foreground",
              )}>
                {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-[10px] mt-1 uppercase tracking-wider", active ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={cn("h-px flex-1 -mt-4 mx-1", s.done ? "bg-emerald-500/50" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

export default function ClientCloseAndSign() {
  const { envelopeId: token } = useParams<{ envelopeId: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const [reviewed, setReviewed] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signBusy, setSignBusy] = useState(false);
  const [sigMode, setSigMode] = useState<"type" | "draw">("type");
  const [typedSig, setTypedSig] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [drawn, setDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("client-agreement-action", {
        body: { share_token: token, action: "view" },
      });
      if (error || data?.error) {
        setErr(error?.message || data?.error || "Unable to load this agreement");
      } else {
        setEnvelope(data.envelope);
        setItems(data.items || []);
        setSignerName(data.envelope?.recipient_name || "");
        setSignerEmail(data.envelope?.recipient_email || "");
        if (data.envelope?.status === "signed") setSigned(true);
      }
      setLoading(false);
    })();
  }, [token]);

  const startDraw = (e: React.MouseEvent) => {
    const c = canvasRef.current!; const ctx2 = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx2.beginPath();
    ctx2.moveTo(((e.clientX - rect.left) / rect.width) * c.width, ((e.clientY - rect.top) / rect.height) * c.height);
    drawing.current = true;
  };
  const moveDraw = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current!; const ctx2 = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx2.strokeStyle = "#fff"; ctx2.lineWidth = 2; ctx2.lineCap = "round";
    ctx2.lineTo(((e.clientX - rect.left) / rect.width) * c.width, ((e.clientY - rect.top) / rect.height) * c.height);
    ctx2.stroke();
    setDrawn(true);
  };
  const endDraw = () => { drawing.current = false; };
  const clearDraw = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setDrawn(false);
  };

  const handleSign = async () => {
    if (!signerName.trim() || !signerEmail.trim()) return toast.error("Name and email are required");
    if (sigMode === "type" && !typedSig.trim()) return toast.error("Type your signature");
    if (sigMode === "draw" && !drawn) return toast.error("Draw your signature");
    const signatureData = sigMode === "type" ? typedSig : canvasRef.current?.toDataURL() || null;
    setSignBusy(true);
    const { data, error } = await supabase.functions.invoke("client-agreement-action", {
      body: { share_token: token, action: "sign", signer_name: signerName, signer_email: signerEmail, signature_data: signatureData },
    });
    setSignBusy(false);
    if (error || data?.error) return toast.error(error?.message || data?.error || "Signing failed");
    setSigned(true);
    toast.success("Signed — thank you");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (err || !envelope) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-lg font-semibold mb-2">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{err || "This signing link is invalid or has expired."}</p>
        </Card>
      </div>
    );
  }

  const doc = items[0];
  const current: StepKey = signed ? "done" : reviewed ? "sign" : "review";

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Review & Sign</p>
          <h1 className="text-xl font-bold text-foreground">{envelope.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">Signature only — no payment is collected through this link.</p>
        </div>

        <StepIndicator current={current} signed={signed} />

        {signed && (
          <Card className="p-6 mb-6 border-emerald-500/40 bg-emerald-500/10">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h2 className="text-base font-semibold">You're all set</h2>
                <p className="text-sm text-muted-foreground">
                  Your signature has been recorded with a full audit trail. You can still view the agreement below.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", reviewed || signed ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary")}>
                {reviewed || signed ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-semibold">Step 1 · Review the agreement</h2>
                <p className="text-xs text-muted-foreground">Read the full document below before signing.</p>
              </div>
            </div>
            {(reviewed || signed) && <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">Reviewed</span>}
          </div>

          {doc?.document_url ? (
            <div className="rounded-lg border border-border overflow-hidden bg-white">
              <iframe src={doc.document_url} title={envelope.title} className="w-full h-[520px] bg-white" />
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              Agreement document not attached. Please contact the sender.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {!reviewed && !signed && (
              <Button onClick={() => setReviewed(true)}><Eye className="h-4 w-4 mr-2" /> I've reviewed the agreement</Button>
            )}
            {doc?.document_url && (
              <Button variant="outline" asChild>
                <a href={doc.document_url} target="_blank" rel="noreferrer">Open in new tab</a>
              </Button>
            )}
          </div>
        </Card>

        {!signed && (
          <Card className={cn("p-6 mb-6 transition-opacity", !reviewed && "opacity-50 pointer-events-none")}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Step 2 · Sign</h2>
                <p className="text-xs text-muted-foreground">Type or draw your signature below.</p>
              </div>
            </div>

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

            <Button onClick={handleSign} disabled={signBusy || !reviewed} className="mt-4 w-full sm:w-auto">
              {signBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Adopt & Sign
            </Button>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          IP address, timestamp, and user agent are recorded on signature.
        </p>
      </div>
    </div>
  );
}
