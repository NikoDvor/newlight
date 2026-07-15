import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileSignature, Plus, Send, CheckCircle2, Copy, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = "compose" | "send" | "sign" | "done";

interface DocItem {
  id: string;
  document_name: string;
  document_url: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDocTitle?: string;
  defaultRecipientEmail?: string;
  defaultRecipientName?: string;
  clientId?: string | null;
  envelopeType?: "proposal" | "onboarding_bundle" | "other";
  relatedType?: string | null;
  relatedId?: string | null;
}

export function SignatureDialog({
  open,
  onOpenChange,
  defaultDocTitle,
  defaultRecipientEmail,
  defaultRecipientName,
  clientId,
  envelopeType = "other",
  relatedType,
  relatedId,
}: Props) {
  const [step, setStep] = useState<Step>("compose");
  const [title, setTitle] = useState(defaultDocTitle || "");
  const [items, setItems] = useState<DocItem[]>([
    { id: crypto.randomUUID(), document_name: defaultDocTitle || "", document_url: "" },
  ]);
  const [recipientName, setRecipientName] = useState(defaultRecipientName || "");
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || "");
  const [sigMode, setSigMode] = useState<"type" | "draw">("type");
  const [typedSig, setTypedSig] = useState("");
  const [drawn, setDrawn] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [sendingBusy, setSendingBusy] = useState(false);
  const [signBusy, setSignBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const reset = () => {
    setStep("compose");
    setTitle(defaultDocTitle || "");
    setItems([{ id: crypto.randomUUID(), document_name: defaultDocTitle || "", document_url: "" }]);
    setRecipientName(defaultRecipientName || "");
    setRecipientEmail(defaultRecipientEmail || "");
    setTypedSig("");
    setDrawn(false);
    setShareLink("");
    setShareToken("");
    setResult(null);
  };

  const close = (v: boolean) => {
    if (!v) setTimeout(reset, 250);
    onOpenChange(v);
  };

  const addItem = () => setItems([...items, { id: crypto.randomUUID(), document_name: "", document_url: "" }]);
  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));
  const updateItem = (id: string, k: keyof DocItem, v: string) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [k]: v } : i)));

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

  const send = async () => {
    if (!title.trim()) return toast.error("Envelope title required");
    if (!recipientName || !recipientEmail) return toast.error("Recipient name and email required");
    const validItems = items.filter((i) => i.document_name.trim());
    if (validItems.length === 0) return toast.error("Add at least one document");

    setSendingBusy(true);
    try {
      const { data: env, error } = await supabase
        .from("document_envelopes")
        .insert({
          client_id: clientId || null,
          envelope_type: envelopeType,
          title,
          status: "sent",
          related_type: relatedType || null,
          related_id: relatedId || null,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error || !env) throw error || new Error("Failed to create envelope");

      const itemRows = validItems.map((i, idx) => ({
        envelope_id: env.id,
        document_name: i.document_name,
        document_url: i.document_url || null,
        display_order: idx,
      }));
      const { error: itemErr } = await supabase.from("document_envelope_items").insert(itemRows);
      if (itemErr) throw itemErr;

      setShareToken(env.share_token);
      setShareLink(`${window.location.origin}/sign/${env.share_token}`);
      setStep("sign");
      toast.success(`Envelope sent to ${recipientEmail}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send envelope");
    } finally {
      setSendingBusy(false);
    }
  };

  const complete = async () => {
    if (sigMode === "type" && !typedSig.trim()) return toast.error("Type your signature");
    if (sigMode === "draw" && !drawn) return toast.error("Draw your signature");

    const signatureData = sigMode === "type" ? typedSig : canvasRef.current?.toDataURL() || null;

    setSignBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("document-envelope-action", {
        body: {
          share_token: shareToken,
          action: "sign",
          signer_name: recipientName,
          signer_email: recipientEmail,
          signature_data: signatureData,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      setStep("done");
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign envelope");
    } finally {
      setSignBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "compose" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" /> Send for Signature
              </DialogTitle>
              <DialogDescription>Bundle one or more documents into a single signature envelope.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Envelope title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Advisory Agreement Bundle" />
              </div>
              <div className="grid gap-2">
                <Label>Documents</Label>
                {items.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input
                        className="col-span-2"
                        placeholder={`Document ${idx + 1} name (e.g. Form ADV Part 2A)`}
                        value={item.document_name}
                        onChange={(e) => updateItem(item.id, "document_name", e.target.value)}
                      />
                      <Input
                        placeholder="URL (optional)"
                        value={item.document_url}
                        onChange={(e) => updateItem(item.id, "document_url", e.target.value)}
                      />
                    </div>
                    {items.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addItem} className="w-fit">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add document
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button onClick={() => setStep("send")}>Continue</Button>
            </div>
          </>
        )}

        {step === "send" && (
          <>
            <DialogHeader>
              <DialogTitle>Send to recipient</DialogTitle>
              <DialogDescription>They'll receive a share link to view and sign in-browser.</DialogDescription>
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
              <Button variant="ghost" onClick={() => setStep("compose")} disabled={sendingBusy}>Back</Button>
              <Button onClick={send} disabled={sendingBusy}>
                {sendingBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                Send Envelope
              </Button>
            </div>
          </>
        )}

        {step === "sign" && (
          <>
            <DialogHeader>
              <DialogTitle>Recipient signing preview</DialogTitle>
              <DialogDescription>Envelope created. Preview the recipient's signing experience below.</DialogDescription>
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
                  className="text-2xl h-16"
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
              <Button variant="ghost" onClick={() => close(false)} disabled={signBusy}>Close</Button>
              <Button onClick={complete} disabled={signBusy}>
                {signBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                Adopt & Sign
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Envelope signed
              </DialogTitle>
              <DialogDescription>Signature recorded with a verified audit trail.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm my-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Envelope</span><span className="font-medium">{title}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Signer</span><span className="font-medium">{result?.signature?.signer_name || recipientName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{result?.signature?.signer_email || recipientEmail}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Signed at</span><span className="font-medium">{result?.signature?.signed_at ? new Date(result.signature.signed_at).toLocaleString() : new Date().toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Documents</span><span className="font-medium">{items.filter(i => i.document_name.trim()).length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">IP address</span><span className="font-mono text-xs">{result?.signature?.ip_address || "recorded server-side"}</span></div>
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
