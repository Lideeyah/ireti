/**
 * Core domain model for Ìrètí.
 *
 * Entities are stored relationally (by id) in the application store. Nothing here
 * contains raw banking credentials; sensitive identifiers (BVN) are never persisted,
 * only a verification status.
 */

export type Role =
  | "SME_USER"
  | "BANK_OFFICER"
  | "BANK_RISK"
  | "BANK_OPERATIONS"
  | "BANK_COMPLIANCE"
  | "ADMIN";

export type Rating = "Strong" | "Moderate" | "Weak";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  organisationId: string;
}

export interface Organisation {
  id: string;
  name: string;
  type: "sme" | "bank";
}

export interface Business {
  id: string;
  organisationId: string;
  name: string;
  cacNumber: string;
  cacStatus: "Active" | "Pending verification";
  businessType: string;
  industry: string;
  location: string;
  yearsOperating: number;
  declaredMonthlyRevenue: number;
  identityVerified: boolean;
  identityVerifiedAt?: string;
  /** Account designated to receive disbursement and carry the repayment mandate. */
  disbursementAccountId?: string;
  createdAt: string;
}

export type ConnectionStatus = "not_connected" | "connecting" | "connected" | "failed";

export interface BankConnection {
  id: string;
  businessId: string;
  institutionId: string;
  institutionName: string;
  status: ConnectionStatus;
  provider: "demo-open-banking";
  connectedAt?: string;
  lastSyncedAt?: string;
  consentId?: string;
  failureReason?: string;
}

export interface BankAccount {
  id: string;
  connectionId: string;
  businessId: string;
  institutionId: string;
  institutionName: string;
  accountNumberMasked: string;
  accountType: "Current" | "Savings" | "Wallet";
  currency: "NGN";
  balance: number;
}

export type TransactionCategory =
  | "sales"
  | "distributor_settlement"
  | "contract_payment"
  | "supplier_payment"
  | "payroll"
  | "rent"
  | "utilities"
  | "logistics"
  | "loan_repayment"
  | "equipment"
  | "tax"
  | "other";

export interface Transaction {
  id: string;
  accountId: string;
  businessId: string;
  date: string; // ISO
  amount: number; // positive = inflow, negative = outflow
  category: TransactionCategory;
  counterparty: string;
  narration: string;
}

export interface MonthlyAggregate {
  month: string; // YYYY-MM
  label: string; // e.g. "Oct 25"
  inflow: number;
  outflow: number;
  net: number;
  transactionCount: number;
}

export interface FinancialProfile {
  id: string;
  businessId: string;
  generatedAt: string;
  coverageMonths: number;
  monthly: MonthlyAggregate[];
  avgMonthlyInflow: number; // recency-weighted
  avgMonthlyOutflow: number;
  avgNetMonthlyFlow: number;
  recentAvgInflow: number; // last 3 months simple average
  recentInflowChangePct: number; // vs prior 9 months
  revenueCoefficientOfVariation: number;
  revenueConsistency: "High" | "Medium" | "Low";
  expenseRatio: number; // outflow / inflow
  positiveNetMonths: number;
  existingObligations: number; // outstanding balance on observed facilities
  monthlyDebtService: number;
  debtServiceRatio: number; // monthly debt service / avg net flow
  paymentConsistency: Rating;
  loanRepaymentsObserved: number;
  loanRepaymentsOnTime: number;
  avgTransactionsPerMonth: number;
  institutionsConnected: number;
  strongestInflowWindow: { start: number; end: number };
  avgInflowDuringWindow: number;
  recommendedRepaymentDay: number;
  totalObservedBalance: number;
  narrative: string;
}

export interface AssessmentFactor {
  key: string;
  label: string;
  rating: Rating;
  score: number; // 0–100
  weight: number; // 0–1, weights sum to 1
  evidence: string;
}

export type RecommendationAction = "approve" | "review" | "decline";

export interface DecisionRecommendation {
  action: RecommendationAction;
  headline: string;
  confidence: "High" | "Medium" | "Low";
  reasoning: string[];
}

