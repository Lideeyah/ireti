"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Flag, FileText } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Field, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationStatusChip, Chip } from "@/components/ui/Chip";
import { Banner } from "@/components/ui/Banner";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNaira, formatDateTime, formatTime, formatDate, formatWindow } from "@/lib/format";
import { EVENT_LABELS } from "@/lib/domain/labels";

type StepState = "completed" | "in_progress" | "pending" | "failed" | "declined";

export default function SmeApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useStore((s) => s.db);
  const provide = useStore((s) => s.provideInformation);
  const report = useStore((s) => s.reportAccess);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedRef, setReportedRef] = useState<string>();

  const app = db.applications.find((a) => a.id === id);
  if (!app) {
    return <Card><EmptyState icon={FileText} title="Application not found" action={<Link href="/sme"><Button size="sm">Back to overview</Button></Link>} /></Card>;
  }
  const offer = db.offers.find((o) => o.id === app.offerId)!;
  const plan = app.repaymentPlanId ? db.plans.find((p) => p.id === app.repaymentPlanId) : undefined;
  const events = db.auditEvents.filter((e) => e.applicationId === app.id && e.customerVisible).sort((a, b) => b.seq - a.seq);

  const reviewState: StepState = ["submitted"].includes(app.status) ? "pending" : app.status === "under_review" || app.status === "additional_information" ? "in_progress" : "completed";
  const decisionState: StepState = app.decision ? (app.decision.outcome === "approved" ? "completed" : "declined") : app.status === "under_review" || app.status === "additional_information" ? "pending" : "pending";
  const disbState: StepState = app.status === "disbursed" ? "completed" : app.status === "disbursement_failed" ? "failed" : app.status === "disbursement_pending" ? "in_progress" : "pending";

  const timeline: { label: string; state: StepState; detail?: string }[] = [
    { label: "Submitted", state: "completed", detail: formatDateTime(app.submittedAt) },
    { label: "Financial assessment", state: "completed", detail: "Consolidated profile and credit assessment generated" },
    { label: "Bank review", state: reviewState, detail: app.firstReviewedAt ? `Started ${formatDateTime(app.firstReviewedAt)}${app.reviewerName ? ` by ${app.reviewerName}` : ""}` : "Awaiting a reviewer" },
    { label: "Decision", state: decisionState, detail: app.decision ? `${app.decision.outcome === "approved" ? "Approved" : "Declined"} ${formatDateTime(app.decision.at)}` : "Pending bank decision" },
    { label: "Disbursement", state: app.decision?.outcome === "rejected" ? "pending" : disbState, detail: app.disbursement?.confirmedAt ? `Confirmed ${formatDateTime(app.disbursement.confirmedAt)} · ${app.disbursement.reference}` : app.disbursement?.status === "failed" ? app.disbursement.failureReason : app.status === "disbursement_pending" ? "Preparing disbursement" : "Pending" },
  ];

  return (
    <>
      <PageHeader eyebrow="Application" title={app.reference} meta={<><ApplicationStatusChip status={app.status} health={plan?.health} /><span>Submitted {formatDate(app.submittedAt)}</span></>} actions={plan && <Link href="/sme/repayments"><Button>View repayments</Button></Link>} />

      {app.status === "additional_information" && app.informationRequest && !app.informationRequest.respondedAt && (
        <div className="mb-4">
          <Banner tone="warning" title="Additional information requested" action={<Button size="sm" variant="primary" onClick={() => provide(app.id)}>Provide information</Button>}>
            {app.informationRequest.requestedByName} requested: {app.informationRequest.items.join(", ")}.{app.informationRequest.message ? ` “${app.informationRequest.message}”` : ""} In this demo, providing information marks the documents as supplied.
          </Banner>
        </div>
      )}
      {app.status === "rejected" && app.decision && (
        <div className="mb-4"><Banner tone="danger" title="Application not approved">{app.decision.note || "The bank did not approve this application on the current financial evidence."}</Banner></div>
      )}
      {app.status === "disbursed" && app.disbursement && (
        <div className="mb-4"><Banner tone="success" title={`Disbursement confirmed — ${formatNaira(app.amount)}`}>Paid to {app.disbursement.institutionName} account {app.disbursement.destinationMasked} on {formatDateTime(app.disbursement.confirmedAt!)}. Reference {app.disbursement.reference}.</Banner></div>
      )}

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader eyebrow="Progress" title="Application timeline" />
            <ol className="space-y-0">
              {timeline.map((t, i) => (
                <li key={t.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${t.state === "completed" ? "bg-success" : t.state === "in_progress" ? "bg-primary pulse-dot" : t.state === "failed" ? "bg-danger" : t.state === "declined" ? "bg-danger" : "bg-[var(--border-strong)]"}`} />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-line-subtle my-1" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-ink">{t.label}</span>
                      <Chip family={t.state === "completed" ? "success" : t.state === "in_progress" ? "info" : t.state === "failed" || t.state === "declined" ? "danger" : "neutral"} style={t.state === "declined" ? "outline" : "subtle"}>
                        {t.state === "completed" ? "Completed" : t.state === "in_progress" ? "In progress" : t.state === "failed" ? "Failed" : t.state === "declined" ? "Declined" : "Pending"}
                      </Chip>
                    </div>
                    {t.detail && <div className="text-[12.5px] text-ink-3 mt-0.5">{t.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader eyebrow="Terms" title="Requested facility" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Requested"><span className="tnum font-medium">{formatNaira(app.amount)}</span></Field>
              <Field label="Purpose">{app.purpose}</Field>
              <Field label="Tenor">{app.tenorMonths} months</Field>
              <Field label="Interest"><span className="tnum">{formatNaira(offer.interestAmount)}</span></Field>
              <Field label="Fees"><span className="tnum">{formatNaira(offer.feeAmount)}</span></Field>
              <Field label="Total repayable"><span className="tnum font-medium">{formatNaira(offer.totalRepayable)}</span></Field>
              <Field label="Instalment"><span className="tnum">{formatNaira(offer.instalmentAmount)} monthly</span></Field>
              <Field label="Repayment window"><span className="tnum">{formatWindow(offer.repaymentWindow)}</span></Field>
            </div>
          </Card>
        </div>

        <Card padded={false}>
          <div className="px-4 py-3 border-b border-line-subtle flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Activity</div>
              <div className="text-[13px] text-ink-2 mt-0.5">Every access to your financial data and every decision on this application, recorded in the audit ledger.</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}><Flag size={13} /> Report unusual access</Button>
          </div>
          {reportedRef && <div className="px-4 pt-3"><Banner tone="info" title={`Report received — case ${reportedRef}`}>Compliance has been notified and will review the access record.</Banner></div>}
          {events.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {events.map((e) => (
                <li key={e.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="tnum text-[12.5px] text-ink-3 w-[84px] shrink-0">{formatDate(e.timestamp, { day: "2-digit", month: "short" })} {formatTime(e.timestamp)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-ink">{EVENT_LABELS[e.type]}</div>
                    <div className="text-[12px] text-ink-3">
                      {e.actorRole === "SYSTEM" ? "System" : e.actorRole === "SME_USER" ? "You" : `${e.actorName} · ${e.actorRole.replace("BANK_", "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}`}
                      {e.resource ? ` · ${e.resource}` : ""}
                    </div>
                  </div>
                  <span className="tnum text-[11px] text-ink-4 font-mono">#{e.seq}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} eyebrow="Customer control" title="Report unusual access" footer={<><Button onClick={() => setReportOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => { const c = report(app.id); setReportedRef(c.reference); setReportOpen(false); }}>Submit report</Button></>}>
        <p className="text-[13.5px] text-ink-2">If you do not recognise an access event listed on this application, submit a report. A compliance case is opened and the access record is reviewed against the ledger. Your application is not affected.</p>
        <Divider />
        <p className="text-[12.5px] text-ink-3">Reports are themselves recorded in the audit ledger.</p>
      </Modal>
    </>
  );
}
