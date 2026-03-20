import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, ArrowRight, DollarSign, Zap, Star,
  ChevronRight, Sparkles, BarChart3, Target,
  Search, Megaphone, Share2, Globe, Users, Calendar,
  Mail, RefreshCw, ShieldCheck, Package, Check, Phone,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import {
  generateRecommendations, buildWorkspaceContext,
  type ServiceRecommendation,
} from "@/lib/recommendationEngine";
import { persistRecommendations } from "@/lib/recommendationPersistence";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { RequestImplementationModal } from "@/components/RequestImplementationModal";

const urgencyStyles: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: "hsla(0,70%,50%,.08)", text: "hsl(0 70% 45%)", border: "hsla(0,70%,50%,.2)" },
  High:     { bg: "hsla(25,95%,53%,.08)", text: "hsl(25 95% 45%)", border: "hsla(25,95%,53%,.2)" },
  Medium:   { bg: "hsla(211,96%,56%,.08)", text: "hsl(211 96% 50%)", border: "hsla(211,96%,56%,.2)" },
  Low:      { bg: "hsl(var(--muted) / 0.5)", text: "hsl(var(--muted-foreground))", border: "hsl(var(--border))" },
};

const serviceIcons: Record<string, any> = {
  seo_implementation: Search,
  paid_ads: Megaphone,
  social_media: Share2,
  review_generation: Star,
  crm_automation: Users,
  website_optimization: Globe,
  appointment_generation: Calendar,
  email_automation: Mail,
  noshow_recovery: RefreshCw,
  full_growth_system: Sparkles,
};

interface PackageLink {
  service_key: string;
  package_id: string;
  package_name: string;
  package_key: string;
  default_setup_fee: number;
  default_monthly_fee: number;
  is_primary: boolean;
  deliverables: { deliverable_name: string; deliverable_category: string }[];
}

