import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, MessageSquare, Send, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  clientId: string;
  contactId: string;
  defaultPhone?: string | null;
}

interface TextRow {
  id: string;
  direction: "outbound" | "inbound";
  phone_number: string;
  message_body: string;
  sent_at: string;
  twilio_message_sid: string | null;
  send_status: string;
  error_note: string | null;
}

export function ContactTextMessages({ clientId, contactId, defaultPhone }: Props) {
  const [messages, setMessages] = useState<TextRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [phone, setPhone] = useState(defaultPhone || "");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_text_messages" as any)
      .select("*")
      .eq("contact_id", contactId)
      .eq("client_id", clientId)
      .order("sent_at", { ascending: false })
      .limit(200);
    setMessages((data as any) || []);
    setLoading(false);
  }, [clientId, contactId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (defaultPhone && !phone) setPhone(defaultPhone); }, [defaultPhone]);

  const send = async () => {
    if (!phone.trim() || !body.trim()) {
      toast({ title: "Phone and message required", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-compliance-text", {
      body: { client_id: clientId, contact_id: contactId, phone_number: phone.trim(), message_body: body.trim() },
    });
    setSending(false);
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      await load(); // failure may still have been logged
      return;
    }
    if (data?.success) {
      toast({ title: "Text sent", description: "Logged to compliance record." });
      setBody("");
    } else {
      toast({
        title: "Send failed — logged for audit",
        description: data?.error_note || "See recordkeeping log below.",
        variant: "destructive",
      });
    }
    await load();
  };

  return (
    <div className="space-y-4">
      {/* Non-dismissible compliance notice */}
      <div className="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-amber-200 mb-1 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Regulatory recordkeeping notice — read every time
          </p>
          <p className="text-amber-100/90">
            This log records every outbound and inbound text message (append-only; users cannot edit or delete
            entries). <strong>Whether this alone satisfies recordkeeping is a legal determination.</strong> If
            your firm is a <strong>Registered Investment Adviser</strong>, this log is generally adequate under
            SEC Rule 204-2 (no third-party custodian required). If any client is served through a{" "}
            <strong>broker-dealer</strong>, SEC Rule 17a-4 requires an <strong>independent third-party
            custodian</strong> (e.g. Redtail Speak, Archive Intel, Smarsh) — this log alone is <strong>not
            sufficient</strong>. Confirm with your compliance counsel before relying on this system for any
            broker-dealer-affiliated clients.
          </p>
        </div>
      </div>

      {/* Composer */}
      <DataCard title="Send Text">
        <div className="space-y-2">
          <Input
            placeholder="+15555551234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Textarea
            rows={3}
            placeholder="Message body (max 1600 chars)"
            value={body}
            maxLength={1600}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">{body.length}/1600</p>
            <Button size="sm" onClick={send} disabled={sending || !phone.trim() || !body.trim()}>
              {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send &amp; Log
            </Button>
          </div>
        </div>
      </DataCard>

      {/* Log */}
      <DataCard title="Text Message Log (read-only, append-only)">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No text messages recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="p-3 rounded-xl bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px]">{m.direction}</Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      m.send_status === "sent"
                        ? "text-emerald-600 border-emerald-500/40"
                        : "text-red-500 border-red-500/40"
                    }`}
                  >
                    {m.send_status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{m.phone_number}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(m.sent_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{m.message_body}</p>
                {m.error_note && (
                  <p className="text-[11px] text-red-400 mt-1">Error: {m.error_note}</p>
                )}
                {m.twilio_message_sid && (
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">SID: {m.twilio_message_sid}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DataCard>
    </div>
  );
}
