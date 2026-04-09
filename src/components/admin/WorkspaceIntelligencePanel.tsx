import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import { INDUSTRY_CATEGORIES } from "@/lib/workspaceProfileTypes";
import { resolveOperationType, isFinancialFirm, BUSINESS_OPERATION_TYPES } from "@/lib/businessOperationTypes";
import { generateClientIntelligence } from "@/lib/clientIntelligenceEngine";
import { computeQuote, type QuoteInput, type QuoteOutput } from "@/lib/workspaceQuoteEngine";
import { getCategoryById, buildStructuredProfile } from "@/lib/businessCategoryRegistry";
import { resolveAllPresets, type ResolvedPresets } from "@/lib/profilePresetEngine";
import {
  Brain, Building2, Target, Gauge, Shield, TrendingUp,
  Zap, BarChart3, DollarSign, Layers, FileText, Smartphone
} from "lucide-react";

interface Props {
  profile: WorkspaceProfile;
  selectedModules?: string[];
  hasPurchasedPlatformSetup?: boolean;
  includeWebsiteBuild?: string | null;
  includeAppStoreLaunchUpgrade?: boolean;
}

const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className={`text-[11px] font-medium ${accent ? "text-[hsl(var(--nl-neon))]" : "text-white/80"}`}>{value}</span>
    </div>
  );
}

export function WorkspaceIntelligencePanel({
  profile,
  selectedModules = [],
  hasPurchasedPlatformSetup = false,
  includeWebsiteBuild = null,
  includeAppStoreLaunchUpgrade = false,
}: Props) {
  const niche = useMemo(() => NICHE_REGISTRY.find(n => n.id === profile.niche), [profile.niche]);
  const industry = useMemo(() => INDUSTRY_CATEGORIES.find(c => c.value === profile.industry), [profile.industry]);
  const opType = useMemo(() => resolveOperationType(profile.archetype, profile.industry), [profile]);
  const opLabel = useMemo(() => BUSINESS_OPERATION_TYPES.find(b => b.value === opType)?.label ?? opType, [opType]);
  const financial = isFinancialFirm(profile.industry);
  const intel = useMemo(() => generateClientIntelligence(profile), [profile]);

  const quote: QuoteOutput | null = useMemo(() => {
    if (selectedModules.length === 0 && !hasPurchasedPlatformSetup) return null;
    return computeQuote({
      workspaceProfile: profile,
      selectedModules,
      hasPurchasedPlatformSetup,
      includeWebsiteBuild,
      includeAppStoreLaunchUpgrade,
    });
  }, [profile, selectedModules, hasPurchasedPlatformSetup, includeWebsiteBuild, includeAppStoreLaunchUpgrade]);

  return (
    <div className="space-y-4">
      {/* Profile Summary */}
      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.12)" }}>
              <Brain className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
            </div>
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Workspace Intelligence</h3>
            <Badge className="text-[8px] bg-amber-500/20 text-amber-400 ml-auto">Admin Only</Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-0 divide-white/[0.06]">
            <InfoRow label="Industry" value={industry?.label ?? profile.industry} />
            <InfoRow label="Niche" value={niche?.label ?? "General"} />
            <InfoRow label="Archetype" value={profile.archetype.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
            <InfoRow label="Zoom Tier" value={profile.zoomTier.toUpperCase()} />
            <InfoRow label="Operation Type" value={opLabel} accent />
            <InfoRow label="Financial Firm" value={financial ? "Yes — Premium" : "No"} />
          </div>
        </CardContent>
      </Card>

      {/* Niche Metadata */}
      {niche && (
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Niche Profile</h3>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0">
              <InfoRow label="Revenue Model" value={niche.revenueModel.replace(/_/g, " ")} />
              <InfoRow label="Sales Cycle" value={niche.salesCycle} />
              <InfoRow label="Ticket Size" value={niche.ticketSize.replace(/_/g, " ")} />
              <InfoRow label="Complexity" value={intel.businessComplexityLabel} />
              <InfoRow label="Compliance" value={intel.complianceSensitivityLabel} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Emphasis */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Module Priority</h3>
          </div>
          <div className="space-y-1.5">
            {Object.entries(intel.moduleEmphasis)
              .sort(([, a], [, b]) => b - a)
              .map(([mod, priority]) => (
                <div key={mod} className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-20 shrink-0">{mod}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(priority / 5) * 100}%`,
                        background: priority >= 4 ? "hsl(var(--nl-neon))" : "hsla(211,96%,60%,.4)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30 w-4 text-right">{priority}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Intelligence Summary */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Demo Intelligence Preview</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0">
            <InfoRow label="Revenue Opportunity" value={intel.revenueOpportunity} accent />
            <InfoRow label="Growth Potential" value={`${intel.growthPotentialPct}%`} accent />
            <InfoRow label="Insights Generated" value={String(intel.insightsGenerated)} />
            <InfoRow label="Automations Suggested" value={String(intel.automationsSuggested)} />
          </div>
        </CardContent>
      </Card>

      {/* Internal Quote (only if modules selected) */}
      {quote && (
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Internal Quote</h3>
              <Badge className="text-[8px] bg-red-500/20 text-red-400 ml-auto">CONFIDENTIAL</Badge>
            </div>
            <div className="space-y-2">
              {quote.lineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.04] last:border-0">
                  <span className="text-white/60">{item.label}</span>
                  <div className="flex gap-4">
                    {item.upfront > 0 && <span className="text-white/80">${item.upfront.toLocaleString()}</span>}
                    {item.monthly > 0 && <span className="text-[hsl(var(--nl-neon))]">${item.monthly.toLocaleString()}/mo</span>}
                    {item.upfront === 0 && item.monthly === 0 && <span className="text-white/30">Included</span>}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Total</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">${quote.totalUpfront.toLocaleString()} setup</p>
                  <p className="text-xs text-[hsl(var(--nl-neon))]">${quote.totalMonthly.toLocaleString()}/mo</p>
                </div>
              </div>
              {quote.hardCostNotes.length > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                  <p className="text-[9px] text-amber-400/80 uppercase font-semibold mb-1">Hard Cost Notes</p>
                  {quote.hardCostNotes.map((note, i) => (
                    <p key={i} className="text-[10px] text-amber-400/60">• {note}</p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