export interface PolicyCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface CreditAssessment {
  id: string;
  businessId: string;
  profileId: string;
  generatedAt: string;
  modelVersion: string;
  policyVersion: string;
  score: number;
  band: "Strong" | "Moderate" | "Weak";
  factors: AssessmentFactor[];
  eligibleAmount: number;
  recommendedAmount: number;
  recommendedTenorMonths: number;
  repaymentWindow: { start: number; end: number };
  recommendedRepaymentDay: number;
  /** Net monthly flow remaining after existing debt service. */
  freeCashFlow: number;
  /** Largest instalment serviceable at the bank's target cover, after haircuts. */
  maxInstalment: number;
  /** Projected cover for the recommended amount: free cash flow ÷ instalment. */
  projectedDscr: number;
  capacityCeiling: number;
  affordabilityCeiling: number;
  bindingConstraint: "capacity" | "affordability" | "bank_maximum";
  constraintNote: string;
  riskObservations: string[];
  repaymentObservations: string[];
  recommendation: DecisionRecommendation;
  policyChecks: PolicyCheck[];
  policyPassed: boolean;
}

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "additional_information"
  | "approved"
  | "rejected"
  | "disbursement_pending"
  | "disbursed"
  | "disbursement_failed";

export type LoanPurpose =
  | "Working capital"
  | "Inventory"
  | "Equipment"
  | "Expansion"
  | "Contract execution"
  | "Other";

export interface InformationRequest {
  items: string[];
  message?: string;
  requestedAt: string;
  requestedById: string;
  requestedByName: string;
  respondedAt?: string;
}

export interface Decision {
  outcome: "approved" | "rejected";
  byId: string;
  byName: string;
  at: string;
  note?: string;
}

export type DisbursementStatus = "pending" | "processing" | "confirmed" | "failed";

export interface DisbursementRecord {
  status: DisbursementStatus;
  destinationAccountId: string;
  destinationMasked: string;
  institutionName: string;
  attempts: number;
  reference?: string;
  confirmedAt?: string;
  failureReason?: string;
  lastAttemptAt?: string;
}

export interface LoanApplication {
  id: string;
  reference: string; // IR-2026-00482
  businessId: string;
  assessmentId: string;
  offerId: string;
  amount: number;
  purpose: LoanPurpose;
  tenorMonths: number;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  reviewerId?: string;
  reviewerName?: string;
  firstReviewedAt?: string;
  decision?: Decision;
  informationRequest?: InformationRequest;
  disbursement?: DisbursementRecord;
  repaymentPlanId?: string;
  consentId: string;
}

export interface LoanOffer {
  id: string;
  applicationId?: string;
  businessId: string;
  principal: number;
  tenorMonths: number;
  annualInterestRate: number;
  interestMethod: "reducing_balance_equal_instalment";
  interestAmount: number;
  feeRate: number;
  feeAmount: number;
  totalRepayable: number;
  instalmentAmount: number;
  repaymentWindow: { start: number; end: number };
  recommendedRepaymentDay: number;
  policyVersion: string;
  createdAt: string;
}

export type RepaymentStatus = "scheduled" | "processing" | "paid" | "failed" | "overdue";

export interface Repayment {
  id: string;
  planId: string;
  businessId: string;
  sequence: number;
  dueDate: string; // ISO date
  windowStart: string;
  windowEnd: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  status: RepaymentStatus;
  attempts: number;
  paidAt?: string;
  failureReason?: string;
  reference?: string;
}

export type LoanHealth = "healthy" | "watch" | "at_risk" | "completed";

export interface RepaymentPlan {
  id: string;
  applicationId: string;
  businessId: string;
  offerId: string;
  mandateReference: string;
  principal: number;
  totalRepayable: number;
  outstanding: number;
  paidToDate: number;
  health: LoanHealth;
  startedAt: string;
  repaymentIds: string[];
}

export type RiskEventType =
  | "repayment_failed"
  | "missed_repayment"
  | "reduced_inflows"
  | "unusual_activity"
  | "cash_flow_change"
  | "access_dispute";

export type Severity = "Low" | "Medium" | "High";

export interface RiskEvent {
  id: string;
  businessId: string;
  applicationId?: string;
  type: RiskEventType;
  severity: Severity;
  description: string;
  createdAt: string;
  caseId?: string;
}

export type CaseStatus = "open" | "assigned" | "escalated" | "resolved";

