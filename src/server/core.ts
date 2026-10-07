import "server-only";
import type { AuditEventType, BankPolicy, NotificationType, Role } from "@/lib/domain/types";
import { sha256 } from "@/lib/util/sha256";
import { DEFAULT_POLICY } from "@/lib/policy/defaultPolicy";
import { prisma } from "./db";
import { toPolicy } from "./serializers";
import type { Prisma } from "@prisma/client";

export type Tx = Prisma.TransactionClient;
export type Actor = { id: string; name: string; role: Role | "SYSTEM" };
export const SYSTEM_ACTOR: Actor = { id: "system", name: "Ìrètí platform", role: "SYSTEM" };

const GENESIS = "0".repeat(64);
const canonical = (o: Record<string, unknown>) => JSON.stringify(o, Object.keys(o).sort());

/**
 * Append an event to the audit ledger. The chain hash is computed from the previous
 * row inside the same transaction so concurrent writers cannot fork the chain.
 * Only non-sensitive metadata is accepted.
 */
export async function recordAudit(
  tx: Tx,
  input: {
    type: AuditEventType;
    actor: Actor;
    businessId?: string | null;
    applicationId?: string | null;
    applicationRef?: string | null;
    resource?: string;
    metadata?: Record<string, string | number>;
    customerVisible?: boolean;
    timestamp?: Date;
  },
) {
  const prev = await tx.auditEvent.findFirst({ orderBy: { seq: "desc" }, select: { seq: true, hash: true } });
  const seq = (prev?.seq ?? 0) + 1;
  const timestamp = input.timestamp ?? new Date();
  const metadata = input.metadata ?? {};
  const payloadHash = sha256(
    canonical({ type: input.type, actorId: input.actor.id, actorRole: input.actor.role, applicationId: input.applicationId ?? null, resource: input.resource ?? null, metadata, timestamp: timestamp.toISOString() }),
  );
  const previousHash = prev?.hash ?? GENESIS;
  const hash = sha256(`${seq}|${previousHash}|${payloadHash}`);
  return tx.auditEvent.create({
    data: {
      seq,
      timestamp,
      type: input.type,
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      businessId: input.businessId ?? null,
      applicationId: input.applicationId ?? null,
      applicationRef: input.applicationRef ?? null,
      resource: input.resource,
      metadata: JSON.stringify(metadata),
      payloadHash,
      previousHash,
      hash,
      customerVisible: input.customerVisible ?? false,
    },
  });
}

export async function verifyLedger() {
  const rows = await prisma.auditEvent.findMany({ orderBy: { seq: "asc" }, select: { seq: true, payloadHash: true, previousHash: true, hash: true } });
  let prevHash = GENESIS;
  for (const e of rows) {
    if (e.previousHash !== prevHash || sha256(`${e.seq}|${prevHash}|${e.payloadHash}`) !== e.hash) return { valid: false, brokenAtSeq: e.seq };
    prevHash = e.hash;
  }
  return { valid: true as const };
}

export async function notify(tx: Tx, n: { audience: "sme" | "bank"; businessId?: string | null; type: NotificationType; title: string; body: string; href?: string }) {
  return tx.notification.create({ data: { audience: n.audience, businessId: n.businessId ?? null, type: n.type, title: n.title, body: n.body, href: n.href } });
}

export async function getPolicy(tx: Tx | typeof prisma = prisma): Promise<BankPolicy> {
  const row = await tx.bankPolicy.findUnique({ where: { id: 1 } });
  if (row) return toPolicy(row);
  const created = await tx.bankPolicy.create({ data: { id: 1, version: DEFAULT_POLICY.version, data: JSON.stringify(DEFAULT_POLICY), updatedAt: new Date(DEFAULT_POLICY.updatedAt), updatedByName: DEFAULT_POLICY.updatedByName } });
  return toPolicy(created);
}

export async function nextCounter(tx: Tx, name: string, start: number) {
  const row = await tx.counter.upsert({ where: { name }, create: { name, value: start + 1 }, update: { value: { increment: 1 } } });
  return row.value;
}

export class ServiceError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
