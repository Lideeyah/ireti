import Link from "next/link";
import { FileText } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadSmeApplication } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Field, ListHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationStatusChip, Chip } from "@/components/ui/Chip";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportAccessButton, ProvideDocumentButton } from "@/components/sme/ApplicationActions";
import { formatNaira, formatDateTime, formatTime, formatDate, formatWindow } from "@/lib/format";
import { EVENT_LABELS } from "@/lib/domain/labels";

type StepState = "completed" | "in_progress" | "pending" | "failed" | "declined";

export default async function SmeApplicationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const user = await requireSmeUser();
  const data = await loadSmeApplication(user, id);
  if (!data) return <Card><EmptyState icon={FileText} title="Application not found" action={<Link href="/sme"><Button size="sm">Back to overview</Button></Link>} /></Card>;
  const { app, offer, plan, events, documents } = data;

  const reviewState: StepState = app.status === "submitted" ? "pending" : app.status === "under_review" || app.status === "additional_information" ? "in_progress" : "completed";
  const decisionState: StepState = app.decision ? (app.decision.outcome === "approved" ? "completed" : "declined") : "pending";
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
      <PageHeader title={app.reference} meta={<><ApplicationStatusChip status={app.status} health={plan?.health} /><span>Submitted {formatDate(app.submittedAt)}</span></>} actions={plan && <Link href="/sme/repayments"><Button>View repayments</Button></Link>} />
      {submitted && app.status === "submitted" && (
        <div className="mb-6"><Banner tone="success" title={`Application submitted — ${app.reference}`}>Status: Under review. The bank has been notified, and every access to your financial profile will appear in the activity log below.</Banner></div>
      )}
      {app.status === "additional_information" && app.informationRequest && !app.informationRequest.respondedAt && (
        <div className="mb-6">
          <Card>
            <CardHeader title="Additional information requested" action={<Chip family="warning">{documents.filter((d) => d.status === "requested").length} outstanding</Chip>} />
            {app.informationRequest.message && <p className="text-[13.5px] text-ink-2 mb-4">&ldquo;{app.informationRequest.message}&rdquo; — {app.informationRequest.requestedByName}</p>}
            <ul className="divide-y divide-line-subtle">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-[14px] text-ink">{d.type}</div>
                    {d.note && <div className="text-[12.5px] text-ink-3 mt-0.5">{d.note}</div>}
                  </div>
                  {d.status === "requested" ? <ProvideDocumentButton documentId={d.id} type={d.type} /> : <Chip family="success">Provided</Chip>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      {app.status === "rejected" && app.decision && <div className="mb-6"><Banner tone="danger" title="Application not approved">{app.decision.note || "The bank did not approve this application on the current financial evidence."}</Banner></div>}
      {app.status === "disbursed" && app.disbursement && <div className="mb-6"><Banner tone="success" title={`Disbursement confirmed — ${formatNaira(app.amount)}`}>Paid to {app.disbursement.institutionName} account {app.disbursement.destinationMasked} on {formatDateTime(app.disbursement.confirmedAt!)}. Reference {app.disbursement.reference}.</Banner></div>}

      <div className="grid xl:grid-cols-[1fr_1.2fr] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Timeline" />
            <ol>
              {timeline.map((t, i) => (
                <li key={t.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${t.state === "completed" ? "bg-success" : t.state === "in_progress" ? "bg-primary pulse-dot" : t.state === "failed" || t.state === "declined" ? "bg-danger" : "bg-[var(--border-strong)]"}`} />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-line-subtle my-1.5" />}
                  </div>
                  <div className="pb-5 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[14px] font-medium text-ink">{t.label}</span>
                      <Chip family={t.state === "completed" ? "success" : t.state === "in_progress" ? "info" : t.state === "failed" || t.state === "declined" ? "danger" : "neutral"} style={t.state === "declined" ? "outline" : "subtle"}>{t.state === "completed" ? "Completed" : t.state === "in_progress" ? "In progress" : t.state === "failed" ? "Failed" : t.state === "declined" ? "Declined" : "Pending"}</Chip>
                    </div>
                    {t.detail && <div className="text-[13px] text-ink-3 mt-1">{t.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader title="Facility terms" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
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
          <ListHeader title="Activity" action={<ReportAccessButton applicationId={app.id} />} />
          {events.length === 0 ? <EmptyState title="No activity yet" /> : (
            <ul className="divide-y divide-line-subtle">
              {events.map((e) => (
                <li key={e.id} className="px-6 py-3 flex items-start gap-4">
                  <span className="tnum text-[13px] text-ink-3 w-[92px] shrink-0">{formatDate(e.timestamp, { day: "2-digit", month: "short" })} {formatTime(e.timestamp)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-ink">{EVENT_LABELS[e.type]}</div>
                    <div className="text-[12.5px] text-ink-3 mt-0.5">{e.actorRole === "SYSTEM" ? "System" : e.actorRole === "SME_USER" ? "You" : `${e.actorName} · ${e.actorRole.replace("BANK_", "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}`}{e.resource ? ` · ${e.resource}` : ""}</div>
                  </div>
                  <span className="tnum text-[11.5px] text-ink-4 font-mono">#{e.seq}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
