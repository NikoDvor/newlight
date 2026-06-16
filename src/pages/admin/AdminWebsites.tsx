import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Globe, ExternalLink, Search, Filter, Plus, Settings, X } from "lucide-react";
import { motion } from "framer-motion";

const BUILD_STATUS_STYLE: Record<string, string> = {
  not_started: "bg-secondary text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  live: "bg-emerald-50 text-emerald-700",
  needs_update: "bg-amber-50 text-amber-700",
};

const DOMAIN_STATUS_STYLE: Record<string, string> = {
  none: "bg-secondary text-muted-foreground",
  pending: "bg-amber-50 text-amber-700",
  connected: "bg-emerald-50 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
};

export default function AdminWebsites() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBuild, setFilterBuild] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("client_websites")
      .select("*, clients(business_name, industry, primary_location)")
      .order("updated_at", { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  const filtered = rows.filter(r => {
    const name = (r.clients?.business_name || "").toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterBuild !== "all" && r.build_status !== filterBuild) return false;
    if (filterType !== "all" && r.site_type !== filterType) return false;
    return true;
  });

  const liveCount = rows.filter(r => r.build_status === "live").length;
  const inProgressCount = rows.filter(r => r.build_status === "in_progress").length;
  const needsUpdateCount = rows.filter(r => r.build_status === "needs_update").length;
  const connectedDomains = rows.filter(r => r.domain_status === "connected").length;

  return (
    <div>
      <PageHeader title="Website Management" description="Overview of all client website records and build status" />

      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Live Sites" value={String(liveCount)} change={String(inProgressCount) + " in progress"} changeType="positive" icon={Globe} />
        <MetricCard label="Needs Update" value={String(needsUpdateCount)} change="require attention" changeType={needsUpdateCount > 0 ? "negative" : "neutral"} icon={Settings} />
        <MetricCard label="Connected Domains" value={String(connectedDomains)} change="custom domains active" changeType="positive" icon={ExternalLink} />
        <MetricCard label="Total Records" value={String(rows.length)} change="tracked websites" changeType="neutral" icon={Filter} />
      </WidgetGrid>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 bg-background border-border"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="newlight_build">NewLight Build</SelectItem>
            <SelectItem value="external">External</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBuild} onValueChange={setFilterBuild}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="needs_update">Needs Update</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <DataCard title="Loading Websites">
            <div className="py-10 text-center">
              <Globe className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading websites...</p>
            </div>
          </DataCard>
        ) : filtered.length === 0 ? (
          <DataCard title="No Results">
            <div className="py-10 text-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {rows.length === 0 ? "No website records yet" : "No results match your filters"}
              </p>
              <p className="text-xs text-muted-foreground">
                {rows.length === 0 ? "Open a client workspace and go to Website → Site tab to add a record." : "Try adjusting your search or filters."}
              </p>
            </div>
          </DataCard>
        ) : (
          filtered.map((r, i) => {
            const url = r.site_type === "newlight_build" ? (r.published_url || r.custom_domain) : r.external_url;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <DataCard title={`${r.clients?.business_name || "Website Record"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {r.clients?.business_name || "Unknown Client"}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {r.site_type === "newlight_build" ? "NewLight Build" : "External"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {r.clients?.industry || "—"} · {r.clients?.primary_location || "—"}
                        {url && ` · ${url}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-[10px] ${BUILD_STATUS_STYLE[r.build_status] || "bg-secondary text-muted-foreground"}`}>
                        {r.build_status?.replace(/_/g, " ")}
                      </Badge>
                      {r.site_type === "newlight_build" && (
                        <Badge className={`text-[10px] ${DOMAIN_STATUS_STYLE[r.domain_status] || "bg-secondary text-muted-foreground"}`}>
                          Domain: {r.domain_status}
                        </Badge>
                      )}
                      {r.site_type === "external" && (
                        <Badge className={`text-[10px] ${r.snippet_status === "installed" ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                          Snippet: {r.snippet_status?.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {url && (
                        <Button size="sm" variant="outline" onClick={() => window.open(url.startsWith("http") ? url : `https://${url}`, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Visit
                        </Button>
                      )}
                      {r.site_type === "newlight_build" && r.lovable_project_url && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(r.lovable_project_url, "_blank")}>
                          <Globe className="h-3.5 w-3.5 mr-1" /> Open in Lovable
                        </Button>
                      )}
                    </div>
                  </div>
                  {r.notes && (
                    <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-2">{r.notes}</p>
                  )}
                </DataCard>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
