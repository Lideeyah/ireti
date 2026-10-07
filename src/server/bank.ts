import "server-only";
import type { BankPolicy, DisbursementRecord } from "@/lib/domain/types";
import { buildSchedule } from "@/lib/loan/pricing";
import { demoDisbursementService } from "@/lib/services/disbursement";
import { demoRepaymentService } from "@/lib/services/repayment";
import { formatDate, formatNaira } from "@/lib/format";
import { prisma } from "./db";
import { delay, getPolicy, notify, recordAudit, ServiceError, SYSTEM_ACTOR, type Actor } from "./core";
import { toApplication, toOffer } from "./serializers";
import { openCase } from "./risk";
import type { SessionUser } from "./auth";

const actorOf = (u: SessionUser): Actor => ({ id: u.id, name: u.name, role: u.role });

async function loadApp(id: string) {
  const row = await prisma.loanApplication.findUnique({ where: { id }, include: { business: true, offer: true } });
  if (!row) throw new ServiceError("Application not found", 404);
  return { row, app: toApplication(row), offer: toOffer(row.offer), business: row.business };
}

/** Recorded when a reviewer opens an application. Moves new applications to review and logs access (deduplicated per 15 min). */
export async function openApplicationForReview(user: SessionUser, applicationId: string) {
  const { row, app } = await loadApp(applicationId);
  const actor = actorOf(user);
  const since = new Date(Date.now() - 15 * 60_000);
  const recent = await prisma.auditEvent.findFirst({ where: { type: "DATA_ACCESS", actorId: user.id, applicationId, timestamp: { gte: since } } });
  if (app.status !== "submitted" && recent) return;
  await prisma.$transaction(async (tx) => {
    if (app.status === "submitted") {
      await tx.loanApplication.update({ where: { id: applicationId }, data: { status: "under_review", reviewerId: user.id, reviewerName: user.name, firstReviewedAt: new Date() } });
      await recordAudit(tx, { type: "APPLICATION_REVIEW_STARTED", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Application", customerVisible: true });
      await notify(tx, { audience: "sme", businessId: app.businessId, type: "application_viewed", title: "Application under review", body: `${app.reference} is being reviewed by the bank.`, href: `/sme/application/${applicationId}` });
    }
    if (!recent) {
      await recordAudit(tx, { type: "DATA_ACCESS", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Financial profile", metadata: { view: "bank_review", business: row.business.name }, customerVisible: true });
    }
  });
}

export async function requestInformation(user: SessionUser, applicationId: string, items: string[], message?: string) {
  if (items.length === 0) throw new ServiceError("Select at least one item.");
  const { app, business } = await loadApp(applicationId);
  if (!["submitted", "under_review", "additional_information"].includes(app.status)) throw new ServiceError("This application is no longer under review.");
  const now = new Date().toISOString();
  await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({ where: { id: applicationId }, data: { status: "additional_information", informationRequest: JSON.stringify({ items, message, requestedAt: now, requestedById: user.id, requestedByName: user.name }) } });
    await tx.document.createMany({ data: items.map((item) => ({ businessId: business.id, applicationId, type: item, name: item, status: "requested" })) });
    await recordAudit(tx, { type: "INFORMATION_REQUESTED", actor: actorOf(user), businessId: business.id, applicationId, applicationRef: app.reference, resource: "Application", metadata: { items: items.length }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "information_requested", title: "Additional information requested", body: `The bank has requested: ${items.join(", ")}.`, href: `/sme/application/${applicationId}` });
  });
}

/** Approval is submitted to the (demo) banking system, then the application moves to disbursement preparation. */
export async function approveApplication(user: SessionUser, applicationId: string) {
  const { app, offer, business } = await loadApp(applicationId);
  if (!["submitted", "under_review", "additional_information"].includes(app.status)) throw new ServiceError("This application cannot be approved from its current state.");
  await delay(1600);
  const primary = await prisma.bankAccount.findFirst({ where: { businessId: business.id }, orderBy: { balance: "desc" } });
  if (!primary) throw new ServiceError("The applicant has no connected account to disburse to.");
  const disbursement: DisbursementRecord = { status: "pending", destinationAccountId: primary.id, destinationMasked: primary.accountNumberMasked, institutionName: primary.institutionName, attempts: 0 };
  await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({ where: { id: applicationId }, data: { status: "disbursement_pending", decision: JSON.stringify({ outcome: "approved", byId: user.id, byName: user.name, at: new Date().toISOString() }), disbursement: JSON.stringify(disbursement) } });
    await recordAudit(tx, { type: "APPLICATION_APPROVED", actor: actorOf(user), businessId: business.id, applicationId, applicationRef: app.reference, resource: "Application", metadata: { amount: app.amount, tenorMonths: app.tenorMonths, totalRepayable: offer.totalRepayable }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "application_approved", title: "Application approved", body: `${app.reference} for ${formatNaira(app.amount)} has been approved. Disbursement is being prepared.`, href: `/sme/application/${applicationId}` });
  });
}

