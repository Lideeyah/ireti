import "server-only";
import type { LoanPurpose } from "@/lib/domain/types";
import { institutionById } from "@/lib/seed/institutions";
import { generateInstitutionData } from "@/lib/seed/transactions";
import { buildFinancialProfile } from "@/lib/analysis/financialAnalysis";
import { assessCredit } from "@/lib/assessment/engine";
import { priceLoan } from "@/lib/loan/pricing";
import { demoIdentityService } from "@/lib/services/bvn";
import { demoBankConnectionService } from "@/lib/services/bankConnection";
import { applicationReference } from "@/lib/util/ids";
import { sha256 } from "@/lib/util/sha256";
import { formatNaira } from "@/lib/format";
import { prisma } from "./db";
import { getPolicy, nextCounter, notify, recordAudit, ServiceError, SYSTEM_ACTOR, type Actor } from "./core";
import { toAccount, toApplication, toAssessment, toBusiness, toProfile, toTransactionRows } from "./serializers";
import type { SessionUser } from "./auth";

/**
 * SME use cases. Every function takes the authenticated user, operates on that user's
 * organisation only, and writes the corresponding audit events in the same transaction.
 */

const actorOf = (u: SessionUser): Actor => ({ id: u.id, name: u.name, role: u.role });

/**
 * An assessment is stale once the set of connected accounts changes, because the
 * consolidated profile it was built from no longer describes the business.
 */
export async function isAssessmentStale(businessId: string, generatedAt: Date) {
  const [connectedCount, changedSince] = await Promise.all([
    prisma.bankConnection.count({ where: { businessId, status: "connected" } }),
    prisma.bankConnection.count({ where: { businessId, status: "connected", connectedAt: { gt: generatedAt } } }),
  ]);
  if (changedSince > 0) return true;
  const profile = await prisma.financialProfile.findFirst({ where: { businessId }, orderBy: { generatedAt: "desc" } });
  if (!profile) return true;
  const data = JSON.parse(profile.data) as { institutionsConnected?: number };
  return (data.institutionsConnected ?? 0) !== connectedCount;
}

export async function getOwnBusiness(user: SessionUser) {
  const row = await prisma.business.findUnique({ where: { organisationId: user.organisationId } });
  return row ? toBusiness(row) : null;
}

export interface BusinessInput {
  name: string;
  cacNumber: string;
  businessType: string;
  industry: string;
  location: string;
  yearsOperating: number;
  declaredMonthlyRevenue: number;
}

export function validateBusiness(d: BusinessInput) {
  const errors: Partial<Record<keyof BusinessInput, string>> = {};
  if (d.name.trim().length < 3) errors.name = "Enter the registered business name.";
  if (!/^(RC|BN)\s?\d{5,8}$/i.test(d.cacNumber.trim())) errors.cacNumber = "Enter a CAC number such as RC 1482930 or BN 2345678.";
  if (!d.businessType) errors.businessType = "Select a business type.";
  if (!d.industry) errors.industry = "Select an industry.";
  if (d.location.trim().length < 2) errors.location = "Enter the business location.";
  if (!(d.yearsOperating >= 0)) errors.yearsOperating = "Enter years operating.";
  if (!(d.declaredMonthlyRevenue > 0)) errors.declaredMonthlyRevenue = "Enter average monthly revenue.";
  return errors;
}

export async function saveBusiness(user: SessionUser, input: BusinessInput) {
  const errors = validateBusiness(input);
  if (Object.keys(errors).length) throw new ServiceError(Object.values(errors)[0]!);
  const data = {
    name: input.name.trim(),
    cacNumber: input.cacNumber.trim().toUpperCase().replace(/^(RC|BN)\s?/, "$1 "),
    cacStatus: "Active",
    businessType: input.businessType,
    industry: input.industry,
    location: input.location.trim(),
    yearsOperating: Math.round(input.yearsOperating),
    declaredMonthlyRevenue: Math.round(input.declaredMonthlyRevenue),
  };
  const row = await prisma.business.upsert({
    where: { organisationId: user.organisationId },
    create: { ...data, organisationId: user.organisationId },
    update: data,
  });
  await prisma.organisation.update({ where: { id: user.organisationId }, data: { name: data.name } });
  return toBusiness(row);
}

