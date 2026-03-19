import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Package, Check, ArrowUpRight } from "lucide-react";

export function ClientPackageView() {
  const { activeClientId } = useWorkspace();
  const [pkg, setPkg] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    // Find subscription → package link for this client
    const load = async () => {
      // Try to get package from client's subscription or billing
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("package_id")
        .eq("client_id", activeClientId)
        .eq("subscription_status", "active")
        .limit(1)
        .maybeSingle();

      const pkgId = (sub as any)?.package_id;
      if (!pkgId) { setLoading(false); return; }

      const [p, d] = await Promise.all([
        supabase.from("offer_packages").select("*").eq("id", pkgId).single(),
        supabase.from("package_deliverables").select("*").eq("package_id", pkgId).eq("is_included_by_default", true).order("display_order"),
      ]);
      setPkg(p.data);
      setDeliverables(d.data || []);
      setLoading(false);
    };
    load();
  }, [activeClientId]);

  if (loading) return null;
  if (!pkg) return null; // No package linked — hide component

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Your Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">{pkg.package_name}</p>
            {pkg.service_focus && <p className="text-xs text-muted-foreground">{pkg.service_focus}</p>}
          </div>
          <Badge variant="secondary" className="text-xs">{pkg.package_category}</Badge>
        </div>

        {pkg.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Setup</p>
            <p className="text-sm font-bold">${pkg.default_setup_fee?.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Monthly</p>
            <p className="text-sm font-bold text-primary">${pkg.default_monthly_fee?.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Term</p>
            <p className="text-sm font-bold">{pkg.default_contract_length_months}mo</p>
          </div>
        </div>

        {deliverables.length > 0 && (
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5">What's Included</p>
            <div className="space-y-1">
              {deliverables.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-xs text-foreground/80">
                  <Check className="h-3 w-3 text-primary shrink-0" /> {d.deliverable_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