export async function rejectApplication(user: SessionUser, applicationId: string, note: string) {
  if (note.trim().length < 10) throw new ServiceError("State the basis for the decision (at least 10 characters).");
  const { app, business } = await loadApp(applicationId);
  if (!["submitted", "under_review", "additional_information"].includes(app.status)) throw new ServiceError("This application cannot be rejected from its current state.");
  await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({ where: { id: applicationId }, data: { status: "rejected", decision: JSON.stringify({ outcome: "rejected", byId: user.id, byName: user.name, at: new Date().toISOString(), note: note.trim() }) } });
    await recordAudit(tx, { type: "APPLICATION_REJECTED", actor: actorOf(user), businessId: business.id, applicationId, applicationRef: app.reference, resource: "Application", metadata: { reasonLength: note.trim().length }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "application_rejected", title: "Application not approved", body: `${app.reference} was not approved. ${note.trim()}`, href: `/sme/application/${applicationId}` });
  });
}

/** Disbursement only becomes `disbursed` when the adapter returns a confirmed response. */
export async function initiateDisbursement(user: SessionUser, applicationId: string, force?: "success" | "failure"): Promise<"confirmed" | "failed"> {
  const { app, offer, business } = await loadApp(applicationId);
  if (!app.disbursement || !["disbursement_pending", "disbursement_failed", "approved"].includes(app.status)) throw new ServiceError("This application is not awaiting disbursement.");
  if (app.disbursement.status === "processing") throw new ServiceError("A disbursement attempt is already in progress.");
  const attempt = app.disbursement.attempts + 1;
  const processing: DisbursementRecord = { ...app.disbursement, status: "processing", attempts: attempt, lastAttemptAt: new Date().toISOString() };
  await prisma.$transaction(async (tx) => {
    await tx.loanApplication.update({ where: { id: applicationId }, data: { status: "disbursement_pending", disbursement: JSON.stringify(processing) } });
    await recordAudit(tx, { type: "DISBURSEMENT_INITIATED", actor: actorOf(user), businessId: business.id, applicationId, applicationRef: app.reference, resource: "Disbursement", metadata: { amount: app.amount, destination: processing.destinationMasked, attempt }, customerVisible: true });
  });

  const outcome = await demoDisbursementService.initiateDisbursement({ applicationRef: app.reference, amount: app.amount, destinationAccountId: processing.destinationAccountId, forceOutcome: force });
  if (outcome.status === "failed") {
    await prisma.$transaction(async (tx) => {
      await tx.loanApplication.update({ where: { id: applicationId }, data: { status: "disbursement_failed", disbursement: JSON.stringify({ ...processing, status: "failed", failureReason: outcome.reason }) } });
      await recordAudit(tx, { type: "DISBURSEMENT_FAILED", actor: SYSTEM_ACTOR, businessId: business.id, applicationId, applicationRef: app.reference, resource: "Disbursement", metadata: { amount: app.amount, reason: outcome.reason }, customerVisible: true });
      await notify(tx, { audience: "bank", type: "disbursement_failed", title: "Disbursement failed", body: `${app.reference}: ${outcome.reason}`, href: `/bank/applications/${applicationId}` });
    });
    return "failed";
  }
  const mandate = await demoRepaymentService.createMandate({ businessId: business.id, accountId: processing.destinationAccountId, amount: app.amount });
  const policy = await getPolicy();
  await prisma.$transaction(async (tx) => {
    const plan = await tx.repaymentPlan.create({ data: { applicationId, businessId: business.id, offerId: offer.id, mandateReference: mandate.mandateReference, principal: app.amount, totalRepayable: offer.totalRepayable, outstanding: offer.totalRepayable, paidToDate: 0, health: "healthy", startedAt: new Date(outcome.at) } });
    const schedule = buildSchedule({ offer, policy, disbursedAt: new Date(outcome.at), planId: plan.id, businessId: business.id });
    await tx.repayment.createMany({ data: schedule.map((r) => ({ planId: plan.id, businessId: business.id, sequence: r.sequence, dueDate: new Date(r.dueDate), windowStart: new Date(r.windowStart), windowEnd: new Date(r.windowEnd), amount: r.amount, principalPortion: r.principalPortion, interestPortion: r.interestPortion, status: "scheduled" })) });
    await tx.loanApplication.update({ where: { id: applicationId }, data: { status: "disbursed", disbursement: JSON.stringify({ ...processing, status: "confirmed", reference: outcome.reference, confirmedAt: outcome.at }) } });
    await recordAudit(tx, { type: "DISBURSEMENT_CONFIRMED", actor: SYSTEM_ACTOR, businessId: business.id, applicationId, applicationRef: app.reference, resource: "Disbursement", metadata: { amount: app.amount, reference: outcome.reference }, customerVisible: true });
    await recordAudit(tx, { type: "MANDATE_CREATED", actor: SYSTEM_ACTOR, businessId: business.id, applicationId, applicationRef: app.reference, resource: "Repayment mandate", metadata: { mandate: mandate.mandateReference, instalments: schedule.length }, customerVisible: true });
    await notify(tx, { audience: "sme", businessId: business.id, type: "disbursement_completed", title: "Disbursement confirmed", body: `${formatNaira(app.amount)} was disbursed to ${processing.destinationMasked}. First repayment due ${formatDate(schedule[0].dueDate)}.`, href: "/sme/repayments" });
    await notify(tx, { audience: "bank", type: "disbursement_completed", title: "Disbursement confirmed", body: `${app.reference}: ${formatNaira(app.amount)} disbursed (${outcome.reference}).`, href: `/bank/applications/${applicationId}` });
  });
  return "confirmed";
}

