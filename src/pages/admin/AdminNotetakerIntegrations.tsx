import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mic, ExternalLink, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Row {
  client_id: string;
  business_name: string;
  vendor_name: string | null;
  is_active: boolean | null;
  has_config: boolean;
  last_event_at: string | null;
}

export default function AdminNotetakerIntegrations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [clientsRes, cfgRes, evtRes] = await Promise.all([
        supabase.from("clients").select("id, business_name").order("business_name"),
        supabase.from("meeting_notetaker_configs" as any).select("client_id, vendor_name, is_active"),
        supabase.from("automation_events").select("client_id, created_at").eq("event_type", "meeting_transcript_received").order("created_at", { ascending: false }),
      ]);
      const clients = (clientsRes.data as any[]) ?? [];
      const cfgs = (cfgRes.data as any[]) ?? [];
      const evts = (evtRes.data as any[]) ?? [];
      const cfgMap = new Map(cfgs.map(c => [c.client_id, c]));
      const lastEventMap = new Map<string, string>();
      for (const e of evts) {
        if (!lastEventMap.has(e.client_id)) lastEventMap.set(e.client_id, e.created_at);
      }
      const list: Row[] = clients.map(c => {
        const cfg = cfgMap.get(c.id);
        return {
          client_id: c.id,
          business_name: c.business_name || "Unnamed",
          vendor_name: cfg?.vendor_name ?? null,
          is_active: cfg?.is_active ?? null,
          has_config: !!cfg,
          last_event_at: lastEventMap.get(c.id) ?? null,
        };
      });
      // Sort: configured (active first), then unconfigured
      list.sort((a, b) => {
        const rank = (r: Row) => (r.has_config && r.is_active ? 0 : r.has_config ? 1 : 2);
        return rank(a) - rank(b) || a.business_name.localeCompare(b.business_name);
      });
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const configured = rows.filter(r => r.has_config).length;
  const active = rows.filter(r => r.has_config && r.is_active).length;
  const receiving = rows.filter(r => r.last_event_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meeting Notetaker Integrations"
        description="Webhook status for every client's AI-notetaker (Jump / Zocks / Zeplyn / other). Open a client's lifecycle page to rotate secrets or add a new vendor."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Clients", value: rows.length },
          { label: "Configured", value: configured },
          { label: "Active Webhooks", value: active },
          { label: "Receiving Events", value: receiving },
        ].map(k => (
          <Card key={k.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{k.label}</p>
              <p className="text-lg font-semibold text-white mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 bg-white/[0.04]">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-white/40">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-white/40">No clients yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Client</TableHead>
                  <TableHead className="text-white/60">Vendor</TableHead>
                  <TableHead className="text-white/60">Webhook Status</TableHead>
                  <TableHead className="text-white/60">Last Transcript</TableHead>
                  <TableHead className="text-white/60 text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.client_id} className="border-white/10 hover:bg-white/[0.03]">
                    <TableCell className="text-white font-medium">{r.business_name}</TableCell>
                    <TableCell className="text-white/70">
                      {r.vendor_name ? <Badge variant="outline" className="capitalize">{r.vendor_name}</Badge> : <span className="text-white/30">—</span>}
                    </TableCell>
                    <TableCell>
                      {!r.has_config ? (
                        <span className="inline-flex items-center gap-1 text-xs text-white/40"><MinusCircle className="h-3.5 w-3.5" /> Not configured</span>
                      ) : r.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400"><XCircle className="h-3.5 w-3.5" /> Inactive</span>
                      )}
                    </TableCell>
                    <TableCell className="text-white/60 text-xs">
                      {r.last_event_at ? `${formatDistanceToNow(new Date(r.last_event_at))} ago` : <span className="text-white/30">Never</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost" className="text-[hsl(var(--nl-neon))] hover:bg-white/5 h-7">
                        <Link to={`/admin/clients/${r.client_id}/lifecycle`}>
                          Open <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
