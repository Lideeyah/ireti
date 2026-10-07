"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarClock, RefreshCw } from "lucide-react";
import { useAdebayo } from "@/hooks/useAdebayo";
import { useStore } from "@/lib/store/store";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat, Field, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RepaymentStatusChip, HealthChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banner, DemoTag } from "@/components/ui/Banner";
import { RepaymentTimeline } from "@/components/charts/RepaymentTimeline";
import { formatNaira, formatNairaCompact, formatDate, formatDateTime, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

export default function RepaymentsPage() {
  const { plan, repayments, offer, profile, activeApplication } = useAdebayo();
  const process = useStore((s) => s.processRepayment);
  const [busy, setBusy] = useState<string | null>(null);

  if (!plan || !offer || !activeApplication) {
    return (
      <>
        <PageHeader eyebrow="Repayments" title="Repayment schedule" />
        <Card><EmptyState icon={CalendarClock} title="No repayment history" body="A repayment schedule is created when a facility is disbursed." action={<Link href="/sme"><Button size="sm">Back to overview</Button></Link>} /></Card>
      </>
    );
  }

  const failed = repayments.find((r) => r.status === "failed");
  const next = repayments.find((r) => r.status === "failed" || r.status === "processing" || r.status === "scheduled");
  const history = repayments.filter((r) => r.status !== "scheduled");

  const retry = async (id: string) => {
    setBusy(id);
    await process(id);
    setBusy(null);
  };

  return (
    <>
      <PageHeader eyebrow="Repayments" title={`Facility ${activeApplication.reference}`} meta={<><HealthChip health={plan.health} /><span>Mandate {plan.mandateReference}</span><span>·</span><span>Disbursed {formatDate(plan.startedAt)}</span></>} actions={<DemoTag>Demo repayment</DemoTag>} />

      {failed && (
        <div className="mb-4">
          <Banner tone="danger" title="Repayment attention required" action={<div className="flex gap-2"><Button size="sm" variant="primary" loading={busy === failed.id} onClick={() => retry(failed.id)}><RefreshCw size={12} /> Retry</Button><Link href={`/sme/application/${activeApplication.id}`}><Button size="sm">Contact bank</Button></Link></div>}>
            Amount {formatNaira(failed.amount)} due {formatDate(failed.dueDate)}. Reason: {failed.failureReason}. Attempts: {failed.attempts}.
          </Banner>
        </div>
      )}

      <Card className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:divide-x divide-line-subtle [&>*:not(:first-child)]:lg:pl-6">
          <Stat label="Outstanding balance" size="lg" value={formatNaira(plan.outstanding)} sub={`of ${formatNaira(plan.totalRepayable)} total`} />
          <Stat label="Next repayment" size="lg" value={next ? formatNaira(next.amount) : "—"} sub={next ? <RepaymentStatusChip status={next.status} /> : "Facility settled"} />
          <Stat label="Expected date" size="lg" value={next ? formatDate(next.dueDate) : "—"} />
          <Stat label="Repayment window" size="lg" value={next ? `${new Date(next.windowStart).getDate()}–${formatDate(next.windowEnd, { day: "numeric", month: "long" })}` : "—"} />
        </div>
        <Divider className="my-4" />
        <RepaymentTimeline repayments={repayments} />
      </Card>

      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-4">
        <Card>
          <CardHeader eyebrow="Repayment profile" title="Cash-flow-aware timing" />
          <div className="space-y-3">
            <Stat label="Strongest recurring inflow" value={formatWindow(offer.repaymentWindow)} />
            <Stat label="Average inflow during window" value={profile ? formatNairaCompact(profile.avgInflowDuringWindow) : "—"} />
            <Stat label="Recommended repayment date" value={ordinal(offer.recommendedRepaymentDay)} />
          </div>
          <Divider className="my-4" />
          <p className="text-[12.5px] text-ink-3">Repayment timing is recommended from observed cash-flow behaviour. It does not guarantee future account balance or repayment success.</p>
        </Card>

        <div className="space-y-4">
          <Card padded={false}>
            <div className="px-4 py-3 border-b border-line-subtle"><div className="eyebrow">Schedule</div></div>
            <table className="data-table">
              <thead><tr><th>#</th><th>Due</th><th>Window</th><th className="num">Principal</th><th className="num">Interest</th><th className="num">Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {repayments.map((r) => (
                  <tr key={r.id}>
                    <td className="tnum text-ink-3">{r.sequence}</td>
                    <td className="tnum">{formatDate(r.dueDate)}</td>
                    <td className="tnum text-ink-2">{new Date(r.windowStart).getDate()}–{new Date(r.windowEnd).getDate()}</td>
                    <td className="num tnum">{formatNaira(r.principalPortion)}</td>
                    <td className="num tnum">{formatNaira(r.interestPortion)}</td>
                    <td className="num tnum font-medium">{formatNaira(r.amount)}</td>
                    <td><RepaymentStatusChip status={r.status} /></td>
                    <td className="text-right">{r.status === "failed" && <Button size="sm" loading={busy === r.id} onClick={() => retry(r.id)}>Retry</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card padded={false}>
            <div className="px-4 py-3 border-b border-line-subtle"><div className="eyebrow">Repayment history</div></div>
            {history.length === 0 ? (
              <EmptyState title="No repayment history" body="Collections will appear here once the first instalment is processed." />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {history.map((r) => (
                  <li key={r.id} className="px-4 py-2.5 flex items-center gap-4">
                    <RepaymentStatusChip status={r.status} />
                    <div className="flex-1 text-[13px] text-ink">Instalment {r.sequence} · <span className="tnum">{formatNaira(r.amount)}</span></div>
                    <div className="text-[12.5px] text-ink-3 tnum">{r.paidAt ? formatDateTime(r.paidAt) : r.failureReason ?? ""}{r.reference ? ` · ${r.reference}` : ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
