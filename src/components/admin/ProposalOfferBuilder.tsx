import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { computeQuote, WEBSITE_BUILD_FEES, type QuoteOutput } from "@/lib/workspaceQuoteEngine";
import { generateClientIntelligence } from "@/lib/clientIntelligenceEngine";
import { resolveOperationType, BUSINESS_OPERATION_TYPES } from "@/lib/businessOperationTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import { getCategoryById, buildStructuredProfile, type StructuredWorkspaceProfile } from "@/lib/businessCategoryRegistry";
import { resolveModulePreset, resolveProposalPreset, resolveDemoModel, resolvePricing } from "@/lib/profilePresetEngine";
import {
  Zap, DollarSign, Globe, Smartphone, Shield, TrendingUp,
  Megaphone, Search, BarChart3, Users, RefreshCw, Star, Radio, FileText,
  CheckCircle2, AlertTriangle, Lightbulb, Info
} from "lucide-react";

const MODULES = [
  { key: "paid_ads", label: "Paid Ads System", icon: Megaphone,
    desc: "Google & Meta ad management with attribution",
    rationale: "Drives immediate qualified lead volume with measurable ROI tracking" },
  { key: "seo", label: "SEO System", icon: Search,
    desc: "Organic search optimization & local rankings",
    rationale: "Builds compounding organic visibility — reduces long-term acquisition costs" },
  { key: "website_management", label: "Website System", icon: Globe,
    desc: "Conversion-optimized website management",
    rationale: "Ensures every visitor encounters a high-converting, branded experience" },
  { key: "crm_automation", label: "CRM Automation", icon: Users,
    desc: "Pipeline, contact management & lead scoring",
    rationale: "Captures, scores, and nurtures every lead without manual follow-up" },
  { key: "lifecycle_nurture", label: "Lifecycle Nurture", icon: RefreshCw,
    desc: "Automated nurture + dormant client reactivation",
    rationale: "Reactivates dormant clients — highest ROI of any growth module" },
  { key: "reputation_reviews", label: "Reputation + Reviews", icon: Star,
    desc: "Review generation, monitoring & response",
    rationale: "Builds the social proof that closes deals before your team even speaks" },
  { key: "tracking_attribution", label: "Tracking + Attribution", icon: Radio,
    desc: "Call tracking, analytics & channel attribution",
    rationale: "Proves ROI on every channel — eliminates wasted marketing spend" },
  { key: "financial_compliance", label: "Financial Compliance", icon: Shield,
    desc: "Compliance workflow & regulatory tracking",
    rationale: "Ensures every client interaction meets financial regulatory requirements" },
];

interface Props {
  profile: WorkspaceProfile;
  onQuoteChange?: (quote: QuoteOutput, modules: string[], notes: string) => void;
}

