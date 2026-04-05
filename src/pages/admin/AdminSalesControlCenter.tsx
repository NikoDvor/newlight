import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowRightLeft, Lock, Unlock, Clipboard, Send, RotateCcw
} from "lucide-react";
import { computeQuote, WEBSITE_BUILD_FEES, type QuoteInput } from "@/lib/workspaceQuoteEngine";
import { generateClientIntelligence } from "@/lib/clientIntelligenceEngine";
import { generatePackageFitNarrative } from "@/lib/packageFitNarrative";
import { resolveOperationType, isFinancialFirm, BUSINESS_OPERATION_TYPES } from "@/lib/businessOperationTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { toast } from "sonner";

// ═══════════════════════════════════════════════
// Package Presets
// ═══════════════════════════════════════════════
const PACKAGE_PRESETS: Record<string, { label: string; modules: string[]; description: string; includeApp?: boolean }> = {
  core_only: { label: "Core Platform Only", modules: [], description: "Platform setup with no growth modules." },
  growth_starter: { label: "Growth Starter", modules: ["seo", "reputation_reviews"], description: "SEO + reputation for organic growth." },
  growth_engine: { label: "Growth Engine", modules: ["paid_ads", "seo", "crm_automation", "tracking_attribution"], description: "Full lead gen + CRM + attribution." },
  premium_growth: { label: "Premium Growth System", modules: ["paid_ads", "seo", "crm_automation", "lifecycle_nurture", "reputation_reviews", "tracking_attribution", "website_management"], description: "Complete growth system." },
  premium_app: { label: "Premium + App Launch", modules: ["paid_ads", "seo", "crm_automation", "lifecycle_nurture", "reputation_reviews", "tracking_attribution", "website_management"], description: "Premium + App Store Launch.", includeApp: true },
};

// ═══════════════════════════════════════════════
// Module metadata
// ═══════════════════════════════════════════════
const MODULE_META: Record<string, { icon: any; upsellNote: string }> = {
  paid_ads: { icon: TrendingUp, upsellNote: "Scale lead volume fast with proven offer." },
  seo: { icon: Globe, upsellNote: "Critical for local/search businesses. Compounds." },
  website_management: { icon: Globe, upsellNote: "Essential if current site is outdated." },
  crm_automation: { icon: Layers, upsellNote: "Must-have for multi-touch sales." },
  lifecycle_nurture: { icon: Target, upsellNote: "High-value for repeat/recurring revenue." },
  reputation_reviews: { icon: Star, upsellNote: "Quick win — social proof + local rank." },
  tracking_attribution: { icon: BarChart3, upsellNote: "Required for multi-channel ROI." },
  financial_compliance: { icon: Shield, upsellNote: "Mandatory for regulated industries." },
};

// ═══════════════════════════════════════════════
// Saved Quote Version
// ═══════════════════════════════════════════════
interface QuoteVersion {
  id: string;
  name: string;
  modules: string[];
  hasPurchasedSetup: boolean;
  websiteBuild: string | null;
  appStoreLaunch: boolean;
  setupOverride: string;
  monthlyOverride: string;
  discountPct: string;
  isRecommended: boolean;
  isPresented: boolean;
}

function createVersion(name: string, modules: string[], extras?: Partial<QuoteVersion>): QuoteVersion {
  return {
    id: crypto.randomUUID(),
    name,
    modules: [...modules],
    hasPurchasedSetup: false,
    websiteBuild: null,
    appStoreLaunch: false,
    setupOverride: "",
    monthlyOverride: "",
    discountPct: "",
    isRecommended: false,
    isPresented: false,
    ...extras,
  };
}

// ═══════════════════════════════════════════════
// Proposal Status
// ═══════════════════════════════════════════════
const PROPOSAL_STATUSES = [
  { key: "draft", label: "Draft", color: "bg-white/10 text-white/50" },
  { key: "ready_review", label: "Ready for Review", color: "bg-blue-500/20 text-blue-400" },
  { key: "ready_final", label: "Ready for Final Meeting", color: "bg-cyan-500/20 text-cyan-400" },
  { key: "revealed", label: "Revealed to Client", color: "bg-emerald-500/20 text-emerald-400" },
  { key: "accepted", label: "Accepted", color: "bg-emerald-500/30 text-emerald-300" },
  { key: "needs_revision", label: "Needs Revision", color: "bg-amber-500/20 text-amber-400" },
] as const;

