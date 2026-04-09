// ── Feature Lock Gate ──
// Lightweight wrapper that checks lock-state for a feature area
// and either renders children or wraps them with LockedFeature.

import { useMemo } from "react";
import { evaluateLockState, type LockContext } from "@/lib/lockStateEngine";
import { LockedFeature, LockBadge } from "@/components/LockedFeature";

interface FeatureLockGateProps {
  featureKeys: string[];
  ctx: LockContext;
  title: string;
  children: React.ReactNode;
  variant?: "overlay" | "badge" | "inline-badge";
}

/**
 * Wraps any feature section with lock-state evaluation.
 * If locked → shows LockedFeature overlay/badge.
 * If unlocked → renders children normally.
 */
export function FeatureLockGate({
  featureKeys,
  ctx,
  title,
  children,
  variant = "overlay",
}: FeatureLockGateProps) {
  const evaluation = useMemo(
    () => evaluateLockState(featureKeys, ctx),
    [featureKeys, ctx]
  );

  if (!evaluation.isLocked) return <>{children}</>;

  if (variant === "inline-badge") {
    return (
      <div className="relative">
        {children}
        <div className="absolute top-3 right-3 z-10">
          <LockBadge message={evaluation.lockMessage || "Locked until setup"} />
        </div>
      </div>
    );
  }

  return (
    <LockedFeature
      title={title}
      lockMessage={evaluation.lockMessage}
      setupLink={evaluation.setupLink}
      variant={variant === "badge" ? "badge" : "overlay"}
    >
      {children}
    </LockedFeature>
  );
}

/** Hook for inline lock-state checks */
export function useLockState(featureKeys: string[], ctx: LockContext) {
  return useMemo(() => evaluateLockState(featureKeys, ctx), [featureKeys, ctx]);
}
