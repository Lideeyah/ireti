"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark, Plus, RefreshCw, Star, Unlink } from "lucide-react";
import type { BankAccount, BankConnection } from "@/lib/domain/types";
import { connectInstitutionAction, disconnectInstitutionAction, refreshConnectionAction, setDisbursementAccountAction } from "@/app/actions";
import { INSTITUTIONS } from "@/lib/seed/institutions";
import { Card, Field } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Chip, ConnectionStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNaira, formatRelative } from "@/lib/format";

interface Props {
  connections: BankConnection[];
  accounts: BankAccount[];
  disbursementAccountId?: string;
  mandateLocked: boolean;
}

export function AccountManager({ connections, accounts, disbursementAccountId, mandateLocked }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [confirmDisconnect, setConfirmDisconnect] = useState<BankConnection | null>(null);

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => {
    setBusy(key);
    setError(undefined);
    setNotice(undefined);
    const r = await fn();
    if (!r.ok) setError(r.error);
    else if (ok) setNotice(ok);
    setBusy(null);
    router.refresh();
  };

  const connectedIds = new Set(connections.map((c) => c.institutionId));
  const available = INSTITUTIONS.filter((i) => !connectedIds.has(i.id));

  return (
    <>
      {error && <div className="mb-4"><Banner tone="danger" title="Could not complete that">{error}</Banner></div>}
      {notice && <div className="mb-4"><Banner tone="success">{notice}</Banner></div>}

      {connections.length === 0 ? (
        <Card>
          <EmptyState
            icon={Landmark}
            title="No connected accounts"
            body="Connect the accounts the business operates. Ìrètí reads balances and transaction history only."
            action={<Button size="sm" variant="primary" onClick={() => setAddOpen(true)}><Plus size={13} /> Connect an account</Button>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {connections.map((c) => {
            const acc = accounts.find((a) => a.connectionId === c.id);
            const isDesignated = !!acc && acc.id === disbursementAccountId;
            return (
              <Card key={c.id} className={isDesignated ? "border-primary" : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-ink truncate">{c.institutionName}</div>
                    <div className="text-[12.5px] text-ink-3 mt-0.5">{acc?.accountType ?? "—"} · Open Banking</div>
                  </div>
                  <ConnectionStatusChip status={busy === `refresh:${c.id}` ? "connecting" : c.status} />
                </div>

                {isDesignated && (
                  <div className="mt-3">
                    <Chip family="info"><Star size={11} /> Disbursement &amp; repayment account</Chip>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-5 gap-y-4 mt-5">
                  <Field label="Account ending"><span className="tnum">{acc?.accountNumberMasked ?? "—"}</span></Field>
                  <Field label="Balance"><span className="tnum font-medium">{acc ? formatNaira(acc.balance) : "—"}</span></Field>
                  <Field label="Connected">{c.connectedAt ? formatRelative(c.connectedAt) : "—"}</Field>
                  <Field label="Last synced">{c.lastSyncedAt ? formatRelative(c.lastSyncedAt) : "—"}</Field>
                </div>

                {c.status === "failed" && (
                  <div className="mt-4"><Banner tone="danger" title="Connection failed">{c.failureReason}</Banner></div>
                )}

                <div className="mt-5 pt-4 border-t border-line-subtle flex flex-wrap items-center gap-2">
                  {c.status === "connected" && (
                    <Button size="sm" loading={busy === `refresh:${c.id}`} onClick={() => run(`refresh:${c.id}`, () => refreshConnectionAction(c.id), `${c.institutionName} synced.`)}>
                      <RefreshCw size={12} /> Sync
                    </Button>
                  )}
                  {c.status === "failed" && (
                    <Button size="sm" variant="primary" loading={busy === `retry:${c.id}`} onClick={() => run(`retry:${c.id}`, () => connectInstitutionAction(c.institutionId))}>Try again</Button>
                  )}
                  {acc && c.status === "connected" && !isDesignated && (
                    <Button size="sm" disabled={mandateLocked} loading={busy === `designate:${acc.id}`} onClick={() => run(`designate:${acc.id}`, () => setDisbursementAccountAction(acc.id), `${c.institutionName} is now the disbursement account.`)}>
                      <Star size={12} /> Use for disbursement
                    </Button>
                  )}
                  {acc && (
                    <Link href={`/sme/transactions?account=${acc.id}`}><Button size="sm" variant="ghost">Transactions</Button></Link>
                  )}
                  <Button size="sm" variant="ghost" className="ml-auto text-danger" onClick={() => setConfirmDisconnect(c)}>
                    <Unlink size={12} /> Disconnect
                  </Button>
                </div>
              </Card>
            );
          })}

          <button onClick={() => setAddOpen(true)} className="surface border-dashed flex flex-col items-center justify-center gap-2 min-h-[220px] text-ink-3 hover:text-ink hover:border-line-strong transition-colors">
            <Plus size={20} />
            <span className="text-[13.5px] font-medium">Connect another account</span>
            <span className="text-[12.5px]">{available.length} institutions available</span>
          </button>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Connect an account"
        width={560}
        footer={<Button onClick={() => setAddOpen(false)}>Done</Button>}
      >
        <p className="text-[13.5px] text-ink-2 mb-4">
          You authorise each connection with the institution. No banking passwords are entered into Ìrètí.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {available.map((inst) => (
            <button
              key={inst.id}
              disabled={busy !== null}
              onClick={() => run(`connect:${inst.id}`, () => connectInstitutionAction(inst.id), `${inst.name} connected.`)}
              className="flex items-center justify-between h-11 px-4 rounded-[6px] border border-line hover:bg-hover text-left disabled:opacity-60"
            >
              <span className="text-[14px] font-medium text-ink">{inst.name}</span>
              {busy === `connect:${inst.id}` ? <RefreshCw size={14} className="spin text-primary" /> : <Plus size={14} className="text-ink-3" />}
            </button>
          ))}
          {available.length === 0 && <p className="col-span-2 text-[13px] text-ink-3">Every available institution is already connected.</p>}
        </div>
        {error && <div className="mt-4"><Banner tone="danger">{error}</Banner></div>}
      </Modal>

      <Modal
        open={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        title={`Disconnect ${confirmDisconnect?.institutionName ?? ""}?`}
        footer={
          <>
            <Button onClick={() => setConfirmDisconnect(null)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={busy === `disconnect:${confirmDisconnect?.id}`}
              onClick={async () => {
                const c = confirmDisconnect!;
                setConfirmDisconnect(null);
                await run(`disconnect:${c.id}`, () => disconnectInstitutionAction(c.id), `${c.institutionName} disconnected.`);
              }}
            >
              Disconnect
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">
          Withdrawing consent removes this institution&apos;s balances and transaction history from your consolidated profile. Your credit assessment will need to be re-run before you can apply again.
        </p>
      </Modal>
    </>
  );
}

export function DisbursementAccountCard({ accounts, disbursementAccountId, mandateLocked }: { accounts: BankAccount[]; disbursementAccountId?: string; mandateLocked: boolean }) {
  const designated = accounts.find((a) => a.id === disbursementAccountId);
  if (accounts.length === 0) return null;
  return (
    <Card className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-[8px] bg-selected text-info flex items-center justify-center shrink-0"><Star size={16} /></span>
          <div>
            <div className="text-[14px] font-medium text-ink">Disbursement &amp; repayment account</div>
            <div className="text-[13px] text-ink-2 mt-0.5">
              {designated ? (
                <>Funds are paid into {designated.institutionName} <span className="tnum">{designated.accountNumberMasked}</span>, and the mandate is collected from it.</>
              ) : (
                <>Not set. The account with the largest balance will be used unless you designate one.</>
              )}
            </div>
          </div>
        </div>
        {mandateLocked && <Chip family="neutral">Locked while a facility is live</Chip>}
      </div>
    </Card>
  );
}
