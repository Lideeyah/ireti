"use client";
import { useState } from "react";
import Link from "next/link";
import { Landmark, RefreshCw, Plus } from "lucide-react";
import { useAdebayo } from "@/hooks/useAdebayo";
import { useStore } from "@/lib/store/store";
import { demoBankConnectionService } from "@/lib/services/bankConnection";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, Field, Stat } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConnectionStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoTag } from "@/components/ui/Banner";
import { formatNaira, formatRelative } from "@/lib/format";

export default function AccountsPage() {
  const { connections, accounts, business } = useAdebayo();
  const disconnect = useStore((s) => s.disconnectInstitution);
  const retry = useStore((s) => s.retryConnection);
  const setStep = useStore((s) => s.setOnboardingStep);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [synced, setSynced] = useState<Record<string, string>>({});
  const total = accounts.reduce((a, acc) => a + acc.balance, 0);

  const refresh = async (id: string) => {
    setRefreshing(id);
    const r = await demoBankConnectionService.refreshConnection(id);
    setSynced((s) => ({ ...s, [id]: r.syncedAt }));
    setRefreshing(null);
  };

  return (
    <>
      <PageHeader eyebrow="Connected accounts" title={business ? `${connections.filter((c) => c.status === "connected").length} institutions connected` : "Connected accounts"} description="Accounts connected through authorised Open Banking connections. Ìrètí reads balances and transaction history only; it never holds your banking credentials." actions={<><DemoTag>Simulated bank connection</DemoTag><Link href="/sme/onboarding" onClick={() => setStep(2)}><Button variant="primary" size="sm"><Plus size={13} /> Add institution</Button></Link></>} />
      {connections.length === 0 ? (
        <Card><EmptyState icon={Landmark} title="No connected accounts" body="Connect your business accounts to build a consolidated financial profile." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Connect accounts</Button></Link>} /></Card>
      ) : (
        <>
          <Card className="mb-4 flex items-center gap-10">
            <Stat label="Total observed balance" size="lg" value={formatNaira(total)} />
            <Stat label="Transaction coverage" size="lg" value="12 months" />
            <Stat label="Accounts" size="lg" value={accounts.length} />
          </Card>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {connections.map((c) => {
              const acc = accounts.find((a) => a.connectionId === c.id);
              const lastSynced = synced[c.id] ?? c.lastSyncedAt;
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[15px] font-semibold text-ink">{c.institutionName}</div>
                      <div className="text-[12px] text-ink-3">{acc?.accountType ?? "—"} · {c.provider === "demo-open-banking" ? "Open Banking (demo)" : c.provider}</div>
                    </div>
                    <ConnectionStatusChip status={c.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Field label="Account ending"><span className="tnum">{acc?.accountNumberMasked ?? "—"}</span></Field>
                    <Field label="Current balance"><span className="tnum font-medium">{acc ? formatNaira(acc.balance) : "—"}</span></Field>
                    <Field label="Connected">{c.connectedAt ? formatRelative(c.connectedAt) : "—"}</Field>
                    <Field label="Last synced">{lastSynced ? formatRelative(lastSynced) : "—"}</Field>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line-subtle">
                    {c.status === "connected" && <Button size="sm" loading={refreshing === c.id} onClick={() => refresh(c.id)}><RefreshCw size={12} /> Refresh</Button>}
                    {c.status === "failed" && <Button size="sm" variant="primary" onClick={() => retry(c.id)}>Try again</Button>}
                    <Button size="sm" variant="ghost" onClick={() => disconnect(c.id)}>Disconnect</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
