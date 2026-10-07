"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { can } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Field, Stat, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationStatusChip, RatingChip, RiskGradeChip, Chip, RepaymentStatusChip, HealthChip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Banner, DemoTag } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Checkbox, Label, Textarea } from "@/components/ui/Input";
import { Require } from "@/components/shell/Require";
import { CashFlowChart, InflowOutflowBars } from "@/components/charts/CashFlowChart";
import { RepaymentTimeline } from "@/components/charts/RepaymentTimeline";
import { FactorRow } from "@/components/bank/FactorRow";
import { INFORMATION_ITEMS, EVENT_LABELS } from "@/lib/domain/labels";
import { formatNaira, formatNairaCompact, formatDate, formatDateTime, formatRelative, formatWindow, formatTime } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

export default function BankApplicationReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useStore((s) => s.db);
  const user = useStore((s) => s.currentBankUser());
  const open = useStore((s) => s.openApplicationForReview);
  const requestInfo = useStore((s) => s.requestInformation);
  const approve = useStore((s) => s.approveApplication);
  const reject = useStore((s) => s.rejectApplication);
  const disburse = useStore((s) => s.initiateDisbursement);
  const escalateDisb = useStore((s) => s.escalateDisbursement);
  const processRepayment = useStore((s) => s.processRepayment);

  const app = db.applications.find((a) => a.id === id);
  const canReview = can(user.role, "bank:review_application");

  useEffect(() => {
    if (app && canReview) open(app.id);
    // Record access once per visit (deduplicated in the store).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user.id]);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItems, setInfoItems] = useState<string[]>([]);
  const [infoMessage, setInfoMessage] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveState, setApproveState] = useState<"idle" | "submitting" | "confirmed">("idle");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [disbState, setDisbState] = useState<"idle" | "processing">("idle");
  const [repBusy, setRepBusy] = useState(false);

  if (!app) return <Card><EmptyState icon={FileText} title="Application not found" action={<Link href="/bank/applications"><Button size="sm">Back to queue</Button></Link>} /></Card>;
  if (!canReview) return <Require permission="bank:review_application"><div /></Require>;

  const business = db.businesses.find((b) => b.id === app.businessId)!;
  const assessment = db.assessments.find((a) => a.id === app.assessmentId)!;
  const profile = db.profiles.find((p) => p.id === assessment.profileId) ?? db.profiles.find((p) => p.businessId === app.businessId)!;
  const offer = db.offers.find((o) => o.id === app.offerId)!;
  const accounts = db.accounts.filter((a) => a.businessId === app.businessId);
  const connections = db.connections.filter((c) => c.businessId === app.businessId);
  const plan = app.repaymentPlanId ? db.plans.find((p) => p.id === app.repaymentPlanId) : undefined;
  const repayments = plan ? db.repayments.filter((r) => r.planId === plan.id).sort((a, b) => a.sequence - b.sequence) : [];
  const nextRepayment = repayments.find((r) => r.status === "scheduled" || r.status === "failed");
  const events = db.auditEvents.filter((e) => e.applicationId === app.id).sort((a, b) => b.seq - a.seq);
  const documents = db.documents.filter((d) => d.applicationId === app.id);
  const cases = db.cases.filter((c) => c.applicationId === app.id);
  const totalBalance = accounts.reduce((a, x) => a + x.balance, 0);
  const lastSynced = connections.map((c) => c.lastSyncedAt).filter(Boolean).sort().pop();
  const decidable = app.status === "under_review" || app.status === "additional_information" || app.status === "submitted";

  const onConfirmApprove = async () => {
    setApproveState("submitting");
    await approve(app.id);
    setApproveState("confirmed");
  };
  const onDisburse = async (force?: "success" | "failure") => {
    setDisbState("processing");
    await disburse(app.id, force);
    setDisbState("idle");
  };

  return (
    <>
      <Link href="/bank/applications" className="inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink mb-2"><ArrowLeft size={13} /> Application queue</Link>
      <PageHeader
        eyebrow="Ìrètí / Credit Review"
        title={business.name}
        meta={<><ApplicationStatusChip status={app.status} health={plan?.health} /><span>Submitted {formatRelative(app.submittedAt)}</span>{app.reviewerName && <><span>·</span><span>Reviewer {app.reviewerName}</span></>}</>}
        actions={
          decidable ? (
            <Require permission="bank:decide_application" inline label="Decisions require">
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
              <Button onClick={() => setInfoOpen(true)} disabled={app.status === "additional_information" && !app.informationRequest?.respondedAt}>Request information</Button>
              <Button variant="primary" onClick={() => { setApproveState("idle"); setApproveOpen(true); }}>Approve</Button>
            </Require>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 xl:divide-x divide-line-subtle [&>*:not(:first-child)]:xl:pl-6">
          <Stat label="Application" size="lg" value={<span className="tnum">{app.reference}</span>} sub={app.purpose} />
          <Stat label="Requested" size="lg" value={formatNaira(app.amount)} sub={`${app.tenorMonths} months`} />
          <Stat label="Eligibility" size="lg" value={formatNaira(assessment.eligibleAmount)} sub={`Recommended ${formatNairaCompact(assessment.recommendedAmount)}`} />
          <Stat label="Assessment" size="lg" value={<>{assessment.score} <span className="text-ink-3 text-[15px] font-medium">/ 100</span></>} sub={<span className="inline-flex items-center gap-2"><RatingChip rating={assessment.band} /><RiskGradeChip score={assessment.score} /></span>} />
          <Stat label="Total repayable" size="lg" value={formatNaira(offer.totalRepayable)} sub={`${formatNaira(offer.instalmentAmount)} × ${offer.tenorMonths}, ${formatWindow(offer.repaymentWindow)}`} />
        </div>
      </Card>

      {app.status === "additional_information" && app.informationRequest && (
        <div className="mb-4"><Banner tone="warning" title="Awaiting additional information from the applicant">{app.informationRequest.items.join(", ")} requested by {app.informationRequest.requestedByName} on {formatDateTime(app.informationRequest.requestedAt)}.</Banner></div>
      )}
      {app.informationRequest?.respondedAt && app.status !== "additional_information" && (
        <div className="mb-4"><Banner tone="info" title="Information provided">The applicant provided {app.informationRequest.items.join(", ")} on {formatDateTime(app.informationRequest.respondedAt)}.</Banner></div>
      )}
      {app.status === "rejected" && app.decision && <div className="mb-4"><Banner tone="danger" title={`Declined by ${app.decision.byName} on ${formatDateTime(app.decision.at)}`}>{app.decision.note}</Banner></div>}

      {/* Disbursement panel */}
      {(app.status === "approved" || app.status === "disbursement_pending" || app.status === "disbursement_failed" || app.status === "disbursed") && app.disbursement && (
        <Card className="mb-4">
          <CardHeader eyebrow="Disbursement" title={
            app.disbursement.status === "confirmed" ? "Disbursement confirmed" : app.disbursement.status === "failed" ? "Disbursement failed" : app.disbursement.status === "processing" ? "Initiating disbursement" : "Preparing disbursement"
          } action={<DemoTag>Demo disbursement</DemoTag>} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Field label="Amount"><span className="tnum font-medium">{formatNaira(app.amount)}</span></Field>
            <Field label="Destination account"><span className="tnum">{app.disbursement.institutionName} {app.disbursement.destinationMasked}</span></Field>
            <Field label="Approved">{app.decision ? `${formatDateTime(app.decision.at)} · ${app.decision.byName}` : "—"}</Field>
            <Field label="Attempts"><span className="tnum">{app.disbursement.attempts}</span></Field>
            <Field label="Status">
              {app.disbursement.status === "confirmed" && <Chip family="success" style="solid">Confirmed</Chip>}
              {app.disbursement.status === "failed" && <Chip family="danger">Failed</Chip>}
              {app.disbursement.status === "processing" && <Chip family="info" dot>Processing</Chip>}
              {app.disbursement.status === "pending" && <Chip family="neutral">Pending</Chip>}
            </Field>
          </div>
          {app.disbursement.status === "confirmed" && (
            <div className="mt-3 pt-3 border-t border-line-subtle grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Timestamp">{formatDateTime(app.disbursement.confirmedAt!)}</Field>
              <Field label="Reference"><span className="tnum font-mono text-[12.5px]">{app.disbursement.reference}</span></Field>
              {plan && <Field label="Mandate"><span className="tnum font-mono text-[12.5px]">{plan.mandateReference}</span></Field>}
              {plan && <Field label="First repayment">{formatDate(repayments[0].dueDate)}</Field>}
            </div>
          )}
          {app.disbursement.status === "failed" && (
            <div className="mt-3"><Banner tone="danger" title="Reason">{app.disbursement.failureReason}</Banner></div>
          )}
          {(app.disbursement.status === "pending" || app.disbursement.status === "failed" || app.disbursement.status === "processing") && (
            <div className="mt-3 pt-3 border-t border-line-subtle flex items-center justify-between gap-4">
              <p className="text-[12.5px] text-ink-3">Disbursement is only shown as confirmed when the banking adapter returns a successful response.</p>
              <Require permission="bank:manage_disbursement" inline label="Disbursement requires">
                <div className="flex items-center gap-2">
                  {app.disbursement.status === "failed" && <Button onClick={() => escalateDisb(app.id)}>Escalate to operations</Button>}
                  <Button variant="primary" loading={disbState === "processing" || app.disbursement.status === "processing"} onClick={() => onDisburse()}>
                    {app.disbursement.status === "failed" ? "Retry disbursement" : disbState === "processing" ? "Initiating disbursement" : "Initiate disbursement"}
                  </Button>
                </div>
              </Require>
            </div>
          )}
        </Card>
      )}

      {/* Repayment panel */}
      {plan && (
        <Card className="mb-4">
          <CardHeader eyebrow="Repayment" title="Repayment plan" action={<HealthChip health={plan.health} />} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat label="Outstanding" value={formatNaira(plan.outstanding)} sub={`Paid ${formatNaira(plan.paidToDate)}`} />
            <Stat label="Next instalment" value={nextRepayment ? formatNaira(nextRepayment.amount) : "—"} sub={nextRepayment ? <RepaymentStatusChip status={nextRepayment.status} /> : "Settled"} />
            <Stat label="Due" value={nextRepayment ? formatDate(nextRepayment.dueDate) : "—"} sub={nextRepayment ? `Window ${new Date(nextRepayment.windowStart).getDate()}–${new Date(nextRepayment.windowEnd).getDate()}` : undefined} />
            <Stat label="Instalments" value={`${repayments.filter((r) => r.status === "paid").length} / ${repayments.length}`} sub={`${repayments.filter((r) => r.status === "failed").length} failed`} />
          </div>
          <RepaymentTimeline repayments={repayments} />
          {nextRepayment && (
            <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between gap-4">
              <p className="text-[12.5px] text-ink-3">Collections run through the direct-debit mandate on the due date. In demo mode the next debit can be triggered here.</p>
              <Require permission="bank:process_repayment" inline label="Collections require">
                <Button loading={repBusy} onClick={async () => { setRepBusy(true); await processRepayment(nextRepayment.id); setRepBusy(false); }}>
                  {nextRepayment.status === "failed" ? "Retry debit" : "Process next repayment"}
                </Button>
              </Require>
            </div>
          )}
          {cases.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cases.map((c) => <Link key={c.id} href={`/bank/monitoring/${c.id}`}><Chip family={c.status === "resolved" ? "neutral" : "warning"}>{c.reference} · {c.trigger} · {c.status}</Chip></Link>)}
            </div>
          )}
        </Card>
      )}

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader eyebrow="Business overview" title={business.name} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Business name">{business.name}</Field>
              <Field label="Industry">{business.industry}</Field>
              <Field label="CAC status"><span className="inline-flex items-center gap-2"><span className="tnum">{business.cacNumber}</span><Chip family="success">{business.cacStatus}</Chip></span></Field>
              <Field label="Years operating"><span className="tnum">{business.yearsOperating}</span></Field>
              <Field label="Location">{business.location}</Field>
              <Field label="Application date">{formatDate(app.submittedAt)}</Field>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Financial overview" title="Revenue, expenses and net cash flow" description={`${profile.coverageMonths} months of consolidated transactions. Recent three months are weighted more heavily in the analysis.`} />
            <CashFlowChart monthly={profile.monthly} />
            <Divider className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Avg monthly inflow" value={formatNairaCompact(profile.avgMonthlyInflow)} sub={<RatingChip rating={profile.revenueConsistency} />} />
              <Stat label="Avg monthly outflow" value={formatNairaCompact(profile.avgMonthlyOutflow)} sub={`Expense ratio ${Math.round(profile.expenseRatio * 100)}%`} />
              <Stat label="Avg net monthly flow" value={formatNairaCompact(profile.avgNetMonthlyFlow)} sub={`${profile.positiveNetMonths} of ${profile.coverageMonths} months positive`} />
              <Stat label="Recent trend" value={<span className={profile.recentInflowChangePct >= 0 ? "text-[var(--delta-positive)]" : "text-[var(--delta-negative)]"}>{profile.recentInflowChangePct >= 0 ? "+" : "−"}{Math.abs(Math.round(profile.recentInflowChangePct * 100))}%</span>} sub="Last 3 months vs prior 9" />
            </div>
            <Divider className="my-4" />
            <div className="eyebrow mb-2">Monthly inflow / outflow comparison</div>
            <InflowOutflowBars monthly={profile.monthly} height={180} />
          </Card>

          <Card padded={false}>
            <div className="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
              <div>
                <div className="eyebrow">Credit assessment</div>
                <div className="text-[13px] text-ink-2 mt-0.5">Proprietary assessment · model {assessment.modelVersion} · policy {assessment.policyVersion} · generated {formatDateTime(assessment.generatedAt)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tnum text-[24px] font-semibold text-ink">{assessment.score}<span className="text-ink-3 text-[14px] font-medium"> / 100</span></span>
                <DemoTag>Demo credit assessment</DemoTag>
              </div>
            </div>
            <ul className="divide-y divide-line-subtle">
              {assessment.factors.map((f) => <FactorRow key={f.key} factor={f} />)}
            </ul>
            <div className="px-4 py-3 border-t border-line-subtle bg-sunken">
              <div className="eyebrow mb-1.5">Policy evaluation · {assessment.policyPassed ? "all checks passed" : `${assessment.policyChecks.filter((c) => !c.passed).length} exception(s)`}</div>
              <div className="flex flex-wrap gap-1.5">
                {assessment.policyChecks.map((c) => <Chip key={c.label} family={c.passed ? "success" : "warning"} title={c.detail}>{c.label}</Chip>)}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader eyebrow="Decision support" title={assessment.recommendation.headline} description="The system provides a recommendation; the bank officer remains responsible for the lending decision." />
            <div className="flex items-center gap-2 mb-3">
              <Chip family={assessment.recommendation.action === "approve" ? "success" : assessment.recommendation.action === "review" ? "warning" : "danger"}>
                {assessment.recommendation.action === "approve" ? "Recommend approve" : assessment.recommendation.action === "review" ? "Recommend review" : "Recommend decline"}
              </Chip>
              <span className="text-[12.5px] text-ink-3">Confidence: <span className="text-ink font-medium">{assessment.recommendation.confidence}</span></span>
            </div>
            <div className="eyebrow mb-1">Reasoning</div>
            <ul className="list-disc pl-4 space-y-1 text-[13px] text-ink-2">
              {assessment.recommendation.reasoning.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <Divider className="my-3" />
            <div className="eyebrow mb-1">Risk observations</div>
            <ul className="list-disc pl-4 space-y-1 text-[13px] text-ink-2">
              {assessment.riskObservations.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <Divider className="my-3" />
            <div className="eyebrow mb-1">Repayment observations</div>
            <ul className="list-disc pl-4 space-y-1 text-[13px] text-ink-2">
              {assessment.repaymentObservations.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </Card>

          <Card>
            <CardHeader eyebrow="Account exposure" title={`${connections.filter((c) => c.status === "connected").length} institutions connected`} />
            <ul className="divide-y divide-line-subtle">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 first:pt-0">
                  <div>
                    <div className="text-[13.5px] text-ink">{a.institutionName}</div>
                    <div className="text-[12px] text-ink-3 tnum">{a.accountNumberMasked} · {a.accountType}</div>
                  </div>
                  <span className="tnum text-[13.5px] text-ink">{formatNairaCompact(a.balance, 2)}</span>
                </li>
              ))}
            </ul>
            <Divider className="my-3" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Total observed balance"><span className="tnum font-medium">{formatNairaCompact(totalBalance, 2)}</span></Field>
              <Field label="Transaction coverage"><span className="tnum">{profile.coverageMonths} months</span></Field>
              <Field label="Last synced">{lastSynced ? formatRelative(lastSynced).split(",")[0] : "—"}</Field>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Documents" title={documents.length ? `${documents.length} on file` : "No documents requested"} />
            {documents.length === 0 ? (
              <p className="text-[13px] text-ink-3">Required documents per policy: {db.policy.requiredDocuments.join(", ")}. Verified at onboarding.</p>
            ) : (
              <ul className="space-y-1.5">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-[13px]">
                    <span className="text-ink">{d.type}</span>
                    <Chip family={d.status === "requested" ? "warning" : "success"}>{d.status === "requested" ? "Requested" : d.status === "provided" ? "Provided" : "Verified"}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded={false}>
            <div className="px-4 py-3 border-b border-line-subtle"><div className="eyebrow">Application events</div></div>
            <ul className="divide-y divide-line-subtle max-h-[420px] overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="px-4 py-2 flex items-start gap-3 text-[12.5px]">
                  <span className="tnum text-ink-3 shrink-0 w-[100px]">{formatDate(e.timestamp, { day: "2-digit", month: "short" })} {formatTime(e.timestamp)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-ink">{EVENT_LABELS[e.type]}</span>
                    <span className="text-ink-3"> · {e.actorName}</span>
                  </span>
                  <span className="tnum text-[11px] text-ink-4 font-mono">#{e.seq}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Request information modal */}
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} eyebrow="Bank review" title="Request additional information" footer={<><Button onClick={() => setInfoOpen(false)}>Cancel</Button><Button variant="primary" disabled={infoItems.length === 0} onClick={() => { requestInfo(app.id, infoItems, infoMessage.trim() || undefined); setInfoOpen(false); setInfoItems([]); setInfoMessage(""); }}>Send request</Button></>}>
        <div className="space-y-2.5">
          {INFORMATION_ITEMS.map((item) => (
            <Checkbox key={item} checked={infoItems.includes(item)} onChange={(v) => setInfoItems(v ? [...infoItems, item] : infoItems.filter((i) => i !== item))} label={item} />
          ))}
        </div>
        <div className="mt-4">
          <Label>Message to applicant (optional)</Label>
          <Textarea value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)} placeholder="Describe what is needed and why." />
        </div>
      </Modal>

      {/* Approve modal */}
      <Modal open={approveOpen} onClose={() => approveState !== "submitting" && setApproveOpen(false)} eyebrow="Approve application" title={approveState === "confirmed" ? "Approval confirmed" : `Approve ${formatNaira(app.amount)}`} footer={
        approveState === "confirmed" ? (
          <Button variant="primary" onClick={() => setApproveOpen(false)}>Done</Button>
        ) : (
          <><Button onClick={() => setApproveOpen(false)} disabled={approveState === "submitting"}>Cancel</Button><Button variant="primary" loading={approveState === "submitting"} onClick={onConfirmApprove}>{approveState === "submitting" ? "Submitting approval to banking system" : "Confirm approval"}</Button></>
        )
      }>
        {approveState === "confirmed" ? (
          <div className="space-y-3">
            <Banner tone="success" title="Approval recorded in the audit ledger">The application has moved to Preparing disbursement. Operations can now initiate disbursement to {app.disbursement?.destinationMasked ?? "the designated account"}.</Banner>
            <p className="text-[12.5px] text-ink-3">Next state: <span className="text-ink">Preparing disbursement</span>. Disbursement is a separate, explicitly initiated step and is only confirmed on a successful banking response.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Amount" value={formatNaira(app.amount)} />
              <Stat label="Tenor" value={`${app.tenorMonths} months`} />
              <Stat label="Total expected repayment" value={formatNaira(offer.totalRepayable)} />
              <Stat label="Repayment window" value={`${formatWindow(offer.repaymentWindow)} · ${ordinal(offer.recommendedRepaymentDay)}`} />
            </div>
            <Divider />
            <p className="text-[12.5px] text-ink-3">Approving records your decision as {user.name} ({user.title}). The system recommendation was “{assessment.recommendation.headline}” with {assessment.recommendation.confidence.toLowerCase()} confidence; the decision is yours.</p>
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} eyebrow="Decision" title="Reject application" footer={<><Button onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="destructive" disabled={rejectNote.trim().length < 10} onClick={() => { reject(app.id, rejectNote.trim()); setRejectOpen(false); }}>Confirm rejection</Button></>}>
        <Label required hint="Shared with the applicant">Reason</Label>
        <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="State the basis for the decision." />
      </Modal>
    </>
  );
}
