import type { Role } from "../domain/types";

/** Explicit permission model — least privilege. UI actions are gated by `can()`. */
export type Permission =
  | "sme:view_own"
  | "sme:apply"
  | "sme:report_access"
  | "bank:view_queue"
  | "bank:review_application"
  | "bank:decide_application"
  | "bank:request_information"
  | "bank:view_financials"
  | "bank:view_risk"
  | "bank:manage_cases"
  | "bank:manage_disbursement"
  | "bank:process_repayment"
  | "bank:view_audit"
  | "bank:configure_policy";

const MATRIX: Record<Role, Permission[]> = {
  SME_USER: ["sme:view_own", "sme:apply", "sme:report_access"],
  BANK_OFFICER: [
    "bank:view_queue",
    "bank:review_application",
    "bank:decide_application",
    "bank:request_information",
    "bank:view_financials",
    "bank:view_risk",
  ],
  BANK_RISK: ["bank:view_queue", "bank:review_application", "bank:view_financials", "bank:view_risk", "bank:manage_cases"],
  BANK_OPERATIONS: ["bank:view_queue", "bank:review_application", "bank:manage_disbursement", "bank:process_repayment", "bank:view_risk", "bank:manage_cases"],
  BANK_COMPLIANCE: ["bank:view_queue", "bank:review_application", "bank:view_financials", "bank:view_risk", "bank:view_audit", "bank:manage_cases"],
  ADMIN: [
    "bank:view_queue",
    "bank:review_application",
    "bank:decide_application",
    "bank:request_information",
    "bank:view_financials",
    "bank:view_risk",
    "bank:manage_cases",
    "bank:manage_disbursement",
    "bank:process_repayment",
    "bank:view_audit",
    "bank:configure_policy",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function rolesWith(permission: Permission): Role[] {
  return (Object.keys(MATRIX) as Role[]).filter((r) => MATRIX[r].includes(permission));
}

export const ROLE_LABELS: Record<Role, string> = {
  SME_USER: "SME user",
  BANK_OFFICER: "Credit Officer",
  BANK_RISK: "Risk",
  BANK_OPERATIONS: "Operations",
  BANK_COMPLIANCE: "Compliance",
  ADMIN: "Administrator",
};
