"use client";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat } from "@/components/ui/Card";
import { HealthChip, SeverityChip, CaseStatusChip, RepaymentStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Require } from "@/components/shell/Require";
import { formatNaira, formatDate, formatRelative } from "@/lib/format";

export default function MonitoringPage() {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const plans = db.plans.filter((p) => p.health !== "completed");
  const counts = { healthy: plans.filter((p) => p.health === "healthy").length, watch: plans.filter((p) => p.health === "watch").length, at_risk: plans.filter((p) => p.health === "at_risk").length };
  const openCases = db.cases.filter((c) => c.status !== "resolved").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const resolved = db.cases.filter((c) => c.status === "resolved").length;

  return (
    <Require permission="bank:view_risk">
      <PageHeader eyebrow="Ìrètí / Monitoring" title="Portfolio monitoring" description="Health of disbursed facilities and the risk cases raised from repayment, inflow and activity triggers. No collections decision is taken automatically; each trigger opens a case for a person." />
      <Card className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 xl:divide-x divide-line-subtle [&>*:not(:first-child)]:xl:pl-6">
          <Stat label="Active facilities" size="lg" value={plans.length} sub={`${formatNaira(plans.reduce((a, p) => a + p.outstanding, 0))} outstanding`} />
          <Stat label="Healthy" size="lg" value={counts.healthy} sub={<HealthChip health="healthy" />} />
          <Stat label="Watch" size="lg" value={counts.watch} sub={<HealthChip health="watch" />} />
          <Stat label="At risk" size="lg" value={counts.at_risk} sub={<HealthChip health="at_risk" />} />
          <Stat label="Open cases" size="lg" value={openCases.length} sub={`${resolved} resolved`} />
        </div>
      </Card>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
        <div>
          <CardHeader eyebrow="Risk cases" title="Open cases" />
          <Card padded={false}>
            {openCases.length === 0 ? (
              <EmptyState icon={Radar} title="No risk cases" body="Cases open automatically when a trigger fires: missed or failed repayment, reduced inflows, unusual activity, or a customer access report." />
            ) : (
              <table className="data-table">
                <thead><tr><th>Case</th><th>Business</th><th>Trigger</th><th>Severity</th><th>Owner</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {openCases.map((c) => {
                    const b = db.businesses.find((x) => x.id === c.businessId);
                    return (
                      <tr key={c.id} className="row-link" onClick={() => router.push(`/bank/monitoring/${c.id}`)}>
                        <td className="tnum font-medium text-ink">{c.reference}</td>
                        <td className="text-ink">{b?.name}</td>
                        <td className="text-ink-2">{c.trigger}</td>
                        <td><SeverityChip severity={c.severity} /></td>
                        <td className="text-ink-2">{c.assigneeName ?? c.owner}</td>
                        <td><CaseStatusChip status={c.status} /></td>
                        <td className="text-ink-2 whitespace-nowrap">{formatRelative(c.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
          <div className="mt-4">
            <CardHeader eyebrow="Triggers" title="What opens a case" />
            <Card>
              <ul className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-[13px] text-ink-2">
                <li><span className="text-ink font-medium">Repeated failed debit</span> · {db.policy.riskThresholds.failedDebitsAtRisk}+ failed collection attempts on an instalment</li>
                <li><span className="text-ink font-medium">Missed repayment</span> · instalment unpaid {db.policy.repaymentRules.graceDays} days after the window</li>
                <li><span className="text-ink font-medium">Reduced inflows</span> · 30-day inflows {Math.round(db.policy.riskThresholds.inflowDropWatchPct * 100)}% below baseline (watch), {Math.round(db.policy.riskThresholds.inflowDropAtRiskPct * 100)}% (at risk)</li>
                <li><span className="text-ink font-medium">Unusual transaction activity</span> · counterparties or amounts outside observed pattern</li>
                <li><span className="text-ink font-medium">Significant change in cash-flow pattern</span> · settlement window shifts away from the mandate date</li>
                <li><span className="text-ink font-medium">Customer access report</span> · the SME flags an access event as unexpected</li>
              </ul>
            </Card>
          </div>
        </div>
        <div>
          <CardHeader eyebrow="Facilities" title="Disbursed facilities" />
          <Card padded={false}>
            {plans.length === 0 ? (
              <EmptyState title="No active facilities" body="Disbursed loans and their repayment health appear here." />
            ) : (
              <table className="data-table">
                <thead><tr><th>Business</th><th className="num">Outstanding</th><th>Next</th><th>Health</th></tr></thead>
                <tbody>
                  {plans.map((p) => {
                    const app = db.applications.find((a) => a.id === p.applicationId);
                    const b = db.businesses.find((x) => x.id === p.businessId);
                    const next = db.repayments.filter((r) => r.planId === p.id).sort((a, c) => a.sequence - c.sequence).find((r) => r.status !== "paid");
                    return (
                      <tr key={p.id} className="row-link" onClick={() => router.push(`/bank/applications/${p.applicationId}`)}>
                        <td>
                          <div className="text-ink">{b?.name}</div>
                          <div className="text-[12px] text-ink-3 tnum">{app?.reference}</div>
                        </td>
                        <td className="num tnum">{formatNaira(p.outstanding)}</td>
                        <td>
                          {next ? (
                            <div className="flex items-center gap-2">
                              <span className="tnum text-ink-2">{formatDate(next.dueDate, { day: "numeric", month: "short" })}</span>
                              <RepaymentStatusChip status={next.status} />
                            </div>
                          ) : "—"}
                        </td>
                        <td><HealthChip health={p.health} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </Require>
  );
}
