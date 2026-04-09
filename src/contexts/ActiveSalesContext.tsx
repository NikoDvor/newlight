// ── Active Sales State ──
// Single source of truth for a client's sales package, quote versions,
// reveal state, and onboarding handoff.
// Used by: AdminSalesControlCenter, ProposalOfferBuilder, ProposalQuotePreview,
//          ProposalRevealControls, ProposalView (final meeting).

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";
import { computeQuote, WEBSITE_BUILD_FEES, type QuoteOutput } from "@/lib/workspaceQuoteEngine";
import { generateClientIntelligence, type ClientIntelligenceOutput } from "@/lib/clientIntelligenceEngine";
import { generatePackageFitNarrative, type PackageFitNarrative } from "@/lib/packageFitNarrative";
import { resolveOperationType, isFinancialFirm } from "@/lib/businessOperationTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import { DEFAULT_WORKSPACE_PROFILE, type WorkspaceProfile } from "@/lib/workspaceProfileTypes";

// ═══════════════════════════════════════════════
// Quote Version
// ═══════════════════════════════════════════════
export interface QuoteVersion {
  id: string;
  name: string;
  modules: string[];
  hasPurchasedSetup: boolean;
  websiteBuild: string | null;
  appStoreLaunch: boolean;
  appStoreCustomAmount: string;
  appStoreNotes: string;
  setupOverride: string;
  monthlyOverride: string;
  discountPct: string;
  isRecommended: boolean;
  isPresented: boolean;
  appliedPreset: string | null;
}

export function createQuoteVersion(name: string, modules: string[], extras?: Partial<QuoteVersion>): QuoteVersion {
  return {
    id: crypto.randomUUID(),
    name,
    modules: [...modules],
    hasPurchasedSetup: false,
    websiteBuild: null,
    appStoreLaunch: false,
    appStoreCustomAmount: "",
    appStoreNotes: "",
    setupOverride: "",
    monthlyOverride: "",
    discountPct: "",
    isRecommended: false,
    isPresented: false,
    appliedPreset: null,
    ...extras,
  };
}

// ═══════════════════════════════════════════════
// Handoff Snapshot (locked from presented version)
// ═══════════════════════════════════════════════
export interface HandoffSnapshot {
  generatedAt: string;
  versionName: string;
  profile: WorkspaceProfile;
  nicheLabel: string;
  modules: string[];
  websiteBuild: string | null;
  appStoreLaunch: boolean;
  appStoreCustomAmount: string;
  complianceLevel: string;
  setupTotal: number;
  monthlyTotal: number;
  effectiveSetup: number;
  effectiveMonthly: number;
  focusOutcomes: string[];
  next90Days: string;
  onboardingNotes: string;
  fulfillmentCautions: string;
}

// ═══════════════════════════════════════════════
// Sales Notes
// ═══════════════════════════════════════════════
export interface SalesNotes {
  objections: string;
  decisionMaker: string;
  urgency: string;
  discountReasoning: string;
  upsellAngle: string;
  fulfillmentCautions: string;
  followUpPlan: string;
  onboardingHandoff: string;
}

const EMPTY_NOTES: SalesNotes = {
  objections: "", decisionMaker: "", urgency: "",
  discountReasoning: "", upsellAngle: "", fulfillmentCautions: "",
  followUpPlan: "", onboardingHandoff: "",
};

// ═══════════════════════════════════════════════
// Rep Ownership
// ═══════════════════════════════════════════════
export interface RepOwnership {
  primaryRep: string;
  secondaryRep: string;
}

const EMPTY_OWNERSHIP: RepOwnership = { primaryRep: "", secondaryRep: "" };

// ═══════════════════════════════════════════════
// Follow-Up / Next Action
// ═══════════════════════════════════════════════
export type FollowUpType = "call" | "text" | "email" | "meeting" | "internal_review";
export type FollowUpPriority = "low" | "medium" | "high" | "urgent";

export interface NextAction {
  action: string;
  dueDate: string;
  priority: FollowUpPriority;
  type: FollowUpType;
  completed: boolean;
}

