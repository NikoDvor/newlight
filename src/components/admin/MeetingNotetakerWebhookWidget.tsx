import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Eye, EyeOff, Mic, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props { clientId: string; }

const VENDORS = [
  { value: "jump", label: "Jump" },
  { value: "zocks", label: "Zocks" },
  { value: "zeplyn", label: "Zeplyn" },
  { value: "other", label: "Other" },
];

const SUPABASE_URL = "https://irvrmkshjcyabjubihmp.supabase.co";

const generateSecret = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
};

export function MeetingNotetakerWebhookWidget({ clientId }: Props) {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [vendor, setVendor] = useState("other");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meeting_notetaker_configs" as any)
      .select("*").eq("client_id", clientId).maybeSingle();
    setCfg(data);
    if (data) setVendor((data as any).vendor_name || "other");
    setLoading(false);
  };
  useEffect(() => { load(); }, [clientId]);

  const webhookUrl = `${SUPABASE_URL}/functions/v1/meeting-notetaker-webhook/${clientId}`;

  const createOrRotate = async () => {
    const secret = generateSecret();
    if (cfg) {
      const { error } = await supabase.from("meeting_notetaker_configs" as any)
        .update({ webhook_secret: secret, vendor_name: vendor, is_active: true } as any)
        .eq("id", cfg.id);
      if (error) return toast.error(error.message);
      toast.success("Secret rotated");
    } else {
      const { error } = await supabase.from("meeting_notetaker_configs" as any)
        .insert({ client_id: clientId, webhook_secret: secret, vendor_name: vendor } as any);
      if (error) return toast.error(error.message);
      toast.success("Webhook secret created");
    }
    setReveal(true);
    load();
  };

  const updateVendor = async (v: string) => {
    setVendor(v);
    if (cfg) {
      await supabase.from("meeting_notetaker_configs" as any)
        .update({ vendor_name: v } as any).eq("id", cfg.id);
    }
  };

  const toggleActive = async () => {
    if (!cfg) return;
    await supabase.from("meeting_notetaker_configs" as any)
      .update({ is_active: !cfg.is_active } as any).eq("id", cfg.id);
    load();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.12)" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
          AI Meeting Notetaker Webhook
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-white/40">
          Point Jump, Zocks, Zeplyn (or any notetaker) at this URL to auto-ingest transcripts, action items, and follow-ups.
        </p>

        <div>
          <label className="text-[10px] uppercase text-white/40">Vendor</label>
          <Select value={vendor} onValueChange={updateVendor}>
            <SelectTrigger className="bg-white/[0.04] border-white/10 text-white h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VENDORS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] uppercase text-white/40">Webhook URL</label>
          <div className="flex gap-1">
            <Input value={webhookUrl} readOnly className="bg-white/[0.04] border-white/10 text-white/70 text-[11px] font-mono h-8" />
            <Button size="sm" variant="outline" onClick={() => copy(webhookUrl, "URL")}
              className="border-white/10 h-8 px-2"><Copy className="h-3 w-3" /></Button>
          </div>
        </div>

        {cfg ? (
          <>
            <div>
              <label className="text-[10px] uppercase text-white/40">Webhook Secret (send as x-webhook-secret header)</label>
              <div className="flex gap-1">
                <Input value={reveal ? cfg.webhook_secret : "•".repeat(32)} readOnly
                  className="bg-white/[0.04] border-white/10 text-white/70 text-[11px] font-mono h-8" />
                <Button size="sm" variant="outline" onClick={() => setReveal(r => !r)}
                  className="border-white/10 h-8 px-2">
                  {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy(cfg.webhook_secret, "Secret")}
                  className="border-white/10 h-8 px-2"><Copy className="h-3 w-3" /></Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={createOrRotate}
                className="border-white/10 text-white/70 gap-1 h-7 text-[11px]">
                <RefreshCw className="h-3 w-3" /> Rotate secret
              </Button>
              <Button size="sm" variant="outline" onClick={toggleActive}
                className={`border-white/10 h-7 text-[11px] ${cfg.is_active ? 'text-emerald-400' : 'text-white/40'}`}>
                {cfg.is_active ? "Active" : "Disabled"} — toggle
              </Button>
            </div>
          </>
        ) : (
          <Button size="sm" onClick={createOrRotate}
            className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-8 text-xs">
            Generate webhook secret
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
