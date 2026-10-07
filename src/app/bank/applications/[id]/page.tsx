import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { requireBankUser } from "@/server/auth";
import { loadReviewBundle } from "@/server/queries";
import { openApplicationForReview } from "@/server/bank";
import { can } from "@/lib/auth/roles";
import { isDemoMode } from "@/server/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Field, Stat, StatRow, Divider, ListHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationStatusChip, RatingChip, RiskGradeChip, Chip, RepaymentStatusChip, HealthChip } from "@/components/ui/Chip";
import { Banner, DemoTag } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Require } from "@/components/shell/Require";
import { CashFlowChart, InflowOutflowBars } from "@/components/charts/CashFlowChart";
import { RepaymentTimeline } from "@/components/charts/RepaymentTimeline";
import { FactorRow } from "@/components/bank/FactorRow";
import { DecisionActions, DisbursementActions, RepaymentActions } from "@/components/bank/ReviewActions";
import { EVENT_LABELS } from "@/lib/domain/labels";
import { formatNaira, formatNairaCompact, formatDate, formatDateTime, formatRelative, formatWindow, formatTime } from "@/lib/format";

export default async function BankApplicationReview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ approved?: string }> }) {
  const { id } = await params;
  const { approved } = await searchParams;
  const user = await requireBankUser("bank:review_application");
  // Opening a review is itself an audited data-access event.
  try { await openApplicationForReview(user, id); } catch { /* not found; handled below */ }
  const data = await loadReviewBundle(id);
  if (!data) return <Card><EmptyState icon={FileText} title="Application not found" action={<Link href="/bank/applications"><Button size="sm">Back to queue</Button></Link>} /></Card>;
  const { app, business, connections, accounts, assessment, profile, offer, plan, repayments, documents, cases, events, policy } = data;
  const nextRepayment = repayments.find((r) => r.status === "scheduled" || r.status === "failed");
  const totalBalance = accounts.reduce((a, x) => a + x.balance, 0);
  const lastSynced = connections.map((c) => c.lastSyncedAt).filter(Boolean).sort().pop();
  const decidable = ["submitted", "under_review", "additional_information"].includes(app.status);
  const demo = isDemoMode();

  return (
    <>
      <Link href="/bank/applications" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink mb-3"><ArrowLeft size={13} /> Application queue</Link>
      <PageHeader
        eyebrow="Ìrètí / Credit Review"
        title={business.name}
        meta={<><ApplicationStatusChip status={app.status} health={plan?.health} /><span>Submitted {formatRelative(app.submittedAt)}</span>{app.reviewerName && <><span>·</span><span>Reviewer {app.reviewerName}</span></>}</>}
        actions={decidable ? <Require role={user.role} permission="bank:decide_application" inline label="Decisions require"><DecisionActions app={app} offer={offer} assessment={assessment} reviewerName={user.name} reviewerTitle={user.title ?? ""} /></Require> : undefined}
      />

      <Card className="mb-6">
        <StatRow columns={5}>
          <Stat label="Application" size="lg" value={<span className="tnum">{app.reference}</span>} sub={app.purpose} />
          <Stat label="Requested" size="lg" value={formatNaira(app.amount)} sub={`${app.tenorMonths} months`} />
          <Stat label="Eligibility" size="lg" value={formatNaira(assessment.eligibleAmount)} sub={`Recommended ${formatNairaCompact(assessment.recommendedAmount)}`} />
          <Stat label="Assessment" size="lg" value={<>{assessment.score} <span className="text-ink-3 text-[15px] font-medium">/ 100</span></>} sub={<><RatingChip rating={assessment.band} /><RiskGradeChip score={assessment.score} /></>} />
          <Stat label="Total repayable" size="lg" value={formatNaira(offer.totalRepayable)} sub={`${formatNaira(offer.instalmentAmount)} × ${offer.tenorMonths}, ${formatWindow(offer.repaymentWindow)}`} />
        </StatRow>
      </Card>

      {approved && app.status === "disbursement_pending" && app.decision && (
        <div className="mb-6"><Banner tone="success" title="Approval confirmed">Recorded in the audit ledger at {formatDateTime(app.decision.at)} by {app.decision.byName}. Next state: Preparing disbursement. Disbursement is a separate, explicitly initiated step and is only confirmed on a successful banking response.</Banner></div>
      )}
      {app.status === "additional_information" && app.informationRequest && <div className="mb-6"><Banner tone="warning" title="Awaiting additional information from the applicant">{app.informationRequest.items.join(", ")} requested by {app.informationRequest.requestedByName} on {formatDateTime(app.informationRequest.requestedAt)}.</Banner></div>}
      {app.informationRequest?.respondedAt && app.status !== "additional_information" && <div className="mb-6"><Banner tone="info" title="Information provided">The applicant provided {app.informationRequest.items.join(", ")} on {formatDateTime(app.informationRequest.respondedAt)}.</Banner></div>}
      {app.status === "rejected" && app.decision && <div className="mb-6"><Banner tone="danger" title={`Declined by ${app.decision.byName} on ${formatDateTime(app.decision.at)}`}>{app.decision.note}</Banner></div>}

      {app.disbursement && (
        <Card className="mb-6">
          <CardHeader eyebrow="Disbursement" title={app.disbursement.status === "confirmed" ? "Disbursement confirmed" : app.disbursement.status === "failed" ? "Disbursement failed" : app.disbursement.status === "processing" ? "Initiating disbursement" : "Preparing disbursement"} action={<DemoTag>Demo disbursement</DemoTag>} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <Field label="Amount"><span className="tnum font-medium">{formatNaira(app.amount)}</span></Field>
            <Field label="Destination account"><span className="tnum">{app.disbursement.institutionName} {app.disbursement.destinationMasked}</span></Field>
            <Field label="Approved">{app.decision ? `${formatDateTime(app.decision.at)} · ${app.decision.byName}` : "—"}</Field>
            <Field label="Attempts"><span className="tnum">{app.disbursement.attempts}</span></Field>
            <Field label="Status">{app.disbursement.status === "confirmed" ? <Chip family="success" style="solid">Confirmed</Chip> : app.disbursement.status === "failed" ? <Chip family="danger">Failed</Chip> : app.disbursement.status === "processing" ? <Chip family="info" dot>Processing</Chip> : <Chip family="neutral">Pending</Chip>}</Field>
          </div>
          {app.disbursement.status === "confirmed" && (
            <div className="mt-5 pt-5 border-t border-line-subtle grid grid-cols-2 md:grid-cols-4 gap-6">
              <Field label="Timestamp">{formatDateTime(app.disbursement.confirmedAt!)}</Field>
              <Field label="Reference"><span className="tnum font-mono text-[13px]">{app.disbursement.reference}</span></Field>
              {plan && <Field label="Mandate"><span className="tnum font-mono text-[13px]">{plan.mandateReference}</span></Field>}
              {plan && repayments[0] && <Field label="First repayment">{formatDate(repayments[0].dueDate)}</Field>}
            </div>
          )}
          {app.disbursement.status === "failed" && <div className="mt-5"><Banner tone="danger" title="Reason">{app.disbursement.failureReason}</Banner></div>}
          {app.disbursement.status !== "confirmed" && (
            <div className="mt-5 pt-5 border-t border-line-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-[13px] text-ink-3">Disbursement is only shown as confirmed when the banking adapter returns a successful response.</p>
              <Require role={user.role} permission="bank:manage_disbursement" inline label="Disbursement requires"><DisbursementActions applicationId={app.id} status={app.disbursement.status} demoMode={demo} /></Require>
            </div>
          )}
        </Card>
      )}

      {plan && (
        <Card className="mb-6">
          <CardHeader eyebrow="Repayment" title="Repayment plan" action={<HealthChip health={plan.health} />} />
          <StatRow columns={4}>
            <Stat label="Outstanding" value={formatNaira(plan.outstanding)} sub={`Paid ${formatNaira(plan.paidToDate)}`} />
            <Stat label="Next instalment" value={nextRepayment ? formatNaira(nextRepayment.amount) : "—"} sub={nextRepayment ? <RepaymentStatusChip status={nextRepayment.status} /> : "Settled"} />
            <Stat label="Due" value={nextRepayment ? formatDate(nextRepayment.dueDate) : "—"} sub={nextRepayment ? `Window ${new Date(nextRepayment.windowStart).getDate()}–${new Date(nextRepayment.windowEnd).getDate()}` : undefined} />
            <Stat label="Instalments" value={`${repayments.filter((r) => r.status === "paid").length} / ${repayments.length}`} sub={`${repayments.filter((r) => r.status === "failed").length} failed`} />
          </StatRow>
          <div className="mt-6"><RepaymentTimeline repayments={repayments} /></div>
          {nextRepayment && (
            <div className="mt-6 pt-5 border-t border-line-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-[13px] text-ink-3">Collections run through the direct-debit mandate on the due date.{demo ? " In this environment the next debit can be triggered here." : ""}</p>
              <Require role={user.role} permission="bank:process_repayment" inline label="Collections require"><RepaymentActions repaymentId={nextRepayment.id} failed={nextRepayment.status === "failed"} demoMode={demo} /></Require>
            </div>
          )}
          {cases.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{cases.map((c) => <Link key={c.id} href={`/bank/monitoring/${c.id}`}><Chip family={c.status === "resolved" ? "neutral" : "warning"}>{c.reference} · {c.trigger} · {c.status}</Chip></Link>)}</div>}
        </Card>
      )}

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Business overview" title={business.name} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              <Field label="Business name">{business.name}</Field>
              <Field label="Industry">{business.industry}</Field>
              <Field label="CAC status"><span className="inline-flex items-center gap-2"><span className="tnum">{business.cacNumber}</span><Chip family="success">{business.cacStatus}</Chip></span></Field>
              <Field label="Years operating"><span className="tnum">{business.yearsOperating}</span></Field>
              <Field label="Location">{business.location}</Field>
              <Field label="Application date">{formatDate(app.submittedAt)}</Field>
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow="Financial overview" title="Revenue, expenses and net cash flow" description={`${profile.coverageMonths} months of consolidated transactions. The most recent three months are weighted more heavily in the analysis.`} />
            <CashFlowChart monthly={profile.monthly} />
            <Divider />
            <StatRow columns={4}>
              <Stat label="Avg monthly inflow" value={formatNairaCompact(profile.avgMonthlyInflow)} sub={<RatingChip rating={profile.revenueConsistency} />} />
              <Stat label="Avg monthly outflow" value={formatNairaCompact(profile.avgMonthlyOutflow)} sub={`Expense ratio ${Math.round(profile.expenseRatio * 100)}%`} />
              <Stat label="Avg net monthly flow" value={formatNairaCompact(profile.avgNetMonthlyFlow)} sub={`${profile.positiveNetMonths} of ${profile.coverageMonths} months positive`} />
              <Stat label="Recent trend" value={<span className={profile.recentInflowChangePct >= 0 ? "text-[var(--delta-positive)]" : "text-[var(--delta-negative)]"}>{profile.recentInflowChangePct >= 0 ? "+" : "−"}{Math.abs(Math.round(profile.recentInflowChangePct * 100))}%</span>} sub="Last 3 months vs prior 9" />
            </StatRow>
            <Divider />
            <div className="eyebrow mb-3">Monthly inflow / outflow comparison</div>
            <InflowOutflowBars monthly={profile.monthly} height={180} />
          </Card>
          <Card padded={false}>
            <ListHeader eyebrow="Credit assessment" description={`Proprietary assessment · model ${assessment.modelVersion} · policy ${assessment.policyVersion} · generated ${formatDateTime(assessment.generatedAt)}`} action={<><span className="tnum text-[26px] font-semibold text-ink">{assessment.score}<span className="text-ink-3 text-[14px] font-medium"> / 100</span></span><DemoTag>Demo credit assessment</DemoTag></>} />
            <ul className="divide-y divide-line-subtle">{assessment.factors.map((f) => <FactorRow key={f.key} factor={f} />)}</ul>
            <div className="px-6 py-4 border-t border-line-subtle bg-sunken">
              <div className="eyebrow mb-2">Policy evaluation · {assessment.policyPassed ? "all checks passed" : `${assessment.policyChecks.filter((c) => !c.passed).length} exception(s)`}</div>
              <div className="flex flex-wrap gap-2">{assessment.policyChecks.map((c) => <Chip key={c.label} family={c.passed ? "success" : "warning"} title={c.detail}>{c.label}</Chip>)}</div>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Decision support" title={assessment.recommendation.headline} description="The system provides a recommendation; the bank officer remains responsible for the lending decision." />
            <div className="flex items-center gap-3 mb-4">
              <Chip family={assessment.recommendation.action === "approve" ? "success" : assessment.recommendation.action === "review" ? "warning" : "danger"}>{assessment.recommendation.action === "approve" ? "Recommend approve" : assessment.recommendation.action === "review" ? "Recommend review" : "Recommend decline"}</Chip>
              <span className="text-[13px] text-ink-3">Confidence <span className="text-ink font-medium">{assessment.recommendation.confidence}</span></span>
            </div>
            <div className="eyebrow mb-2">Reasoning</div>
            <ul className="list-disc pl-5 space-y-1.5 text-[14px] text-ink-2">{assessment.recommendation.reasoning.map((r) => <li key={r}>{r}</li>)}</ul>
            <Divider />
            <div className="eyebrow mb-2">Risk observations</div>
            <ul className="list-disc pl-5 space-y-1.5 text-[14px] text-ink-2">{assessment.riskObservations.map((r) => <li key={r}>{r}</li>)}</ul>
            <Divider />
            <div className="eyebrow mb-2">Repayment observations</div>
            <ul className="list-disc pl-5 space-y-1.5 text-[14px] text-ink-2">{assessment.repaymentObservations.map((r) => <li key={r}>{r}</li>)}</ul>
          </Card>
          <Card>
            <CardHeader eyebrow="Account exposure" title={`${connections.filter((c) => c.status === "connected").length} institutions connected`} />
            <ul className="divide-y divide-line-subtle">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3 first:pt-0">
                  <div><div className="text-[14px] text-ink">{a.institutionName}</div><div className="text-[12.5px] text-ink-3 tnum mt-0.5">{a.accountNumberMasked} · {a.accountType}</div></div>
                  <span className="tnum text-[14px] text-ink">{formatNairaCompact(a.balance, 2)}</span>
                </li>
              ))}
            </ul>
            <Divider />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Total observed balance"><span className="tnum font-medium">{formatNairaCompact(totalBalance, 2)}</span></Field>
              <Field label="Transaction coverage"><span className="tnum">{profile.coverageMonths} months</span></Field>
              <Field label="Last synced">{lastSynced ? formatRelative(lastSynced).split(",")[0] : "—"}</Field>
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow="Documents" title={documents.length ? `${documents.length} on file` : "No documents requested"} />
            {documents.length === 0 ? <p className="text-[13.5px] text-ink-3">Required documents per policy: {policy.requiredDocuments.join(", ")}. Verified at onboarding.</p> : (
              <ul className="space-y-2.5">{documents.map((d) => <li key={d.id} className="flex items-center justify-between text-[14px]"><span className="text-ink">{d.type}</span><Chip family={d.status === "requested" ? "warning" : "success"}>{d.status === "requested" ? "Requested" : d.status === "provided" ? "Provided" : "Verified"}</Chip></li>)}</ul>
            )}
          </Card>
          <Card padded={false}>
            <ListHeader eyebrow="Application events" />
            <ul className="divide-y divide-line-subtle max-h-[440px] overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="px-6 py-2.5 flex items-start gap-4 text-[13px]">
                  <span className="tnum text-ink-3 shrink-0 w-[104px]">{formatDate(e.timestamp, { day: "2-digit", month: "short" })} {formatTime(e.timestamp)}</span>
                  <span className="flex-1 min-w-0"><span className="text-ink">{EVENT_LABELS[e.type]}</span><span className="text-ink-3"> · {e.actorName}</span></span>
                  <span className="tnum text-[11.5px] text-ink-4 font-mono">#{e.seq}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      {!can(user.role, "bank:decide_application") && decidable && <p className="sr-only">Decision actions are limited to credit officers and administrators.</p>}
    </>
  );
}