const EMPTY_NEXT_ACTION: NextAction = { action: "", dueDate: "", priority: "medium", type: "call", completed: false };

// ═══════════════════════════════════════════════
// Activity Log
// ═══════════════════════════════════════════════
export interface ActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
}

// ═══════════════════════════════════════════════
// Close Forecast
// ═══════════════════════════════════════════════
export type ForecastCategory = "strong" | "moderate" | "at_risk" | "stalled";

export interface CloseForecast {
  probability: number;
  confidenceLabel: string;
  closeWindow: string;
  category: ForecastCategory;
}

const EMPTY_FORECAST: CloseForecast = { probability: 50, confidenceLabel: "Moderate", closeWindow: "", category: "moderate" };

function deriveForecastLabel(prob: number): { label: string; category: ForecastCategory } {
  if (prob >= 80) return { label: "Strong", category: "strong" };
  if (prob >= 50) return { label: "Moderate", category: "moderate" };
  if (prob >= 25) return { label: "At Risk", category: "at_risk" };
  return { label: "Stalled", category: "stalled" };
}

// ═══════════════════════════════════════════════
// Risk Flags
// ═══════════════════════════════════════════════
export interface RiskFlags {
  noDecisionMaker: boolean;
  missingProposalVersion: boolean;
  aggressiveDiscount: boolean;
  revealedNotProgressing: boolean;
  overdueFollowUp: boolean;
  onboardingRisk: boolean;
  highComplianceRisk: boolean;
  fulfillmentCaution: boolean;
}

export function computeRiskFlags(
  notes: SalesNotes,
  nextAction: NextAction,
  discountPct: number,
  proposalStatus: ProposalStatusKey,
  presentedVersion: any,
  niche: any,
  stageIdx: number,
): RiskFlags {
  const now = new Date();
  const due = nextAction.dueDate ? new Date(nextAction.dueDate) : null;
  return {
    noDecisionMaker: !notes.decisionMaker,
    missingProposalVersion: !presentedVersion && stageIdx >= 5,
    aggressiveDiscount: discountPct > 15,
    revealedNotProgressing: (proposalStatus === "revealed") && stageIdx < 9,
    overdueFollowUp: !!(due && due < now && !nextAction.completed),
    onboardingRisk: !!notes.fulfillmentCautions,
    highComplianceRisk: niche?.complianceLevel === "high",
    fulfillmentCaution: !!notes.fulfillmentCautions,
  };
}

// ═══════════════════════════════════════════════
// Proposal Status
// ═══════════════════════════════════════════════
export const PROPOSAL_STATUSES = [
  { key: "draft", label: "Draft", color: "bg-muted/30 text-muted-foreground" },
  { key: "ready_review", label: "Ready for Review", color: "bg-blue-500/20 text-blue-400" },
  { key: "ready_final", label: "Ready for Final Meeting", color: "bg-cyan-500/20 text-cyan-400" },
  { key: "revealed", label: "Revealed to Client", color: "bg-emerald-500/20 text-emerald-400" },
  { key: "accepted", label: "Accepted", color: "bg-emerald-500/30 text-emerald-300" },
  { key: "needs_revision", label: "Needs Revision", color: "bg-amber-500/20 text-amber-400" },
] as const;

export type ProposalStatusKey = (typeof PROPOSAL_STATUSES)[number]["key"];

// ═══════════════════════════════════════════════
// Workflow Steps
// ═══════════════════════════════════════════════
export const WORKFLOW_STEPS = [
  { key: "booked", label: "Booked" },
  { key: "workspace_created", label: "Workspace" },
  { key: "invite_sent", label: "Invite Sent" },
  { key: "first_meeting", label: "First Meeting" },
  { key: "proposal_intake", label: "Intake" },
  { key: "proposal_drafted", label: "Drafted" },
  { key: "final_meeting", label: "Final Meeting" },
  { key: "proposal_revealed", label: "Revealed" },
  { key: "activation_complete", label: "Activated" },
  { key: "payment_ready", label: "Payment Ready" },
  { key: "paid", label: "Paid" },
] as const;

export type WorkflowStepKey = (typeof WORKFLOW_STEPS)[number]["key"];

