import type { AuditEvent, AuditEventType, Role } from "../domain/types";
import { sha256 } from "../util/sha256";
import { uid } from "../util/ids";

/**
 * Audit ledger — private, permissioned, append-only.
 *
 * Only audit metadata is recorded: event type, actor, references, amounts, versions,
 * and a hash of that metadata chained to the previous event. Raw financial data,
 * BVNs, credentials and transaction histories are never written here.
 *
 * Demo: an in-process hash chain. Production: the same `record` / `verify` interface
 * backed by a permissioned ledger (e.g. Hyperledger Fabric) or a WORM store.
 */
export interface RecordEventInput {
  type: AuditEventType;
  actor: { id: string; name: string; role: Role | "SYSTEM" };
  businessId?: string;
  applicationId?: string;
  applicationRef?: string;
  resource?: string;
  metadata?: Record<string, string | number>;
  customerVisible?: boolean;
  timestamp?: string;
}

export interface AuditLedger {
  record(chain: AuditEvent[], input: RecordEventInput): AuditEvent;
  verify(chain: AuditEvent[]): { valid: boolean; brokenAtSeq?: number };
}

const GENESIS_HASH = "0".repeat(64);

function canonical(input: Record<string, unknown>): string {
  return JSON.stringify(input, Object.keys(input).sort());
}

export const demoAuditLedger: AuditLedger = {
  record(chain, input) {
    const prev = chain[chain.length - 1];
    const seq = (prev?.seq ?? 0) + 1;
    const timestamp = input.timestamp ?? new Date().toISOString();
    const metadata = input.metadata ?? {};
    const payloadHash = sha256(
      canonical({
        type: input.type,
        actorId: input.actor.id,
        actorRole: input.actor.role,
        applicationId: input.applicationId ?? null,
        resource: input.resource ?? null,
        metadata,
        timestamp,
      }),
    );
    const previousHash = prev?.hash ?? GENESIS_HASH;
    const hash = sha256(`${seq}|${previousHash}|${payloadHash}`);
    return {
      seq,
      id: uid("evt"),
      timestamp,
      type: input.type,
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      businessId: input.businessId,
      applicationId: input.applicationId,
      applicationRef: input.applicationRef,
      resource: input.resource,
      metadata,
      payloadHash,
      previousHash,
      hash,
      customerVisible: input.customerVisible ?? false,
    };
  },
  verify(chain) {
    let prevHash = GENESIS_HASH;
    for (const e of chain) {
      const expected = sha256(`${e.seq}|${prevHash}|${e.payloadHash}`);
      if (expected !== e.hash || e.previousHash !== prevHash) return { valid: false, brokenAtSeq: e.seq };
      prevHash = e.hash;
    }
    return { valid: true };
  },
};
