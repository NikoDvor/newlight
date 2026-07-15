import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileSignature, Upload, Copy, Send, CheckCircle2, Eye, Clock, ExternalLink, RefreshCw, Loader2,
} from "lucide-react";
import { emitEvent } from "@/lib/automationEngine";

interface Props {
  clientId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
}

interface EnvelopeItem {
  id: string;
  document_name: string;
  document_url: string | null;
  display_order: number;
}

interface Envelope {
  id: string;
  status: string;
  title: string;
  share_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  completed_at: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
}

const DEFAULT_DOCS = ["Form ADV Part 2A", "Form CRS", "Advisory Agreement"];

const STATUS_STYLES: Record<string, { label: string; color: string; icon: any }> = {
  not_sent: { label: "Not Sent", color: "text-white/40", icon: Clock },
  draft: { label: "Draft", color: "text-amber-400", icon: Clock },
  sent: { label: "Sent", color: "text-[hsl(var(--nl-sky))]", icon: Send },
  viewed: { label: "Viewed", color: "text-[hsl(var(--nl-sky))]", icon: Eye },
  signed: { label: "Signed", color: "text-emerald-400", icon: CheckCircle2 },
  declined: { label: "Declined", color: "text-red-400", icon: Clock },
  expired: { label: "Expired", color: "text-red-400", icon: Clock },
};

