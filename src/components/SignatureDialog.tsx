import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileSignature, Upload, PenLine, Type, Calendar, Send, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

type Step = "select" | "place" | "send" | "sign" | "done";
type FieldType = "signature" | "initial" | "date";

interface PlacedField {
  id: string;
  type: FieldType;
  x: number;
  y: number;
}

const FIELD_LABEL: Record<FieldType, string> = {
  signature: "Signature",
  initial: "Initial",
  date: "Date",
};

const FIELD_ICON: Record<FieldType, any> = {
  signature: PenLine,
  initial: Type,
  date: Calendar,
};

export function SignatureDialog({
  open,
  onOpenChange,
  defaultDocTitle,
  defaultRecipientEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDocTitle?: string;
  defaultRecipientEmail?: string;
}) {
  const [step, setStep] = useState<Step>("select");
  const [docTitle, setDocTitle] = useState(defaultDocTitle || "");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || "");
  const [fields, setFields] = useState<PlacedField[]>([]);
  const [activeTool, setActiveTool] = useState<FieldType>("signature");
  const [sigMode, setSigMode] = useState<"type" | "draw">("type");
  const [typedSig, setTypedSig] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [drawn, setDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const reset = () => {
    setStep("select");
    setDocTitle(defaultDocTitle || "");
    setRecipientName("");
    setRecipientEmail(defaultRecipientEmail || "");
    setFields([]);
    setTypedSig("");
    setShareLink("");
    setDrawn(false);
  };

  const close = (v: boolean) => {
    if (!v) setTimeout(reset, 250);
    onOpenChange(v);
  };

  const handleDropField = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFields([...fields, { id: `f${Date.now()}`, type: activeTool, x, y }]);
  };

  const send = () => {
    if (!recipientName || !recipientEmail) {
      toast.error("Recipient name and email required");
      return;
    }
    const token = Math.random().toString(36).slice(2, 10);
    const link = `${window.location.origin}/sign/${token}`;
    setShareLink(link);
    setStep("sign");
    toast.success(`Envelope sent to ${recipientEmail}`);
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const rect = c.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const moveDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setDrawn(true);
  };
  const endDraw = () => { drawing.current = false; };
  const clearDraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setDrawn(false);
  };

  const complete = () => {
    if (sigMode === "type" && !typedSig.trim()) { toast.error("Type your signature"); return; }
    if (sigMode === "draw" && !drawn) { toast.error("Draw your signature"); return; }
    setStep("done");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {step === "select" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" /> Send for Signature
              </DialogTitle>
              <DialogDescription>Upload or link a document to prepare for signature.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Document title</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Growth Package Proposal" />
              </div>
              <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Upload document</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX (mock — no upload performed)</p>
                <input type="file" className="hidden" onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setDocTitle(docTitle || e.target.files[0].name);
                    toast.success("Document loaded");
                  }
                }} />
              </label>
              <p className="text-xs text-muted-foreground text-center">Or continue with the existing proposal document.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button disabled={!docTitle} onClick={() => setStep("place")}>Continue</Button>
            </div>
          </>
        )}

        {step === "place" && (
          <>
            <DialogHeader>
              <DialogTitle>Place signature fields</DialogTitle>
              <DialogDescription>Choose a tool, then click on the document preview to place a field.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 flex-wrap py-2">
              {(["signature", "initial", "date"] as FieldType[]).map((t) => {
                const Icon = FIELD_ICON[t];
                return (
                  <Button
                    key={t}
                    size="sm"
                    variant={activeTool === t ? "default" : "outline"}
                    onClick={() => setActiveTool(t)}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" /> {FIELD_LABEL[t]}
                  </Button>
                );
              })}
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setFields([])}>Clear</Button>
            </div>
            <div
              className="relative w-full aspect-[8.5/11] max-h-[400px] bg-white/[0.02] border border-border rounded-lg cursor-crosshair overflow-hidden"
              onClick={handleDropField}
            >
              <div className="absolute inset-0 p-6 pointer-events-none">
                <div className="h-4 w-2/3 bg-white/10 rounded mb-2" />
                <div className="h-2 w-full bg-white/5 rounded mb-1" />
                <div className="h-2 w-5/6 bg-white/5 rounded mb-1" />
                <div className="h-2 w-4/6 bg-white/5 rounded mb-4" />
                <div className="h-2 w-full bg-white/5 rounded mb-1" />
                <div className="h-2 w-3/4 bg-white/5 rounded mb-1" />
                <div className="h-2 w-5/6 bg-white/5 rounded mb-4" />
                <div className="h-2 w-full bg-white/5 rounded mb-1" />
                <div className="h-2 w-2/3 bg-white/5 rounded" />
              </div>
              {fields.map((f) => {
                const Icon = FIELD_ICON[f.type];
                return (
                  <div
                    key={f.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-primary/20 border border-primary rounded px-2 py-1 text-[10px] text-primary flex items-center gap-1 pointer-events-none"
                    style={{ left: `${f.x}%`, top: `${f.y}%` }}
                  >
                    <Icon className="h-3 w-3" />
                    {FIELD_LABEL[f.type]}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("select")}>Back</Button>
              <Button disabled={fields.length === 0} onClick={() => setStep("send")}>
                Continue ({fields.length} field{fields.length !== 1 ? "s" : ""})
              </Button>
            </div>
          </>
        )}

        {step === "send" && (
          <>
            <DialogHeader>
              <DialogTitle>Send to recipient</DialogTitle>
              <DialogDescription>They'll receive an email link to view and sign in-browser.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Recipient name</Label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Recipient email</Label>
                <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("place")}>Back</Button>
              <Button onClick={send}><Send className="h-4 w-4 mr-1.5" /> Send Envelope</Button>
            </div>
          </>
        )}

        {step === "sign" && (
          <>
            <DialogHeader>
              <DialogTitle>Recipient view — preview signing</DialogTitle>
              <DialogDescription>
                Envelope sent. Preview what the recipient sees below.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 py-2 text-xs">
              <span className="text-muted-foreground">Share link:</span>
              <code className="flex-1 truncate bg-muted rounded px-2 py-1">{shareLink}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(shareLink); toast.success("Link copied"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Tabs value={sigMode} onValueChange={(v) => setSigMode(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="type">Type</TabsTrigger>
                <TabsTrigger value="draw">Draw</TabsTrigger>
              </TabsList>
              <TabsContent value="type" className="pt-3">
                <Input
                  value={typedSig}
                  onChange={(e) => setTypedSig(e.target.value)}
                  placeholder="Type your full name"
                  className="text-2xl font-signature h-16"
                  style={{ fontFamily: "cursive" }}
                />
              </TabsContent>
              <TabsContent value="draw" className="pt-3 space-y-2">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={140}
                  className="w-full border border-border rounded bg-white/[0.02] cursor-crosshair"
                  onMouseDown={startDraw}
                  onMouseMove={moveDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                />
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={clearDraw}>Clear</Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => close(false)}>Close</Button>
              <Button onClick={complete}><CheckCircle2 className="h-4 w-4 mr-1.5" /> Adopt & Sign</Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Document signed
              </DialogTitle>
              <DialogDescription>An audit trail has been recorded.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm my-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Document</span><span className="font-medium">{docTitle}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Signer</span><span className="font-medium">{recipientName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{recipientEmail}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Signed at</span><span className="font-medium">{new Date().toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fields</span><span className="font-medium">{fields.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-mono text-xs">73.19.44.12</span></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => close(false)}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
