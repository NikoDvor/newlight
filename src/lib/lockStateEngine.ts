// ── Lock State Engine ──
// Evaluates feature lock state based on missing prerequisites.
// Returns internal reasons + premium client-safe copy.
// Does NOT hide modules — shows "Locked until setup".

export type LockReasonType =
  | "integration_missing"
  | "form_data_missing"
  | "plan_tier_missing"
  | "module_not_activated"
  | "onboarding_step_incomplete"
  | "calendar_not_configured"
  | "payment_not_completed";

export interface LockCheck {
  type: LockReasonType;
  key: string;
  label: string;
  /** Internal reason — never shown to client */
  internalReason: string;
  /** Premium-safe client copy */
  clientCopy: string;
  setupLink?: string;
}

export interface LockEvaluation {
  isLocked: boolean;
  reasons: LockCheck[];
  /** Primary client-facing message */
  lockMessage: string;
  /** Setup link for CTA */
  setupLink: string;
}

export interface LockContext {
  hasCalendar?: boolean;
  hasTwilio?: boolean;
  hasReviewPlatform?: boolean;
  hasStripe?: boolean;
  hasGoogleIntegration?: boolean;
  hasAppUpgrade?: boolean;
  hasComplianceWorkflow?: boolean;
  hasBranding?: boolean;
  hasTeam?: boolean;
  hasForms?: boolean;
  hasContacts?: boolean;
  paymentStatus?: string;
  onboardingStage?: string;
  setupPct?: number;
}

const LOCK_CHECKS: {
  condition: (ctx: LockContext) => boolean;
  check: LockCheck;
}[] = [
  {
    condition: (ctx) => ctx.hasCalendar === false,
    check: {
      type: "calendar_not_configured",
      key: "calendar",
      label: "Calendar",
      internalReason: "No calendar configured for this workspace",
      clientCopy: "Complete calendar setup to unlock scheduling features",
      setupLink: "/calendar-management",
    },
  },
  {
    condition: (ctx) => ctx.hasTwilio === false,
    check: {
      type: "integration_missing",
      key: "twilio",
      label: "Messaging",
      internalReason: "Twilio integration not connected",
      clientCopy: "Complete messaging setup to unlock automated communications",
      setupLink: "/integrations",
    },
  },
  {
    condition: (ctx) => ctx.hasReviewPlatform === false,
    check: {
      type: "integration_missing",
      key: "reviews",
      label: "Reviews",
      internalReason: "Review platform not connected",
      clientCopy: "Connect your review platform to unlock reputation management",
      setupLink: "/reviews",
    },
  },
  {
    condition: (ctx) => ctx.hasAppUpgrade === false,
    check: {
      type: "plan_tier_missing",
      key: "app_store",
      label: "Mobile App",
      internalReason: "App Store upgrade not selected in package",
      clientCopy: "App Store features available with your growth package upgrade",
      setupLink: "/billing",
    },
  },
  {
    condition: (ctx) => ctx.hasComplianceWorkflow === false,
    check: {
      type: "module_not_activated",
      key: "compliance",
      label: "Compliance Workflow",
      internalReason: "Financial Compliance Workflow module not activated",
      clientCopy: "Compliance workflow available — complete activation to enable",
      setupLink: "/setup-center",
    },
  },
  {
    condition: (ctx) => ctx.hasBranding === false,
    check: {
      type: "onboarding_step_incomplete",
      key: "branding",
      label: "Branding",
      internalReason: "Brand identity not configured",
      clientCopy: "Set up your brand identity to personalize your workspace",
      setupLink: "/branding-settings",
    },
  },
  {
    condition: (ctx) => ctx.paymentStatus !== "paid" && ctx.onboardingStage !== "active",
    check: {
      type: "payment_not_completed",
      key: "payment",
      label: "Activation",
      internalReason: "Payment not completed — workspace not yet activated",
      clientCopy: "Complete your activation to unlock full system capabilities",
      setupLink: "/setup-center",
    },
  },
];

/**
 * Evaluate lock state for a specific feature area.
 * Pass relevant context — only matching checks are applied.
 */
export function evaluateLockState(
  featureKeys: string[],
  ctx: LockContext
): LockEvaluation {
  const reasons: LockCheck[] = [];

  for (const check of LOCK_CHECKS) {
    if (featureKeys.includes(check.check.key) && check.condition(ctx)) {
      reasons.push(check.check);
    }
  }

  return {
    isLocked: reasons.length > 0,
    reasons,
    lockMessage: reasons.length > 0
      ? reasons[0].clientCopy
      : "",
    setupLink: reasons.length > 0
      ? reasons[0].setupLink || "/setup-center"
      : "/setup-center",
  };
}

/**
 * Quick check — is a specific feature locked?
 */
export function isFeatureLocked(featureKey: string, ctx: LockContext): boolean {
  return evaluateLockState([featureKey], ctx).isLocked;
}

/**
 * Get premium-safe lock badge text.
 */
export function getLockBadgeText(eval_: LockEvaluation): string {
  if (!eval_.isLocked) return "";
  return "Locked until setup";
}
