/**
 * Lightweight wrapper that applies PermissionGate at the page level.
 * Usage: <PermissionGuard moduleKey="crm"><CRM /></PermissionGuard>
 */
import { PermissionGate } from "@/components/PermissionGate";
import type { AccessLevel } from "@/lib/rolePresets";

interface Props {
  moduleKey: string;
  minLevel?: AccessLevel;
  children: React.ReactNode;
}

export function PermissionGuard({ moduleKey, minLevel = "view", children }: Props) {
  return (
    <PermissionGate moduleKey={moduleKey} minLevel={minLevel}>
      {children}
    </PermissionGate>
  );
}
