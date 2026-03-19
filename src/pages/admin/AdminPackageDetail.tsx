import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BackArrow } from "@/components/BackArrow";
import { Package, DollarSign, Calendar, Layers, ArrowUpRight, Check, X } from "lucide-react";

export default function AdminPackageDetail() {
  const { id } = useParams<{ id: string }>();
  const [pkg, setPkg] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [allPkgs, setAllPkgs] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("offer_packages").select("*").eq("id", id).single(),
      supabase.from("package_deliverables").select("*").eq("package_id", id).order("display_order"),
      supabase.from("package_relationships").select("*").or(`source_package_id.eq.${id},related_package_id.eq.${id}`),
      supabase.from("offer_packages").select("id,package_name"),
    ]).then(([p, d, r, a]) => {
      setPkg(p.data);
      setDeliverables(d.data || []);
      setRelationships(r.data || []);
      setAllPkgs(a.data || []);
    });
  }, [id]);

  if (!pkg) return <div className="text-white/40 text-center py-16">Loading…</div>;

  const getName = (pkgId: string) => allPkgs.find(p => p.id === pkgId)?.package_name || "Unknown";

  return (
    <div className="space-y-6">
      <BackArrow to="/admin/packages" label="Packages" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.15)" }}>
          <Package className="h-5 w-5 text-[hsl(var(--nl-neon))]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{pkg.package_name}</h1>
          <p className="text-xs text-white/40 font-mono">{pkg.package_key}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">{pkg.package_status}</Badge>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-white/40 mb-1">Setup Fee</p>
            <p className="text-xl font-bold text-white">${pkg.default_setup_fee?.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-white/40 mb-1">Monthly Fee</p>
            <p className="text-xl font-bold text-[hsl(var(--nl-sky))]">${pkg.default_monthly_fee?.toLocaleString()}/mo</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-white/40 mb-1">Contract</p>
            <p className="text-xl font-bold text-white">{pkg.default_contract_length_months} months</p>
          </CardContent>
        </Card>
      </div>

      {pkg.description && (
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-4">
            <p className="text-xs text-white/70">{pkg.description}</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 bg-white/[0.04]">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-white flex items-center gap-2"><Layers className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Deliverables ({deliverables.length})</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          {deliverables.length === 0 ? <p className="text-xs text-white/30 py-4 text-center">No deliverables defined</p> : (
            <div className="space-y-1.5">
              {deliverables.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-sm text-white/70">
                  {d.is_included_by_default ? <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <X className="h-3.5 w-3.5 text-white/20 shrink-0" />}
                  <span>{d.deliverable_name}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] border-white/10 text-white/30">{d.deliverable_category}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {relationships.length > 0 && (
        <Card className="border-0 bg-white/[0.04]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Relationships</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {relationships.map(r => {
              const otherId = r.source_package_id === id ? r.related_package_id : r.source_package_id;
              const direction = r.source_package_id === id ? "→" : "←";
              return (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">{r.relationship_type}</Badge>
                  <span className="text-white/40">{direction}</span>
                  <Link to={`/admin/packages/${otherId}`} className="text-[hsl(var(--nl-sky))] hover:underline">{getName(otherId)}</Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