export async function verifyIdentity(user: SessionUser, bvn: string) {
  const business = await prisma.business.findUnique({ where: { organisationId: user.organisationId } });
  if (!business) throw new ServiceError("Complete business details first.");
  const result = await demoIdentityService.verifyBvn(bvn);
  if (!result.verified) return result;
  await prisma.$transaction(async (tx) => {
    await tx.business.update({ where: { id: business.id }, data: { identityVerified: true, identityVerifiedAt: new Date() } });
    await recordAudit(tx, { type: "IDENTITY_VERIFIED", actor: actorOf(user), businessId: business.id, resource: "Identity", metadata: { method: "BVN", provider: "demo" }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "identity_verified", title: "Identity verified", body: "Your identity was verified. You can now connect your business accounts.", href: "/sme/onboarding" });
  });
  return result;
}

/** Marks the connection as connecting, then completes it with the adapter result. */
export async function connectInstitution(user: SessionUser, institutionId: string, opts?: { simulateFailure?: boolean }) {
  const business = await prisma.business.findUnique({ where: { organisationId: user.organisationId } });
  if (!business) throw new ServiceError("Complete business details first.");
  if (!business.identityVerified) throw new ServiceError("Verify your identity before connecting accounts.");
  const institution = institutionById(institutionId);
  const conn = await prisma.bankConnection.upsert({
    where: { businessId_institutionId: { businessId: business.id, institutionId } },
    create: { businessId: business.id, institutionId, institutionName: institution.name, status: "connecting" },
    update: { status: "connecting", failureReason: null },
  });
  const seedKey = business.name.toLowerCase().includes("adebayo") ? "adebayo" : `biz_${business.id}`;
  const result = await demoBankConnectionService.connectBank({ businessId: business.id, institutionId, connectionId: conn.id, asOf: new Date(), seedKey, simulateFailure: opts?.simulateFailure });

  await prisma.$transaction(async (tx) => {
    if (!result.ok) {
      await tx.bankConnection.update({ where: { id: conn.id }, data: { status: "failed", failureReason: result.reason } });
      await recordAudit(tx, { type: "ACCOUNT_CONNECTION_FAILED", actor: actorOf(user), businessId: business.id, resource: `Connection — ${institution.name}`, metadata: { institution: institution.name }, customerVisible: true });
      return;
    }
    const now = new Date();
    const consent = await tx.consent.create({ data: { businessId: business.id, scope: JSON.stringify(["account_information", "transaction_history_12m", "balance"]), grantedAt: now, grantedByName: user.name, hash: sha256(`${business.id}|${institutionId}|${now.toISOString()}`) } });
    await tx.bankAccount.deleteMany({ where: { connectionId: conn.id } });
    await tx.bankConnection.update({ where: { id: conn.id }, data: { status: "connected", connectedAt: now, lastSyncedAt: now, consentId: consent.id, failureReason: null } });
    for (const a of result.accounts ?? []) {
      const acc = await tx.bankAccount.create({ data: { connectionId: conn.id, businessId: business.id, institutionId, institutionName: institution.name, accountNumberMasked: a.accountNumberMasked, accountType: a.accountType, balance: a.balance } });
      const txs = (result.transactions ?? []).filter((t) => t.accountId === a.id);
      await tx.transaction.createMany({ data: txs.map((t) => ({ accountId: acc.id, businessId: business.id, date: new Date(t.date), amount: Math.round(t.amount), category: t.category, counterparty: t.counterparty, narration: t.narration })) });
    }
    await recordAudit(tx, { type: "CONSENT_RECORDED", actor: actorOf(user), businessId: business.id, resource: `Open Banking consent — ${institution.name}`, metadata: { scopes: 3, consentHash: consent.hash.slice(0, 16) }, customerVisible: true });
    await recordAudit(tx, { type: "ACCOUNT_CONNECTED", actor: actorOf(user), businessId: business.id, resource: `Connection — ${institution.name}`, metadata: { institution: institution.name, accounts: result.accounts?.length ?? 0 }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "account_connected", title: "Account connected", body: `${institution.name} account ${result.accounts?.[0]?.accountNumberMasked ?? ""} is now connected.`, href: "/sme/accounts" });
  });
  return result.ok;
}

