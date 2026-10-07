"use client";
import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { FactorRow } from "@/components/bank/FactorRow";
import { useAdebayo } from "@/hooks/useAdebayo";
import { useStore } from "@/lib/store/store";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat, Field, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RatingChip, Chip, ApplicationStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoTag } from "@/components/ui/Banner";
import { formatNaira, formatRelative, formatWindow, formatPercent } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

export default function CreditProfilePage() {
  const { assessment, profile, activeApplication } = useAdebayo();
  const policy = useStore((s) => s.db.policy);

  if (!assessment || !profile) {
    return (
      <>
        <PageHeader eyebrow="Credit profile" title="Proprietary credit assessment" />
        <Card><EmptyState icon={Gauge} title="No credit assessment yet" body="Complete onboarding and run the financial analysis to generate your assessment." action={<Link href="/sme/onboarding"><Button variant="primary" size="sm">Go to onboarding</Button></Link>} /></Card>
      </>
    );
  }

  const canApply = !activeApplication || activeApplication.status === "rejected";

  return (
    <>
      <PageHeader eyebrow="Credit profile" title="Proprietary credit assessment" description="This assessment is generated from the financial data available through connected accounts and the configured credit-assessment model. It is not a regulated credit-bureau score." actions={<DemoTag>Demo credit assessment</DemoTag>} meta={<><span>Model {assessment.modelVersion}</span><span>·</span><span>Policy {assessment.policyVersion}</span><span>·</span><span>Generated {formatRelative(assessment.generatedAt)}</span></>} />

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4">
        <div className="space-y-4">
          <Card>
            <div className="eyebrow">Credit profile</div>
            <div className="flex items-end gap-3 mt-1">
              <span className="tnum text-[44px] leading-none font-semibold text-ink">{assessment.score}</span>
              <span className="text-[18px] text-ink-3 pb-1">/ 100</span>
              <span className="pb-1.5"><RatingChip rating={assessment.band} /></span>
            </div>
            <Divider className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Eligible lending amount" size="lg" value={formatNaira(assessment.eligibleAmount)} />
              <Stat label="Recommended amount" size="lg" value={formatNaira(assessment.recommendedAmount)} />
              <Stat label="Recommended tenor" value={`${assessment.recommendedTenorMonths} months`} />
              <Stat label="Recommended repayment window" value={formatWindow(assessment.repaymentWindow)} sub={`Recommended date: ${ordinal(assessment.recommendedRepaymentDay)}`} />
            </div>
            <Divider className="my-4" />
            <p className="text-[13px] text-ink-2">The recommended repayment window aligns with the applicant&apos;s strongest recurring inflow period. Eligibility is derived from annualised net cash flow, the configured capacity ratio of {formatPercent(policy.eligibility.capacityRatio)}, the assessment score and existing obligations, capped at the bank&apos;s maximum of {formatNaira(policy.maxLoanAmount)}.</p>
            <div className="mt-4 flex items-center gap-3">
              {canApply ? (
                <Link href="/sme/application"><Button variant="primary">Apply for credit <ArrowRight size={14} /></Button></Link>
              ) : (
                <>
                  <Link href={`/sme/application/${activeApplication!.id}`}><Button>View application {activeApplication!.reference}</Button></Link>
                  <ApplicationStatusChip status={activeApplication!.status} />
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Policy evaluation" title={assessment.policyPassed ? "Within configured lending policy" : "Policy exceptions present"} />
            <ul className="space-y-2">
              {assessment.policyChecks.map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <Chip family={c.passed ? "success" : "warning"} className="mt-0.5 shrink-0">{c.passed ? "Pass" : "Review"}</Chip>
                  <div>
                    <div className="text-[13px] text-ink">{c.label}</div>
                    <div className="text-[12.5px] text-ink-3">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card padded={false}>
            <div className="px-4 py-3 border-b border-line-subtle">
              <div className="eyebrow">Contributing factors</div>
              <div className="text-[13px] text-ink-2 mt-0.5">Each factor is weighted by the configured model. Expand a factor to see the evidence behind it.</div>
            </div>
            <ul className="divide-y divide-line-subtle">
              {assessment.factors.map((f) => <FactorRow key={f.key} factor={f} />)}
            </ul>
          </Card>

          <Card>
            <CardHeader eyebrow="Repayment observations" title="Cash-flow-aware repayment" />
            <ul className="space-y-1.5 text-[13px] text-ink-2 list-disc pl-4">
              {assessment.repaymentObservations.map((o) => <li key={o}>{o}</li>)}
            </ul>
            <p className="text-[12.5px] text-ink-3 mt-3">Repayment timing is recommended from observed cash-flow behaviour. It does not guarantee future account balance or repayment success.</p>
          </Card>

          <Card>
            <CardHeader eyebrow="Risk observations" title="What the assessment noted" />
            <ul className="space-y-1.5 text-[13px] text-ink-2 list-disc pl-4">
              {assessment.riskObservations.map((o) => <li key={o}>{o}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
