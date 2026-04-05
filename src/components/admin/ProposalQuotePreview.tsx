import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuoteOutput } from "@/lib/workspaceQuoteEngine";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import { BUSINESS_OPERATION_TYPES, resolveOperationType } from "@/lib/businessOperationTypes";
import { INDUSTRY_CATEGORIES } from "@/lib/workspaceProfileTypes";
import { generatePackageFitNarrative } from "@/lib/packageFitNarrative";
import { DollarSign, FileText, CheckCircle2, AlertTriangle, Lightbulb, Target, ArrowRight, Rocket, Zap } from "lucide-react";

interface Props {
  quote: QuoteOutput;
  profile: WorkspaceProfile;
  internalNotes?: string;
  selectedModules?: string[];
}

export function ProposalQuotePreview({ quote, profile, internalNotes, selectedModules = [] }: Props) {
  const niche = NICHE_REGISTRY.find(n => n.id === profile.niche);
  const industry = INDUSTRY_CATEGORIES.find(c => c.value === profile.industry);
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const opLabel = BUSINESS_OPERATION_TYPES.find(b => b.value === opType)?.label ?? opType;
  const narrative = generatePackageFitNarrative(profile, selectedModules);

  return (
    <div className="space-y-4">
      <Card className="border-0" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.12)" }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Proposal Preview</h2>
            </div>
            <Badge className="text-[8px] bg-red-500/20 text-red-400">INTERNAL — NOT CLIENT-FACING</Badge>
          </div>

          {/* Business Summary */}
          <div className="rounded-lg p-3 bg-white/[0.03] mb-4">
            <p className="text-[10px] text-white/40 uppercase mb-2">Business Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div><span className="text-white/40 block">Industry</span><span className="text-white">{industry?.label}</span></div>
              <div><span className="text-white/40 block">Niche</span><span className="text-white">{niche?.label ?? "General"}</span></div>
              <div><span className="text-white/40 block">Operation</span><span className="text-white">{opLabel}</span></div>
              <div><span className="text-white/40 block">Tier</span><span className="text-white">{profile.zoomTier.toUpperCase()}</span></div>
            </div>
          </div>

          {/* Why This Package Fits */}
          <div className="rounded-lg p-4 mb-4" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
              <p className="text-[10px] text-[hsl(var(--nl-sky))] uppercase font-semibold">Why This Package Fits</p>
            </div>
            <p className="text-xs font-semibold text-white mb-3">{narrative.headline}</p>
            <p className="text-[11px] text-white/60 leading-relaxed mb-3">{narrative.whyThisPackage}</p>
            <div className="space-y-1.5 text-[11px] text-white/50 leading-relaxed">
              <p>{narrative.opportunity}</p>
              <p>{narrative.prioritySystems}</p>
            </div>
          </div>

          {/* What This System Solves */}
          <div className="rounded-lg p-4 mb-4" style={{ background: "hsla(0,0%,100%,.02)", border: "1px solid hsla(211,96%,60%,.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-[10px] text-amber-400 uppercase font-semibold">What This System Solves</p>
            </div>
            <p className="text-[11px] text-white/55 leading-relaxed">{narrative.whatItSolves}</p>
          </div>

          {/* Focus Outcomes */}
          <div className="rounded-lg p-4 mb-4" style={{ background: "hsla(140,60%,50%,.03)", border: "1px solid hsla(140,60%,50%,.08)" }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <p className="text-[10px] text-emerald-400 uppercase font-semibold">Focus Outcomes for {niche?.label ?? "This Business"}</p>
            </div>
            <div className="space-y-2">
              {narrative.focusOutcomes.map((outcome, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ArrowRight className="h-3 w-3 text-emerald-400/60 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/60">{outcome}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Module Rationale */}
          {selectedModules.length > 0 && (
            <div className="rounded-lg p-4 mb-4" style={{ background: "hsla(211,96%,60%,.03)", border: "1px solid hsla(211,96%,60%,.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
                <p className="text-[10px] text-[hsl(var(--nl-neon))] uppercase font-semibold">Selected Module Rationale</p>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">{narrative.moduleRationale}</p>
            </div>
          )}

          {/* 90-Day Priority + After Activation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg p-4" style={{ background: "hsla(270,80%,65%,.03)", border: "1px solid hsla(270,80%,65%,.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-3 w-3 text-purple-400" />
                <p className="text-[9px] text-purple-400 uppercase font-semibold">First 90 Days</p>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">{narrative.next90Days}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "hsla(197,92%,68%,.03)", border: "1px solid hsla(197,92%,68%,.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-3 w-3 text-[hsl(var(--nl-sky))]" />
                <p className="text-[9px] text-[hsl(var(--nl-sky))] uppercase font-semibold">After Activation</p>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">{narrative.afterActivation}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-4">
            <p className="text-[10px] text-white/40 uppercase mb-2">Pricing Breakdown</p>
            <div className="rounded-lg overflow-hidden border border-white/[0.06]">
              <div className="grid grid-cols-[1fr_auto_auto] px-3 py-2 bg-white/[0.04] text-[9px] text-white/40 uppercase">
                <span>Item</span><span className="w-24 text-right">Setup</span><span className="w-24 text-right">Monthly</span>
              </div>
              {quote.lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] px-3 py-2 border-t border-white/[0.04] text-[11px]">
                  <div>
                    <span className="text-white/70">{item.label}</span>
                    {item.notes && <p className="text-[9px] text-emerald-400/60 mt-0.5">{item.notes}</p>}
                  </div>
                  <span className="w-24 text-right text-white/60">
                    {item.upfront > 0 ? `$${item.upfront.toLocaleString()}` : item.category === "included" ? "—" : "$0"}
                  </span>
                  <span className="w-24 text-right text-white/60">
                    {item.monthly > 0 ? `$${item.monthly.toLocaleString()}` : "—"}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_auto_auto] px-3 py-3 border-t-2 border-white/[0.1] bg-white/[0.03]">
                <span className="text-xs font-bold text-white">Total</span>
                <span className="w-24 text-right text-sm font-bold text-white">${quote.totalUpfront.toLocaleString()}</span>
                <span className="w-24 text-right text-sm font-bold text-[hsl(var(--nl-neon))]">${quote.totalMonthly.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>

          {/* Hard Costs */}
          {quote.hardCostNotes.length > 0 && (
            <div className="rounded-lg p-3 bg-amber-500/[0.06] border border-amber-500/10 mb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <p className="text-[9px] text-amber-400 uppercase font-semibold">Hard Cost Disclosure</p>
              </div>
              {quote.hardCostNotes.map((note, i) => (
                <p key={i} className="text-[10px] text-amber-400/60 ml-4">• {note}</p>
              ))}
            </div>
          )}

          {/* Internal Notes */}
          {internalNotes && (
            <div className="rounded-lg p-3 bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] text-white/40 uppercase mb-1">Internal Notes</p>
              <p className="text-[11px] text-white/50 whitespace-pre-wrap">{internalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
