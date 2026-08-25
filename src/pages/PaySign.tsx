import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2,
  CreditCard,
  FileSignature,
  Loader2,
  ShieldCheck,
  Sparkles,
  FileText,
  Eye,
  CalendarClock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { computeAvailableSlots, weeklyMapToRows } from "@/lib/availabilitySlots";

type Ctx = {
  envelope: any;
  deal: any;
  invoice: any;
  client: any;
  items: any[];
  proposal?: any;
  rep?: any;
  rep_availability?: any;
  rep_timezone?: string | null;
  onboarding_meeting?: any;
};

type StepKey = "review" | "pay" | "sign" | "schedule" | "done";


function StepIndicator({ current, paid, signed, scheduled }: { current: StepKey; paid: boolean; signed: boolean; scheduled: boolean }) {
  const steps: { key: StepKey; label: string; done: boolean }[] = [
    { key: "review", label: "Review", done: current !== "review" },
    { key: "pay", label: "Pay", done: paid },
    { key: "sign", label: "Sign", done: signed },
    { key: "schedule", label: "Schedule", done: scheduled },
    { key: "done", label: "Done", done: paid && signed && scheduled },
  ];
  return (
    <div className="flex items-center justify-between gap-2 mb-6 px-1">
      {steps.map((s, i) => {
        const active = current === s.key;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                  s.done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground",
                )}
              >
                {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-[10px] mt-1 uppercase tracking-wider", active ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-px flex-1 -mt-4 mx-1", s.done ? "bg-emerald-500/50" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [reviewed, setReviewed] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
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
  const scheduledAt: string | null = ctx?.onboarding_meeting?.starts_at || null;
  const scheduled = !!scheduledAt;
  const bothDone = isPaid && signed;
  const allDone = bothDone && scheduled;

  const slots = useMemo(() => {
    if (!ctx?.rep_availability) return [];
    return computeAvailableSlots(weeklyMapToRows(ctx.rep_availability), {
      durationMinutes: 45,
      slotIntervalMinutes: 30,
      minNoticeMinutes: 0,
      daysAhead: 14,
      timeZone: ctx?.rep_timezone || "America/Los_Angeles",
    }).map((d) => ({
      date: d,
      label: d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    }));
  }, [ctx?.rep_availability, ctx?.rep_timezone]);

  const currentStep: StepKey = allDone
    ? "done"
    : !reviewed
    ? "review"
    : !isPaid
    ? "pay"
    : !signed
    ? "sign"
    : "schedule";

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

  const handleSchedule = async () => {
    if (!token || !selectedSlot) return;
    setScheduleBusy(true);
    const { data, error } = await supabase.functions.invoke("pay-sign-context", {
      body: { share_token: token, action: "schedule_onboarding", starts_at: selectedSlot },
    });
    setScheduleBusy(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Couldn't schedule onboarding");
      return;
    }
    toast.success("Onboarding meeting scheduled.");
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

  const agreementDoc = ctx.items?.find((i: any) => /agreement/i.test(i.document_name)) || ctx.items?.[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-4 md:p-10">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">NewLight · Pay & Sign</p>
            <h1 className="text-2xl font-semibold">
              Welcome{ctx.client?.name ? `, ${ctx.client.name}` : ""}
            </h1>
          </div>
        </div>

        <StepIndicator current={currentStep} paid={isPaid} signed={signed} scheduled={scheduled} />

        {/* Terms summary */}
        <Card className="p-6 mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Your agreement</p>
          <p className="text-lg font-medium mb-1">{ctx.envelope.title}</p>
          <p className="text-sm text-muted-foreground">{priceLine || "Terms will be confirmed during your closing meeting."}</p>
        </Card>

        {/* Done state */}
        {allDone && (
          <Card className="p-8 mb-6 bg-emerald-500/10 border-emerald-500/40">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-emerald-500 mb-1">You're all set.</h2>
                <p className="text-sm text-muted-foreground">
                  Payment received, service agreement signed, and your onboarding meeting is booked for{" "}
                  <span className="text-foreground font-medium">
                    {new Date(scheduledAt!).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  . A welcome email with your signed copy and meeting details is on its way.
                </p>
              </div>
            </div>
          </Card>
        )}


        {/* Review agreement */}
        {!bothDone && (
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", reviewed ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary")}>
                  {reviewed ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold">Step 1 · Review service agreement</h2>
                  <p className="text-xs text-muted-foreground">
                    Read the full agreement below. Payment and signature unlock after you confirm you've reviewed it.
                  </p>
                </div>
              </div>
              {reviewed && <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">Reviewed</span>}
            </div>

            {ctx.proposal && (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  What your rep locked in
                </p>
                {ctx.proposal.offer_summary && (
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{ctx.proposal.offer_summary}</p>
                )}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs block">Setup fee</span>
                    <span className="font-medium">${Number(ctx.proposal.setup_fee ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Monthly</span>
                    <span className="font-medium">${Number(ctx.proposal.monthly_fee ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {agreementDoc?.document_url ? (
              <div className="rounded-lg border border-border overflow-hidden bg-white">
                <iframe
                  src={agreementDoc.document_url}
                  title="Service Agreement"
                  className="w-full h-[520px] bg-white"
                />
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                Agreement document not attached. Please contact your NewLight rep.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4">
              {!reviewed && (
                <Button onClick={() => setReviewed(true)} variant="default">
                  <Eye className="h-4 w-4 mr-2" /> I've reviewed the agreement
                </Button>
              )}
              {agreementDoc?.document_url && (
                <Button variant="outline" asChild>
                  <a href={agreementDoc.document_url} target="_blank" rel="noreferrer">Open in new tab</a>
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Payment card */}
        {!bothDone && (
          <Card className={cn("p-6 mb-6 transition-opacity", !reviewed && "opacity-50 pointer-events-none")}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", isPaid ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary")}>
                  {isPaid ? <CheckCircle2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold">Step 2 · Initial payment</h2>
                  <p className="text-xs text-muted-foreground">
                    {isPaid ? "Payment received." : `Amount due: $${Number(ctx.deal?.initial_fee ?? 0).toLocaleString()}`}
                  </p>
                </div>
              </div>
              {isPaid && <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">Paid</span>}
            </div>
            {!isPaid && (
              <Button onClick={handlePay} disabled={payBusy || !(Number(ctx.deal?.initial_fee ?? 0) > 0) || !reviewed} className="w-full sm:w-auto">
                {payBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Pay ${Number(ctx.deal?.initial_fee ?? 0).toLocaleString()} with card
              </Button>
            )}
          </Card>
        )}

        {/* Signature card */}
        {!bothDone && (
          <Card className={cn("p-6 mb-6 transition-opacity", (!reviewed || !isPaid) && !signed && "opacity-50 pointer-events-none")}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", signed ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary")}>
                  {signed ? <CheckCircle2 className="h-5 w-5" /> : <FileSignature className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold">Step 3 · Sign your service agreement</h2>
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
                <Button onClick={handleSign} disabled={signBusy || !reviewed} className="mt-4 w-full sm:w-auto">
                  {signBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Adopt & Sign
                </Button>
              </>
            )}
          </Card>
        )}

        {/* Schedule onboarding */}
        {!allDone && (
          <Card className={cn("p-6 mb-6 transition-opacity", !bothDone && "opacity-50 pointer-events-none")}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", scheduled ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary")}>
                  {scheduled ? <CheckCircle2 className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold">Step 4 · Schedule onboarding meeting</h2>
                  <p className="text-xs text-muted-foreground">
                    {scheduled
                      ? "Your onboarding meeting is booked."
                      : bothDone
                      ? `45 minutes with ${ctx.rep?.name || "your NewLight rep"}.`
                      : "Unlocks once payment and signature are complete."}
                  </p>
                </div>
              </div>
              {scheduled && <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">Scheduled</span>}
            </div>

            {!scheduled && (
              slots.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  No times are currently published. Your NewLight rep will reach out to schedule.
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Select a time —</option>
                    {slots.map((s) => (
                      <option key={s.date.toISOString()} value={s.date.toISOString()}>{s.label}</option>
                    ))}
                  </select>
                  <Button onClick={handleSchedule} disabled={scheduleBusy || !selectedSlot} className="w-full sm:w-auto">
                    {scheduleBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarClock className="h-4 w-4 mr-2" />}
                    Confirm onboarding time
                  </Button>
                </div>
              )
            )}
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
