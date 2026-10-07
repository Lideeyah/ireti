import "server-only";
import { prisma } from "./db";
import { getPolicy, verifyLedger } from "./core";
import {
  toAccount, toApplication, toAssessment, toAuditEvent, toBusiness, toCase, toConnection, toDocument,
  toNotification, toOffer, toPlan, toProfile, toRepayment, toRiskEvent,
} from "./serializers";
import type { SessionUser } from "./auth";

/** Read models for pages. Each loader scopes data to the caller. */

export async function loadSmeBundle(user: SessionUser) {
  const business = await prisma.business.findUnique({
    where: { organisationId: user.organisationId },
    include: { connections: true, accounts: true, applications: { include: { offer: true, plan: { include: { repayments: { orderBy: { sequence: "asc" } } } } }, orderBy: { submittedAt: "desc" } } },
  });
  if (!business) return { business: null, connections: [], accounts: [], profile: undefined, assessment: undefined, applications: [], activeApplication: undefined, plan: undefined, repayments: [], offer: undefined, activity: [], policy: await getPolicy() };
  const [profileRow, assessmentRow, activity, policy] = await Promise.all([
    prisma.financialProfile.findFirst({ where: { businessId: business.id }, orderBy: { generatedAt: "desc" } }),
    prisma.creditAssessment.findFirst({ where: { businessId: business.id }, orderBy: { generatedAt: "desc" } }),
    prisma.auditEvent.findMany({ where: { businessId: business.id, customerVisible: true }, orderBy: { seq: "desc" }, take: 200 }),
    getPolicy(),
  ]);
  const applications = business.applications.map(toApplication);
  const activeRow = business.applications.find((a) => a.status !== "rejected") ?? business.applications[0];
  return {
    business: toBusiness(business),
    connections: business.connections.map(toConnection),
    accounts: business.accounts.map(toAccount),
    profile: profileRow ? toProfile(profileRow) : undefined,
    assessment: assessmentRow ? toAssessment(assessmentRow) : undefined,
    applications,
    activeApplication: activeRow ? toApplication(activeRow) : undefined,
    plan: activeRow?.plan ? toPlan(activeRow.plan) : undefined,
    repayments: activeRow?.plan ? activeRow.plan.repayments.map(toRepayment) : [],
    offer: activeRow ? toOffer(activeRow.offer) : undefined,
    activity: activity.map(toAuditEvent),
    policy,
  };
}

export async function loadSmeApplication(user: SessionUser, applicationId: string) {
  const row = await prisma.loanApplication.findUnique({ where: { id: applicationId }, include: { business: true, offer: true, plan: true } });
  if (!row || row.business.organisationId !== user.organisationId) return null;
  const events = await prisma.auditEvent.findMany({ where: { applicationId, customerVisible: true }, orderBy: { seq: "desc" } });
  return { app: toApplication(row), offer: toOffer(row.offer), plan: row.plan ? toPlan(row.plan) : undefined, events: events.map(toAuditEvent) };
}

export async function loadNotifications(user: SessionUser) {
  if (user.organisationType === "bank") {
    const rows = await prisma.notification.findMany({ where: { audience: "bank" }, orderBy: { createdAt: "desc" }, take: 40 });
    return rows.map(toNotification);
  }
  const biz = await prisma.business.findUnique({ where: { organisationId: user.organisationId } });
  if (!biz) return [];
  const rows = await prisma.notification.findMany({ where: { audience: "sme", businessId: biz.id }, orderBy: { createdAt: "desc" }, take: 40 });
  return rows.map(toNotification);
}

export async function loadQueue() {
  const rows = await prisma.loanApplication.findMany({ include: { business: true, assessment: true, plan: true }, orderBy: { submittedAt: "desc" } });
  return rows.map((r) => ({ app: toApplication(r), business: toBusiness(r.business), assessment: toAssessment(r.assessment), plan: r.plan ? toPlan(r.plan) : undefined }));
}

