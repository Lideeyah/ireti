import type {
  AssessmentFactor,
  AuditEvent,
  BankAccount,
  BankConnection,
  BankPolicy,
  Business,
  Case,
  Consent,
  CreditAssessment,
  DocumentRecord,
  FinancialProfile,
  LoanApplication,
  LoanOffer,
  Notification,
  Repayment,
  RepaymentPlan,
  RiskEvent,
  Role,
} from "@/lib/domain/types";
import type { Prisma } from "@prisma/client";

/**
 * Converts Prisma rows into the plain domain types used by the UI.
 * JSON columns are parsed here and nowhere else.
 */
type Row<T extends keyof Prisma.TypeMap["model"]> = Prisma.TypeMap["model"][T]["payload"]["scalars"];

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined);
const json = <T>(s: string | null | undefined, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

export const toBusiness = (r: Row<"Business">): Business => ({
  id: r.id,
  organisationId: r.organisationId,
  name: r.name,
  cacNumber: r.cacNumber,
  cacStatus: r.cacStatus as Business["cacStatus"],
  businessType: r.businessType,
  industry: r.industry,
  location: r.location,
  yearsOperating: r.yearsOperating,
  declaredMonthlyRevenue: r.declaredMonthlyRevenue,
  identityVerified: r.identityVerified,
  identityVerifiedAt: iso(r.identityVerifiedAt),
  createdAt: r.createdAt.toISOString(),
});

export const toConnection = (r: Row<"BankConnection">): BankConnection => ({
  id: r.id,
  businessId: r.businessId,
  institutionId: r.institutionId,
  institutionName: r.institutionName,
  status: r.status as BankConnection["status"],
  provider: "demo-open-banking",
  connectedAt: iso(r.connectedAt),
  lastSyncedAt: iso(r.lastSyncedAt),
  consentId: r.consentId ?? undefined,
  failureReason: r.failureReason ?? undefined,
});

export const toAccount = (r: Row<"BankAccount">): BankAccount => ({
  id: r.id,
  connectionId: r.connectionId,
  businessId: r.businessId,
  institutionId: r.institutionId,
  institutionName: r.institutionName,
  accountNumberMasked: r.accountNumberMasked,
  accountType: r.accountType as BankAccount["accountType"],
  currency: "NGN",
  balance: r.balance,
});

export const toProfile = (r: Row<"FinancialProfile">): FinancialProfile => ({
  ...json<FinancialProfile>(r.data, {} as FinancialProfile),
  id: r.id,
  businessId: r.businessId,
  generatedAt: r.generatedAt.toISOString(),
});

export const toAssessment = (r: Row<"CreditAssessment">): CreditAssessment => {
  const data = json<Partial<CreditAssessment>>(r.data, {});
  return {
    id: r.id,
    businessId: r.businessId,
    profileId: r.profileId,
    generatedAt: r.generatedAt.toISOString(),
    modelVersion: r.modelVersion,
    policyVersion: r.policyVersion,
    score: r.score,
    band: r.band as CreditAssessment["band"],
    eligibleAmount: r.eligibleAmount,
    recommendedAmount: r.recommendedAmount,
    factors: (data.factors ?? []) as AssessmentFactor[],
    recommendedTenorMonths: data.recommendedTenorMonths ?? 6,
    repaymentWindow: data.repaymentWindow ?? { start: 1, end: 3 },
    recommendedRepaymentDay: data.recommendedRepaymentDay ?? 2,
    riskObservations: data.riskObservations ?? [],
    repaymentObservations: data.repaymentObservations ?? [],
    recommendation: data.recommendation ?? { action: "review", headline: "", confidence: "Low", reasoning: [] },
    policyChecks: data.policyChecks ?? [],
    policyPassed: data.policyPassed ?? false,
  };
};

export const toOffer = (r: Row<"LoanOffer">): LoanOffer => ({
  id: r.id,
  businessId: r.businessId,
  principal: r.principal,
  tenorMonths: r.tenorMonths,
  annualInterestRate: r.annualInterestRate,
  interestMethod: "reducing_balance_equal_instalment",
  interestAmount: r.interestAmount,
  feeRate: r.feeRate,
  feeAmount: r.feeAmount,
  totalRepayable: r.totalRepayable,
  instalmentAmount: r.instalmentAmount,
  repaymentWindow: { start: r.windowStart, end: r.windowEnd },
  recommendedRepaymentDay: r.recommendedRepaymentDay,
  policyVersion: r.policyVersion,
  createdAt: r.createdAt.toISOString(),
});

export const toApplication = (r: Row<"LoanApplication">): LoanApplication => ({
  id: r.id,
  reference: r.reference,
  businessId: r.businessId,
  assessmentId: r.assessmentId,
  offerId: r.offerId,
  consentId: r.consentId,
  amount: r.amount,
  purpose: r.purpose as LoanApplication["purpose"],
  tenorMonths: r.tenorMonths,
  status: r.status as LoanApplication["status"],
  submittedAt: r.submittedAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
  reviewerId: r.reviewerId ?? undefined,
  reviewerName: r.reviewerName ?? undefined,
  firstReviewedAt: iso(r.firstReviewedAt),
  decision: json(r.decision, undefined),
  informationRequest: json(r.informationRequest, undefined),
  disbursement: json(r.disbursement, undefined),
});

export const toPlan = (r: Row<"RepaymentPlan"> & { repayments?: Row<"Repayment">[] }): RepaymentPlan => ({
  id: r.id,
  applicationId: r.applicationId,
  businessId: r.businessId,
  offerId: r.offerId,
  mandateReference: r.mandateReference,
  principal: r.principal,
  totalRepayable: r.totalRepayable,
  outstanding: r.outstanding,
  paidToDate: r.paidToDate,
  health: r.health as RepaymentPlan["health"],
  startedAt: r.startedAt.toISOString(),
  repaymentIds: (r.repayments ?? []).map((x) => x.id),
});

export const toRepayment = (r: Row<"Repayment">): Repayment => ({
  id: r.id,
  planId: r.planId,
  businessId: r.businessId,
  sequence: r.sequence,
  dueDate: r.dueDate.toISOString().slice(0, 10),
  windowStart: r.windowStart.toISOString().slice(0, 10),
  windowEnd: r.windowEnd.toISOString().slice(0, 10),
  amount: r.amount,
  principalPortion: r.principalPortion,
  interestPortion: r.interestPortion,
  status: r.status as Repayment["status"],
  attempts: r.attempts,
  paidAt: iso(r.paidAt),
  failureReason: r.failureReason ?? undefined,
  reference: r.reference ?? undefined,
});

export const toRiskEvent = (r: Row<"RiskEvent"> & { case?: { id: string } | null }): RiskEvent => ({
  id: r.id,
  businessId: r.businessId,
  applicationId: r.applicationId ?? undefined,
  type: r.type as RiskEvent["type"],
  severity: r.severity as RiskEvent["severity"],
  description: r.description,
  createdAt: r.createdAt.toISOString(),
  caseId: r.case?.id,
});

export const toCase = (r: Row<"Case">): Case => ({
  id: r.id,
  reference: r.reference,
  riskEventId: r.riskEventId,
  businessId: r.businessId,
  applicationId: r.applicationId ?? undefined,
  severity: r.severity as Case["severity"],
  trigger: r.trigger,
  owner: r.owner,
  assigneeName: r.assigneeName ?? undefined,
  status: r.status as Case["status"],
  notes: json(r.notes, []),
  history: json(r.history, []),
  createdAt: r.createdAt.toISOString(),
  resolvedAt: iso(r.resolvedAt),
});

export const toAuditEvent = (r: Row<"AuditEvent">): AuditEvent => ({
  seq: r.seq,
  id: r.id,
  timestamp: r.timestamp.toISOString(),
  type: r.type as AuditEvent["type"],
  actorId: r.actorId,
  actorName: r.actorName,
  actorRole: r.actorRole as Role | "SYSTEM",
  businessId: r.businessId ?? undefined,
  applicationId: r.applicationId ?? undefined,
  applicationRef: r.applicationRef ?? undefined,
  resource: r.resource ?? undefined,
  metadata: json(r.metadata, {}),
  payloadHash: r.payloadHash,
  previousHash: r.previousHash,
  hash: r.hash,
  customerVisible: r.customerVisible,
});

export const toNotification = (r: Row<"Notification">): Notification => ({
  id: r.id,
  audience: r.audience as Notification["audience"],
  type: r.type as Notification["type"],
  title: r.title,
  body: r.body,
  createdAt: r.createdAt.toISOString(),
  read: r.read,
  href: r.href ?? undefined,
});

export const toPolicy = (r: Row<"BankPolicy">): BankPolicy => ({
  ...json<BankPolicy>(r.data, {} as BankPolicy),
  version: r.version,
  updatedAt: r.updatedAt.toISOString(),
  updatedByName: r.updatedByName,
});

export const toDocument = (r: Row<"Document">): DocumentRecord => ({
  id: r.id,
  businessId: r.businessId,
  applicationId: r.applicationId ?? undefined,
  type: r.type,
  name: r.name,
  status: r.status as DocumentRecord["status"],
  providedAt: iso(r.providedAt),
});

export const toConsent = (r: Row<"Consent">): Consent => ({
  id: r.id,
  businessId: r.businessId,
  applicationId: r.applicationId ?? undefined,
  scope: json(r.scope, []),
  grantedAt: r.grantedAt.toISOString(),
  grantedByName: r.grantedByName,
  hash: r.hash,
});

export const toTransactionRows = (rows: Row<"Transaction">[]) =>
  rows.map((t) => ({ id: t.id, accountId: t.accountId, businessId: t.businessId, date: t.date.toISOString(), amount: t.amount, category: t.category as import("@/lib/domain/types").TransactionCategory, counterparty: t.counterparty, narration: t.narration }));
