import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackArrow } from "@/components/BackArrow";
import {
  DollarSign, Package, Zap, TrendingUp, Shield, Globe,
  ChevronRight, CheckCircle2, Clock, AlertTriangle, FileText, Brain,
  Target, Layers, BarChart3, Star, Info, Copy, Pencil, Eye,
  ArrowRightLeft, Lock, Unlock, Clipboard, Camera
} from "lucide-react";
import { WEBSITE_BUILD_FEES } from "@/lib/workspaceQuoteEngine";
import { BUSINESS_OPERATION_TYPES } from "@/lib/businessOperationTypes";
import { toast } from "sonner";
import {
  ActiveSalesProvider,
  useActiveSalesState,
  PROPOSAL_STATUSES,
  WORKFLOW_STEPS,
  type QuoteVersion,
} from "@/contexts/ActiveSalesContext";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";

// ═══════════════════════════════════════════════
// Package Presets
// ═══════════════════════════════════════════════
const PACKAGE_PRESETS: Record<string, { label: string; modules: string[]; includeApp?: boolean }> = {
  core_only: { label: "Core Platform Only", modules: [] },
  growth_starter: { label: "Growth Starter", modules: ["seo", "reputation_reviews"] },
  growth_engine: { label: "Growth Engine", modules: ["paid_ads", "seo", "crm_automation", "tracking_attribution"] },
  premium_growth: { label: "Premium Growth", modules: ["paid_ads", "seo", "crm_automation", "lifecycle_nurture", "reputation_reviews", "tracking_attribution", "website_management"] },
  premium_app: { label: "Premium + App", modules: ["paid_ads", "seo", "crm_automation", "lifecycle_nurture", "reputation_reviews", "tracking_attribution", "website_management"], includeApp: true },
};

// ═══════════════════════════════════════════════
// Module metadata
// ═══════════════════════════════════════════════
const MODULE_META: Record<string, { icon: any; upsellNote: string }> = {
  paid_ads: { icon: TrendingUp, upsellNote: "Scale lead volume fast." },
  seo: { icon: Globe, upsellNote: "Critical for local/search. Compounds." },
  website_management: { icon: Globe, upsellNote: "Essential if site is outdated." },
  crm_automation: { icon: Layers, upsellNote: "Must-have for multi-touch sales." },
  lifecycle_nurture: { icon: Target, upsellNote: "High-value for repeat revenue." },
  reputation_reviews: { icon: Star, upsellNote: "Quick win — social proof." },
  tracking_attribution: { icon: BarChart3, upsellNote: "Required for multi-channel ROI." },
  financial_compliance: { icon: Shield, upsellNote: "Mandatory for regulated industries." },
};

// ═══════════════════════════════════════════════
// Sales Fit Indicators
// ═══════════════════════════════════════════════
function getSalesFitIndicators(niche: any, financial: boolean) {
  const compliance = niche?.complianceLevel || "none";
  const ticketSize = niche?.ticketSize || "medium";
  const indicators: { label: string; value: string; color: string }[] = [];
  if (financial || compliance === "high") {
    indicators.push({ label: "Fit", value: "Premium Opportunity", color: "text-amber-400" });
    indicators.push({ label: "Flexibility", value: "Low — Compliance", color: "text-orange-400" });
    indicators.push({ label: "Easiest Upsell", value: "Compliance Add-On", color: "text-cyan-400" });
  } else if (ticketSize === "high" || ticketSize === "premium") {
    indicators.push({ label: "Fit", value: "Strong", color: "text-emerald-400" });
    indicators.push({ label: "Flexibility", value: "Moderate", color: "text-blue-400" });
    indicators.push({ label: "Easiest Upsell", value: "App Store Launch", color: "text-cyan-400" });
  } else {
    indicators.push({ label: "Fit", value: "Standard", color: "text-blue-400" });
    indicators.push({ label: "Flexibility", value: "High", color: "text-green-400" });
    indicators.push({ label: "Easiest Upsell", value: "Paid Ads / SEO", color: "text-cyan-400" });
  }
  if (compliance === "high") indicators.push({ label: "Compliance", value: "Regulated", color: "text-red-400" });
  return indicators;
}

