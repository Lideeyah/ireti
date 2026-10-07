import "server-only";
import type { Case, RiskEventType, Severity } from "@/lib/domain/types";
import { caseReference } from "@/lib/util/ids";
import { sha256 } from "@/lib/util/sha256";
import { prisma } from "./db";
import { nextCounter, notify, recordAudit, ServiceError, type Actor, type Tx } from "./core";
import { toCase } from "./serializers";
import type { SessionUser } from "./auth";

const actorOf = (u: SessionUser): Actor => ({ id: u.id, name: u.name, role: u.role });

/** Opens a risk event and its case inside the caller's transaction. */
export async function openCase(
  tx: Tx,
  input: { businessId: string; businessName: string; applicationId?: string; applicationRef?: string; type: RiskEventType; severity: Severity; trigger: string; description: string; owner: string; actor: Actor; customerVisible?: boolean },
): Promise<Case> {
  const now = new Date();
  const seq = await nextCounter(tx, "case", 176);
  const event = await tx.riskEvent.create({ data: { businessId: input.businessId, applicationId: input.applicationId, type: input.type, severity: input.severity, description: input.description, createdAt: now } });
  const c = await tx.case.create({
    data: {
      reference: caseReference(now.getFullYear(), seq),
      riskEventId: event.id,
      businessId: input.businessId,
      applicationId: input.applicationId,
      severity: input.severity,
      trigger: input.trigger,
      owner: input.owner,
      status: "open",
      notes: "[]",
      history: JSON.stringify([{ at: now.toISOString(), byName: input.actor.name, action: `Case opened: ${input.trigger}` }]),
      createdAt: now,
    },
  });
  await recordAudit(tx, { type: input.type === "access_dispute" ? "ACCESS_REPORTED" : "RISK_EVENT_CREATED", actor: input.actor, businessId: input.businessId, applicationId: input.applicationId, applicationRef: input.applicationRef, resource: "Risk case", metadata: { caseRef: c.reference, severity: c.severity, trigger: c.trigger }, customerVisible: input.customerVisible ?? false });
  await notify(tx, { audience: "bank", type: "risk_event_created", title: `Risk case ${c.reference}`, body: `${input.trigger} — ${input.businessName}.`, href: `/bank/monitoring/${c.id}` });
  return toCase(c);
}

async function loadCase(id: string) {
  const row = await prisma.case.findUnique({ where: { id } });
  if (!row) throw new ServiceError("Case not found", 404);
  return { row, c: toCase(row) };
}

export async function assignCase(user: SessionUser, caseId: string, assigneeName: string) {
  const { c } = await loadCase(caseId);
  const now = new Date().toISOString();
  await prisma.$transaction(async (tx) => {
    const status = c.status === "open" ? "assigned" : c.status;
    await tx.case.update({ where: { id: caseId }, data: { assigneeName, status, history: JSON.stringify([...c.history, { at: now, byName: user.name, action: `Assigned to ${assigneeName}` }]) } });
    await recordAudit(tx, { type: "CASE_UPDATED", actor: actorOf(user), businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference, action: "assigned", status } });
  });
}

export async function addCaseNote(user: SessionUser, caseId: string, text: string) {
  if (text.trim().length < 3) throw new ServiceError("Enter a note.");
  const { c } = await loadCase(caseId);
  const now = new Date().toISOString();
  await prisma.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { notes: JSON.stringify([...c.notes, { at: now, byName: user.name, text: text.trim() }]), history: JSON.stringify([...c.history, { at: now, byName: user.name, action: "Note added" }]) } });
    await recordAudit(tx, { type: "CASE_UPDATED", actor: actorOf(user), businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference, action: "note_added", noteHash: sha256(text).slice(0, 16) } });
  });
}

export async function escalateCase(user: SessionUser, caseId: string) {
  const { c } = await loadCase(caseId);
  if (c.status === "resolved") throw new ServiceError("Case is already resolved.");
  const severity: Severity = c.severity === "Low" ? "Medium" : "High";
  const now = new Date().toISOString();
  await prisma.$transaction(async (tx) => {
    await tx.case.update({ where: { id: caseId }, data: { status: "escalated", severity, history: JSON.stringify([...c.history, { at: now, byName: user.name, action: `Escalated — severity raised to ${severity}` }]) } });
    await recordAudit(tx, { type: "CASE_UPDATED", actor: actorOf(user), businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference, action: "escalated", severity } });
    await notify(tx, { audience: "bank", type: "case_updated", title: `Case ${c.reference} escalated`, body: `Severity raised to ${severity} by ${user.name}.`, href: `/bank/monitoring/${caseId}` });
  });
}

export async function resolveCase(user: SessionUser, caseId: string, note: string) {
  if (note.trim().length < 3) throw new ServiceError("Describe how the case was resolved.");
  const { c } = await loadCase(caseId);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.case.update({
      where: { id: caseId },
      data: { status: "resolved", resolvedAt: now, notes: JSON.stringify([...c.notes, { at: now.toISOString(), byName: user.name, text: note.trim() }]), history: JSON.stringify([...c.history, { at: now.toISOString(), byName: user.name, action: "Case resolved" }]) },
    });
    if (c.applicationId) {
      const plan = await tx.repaymentPlan.findUnique({ where: { applicationId: c.applicationId }, include: { repayments: true } });
      const otherOpen = await tx.case.count({ where: { applicationId: c.applicationId, id: { not: caseId }, status: { not: "resolved" } } });
      if (plan && otherOpen === 0 && plan.health !== "completed") {
        const unresolved = plan.repayments.some((r) => r.status === "failed" || r.status === "overdue");
        await tx.repaymentPlan.update({ where: { id: plan.id }, data: { health: unresolved ? "watch" : "healthy" } });
      }
    }
    await recordAudit(tx, { type: "CASE_RESOLVED", actor: actorOf(user), businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference } });
  });
}