export async function loadBankStats() {
  const [apps, plans] = await Promise.all([prisma.loanApplication.findMany({ select: { status: true, decision: true, amount: true } }), prisma.repaymentPlan.findMany({ select: { health: true, outstanding: true } })]);
  const today = new Date().toDateString();
  return {
    total: apps.length,
    newCount: apps.filter((a) => a.status === "submitted").length,
    awaiting: apps.filter((a) => a.status === "submitted" || a.status === "under_review").length,
    approvedToday: apps.filter((a) => a.decision && JSON.parse(a.decision).outcome === "approved" && new Date(JSON.parse(a.decision).at).toDateString() === today).length,
    preparing: apps.filter((a) => a.status === "approved" || a.status === "disbursement_pending").length,
    disbursed: apps.filter((a) => a.status === "disbursed").length,
    disbursedValue: apps.filter((a) => a.status === "disbursed").reduce((s, a) => s + a.amount, 0),
    atRisk: plans.filter((p) => p.health === "at_risk").length,
    watch: plans.filter((p) => p.health === "watch").length,
  };
}

export async function loadReviewBundle(applicationId: string) {
  const row = await prisma.loanApplication.findUnique({
    where: { id: applicationId },
    include: { business: { include: { connections: true, accounts: true } }, assessment: { include: { profile: true } }, offer: true, plan: { include: { repayments: { orderBy: { sequence: "asc" } } } }, documents: true, cases: true },
  });
  if (!row) return null;
  const [events, policy] = await Promise.all([prisma.auditEvent.findMany({ where: { applicationId }, orderBy: { seq: "desc" } }), getPolicy()]);
  return {
    app: toApplication(row),
    business: toBusiness(row.business),
    connections: row.business.connections.map(toConnection),
    accounts: row.business.accounts.map(toAccount),
    assessment: toAssessment(row.assessment),
    profile: toProfile(row.assessment.profile),
    offer: toOffer(row.offer),
    plan: row.plan ? toPlan(row.plan) : undefined,
    repayments: row.plan ? row.plan.repayments.map(toRepayment) : [],
    documents: row.documents.map(toDocument),
    cases: row.cases.map(toCase),
    events: events.map(toAuditEvent),
    policy,
  };
}

export async function loadMonitoring() {
  const [plans, cases, policy] = await Promise.all([
    prisma.repaymentPlan.findMany({ where: { health: { not: "completed" } }, include: { business: true, application: true, repayments: { orderBy: { sequence: "asc" } } } }),
    prisma.case.findMany({ include: { business: true }, orderBy: { createdAt: "desc" } }),
    getPolicy(),
  ]);
  return {
    plans: plans.map((p) => ({ plan: toPlan(p), business: toBusiness(p.business), application: toApplication(p.application), next: p.repayments.map(toRepayment).find((r) => r.status !== "paid") })),
    cases: cases.map((c) => ({ c: toCase(c), business: toBusiness(c.business) })),
    policy,
  };
}

export async function loadCase(caseId: string) {
  const row = await prisma.case.findUnique({ where: { id: caseId }, include: { business: true, application: true, riskEvent: true } });
  if (!row) return null;
  return { c: toCase(row), business: toBusiness(row.business), application: row.application ? toApplication(row.application) : undefined, event: toRiskEvent(row.riskEvent) };
}

export async function loadAudit() {
  const [rows, integrity, dataAccess] = await Promise.all([
    prisma.auditEvent.findMany({ orderBy: { seq: "desc" }, take: 500 }),
    verifyLedger(),
    prisma.auditEvent.count({ where: { type: "DATA_ACCESS" } }),
  ]);
  const total = await prisma.auditEvent.count();
  return { events: rows.map(toAuditEvent), integrity, total, dataAccess };
}

export async function loadBankStaff() {
  const rows = await prisma.user.findMany({ where: { organisation: { type: "bank" } }, orderBy: { name: "asc" } });
  return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, title: u.title ?? "" }));
}