export async function disconnectInstitution(user: SessionUser, connectionId: string) {
  const conn = await prisma.bankConnection.findUnique({ where: { id: connectionId }, include: { business: true, accounts: true } });
  if (!conn || conn.business.organisationId !== user.organisationId) throw new ServiceError("Connection not found", 404);

  // A live facility depends on its connected accounts for collection, so the last
  // connection and the designated account cannot be removed while one is running.
  const livePlan = await prisma.repaymentPlan.findFirst({ where: { businessId: conn.businessId, health: { not: "completed" } } });
  if (livePlan) {
    const remaining = await prisma.bankConnection.count({ where: { businessId: conn.businessId, status: "connected", id: { not: connectionId } } });
    if (remaining === 0) throw new ServiceError("At least one connected account must remain while a facility is being repaid.");
    if (conn.accounts.some((a) => a.id === conn.business.disbursementAccountId)) {
      throw new ServiceError("This account carries the repayment mandate. Designate another account first.");
    }
  }

  await demoBankConnectionService.disconnectBank(connectionId);
  await prisma.$transaction(async (tx) => {
    if (conn.accounts.some((a) => a.id === conn.business.disbursementAccountId)) {
      await tx.business.update({ where: { id: conn.businessId }, data: { disbursementAccountId: null } });
    }
    await tx.bankConnection.delete({ where: { id: connectionId } });
    await recordAudit(tx, { type: "CONSENT_RECORDED", actor: actorOf(user), businessId: conn.businessId, resource: `Consent withdrawn — ${conn.institutionName}`, metadata: { institution: conn.institutionName, action: "disconnected" }, customerVisible: true });
  });
}

/**
 * Designates the account that receives disbursement and carries the repayment mandate.
 * Locked once a facility is live, because the mandate is held against that account.
 */
export async function setDisbursementAccount(user: SessionUser, accountId: string) {
  const account = await prisma.bankAccount.findUnique({ where: { id: accountId }, include: { business: true, connection: true } });
  if (!account || account.business.organisationId !== user.organisationId) throw new ServiceError("Account not found", 404);
  if (account.connection.status !== "connected") throw new ServiceError("Connect this account before designating it.");
  const livePlan = await prisma.repaymentPlan.findFirst({ where: { businessId: account.businessId, health: { not: "completed" } } });
  if (livePlan) throw new ServiceError("The repayment mandate is held against the current account while a facility is live. Contact the bank to change it.");
  await prisma.$transaction(async (tx) => {
    await tx.business.update({ where: { id: account.businessId }, data: { disbursementAccountId: accountId } });
    await recordAudit(tx, { type: "CONSENT_RECORDED", actor: actorOf(user), businessId: account.businessId, resource: "Disbursement account designated", metadata: { institution: account.institutionName, account: account.accountNumberMasked }, customerVisible: true });
  });
}

/** Resolves the account a disbursement should pay into: the designated one, else the largest. */
export async function resolveDisbursementAccount(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business?.disbursementAccountId) {
    const designated = await prisma.bankAccount.findUnique({ where: { id: business.disbursementAccountId }, include: { connection: true } });
    if (designated && designated.connection.status === "connected") return designated;
  }
  return prisma.bankAccount.findFirst({ where: { businessId, connection: { status: "connected" } }, orderBy: { balance: "desc" }, include: { connection: true } });
}

/** Records an early or manual payment of a scheduled instalment, initiated by the business. */
export async function payInstalment(user: SessionUser, repaymentId: string) {
  const rep = await prisma.repayment.findUnique({ where: { id: repaymentId }, include: { plan: { include: { business: true } } } });
  if (!rep || rep.plan.business.organisationId !== user.organisationId) throw new ServiceError("Instalment not found", 404);
  if (rep.status === "paid") throw new ServiceError("This instalment is already paid.");
  if (rep.status === "processing") throw new ServiceError("This instalment is already being processed.");
  const { processRepayment } = await import("./bank");
  return processRepayment(user, repaymentId);
}

/** Records the applicant supplying one requested document. */
export async function provideDocument(user: SessionUser, documentId: string, note: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { business: true, application: true } });
  if (!doc || doc.business.organisationId !== user.organisationId) throw new ServiceError("Document not found", 404);
  if (doc.status !== "requested") throw new ServiceError("This document has already been provided.");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.document.update({ where: { id: documentId }, data: { status: "provided", providedAt: now, note: note.trim() || null } });
    await recordAudit(tx, { type: "INFORMATION_PROVIDED", actor: actorOf(user), businessId: doc.businessId, applicationId: doc.applicationId, applicationRef: doc.application?.reference, resource: doc.type, metadata: { document: doc.type }, customerVisible: true });
    // The application returns to review only when nothing further is outstanding.
    if (doc.applicationId) {
      const outstanding = await tx.document.count({ where: { applicationId: doc.applicationId, status: "requested" } });
      if (outstanding === 0) {
        const app = await tx.loanApplication.findUnique({ where: { id: doc.applicationId } });
        const req = app?.informationRequest ? JSON.parse(app.informationRequest) : null;
        await tx.loanApplication.update({
          where: { id: doc.applicationId },
          data: { status: "under_review", informationRequest: req ? JSON.stringify({ ...req, respondedAt: now.toISOString() }) : null },
        });
        await notify(tx, { audience: "bank", type: "information_provided", title: "Information provided", body: `${doc.application?.reference}: all requested documents have been provided.`, href: `/bank/applications/${doc.applicationId}` });
      }
    }
  });
}