// ═══════════════════════════════════════════════
// Page Wrapper
// ═══════════════════════════════════════════════
const DEFAULT_PROFILE: WorkspaceProfile = {
  industry: "healthcare_wellness",
  niche: "med_spa",
  archetype: "appointments",
  zoomTier: "z3",
  legacyProfileType: "appointment_local",
  legacyIndustryValue: "healthcare & wellness",
  metadata: { revenueModel: "consultation", salesCycle: "short", ticketSize: "high", complexityLevel: "medium", complianceLevel: "moderate" },
};

export default function AdminSalesControlCenter() {
  return (
    <ActiveSalesProvider initialProfile={DEFAULT_PROFILE}>
      <SalesControlCenterInner />
    </ActiveSalesProvider>
  );
}

// ═══════════════════════════════════════════════
// Inner (consumes context)
// ═══════════════════════════════════════════════
function SalesControlCenterInner() {
  const s = useActiveSalesState();
  const allModules = Object.keys(MODULE_META);
  const stageIndex = WORKFLOW_STEPS.findIndex(w => w.key === s.currentStage);
  const fitIndicators = useMemo(() => getSalesFitIndicators(s.niche, s.financial), [s.niche, s.financial]);

  const recommendedModules = useMemo(() => {
    const priority = s.niche?.modulePriority || [];
    if (s.financial) return [...new Set(["crm_automation", "financial_compliance", "tracking_attribution", ...priority])];
    return priority;
  }, [s.niche, s.financial]);

  const setupDiff = s.quote.totalUpfront - s.effectiveSetup;
  const monthlyDiff = s.quote.totalMonthly - s.effectiveMonthly;

  const toggleModule = (key: string) => {
    const next = s.activeVersion.modules.includes(key) ? s.activeVersion.modules.filter(m => m !== key) : [...s.activeVersion.modules, key];
    s.updateActiveVersion({ modules: next });
  };

  const applyPreset = (presetKey: string) => {
    const preset = PACKAGE_PRESETS[presetKey];
    if (!preset) return;
    s.updateActiveVersion({ modules: preset.modules, appStoreLaunch: !!preset.includeApp, appliedPreset: presetKey });
    toast.success(`Applied: ${preset.label}`);
  };

  const handleMarkPresented = () => {
    s.markAsPresented(s.activeVersionId);
    toast.success(`"${s.activeVersion.name}" locked as presented version`);
  };

  const handleSnapshot = () => {
    const snap = s.generateHandoffSnapshot();
    if (snap) toast.success("Handoff snapshot generated");
  };

  // Risk flag count
  const activeRiskCount = Object.values(s.riskFlags).filter(Boolean).length;
  const riskLabel = activeRiskCount === 0 ? "Low" : activeRiskCount <= 2 ? "Moderate" : "High";
  const riskLabelColor = activeRiskCount === 0 ? "text-emerald-400" : activeRiskCount <= 2 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BackArrow to="/admin/sales-pipeline" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sales Control Center</h1>
            <p className="text-xs text-muted-foreground">Single source of truth — pricing, packaging & proposal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {s.ownership.primaryRep && <Badge variant="outline" className="border-primary/20 text-primary/70 text-[10px]">Rep: {s.ownership.primaryRep}</Badge>}
          {s.readyToPresent && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Ready to Present</Badge>}
          {s.readyToClose && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]"><Unlock className="h-3 w-3 mr-1" /> Ready to Close</Badge>}
          {s.presentedVersion && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"><Eye className="h-3 w-3 mr-1" /> Presented: {s.presentedVersion.name}</Badge>}
          <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10 px-2 py-1 text-[10px]">ADMIN ONLY</Badge>
        </div>
      </div>

      {/* Ops Header Strip */}
      <Card className="p-3 bg-card/60 border-border/30 backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: "Owner", value: s.ownership.primaryRep || "Unassigned", color: s.ownership.primaryRep ? "text-foreground" : "text-muted-foreground/50" },
            { label: "Stage", value: WORKFLOW_STEPS.find(w => w.key === s.currentStage)?.label || s.currentStage },
            { label: "Close %", value: `${s.forecast.probability}%`, color: s.forecast.category === "strong" ? "text-emerald-400" : s.forecast.category === "at_risk" ? "text-amber-400" : "text-foreground" },
            { label: "Confidence", value: s.forecast.confidenceLabel, color: s.forecast.category === "strong" ? "text-emerald-400" : s.forecast.category === "stalled" ? "text-red-400" : "text-foreground" },
            { label: "Next Action", value: s.nextAction.action || "None set", color: s.nextAction.action ? "text-foreground" : "text-amber-400" },
            { label: "Due", value: s.nextAction.dueDate ? new Date(s.nextAction.dueDate).toLocaleDateString() : "—", color: s.nextAction.dueDate && new Date(s.nextAction.dueDate) < new Date() ? "text-red-400" : "text-foreground" },
            { label: "Risk", value: `${riskLabel} (${activeRiskCount})`, color: riskLabelColor },
            { label: "Handoff", value: s.handoffSnapshot ? "✓ Ready" : "Pending", color: s.handoffSnapshot ? "text-emerald-400" : "text-muted-foreground/50" },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <p className="text-[8px] text-muted-foreground/50 uppercase tracking-widest">{item.label}</p>
              <p className={`text-[11px] font-semibold truncate ${item.color || "text-foreground"}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Workflow Strip */}
      <Card className="p-2.5 bg-card/60 border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {WORKFLOW_STEPS.map((step, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <div key={step.key} className="flex items-center shrink-0">
                <button onClick={() => s.setCurrentStage(step.key)} className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${active ? "bg-primary/20 text-primary ring-1 ring-primary/30" : done ? "bg-emerald-500/10 text-emerald-400/80" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>
                  {step.label}
                </button>
                {i < WORKFLOW_STEPS.length - 1 && <ChevronRight className={`h-2.5 w-2.5 mx-0.5 ${done ? "text-emerald-500/30" : "text-muted-foreground/15"}`} />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Proposal Status */}
      <Card className="p-2.5 bg-card/60 border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mr-1">Proposal:</span>
          {PROPOSAL_STATUSES.map(ps => (
            <button key={ps.key} onClick={() => { s.setProposalStatus(ps.key); toast.success(`Status: ${ps.label}`); }}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${s.proposalStatus === ps.key ? ps.color + " ring-1 ring-current/20" : "bg-muted/15 text-muted-foreground hover:bg-muted/30"}`}>
              {ps.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Version Tabs */}
      <Card className="p-2.5 bg-card/60 border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto mb-2">
          {s.versions.map(v => (
            <button key={v.id} onClick={() => s.setActiveVersionId(v.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium shrink-0 transition-all ${v.id === s.activeVersionId ? "bg-primary/20 text-primary ring-1 ring-primary/25" : "bg-muted/15 text-muted-foreground hover:bg-muted/30"}`}>
              {v.isPresented && <Eye className="h-2.5 w-2.5 text-emerald-400" />}
              {v.isRecommended && !v.isPresented && <Star className="h-2.5 w-2.5 text-amber-400" />}
              {v.name}
              {v.appliedPreset && <span className="text-[8px] text-muted-foreground/50 ml-1">({PACKAGE_PRESETS[v.appliedPreset]?.label})</span>}
            </button>
          ))}
          <Button size="sm" variant="ghost" className="text-[10px] h-6 shrink-0" onClick={() => s.addVersion(`Version ${String.fromCharCode(65 + s.versions.length)}`, [])}>+ New</Button>
          <Button size="sm" variant="ghost" className="text-[10px] h-6 shrink-0" onClick={() => s.duplicateVersion(s.activeVersionId)}><Copy className="h-2.5 w-2.5 mr-1" />Dup</Button>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => { s.updateActiveVersion({ isRecommended: !s.activeVersion.isRecommended }); }}>
              <Star className={`h-2.5 w-2.5 mr-0.5 ${s.activeVersion.isRecommended ? "text-amber-400 fill-amber-400" : ""}`} /> Rec
            </Button>
            <Button size="sm" variant={s.activeVersion.isPresented ? "default" : "ghost"} className={`text-[10px] h-6 ${s.activeVersion.isPresented ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : ""}`} onClick={handleMarkPresented}>
              <Eye className="h-2.5 w-2.5 mr-0.5" /> {s.activeVersion.isPresented ? "✓ Presented" : "Lock as Presented"}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
          <Input value={s.activeVersion.name} onChange={e => s.updateActiveVersion({ name: e.target.value })} className="h-6 text-[10px] bg-transparent border-muted/20 max-w-64" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ═══ LEFT (3) ═══ */}
        <div className="lg:col-span-3 space-y-3">
          <Sec icon={Brain} title="Business Profile">
            <div className="space-y-1 text-[11px]">
              <Row label="Industry" value={s.profile.industry.replace(/_/g, " ")} />
              <Row label="Niche" value={s.niche?.label || s.profile.niche || "General"} />
              <Row label="Operation" value={BUSINESS_OPERATION_TYPES[s.opType]?.label || s.opType} />
              <Row label="Archetype" value={s.profile.archetype.replace(/_/g, " ")} />
              <Row label="Tier" value={s.profile.zoomTier.toUpperCase()} />
              {s.financial && <div className="flex items-center gap-1 mt-1"><Shield className="h-3 w-3 text-amber-400" /><span className="text-amber-400 text-[9px] font-semibold">Premium Financial</span></div>}
            </div>
          </Sec>

          <Sec icon={Info} title="Pricing Rationale">
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <p><b className="text-foreground/80">Ticket:</b> {s.niche?.ticketSize || "medium"}</p>
              <p><b className="text-foreground/80">Compliance:</b> {s.niche?.complianceLevel || "none"}</p>
              <p><b className="text-foreground/80">Complexity:</b> {s.intel.businessComplexityLabel}</p>
              <p><b className="text-foreground/80">Tier:</b> {s.financial ? "Premium Financial" : s.opType.replace(/_/g, " ")}</p>
            </div>
          </Sec>

          <Sec icon={Target} title="Sales Fit">
            <div className="space-y-1">
              {fitIndicators.map((ind, i) => <div key={i} className="flex justify-between text-[10px]"><span className="text-muted-foreground">{ind.label}</span><span className={`font-semibold ${ind.color}`}>{ind.value}</span></div>)}
            </div>
          </Sec>

          <Sec icon={Zap} title="Intelligence">
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <p><b className="text-foreground/80">Revenue:</b> {s.intel.revenueOpportunity}</p>
              <p><b className="text-foreground/80">Lever:</b> {s.intel.primaryGrowthLever}</p>
              <p><b className="text-foreground/80">Urgency:</b> <span className="text-amber-400">{s.intel.urgencySignal}</span></p>
            </div>
          </Sec>

          <Sec icon={CheckCircle2} title="Readiness">
            <ReadinessChecks
              presentChecks={[
                { label: "Profile complete", ok: !!s.profile.industry && !!s.profile.archetype },
                { label: "Niche selected", ok: !!s.profile.niche },
                { label: "Quote computed", ok: s.quote.totalUpfront > 0 || s.quote.totalMonthly > 0 },
                { label: "Narrative ready", ok: !!s.narrative.opportunity },
                { label: "Version marked presented", ok: !!s.presentedVersion },
              ]}
              closeChecks={[
                { label: "Proposal revealed", ok: s.proposalStatus === "revealed" || s.proposalStatus === "accepted" },
                { label: "Final meeting done", ok: stageIndex >= 6 },
                { label: "Activation complete", ok: stageIndex >= 8 },
                { label: "Payment unlocked", ok: stageIndex >= 9 },
              ]}
            />
          </Sec>
        </div>

        {/* ═══ MIDDLE (5) ═══ */}
        <div className="lg:col-span-5 space-y-3">
          <Sec icon={Package} title="Presets">
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(PACKAGE_PRESETS).map(([key, preset]) => (
                <button key={key} onClick={() => applyPreset(key)}
                  className={`text-left p-2 rounded border transition-all group ${s.activeVersion.appliedPreset === key ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-border/20 hover:border-primary/20"}`}>
                  <div className="text-[9px] font-semibold text-foreground group-hover:text-primary">{preset.label}</div>
                </button>
              ))}
            </div>
          </Sec>

          <Sec icon={Layers} title="Growth Modules" action={
            <Button size="sm" variant="outline" className="text-[9px] h-5 border-primary/30 text-primary hover:bg-primary/10" onClick={() => s.updateActiveVersion({ modules: [...recommendedModules] })}>Select Rec</Button>
          }>
            <div className="space-y-1">
              {allModules.map(key => {
                const meta = MODULE_META[key]; const Icon = meta.icon;
                const active = s.activeVersion.modules.includes(key);
                const rec = recommendedModules.includes(key);
                return (
                  <button key={key} onClick={() => toggleModule(key)} className={`w-full text-left p-2 rounded border transition-all ${active ? "bg-primary/10 border-primary/25" : "bg-muted/5 border-border/15 hover:border-border/30"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3 w-3 ${active ? "text-primary" : "text-muted-foreground/30"}`} />
                        <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                        {rec && <Badge className="text-[7px] h-3 bg-primary/15 text-primary border-0 px-0.5">REC</Badge>}
                      </div>
                      <Switch checked={active} onCheckedChange={() => toggleModule(key)} className="scale-[0.55]" />
                    </div>
                    {active && <p className="text-[9px] text-muted-foreground/50 mt-0.5 ml-4">{meta.upsellNote}</p>}
                  </button>
                );
              })}
            </div>
          </Sec>

          <Sec icon={TrendingUp} title="Upsells">
            <div className="space-y-1.5">
              <UpsellRow label="Website Build" sub={s.niche?.modulePriority?.includes("website_management") ? "⚡ Rec" : "Optional"}>
                <Select value={s.activeVersion.websiteBuild || "none"} onValueChange={v => s.updateActiveVersion({ websiteBuild: v === "none" ? null : v })}>
                  <SelectTrigger className="w-32 h-6 text-[9px] bg-muted/10 border-border/15"><SelectValue /></SelectTrigger>
                  <SelectContent>{[<SelectItem key="none" value="none">None</SelectItem>, ...Object.entries(WEBSITE_BUILD_FEES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)]}</SelectContent>
                </Select>
              </UpsellRow>
              <UpsellRow label="App Store Launch" sub={s.financial ? "⚡ Strong" : "Add-on"}>
                <Switch checked={s.activeVersion.appStoreLaunch} onCheckedChange={v => s.updateActiveVersion({ appStoreLaunch: v })} className="scale-[0.55]" />
              </UpsellRow>
              <UpsellRow label="Setup Purchased" sub="Waives activation fees">
                <Switch checked={s.activeVersion.hasPurchasedSetup} onCheckedChange={v => s.updateActiveVersion({ hasPurchasedSetup: v })} className="scale-[0.55]" />
              </UpsellRow>
            </div>
          </Sec>

          {/* Handoff Panel */}
          <Sec icon={ArrowRightLeft} title={`Handoff ${s.presentedVersion ? `(from: ${s.presentedVersion.name})` : "(active)"}`}>
            {s.handoffSnapshot ? (
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 mb-2">
                  <p className="text-[9px] text-emerald-400 font-semibold">✓ Snapshot locked — {new Date(s.handoffSnapshot.generatedAt).toLocaleString()}</p>
                </div>
                <p><b>Version:</b> {s.handoffSnapshot.versionName}</p>
                <p><b>Modules:</b> {s.handoffSnapshot.modules.length > 0 ? s.handoffSnapshot.modules.map(m => m.replace(/_/g, " ")).join(", ") : "Core"}</p>
                <p><b>Website:</b> {s.handoffSnapshot.websiteBuild ? WEBSITE_BUILD_FEES[s.handoffSnapshot.websiteBuild]?.label : "None"}</p>
                <p><b>App Launch:</b> {s.handoffSnapshot.appStoreLaunch ? "Yes" : "No"}</p>
                <p><b>Compliance:</b> {s.handoffSnapshot.complianceLevel}</p>
                <p><b>Setup:</b> ${s.handoffSnapshot.effectiveSetup.toLocaleString()} | <b>Monthly:</b> ${s.handoffSnapshot.effectiveMonthly.toLocaleString()}/mo</p>
                <p><b>90-Day:</b> {s.handoffSnapshot.next90Days}</p>
                {s.handoffSnapshot.focusOutcomes.map((o, i) => <p key={i} className="ml-2 text-muted-foreground/50">• {o}</p>)}
                {s.handoffSnapshot.onboardingNotes && <p><b>Notes:</b> {s.handoffSnapshot.onboardingNotes}</p>}
                {s.handoffSnapshot.fulfillmentCautions && <p><b>Cautions:</b> {s.handoffSnapshot.fulfillmentCautions}</p>}
              </div>
            ) : (
              <div className="space-y-1.5 text-[10px] text-muted-foreground">
                <p><b>Package:</b> {(s.presentedVersion || s.activeVersion).name}</p>
                <p><b>Modules:</b> {(s.presentedVersion || s.activeVersion).modules.map(m => m.replace(/_/g, " ")).join(", ") || "Core"}</p>
                <p><b>Priority:</b> {s.narrative.next90Days}</p>
                {s.narrative.focusOutcomes.map((o, i) => <p key={i} className="ml-2 text-muted-foreground/50">• {o}</p>)}
                <Textarea placeholder="Handoff notes..." value={s.notes.onboardingHandoff} onChange={e => s.updateNotes({ onboardingHandoff: e.target.value })} className="text-[9px] bg-muted/10 border-border/15 min-h-[40px] mt-1" />
                <Button size="sm" variant="outline" className="text-[9px] h-6 w-full mt-1" onClick={handleSnapshot}>
                  <Camera className="h-2.5 w-2.5 mr-1" /> Generate Handoff Snapshot
                </Button>
              </div>
            )}
          </Sec>
        </div>

        {/* ═══ RIGHT (4) ═══ */}
        <div className="lg:col-span-4 space-y-3">
          {/* Live Quote */}
          <Card className="p-3 bg-card/60 border-primary/15 backdrop-blur-sm">
            <h3 className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> Live Quote — {s.activeVersion.name}
              {s.activeVersion.isPresented && <Badge className="text-[7px] bg-emerald-500/20 text-emerald-400 border-0 ml-auto">PRESENTED</Badge>}
              {s.activeVersion.isRecommended && !s.activeVersion.isPresented && <Badge className="text-[7px] bg-amber-500/20 text-amber-400 border-0 ml-auto">★ REC</Badge>}
            </h3>
            <div className="space-y-1.5">
              {s.quote.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between items-start text-[10px]">
                  <span className={`flex-1 ${item.category === "platform" ? "text-foreground font-medium" : item.category === "included" ? "text-muted-foreground/30" : "text-foreground/60"}`}>{item.label}</span>
                  <div className="text-right shrink-0 ml-1.5">
                    {item.upfront > 0 && <div className="text-foreground/70">${item.upfront.toLocaleString()}</div>}
                    {item.monthly > 0 && <div className="text-primary/70">${item.monthly.toLocaleString()}/mo</div>}
                    {item.upfront === 0 && item.monthly === 0 && <div className="text-muted-foreground/20">Inc</div>}
                  </div>
                </div>
              ))}
              <Separator className="my-1.5 bg-border/15" />
              <div className="flex justify-between"><span className="text-[11px] font-bold text-foreground">Upfront</span><span className="text-sm font-bold text-foreground">${s.quote.totalUpfront.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[11px] font-bold text-foreground">Monthly</span><span className="text-sm font-bold text-primary">${s.quote.totalMonthly.toLocaleString()}/mo</span></div>
              {(setupDiff !== 0 || monthlyDiff !== 0) && (
                <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/15 mt-1">
                  <p className="text-[9px] text-amber-400 font-semibold">After overrides: ${s.effectiveSetup.toLocaleString()} + ${s.effectiveMonthly.toLocaleString()}/mo</p>
                  {s.discountPct > 15 && <p className="text-[8px] text-red-400 font-semibold mt-0.5">⚠ {s.discountPct}% discount — verify margin</p>}
                </div>
              )}
            </div>
          </Card>

          {/* Presented Version Lock Info */}
          {s.presentedVersion && s.presentedVersion.id !== s.activeVersionId && s.presentedQuote && (
            <Card className="p-3 bg-emerald-500/5 border-emerald-500/20 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Presented Version — {s.presentedVersion.name}
              </h3>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>Setup: <b className="text-foreground">${s.presentedQuote.totalUpfront.toLocaleString()}</b></p>
                <p>Monthly: <b className="text-primary">${s.presentedQuote.totalMonthly.toLocaleString()}/mo</b></p>
                <p className="text-[9px] text-emerald-400/60 mt-1">This is the version shown to the client. Edit other versions without affecting it.</p>
              </div>
            </Card>
          )}

          {/* Overrides */}
          <Sec icon={AlertTriangle} title="Overrides" iconColor="text-amber-400">
            <div className="grid grid-cols-2 gap-1.5">
              <div><label className="text-[9px] text-muted-foreground block">Setup</label><Input type="number" placeholder={`$${s.quote.totalUpfront.toLocaleString()}`} value={s.activeVersion.setupOverride} onChange={e => s.updateActiveVersion({ setupOverride: e.target.value })} className="h-6 text-[9px] bg-muted/10 border-border/15" /></div>
              <div><label className="text-[9px] text-muted-foreground block">Monthly</label><Input type="number" placeholder={`$${s.quote.totalMonthly.toLocaleString()}`} value={s.activeVersion.monthlyOverride} onChange={e => s.updateActiveVersion({ monthlyOverride: e.target.value })} className="h-6 text-[9px] bg-muted/10 border-border/15" /></div>
            </div>
            <div className="mt-1.5"><label className="text-[9px] text-muted-foreground block">Discount %</label><Input type="number" placeholder="0" value={s.activeVersion.discountPct} onChange={e => s.updateActiveVersion({ discountPct: e.target.value })} className="h-6 text-[9px] bg-muted/10 border-border/15 max-w-20" /></div>
            {s.discountPct > 20 && <p className="text-[8px] text-destructive font-semibold mt-1">⚠ &gt;20% — leadership approval needed</p>}
          </Sec>

          {/* Narrative */}
          <Sec icon={FileText} title="Narrative">
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <p><b className="text-foreground/80">Opp:</b> {s.narrative.opportunity}</p>
              <p><b className="text-foreground/80">Solves:</b> {s.narrative.whatItSolves}</p>
              <p><b className="text-foreground/80">90-Day:</b> {s.narrative.next90Days}</p>
            </div>
          </Sec>

          {/* Notes */}
          <Sec icon={Clipboard} title="Sales Notes">
            <div className="space-y-1.5">
              {(["objections", "decisionMaker", "urgency", "discountReasoning", "upsellAngle", "fulfillmentCautions", "followUpPlan"] as const).map(key => (
                <div key={key}>
                  <label className="text-[9px] text-muted-foreground block capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                  <Textarea placeholder={`${key}...`} value={s.notes[key]} onChange={e => s.updateNotes({ [key]: e.target.value })} className="text-[9px] bg-muted/10 border-border/15 min-h-[30px]" />
                </div>
              ))}
            </div>
          </Sec>

          {/* Ownership */}
          <Sec icon={Users} title="Rep Ownership">
            <div className="space-y-1.5">
              <div><label className="text-[9px] text-muted-foreground block">Primary Rep</label><Input value={s.ownership.primaryRep} onChange={e => s.setOwnership({ primaryRep: e.target.value })} placeholder="Assign rep..." className="h-6 text-[9px] bg-muted/10 border-border/15" /></div>
              <div><label className="text-[9px] text-muted-foreground block">Secondary / Closer</label><Input value={s.ownership.secondaryRep} onChange={e => s.setOwnership({ secondaryRep: e.target.value })} placeholder="Optional..." className="h-6 text-[9px] bg-muted/10 border-border/15" /></div>
            </div>
          </Sec>

          {/* Next Action */}
          <Sec icon={Clock} title="Next Action" iconColor={s.nextAction.dueDate && new Date(s.nextAction.dueDate) < new Date() && !s.nextAction.completed ? "text-red-400" : "text-primary"}>
            <div className="space-y-1.5">
              <Input value={s.nextAction.action} onChange={e => s.setNextAction({ action: e.target.value })} placeholder="Next step..." className="h-6 text-[9px] bg-muted/10 border-border/15" />
              <div className="grid grid-cols-2 gap-1.5">
                <div><label className="text-[9px] text-muted-foreground block">Due</label><Input type="date" value={s.nextAction.dueDate} onChange={e => s.setNextAction({ dueDate: e.target.value })} className="h-6 text-[9px] bg-muted/10 border-border/15" /></div>
                <div><label className="text-[9px] text-muted-foreground block">Type</label>
                  <Select value={s.nextAction.type} onValueChange={v => s.setNextAction({ type: v as any })}>
                    <SelectTrigger className="h-6 text-[9px] bg-muted/10 border-border/15"><SelectValue /></SelectTrigger>
                    <SelectContent>{["call", "text", "email", "meeting", "internal_review"].map(t => <SelectItem key={t} value={t} className="text-[10px]">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={s.nextAction.priority} onValueChange={v => s.setNextAction({ priority: v as any })}>
                  <SelectTrigger className="h-6 text-[9px] bg-muted/10 border-border/15 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{["low", "medium", "high", "urgent"].map(p => <SelectItem key={p} value={p} className="text-[10px]">{p}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant={s.nextAction.completed ? "default" : "outline"} className={`text-[9px] h-6 ${s.nextAction.completed ? "bg-emerald-500/20 text-emerald-400" : ""}`} onClick={() => { s.setNextAction({ completed: !s.nextAction.completed }); if (!s.nextAction.completed) s.logActivity("Follow-Up", `Completed: ${s.nextAction.action}`); }}>
                  {s.nextAction.completed ? "✓ Done" : "Mark Done"}
                </Button>
              </div>
              {s.nextAction.dueDate && new Date(s.nextAction.dueDate) < new Date() && !s.nextAction.completed && (
                <p className="text-[8px] text-red-400 font-semibold">⚠ Overdue follow-up</p>
              )}
            </div>
          </Sec>

          {/* Forecast */}
          <Sec icon={BarChart3} title="Close Forecast">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-[9px] text-muted-foreground shrink-0">Probability</label>
                <Input type="number" min={0} max={100} value={s.forecast.probability} onChange={e => s.setForecast({ probability: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className="h-6 text-[9px] bg-muted/10 border-border/15 w-16" />
                <span className={`text-[10px] font-semibold ${s.forecast.category === "strong" ? "text-emerald-400" : s.forecast.category === "at_risk" ? "text-amber-400" : s.forecast.category === "stalled" ? "text-red-400" : "text-foreground"}`}>{s.forecast.confidenceLabel}</span>
              </div>
              <div><label className="text-[9px] text-muted-foreground block">Close Window</label><Input value={s.forecast.closeWindow} onChange={e => s.setForecast({ closeWindow: e.target.value })} placeholder="e.g. This week, Next 30 days..." className="h-6 text-[9px] bg-muted/10 border-border/15" /></div>
            </div>
          </Sec>

          {/* Risk Flags */}
          <Sec icon={AlertTriangle} title={`Risk Flags (${Object.values(s.riskFlags).filter(Boolean).length})`} iconColor={Object.values(s.riskFlags).filter(Boolean).length > 0 ? "text-amber-400" : "text-emerald-400"}>
            <div className="space-y-1">
              {Object.entries(s.riskFlags).filter(([, v]) => v).map(([key]) => (
                <div key={key} className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                  <span>{key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}</span>
                </div>
              ))}
              {Object.values(s.riskFlags).filter(Boolean).length === 0 && <p className="text-[10px] text-emerald-400/60">No active risk flags</p>}
            </div>
          </Sec>

          {/* Activity Log */}
          <Sec icon={FileText} title="Activity Log">
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {s.activityLog.length === 0 && <p className="text-[10px] text-muted-foreground/40">No activity yet</p>}
              {s.activityLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-1.5 text-[10px] border-b border-border/10 pb-1">
                  <Clock className="h-2.5 w-2.5 text-primary/40 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-foreground/70 font-medium">{entry.action}</span>
                    <span className="text-muted-foreground/50 ml-1">{entry.detail}</span>
                    <p className="text-[8px] text-muted-foreground/30">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Sec>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════
function Sec({ icon: Icon, title, children, action, iconColor = "text-primary" }: { icon: any; title: string; children: React.ReactNode; action?: React.ReactNode; iconColor?: string }) {
  return (
    <Card className="p-3 bg-card/60 border-border/30 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold text-foreground flex items-center gap-1.5"><Icon className={`h-3 w-3 ${iconColor}`} /> {title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="text-foreground/80 font-medium capitalize text-[10px]">{value}</span></div>;
}

function UpsellRow({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="p-2 rounded bg-muted/10 border border-border/15">
      <div className="flex items-center justify-between">
        <div><span className="text-[10px] font-medium text-foreground">{label}</span><p className="text-[8px] text-muted-foreground/50">{sub}</p></div>
        {children}
      </div>
    </div>
  );
}

function ReadinessChecks({ presentChecks, closeChecks }: { presentChecks: { label: string; ok: boolean }[]; closeChecks: { label: string; ok: boolean }[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Present</p>
      {presentChecks.map((c, i) => <div key={i} className="flex items-center gap-1.5 text-[10px]">{c.ok ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> : <Lock className="h-2.5 w-2.5 text-muted-foreground/30" />}<span className={c.ok ? "text-foreground/60" : "text-muted-foreground/30"}>{c.label}</span></div>)}
      <Separator className="bg-border/15" />
      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Close</p>
      {closeChecks.map((c, i) => <div key={i} className="flex items-center gap-1.5 text-[10px]">{c.ok ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> : <Lock className="h-2.5 w-2.5 text-muted-foreground/30" />}<span className={c.ok ? "text-foreground/60" : "text-muted-foreground/30"}>{c.label}</span></div>)}
    </div>
  );
}