export function RecommendedServicesWidget() {
  const { activeClientId, isAdmin } = useWorkspace();
  const [recs, setRecs] = useState<ServiceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageLinks, setPackageLinks] = useState<PackageLink[]>([]);
  const [detailSheet, setDetailSheet] = useState<ServiceRecommendation | null>(null);
  const [requestModal, setRequestModal] = useState<{ rec: ServiceRecommendation; pkg?: PackageLink } | null>(null);
  const [activeRequests, setActiveRequests] = useState<Record<string, string>>({}); // recommendation_key -> status

  const runEngine = useCallback(async () => {
    if (!activeClientId) return;
    setLoading(true);

    const [contacts, deals, events, reviews, tasks, intg, calIntg, autos, team, pkgLinks] = await Promise.all([
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, status, pipeline_stage").eq("client_id", activeClientId),
      supabase.from("appointments").select("status, start_time").eq("client_id", activeClientId),
      supabase.from("review_requests" as any).select("rating").eq("client_id", activeClientId),
      supabase.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", activeClientId).eq("status", "open"),
      supabase.from("client_integrations").select("status").eq("client_id", activeClientId),
      supabase.from("calendar_integrations").select("id").eq("client_id", activeClientId),
      supabase.from("automations").select("automation_category, enabled").eq("client_id", activeClientId),
      supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("recommendation_package_links").select("recommendation_service_key, package_id, is_primary, priority_order").order("priority_order"),
    ]);

    const ctx = buildWorkspaceContext({
      contacts: contacts.count || 0,
      deals: (deals.data || []) as any,
      events: (events.data || []) as any,
      reviews: (reviews.data || []) as any,
      tasks: tasks.count || 0,
      integrations: (intg.data || []) as any,
      calendarIntegrations: calIntg.data || [],
      automations: (autos.data || []) as any,
      teamSize: team.count || 1,
    });

    const results = generateRecommendations(ctx);
    setRecs(results);

    // Load package details for linked recommendations
    const links = (pkgLinks.data || []) as any[];
    if (links.length > 0) {
      const pkgIds = [...new Set(links.map((l: any) => l.package_id))];
      const [pkgs, delivs] = await Promise.all([
        supabase.from("offer_packages").select("id, package_name, package_key, default_setup_fee, default_monthly_fee").in("id", pkgIds),
        supabase.from("package_deliverables").select("package_id, deliverable_name, deliverable_category").in("package_id", pkgIds).eq("is_included_by_default", true).order("display_order"),
      ]);

      const pkgMap = Object.fromEntries((pkgs.data || []).map((p: any) => [p.id, p]));
      const delMap: Record<string, any[]> = {};
      (delivs.data || []).forEach((d: any) => {
        if (!delMap[d.package_id]) delMap[d.package_id] = [];
        delMap[d.package_id].push(d);
      });

      setPackageLinks(links.map((l: any) => {
        const p = pkgMap[l.package_id];
        return {
          service_key: l.recommendation_service_key,
          package_id: l.package_id,
          package_name: p?.package_name || "Unknown",
          package_key: p?.package_key || "",
          default_setup_fee: p?.default_setup_fee || 0,
          default_monthly_fee: p?.default_monthly_fee || 0,
          is_primary: l.is_primary,
          deliverables: delMap[l.package_id] || [],
        };
      }));
    }

    setLoading(false);
    persistRecommendations(activeClientId, results, ctx).catch(console.error);

    // Load active implementation requests for this client
    const { data: irData } = await supabase
      .from("implementation_requests")
      .select("recommendation_key, request_status")
      .eq("client_id", activeClientId)
      .not("request_status", "in", '("Closed","Rejected")');
    const irMap: Record<string, string> = {};
    (irData || []).forEach((ir: any) => { if (ir.recommendation_key) irMap[ir.recommendation_key] = ir.request_status; });
    setActiveRequests(irMap);
  }, [activeClientId]);

  useEffect(() => { runEngine(); }, [runEngine]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded animate-pulse w-48" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (recs.length === 0) return null;

  const top = recs[0];
  const secondary = recs.slice(1, 4);
  const topStyle = urgencyStyles[top.urgency] || urgencyStyles.Medium;
  const TopIcon = serviceIcons[top.key] || Sparkles;
  const totalMonthly = recs.reduce((s, r) => s + r.projectedMonthly, 0);
  const topPkg = packageLinks.find(l => l.service_key === top.key && l.is_primary);

  const handleRequestImplementation = (rec: ServiceRecommendation) => {
    const recPkg = packageLinks.find(l => l.service_key === rec.key && l.is_primary);
    setRequestModal({ rec, pkg: recPkg });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Top Growth Opportunity</h3>
            <p className="text-[10px] text-muted-foreground">
              ${totalMonthly.toLocaleString()}/mo total projected across {recs.length} services
            </p>
          </div>
        </div>
        <Link to="/revenue-opportunities">
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
            All Opportunities <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Hero recommendation card */}
      <Card className="relative overflow-hidden border-2 shadow-md" style={{ borderColor: topStyle.border }}>
        <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-15" style={{
          background: `radial-gradient(circle at 100% 0%, ${topStyle.text}, transparent 70%)`
        }} />
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: topStyle.bg }}>
                  <TopIcon className="h-4 w-4" style={{ color: topStyle.text }} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground leading-tight">{top.name}</h4>
                  <Badge className="text-[10px] font-bold mt-0.5" style={{ background: topStyle.bg, color: topStyle.text, border: `1px solid ${topStyle.border}` }}>
                    {top.urgency} Priority
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{top.reason}</p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <div className="flex items-center gap-1 justify-end">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground">Projected Revenue</span>
              </div>
              <p className="text-2xl font-black text-foreground">${top.projectedMonthly.toLocaleString()}<span className="text-xs font-medium text-muted-foreground">/mo</span></p>
              <p className="text-xs font-bold text-primary">${top.projectedAnnual.toLocaleString()}/yr</p>
            </div>
          </div>

          {/* Package info */}
          {topPkg && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/[0.04] border border-primary/10">
              <Package className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{topPkg.package_name}</p>
                <p className="text-[10px] text-muted-foreground">{topPkg.deliverables.length} deliverables included</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">${topPkg.default_monthly_fee.toLocaleString()}/mo</p>
                {topPkg.default_setup_fee > 0 && (
                  <p className="text-[10px] text-muted-foreground">${topPkg.default_setup_fee.toLocaleString()} setup</p>
                )}
              </div>
            </div>
          )}

          {/* Signals bar + CTAs */}
          <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-border/50">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Fit: <strong className="text-foreground">{top.fitScore}%</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Confidence: <strong className="text-foreground">{top.confidence}%</strong></span>
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDetailSheet(top)}>
                See What's Included
              </Button>
              {isAdmin ? (
                <Link to="/revenue-opportunities">
                  <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                    <DollarSign className="h-3.5 w-3.5" /> Create Proposal <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              ) : activeRequests[top.key] ? (
                <Badge className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5">
                  ✓ Request {activeRequests[top.key]}
                </Badge>
              ) : (
                <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" onClick={() => handleRequestImplementation(top)}>
                  <Phone className="h-3.5 w-3.5" /> Request Implementation
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary recommendations */}
      {secondary.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-3">
          {secondary.map((rec, i) => {
            const style = urgencyStyles[rec.urgency] || urgencyStyles.Medium;
            const Icon = serviceIcons[rec.key] || Zap;
            const recPkg = packageLinks.find(l => l.service_key === rec.key && l.is_primary);
            return (
              <motion.div
                key={rec.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow group cursor-pointer border-border/80"
                  onClick={() => setDetailSheet(rec)}>
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: style.bg }}>
                          <Icon className="h-3 w-3" style={{ color: style.text }} />
                        </div>
                        <Badge variant="outline" className="text-[9px]" style={{ borderColor: style.border, color: style.text }}>
                          {rec.urgency}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">#{rec.priorityRank}</span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground leading-snug">{rec.name}</h5>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-foreground">${rec.projectedMonthly.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{rec.reason}</p>
                    {recPkg && (
                      <div className="flex items-center gap-1 text-[10px] text-primary">
                        <Package className="h-3 w-3" />
                        <span className="font-medium">{recPkg.package_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detailSheet} onOpenChange={() => setDetailSheet(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailSheet && <RecDetailPanel rec={detailSheet} packageLinks={packageLinks} isAdmin={isAdmin} onRequest={handleRequestImplementation} />}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

function RecDetailPanel({ rec, packageLinks, isAdmin, onRequest }: {
  rec: ServiceRecommendation;
  packageLinks: PackageLink[];
  isAdmin: boolean;
  onRequest: (r: ServiceRecommendation) => void;
}) {
  const style = urgencyStyles[rec.urgency] || urgencyStyles.Medium;
  const Icon = serviceIcons[rec.key] || Sparkles;
  const linked = packageLinks.filter(l => l.service_key === rec.key).sort((a, b) => (a.is_primary ? -1 : 1));
  const primary = linked.find(l => l.is_primary);

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: style.bg }}>
            <Icon className="h-5 w-5" style={{ color: style.text }} />
          </div>
          <div>
            <SheetTitle className="text-lg">{rec.name}</SheetTitle>
            <Badge className="text-[10px] mt-1" style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
              {rec.urgency} Priority
            </Badge>
          </div>
        </div>
      </SheetHeader>

      {/* Why this is recommended */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-1.5">Why This Is Recommended</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
      </div>

      {/* Revenue projection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-primary/[0.04] border border-primary/10">
          <p className="text-[10px] text-muted-foreground mb-0.5">Monthly Impact</p>
          <p className="text-xl font-black text-foreground">${rec.projectedMonthly.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/[0.04] border border-primary/10">
          <p className="text-[10px] text-muted-foreground mb-0.5">Annual Impact</p>
          <p className="text-xl font-black text-primary">${rec.projectedAnnual.toLocaleString()}</p>
        </div>
      </div>

      {/* Scores */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <Target className="h-3.5 w-3.5 text-primary" />
          Fit: <strong>{rec.fitScore}%</strong>
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Confidence: <strong>{rec.confidence}%</strong>
        </span>
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          Rank: <strong>#{rec.priorityRank}</strong>
        </span>
      </div>

      {/* Linked package */}
      {primary && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-primary" /> Recommended Package
          </h4>
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{primary.package_name}</p>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${primary.default_monthly_fee.toLocaleString()}/mo</p>
                  {primary.default_setup_fee > 0 && (
                    <p className="text-[10px] text-muted-foreground">${primary.default_setup_fee.toLocaleString()} setup</p>
                  )}
                </div>
              </div>
              {primary.deliverables.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">What's Included</p>
                  <div className="grid gap-1">
                    {primary.deliverables.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-foreground">{d.deliverable_name}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto">{d.deliverable_category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alternative packages */}
      {linked.filter(l => !l.is_primary).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Alternative Packages</h4>
          {linked.filter(l => !l.is_primary).map(l => (
            <div key={l.package_id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{l.package_name}</span>
              </div>
              <span className="text-xs font-bold text-foreground">${l.default_monthly_fee.toLocaleString()}/mo</span>
            </div>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        {isAdmin ? (
          <>
            <Link to="/revenue-opportunities" className="block">
              <Button className="w-full h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <DollarSign className="h-4 w-4" /> Create Proposal
              </Button>
            </Link>
            <Link to="/admin/packages" className="block">
              <Button variant="outline" className="w-full h-10 gap-2">
                <Package className="h-4 w-4" /> Manage Package
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Button className="w-full h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onRequest(rec)}>
              <Phone className="h-4 w-4" /> Request Implementation
            </Button>
            <a href="tel:+18058363557" className="block">
              <Button variant="outline" className="w-full h-10 gap-2">
                <Phone className="h-4 w-4" /> Call (805) 836-3557
              </Button>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