export function ProposalOfferBuilder({ profile, onQuoteChange }: Props) {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [platformPurchased, setPlatformPurchased] = useState(false);
  const [websiteBuild, setWebsiteBuild] = useState<string | null>(null);
  const [appStoreUpgrade, setAppStoreUpgrade] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");

  const niche = useMemo(() => NICHE_REGISTRY.find(n => n.id === profile.niche), [profile.niche]);
  const intel = useMemo(() => generateClientIntelligence(profile), [profile]);
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const opLabel = BUSINESS_OPERATION_TYPES.find(b => b.value === opType)?.label ?? opType;

  // Try to derive a StructuredWorkspaceProfile for preset-driven recommendations
  const structuredProfile = useMemo((): StructuredWorkspaceProfile | null => {
    if (!niche) {
      // Try to find category from industry
      const cat = getCategoryById(profile.industry);
      if (cat) return buildStructuredProfile(cat.id, null);
      return null;
    }
    const cat = getCategoryById(niche.industry);
    if (cat) return buildStructuredProfile(cat.id, niche);
    return null;
  }, [niche, profile.industry]);

  const modulePreset = useMemo(() => {
    if (structuredProfile) return resolveModulePreset(structuredProfile);
    return null;
  }, [structuredProfile]);

  const proposalPreset = useMemo(() => {
    if (structuredProfile) return resolveProposalPreset(structuredProfile);
    return null;
  }, [structuredProfile]);

  const demoModelConfig = useMemo(() => {
    if (structuredProfile) return resolveDemoModel(structuredProfile);
    return null;
  }, [structuredProfile]);

  const pricingInfo = useMemo(() => {
    if (structuredProfile) return resolvePricing(structuredProfile);
    return null;
  }, [structuredProfile]);

  const quote = useMemo(() => {
    return computeQuote({
      workspaceProfile: profile,
      selectedModules,
      hasPurchasedPlatformSetup: platformPurchased,
      includeWebsiteBuild: websiteBuild,
      includeAppStoreLaunchUpgrade: appStoreUpgrade,
    });
  }, [profile, selectedModules, platformPurchased, websiteBuild, appStoreUpgrade]);

  const toggleModule = useCallback((key: string) => {
    setSelectedModules(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }, []);

  const emitQuote = useCallback(() => {
    onQuoteChange?.(quote, selectedModules, internalNotes);
  }, [quote, selectedModules, internalNotes, onQuoteChange]);

  // Recommended modules: prefer preset engine, fallback to niche priority
  const recommended = useMemo(() => {
    if (modulePreset) {
      return [...modulePreset.priority];
    }
    if (!niche) return [];
    const priority = niche.modulePriority;
    const map: Record<string, number> = {
      paid_ads: priority.ads,
      seo: priority.seo,
      website_management: priority.website,
      crm_automation: priority.crm,
      lifecycle_nurture: priority.automation,
      reputation_reviews: 3,
      tracking_attribution: 3,
      financial_compliance: niche.complianceLevel === "high" ? 5 : niche.complianceLevel === "moderate" ? 3 : 1,
    };
    return Object.entries(map).filter(([, v]) => v >= 4).map(([k]) => k);
  }, [modulePreset, niche]);

  const selectRecommended = useCallback(() => {
    setSelectedModules(recommended);
  }, [recommended]);

  // Sort modules: recommended first
  const sortedModules = useMemo(() => {
    return [...MODULES].sort((a, b) => {
      const aRec = recommended.includes(a.key) ? 1 : 0;
      const bRec = recommended.includes(b.key) ? 1 : 0;
      return bRec - aRec;
    });
  }, [recommended]);

  return (
    <div className="space-y-4">
      {/* Business Profile Summary */}
      <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
          <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Business Profile</h3>
          {pricingInfo?.isFinancialPremium && (
            <Badge className="text-[7px] bg-amber-500/20 text-amber-400 px-1.5 py-0 ml-auto">FINANCIAL PREMIUM</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] mb-3">
          <div><span className="text-white/40 block">Niche</span><span className="text-white/80">{niche?.label ?? "General"}</span></div>
          <div><span className="text-white/40 block">Operation</span><span className="text-white/80">{opLabel}</span></div>
          <div><span className="text-white/40 block">Revenue Opp.</span><span className="text-[hsl(var(--nl-neon))]">{intel.revenueOpportunity}</span></div>
          <div><span className="text-white/40 block">Growth</span><span className="text-[hsl(var(--nl-neon))]">{intel.growthPotentialPct}%</span></div>
        </div>
        {pricingInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] mb-3 pt-2 border-t border-white/[0.06]">
            <div><span className="text-white/40 block">Pricing Family</span><span className="text-white/80">{pricingInfo.family.replace(/_/g, " ")}</span></div>
            <div><span className="text-white/40 block">Bracket</span><span className="text-white/80">{pricingInfo.bracket.replace(/_/g, " ")}</span></div>
            {proposalPreset && <div><span className="text-white/40 block">Proposal Preset</span><span className="text-white/80">{proposalPreset.presetKey.replace(/_/g, " ")}</span></div>}
          </div>
        )}
        {/* Demo model emphasis labels */}
        {demoModelConfig && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {demoModelConfig.emphasisLabels.map(label => (
              <Badge key={label} className="text-[8px] bg-white/[0.06] text-white/50 border-white/[0.08]">{label}</Badge>
            ))}
          </div>
        )}
        {/* Niche opportunity insight */}
        <div className="rounded-lg p-3 mt-2" style={{ background: "hsla(211,96%,60%,.03)", border: "1px solid hsla(211,96%,60%,.06)" }}>
          <div className="flex items-start gap-2">
            <Lightbulb className="h-3 w-3 text-[hsl(var(--nl-sky))] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-white/60 leading-relaxed">{intel.nicheOpportunitySummary}</p>
              <p className="text-[10px] text-[hsl(var(--nl-neon))] mt-1.5 font-medium">Primary lever: {intel.primaryGrowthLever}</p>
              <p className="text-[10px] text-amber-400/60 mt-0.5 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> {intel.urgencySignal}
              </p>
            </div>
          </div>
        </div>
        {/* Proposal preset focus outcomes */}
        {proposalPreset && (
          <div className="rounded-lg p-3 mt-2" style={{ background: "hsla(142,70%,45%,.03)", border: "1px solid hsla(142,70%,45%,.08)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="h-3 w-3 text-emerald-400/60" />
              <span className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-wider">Proposal Focus Outcomes</span>
            </div>
            <ul className="space-y-1">
              {proposalPreset.focusOutcomes.map((outcome, i) => (
                <li key={i} className="text-[10px] text-white/50 flex items-start gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400/40 shrink-0 mt-0.5" />
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Platform Setup Toggle */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Platform Setup Purchased</p>
              <p className="text-[10px] text-white/40">Waives activation fees on all modules</p>
            </div>
            <Switch checked={platformPurchased} onCheckedChange={setPlatformPurchased} />
          </div>
          {platformPurchased && (
            <div className="mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <p className="text-[10px] text-emerald-400/80">All module activation fees waived</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Selection */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Growth Modules</h3>
            </div>
            {recommended.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-[9px] h-6 px-2 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                onClick={selectRecommended}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Select Recommended
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            {sortedModules.map(mod => {
              const active = selectedModules.includes(mod.key);
              const isRecommended = recommended.includes(mod.key);
              return (
                <div
                  key={mod.key}
                  onClick={() => toggleModule(mod.key)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    active
                      ? "bg-[hsla(211,96%,60%,.1)] border border-[hsla(211,96%,60%,.3)]"
                      : "bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? "bg-[hsla(211,96%,60%,.2)]" : "bg-white/[0.04]"
                    }`}>
                      <mod.icon className={`h-4 w-4 ${active ? "text-[hsl(var(--nl-neon))]" : "text-white/30"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-medium ${active ? "text-white" : "text-white/60"}`}>{mod.label}</p>
                        {isRecommended && (
                          <Badge className="text-[7px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0">
                            RECOMMENDED
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-white/30">{mod.desc}</p>
                    </div>
                    <Switch checked={active} onCheckedChange={() => toggleModule(mod.key)} onClick={e => e.stopPropagation()} />
                  </div>
                  {/* Show rationale when active */}
                  {active && (
                    <div className="mt-2 ml-11 flex items-start gap-1.5">
                      <TrendingUp className="h-3 w-3 text-[hsl(var(--nl-sky))] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[hsl(var(--nl-sky))]/60 leading-relaxed">{mod.rationale}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Website Build */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Website Build</h3>
          </div>
          <Select value={websiteBuild ?? "none"} onValueChange={v => setWebsiteBuild(v === "none" ? null : v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
              <SelectValue placeholder="No website build" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
              <SelectItem value="none">No Website Build</SelectItem>
              {Object.entries(WEBSITE_BUILD_FEES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label} — ${v.fee.toLocaleString()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* App Store Launch Upgrade */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
              <div>
                <p className="text-xs font-medium text-white">App Store Launch Upgrade</p>
                <p className="text-[10px] text-white/40">Elite add-on — Apple + Google Play submission</p>
              </div>
            </div>
            <Switch checked={appStoreUpgrade} onCheckedChange={setAppStoreUpgrade} />
          </div>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3.5 w-3.5 text-white/30" />
            <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Internal Notes</h3>
          </div>
          <Textarea
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="Confidence level, fit notes, sales positioning..."
            className="bg-white/5 border-white/10 text-white text-xs min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* Live Quote Summary */}
      <Card className="border-0" style={{ background: "hsla(211,96%,60%,.06)", border: "1px solid hsla(211,96%,60%,.15)" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Live Quote</h3>
            <Badge className="text-[8px] bg-red-500/20 text-red-400 ml-auto">ADMIN ONLY</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-3 rounded-lg bg-white/[0.04]">
              <p className="text-[10px] text-white/40 uppercase">Total Setup</p>
              <p className="text-lg font-bold text-white">${quote.totalUpfront.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/[0.04]">
              <p className="text-[10px] text-white/40 uppercase">Monthly</p>
              <p className="text-lg font-bold text-[hsl(var(--nl-neon))]">${quote.totalMonthly.toLocaleString()}/mo</p>
            </div>
          </div>
          {platformPurchased && (
            <p className="text-[10px] text-emerald-400/80 text-center mb-2">✓ Module activation fees waived</p>
          )}
          <Button
            className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white text-xs h-9"
            onClick={emitQuote}
          >
            Generate Proposal from Quote
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
