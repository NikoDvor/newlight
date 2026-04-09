import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import { INDUSTRY_CATEGORIES } from "@/lib/workspaceProfileTypes";
import { resolveOperationType, isFinancialFirm, BUSINESS_OPERATION_TYPES } from "@/lib/businessOperationTypes";
import { generateClientIntelligence } from "@/lib/clientIntelligenceEngine";
import { computeQuote, type QuoteOutput } from "@/lib/workspaceQuoteEngine";
import { getCategoryById, buildStructuredProfile } from "@/lib/businessCategoryRegistry";
import { resolveAllPresets, type ResolvedPresets } from "@/lib/profilePresetEngine";
import {
  Brain, Target, TrendingUp,
  Layers, FileText, DollarSign,
  Shield, CheckCircle2, AlertTriangle, Lock, Eye, EyeOff
} from "lucide-react";

interface Props {
  profile: WorkspaceProfile;
  selectedModules?: string[];
  hasPurchasedPlatformSetup?: boolean;
  includeWebsiteBuild?: string | null;
  includeAppStoreLaunchUpgrade?: boolean;
  /** Pass client lifecycle stages for proposal state display */
  proposalStatus?: string;
  paymentStatus?: string;
}

const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

function InfoRow({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className={`text-[11px] font-medium ${warn ? "text-amber-400" : accent ? "text-[hsl(var(--nl-neon))]" : "text-white/80"}`}>{value}</span>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-400" : "bg-white/20"}`} />
  );
}

