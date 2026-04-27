import { useMemo, useState } from "react";
import { Copy, Eye, Mail, MessageSquare, Send, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { buildAppDownloadUrl } from "@/lib/appDownloadLink";
import { toast } from "sonner";

type ClientForAppLink = {
  id: string;
  business_name: string;
  workspace_slug: string | null;
  owner_name?: string | null;
  owner_email: string | null;
  owner_phone?: string | null;
  sms_consent?: boolean | null;
};

interface Props {
  client: ClientForAppLink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

export function SendAppLinkDialog({ client, open, onOpenChange, onSent }: Props) {
  const [sending, setSending] = useState<"email" | "sms" | "both" | null>(null);
  const appLink = useMemo(() => client?.workspace_slug ? buildAppDownloadUrl(client.workspace_slug) : "", [client?.workspace_slug]);

  const send = async (mode: "email" | "sms" | "both") => {
    if (!client?.workspace_slug || !client.owner_email) {
      toast.error("Client needs a workspace slug and owner email first");
      return;
    }
    if ((mode === "sms" || mode === "both") && !client.owner_phone) {
      toast.error("No owner phone number on file");
      return;
    }

    setSending(mode);
    const { data, error } = await supabase.functions.invoke("send-handoff-message", {
      body: {
        client_id: client.id,
        business_name: client.business_name,
        owner_name: client.owner_name || undefined,
        owner_email: client.owner_email,
        owner_phone: client.owner_phone || null,
        preferred_contact_method: mode === "both" ? "both" : mode,
        sms_consent: Boolean(client.sms_consent || mode === "sms" || mode === "both"),
        workspace_slug: client.workspace_slug,
        base_url: window.location.origin,
        send_email: mode === "email" || mode === "both",
        send_sms: mode === "sms" || mode === "both",
      },
    });
    setSending(null);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "App link send failed");
      return;
    }

    const parts = [];
    if (mode !== "sms") parts.push(data?.email_status === "sent" ? "email sent" : data?.email_status || "email queued");
    if (mode !== "email") parts.push(data?.sms_status === "sent" ? "SMS sent" : data?.sms_status || "SMS queued");
    toast.success(`App link ${parts.join(" · ")}`);
    onSent?.();
  };

  const copy = async () => {
    if (!appLink) return;
    await navigator.clipboard.writeText(appLink);
    toast.success("App download link copied");
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2"><Smartphone className="h-4 w-4" /> Send App Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-white/[0.05] border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">{client.business_name}</p>
            <p className="text-xs text-white/45 mt-1">Permanent branded app download page</p>
            <div className="mt-3 flex gap-2">
              <Input value={appLink || "Missing workspace slug"} readOnly className="bg-white/[0.06] border-white/10 text-white/70 text-xs" />
              <Button size="icon" onClick={copy} disabled={!appLink} className="bg-white/10 hover:bg-white/20 text-white"><Copy className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.open(appLink, "_blank")} disabled={!appLink} className="border-white/10 text-white hover:bg-white/10 gap-2">
              <Eye className="h-4 w-4" /> Preview Page
            </Button>
            <Button variant="outline" onClick={copy} disabled={!appLink} className="border-white/10 text-white hover:bg-white/10 gap-2">
              <Copy className="h-4 w-4" /> Copy Raw Link
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={() => send("sms")} disabled={sending !== null || !client.owner_phone} className="bg-white/10 hover:bg-white/20 text-white gap-2">
              <MessageSquare className="h-4 w-4" /> {sending === "sms" ? "Sending…" : "SMS"}
            </Button>
            <Button onClick={() => send("email")} disabled={sending !== null || !client.owner_email} className="bg-white/10 hover:bg-white/20 text-white gap-2">
              <Mail className="h-4 w-4" /> {sending === "email" ? "Sending…" : "Email"}
            </Button>
            <Button onClick={() => send("both")} disabled={sending !== null || !client.owner_email || !client.owner_phone} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-2">
              <Send className="h-4 w-4" /> {sending === "both" ? "Sending…" : "Both"}
            </Button>
          </div>

          <p className="text-[11px] text-white/40">SMS requires an owner phone number. Email will send when app email delivery is configured; otherwise the preview is still available for manual sharing.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