export function OnboardingBundleWidget({ clientId, ownerName, ownerEmail }: Props) {
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [items, setItems] = useState<EnvelopeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: envs } = await supabase
      .from("document_envelopes")
      .select("id, status, title, share_token, sent_at, viewed_at, completed_at, recipient_name, recipient_email")
      .eq("client_id", clientId)
      .eq("envelope_type", "onboarding_bundle")
      .order("created_at", { ascending: false })
      .limit(1);
    const env = envs?.[0] || null;
    setEnvelope(env);
    if (env) {
      const { data: its } = await supabase
        .from("document_envelope_items")
        .select("id, document_name, document_url, display_order")
        .eq("envelope_id", env.id)
        .order("display_order");
      setItems(its || []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const createBundle = async () => {
    setBusy(true);
    try {
      const { data: env, error } = await supabase
        .from("document_envelopes")
        .insert({
          client_id: clientId,
          envelope_type: "onboarding_bundle",
          title: "Onboarding Documents",
          status: "draft",
          related_type: "client",
          related_id: clientId,
          recipient_name: ownerName || null,
          recipient_email: ownerEmail || null,
        })
        .select()
        .single();
      if (error || !env) throw error || new Error("Failed to create bundle");

      const rows = DEFAULT_DOCS.map((name, idx) => ({
        envelope_id: env.id,
        document_name: name,
        display_order: idx,
      }));
      const { error: itemErr } = await supabase.from("document_envelope_items").insert(rows);
      if (itemErr) throw itemErr;

      await emitEvent({
        eventKey: "onboarding_bundle_created",
        clientId,
        relatedType: "document_envelope",
        relatedId: env.id,
        payload: { envelope_id: env.id },
      });

      toast.success("Onboarding bundle created — upload documents to send");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create bundle");
    } finally {
      setBusy(false);
    }
  };

  const uploadDoc = async (itemId: string, file: File) => {
    if (file.size > 15 * 1024 * 1024) return toast.error("File must be under 15MB");
    setUploadingId(itemId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${clientId}/onboarding/${itemId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("client-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("client-logos").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("document_envelope_items")
        .update({ document_url: publicUrl })
        .eq("id", itemId);
      if (updErr) throw updErr;
      toast.success("Document uploaded");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const setUrl = async (itemId: string, url: string) => {
    await supabase.from("document_envelope_items").update({ document_url: url }).eq("id", itemId);
    setItems(items.map(i => i.id === itemId ? { ...i, document_url: url } : i));
  };

  const sendBundle = async () => {
    if (!envelope) return;
    if (!envelope.recipient_email) return toast.error("No recipient email on file");
    const missing = items.filter(i => !i.document_url);
    if (missing.length > 0) return toast.error(`Upload documents for: ${missing.map(m => m.document_name).join(", ")}`);

    setBusy(true);
    try {
      const { error } = await supabase
        .from("document_envelopes")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", envelope.id);
      if (error) throw error;

      await emitEvent({
        eventKey: "onboarding_bundle_sent",
        clientId,
        relatedType: "document_envelope",
        relatedId: envelope.id,
        payload: { envelope_id: envelope.id, recipient_email: envelope.recipient_email },
      });

      toast.success(`Bundle sent — share link ready`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    if (!envelope) return;
    const url = `${window.location.origin}/sign/${envelope.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Signing link copied");
  };

  const openLink = () => {
    if (!envelope) return;
    window.open(`${window.location.origin}/sign/${envelope.share_token}`, "_blank");
  };

  const statusKey = envelope?.status || "not_sent";
  const s = STATUS_STYLES[statusKey] || STATUS_STYLES.not_sent;
  const StatusIcon = s.icon;

  return (
    <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.12)" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
          <FileSignature className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
          Onboarding Document Bundle
          <Badge variant="outline" className="ml-auto text-[10px] bg-white/5 border-white/10 gap-1">
            <StatusIcon className={`h-2.5 w-2.5 ${s.color}`} />
            <span className={s.color}>{s.label}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-white/40">Loading…</p>
        ) : !envelope ? (
          <div className="space-y-2">
            <p className="text-xs text-white/50">
              Bundle Form ADV Part 2A, Form CRS, and the Advisory Agreement into a single signature envelope for compliance recordkeeping.
            </p>
            <Button size="sm" onClick={createBundle} disabled={busy} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white text-xs h-8 gap-1.5">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSignature className="h-3 w-3" />}
              Create Onboarding Bundle
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-[10px] text-white/40">
              <div>
                <p className="uppercase tracking-wider">Recipient</p>
                <p className="text-xs text-white/70 normal-case tracking-normal">{envelope.recipient_email || "—"}</p>
              </div>
              {envelope.sent_at && (
                <div>
                  <p className="uppercase tracking-wider">Sent</p>
                  <p className="text-xs text-white/70 normal-case tracking-normal">{new Date(envelope.sent_at).toLocaleString()}</p>
                </div>
              )}
              {envelope.viewed_at && (
                <div>
                  <p className="uppercase tracking-wider">Viewed</p>
                  <p className="text-xs text-white/70 normal-case tracking-normal">{new Date(envelope.viewed_at).toLocaleString()}</p>
                </div>
              )}
              {envelope.completed_at && envelope.status === "signed" && (
                <div>
                  <p className="uppercase tracking-wider">Signed</p>
                  <p className="text-xs text-emerald-400 normal-case tracking-normal">{new Date(envelope.completed_at).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {items.map((it) => {
                const isEditable = envelope.status === "draft";
                return (
                  <div key={it.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{it.document_name}</p>
                      {it.document_url ? (
                        <a href={it.document_url} target="_blank" rel="noreferrer" className="text-[10px] text-[hsl(var(--nl-sky))] hover:underline truncate flex items-center gap-1">
                          <ExternalLink className="h-2.5 w-2.5" /> View document
                        </a>
                      ) : (
                        <p className="text-[10px] text-white/30">No document attached</p>
                      )}
                    </div>
                    {isEditable && (
                      <>
                        <Input
                          placeholder="Paste URL"
                          value={it.document_url || ""}
                          onChange={(e) => setUrl(it.id, e.target.value)}
                          className="h-7 text-[10px] bg-white/[0.04] border-white/10 text-white w-40 hidden md:block"
                        />
                        <input
                          ref={(el) => { fileInputs.current[it.id] = el; }}
                          type="file"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(it.id, f); }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputs.current[it.id]?.click()}
                          disabled={uploadingId === it.id}
                          className="h-7 text-[10px] border-white/10 text-white hover:bg-white/10 gap-1"
                        >
                          {uploadingId === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Upload
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {envelope.status === "draft" && (
                <Button size="sm" onClick={sendBundle} disabled={busy} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white text-xs h-8 gap-1.5">
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Send Bundle
                </Button>
              )}
              {["sent", "viewed"].includes(envelope.status) && (
                <>
                  <Button size="sm" variant="outline" onClick={copyLink} className="border-white/10 text-white hover:bg-white/10 text-xs h-8 gap-1.5">
                    <Copy className="h-3 w-3" /> Copy Signing Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={openLink} className="border-white/10 text-white hover:bg-white/10 text-xs h-8 gap-1.5">
                    <ExternalLink className="h-3 w-3" /> Open Signing Page
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={load} className="text-white/50 hover:text-white text-xs h-8 gap-1.5">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
