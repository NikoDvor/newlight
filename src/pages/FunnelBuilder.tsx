import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowRight, Users, TrendingUp, Eye, Plus, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";

interface FunnelRow {
  id: string;
  name: string;
  isActive: boolean;
  submissions: number;
  contactsFromSubs: number;
  dealsFromContacts: number;
}

export default function FunnelBuilder() {
  const { activeClientId } = useContext(WorkspaceContext);
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: forms } = await supabase
        .from("forms")
        .select("id, form_name, is_active")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false });

      const formIds = (forms ?? []).map((f) => f.id);
      const { data: subs } = formIds.length
        ? await supabase
            .from("form_submissions")
            .select("form_id, contact_id")
            .in("form_id", formIds)
        : { data: [] as any[] };

      const contactIds = Array.from(
        new Set((subs ?? []).map((s: any) => s.contact_id).filter(Boolean))
      );
      const { data: deals } = contactIds.length
        ? await supabase
            .from("crm_deals")
            .select("contact_id")
            .eq("client_id", activeClientId)
            .in("contact_id", contactIds)
        : { data: [] as any[] };
      const dealContactSet = new Set((deals ?? []).map((d: any) => d.contact_id));

      const result: FunnelRow[] = (forms ?? []).map((f) => {
        const formSubs = (subs ?? []).filter((s: any) => s.form_id === f.id);
        const uniqueContacts = new Set(formSubs.map((s: any) => s.contact_id).filter(Boolean));
        let converted = 0;
        uniqueContacts.forEach((cid) => { if (dealContactSet.has(cid)) converted++; });
        return {
          id: f.id,
          name: f.form_name,
          isActive: f.is_active,
          submissions: formSubs.length,
          contactsFromSubs: uniqueContacts.size,
          dealsFromContacts: converted,
        };
      });

      if (!mounted) return;
      setRows(result);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [activeClientId]);

  const totalSubs = rows.reduce((a, r) => a + r.submissions, 0);
  const totalDeals = rows.reduce((a, r) => a + r.dealsFromContacts, 0);
  const activeCount = rows.filter((r) => r.isActive).length;
  const avgCvr = totalSubs > 0 ? ((totalDeals / totalSubs) * 100).toFixed(1) + "%" : "—";

  const cvr = (r: FunnelRow) => r.submissions > 0 ? ((r.dealsFromContacts / r.submissions) * 100).toFixed(1) + "%" : "—";

  return (
    <div>
      <PageHeader title="Funnel Analytics" description="Real conversion data from your forms into pipeline deals">
        <Link to="/forms"><Button className="gap-1.5"><Plus className="h-4 w-4" /> Manage Forms</Button></Link>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Active Forms" value={String(activeCount)} change={`${rows.length} total`} changeType="neutral" icon={GitBranch} />
        <MetricCard label="Total Submissions" value={String(totalSubs)} change="Across all forms" changeType="neutral" icon={Users} />
        <MetricCard label="Deals Created" value={String(totalDeals)} change="From submitted contacts" changeType="neutral" icon={TrendingUp} />
        <MetricCard label="Avg. Conversion" value={avgCvr} change="Submissions → deals" changeType="neutral" icon={Eye} />
      </WidgetGrid>

      <div className="grid gap-6 mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-1">No Forms Yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create a form to start capturing leads and tracking conversions into your pipeline.
            </p>
            <Link to="/forms"><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Create a Form</Button></Link>
          </div>
        ) : rows.map((funnel) => (
          <motion.div
            key={funnel.id}
            className="card-widget p-6 rounded-2xl"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">{funnel.name}</h3>
                <p className="text-xs text-muted-foreground">Form → Contact → Deal</p>
              </div>
              <Badge className={funnel.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-secondary text-muted-foreground"}>
                {funnel.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <div className="rounded-xl border px-4 py-3 min-w-[160px] bg-blue-50 border-blue-200 text-blue-700">
                <p className="text-xs font-semibold">Submissions</p>
                <p className="text-lg font-bold tabular-nums mt-1">{funnel.submissions}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="rounded-xl border px-4 py-3 min-w-[160px] bg-violet-50 border-violet-200 text-violet-700">
                <p className="text-xs font-semibold">Contacts Captured</p>
                <p className="text-lg font-bold tabular-nums mt-1">{funnel.contactsFromSubs}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="rounded-xl border px-4 py-3 min-w-[160px] bg-emerald-50 border-emerald-200 text-emerald-700">
                <p className="text-xs font-semibold">Deals Created</p>
                <p className="text-lg font-bold tabular-nums mt-1">{funnel.dealsFromContacts}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>Submission → Deal Conversion: <span className="font-semibold text-foreground tabular-nums">{cvr(funnel)}</span></span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
