import type { AuditEventType, NotificationType } from "./types";

export const EVENT_LABELS: Record<AuditEventType, string> = {
  IDENTITY_VERIFIED: "Identity verified",
  CONSENT_RECORDED: "Consent recorded",
  ACCOUNT_CONNECTED: "Account connected",
  ACCOUNT_CONNECTION_FAILED: "Account connection failed",
  DATA_ACCESS: "Financial profile accessed",
  FINANCIAL_PROFILE_GENERATED: "Financial profile generated",
  ASSESSMENT_CREATED: "Credit assessment generated",
  APPLICATION_SUBMITTED: "Application submitted",
  APPLICATION_REVIEW_STARTED: "Application reviewed",
  INFORMATION_REQUESTED: "Additional information requested",
  INFORMATION_PROVIDED: "Information provided",
  APPLICATION_APPROVED: "Application approved",
  APPLICATION_REJECTED: "Application declined",
  DISBURSEMENT_INITIATED: "Disbursement initiated",
  DISBURSEMENT_CONFIRMED: "Disbursement confirmed",
  DISBURSEMENT_FAILED: "Disbursement failed",
  MANDATE_CREATED: "Repayment mandate created",
  REPAYMENT_PROCESSED: "Repayment processed",
  REPAYMENT_FAILED: "Repayment failed",
  RISK_EVENT_CREATED: "Risk event created",
  CASE_UPDATED: "Case updated",
  CASE_RESOLVED: "Case resolved",
  ACCESS_REPORTED: "Unusual access reported",
  POLICY_UPDATED: "Lending policy updated",
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  identity_verified: "Identity verified",
  account_connected: "Account connected",
  analysis_completed: "Financial analysis completed",
  application_submitted: "Application submitted",
  application_viewed: "Application viewed",
  information_requested: "Additional information requested",
  information_provided: "Information provided",
  application_approved: "Application approved",
  application_rejected: "Application declined",
  disbursement_completed: "Disbursement completed",
  disbursement_failed: "Disbursement failed",
  repayment_upcoming: "Repayment upcoming",
  repayment_successful: "Repayment successful",
  repayment_failed: "Repayment failed",
  risk_event_created: "Risk event created",
  case_updated: "Case updated",
};

export const INFORMATION_ITEMS = ["Updated financial statement", "Proof of business address", "Contract/invoice", "Clarification on existing obligation", "Other"];

export const BUSINESS_TYPES = ["Private limited company", "Enterprise", "Partnership", "Public limited company", "Cooperative"];
export const INDUSTRIES = ["Food distribution", "Agriculture", "Agro-processing", "Manufacturing", "Retail", "Wholesale trade", "Logistics", "Construction supplies", "Hospitality", "Healthcare", "Education", "Professional services", "Technology", "Other"];

export const CATEGORY_LABELS: Record<string, string> = {
  sales: "Sales",
  distributor_settlement: "Settlement",
  contract_payment: "Contract",
  supplier_payment: "Supplier",
  payroll: "Payroll",
  rent: "Rent",
  utilities: "Utilities",
  logistics: "Logistics",
  loan_repayment: "Loan repayment",
  equipment: "Equipment",
  tax: "Tax",
  other: "Other",
};
