import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, PhoneCall, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHANNELS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "website", label: "Website" },
  { value: "organic_seo", label: "Organic SEO" },
  { value: "print", label: "Print" },
  { value: "referral", label: "Referral" },
];

interface TrackingNumber {
  id: string;
  client_id: string;
  channel: string;
  label: string;
  twilio_number: string;
  forwards_to: string;
  active: boolean;
  created_at: string;
}

const channelLabel = (v: string) => CHANNELS.find((c) => c.value === v)?.label || v;

export default function AdminChannelTracking() {
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [rows, setRows] = useState<TrackingNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);

  const [channel, setChannel] = useState<string>("google_ads");
  const [label, setLabel] = useState("");
  const [forwardsTo, setForwardsTo] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, business_name")
        .order("business_name");
      const list = (data || []) as { id: string; business_name: string }[];
      setClients(list);
      if (list.length && !clientId) setClientId(list[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRows = async (cid: string) => {
    if (!cid) return;
    const { data, error } = await supabase
      .from("channel_tracking_numbers")
      .select("*")
      .eq("client_id", cid)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows((data || []) as TrackingNumber[]);
  };

  useEffect(() => { if (clientId) fetchRows(clientId); }, [clientId]);

  const toggleActive = async (row: TrackingNumber, next: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: next } : r)));
    const { error } = await supabase.from("channel_tracking_numbers").update({ active: next }).eq("id", row.id);
    if (error) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: row.active } : r)));
      toast.error(error.message);
    }
  };

  const handleProvision = async () => {
    if (!clientId) return toast.error("Select a client first");
    if (!label.trim()) return toast.error("Add a label so the number is identifiable");
    const normalized = forwardsTo.trim().replace(/[^\d+]/g, "");
    const e164 = normalized.startsWith("+")
      ? normalized
      : normalized.length === 10 ? `+1${normalized}`
      : normalized.length === 11 && normalized.startsWith("1") ? `+${normalized}` : normalized;
    if (!/^\+[1-9]\d{6,14}$/.test(e164)) return toast.error("Enter a valid forwarding number, e.g. +1 805 555 1234");

    setProvisioning(true);
    const { data, error } = await supabase.functions.invoke("provision-tracking-number", {
      body: { client_id: clientId, channel, label: label.trim(), forwards_to: e164 },
    });
    setProvisioning(false);

    const failure = (error as any)?.message ? await extractError(error) : (data as any)?.error;
    if (failure) return toast.error(failure, { duration: 8000 });

    toast.success(`Provisioned ${(data as any)?.tracking_number?.twilio_number}`);
    setLabel(""); setForwardsTo("");
    fetchRows(clientId);
  };

  const extractError = async (error: any): Promise<string> => {
    try {
      const text = await error?.context?.text?.();
      if (text) {
        try { return JSON.parse(text).error || text; } catch { return text; }
      }
    } catch { /* fall through */ }
    return error?.message || "Provisioning failed";
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-primary" /> Call Tracking Numbers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provision a dedicated Twilio number per marketing channel. Calls are logged to attribution, then forwarded to the client's real line.
          </p>
        </div>
        <div className="w-64">
          <label className="text-xs text-muted-foreground mb-1 block">Client</label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name || "Untitled"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add tracking number
          </h2>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Channel</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Google Ads - Search" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Forwards to</label>
              <Input value={forwardsTo} onChange={(e) => setForwardsTo(e.target.value)} placeholder="+1 805 555 1234" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleProvision} disabled={provisioning} className="w-full">
                {provisioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
                {provisioning ? "Provisioning…" : "Provision number"}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            A new number is purchased on Twilio, preferring the client's area code and falling back to any available US local number.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No tracking numbers for this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left p-3">Channel</th>
                    <th className="text-left p-3">Label</th>
                    <th className="text-left p-3">Tracking number</th>
                    <th className="text-left p-3">Forwards to</th>
                    <th className="text-left p-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3"><Badge variant="outline">{channelLabel(r.channel)}</Badge></td>
                      <td className="p-3 text-foreground">{r.label}</td>
                      <td className="p-3 font-mono text-xs text-foreground">{r.twilio_number}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{r.forwards_to}</td>
                      <td className="p-3">
                        <Switch checked={r.active} onCheckedChange={(v) => toggleActive(r, v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
