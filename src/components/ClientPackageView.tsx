import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Package, Check, ArrowUpRight, DollarSign, Phone, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function ClientPackageView() {
  const { activeClientId } = useWorkspace();
  const [pkg, setPkg] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    const load = async () => {
      // Try to find active subscription → package
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

      // Find upsell relationships
      const { data: rels } = await supabase
        .from("package_relationships")
        .select("related_package_id, relationship_type")
        .eq("source_package_id", pkgId)
        .in("relationship_type", ["Upsell", "Add-On"]);

      if (rels && rels.length > 0) {
        const upIds = rels.map((r: any) => r.related_package_id);
        const { data: upPkgs } = await supabase
          .from("offer_packages")
          .select("id, package_name, service_focus, default_monthly_fee")
          .in("id", upIds)
          .eq("is_active", true);
        setUpgrades((upPkgs || []).map((u: any) => ({
          ...u,
          type: rels.find((r: any) => r.related_package_id === u.id)?.relationship_type,
        })));
      }

      setLoading(false);
    };
    load();
  }, [activeClientId]);

  if (loading) return null;
  if (!pkg) return null;

  // Group deliverables by category
  const grouped: Record<string, any[]> = {};
  deliverables.forEach(d => {
    const cat = d.deliverable_category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(d);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-primary/[0.03]">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Your Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">{pkg.package_name}</p>
              {pkg.service_focus && <p className="text-xs text-muted-foreground">{pkg.service_focus}</p>}
            </div>
            <Badge variant="secondary" className="text-xs">{pkg.package_category}</Badge>
          </div>

          {pkg.description && <p className="text-xs text-muted-foreground leading-relaxed">{pkg.description}</p>}

          {/* Deliverables by category */}
          {Object.entries(grouped).length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Included in Your Plan</p>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-primary mb-1">{cat}</p>
                  <div className="grid gap-1">
                    {items.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-2 text-xs py-0.5">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-foreground">{d.deliverable_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upgrade paths */}
          {upgrades.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Growth Upgrades Available
              </p>
              {upgrades.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{u.package_name}</p>
                    <p className="text-[10px] text-muted-foreground">{u.service_focus}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">${u.default_monthly_fee?.toLocaleString()}/mo</span>
                    <Badge variant="outline" className="text-[9px]">{u.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <a href="tel:+18058363557">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                <Phone className="h-3.5 w-3.5" /> Contact Expert — (805) 836-3557
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
