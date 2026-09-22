// ── Business Operation Type ──
// The business sells to financial firms only. This module used to map many
// verticals to operational behavior; it now resolves to a single type.
// Signatures are preserved so existing callers keep compiling.

import type { ProfileType } from "@/lib/profileEngine";
import type { IndustryCategory, BusinessArchetype } from "@/lib/workspaceProfileTypes";

export const BUSINESS_OPERATION_TYPES = [
  {
    value: "financial_firm",
    label: "Financial Firm",
    description: "Advisory, wealth management, CPA and insurance firms — compliance-sensitive, high-ticket, consultative",
  },
] as const;

export type BusinessOperationType = (typeof BUSINESS_OPERATION_TYPES)[number]["value"];

/** The only operation type sold today. */
export const FINANCIAL_FIRM_OPERATION_TYPE: BusinessOperationType = "financial_firm";

/** Every client is a financial firm now. */
export function isFinancialFirm(_industry?: IndustryCategory): boolean {
  return true;
}

/** Single-vertical business: always resolves to the financial firm type. */
export function resolveOperationType(
  _archetype?: BusinessArchetype,
  _industry?: IndustryCategory
): BusinessOperationType {
  return FINANCIAL_FIRM_OPERATION_TYPE;
}

/** Legacy profile strings all map to the single operation type. */
export function fromLegacyProfile(_legacy?: ProfileType): BusinessOperationType {
  return FINANCIAL_FIRM_OPERATION_TYPE;
}