export function WorkspaceIntelligencePanel({
  profile,
  selectedModules = [],
  hasPurchasedPlatformSetup = false,
  includeWebsiteBuild = null,
  includeAppStoreLaunchUpgrade = false,
  proposalStatus,
  paymentStatus,
}: Props) {
  const niche = useMemo(() => NICHE_REGISTRY.find(n => n.id === profile.niche), [profile.niche]);
  const industry = useMemo(() => INDUSTRY_CATEGORIES.find(c => c.value === profile.industry), [profile.industry]);
  const opType = useMemo(() => resolveOperationType(profile.archetype, profile.industry), [profile]);
  const opLabel = useMemo(() => BUSINESS_OPERATION_TYPES.find(b => b.value === opType)?.label ?? opType, [opType]);
  const financial = isFinancialFirm(profile.industry);
  const intel = useMemo(() => generateClientIntelligence(profile), [profile]);

  const presets: ResolvedPresets | null = useMemo(() => {
    if (niche) {
      const cat = getCategoryById(niche.industry);
      if (cat) return resolveAllPresets(buildStructuredProfile(cat.id, niche));
    }
    const cat = getCategoryById(profile.industry);
    if (cat) return resolveAllPresets(buildStructuredProfile(cat.id, null));
    return null;
  }, [niche, profile.industry]);

  const quote: QuoteOutput | null = useMemo(() => {
    if (selectedModules.length === 0 && !hasPurchasedPlatformSetup) return null;
    return computeQuote({ workspaceProfile: profile, selectedModules, hasPurchasedPlatformSetup, includeWebsiteBuild, includeAppStoreLaunchUpgrade });
  }, [profile, selectedModules, hasPurchasedPlatformSetup, includeWebsiteBuild, includeAppStoreLaunchUpgrade]);

  const isProposalRevealed = proposalStatus && ["sent", "viewed", "approved", "accepted"].includes(proposalStatus);

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
          <div className="grid grid-cols-2 gap-x-6 gap-y-0">
            <InfoRow label="Industry" value={industry?.label ?? profile.industry} />
            <InfoRow label="Niche" value={niche?.label ?? "General"} />
            <InfoRow label="Archetype" value={profile.archetype.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
            <InfoRow label="Zoom Tier" value={profile.zoomTier.toUpperCase()} />
            <InfoRow label="Operation Type" value={opLabel} accent />
            <InfoRow label="Financial Premium" value={financial ? "Yes" : "No"} warn={financial} />
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
                    <div className="h-full rounded-full" style={{
                      width: `${(priority / 5) * 100}%`,
                      background: priority >= 4 ? "hsl(var(--nl-neon))" : "hsla(211,96%,60%,.4)",
                    }} />
                  </div>
                  <span className="text-[10px] text-white/30 w-4 text-right">{priority}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Demo Intelligence Preview */}
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

      {/* Internal Quote */}
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

      {/* ═══ FULL PRESET AUDIT ═══ */}
      {presets && (
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Preset Audit</h3>
              <Badge className="text-[8px] bg-amber-500/20 text-amber-400 ml-auto">Verification</Badge>
            </div>

            {/* Pricing & Classification */}
            <div className="mb-3">
              <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Classification</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                <InfoRow label="Pricing Family" value={presets.pricing.family.replace(/_/g, " ")} />
                <InfoRow label="Bracket" value={presets.pricing.bracket.replace(/_/g, " ")} accent={presets.pricing.isFinancialPremium} />
                <InfoRow label="Financial Premium" value={presets.pricing.isFinancialPremium ? "Active" : "No"} warn={presets.pricing.isFinancialPremium} />
                <InfoRow label="App Store Tier" value={presets.appStore.tierLabel} />
              </div>
            </div>

            {/* Preset Keys */}
            <div className="mb-3 pt-2 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Preset Keys</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                <InfoRow label="Proposal" value={presets.proposal.presetKey.replace(/_/g, " ")} />
                <InfoRow label="Contract" value={presets.contract.presetKey.replace(/_/g, " ")} />
                <InfoRow label="Onboarding" value={presets.onboarding.presetKey.replace(/_/g, " ")} />
                <InfoRow label="Twilio Playbook" value={presets.twilioPlaybook.replace(/_/g, " ")} accent />
              </div>
            </div>

            {/* Dashboard Emphasis */}
            <div className="mb-3 pt-2 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Dashboard Emphasis</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.dashboardEmphasis.map((e, i) => (
                  <Badge key={e} className={`text-[8px] ${i === 0 ? "bg-[hsla(211,96%,60%,.12)] text-[hsl(var(--nl-neon))] border-[hsla(211,96%,60%,.2)]" : "bg-white/[0.06] text-white/50 border-white/[0.08]"}`}>
                    {i === 0 && "★ "}{e}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Demo Model */}
            <div className="mb-3 pt-2 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Demo Model</p>
              <div className="flex flex-wrap gap-1.5 mb-1">
                {presets.demoModel.emphasisLabels.map(l => (
                  <Badge key={l} className="text-[8px] bg-[hsla(211,96%,60%,.08)] text-[hsl(var(--nl-sky))] border-[hsla(211,96%,60%,.12)]">{l}</Badge>
                ))}
              </div>
              <p className="text-[10px] text-white/40">{presets.demoModel.estimatePrefix}</p>
            </div>

            {/* Module Preset */}
            <div className="mb-3 pt-2 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Module Preset</p>
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1">
                  {presets.modules.priority.map(m => (
                    <Badge key={m} className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/15">{m.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
                {presets.modules.secondary.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {presets.modules.secondary.map(m => (
                      <Badge key={m} className="text-[8px] bg-white/[0.04] text-white/40 border-white/[0.06]">{m.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Legacy Compatibility */}
            <div className="mb-3 pt-2 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Legacy Fields</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                <InfoRow label="Industry" value={profile.industry || "—"} />
                <InfoRow label="Profile Type" value={profile.archetype || "—"} />
              </div>
            </div>

            {/* Proposal State (if provided) */}
            {proposalStatus && (
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Proposal State</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {isProposalRevealed
                      ? <Eye className="h-3 w-3 text-emerald-400" />
                      : <EyeOff className="h-3 w-3 text-white/30" />
                    }
                    <span className="text-[11px] text-white/60">{isProposalRevealed ? "Revealed" : "Internal only"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot ok={paymentStatus === "paid"} />
                    <span className="text-[11px] text-white/60">Payment: {paymentStatus || "unpaid"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Premium Notice */}
            {presets.pricing.isFinancialPremium && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                <p className="text-[9px] text-amber-400/80 uppercase font-semibold mb-1">Financial Premium Active</p>
                <p className="text-[10px] text-amber-400/60">
                  Premium bracket · 12-month default term · Compliance wording enabled · Financial App Store tier
                </p>
              </div>
            )}

            {/* Verification Checks */}
            <div className="mt-3 pt-2 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase font-semibold mb-1.5">Verification</p>
              <div className="space-y-1">
                {[
                  { label: "Pricing family resolved", ok: !!presets.pricing.family },
                  { label: "Module preset resolved", ok: presets.modules.priority.length > 0 },
                  { label: "Proposal preset resolved", ok: !!presets.proposal.presetKey },
                  { label: "Contract preset resolved", ok: !!presets.contract.presetKey },
                  { label: "Twilio playbook assigned", ok: !!presets.twilioPlaybook },
                  { label: "Dashboard emphasis set", ok: presets.dashboardEmphasis.length > 0 },
                  { label: "Onboarding preset set", ok: !!presets.onboarding.presetKey },
                  { label: "App Store tier assigned", ok: !!presets.appStore.tierKey },
                ].map(check => (
                  <div key={check.label} className="flex items-center gap-2">
                    {check.ok
                      ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      : <AlertTriangle className="h-3 w-3 text-amber-400" />
                    }
                    <span className="text-[10px] text-white/50">{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