export async function refreshConnection(user: SessionUser, connectionId: string) {
  const conn = await prisma.bankConnection.findUnique({ where: { id: connectionId }, include: { business: true } });
  if (!conn || conn.business.organisationId !== user.organisationId) throw new ServiceError("Connection not found", 404);
  const r = await demoBankConnectionService.refreshConnection(connectionId);
  await prisma.bankConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: new Date(r.syncedAt) } });
}

/** Runs analysis and assessment over all connected accounts and persists both. */
export async function runAnalysis(user: SessionUser) {
  const business = await prisma.business.findUnique({ where: { organisationId: user.organisationId }, include: { accounts: true, transactions: true, connections: true } });
  if (!business) throw new ServiceError("Complete business details first.");
  const connected = business.connections.filter((c) => c.status === "connected").length;
  if (connected === 0) throw new ServiceError("Connect at least one account before running the analysis.");
  const policy = await getPolicy();
  const profile = buildFinancialProfile({ businessId: business.id, transactions: toTransactionRows(business.transactions), accounts: business.accounts.map(toAccount), asOf: new Date(), institutionsConnected: connected });
  const assessment = assessCredit(profile, policy);
  const saved = await prisma.$transaction(async (tx) => {
    const p = await tx.financialProfile.create({ data: { businessId: business.id, generatedAt: new Date(profile.generatedAt), data: JSON.stringify(profile) } });
    const a = await tx.creditAssessment.create({
      data: { businessId: business.id, profileId: p.id, generatedAt: new Date(), modelVersion: assessment.modelVersion, policyVersion: policy.version, score: assessment.score, band: assessment.band, eligibleAmount: assessment.eligibleAmount, recommendedAmount: assessment.recommendedAmount, data: JSON.stringify(assessment) },
    });
    await recordAudit(tx, { type: "FINANCIAL_PROFILE_GENERATED", actor: SYSTEM_ACTOR, businessId: business.id, resource: "Financial profile", metadata: { coverageMonths: profile.coverageMonths, institutions: connected }, customerVisible: true });
    await recordAudit(tx, { type: "ASSESSMENT_CREATED", actor: SYSTEM_ACTOR, businessId: business.id, resource: "Credit assessment", metadata: { score: assessment.score, modelVersion: assessment.modelVersion, policyVersion: policy.version }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "analysis_completed", title: "Financial analysis completed", body: `Your financial profile and credit assessment are ready. Eligible amount: ${formatNaira(assessment.eligibleAmount)}.`, href: "/sme/credit-profile" });
    return a;
  });
  return toAssessment(saved);
}