// ═══════════════════════════════════════════════
// Context Value
// ═══════════════════════════════════════════════
export interface ActiveSalesState {
  // Profile
  profile: WorkspaceProfile;
  setProfile: (p: WorkspaceProfile) => void;

  // Versions
  versions: QuoteVersion[];
  activeVersionId: string;
  activeVersion: QuoteVersion;
  setActiveVersionId: (id: string) => void;
  updateVersion: (id: string, patch: Partial<QuoteVersion>) => void;
  updateActiveVersion: (patch: Partial<QuoteVersion>) => void;
  addVersion: (name: string, modules: string[]) => string;
  duplicateVersion: (id: string) => string;
  deleteVersion: (id: string) => void;

  // Presented version (locked for reveal)
  presentedVersion: QuoteVersion | null;
  presentedQuote: QuoteOutput | null;
  presentedNarrative: PackageFitNarrative | null;
  markAsPresented: (id: string) => void;
  clearPresented: () => void;

  // Computed for active version
  quote: QuoteOutput;
  intel: ClientIntelligenceOutput;
  narrative: PackageFitNarrative;
  effectiveSetup: number;
  effectiveMonthly: number;
  discountPct: number;

  // Status
  proposalStatus: ProposalStatusKey;
  setProposalStatus: (s: ProposalStatusKey) => void;
  currentStage: WorkflowStepKey;
  setCurrentStage: (s: WorkflowStepKey) => void;

  // Notes
  notes: SalesNotes;
  updateNotes: (patch: Partial<SalesNotes>) => void;

  // Ownership
  ownership: RepOwnership;
  setOwnership: (patch: Partial<RepOwnership>) => void;

  // Next Action
  nextAction: NextAction;
  setNextAction: (patch: Partial<NextAction>) => void;

  // Activity Log
  activityLog: ActivityEntry[];
  logActivity: (action: string, detail: string) => void;

  // Forecast
  forecast: CloseForecast;
  setForecast: (patch: Partial<CloseForecast>) => void;

  // Risk
  riskFlags: RiskFlags;

  // Readiness
  readyToPresent: boolean;
  readyToClose: boolean;

  // Handoff
  handoffSnapshot: HandoffSnapshot | null;
  generateHandoffSnapshot: () => HandoffSnapshot | null;

  // Derived
  niche: any;
  opType: string;
  financial: boolean;
}

const ActiveSalesContext = createContext<ActiveSalesState | null>(null);

export function useActiveSalesState(): ActiveSalesState {
  const ctx = useContext(ActiveSalesContext);
  if (!ctx) throw new Error("useActiveSalesState must be used within ActiveSalesProvider");
  return ctx;
}

