import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat, Divider, ListHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RatingChip, Chip, ApplicationStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { FactorRow } from "@/components/bank/FactorRow";
import { formatNaira, formatRelative, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

export default async function CreditProfilePage() {
  const user = await requireSmeUser();
  const { assessment, profile, activeApplication } = await loadSmeBundle(user);

  if (!assessment || !profile) {
    return (
      <>
        <PageHeader title="Credit profile" />
        <Card><EmptyState icon={Gauge} title="No credit assessment yet" body="Complete onboarding and run the financial analysis to generate your assessment." action={<Link href="/sme/onboarding"><Button variant="primary" size="sm">Go to onboarding</Button></Link>} /></Card>
      </>
    );
  }
  const canApply = !activeApplication || activeApplication.status === "rejected";

  return (
    <>
      <PageHeader title="Credit profile" meta={<><span>Proprietary assessment · not a credit-bureau score</span><span>·</span><span>Model {assessment.modelVersion}</span><span>·</span><span>Policy {assessment.policyVersion}</span><span>·</span><span>{formatRelative(assessment.generatedAt)}</span></>} />
      <div className="grid xl:grid-cols-[1fr_1.25fr] gap-6">
        <div className="space-y-6">
          <Card>
            <div className="eyebrow">Credit profile</div>
            <div className="flex items-end gap-3 mt-2">
              <span className="tnum text-[48px] leading-none font-semibold text-ink">{assessment.score}</span>
              <span className="text-[18px] text-ink-3 pb-1">/ 100</span>
              <span className="pb-2"><RatingChip rating={assessment.band} /></span>
            </div>
            <Divider />
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <Stat label="Eligible amount" size="lg" value={formatNaira(assessment.eligibleAmount)} />
              <Stat label="Recommended amount" size="lg" value={formatNaira(assessment.recommendedAmount)} />
              <Stat label="Recommended tenor" value={`${assessment.recommendedTenorMonths} months`} />
              <Stat label="Repayment window" value={formatWindow(assessment.repaymentWindow)} sub={`Recommended date: ${ordinal(assessment.recommendedRepaymentDay)}`} />
            </div>
            <Divider />
            <div className="flex items-center gap-3">
              {canApply ? <Link href="/sme/application"><Button variant="primary">Apply for credit <ArrowRight size={14} /></Button></Link> : <><Link href={`/sme/application/${activeApplication!.id}`}><Button>View application {activeApplication!.reference}</Button></Link><ApplicationStatusChip status={activeApplication!.status} /></>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Policy evaluation" action={<Chip family={assessment.policyPassed ? "success" : "warning"}>{assessment.policyPassed ? "Within policy" : "Exceptions"}</Chip>} />
            <ul className="space-y-3">
              {assessment.policyChecks.map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <Chip family={c.passed ? "success" : "warning"} className="mt-0.5 shrink-0">{c.passed ? "Pass" : "Review"}</Chip>
                  <div><div className="text-[14px] text-ink">{c.label}</div><div className="text-[13px] text-ink-3 mt-0.5">{c.detail}</div></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card padded={false}>
            <ListHeader title="Contributing factors" />
            <ul className="divide-y divide-line-subtle">{assessment.factors.map((f) => <FactorRow key={f.key} factor={f} />)}</ul>
          </Card>
          <Card>
            <CardHeader title="Repayment observations" />
            <ul className="space-y-2 text-[14px] text-ink-2 list-disc pl-5">{assessment.repaymentObservations.map((o) => <li key={o}>{o}</li>)}</ul>
          </Card>
          <Card>
            <CardHeader title="Risk observations" />
            <ul className="space-y-2 text-[14px] text-ink-2 list-disc pl-5">{assessment.riskObservations.map((o) => <li key={o}>{o}</li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
