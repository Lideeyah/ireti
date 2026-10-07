import "server-only";
import { execFileSync } from "child_process";
import { prisma, isDemoMode } from "./db";
import { ServiceError, SYSTEM_ACTOR, recordAudit, notify, getPolicy } from "./core";
import type { SessionUser } from "./auth";
import { ADEBAYO_PREFILL, USERS } from "@/lib/seed/demoData";
import { institutionById } from "@/lib/seed/institutions";
import { generateInstitutionData } from "@/lib/seed/transactions";
import { buildFinancialProfile } from "@/lib/analysis/financialAnalysis";
import { assessCredit } from "@/lib/assessment/engine";
import { sha256 } from "@/lib/util/sha256";
import { submitApplication } from "./sme";
import { toAccount, toTransactionRows } from "./serializers";

/** Demo-only utilities. Disabled unless DEMO_MODE=true. */
export function assertDemo() {
  if (!isDemoMode()) throw new ServiceError("Demo controls are disabled in this environment.", 403);
}

export const DEMO_ACCOUNTS = USERS.map((u) => ({ email: u.email, name: u.name, role: u.role, title: u.title }));

/** Wipes and reseeds the database. */
export async function resetDemo() {
  assertDemo();
  await prisma.$disconnect();
  execFileSync("npx", ["prisma", "db", "push", "--force-reset", "--skip-generate"], { stdio: "ignore" });
  execFileSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "ignore" });
}

/** Fast-forwards the demo SME to a submitted application through the real services. */
export async function loadSampleApplication(user: SessionUser) {
  assertDemo();
  const org = await prisma.organisation.findUnique({ where: { id: user.organisationId } });
  if (!org) throw new ServiceError("Organisation not found", 404);
  const existing = await prisma.loanApplication.findFirst({ where: { business: { organisationId: org.id }, status: { not: "rejected" } } });
  if (existing) throw new ServiceError("An application already exists for this business.");
  const actor = { id: user.id, name: user.name, role: user.role };
  const now = new Date();
  const business = await prisma.business.upsert({
    where: { organisationId: org.id },
    create: { organisationId: org.id, name: ADEBAYO_PREFILL.name, cacNumber: ADEBAYO_PREFILL.cacNumber, cacStatus: "Active", businessType: ADEBAYO_PREFILL.businessType, industry: ADEBAYO_PREFILL.industry, location: ADEBAYO_PREFILL.location, yearsOperating: ADEBAYO_PREFILL.yearsOperating, declaredMonthlyRevenue: ADEBAYO_PREFILL.declaredMonthlyRevenue, identityVerified: true, identityVerifiedAt: now },
    update: { identityVerified: true, identityVerifiedAt: now },
  });
  await prisma.organisation.update({ where: { id: org.id }, data: { name: business.name } });
  await prisma.$transaction(async (tx) => {
    await recordAudit(tx, { type: "IDENTITY_VERIFIED", actor, businessId: business.id, resource: "Identity", metadata: { method: "BVN", provider: "demo" }, customerVisible: true });
  });
  for (const inst of ["sterling", "firstbank", "uba"]) {
    const institution = institutionById(inst);
    await prisma.$transaction(async (tx) => {
      await tx.bankConnection.deleteMany({ where: { businessId: business.id, institutionId: inst } });
      const conn = await tx.bankConnection.create({ data: { businessId: business.id, institutionId: inst, institutionName: institution.name, status: "connected", connectedAt: now, lastSyncedAt: now } });
      const data = generateInstitutionData({ businessId: business.id, institution, connectionId: conn.id, asOf: now, seedKey: "adebayo" });
      const consent = await tx.consent.create({ data: { businessId: business.id, scope: JSON.stringify(["account_information", "transaction_history_12m", "balance"]), grantedAt: now, grantedByName: user.name, hash: sha256(`${business.id}|${inst}|${now.toISOString()}`) } });
      await tx.bankConnection.update({ where: { id: conn.id }, data: { consentId: consent.id } });
      for (const a of data.accounts) {
        const acc = await tx.bankAccount.create({ data: { connectionId: conn.id, businessId: business.id, institutionId: inst, institutionName: institution.name, accountNumberMasked: a.accountNumberMasked, accountType: a.accountType, balance: a.balance } });
        await tx.transaction.createMany({ data: data.transactions.filter((t) => t.accountId === a.id).map((t) => ({ accountId: acc.id, businessId: business.id, date: new Date(t.date), amount: Math.round(t.amount), category: t.category, counterparty: t.counterparty, narration: t.narration })) });
      }
      await recordAudit(tx, { type: "CONSENT_RECORDED", actor, businessId: business.id, resource: `Open Banking consent — ${institution.name}`, metadata: { scopes: 3, consentHash: consent.hash.slice(0, 16) }, customerVisible: true });
      await recordAudit(tx, { type: "ACCOUNT_CONNECTED", actor, businessId: business.id, resource: `Connection — ${institution.name}`, metadata: { institution: institution.name, accounts: data.accounts.length }, customerVisible: true });
    });
  }
  const full = await prisma.business.findUniqueOrThrow({ where: { id: business.id }, include: { accounts: true, transactions: true } });
  const policy = await getPolicy();
  const profile = buildFinancialProfile({ businessId: business.id, transactions: toTransactionRows(full.transactions), accounts: full.accounts.map(toAccount), asOf: now, institutionsConnected: 3 });
  const assessment = assessCredit(profile, policy);
  await prisma.$transaction(async (tx) => {
    const p = await tx.financialProfile.create({ data: { businessId: business.id, generatedAt: now, data: JSON.stringify(profile) } });
    await tx.creditAssessment.create({ data: { businessId: business.id, profileId: p.id, generatedAt: now, modelVersion: assessment.modelVersion, policyVersion: policy.version, score: assessment.score, band: assessment.band, eligibleAmount: assessment.eligibleAmount, recommendedAmount: assessment.recommendedAmount, data: JSON.stringify(assessment) } });
    await recordAudit(tx, { type: "FINANCIAL_PROFILE_GENERATED", actor: SYSTEM_ACTOR, businessId: business.id, resource: "Financial profile", metadata: { coverageMonths: profile.coverageMonths, institutions: 3 }, customerVisible: true });
    await recordAudit(tx, { type: "ASSESSMENT_CREATED", actor: SYSTEM_ACTOR, businessId: business.id, resource: "Credit assessment", metadata: { score: assessment.score, modelVersion: assessment.modelVersion, policyVersion: policy.version }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "analysis_completed", title: "Financial analysis completed", body: "Your financial profile and credit assessment are ready.", href: "/sme/credit-profile" });
  });
  return submitApplication(user, { amount: assessment.recommendedAmount, purpose: "Working capital", tenorMonths: assessment.recommendedTenorMonths });
}
