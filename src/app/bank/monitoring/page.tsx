import Link from "next/link";
import { Radar } from "lucide-react";
import { requireBankUser } from "@/server/auth";
import { loadMonitoring } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat, StatRow } from "@/components/ui/Card";
import { HealthChip, SeverityChip, CaseStatusChip, RepaymentStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNaira, formatDate, formatRelative } from "@/lib/format";

export default async function MonitoringPage() {
  await requireBankUser("bank:view_risk");
  const { plans, cases, policy } = await loadMonitoring();
  const counts = { healthy: plans.filter((p) => p.plan.health === "healthy").length, watch: plans.filter((p) => p.plan.health === "watch").length, at_risk: plans.filter((p) => p.plan.health === "at_risk").length };
  const open = cases.filter((c) => c.c.status !== "resolved");
  const resolved = cases.length - open.length;
  return (
    <>
      <PageHeader eyebrow="Ìrètí / Monitoring" title="Portfolio monitoring" description="Health of disbursed facilities and the risk cases raised from repayment, inflow and activity triggers. No collections decision is taken automatically; each trigger opens a case for a person." />
      <Card className="mb-8">
        <StatRow columns={5}>
          <Stat label="Active facilities" size="lg" value={plans.length} sub={`${formatNaira(plans.reduce((a, p) => a + p.plan.outstanding, 0))} outstanding`} />
          <Stat label="Healthy" size="lg" value={counts.healthy} sub={<HealthChip health="healthy" />} />
          <Stat label="Watch" size="lg" value={counts.watch} sub={<HealthChip health="watch" />} />
          <Stat label="At risk" size="lg" value={counts.at_risk} sub={<HealthChip health="at_risk" />} />
          <Stat label="Open cases" size="lg" value={open.length} sub={`${resolved} resolved`} />
        </StatRow>
      </Card>
      <div className="space-y-8">
        <div>
          <div className="eyebrow mb-3">Open risk cases</div>
          <Card padded={false}>
            {open.length === 0 ? <EmptyState icon={Radar} title="No risk cases" body="Cases open automatically when a trigger fires: missed or failed repayment, reduced inflows, unusual activity, or a customer access report." /> : (
              <table className="data-table">
                <thead><tr><th>Case</th><th>Business</th><th>Trigger</th><th>Severity</th><th>Owner</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {open.map(({ c, business }) => (
                    <tr key={c.id} className="row-link">
                      <td className="tnum font-medium whitespace-nowrap"><Link href={`/bank/monitoring/${c.id}`} className="text-ink hover:text-link">{c.reference}</Link></td>
                      <td className="text-ink whitespace-nowrap">{business.name}</td>
                      <td className="text-ink-2">{c.trigger}</td>
                      <td><SeverityChip severity={c.severity} /></td>
                      <td className="text-ink-2 whitespace-nowrap">{c.assigneeName ?? c.owner}</td>
                      <td><CaseStatusChip status={c.status} /></td>
                      <td className="text-ink-2 whitespace-nowrap">{formatRelative(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <div className="grid xl:grid-cols-[1.4fr_1fr] gap-8">
          <div>
            <div className="eyebrow mb-3">Disbursed facilities</div>
            <Card padded={false}>
              {plans.length === 0 ? <EmptyState title="No active facilities" body="Disbursed loans and their repayment health appear here." /> : (
                <table className="data-table">
                  <thead><tr><th>Business</th><th>Application</th><th className="num">Outstanding</th><th>Next instalment</th><th>Health</th></tr></thead>
                  <tbody>
                    {plans.map(({ plan, business, application, next }) => (
                      <tr key={plan.id} className="row-link">
                        <td className="whitespace-nowrap"><Link href={`/bank/applications/${plan.applicationId}`} className="text-ink hover:text-link">{business.name}</Link></td>
                        <td className="tnum text-ink-2 whitespace-nowrap">{application.reference}</td>
                        <td className="num tnum">{formatNaira(plan.outstanding)}</td>
                        <td>{next ? <div className="flex items-center gap-2 whitespace-nowrap"><span className="tnum text-ink-2">{formatDate(next.dueDate, { day: "numeric", month: "short" })}</span><RepaymentStatusChip status={next.status} /></div> : "—"}</td>
                        <td><HealthChip health={plan.health} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
          <Card>
            <CardHeader eyebrow="Triggers" title="What opens a case" />
            <ul className="space-y-3 text-[13.5px] text-ink-2">
              <li><span className="text-ink font-medium">Repeated failed debit</span> · {policy.riskThresholds.failedDebitsAtRisk}+ failed collection attempts on an instalment</li>
              <li><span className="text-ink font-medium">Missed repayment</span> · instalment unpaid {policy.repaymentRules.graceDays} days after the window</li>
              <li><span className="text-ink font-medium">Reduced inflows</span> · 30-day inflows {Math.round(policy.riskThresholds.inflowDropWatchPct * 100)}% below baseline (watch), {Math.round(policy.riskThresholds.inflowDropAtRiskPct * 100)}% (at risk)</li>
              <li><span className="text-ink font-medium">Unusual transaction activity</span> · counterparties or amounts outside the observed pattern</li>
              <li><span className="text-ink font-medium">Significant change in cash-flow pattern</span> · settlement window shifts away from the mandate date</li>
              <li><span className="text-ink font-medium">Customer access report</span> · the SME flags an access event as unexpected</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