// ═══════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════
export function ActiveSalesProvider({ children, initialProfile }: { children: ReactNode; initialProfile?: WorkspaceProfile }) {
  const [profile, setProfile] = useState<WorkspaceProfile>(initialProfile || DEFAULT_WORKSPACE_PROFILE);

  // Versions
  const [versions, setVersions] = useState<QuoteVersion[]>([
    createQuoteVersion("Version A — Working", []),
  ]);
  const [activeVersionId, setActiveVersionId] = useState(versions[0].id);

  const activeVersion = useMemo(() => versions.find(v => v.id === activeVersionId) || versions[0], [versions, activeVersionId]);

  const updateVersion = useCallback((id: string, patch: Partial<QuoteVersion>) => {
    setVersions(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
  }, []);

  const updateActiveVersion = useCallback((patch: Partial<QuoteVersion>) => {
    updateVersion(activeVersionId, patch);
  }, [activeVersionId, updateVersion]);

  const addVersion = useCallback((name: string, modules: string[]) => {
    const v = createQuoteVersion(name, modules);
    setVersions(prev => [...prev, v]);
    setActiveVersionId(v.id);
    return v.id;
  }, []);

  const duplicateVersion = useCallback((id: string) => {
    const src = versions.find(v => v.id === id);
    if (!src) return id;
    const dup = createQuoteVersion(`${src.name} (Copy)`, src.modules, {
      hasPurchasedSetup: src.hasPurchasedSetup,
      websiteBuild: src.websiteBuild,
      appStoreLaunch: src.appStoreLaunch,
      appStoreCustomAmount: src.appStoreCustomAmount,
      appStoreNotes: src.appStoreNotes,
      setupOverride: src.setupOverride,
      monthlyOverride: src.monthlyOverride,
      discountPct: src.discountPct,
      appliedPreset: src.appliedPreset,
    });
    setVersions(prev => [...prev, dup]);
    setActiveVersionId(dup.id);
    return dup.id;
  }, [versions]);

  const deleteVersion = useCallback((id: string) => {
    setVersions(prev => {
      const next = prev.filter(v => v.id !== id);
      if (next.length === 0) return prev; // never empty
      return next;
    });
    if (activeVersionId === id) {
      setVersions(prev => { setActiveVersionId(prev[0]?.id || ""); return prev; });
    }
  }, [activeVersionId]);

  // Presented version lock
  const markAsPresented = useCallback((id: string) => {
    setVersions(prev => prev.map(v => ({ ...v, isPresented: v.id === id })));
  }, []);

  const clearPresented = useCallback(() => {
    setVersions(prev => prev.map(v => ({ ...v, isPresented: false })));
  }, []);

  const presentedVersion = useMemo(() => versions.find(v => v.isPresented) || null, [versions]);

  // Computed
  const niche = NICHE_REGISTRY[profile.niche || ""];
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const financial = isFinancialFirm(profile.industry);

  const intel = useMemo(() => generateClientIntelligence(profile), [profile]);

  const computeForVersion = useCallback((v: QuoteVersion) => computeQuote({
    workspaceProfile: profile,
    selectedModules: v.modules,
    hasPurchasedPlatformSetup: v.hasPurchasedSetup,
    includeWebsiteBuild: v.websiteBuild,
    includeAppStoreLaunchUpgrade: v.appStoreLaunch,
    appStoreCustomAmount: v.appStoreCustomAmount ? parseFloat(v.appStoreCustomAmount) : null,
  }), [profile]);

  const quote = useMemo(() => computeForVersion(activeVersion), [computeForVersion, activeVersion]);
  const narrative = useMemo(() => generatePackageFitNarrative(profile, activeVersion.modules), [profile, activeVersion.modules]);

  const presentedQuote = useMemo(() => presentedVersion ? computeForVersion(presentedVersion) : null, [computeForVersion, presentedVersion]);
  const presentedNarrative = useMemo(() => presentedVersion ? generatePackageFitNarrative(profile, presentedVersion.modules) : null, [profile, presentedVersion]);

  const dPct = activeVersion.discountPct ? parseFloat(activeVersion.discountPct) : 0;
  const effectiveSetup = activeVersion.setupOverride ? parseInt(activeVersion.setupOverride) : Math.round(quote.totalUpfront * (1 - dPct / 100));
  const effectiveMonthly = activeVersion.monthlyOverride ? parseInt(activeVersion.monthlyOverride) : Math.round(quote.totalMonthly * (1 - dPct / 100));

  // Status
  const [proposalStatus, setProposalStatus] = useState<ProposalStatusKey>("draft");
  const [currentStage, setCurrentStage] = useState<WorkflowStepKey>("first_meeting");

  // Notes
  const [notes, setNotes] = useState<SalesNotes>(EMPTY_NOTES);
  const updateNotes = useCallback((patch: Partial<SalesNotes>) => setNotes(prev => ({ ...prev, ...patch })), []);

  // Ownership
  const [ownership, setOwnershipState] = useState<RepOwnership>(EMPTY_OWNERSHIP);
  const setOwnership = useCallback((patch: Partial<RepOwnership>) => setOwnershipState(prev => ({ ...prev, ...patch })), []);

  // Next Action
  const [nextAction, setNextActionState] = useState<NextAction>(EMPTY_NEXT_ACTION);
  const setNextAction = useCallback((patch: Partial<NextAction>) => setNextActionState(prev => ({ ...prev, ...patch })), []);

  // Activity Log
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const logActivity = useCallback((action: string, detail: string) => {
    setActivityLog(prev => [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), action, detail }, ...prev].slice(0, 100));
  }, []);

  // Forecast
  const [forecast, setForecastState] = useState<CloseForecast>(EMPTY_FORECAST);
  const setForecast = useCallback((patch: Partial<CloseForecast>) => {
    setForecastState(prev => {
      const next = { ...prev, ...patch };
      if (patch.probability !== undefined) {
        const derived = deriveForecastLabel(patch.probability);
        next.confidenceLabel = derived.label;
        next.category = derived.category;
      }
      return next;
    });
  }, []);

  // Readiness
  const stageIdx = WORKFLOW_STEPS.findIndex(s => s.key === currentStage);
  const readyToPresent = !!(profile.industry && profile.archetype && profile.niche && (quote.totalUpfront > 0 || quote.totalMonthly > 0) && narrative.opportunity);
  const readyToClose = !!((proposalStatus === "revealed" || proposalStatus === "accepted") && stageIdx >= 7 && stageIdx >= 8 && stageIdx >= 9);

  // Risk flags
  const riskFlags = useMemo(() => computeRiskFlags(notes, nextAction, dPct, proposalStatus, presentedVersion, niche, stageIdx), [notes, nextAction, dPct, proposalStatus, presentedVersion, niche, stageIdx]);

  // Handoff snapshot
  const [handoffSnapshot, setHandoffSnapshot] = useState<HandoffSnapshot | null>(null);

  const generateHandoffSnapshot = useCallback((): HandoffSnapshot | null => {
    const src = presentedVersion || activeVersion;
    const srcQuote = presentedVersion ? presentedQuote! : quote;
    const srcNarrative = presentedVersion ? presentedNarrative! : narrative;
    if (!srcQuote || !srcNarrative) return null;

    const dP = src.discountPct ? parseFloat(src.discountPct) : 0;
    const snap: HandoffSnapshot = {
      generatedAt: new Date().toISOString(),
      versionName: src.name,
      profile,
      nicheLabel: niche?.label || profile.niche || "General",
      modules: src.modules,
      websiteBuild: src.websiteBuild,
      appStoreLaunch: src.appStoreLaunch,
      complianceLevel: niche?.complianceLevel || "none",
      setupTotal: srcQuote.totalUpfront,
      monthlyTotal: srcQuote.totalMonthly,
      effectiveSetup: src.setupOverride ? parseInt(src.setupOverride) : Math.round(srcQuote.totalUpfront * (1 - dP / 100)),
      effectiveMonthly: src.monthlyOverride ? parseInt(src.monthlyOverride) : Math.round(srcQuote.totalMonthly * (1 - dP / 100)),
      focusOutcomes: srcNarrative.focusOutcomes,
      next90Days: srcNarrative.next90Days,
      onboardingNotes: notes.onboardingHandoff,
      fulfillmentCautions: notes.fulfillmentCautions,
    };
    setHandoffSnapshot(snap);
    logActivity("Handoff Snapshot", `Generated from ${src.name}`);
    return snap;
  }, [presentedVersion, activeVersion, presentedQuote, quote, presentedNarrative, narrative, profile, niche, notes, logActivity]);

  const value: ActiveSalesState = {
    profile, setProfile,
    versions, activeVersionId, activeVersion, setActiveVersionId,
    updateVersion, updateActiveVersion, addVersion, duplicateVersion, deleteVersion,
    presentedVersion, presentedQuote, presentedNarrative, markAsPresented, clearPresented,
    quote, intel, narrative, effectiveSetup, effectiveMonthly, discountPct: dPct,
    proposalStatus, setProposalStatus, currentStage, setCurrentStage,
    notes, updateNotes,
    ownership, setOwnership,
    nextAction, setNextAction,
    activityLog, logActivity,
    forecast, setForecast,
    riskFlags,
    readyToPresent, readyToClose,
    handoffSnapshot, generateHandoffSnapshot,
    niche, opType, financial,
  };

  return <ActiveSalesContext.Provider value={value}>{children}</ActiveSalesContext.Provider>;
}