export async function escalateDisbursement(user: SessionUser, applicationId: string) {
  const { app, business } = await loadApp(applicationId);
  if (app.status !== "disbursement_failed") throw new ServiceError("Only a failed disbursement can be escalated.");
  return prisma.$transaction((tx) =>
    openCase(tx, { businessId: business.id, businessName: business.name, applicationId, applicationRef: app.reference, type: "unusual_activity", severity: "High", trigger: "Disbursement failure escalated", description: `Disbursement of ${formatNaira(app.amount)} for ${app.reference} failed after ${app.disbursement?.attempts ?? 0} attempt(s): ${app.disbursement?.failureReason ?? "unknown reason"}.`, owner: "Credit Operations", actor: actorOf(user) }),
  );
}

/** Processes a scheduled or failed instalment through the (demo) collections adapter. */
export async function processRepayment(actorUser: SessionUser | null, repaymentId: string, force?: "success" | "failure"): Promise<"paid" | "failed"> {
  const rep = await prisma.repayment.findUnique({ where: { id: repaymentId }, include: { plan: { include: { application: { include: { business: true } } } } } });
  if (!rep) throw new ServiceError("Repayment not found", 404);
  if (rep.status === "paid") throw new ServiceError("This instalment is already paid.");
  if (rep.status === "processing") throw new ServiceError("This instalment is already being processed.");
  const app = rep.plan.application;
  const policy = await getPolicy();
  await prisma.repayment.update({ where: { id: repaymentId }, data: { status: "processing", attempts: { increment: 1 } } });
  const outcome = await demoRepaymentService.processRepayment({ repaymentId, amount: rep.amount, forceOutcome: force });
  const attempts = rep.attempts + 1;

  await prisma.$transaction(async (tx) => {
    if (outcome.status === "paid") {
      await tx.repayment.update({ where: { id: repaymentId }, data: { status: "paid", paidAt: new Date(outcome.at), reference: outcome.reference, failureReason: null } });
      const all = await tx.repayment.findMany({ where: { planId: rep.planId } });
      const paidToDate = all.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);
      const outstanding = Math.max(0, rep.plan.totalRepayable - paidToDate);
      const anyFailed = all.some((r) => r.status === "failed" || r.status === "overdue");
      const health = outstanding <= 0 ? "completed" : anyFailed ? "at_risk" : rep.plan.health === "at_risk" ? "watch" : rep.plan.health;
      await tx.repaymentPlan.update({ where: { id: rep.planId }, data: { paidToDate, outstanding, health } });
      await recordAudit(tx, { type: "REPAYMENT_PROCESSED", actor: SYSTEM_ACTOR, businessId: rep.businessId, applicationId: app.id, applicationRef: app.reference, resource: "Repayment", metadata: { sequence: rep.sequence, amount: rep.amount, reference: outcome.reference }, customerVisible: true });
      await notify(tx, { audience: "sme", businessId: rep.businessId, type: "repayment_successful", title: "Repayment successful", body: `Repayment ${rep.sequence} of ${formatNaira(rep.amount)} was collected.`, href: "/sme/repayments" });
      await notify(tx, { audience: "bank", type: "repayment_successful", title: "Repayment collected", body: `${app.reference}: instalment ${rep.sequence} (${formatNaira(rep.amount)}) collected.`, href: `/bank/applications/${app.id}` });
    } else {
      await tx.repayment.update({ where: { id: repaymentId }, data: { status: "failed", failureReason: outcome.reason } });
      const failed = await tx.repayment.count({ where: { planId: rep.planId, status: "failed" } });
      await tx.repaymentPlan.update({ where: { id: rep.planId }, data: { health: failed >= policy.riskThresholds.failedDebitsAtRisk ? "at_risk" : "watch" } });
      await recordAudit(tx, { type: "REPAYMENT_FAILED", actor: SYSTEM_ACTOR, businessId: rep.businessId, applicationId: app.id, applicationRef: app.reference, resource: "Repayment", metadata: { sequence: rep.sequence, amount: rep.amount, reason: outcome.reason, attempt: attempts }, customerVisible: true });
      await notify(tx, { audience: "sme", businessId: rep.businessId, type: "repayment_failed", title: "Repayment attention required", body: `Repayment of ${formatNaira(rep.amount)} could not be collected: ${outcome.reason}.`, href: "/sme/repayments" });
      const existing = await tx.case.findFirst({ where: { applicationId: app.id, status: { not: "resolved" }, trigger: "Repayment failure" } });
      if (!existing) {
        await openCase(tx, { businessId: rep.businessId, businessName: app.business.name, applicationId: app.id, applicationRef: app.reference, type: "repayment_failed", severity: "Medium", trigger: "Repayment failure", description: `Scheduled repayment ${rep.sequence} (${formatNaira(rep.amount)}) failed on attempt ${attempts}: ${outcome.reason}.`, owner: "Credit Operations", actor: SYSTEM_ACTOR });
      } else {
        await notify(tx, { audience: "bank", type: "repayment_failed", title: "Repayment failed", body: `${app.reference}: instalment ${rep.sequence} failed again (${outcome.reason}).`, href: `/bank/monitoring/${existing.id}` });
      }
    }
  });
  return outcome.status;
}

