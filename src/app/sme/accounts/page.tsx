import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, Field, Stat, StatRow } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConnectionStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoTag } from "@/components/ui/Banner";
import { ConnectionButtons } from "@/components/sme/ApplicationActions";
import { formatNaira, formatRelative } from "@/lib/format";

export default async function AccountsPage() {
  const user = await requireSmeUser();
  const { connections, accounts } = await loadSmeBundle(user);
  const total = accounts.reduce((a, acc) => a + acc.balance, 0);
  const connected = connections.filter((c) => c.status === "connected").length;
  return (
    <>
      <PageHeader eyebrow="Connected accounts" title={`${connected} ${connected === 1 ? "institution" : "institutions"} connected`} description="Accounts connected through authorised Open Banking connections. Ìrètí reads balances and transaction history only; it never holds your banking credentials." actions={<><DemoTag>Simulated bank connection</DemoTag><Link href="/sme/onboarding"><Button variant="primary" size="sm"><Plus size={13} /> Add institution</Button></Link></>} />
      {connections.length === 0 ? (
        <Card><EmptyState icon={Landmark} title="No connected accounts" body="Connect your business accounts to build a consolidated financial profile." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Connect accounts</Button></Link>} /></Card>
      ) : (
        <>
          <Card className="mb-6"><StatRow columns={3}><Stat label="Total observed balance" size="lg" value={formatNaira(total)} /><Stat label="Transaction coverage" size="lg" value="12 months" /><Stat label="Accounts" size="lg" value={accounts.length} /></StatRow></Card>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {connections.map((c) => {
              const acc = accounts.find((a) => a.connectionId === c.id);
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div><div className="text-[16px] font-semibold text-ink">{c.institutionName}</div><div className="text-[12.5px] text-ink-3 mt-0.5">{acc?.accountType ?? "—"} · Open Banking</div></div>
                    <ConnectionStatusChip status={c.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-5">
                    <Field label="Account ending"><span className="tnum">{acc?.accountNumberMasked ?? "—"}</span></Field>
                    <Field label="Current balance"><span className="tnum font-medium">{acc ? formatNaira(acc.balance) : "—"}</span></Field>
                    <Field label="Connected">{c.connectedAt ? formatRelative(c.connectedAt) : "—"}</Field>
                    <Field label="Last synced">{c.lastSyncedAt ? formatRelative(c.lastSyncedAt) : "—"}</Field>
                  </div>
                  <div className="mt-5 pt-4 border-t border-line-subtle"><ConnectionButtons connectionId={c.id} status={c.status} /></div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