// ═══════════════════════════════════════════════
// Sales Fit Indicators
// ═══════════════════════════════════════════════
function getSalesFitIndicators(profile: WorkspaceProfile) {
  const niche = NICHE_REGISTRY[profile.niche || ""];
  const financial = isFinancialFirm(profile.industry);
  const compliance = niche?.complianceLevel || "none";
  const ticketSize = niche?.ticketSize || "medium";
  const indicators: { label: string; value: string; color: string }[] = [];

  if (financial || compliance === "high") {
    indicators.push({ label: "Fit Strength", value: "Premium Opportunity", color: "text-amber-400" });
    indicators.push({ label: "Flexibility", value: "Low — Compliance Required", color: "text-orange-400" });
    indicators.push({ label: "Likely Easiest Upsell", value: "Compliance Add-On", color: "text-cyan-400" });
  } else if (ticketSize === "high" || ticketSize === "premium") {
    indicators.push({ label: "Fit Strength", value: "Strong Fit", color: "text-emerald-400" });
    indicators.push({ label: "Flexibility", value: "Moderate", color: "text-blue-400" });
    indicators.push({ label: "Likely Easiest Upsell", value: "App Store Launch", color: "text-cyan-400" });
  } else {
    indicators.push({ label: "Fit Strength", value: "Standard Fit", color: "text-blue-400" });
    indicators.push({ label: "Flexibility", value: "High — Value-Sensitive", color: "text-green-400" });
    indicators.push({ label: "Likely Easiest Upsell", value: "Paid Ads or SEO", color: "text-cyan-400" });
  }

  if (compliance === "high") indicators.push({ label: "Compliance", value: "High — Regulated", color: "text-red-400" });
  else if (compliance === "moderate") indicators.push({ label: "Compliance", value: "Moderate", color: "text-yellow-400" });

  return indicators;
}

// ═══════════════════════════════════════════════
// Workflow Steps
// ═══════════════════════════════════════════════
const WORKFLOW_STEPS = [
  { key: "booked", label: "Booked", icon: CheckCircle2 },
  { key: "workspace_created", label: "Workspace", icon: CheckCircle2 },
  { key: "invite_sent", label: "Invite Sent", icon: CheckCircle2 },
  { key: "first_meeting", label: "First Meeting", icon: Clock },
  { key: "proposal_intake", label: "Intake", icon: FileText },
  { key: "proposal_drafted", label: "Drafted", icon: FileText },
  { key: "final_meeting", label: "Final Meeting", icon: Clock },
  { key: "proposal_revealed", label: "Revealed", icon: Zap },
  { key: "activation_complete", label: "Activated", icon: CheckCircle2 },
  { key: "payment_ready", label: "Payment Ready", icon: DollarSign },
  { key: "paid", label: "Paid", icon: CheckCircle2 },
];