export async function updatePolicy(user: SessionUser, patch: Partial<BankPolicy>) {
  const prev = await getPolicy();
  const [major, minor] = prev.version.replace("LP-", "").split(".").map(Number);
  const next: BankPolicy = { ...prev, ...patch, version: `LP-${major}.${minor + 1}`, updatedAt: new Date().toISOString(), updatedByName: user.name };
  if (next.minAssessmentScore < 0 || next.minAssessmentScore > 100) throw new ServiceError("Minimum score must be between 0 and 100.");
  if (next.maxLoanAmount <= next.minLoanAmount) throw new ServiceError("Maximum loan amount must exceed the minimum.");
  if (next.allowedTenors.length === 0) throw new ServiceError("Allow at least one tenor.");
  if (!(next.annualInterestRate > 0)) throw new ServiceError("Interest rate must be positive.");
  const changed = (Object.keys(patch) as (keyof BankPolicy)[]).filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(patch[k]));
  await prisma.$transaction(async (tx) => {
    await tx.bankPolicy.update({ where: { id: 1 }, data: { version: next.version, data: JSON.stringify(next), updatedAt: new Date(next.updatedAt), updatedByName: user.name } });
    await recordAudit(tx, { type: "POLICY_UPDATED", actor: actorOf(user), resource: "Lending policy", metadata: { version: next.version, previousVersion: prev.version, fieldsChanged: changed.join(", ") || "none" } });
  });
  return next;
}

export async function markNotificationsRead(user: SessionUser) {
  if (user.organisationType === "bank") await prisma.notification.updateMany({ where: { audience: "bank", read: false }, data: { read: true } });
  else {
    const biz = await prisma.business.findUnique({ where: { organisationId: user.organisationId } });
    if (biz) await prisma.notification.updateMany({ where: { audience: "sme", businessId: biz.id, read: false }, data: { read: true } });
  }
}
