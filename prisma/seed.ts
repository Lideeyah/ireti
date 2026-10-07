/**
 * Seeds the database with the demo bank, its staff, the demo SME account, the lending policy,
 * and the populated application queue. Run with `npm run db:seed`; `npm run db:reset` wipes first.
 *
 * Demo credentials are published in docs/demo-script.md. They are for the demo environment only.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildSeed, USERS, ORGS } from "../src/lib/seed/demoData";
import { DEFAULT_POLICY } from "../src/lib/policy/defaultPolicy";

const prisma = new PrismaClient();
export const DEMO_PASSWORD = "ireti-demo-2026";

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Organisations and users (bank staff + the demo SME owner, whose business is not yet onboarded)
  for (const org of ORGS) {
    await prisma.organisation.upsert({ where: { id: org.id }, create: org, update: { name: org.name } });
  }
  for (const u of USERS) {
    await prisma.user.upsert({ where: { email: u.email }, create: { id: u.id, email: u.email, passwordHash: hash, name: u.name, role: u.role, title: u.title, organisationId: u.organisationId }, update: { name: u.name, role: u.role, title: u.title } });
  }

  await prisma.bankPolicy.upsert({ where: { id: 1 }, create: { id: 1, version: DEFAULT_POLICY.version, data: JSON.stringify(DEFAULT_POLICY), updatedAt: new Date(DEFAULT_POLICY.updatedAt), updatedByName: DEFAULT_POLICY.updatedByName }, update: {} });

  const existing = await prisma.loanApplication.count();
  if (existing > 0) {
    console.log("Queue already seeded; skipping application data.");
    return;
  }

  const seed = buildSeed(DEFAULT_POLICY);
  const d = (s: string) => new Date(s);

  for (const b of seed.businesses) {
    await prisma.organisation.create({ data: { id: b.organisationId, name: b.name, type: "sme" } });
    await prisma.business.create({ data: { id: b.id, organisationId: b.organisationId, name: b.name, cacNumber: b.cacNumber, cacStatus: b.cacStatus, businessType: b.businessType, industry: b.industry, location: b.location, yearsOperating: b.yearsOperating, declaredMonthlyRevenue: b.declaredMonthlyRevenue, identityVerified: true, identityVerifiedAt: b.identityVerifiedAt ? d(b.identityVerifiedAt) : null, createdAt: d(b.createdAt) } });
  }
  for (const c of seed.consents) await prisma.consent.create({ data: { id: c.id, businessId: c.businessId, applicationId: null, scope: JSON.stringify(c.scope), grantedAt: d(c.grantedAt), grantedByName: c.grantedByName, hash: c.hash } });
  for (const c of seed.connections) await prisma.bankConnection.create({ data: { id: c.id, businessId: c.businessId, institutionId: c.institutionId, institutionName: c.institutionName, status: c.status, connectedAt: c.connectedAt ? d(c.connectedAt) : null, lastSyncedAt: c.lastSyncedAt ? d(c.lastSyncedAt) : null, consentId: c.consentId } });
  for (const a of seed.accounts) await prisma.bankAccount.create({ data: { id: a.id, connectionId: a.connectionId, businessId: a.businessId, institutionId: a.institutionId, institutionName: a.institutionName, accountNumberMasked: a.accountNumberMasked, accountType: a.accountType, balance: a.balance } });
  for (const p of seed.profiles) await prisma.financialProfile.create({ data: { id: p.id, businessId: p.businessId, generatedAt: d(p.generatedAt), data: JSON.stringify(p) } });
  for (const a of seed.assessments) await prisma.creditAssessment.create({ data: { id: a.id, businessId: a.businessId, profileId: a.profileId, generatedAt: d(a.generatedAt), modelVersion: a.modelVersion, policyVersion: a.policyVersion, score: a.score, band: a.band, eligibleAmount: a.eligibleAmount, recommendedAmount: a.recommendedAmount, data: JSON.stringify(a) } });
  for (const o of seed.offers) await prisma.loanOffer.create({ data: { id: o.id, businessId: o.businessId, principal: o.principal, tenorMonths: o.tenorMonths, annualInterestRate: o.annualInterestRate, interestMethod: o.interestMethod, interestAmount: o.interestAmount, feeRate: o.feeRate, feeAmount: o.feeAmount, totalRepayable: o.totalRepayable, instalmentAmount: o.instalmentAmount, windowStart: o.repaymentWindow.start, windowEnd: o.repaymentWindow.end, recommendedRepaymentDay: o.recommendedRepaymentDay, policyVersion: o.policyVersion, createdAt: d(o.createdAt) } });
  for (const a of seed.applications) {
    await prisma.loanApplication.create({ data: { id: a.id, reference: a.reference, businessId: a.businessId, assessmentId: a.assessmentId, offerId: a.offerId, consentId: a.consentId, amount: a.amount, purpose: a.purpose, tenorMonths: a.tenorMonths, status: a.status, submittedAt: d(a.submittedAt), reviewerId: a.reviewerId, reviewerName: a.reviewerName, firstReviewedAt: a.firstReviewedAt ? d(a.firstReviewedAt) : null, decision: a.decision ? JSON.stringify(a.decision) : null, informationRequest: a.informationRequest ? JSON.stringify(a.informationRequest) : null, disbursement: a.disbursement ? JSON.stringify(a.disbursement) : null } });
    await prisma.consent.update({ where: { id: a.consentId }, data: { applicationId: a.id } });
  }
  for (const p of seed.plans) await prisma.repaymentPlan.create({ data: { id: p.id, applicationId: p.applicationId, businessId: p.businessId, offerId: p.offerId, mandateReference: p.mandateReference, principal: p.principal, totalRepayable: p.totalRepayable, outstanding: p.outstanding, paidToDate: p.paidToDate, health: p.health, startedAt: d(p.startedAt) } });
  for (const r of seed.repayments) await prisma.repayment.create({ data: { id: r.id, planId: r.planId, businessId: r.businessId, sequence: r.sequence, dueDate: d(r.dueDate), windowStart: d(r.windowStart), windowEnd: d(r.windowEnd), amount: r.amount, principalPortion: r.principalPortion, interestPortion: r.interestPortion, status: r.status, attempts: r.attempts, paidAt: r.paidAt ? d(r.paidAt) : null, failureReason: r.failureReason, reference: r.reference } });
  for (const e of seed.riskEvents) await prisma.riskEvent.create({ data: { id: e.id, businessId: e.businessId, applicationId: e.applicationId, type: e.type, severity: e.severity, description: e.description, createdAt: d(e.createdAt) } });
  for (const c of seed.cases) await prisma.case.create({ data: { id: c.id, reference: c.reference, riskEventId: c.riskEventId, businessId: c.businessId, applicationId: c.applicationId, severity: c.severity, trigger: c.trigger, owner: c.owner, assigneeName: c.assigneeName, status: c.status, notes: JSON.stringify(c.notes), history: JSON.stringify(c.history), createdAt: d(c.createdAt) } });
  for (const e of seed.auditEvents) await prisma.auditEvent.create({ data: { seq: e.seq, id: e.id, timestamp: d(e.timestamp), type: e.type, actorId: e.actorId, actorName: e.actorName, actorRole: e.actorRole, businessId: e.businessId, applicationId: e.applicationId, applicationRef: e.applicationRef, resource: e.resource, metadata: JSON.stringify(e.metadata), payloadHash: e.payloadHash, previousHash: e.previousHash, hash: e.hash, customerVisible: e.customerVisible } });
  for (const n of seed.notifications) await prisma.notification.create({ data: { id: n.id, audience: n.audience, type: n.type, title: n.title, body: n.body, href: n.href, read: n.read, createdAt: d(n.createdAt) } });
  await prisma.counter.upsert({ where: { name: "application" }, create: { name: "application", value: seed.applicationSequence }, update: { value: seed.applicationSequence } });
  await prisma.counter.upsert({ where: { name: "case" }, create: { name: "case", value: seed.caseSequence }, update: { value: seed.caseSequence } });

  console.log(`Seeded ${seed.businesses.length} businesses, ${seed.applications.length} applications, ${seed.auditEvents.length} audit events.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
