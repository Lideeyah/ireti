import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat, StatRow, Divider, ListHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RepaymentStatusChip, HealthChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banner } from "@/components/ui/Banner";
import { RepaymentTimeline } from "@/components/charts/RepaymentTimeline";
import { RetryRepaymentButton, PayInstalmentButton } from "@/components/sme/ApplicationActions";
import { formatNaira, formatNairaCompact, formatDate, formatDateTime, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

export default async function RepaymentsPage() {
  const user = await requireSmeUser();
  const { plan, repayments, offer, profile, activeApplication } = await loadSmeBundle(user);
  if (!plan || !offer || !activeApplication) {
    return (
      <>
        <PageHeader eyebrow="Repayments" title="Repayment schedule" />
        <Card><EmptyState icon={CalendarClock} title="No repayment history" body="A repayment schedule is created when a facility is disbursed." action={<Link href="/sme"><Button size="sm">Back to overview</Button></Link>} /></Card>
      </>
    );
  }
  const failed = repayments.find((r) => r.status === "failed" || r.status === "overdue");
  const next = repayments.find((r) => r.status === "failed" || r.status === "processing" || r.status === "scheduled");
  const history = repayments.filter((r) => r.status !== "scheduled");

  return (
    <>
      <PageHeader title={`Facility ${activeApplication.reference}`} meta={<><HealthChip health={plan.health} /><span>Mandate {plan.mandateReference}</span><span>·</span><span>Disbursed {formatDate(plan.startedAt)}</span></>} />
      {failed && (
        <div className="mb-6">
          <Banner tone="danger" title="Repayment attention required" action={<div className="flex gap-2"><PayInstalmentButton repaymentId={failed.id} label="Pay now" variant="primary" /><Link href={`/sme/application/${activeApplication.id}`}><Button size="sm">Contact bank</Button></Link></div>}>
            {formatNaira(failed.amount)} due {formatDate(failed.dueDate)}.{failed.failureReason ? ` ${failed.failureReason}.` : " The mandate could not be collected."} {failed.attempts} {failed.attempts === 1 ? "attempt" : "attempts"} so far.
          </Banner>
        </div>
      )}
      <Card className="mb-6">
        <StatRow columns={4}>
          <Stat label="Outstanding balance" size="lg" value={formatNaira(plan.outstanding)} sub={`of ${formatNaira(plan.totalRepayable)} total`} />
          <Stat label="Next repayment" size="lg" value={next ? formatNaira(next.amount) : "—"} sub={next ? <RepaymentStatusChip status={next.status} /> : "Facility settled"} />
          <Stat label="Expected date" size="lg" value={next ? formatDate(next.dueDate) : "—"} />
          <Stat label="Repayment window" size="lg" value={next ? `${new Date(next.windowStart).getDate()}–${formatDate(next.windowEnd, { day: "numeric", month: "long" })}` : "—"} />
        </StatRow>
        <Divider />
        <RepaymentTimeline repayments={repayments} />
      </Card>
      <div className="grid xl:grid-cols-[360px_1fr] gap-6">
        <Card>
          <CardHeader title="Repayment profile" />
          <div className="space-y-5">
            <Stat label="Strongest recurring inflow" size="lg" value={formatWindow(offer.repaymentWindow)} />
            <Stat label="Average inflow during window" size="lg" value={profile ? formatNairaCompact(profile.avgInflowDuringWindow) : "—"} />
            <Stat label="Recommended repayment date" size="lg" value={ordinal(offer.recommendedRepaymentDay)} />
          </div>
          <Divider />
          <p className="text-[12.5px] text-ink-3">Recommended from observed cash flow; not a guarantee of balance or repayment.</p>
        </Card>
        <div className="space-y-6">
          <Card padded={false}>
            <ListHeader title="Schedule" />
            <table className="data-table">
              <thead><tr><th>#</th><th>Due</th><th>Window</th><th className="num">Principal</th><th className="num">Interest</th><th className="num">Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {repayments.map((r) => (
                  <tr key={r.id}>
                    <td className="tnum text-ink-3">{r.sequence}</td>
                    <td className="tnum whitespace-nowrap">{formatDate(r.dueDate)}</td>
                    <td className="tnum text-ink-2 whitespace-nowrap">{new Date(r.windowStart).getDate()}–{new Date(r.windowEnd).getDate()}</td>
                    <td className="num tnum">{formatNaira(r.principalPortion)}</td>
                    <td className="num tnum">{formatNaira(r.interestPortion)}</td>
                    <td className="num tnum font-medium">{formatNaira(r.amount)}</td>
                    <td><RepaymentStatusChip status={r.status} /></td>
                    <td className="text-right">{r.status === "failed" || r.status === "overdue" ? <RetryRepaymentButton repaymentId={r.id} /> : r.id === next?.id && r.status === "scheduled" ? <PayInstalmentButton repaymentId={r.id} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card padded={false}>
            <ListHeader title="History" />
            {history.length === 0 ? <EmptyState title="No repayment history" body="Collections will appear here once the first instalment is processed." /> : (
              <ul className="divide-y divide-line-subtle">
                {history.map((r) => (
                  <li key={r.id} className="px-6 py-3 flex items-center gap-5">
                    <RepaymentStatusChip status={r.status} />
                    <div className="flex-1 text-[14px] text-ink">Instalment {r.sequence} · <span className="tnum">{formatNaira(r.amount)}</span></div>
                    <div className="text-[13px] text-ink-3 tnum">{r.paidAt ? formatDateTime(r.paidAt) : r.failureReason ?? ""}{r.reference ? ` · ${r.reference}` : ""}</div>
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