// ═══════════════════════════════════════════════
// Readiness Checks
// ═══════════════════════════════════════════════
function getReadiness(
  profile: WorkspaceProfile,
  modules: string[],
  quote: { totalUpfront: number; totalMonthly: number },
  proposalStatus: string,
  currentStage: string,
  narrative: { opportunity: string }
) {
  const stageIdx = WORKFLOW_STEPS.findIndex(s => s.key === currentStage);
  const presentChecks = [
    { label: "Workspace profile complete", ok: !!profile.industry && !!profile.archetype },
    { label: "Niche selected", ok: !!profile.niche },
    { label: "Package built (modules selected)", ok: modules.length > 0 || true },
    { label: "Quote computed", ok: quote.totalUpfront > 0 || quote.totalMonthly > 0 },
    { label: "Proposal narrative generated", ok: !!narrative.opportunity },
  ];
  const closeChecks = [
    { label: "Proposal revealed to client", ok: proposalStatus === "revealed" || proposalStatus === "accepted" },
    { label: "Final meeting completed", ok: stageIdx >= 7 },
    { label: "Activation steps complete", ok: stageIdx >= 8 },
    { label: "Payment unlocked", ok: stageIdx >= 9 },
  ];
  return { presentChecks, closeChecks };
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
export default function AdminSalesControlCenter() {
  const navigate = useNavigate();

  // Profile
  const [profile] = useState<WorkspaceProfile>({
    industry: "healthcare_wellness",
    niche: "med_spa",
    archetype: "appointments",
    zoomTier: "z3",
    legacyProfileType: "appointment_local",
    legacyIndustryValue: "healthcare & wellness",
    metadata: { revenueModel: "consultation", salesCycle: "short", ticketSize: "high", complexityLevel: "medium", complianceLevel: "moderate" },
  });

  // ── Quote Versions ──
  const [versions, setVersions] = useState<QuoteVersion[]>([
    createVersion("Version A — Growth Engine", ["paid_ads", "seo", "crm_automation", "reputation_reviews"]),
  ]);
  const [activeVersionId, setActiveVersionId] = useState(versions[0].id);
  const activeVersion = versions.find(v => v.id === activeVersionId) || versions[0];

  const updateActiveVersion = useCallback((patch: Partial<QuoteVersion>) => {
    setVersions(prev => prev.map(v => v.id === activeVersionId ? { ...v, ...patch } : v));
  }, [activeVersionId]);

  const duplicateVersion = () => {
    const dup = createVersion(`${activeVersion.name} (Copy)`, activeVersion.modules, {
      hasPurchasedSetup: activeVersion.hasPurchasedSetup,
      websiteBuild: activeVersion.websiteBuild,
      appStoreLaunch: activeVersion.appStoreLaunch,
      setupOverride: activeVersion.setupOverride,
      monthlyOverride: activeVersion.monthlyOverride,
      discountPct: activeVersion.discountPct,
    });
    setVersions(prev => [...prev, dup]);
    setActiveVersionId(dup.id);
    toast.success("Quote version duplicated");
  };

  const addNewVersion = () => {
    const v = createVersion(`Version ${String.fromCharCode(65 + versions.length)}`, []);
    setVersions(prev => [...prev, v]);
    setActiveVersionId(v.id);
  };

  // ── Proposal Status ──
  const [proposalStatus, setProposalStatus] = useState("draft");

  // ── Workflow Stage ──
  const [currentStage, setCurrentStage] = useState("first_meeting");

  // ── Structured Sales Notes ──
  const [notes, setNotes] = useState({
    objections: "",
    decisionMaker: "",
    urgency: "",
    discountReasoning: "",
    upsellAngle: "",
    fulfillmentCautions: "",
    followUpPlan: "",
    onboardingHandoff: "",
  });

  // ── Computed ──
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const financial = isFinancialFirm(profile.industry);
  const niche = NICHE_REGISTRY[profile.niche || ""];
  const intel = useMemo(() => generateClientIntelligence(profile), [profile]);
  const narrative = useMemo(() => generatePackageFitNarrative(profile, activeVersion.modules), [profile, activeVersion.modules]);

  const quote = useMemo(() => computeQuote({
    workspaceProfile: profile,
    selectedModules: activeVersion.modules,
    hasPurchasedPlatformSetup: activeVersion.hasPurchasedSetup,
    includeWebsiteBuild: activeVersion.websiteBuild,
    includeAppStoreLaunchUpgrade: activeVersion.appStoreLaunch,
  }), [profile, activeVersion]);

  const discountPct = activeVersion.discountPct ? parseFloat(activeVersion.discountPct) : 0;
  const effectiveSetup = activeVersion.setupOverride ? parseInt(activeVersion.setupOverride) : Math.round(quote.totalUpfront * (1 - discountPct / 100));
  const effectiveMonthly = activeVersion.monthlyOverride ? parseInt(activeVersion.monthlyOverride) : Math.round(quote.totalMonthly * (1 - discountPct / 100));
  const setupDiff = quote.totalUpfront - effectiveSetup;
  const monthlyDiff = quote.totalMonthly - effectiveMonthly;

  const allModules = Object.keys(MODULE_META);
  const recommendedModules = useMemo(() => {
    const priority = niche?.modulePriority || [];
    if (financial) return [...new Set(["crm_automation", "financial_compliance", "tracking_attribution", ...priority])];
    return priority;
  }, [niche, financial]);

  const toggleModule = (key: string) => {
    const next = activeVersion.modules.includes(key) ? activeVersion.modules.filter(m => m !== key) : [...activeVersion.modules, key];
    updateActiveVersion({ modules: next });
  };

  const applyPreset = (presetKey: string) => {
    const preset = PACKAGE_PRESETS[presetKey];
    if (!preset) return;
    updateActiveVersion({ modules: preset.modules, appStoreLaunch: !!preset.includeApp });
  };

  const stageIndex = WORKFLOW_STEPS.findIndex(s => s.key === currentStage);
  const fitIndicators = useMemo(() => getSalesFitIndicators(profile), [profile]);
  const readiness = useMemo(() => getReadiness(profile, activeVersion.modules, quote, proposalStatus, currentStage, narrative), [profile, activeVersion.modules, quote, proposalStatus, currentStage, narrative]);

  const readyToPresent = readiness.presentChecks.every(c => c.ok);
  const readyToClose = readiness.closeChecks.every(c => c.ok);

  // ═══════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════
  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BackArrow to="/admin/clients" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sales Control Center</h1>
            <p className="text-xs text-muted-foreground">Internal pricing, packaging & proposal management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {readyToPresent && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Ready to Present
            </Badge>
          )}
          {readyToClose && (
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
              <Unlock className="h-3 w-3 mr-1" /> Ready to Close
            </Badge>
          )}
          <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10 px-3 py-1 text-[10px]">
            ADMIN ONLY
          </Badge>
        </div>
      </div>

      {/* ── Workflow Status Strip ── */}
      <Card className="p-3 bg-card/60 border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <div key={step.key} className="flex items-center shrink-0">
                <button
                  onClick={() => setCurrentStage(step.key)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                    active ? "bg-primary/20 text-primary ring-1 ring-primary/40" :
                    done ? "bg-emerald-500/10 text-emerald-400/80" :
                    "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <step.icon className="h-3 w-3" />
                  <span className="hidden xl:inline">{step.label}</span>
                </button>
                {i < WORKFLOW_STEPS.length - 1 && <ChevronRight className={`h-3 w-3 mx-0.5 ${done ? "text-emerald-500/40" : "text-muted-foreground/20"}`} />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Proposal Status Actions ── */}
      <Card className="p-3 bg-card/60 border-border/40 backdrop-blur-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Proposal:</span>
            {PROPOSAL_STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => {
                  setProposalStatus(s.key);
                  toast.success(`Proposal status: ${s.label}`);
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  proposalStatus === s.key ? s.color + " ring-1 ring-current/30" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Quote Versions Tab Bar ── */}
      <Card className="p-3 bg-card/60 border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {versions.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveVersionId(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium shrink-0 transition-all ${
                v.id === activeVersionId ? "bg-primary/20 text-primary ring-1 ring-primary/30" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {v.isRecommended && <Star className="h-3 w-3 text-amber-400" />}
              {v.isPresented && <Eye className="h-3 w-3 text-emerald-400" />}
              {v.name}
            </button>
          ))}
          <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground shrink-0" onClick={addNewVersion}>+ New</Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground shrink-0" onClick={duplicateVersion}><Copy className="h-3 w-3 mr-1" />Duplicate</Button>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { updateActiveVersion({ isRecommended: !activeVersion.isRecommended }); toast.success(activeVersion.isRecommended ? "Unmarked" : "Marked as recommended"); }}>
              <Star className={`h-3 w-3 mr-1 ${activeVersion.isRecommended ? "text-amber-400 fill-amber-400" : ""}`} /> {activeVersion.isRecommended ? "Recommended" : "Mark Recommended"}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { updateActiveVersion({ isPresented: !activeVersion.isPresented }); toast.success(activeVersion.isPresented ? "Unmarked" : "Marked as presented"); }}>
              <Eye className={`h-3 w-3 mr-1 ${activeVersion.isPresented ? "text-emerald-400" : ""}`} /> {activeVersion.isPresented ? "Presented" : "Mark Presented"}
            </Button>
          </div>
        </div>
        {/* Rename */}
        <div className="mt-2 flex items-center gap-2">
          <Pencil className="h-3 w-3 text-muted-foreground" />
          <Input
            value={activeVersion.name}
            onChange={e => updateActiveVersion({ name: e.target.value })}
            className="h-7 text-xs bg-transparent border-muted/30 max-w-xs"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ═══ LEFT COL (3) ═══ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Business Profile */}
          <SectionCard icon={Brain} title="Business Profile">
            <div className="space-y-1.5 text-xs">
              <Row label="Industry" value={profile.industry.replace(/_/g, " ")} />
              <Row label="Niche" value={niche?.label || profile.niche || "General"} />
              <Row label="Operation" value={BUSINESS_OPERATION_TYPES[opType]?.label || opType} />
              <Row label="Archetype" value={profile.archetype.replace(/_/g, " ")} />
              <Row label="Zoom Tier" value={profile.zoomTier.toUpperCase()} />
              {financial && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-400 text-[10px] font-semibold">Premium Financial Firm</span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Pricing Rationale */}
          <SectionCard icon={Info} title="Pricing Rationale">
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <p><span className="text-foreground/80 font-medium">Ticket Size:</span> {niche?.ticketSize || "medium"}</p>
              <p><span className="text-foreground/80 font-medium">Compliance:</span> {niche?.complianceLevel || "none"}</p>
              <p><span className="text-foreground/80 font-medium">Complexity:</span> {intel.businessComplexityLabel}</p>
              <p><span className="text-foreground/80 font-medium">Tier:</span> {financial ? "Premium Financial" : opType.replace(/_/g, " ")}</p>
              <Separator className="my-1.5 bg-border/30" />
              <p className="text-muted-foreground/70 italic text-[10px]">
                {financial ? "Compliance overhead + high AUM = premium pricing." :
                 niche?.ticketSize === "high" ? "High-ticket LTV justifies elevated pricing." :
                 "Competitive pricing for this segment."}
              </p>
            </div>
          </SectionCard>

          {/* Sales Fit */}
          <SectionCard icon={Target} title="Sales Fit Indicators">
            <div className="space-y-1.5">
              {fitIndicators.map((ind, i) => (
                <div key={i} className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">{ind.label}</span>
                  <span className={`font-semibold ${ind.color}`}>{ind.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Intelligence */}
          <SectionCard icon={Zap} title="Client Intelligence">
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <p><span className="text-foreground/80 font-medium">Revenue Opp:</span> {intel.revenueOpportunity}</p>
              <p><span className="text-foreground/80 font-medium">Growth Lever:</span> {intel.primaryGrowthLever}</p>
              <p><span className="text-foreground/80 font-medium">Urgency:</span> <span className="text-amber-400">{intel.urgencySignal}</span></p>
            </div>
          </SectionCard>

          {/* Readiness Checks */}
          <SectionCard icon={CheckCircle2} title="Readiness">
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Ready to Present</p>
              {readiness.presentChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {c.ok ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Lock className="h-3 w-3 text-muted-foreground/40" />}
                  <span className={c.ok ? "text-foreground/70" : "text-muted-foreground/40"}>{c.label}</span>
                </div>
              ))}
              <Separator className="my-1.5 bg-border/20" />
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Ready to Close</p>
              {readiness.closeChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {c.ok ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Lock className="h-3 w-3 text-muted-foreground/40" />}
                  <span className={c.ok ? "text-foreground/70" : "text-muted-foreground/40"}>{c.label}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ═══ MIDDLE COL (5) ═══ */}
        <div className="lg:col-span-5 space-y-4">
          {/* Presets */}
          <SectionCard icon={Package} title="Package Presets">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(PACKAGE_PRESETS).map(([key, preset]) => (
                <button key={key} onClick={() => applyPreset(key)} className="text-left p-2 rounded-md bg-muted/20 hover:bg-primary/10 border border-border/30 hover:border-primary/30 transition-all group">
                  <div className="text-[10px] font-semibold text-foreground group-hover:text-primary">{preset.label}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Modules */}
          <SectionCard icon={Layers} title="Growth Modules" action={
            <Button size="sm" variant="outline" className="text-[10px] h-6 border-primary/30 text-primary hover:bg-primary/10" onClick={() => updateActiveVersion({ modules: [...recommendedModules] })}>
              Select Recommended
            </Button>
          }>
            <div className="space-y-1.5">
              {allModules.map(key => {
                const meta = MODULE_META[key];
                const Icon = meta.icon;
                const active = activeVersion.modules.includes(key);
                const recommended = recommendedModules.includes(key);
                return (
                  <button key={key} onClick={() => toggleModule(key)} className={`w-full text-left p-2.5 rounded-md border transition-all ${active ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-border/20 hover:border-border/40"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground/40"}`} />
                        <span className={`text-[11px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                          {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        {recommended && <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary border-0 px-1">REC</Badge>}
                      </div>
                      <Switch checked={active} onCheckedChange={() => toggleModule(key)} className="scale-[0.65]" />
                    </div>
                    {active && <p className="text-[10px] text-muted-foreground/60 mt-1 ml-5">{meta.upsellNote}</p>}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Upsells */}
          <SectionCard icon={TrendingUp} title="Elite Upsells">
            <div className="space-y-2">
              <UpsellRow label="Website Build" sublabel={niche?.modulePriority?.includes("website_management") ? "⚡ Recommended" : "Optional"}>
                <Select value={activeVersion.websiteBuild || "none"} onValueChange={v => updateActiveVersion({ websiteBuild: v === "none" ? null : v })}>
                  <SelectTrigger className="w-36 h-7 text-[10px] bg-muted/10 border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not Included</SelectItem>
                    {Object.entries(WEBSITE_BUILD_FEES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} — ${v.fee.toLocaleString()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </UpsellRow>
              <UpsellRow label="App Store Launch" sublabel={financial ? "⚡ Strong upsell" : "Standard add-on"}>
                <Switch checked={activeVersion.appStoreLaunch} onCheckedChange={v => updateActiveVersion({ appStoreLaunch: v })} className="scale-[0.65]" />
              </UpsellRow>
              <UpsellRow label="Platform Setup Purchased" sublabel="Waives module activation fees">
                <Switch checked={activeVersion.hasPurchasedSetup} onCheckedChange={v => updateActiveVersion({ hasPurchasedSetup: v })} className="scale-[0.65]" />
              </UpsellRow>
            </div>
          </SectionCard>

          {/* Handoff Panel */}
          <SectionCard icon={ArrowRightLeft} title="Sales → Onboarding Handoff">
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <p><span className="text-foreground/80 font-medium">Package:</span> {activeVersion.name}</p>
              <p><span className="text-foreground/80 font-medium">Modules:</span> {activeVersion.modules.length > 0 ? activeVersion.modules.map(m => m.replace(/_/g, " ")).join(", ") : "Core only"}</p>
              <p><span className="text-foreground/80 font-medium">Website Build:</span> {activeVersion.websiteBuild ? WEBSITE_BUILD_FEES[activeVersion.websiteBuild]?.label : "None"}</p>
              <p><span className="text-foreground/80 font-medium">App Launch:</span> {activeVersion.appStoreLaunch ? "Yes" : "No"}</p>
              <p><span className="text-foreground/80 font-medium">Compliance:</span> {niche?.complianceLevel || "none"}</p>
              <p><span className="text-foreground/80 font-medium">Priority:</span> {narrative.next90Days}</p>
              <Separator className="my-1.5 bg-border/20" />
              <p><span className="text-foreground/80 font-medium">Focus Outcomes:</span></p>
              {narrative.focusOutcomes.map((o, i) => <p key={i} className="text-muted-foreground/60 ml-2">• {o}</p>)}
              <Separator className="my-1.5 bg-border/20" />
              <Textarea
                placeholder="Handoff notes for onboarding team..."
                value={notes.onboardingHandoff}
                onChange={e => setNotes(prev => ({ ...prev, onboardingHandoff: e.target.value }))}
                className="text-[10px] bg-muted/10 border-border/20 min-h-[50px]"
              />
            </div>
          </SectionCard>
        </div>

        {/* ═══ RIGHT COL (4) ═══ */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Quote */}
          <Card className="p-4 bg-card/60 border-primary/20 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Live Internal Quote
              {activeVersion.isRecommended && <Badge className="text-[8px] bg-amber-500/20 text-amber-400 border-0 ml-auto">★ Recommended</Badge>}
            </h3>
            <div className="space-y-2">
              {quote.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between items-start text-[11px]">
                  <span className={`flex-1 ${item.category === "platform" ? "text-foreground font-medium" : item.category === "included" ? "text-muted-foreground/40" : "text-foreground/70"}`}>{item.label}</span>
                  <div className="text-right shrink-0 ml-2">
                    {item.upfront > 0 && <div className="text-foreground/80">${item.upfront.toLocaleString()}</div>}
                    {item.monthly > 0 && <div className="text-primary/80">${item.monthly.toLocaleString()}/mo</div>}
                    {item.upfront === 0 && item.monthly === 0 && <div className="text-muted-foreground/30">Included</div>}
                  </div>
                </div>
              ))}
              <Separator className="my-2 bg-border/20" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground">Original Upfront</span>
                <span className="text-sm font-bold text-foreground">${quote.totalUpfront.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground">Original Monthly</span>
                <span className="text-sm font-bold text-primary">${quote.totalMonthly.toLocaleString()}/mo</span>
              </div>
              {(setupDiff !== 0 || monthlyDiff !== 0) && (
                <>
                  <Separator className="my-2 bg-border/20" />
                  <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[10px] font-semibold text-amber-400 mb-1">After Overrides/Discount:</p>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-amber-400">Effective Setup</span>
                      <span className="text-amber-300 font-bold">${effectiveSetup.toLocaleString()} <span className="text-[9px] font-normal">(-${setupDiff.toLocaleString()})</span></span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-amber-400">Effective Monthly</span>
                      <span className="text-amber-300 font-bold">${effectiveMonthly.toLocaleString()}/mo <span className="text-[9px] font-normal">(-${monthlyDiff.toLocaleString()})</span></span>
                    </div>
                    {discountPct > 15 && <p className="text-[9px] text-red-400 mt-1 font-semibold">⚠ Aggressive discount ({discountPct}%). Verify margin impact.</p>}
                    {discountPct > 0 && discountPct <= 15 && <p className="text-[9px] text-amber-400/70 mt-1">Discount within acceptable range ({discountPct}%).</p>}
                  </div>
                </>
              )}
              {quote.hardCostNotes.length > 0 && (
                <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[9px] font-semibold text-amber-400 mb-0.5">Hard Costs:</p>
                  {quote.hardCostNotes.map((n, i) => <p key={i} className="text-[9px] text-amber-400/70">• {n}</p>)}
                </div>
              )}
            </div>
          </Card>

          {/* Price Overrides + Discount */}
          <SectionCard icon={AlertTriangle} title="Overrides & Discount" iconColor="text-amber-400">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Setup Override</label>
                  <Input type="number" placeholder={`$${quote.totalUpfront.toLocaleString()}`} value={activeVersion.setupOverride} onChange={e => updateActiveVersion({ setupOverride: e.target.value })} className="h-7 text-[10px] bg-muted/10 border-border/20" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Monthly Override</label>
                  <Input type="number" placeholder={`$${quote.totalMonthly.toLocaleString()}`} value={activeVersion.monthlyOverride} onChange={e => updateActiveVersion({ monthlyOverride: e.target.value })} className="h-7 text-[10px] bg-muted/10 border-border/20" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Discount %</label>
                <Input type="number" placeholder="0" value={activeVersion.discountPct} onChange={e => updateActiveVersion({ discountPct: e.target.value })} className="h-7 text-[10px] bg-muted/10 border-border/20 max-w-24" />
              </div>
              {discountPct > 20 && <p className="text-[9px] text-destructive font-semibold">⚠ Discount exceeds 20%. Requires leadership approval.</p>}
            </div>
          </SectionCard>

          {/* Narrative */}
          <SectionCard icon={FileText} title="Package Narrative">
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <p><span className="text-foreground/80 font-medium">Opportunity:</span> {narrative.opportunity}</p>
              <p><span className="text-foreground/80 font-medium">Solves:</span> {narrative.whatItSolves}</p>
              <p><span className="text-foreground/80 font-medium">90-Day:</span> {narrative.next90Days}</p>
            </div>
          </SectionCard>

          {/* Structured Sales Notes */}
          <SectionCard icon={Clipboard} title="Sales Notes">
            <div className="space-y-2">
              {([
                ["objections", "Objections & Responses"],
                ["decisionMaker", "Decision-Maker Notes"],
                ["urgency", "Urgency Notes"],
                ["discountReasoning", "Discount Reasoning"],
                ["upsellAngle", "Upsell Angle"],
                ["fulfillmentCautions", "Fulfillment Cautions"],
                ["followUpPlan", "Follow-Up Plan"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">{label}</label>
                  <Textarea
                    placeholder={`${label}...`}
                    value={notes[key]}
                    onChange={e => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                    className="text-[10px] bg-muted/10 border-border/20 min-h-[36px]"
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Shared Sub-Components
// ═══════════════════════════════════════════════
function SectionCard({ icon: Icon, title, children, action, iconColor = "text-primary" }: { icon: any; title: string; children: React.ReactNode; action?: React.ReactNode; iconColor?: string }) {
  return (
    <Card className="p-4 bg-card/60 border-border/40 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} /> {title}
        </h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground/80 font-medium capitalize text-[11px]">{value}</span>
    </div>
  );
}

function UpsellRow({ label, sublabel, children }: { label: string; sublabel: string; children: React.ReactNode }) {
  return (
    <div className="p-2.5 rounded-md bg-muted/10 border border-border/20">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-foreground">{label}</span>
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{sublabel}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
