import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BackArrow } from "@/components/BackArrow";
import { Package, DollarSign, Calendar, Layers, ArrowUpRight, Check, X, Pencil, FileText, Zap, Link2, Sparkles } from "lucide-react";

export default function AdminPackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [recLinks, setRecLinks] = useState<any[]>([]);
  const [proposalLinks, setProposalLinks] = useState<any[]>([]);
  const [activationDefaults, setActivationDefaults] = useState<any>(null);
  const [billingDefaults, setBillingDefaults] = useState<any>(null);
  const [allPkgs, setAllPkgs] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("offer_packages").select("*").eq("id", id).single(),
      supabase.from("package_deliverables").select("*").eq("package_id", id).order("display_order"),
      supabase.from("package_relationships").select("*").or(`source_package_id.eq.${id},related_package_id.eq.${id}`),
      supabase.from("offer_packages").select("id,package_name"),
      supabase.from("recommendation_package_links").select("*").eq("package_id", id),
      supabase.from("package_proposal_links").select("*").eq("package_id", id),
      supabase.from("package_activation_defaults").select("*").eq("package_id", id).maybeSingle(),
      supabase.from("package_billing_defaults").select("*").eq("package_id", id).maybeSingle(),
    ]).then(([p, d, r, a, rec, prop, act, bill]) => {
      setPkg(p.data);
      setDeliverables(d.data || []);
      setRelationships(r.data || []);
      setAllPkgs(a.data || []);
      setRecLinks(rec.data || []);
      setProposalLinks(prop.data || []);
      setActivationDefaults(act.data);
      setBillingDefaults(bill.data);
    });
  }, [id]);

  if (!pkg) return <div className="text-white/40 text-center py-16">Loading…</div>;

  const getName = (pkgId: string) => allPkgs.find(p => p.id === pkgId)?.package_name || "Unknown";

  const statusColor: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Draft: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Archived: "bg-white/10 text-white/40 border-white/10",
  };

  // Group deliverables by category
  const grouped: Record<string, any[]> = {};
  deliverables.forEach(d => {
    const cat = d.deliverable_category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(d);
  });

  return (
    <div className="space-y-6">
      <BackArrow to="/admin/packages" label="Packages" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.15)" }}>
            <Package className="h-5 w-5 text-[hsl(var(--nl-neon))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{pkg.package_name}</h1>
            <p className="text-xs text-white/40 font-mono">{pkg.package_key}</p>
          </div>
          <Badge variant="outline" className={`ml-2 text-xs ${statusColor[pkg.package_status] || statusColor.Draft}`}>{pkg.package_status}</Badge>
        </div>
        <Button onClick={() => navigate("/admin/packages", { state: { editId: pkg.id } })} variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2">
          <Pencil className="h-3.5 w-3.5" /> Edit Package
        </Button>
      </div>

      {/* Pricing cards */}
      <div className="grid sm:grid-cols-4 gap-4">
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
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-white/40 mb-1">Category</p>
            <p className="text-sm font-semibold text-white">{pkg.package_category}</p>
            <p className="text-[10px] text-white/40">{pkg.service_focus}</p>
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

      {/* Deliverables grouped by category */}
      <Card className="border-0 bg-white/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Deliverables ({deliverables.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {deliverables.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">No deliverables defined</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">{cat}</p>
                  <div className="space-y-1">
                    {items.map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-sm text-white/70">
                        {d.is_included_by_default ? <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <X className="h-3.5 w-3.5 text-white/20 shrink-0" />}
                        <span>{d.deliverable_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recommendation Links */}
        <Card className="border-0 bg-white/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Recommendation Links ({recLinks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {recLinks.length === 0 ? (
              <p className="text-xs text-white/30 py-3 text-center">Not linked to any recommendations</p>
            ) : (
              <div className="space-y-1.5">
                {recLinks.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-sm text-white/70">
                    <Badge variant="outline" className="text-[9px] border-white/10 text-white/50">{r.is_primary ? "Primary" : "Secondary"}</Badge>
                    <span className="font-mono text-xs">{r.recommendation_service_key}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationships */}
        <Card className="border-0 bg-white/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Relationships ({relationships.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {relationships.length === 0 ? (
              <p className="text-xs text-white/30 py-3 text-center">No relationships</p>
            ) : (
              <div className="space-y-1.5">
                {relationships.map(r => {
                  const otherId = r.source_package_id === id ? r.related_package_id : r.source_package_id;
                  const direction = r.source_package_id === id ? "→" : "←";
                  return (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">{r.relationship_type}</Badge>
                      <span className="text-white/40">{direction}</span>
                      <Link to={`/admin/packages/${otherId}`} className="text-[hsl(var(--nl-sky))] hover:underline text-xs">{getName(otherId)}</Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Defaults */}
        <Card className="border-0 bg-white/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Billing Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {billingDefaults ? (
              <div className="space-y-1 text-xs text-white/60">
                <p>Frequency: <span className="text-white/80">{billingDefaults.billing_frequency}</span></p>
                <p>Setup: <span className="text-white/80">${billingDefaults.setup_fee_default?.toLocaleString()}</span></p>
                <p>Monthly: <span className="text-white/80">${billingDefaults.monthly_fee_default?.toLocaleString()}</span></p>
                <p>Contract: <span className="text-white/80">{billingDefaults.contract_term_default} months</span></p>
                <p>Auto-renew: <span className="text-white/80">{billingDefaults.auto_renew_default ? "Yes" : "No"}</span></p>
              </div>
            ) : (
              <p className="text-xs text-white/30 py-3 text-center">No billing defaults configured</p>
            )}
          </CardContent>
        </Card>

        {/* Proposal & Activation Links */}
        <Card className="border-0 bg-white/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Proposal & Activation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <p className="text-[10px] uppercase text-white/40 mb-1">Proposal Templates</p>
              {proposalLinks.length === 0 ? (
                <p className="text-xs text-white/30">None linked</p>
              ) : (
                proposalLinks.map(pl => (
                  <Badge key={pl.id} variant="outline" className="text-[10px] border-white/20 text-white/60 mr-1">
                    {pl.is_default ? "Default" : "Alt"} — {pl.proposal_template_id?.slice(0, 8)}
                  </Badge>
                ))
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase text-white/40 mb-1">Activation Defaults</p>
              {activationDefaults ? (
                <p className="text-xs text-white/60">Template linked — activation config ready</p>
              ) : (
                <p className="text-xs text-white/30">No activation defaults</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
