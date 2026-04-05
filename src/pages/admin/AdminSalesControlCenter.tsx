import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  DollarSign, Package, Zap, TrendingUp, Shield, Globe, Smartphone,
  ChevronRight, CheckCircle2, Clock, AlertTriangle, FileText, Brain,
  Target, Layers, BarChart3, Star, Info
} from "lucide-react";
import { computeQuote, WEBSITE_BUILD_FEES, type QuoteInput, type QuoteOutput } from "@/lib/workspaceQuoteEngine";
import { generateClientIntelligence } from "@/lib/clientIntelligenceEngine";
import { generatePackageFitNarrative } from "@/lib/packageFitNarrative";
import { resolveOperationType, isFinancialFirm, BUSINESS_OPERATION_TYPES } from "@/lib/businessOperationTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";

// ── Package Presets ──
const PACKAGE_PRESETS: Record<string, { label: string; modules: string[]; description: string }> = {
  core_only: {
    label: "Core Platform Only",
    modules: [],
    description: "Platform setup with no growth modules. Foundation only.",
  },
  growth_starter: {
    label: "Growth Starter",
    modules: ["seo", "reputation_reviews"],
    description: "SEO + reputation for foundational organic growth.",
  },
  growth_engine: {
    label: "Growth Engine",
    modules: ["paid_ads", "seo", "crm_automation", "tracking_attribution"],
    description: "Full lead generation + CRM automation + attribution.",
  },
  premium_growth: {
    label: "Premium Growth System",
    modules: ["paid_ads", "seo", "crm_automation", "lifecycle_nurture", "reputation_reviews", "tracking_attribution", "website_management"],
    description: "Complete system: ads, SEO, CRM, nurture, reviews, tracking, website.",
  },
  premium_app: {
    label: "Premium + App Launch",
    modules: ["paid_ads", "seo", "crm_automation", "lifecycle_nurture", "reputation_reviews", "tracking_attribution", "website_management"],
    description: "Premium Growth System plus App Store Launch Upgrade.",
  },
};

// ── Module metadata for upsell/rationale ──
const MODULE_META: Record<string, { icon: any; upsellNote: string }> = {
  paid_ads: { icon: TrendingUp, upsellNote: "Best for businesses with proven offer looking to scale lead volume fast." },
  seo: { icon: Globe, upsellNote: "Critical for local or search-driven businesses. Compounds over time." },
  website_management: { icon: Globe, upsellNote: "Essential if the client's current site is outdated or unconverted." },
  crm_automation: { icon: Layers, upsellNote: "Must-have for any business with a multi-touch sales process." },
  lifecycle_nurture: { icon: Target, upsellNote: "High-value for businesses with repeat/recurring revenue potential." },
  reputation_reviews: { icon: Star, upsellNote: "Quick win — builds social proof and local search ranking fast." },
  tracking_attribution: { icon: BarChart3, upsellNote: "Required for multi-channel businesses. Validates ROI." },
  financial_compliance: { icon: Shield, upsellNote: "Mandatory for financial, legal, or heavily regulated industries." },
};

// ── Sales Fit Indicators ──
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

// ── Workflow Steps ──
const WORKFLOW_STEPS = [
  { key: "booked", label: "Booked", icon: CheckCircle2 },
  { key: "workspace_created", label: "Workspace Created", icon: CheckCircle2 },
  { key: "invite_sent", label: "Invite Sent", icon: CheckCircle2 },
  { key: "first_meeting", label: "First Meeting", icon: Clock },
  { key: "proposal_intake", label: "Proposal Intake", icon: FileText },
  { key: "proposal_drafted", label: "Proposal Drafted", icon: FileText },
  { key: "final_meeting", label: "Final Meeting", icon: Clock },
  { key: "proposal_revealed", label: "Proposal Revealed", icon: Zap },
  { key: "activation_complete", label: "Activation Complete", icon: CheckCircle2 },
  { key: "payment_ready", label: "Payment Ready", icon: DollarSign },
  { key: "paid", label: "Paid", icon: CheckCircle2 },
];

