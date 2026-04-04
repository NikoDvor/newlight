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
import {
  Zap, DollarSign, Globe, Smartphone, Shield, TrendingUp,
  Megaphone, Search, BarChart3, Users, RefreshCw, Star, Radio, FileText
} from "lucide-react";

const MODULES = [
  { key: "paid_ads", label: "Paid Ads System", icon: Megaphone, desc: "Google/Meta ad management" },
  { key: "seo", label: "SEO System", icon: Search, desc: "Organic search optimization" },
  { key: "website_management", label: "Website System", icon: Globe, desc: "Website management & updates" },
  { key: "crm_automation", label: "CRM Automation", icon: Users, desc: "Pipeline & contact automation" },
  { key: "lifecycle_nurture", label: "Lifecycle Nurture", icon: RefreshCw, desc: "Nurture + reactivation" },
  { key: "reputation_reviews", label: "Reputation + Reviews", icon: Star, desc: "Review gen & monitoring" },
  { key: "tracking_attribution", label: "Tracking + Attribution", icon: Radio, desc: "Call tracking & analytics" },
  { key: "financial_compliance", label: "Financial Compliance", icon: Shield, desc: "Compliance workflow add-on" },
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

  const quote = useMemo(() => {
    const q = computeQuote({
      workspaceProfile: profile,
      selectedModules,
      hasPurchasedPlatformSetup: platformPurchased,
      includeWebsiteBuild: websiteBuild,
      includeAppStoreLaunchUpgrade: appStoreUpgrade,
    });
    return q;
  }, [profile, selectedModules, platformPurchased, websiteBuild, appStoreUpgrade]);

  const toggleModule = useCallback((key: string) => {
    setSelectedModules(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      return next;
    });
  }, []);

  const emitQuote = useCallback(() => {
    onQuoteChange?.(quote, selectedModules, internalNotes);
  }, [quote, selectedModules, internalNotes, onQuoteChange]);

  // Recommended modules from niche
  const recommended = useMemo(() => {
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
    };
    return Object.entries(map).filter(([, v]) => v >= 4).map(([k]) => k);
  }, [niche]);

  return (
    <div className="space-y-4">
      {/* Business Profile Summary */}
      <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
          <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Proposal Intake — Business Profile</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div><span className="text-white/40 block">Niche</span><span className="text-white/80">{niche?.label ?? "General"}</span></div>
          <div><span className="text-white/40 block">Operation</span><span className="text-white/80">{opLabel}</span></div>
          <div><span className="text-white/40 block">Revenue Opp.</span><span className="text-[hsl(var(--nl-neon))]">{intel.revenueOpportunity}</span></div>
          <div><span className="text-white/40 block">Growth</span><span className="text-[hsl(var(--nl-neon))]">{intel.growthPotentialPct}%</span></div>
        </div>
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
        </CardContent>
      </Card>

      {/* Module Selection Grid */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Growth Modules</h3>
          </div>
          <div className="space-y-1.5">
            {MODULES.map(mod => {
              const active = selectedModules.includes(mod.key);
              const isRecommended = recommended.includes(mod.key);
              return (
                <div
                  key={mod.key}
                  onClick={() => toggleModule(mod.key)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    active
                      ? "bg-[hsla(211,96%,60%,.1)] border border-[hsla(211,96%,60%,.3)]"
                      : "bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    active ? "bg-[hsla(211,96%,60%,.2)]" : "bg-white/[0.04]"
                  }`}>
                    <mod.icon className={`h-4 w-4 ${active ? "text-[hsl(var(--nl-neon))]" : "text-white/30"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium ${active ? "text-white" : "text-white/60"}`}>{mod.label}</p>
                      {isRecommended && <Badge className="text-[7px] bg-emerald-500/20 text-emerald-400 px-1 py-0">REC</Badge>}
                    </div>
                    <p className="text-[10px] text-white/30">{mod.desc}</p>
                  </div>
                  <Switch checked={active} onCheckedChange={() => toggleModule(mod.key)} onClick={e => e.stopPropagation()} />
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