export async function submitApplication(user: SessionUser, input: { amount: number; purpose: LoanPurpose; tenorMonths: number }) {
  const business = await prisma.business.findUnique({ where: { organisationId: user.organisationId } });
  if (!business) throw new ServiceError("Complete onboarding first.");
  const assessmentRow = await prisma.creditAssessment.findFirst({ where: { businessId: business.id }, orderBy: { generatedAt: "desc" } });
  if (!assessmentRow) throw new ServiceError("Run the financial analysis before applying.");
  const assessment = toAssessment(assessmentRow);
  const policy = await getPolicy();
  const active = await prisma.loanApplication.findFirst({ where: { businessId: business.id, status: { not: "rejected" } } });
  if (active) throw new ServiceError("An application is already in progress.");
  if (await isAssessmentStale(business.id, assessmentRow.generatedAt)) {
    throw new ServiceError("Your connected accounts changed after this assessment. Re-run the analysis before applying.");
  }
  if (!(input.amount >= policy.minLoanAmount)) throw new ServiceError(`Minimum amount is ${formatNaira(policy.minLoanAmount)}.`);
  if (input.amount > assessment.eligibleAmount) throw new ServiceError("Amount exceeds your eligibility.");
  if (!policy.allowedTenors.includes(input.tenorMonths)) throw new ServiceError("Tenor not permitted by policy.");

  const offer = priceLoan({ principal: input.amount, tenorMonths: input.tenorMonths, policy, businessId: business.id, repaymentWindow: assessment.repaymentWindow, recommendedRepaymentDay: assessment.recommendedRepaymentDay });
  const app = await prisma.$transaction(async (tx) => {
    const seq = await nextCounter(tx, "application", 461);
    const reference = applicationReference(new Date().getFullYear(), seq);
    const now = new Date();
    const consent = await tx.consent.create({ data: { businessId: business.id, scope: JSON.stringify(["financial_data_access", "account_connection", "repayment_authorisation", "terms"]), grantedAt: now, grantedByName: user.name, hash: sha256(`${business.id}|${reference}|${now.toISOString()}`) } });
    const offerRow = await tx.loanOffer.create({
      data: { businessId: business.id, principal: offer.principal, tenorMonths: offer.tenorMonths, annualInterestRate: offer.annualInterestRate, interestMethod: offer.interestMethod, interestAmount: offer.interestAmount, feeRate: offer.feeRate, feeAmount: offer.feeAmount, totalRepayable: offer.totalRepayable, instalmentAmount: offer.instalmentAmount, windowStart: offer.repaymentWindow.start, windowEnd: offer.repaymentWindow.end, recommendedRepaymentDay: offer.recommendedRepaymentDay, policyVersion: policy.version },
    });
    const a = await tx.loanApplication.create({
      data: { reference, businessId: business.id, assessmentId: assessment.id, offerId: offerRow.id, consentId: consent.id, amount: input.amount, purpose: input.purpose, tenorMonths: input.tenorMonths, status: "submitted", submittedAt: now },
    });
    await tx.consent.update({ where: { id: consent.id }, data: { applicationId: a.id } });
    await recordAudit(tx, { type: "CONSENT_RECORDED", actor: actorOf(user), businessId: business.id, applicationId: a.id, applicationRef: reference, resource: "Consent", metadata: { scopes: 4, consentHash: consent.hash.slice(0, 16) }, customerVisible: true });
    await recordAudit(tx, { type: "APPLICATION_SUBMITTED", actor: actorOf(user), businessId: business.id, applicationId: a.id, applicationRef: reference, resource: "Application", metadata: { amount: input.amount, tenorMonths: input.tenorMonths, totalRepayable: offer.totalRepayable }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "application_submitted", title: "Application submitted", body: `${reference} for ${formatNaira(input.amount)} is under review.`, href: `/sme/application/${a.id}` });
    await notify(tx, { audience: "bank", type: "application_submitted", title: "New application", body: `${business.name} submitted ${reference} for ${formatNaira(input.amount)}.`, href: `/bank/applications/${a.id}` });
    return a;
  });
  return toApplication(app);
}

export async function provideInformation(user: SessionUser, applicationId: string) {
  const app = await prisma.loanApplication.findUnique({ where: { id: applicationId }, include: { business: true } });
  if (!app || app.business.organisationId !== user.organisationId) throw new ServiceError("Application not found", 404);
  const req = toApplication(app).informationRequest;
  if (!req || req.respondedAt) return;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({ where: { id: app.id }, data: { status: "under_review", informationRequest: JSON.stringify({ ...req, respondedAt: now.toISOString() }) } });
    await tx.document.updateMany({ where: { applicationId: app.id, status: "requested" }, data: { status: "provided", providedAt: now } });
    await recordAudit(tx, { type: "INFORMATION_PROVIDED", actor: actorOf(user), businessId: app.businessId, applicationId: app.id, applicationRef: app.reference, resource: "Application", metadata: { items: req.items.length }, customerVisible: true });
    await notify(tx, { audience: "bank", type: "information_provided", title: "Information provided", body: `${app.reference}: requested documents have been provided.`, href: `/bank/applications/${app.id}` });
  });
}

export async function reportAccess(user: SessionUser, applicationId: string) {
  const app = await prisma.loanApplication.findUnique({ where: { id: applicationId }, include: { business: true } });
  if (!app || app.business.organisationId !== user.organisationId) throw new ServiceError("Application not found", 404);
  const { openCase } = await import("./risk");
  return prisma.$transaction((tx) =>
    openCase(tx, { businessId: app.businessId, businessName: app.business.name, applicationId: app.id, applicationRef: app.reference, type: "access_dispute", severity: "Medium", trigger: "Customer reported unusual access", description: "The applicant flagged access to their financial profile as unexpected. Compliance review required.", owner: "Compliance", actor: actorOf(user), customerVisible: true }),
  );
}