// ── Main Component ──
export default function AdminSalesControlCenter() {
  const navigate = useNavigate();

  // Demo workspace profile (in production, fetched from DB for the selected client)
  const [profile, setProfile] = useState<WorkspaceProfile>({
    industry: "healthcare_wellness",
    niche: "med_spa",
    archetype: "appointments",
    zoomTier: "z3",
    legacyProfileType: "appointment_local",
    legacyIndustryValue: "healthcare & wellness",
    metadata: {
      revenueModel: "consultation",
      salesCycle: "short",
      ticketSize: "high",
      complexityLevel: "medium",
      complianceLevel: "moderate",
    },
  });

  // Module selection state
  const allModules = Object.keys(MODULE_META);
  const [selectedModules, setSelectedModules] = useState<string[]>(["paid_ads", "seo", "crm_automation", "reputation_reviews"]);
  const [hasPurchasedSetup, setHasPurchasedSetup] = useState(false);
  const [websiteBuild, setWebsiteBuild] = useState<string | null>(null);
  const [appStoreLaunch, setAppStoreLaunch] = useState(false);

  // Price overrides
  const [setupOverride, setSetupOverride] = useState<string>("");
  const [monthlyOverride, setMonthlyOverride] = useState<string>("");

  // Sales notes
  const [salesNotes, setSalesNotes] = useState("");
  const [objectionNotes, setObjectionNotes] = useState("");

  // Workflow stage
  const [currentStage, setCurrentStage] = useState("first_meeting");

  // ── Computed ──
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const financial = isFinancialFirm(profile.industry);
  const niche = NICHE_REGISTRY[profile.niche || ""];
  const intel = useMemo(() => generateClientIntelligence(profile), [profile]);
  const narrative = useMemo(
    () => generatePackageFitNarrative(profile, selectedModules),
    [profile, selectedModules]
  );

  const quoteInput: QuoteInput = {
    workspaceProfile: profile,
    selectedModules,
    hasPurchasedPlatformSetup: hasPurchasedSetup,
    includeWebsiteBuild: websiteBuild,
    includeAppStoreLaunchUpgrade: appStoreLaunch,
  };
  const quote = useMemo(() => computeQuote(quoteInput), [profile, selectedModules, hasPurchasedSetup, websiteBuild, appStoreLaunch]);

  const effectiveSetup = setupOverride ? parseInt(setupOverride) : quote.totalUpfront;
  const effectiveMonthly = monthlyOverride ? parseInt(monthlyOverride) : quote.totalMonthly;

  const toggleModule = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const applyPreset = (presetKey: string) => {
    const preset = PACKAGE_PRESETS[presetKey];
    if (!preset) return;
    setSelectedModules(preset.modules);
    setAppStoreLaunch(presetKey === "premium_app");
  };

  // Niche-recommended modules
  const recommendedModules = useMemo(() => {
    const priority = niche?.modulePriority || [];
    if (financial) return [...new Set(["crm_automation", "financial_compliance", "tracking_attribution", ...priority])];
    return priority;
  }, [niche, financial]);

  const stageIndex = WORKFLOW_STEPS.findIndex(s => s.key === currentStage);
  const fitIndicators = useMemo(() => getSalesFitIndicators(profile), [profile]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackArrow to="/admin/clients" />
          <div>
            <h1 className="text-2xl font-bold text-white">Sales Control Center</h1>
            <p className="text-sm text-white/50">Internal pricing, packaging, and proposal management</p>
          </div>
        </div>
        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 px-3 py-1">
          ADMIN ONLY
        </Badge>
      </div>

      {/* ── WORKFLOW STATUS STRIP ── */}
      <Card className="p-4 bg-card/60 border-border/40 backdrop-blur-sm">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Sales Workflow</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <div key={step.key} className="flex items-center shrink-0">
                <button
                  onClick={() => setCurrentStage(step.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40" :
                    done ? "bg-emerald-500/10 text-emerald-400/80" :
                    "bg-white/5 text-white/30 hover:bg-white/10"
                  }`}
                >
                  <step.icon className="h-3 w-3" />
                  <span className="hidden lg:inline">{step.label}</span>
                </button>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight className={`h-3 w-3 mx-0.5 ${done ? "text-emerald-500/40" : "text-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN: Business Summary + Price Review ── */}
        <div className="space-y-5">
          {/* Business Summary */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-400" /> Business Profile
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="Industry" value={profile.industry.replace(/_/g, " ")} />
              <Row label="Niche" value={(niche?.label || profile.niche || "General").replace(/_/g, " ")} />
              <Row label="Operation Type" value={BUSINESS_OPERATION_TYPES[opType]?.label || opType} />
              <Row label="Archetype" value={profile.archetype.replace(/_/g, " ")} />
              <Row label="Zoom Tier" value={profile.zoomTier.toUpperCase()} />
              {financial && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-400 text-xs font-semibold">Premium Financial Firm</span>
                </div>
              )}
            </div>
          </Card>

          {/* Price Review Panel */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-400" /> Pricing Rationale
            </h3>
            <div className="space-y-2 text-xs text-white/60">
              <p><span className="text-white/80 font-medium">Ticket Size:</span> {niche?.ticketSize || "medium"}</p>
              <p><span className="text-white/80 font-medium">Compliance:</span> {niche?.complianceLevel || "none"}</p>
              <p><span className="text-white/80 font-medium">Complexity:</span> {intel.businessComplexityLabel}</p>
              <p><span className="text-white/80 font-medium">Pricing Tier:</span> {financial ? "Premium Financial" : opType.replace(/_/g, " ")}</p>
              <Separator className="my-2 bg-white/10" />
              <p className="text-white/50 italic">
                {financial
                  ? "Financial firms command premium pricing due to compliance overhead, high AUM stakes, and complex regulatory requirements."
                  : niche?.ticketSize === "high" || niche?.ticketSize === "premium"
                  ? "High-ticket services justify elevated pricing through higher lifetime client value and longer retention cycles."
                  : "Standard pricing tier — competitive for this market segment with strong value positioning."}
              </p>
            </div>
          </Card>

          {/* Sales Fit Indicators */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" /> Sales Fit Indicators
            </h3>
            <div className="space-y-2">
              {fitIndicators.map((ind, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-white/50">{ind.label}</span>
                  <span className={`font-semibold ${ind.color}`}>{ind.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Intelligence Preview */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" /> Client Intelligence
            </h3>
            <div className="space-y-2 text-xs text-white/60">
              <p><span className="text-white/80 font-medium">Revenue Opp:</span> {intel.revenueOpportunity}</p>
              <p><span className="text-white/80 font-medium">Growth Lever:</span> {intel.primaryGrowthLever}</p>
              <p><span className="text-white/80 font-medium">Urgency:</span> <span className="text-amber-400">{intel.urgencySignal}</span></p>
              <p><span className="text-white/80 font-medium">Summary:</span> {intel.nicheOpportunitySummary}</p>
            </div>
          </Card>
        </div>

        {/* ── MIDDLE COLUMN: Modules + Upsells ── */}
        <div className="space-y-5">
          {/* Package Presets */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-400" /> Package Presets
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(PACKAGE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="text-left p-3 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition-all group"
                >
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors">{preset.label}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Module Selection */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" /> Growth Modules
              </h3>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => setSelectedModules([...recommendedModules])}
              >
                Select Recommended
              </Button>
            </div>
            <div className="space-y-2">
              {allModules.map(key => {
                const meta = MODULE_META[key];
                const Icon = meta.icon;
                const active = selectedModules.includes(key);
                const recommended = recommendedModules.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleModule(key)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      active
                        ? "bg-cyan-500/10 border-cyan-500/30"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${active ? "text-cyan-400" : "text-white/30"}`} />
                        <span className={`text-xs font-medium ${active ? "text-white" : "text-white/50"}`}>
                          {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        {recommended && (
                          <Badge className="text-[9px] h-4 bg-cyan-500/20 text-cyan-400 border-0">Recommended</Badge>
                        )}
                      </div>
                      <Switch checked={active} onCheckedChange={() => toggleModule(key)} className="scale-75" />
                    </div>
                    {active && (
                      <p className="text-[10px] text-white/40 mt-1.5 ml-5.5">{meta.upsellNote}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Upsell Controls */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" /> Elite Upsells
            </h3>
            <div className="space-y-3">
              {/* Website Build */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white">Website Build</span>
                  <Select value={websiteBuild || "none"} onValueChange={v => setWebsiteBuild(v === "none" ? null : v)}>
                    <SelectTrigger className="w-40 h-7 text-xs bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not Included</SelectItem>
                      {Object.entries(WEBSITE_BUILD_FEES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label} — ${v.fee.toLocaleString()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-white/40">
                  {niche?.modulePriority?.includes("website_management") ? "⚡ Recommended for this niche" : "Optional add-on"}
                </p>
              </div>

              {/* App Store Launch */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white">App Store Launch Upgrade</span>
                    <p className="text-[10px] text-white/40 mt-0.5">Apple + Google Play submission, branding, testing</p>
                  </div>
                  <Switch checked={appStoreLaunch} onCheckedChange={setAppStoreLaunch} className="scale-75" />
                </div>
                <p className="text-[10px] text-white/40 mt-1">
                  {niche?.ticketSize === "premium" || financial
                    ? "⚡ Strong upsell — premium clients expect app presence"
                    : "Standard upsell for clients wanting brand differentiation"}
                </p>
              </div>

              {/* Setup purchased */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white">Platform Setup Purchased</span>
                    <p className="text-[10px] text-white/40 mt-0.5">Waives all module activation fees</p>
                  </div>
                  <Switch checked={hasPurchasedSetup} onCheckedChange={setHasPurchasedSetup} className="scale-75" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN: Live Quote + Notes ── */}
        <div className="space-y-5">
          {/* Live Quote */}
          <Card className="p-5 bg-card/60 border-cyan-500/20 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-cyan-400" /> Live Internal Quote
            </h3>
            <div className="space-y-3">
              {quote.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between items-start text-xs">
                  <div className="flex-1">
                    <span className={`font-medium ${
                      item.category === "platform" ? "text-white" :
                      item.category === "included" ? "text-white/40" :
                      "text-white/70"
                    }`}>{item.label}</span>
                    {item.notes && <p className="text-[10px] text-emerald-400/70 mt-0.5">{item.notes}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {item.upfront > 0 && <div className="text-white/80">${item.upfront.toLocaleString()}</div>}
                    {item.monthly > 0 && <div className="text-cyan-400/80">${item.monthly.toLocaleString()}/mo</div>}
                    {item.upfront === 0 && item.monthly === 0 && <div className="text-white/30">Included</div>}
                  </div>
                </div>
              ))}

              <Separator className="my-3 bg-white/10" />

              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total Upfront</span>
                <span className="text-lg font-bold text-white">${quote.totalUpfront.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total Monthly</span>
                <span className="text-lg font-bold text-cyan-400">${quote.totalMonthly.toLocaleString()}/mo</span>
              </div>

              {quote.hardCostNotes.length > 0 && (
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] font-semibold text-amber-400 mb-1">Hard Cost Notes:</p>
                  {quote.hardCostNotes.map((n, i) => (
                    <p key={i} className="text-[10px] text-amber-400/70">• {n}</p>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Price Overrides */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Price Overrides
            </h3>
            <p className="text-[10px] text-white/40 mb-3">Override default pricing for this deal. Leave blank to use engine defaults.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Total Setup Override</label>
                <Input
                  type="number"
                  placeholder={`Default: $${quote.totalUpfront.toLocaleString()}`}
                  value={setupOverride}
                  onChange={e => setSetupOverride(e.target.value)}
                  className="h-8 text-xs bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Total Monthly Override</label>
                <Input
                  type="number"
                  placeholder={`Default: $${quote.totalMonthly.toLocaleString()}/mo`}
                  value={monthlyOverride}
                  onChange={e => setMonthlyOverride(e.target.value)}
                  className="h-8 text-xs bg-white/5 border-white/10"
                />
              </div>
              {(setupOverride || monthlyOverride) && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-400">
                    Effective: ${(setupOverride ? parseInt(setupOverride) : quote.totalUpfront).toLocaleString()} setup
                    + ${(monthlyOverride ? parseInt(monthlyOverride) : quote.totalMonthly).toLocaleString()}/mo
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Narrative Preview */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" /> Package Narrative
            </h3>
            <div className="space-y-2 text-xs text-white/60">
              <p><span className="text-white/80 font-medium">Opportunity:</span> {narrative.opportunity}</p>
              <p><span className="text-white/80 font-medium">What it Solves:</span> {narrative.whatItSolves}</p>
              <p><span className="text-white/80 font-medium">90-Day Priority:</span> {narrative.next90Days}</p>
              {narrative.focusOutcomes.length > 0 && (
                <div>
                  <span className="text-white/80 font-medium">Focus Outcomes:</span>
                  <ul className="mt-1 space-y-0.5">
                    {narrative.focusOutcomes.map((o, i) => (
                      <li key={i} className="text-white/50">• {o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {/* Sales Notes */}
          <Card className="p-5 bg-card/60 border-border/40 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" /> Sales Notes
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Internal Proposal Notes</label>
                <Textarea
                  placeholder="Notes for this proposal..."
                  value={salesNotes}
                  onChange={e => setSalesNotes(e.target.value)}
                  className="text-xs bg-white/5 border-white/10 min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Objection Handling Notes</label>
                <Textarea
                  placeholder="Anticipated objections and responses..."
                  value={objectionNotes}
                  onChange={e => setObjectionNotes(e.target.value)}
                  className="text-xs bg-white/5 border-white/10 min-h-[60px]"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80 font-medium capitalize">{value}</span>
    </div>
  );
}