export interface CaseNote {
  at: string;
  byName: string;
  text: string;
}

export interface Case {
  id: string;
  reference: string; // RISK-2026-0182
  riskEventId: string;
  businessId: string;
  applicationId?: string;
  severity: Severity;
  trigger: string;
  createdAt: string;
  owner: string;
  assigneeName?: string;
  status: CaseStatus;
  notes: CaseNote[];
  history: { at: string; byName: string; action: string }[];
  resolvedAt?: string;
}

export type AuditEventType =
  | "IDENTITY_VERIFIED"
  | "CONSENT_RECORDED"
  | "ACCOUNT_CONNECTED"
  | "ACCOUNT_CONNECTION_FAILED"
  | "DATA_ACCESS"
  | "FINANCIAL_PROFILE_GENERATED"
  | "ASSESSMENT_CREATED"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_REVIEW_STARTED"
  | "INFORMATION_REQUESTED"
  | "INFORMATION_PROVIDED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "DISBURSEMENT_INITIATED"
  | "DISBURSEMENT_CONFIRMED"
  | "DISBURSEMENT_FAILED"
  | "MANDATE_CREATED"
  | "REPAYMENT_PROCESSED"
  | "REPAYMENT_FAILED"
  | "RISK_EVENT_CREATED"
  | "CASE_UPDATED"
  | "CASE_RESOLVED"
  | "ACCESS_REPORTED"
  | "POLICY_UPDATED";

export interface AuditEvent {
  seq: number;
  id: string;
  timestamp: string;
  type: AuditEventType;
  actorId: string;
  actorName: string;
  actorRole: Role | "SYSTEM";
  businessId?: string;
  applicationId?: string;
  applicationRef?: string;
  resource?: string;
  /** Non-sensitive metadata only: amounts, versions, statuses, references. */
  metadata: Record<string, string | number>;
  payloadHash: string;
  previousHash: string;
  hash: string;
  customerVisible: boolean;
}

export type NotificationType =
  | "identity_verified"
  | "account_connected"
  | "analysis_completed"
  | "application_submitted"
  | "application_viewed"
  | "information_requested"
  | "information_provided"
  | "application_approved"
  | "application_rejected"
  | "disbursement_completed"
  | "disbursement_failed"
  | "repayment_upcoming"
  | "repayment_successful"
  | "repayment_failed"
  | "risk_event_created"
  | "case_updated";

export interface Notification {
  id: string;
  audience: "sme" | "bank";
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface BankPolicy {
  version: string;
  maxLoanAmount: number;
  minLoanAmount: number;
  minAssessmentScore: number;
  allowedTenors: number[];
  annualInterestRate: number; // e.g. 0.18
  processingFeeRate: number; // e.g. 0.005
  requiredDocuments: string[];
  eligibility: {
    /** Share of annualised net cash flow that may be lent at a perfect score. */
    capacityRatio: number;
    /** Recommended amount as a share of eligibility. */
    recommendedShare: number;
    /** Maximum existing-debt-service-to-net-flow ratio permitted. */
    maxDebtServiceRatio: number;
    /** Target debt-service coverage ratio for a new instalment. */
    targetDscr: number;
    /** How sharply revenue volatility reduces the affordable instalment. */
    volatilitySensitivity: number;
  };
  repaymentRules: {
    alignToInflowWindow: boolean;
    minDaysBeforeFirstRepayment: number;
    maxDebitRetries: number;
    graceDays: number;
  };
  riskThresholds: {
    inflowDropWatchPct: number; // e.g. 0.2
    inflowDropAtRiskPct: number; // e.g. 0.35
    failedDebitsAtRisk: number; // e.g. 1
    missedRepaymentsAtRisk: number;
  };
  updatedAt: string;
  updatedByName: string;
}

export interface DocumentRecord {
  id: string;
  businessId: string;
  applicationId?: string;
  type: string;
  name: string;
  status: "requested" | "provided" | "verified";
  note?: string;
  providedAt?: string;
}

export interface Consent {
  id: string;
  businessId: string;
  applicationId?: string;
  scope: string[];
  grantedAt: string;
  grantedByName: string;
  hash: string;
}

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  kind: "commercial" | "fintech";
}
