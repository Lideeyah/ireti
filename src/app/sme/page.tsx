"use client";
import Link from "next/link";
import { ArrowRight, Landmark, FileText } from "lucide-react";
import { useAdebayo } from "@/hooks/useAdebayo";
import { useStore } from "@/lib/store/store";
import { Card, CardHeader, Stat, Field } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationStatusChip, RatingChip, RepaymentStatusChip, Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { NetFlowSparkline } from "@/components/charts/CashFlowChart";
import { formatNaira, formatNairaCompact, formatRelative, formatDate, formatWindow } from "@/lib/format";
import { PageHeader } from "@/components/shell/PageHeader";
import { EVENT_LABELS } from "@/lib/domain/labels";

export default function SmeHome() {
  const { business, connections, accounts, profile, assessment, activeApplication, plan, repayments } = useAdebayo();
  const auditEvents = useStore((s) => s.db.auditEvents);
  const onboarding = useStore((s) => s.onboarding);

  if (!business) {
    return (
      <>
        <PageHeader eyebrow="Welcome" title="Set up your business on Ìrètí" description="Complete onboarding to build a consolidated financial profile and see what credit you are eligible for." />
        <Card>
          <ol className="grid md:grid-cols-5 gap-4">
            {["Business details", "Identity verification", "Connect accounts", "Financial analysis", "Credit profile"].map((s, i) => (
              <li key={s} className="flex items-start gap-2.5">
                <span className="tnum text-[11px] font-semibold w-5 h-5 rounded-[4px] inline-flex items-center justify-center bg-neutral-bg text-ink-3 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[13px] text-ink-2">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 pt-4 border-t border-line-subtle flex items-center justify-between">
            <p className="text-[13px] text-ink-3">Takes about five minutes. No banking passwords are entered into Ìrètí.</p>
            <Link href="/sme/onboarding"><Button variant="primary">Start onboarding <ArrowRight size={14} /></Button></Link>
          </div>
        </Card>
      </>
    );
  }

  const connected = connections.filter((c) => c.status === "connected");
  const onboardingIncomplete = !assessment;
  const customerEvents = auditEvents.filter((e) => e.businessId === business.id && e.customerVisible).slice(-8).reverse();
  const nextRepayment = repayments.find((r) => r.status === "scheduled" || r.status === "failed" || r.status === "processing");

  return (
    <>
      <PageHeader eyebrow="Welcome back" title={business.name} meta={<><span>{business.industry}</span><span>·</span><span>{business.location}</span><span>·</span><span>{connected.length} {connected.length === 1 ? "institution" : "institutions"} connected</span></>} />

      {onboardingIncomplete && (
        <Card className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[14px] font-medium text-ink">Onboarding in progress</div>
            <p className="text-[13px] text-ink-2 mt-0.5">
              {!business.identityVerified ? "Verify your identity to continue." : connected.length === 0 ? "Connect at least one business account to build your financial profile." : "Run the financial analysis to generate your credit profile."}
            </p>
          </div>
          <Link href="/sme/onboarding"><Button variant="primary">Continue onboarding <ArrowRight size={14} /></Button></Link>
        </Card>
      )}

      <Card className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:divide-x divide-line-subtle [&>*:not(:first-child)]:lg:pl-6">
          <Stat label="Credit profile" size="xl" value={assessment ? <>{assessment.score} <span className="text-ink-3 text-[18px] font-medium">/ 100</span></> : "—"} sub={assessment ? <RatingChip rating={assessment.band} /> : "Pending analysis"} />
          <Stat label="Eligible amount" size="xl" value={assessment ? formatNaira(assessment.eligibleAmount) : "—"} sub={assessment ? `Recommended ${formatNaira(assessment.recommendedAmount)}` : "Pending analysis"} />
          <Stat label="Financial profile" size="xl" value={profile ? (profile.revenueConsistency === "High" && profile.positiveNetMonths >= 10 ? "Strong" : profile.revenueConsistency === "Low" ? "Weak" : "Moderate") : "—"} sub={profile ? `Net ${formatNairaCompact(profile.avgNetMonthlyFlow)} / month` : "Pending analysis"} />
          <Stat label="Application" size="xl" value={activeApplication ? activeApplication.reference : "None"} sub={activeApplication ? <ApplicationStatusChip status={activeApplication.status} health={plan?.health} /> : "No active application"} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="space-y-4">
          {plan && (
            <Card>
              <CardHeader eyebrow="Repayment" title="Active facility" action={<Link href="/sme/repayments"><Button size="sm">View repayments</Button></Link>} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Outstanding balance" value={formatNaira(plan.outstanding)} />
                <Stat label="Next repayment" value={nextRepayment ? formatNaira(nextRepayment.amount) : "—"} sub={nextRepayment && <RepaymentStatusChip status={nextRepayment.status} />} />
                <Stat label="Expected date" value={nextRepayment ? formatDate(nextRepayment.dueDate) : "—"} />
                <Stat label="Repayment window" value={nextRepayment ? `${formatDate(nextRepayment.windowStart, { day: "numeric" })}–${formatDate(nextRepayment.windowEnd, { day: "numeric", month: "long" })}` : "—"} />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader eyebrow="Latest financial analysis" title={profile ? `Generated ${formatRelative(profile.generatedAt)}` : "No analysis yet"} action={profile && <Link href="/sme/credit-profile"><Button size="sm">Credit profile</Button></Link>} />
            {profile ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <Field label="Average monthly inflow"><span className="tnum font-medium">{formatNairaCompact(profile.avgMonthlyInflow)}</span></Field>
                  <Field label="Average monthly outflow"><span className="tnum font-medium">{formatNairaCompact(profile.avgMonthlyOutflow)}</span></Field>
                  <Field label="Strongest inflow window"><span className="tnum font-medium">{formatWindow(profile.strongestInflowWindow)}</span></Field>
                </div>
                <div className="border border-line-subtle rounded-[6px] bg-sunken px-2 pt-1">
                  <div className="text-[11px] text-ink-3 px-1">Net monthly flow, last 12 months</div>
                  <NetFlowSparkline monthly={profile.monthly} height={56} />
                </div>
                <p className="text-[13px] text-ink-2 mt-3">{profile.narrative}</p>
              </>
            ) : (
              <EmptyState icon={FileText} title="No financial analysis" body="Connect your accounts and run the analysis to see your consolidated financial profile." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Go to onboarding</Button></Link>} />
            )}
          </Card>

          {activeApplication && (
            <Card>
              <CardHeader eyebrow="Application" title={activeApplication.reference} action={<Link href={`/sme/application/${activeApplication.id}`}><Button size="sm">View application</Button></Link>} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Requested"><span className="tnum">{formatNaira(activeApplication.amount)}</span></Field>
                <Field label="Tenor">{activeApplication.tenorMonths} months</Field>
                <Field label="Status"><ApplicationStatusChip status={activeApplication.status} health={plan?.health} /></Field>
                <Field label="Submitted">{formatRelative(activeApplication.submittedAt)}</Field>
              </div>
              {activeApplication.status === "additional_information" && (
                <div className="mt-3 pt-3 border-t border-line-subtle text-[13px] text-warning">Additional information requested by the bank. Open the application to respond.</div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader eyebrow="Connected institutions" title={`${connected.length} connected`} action={<Link href="/sme/accounts"><Button size="sm" variant="ghost">Manage</Button></Link>} />
            {connected.length === 0 ? (
              <EmptyState icon={Landmark} title="No connected accounts" body="Connect your business accounts through an authorised Open Banking connection." />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {connected.map((c) => {
                  const acc = accounts.find((a) => a.connectionId === c.id);
                  return (
                    <li key={c.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div>
                        <div className="text-[13.5px] text-ink">{c.institutionName}</div>
                        <div className="text-[12px] text-ink-3 tnum">{acc?.accountNumberMasked} · synced {c.lastSyncedAt ? formatRelative(c.lastSyncedAt) : "—"}</div>
                      </div>
                      <div className="tnum text-[13.5px] text-ink">{acc ? formatNaira(acc.balance) : "—"}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader eyebrow="Recent activity" title="Who accessed your data" action={<Link href="/sme/activity"><Button size="sm" variant="ghost">All activity</Button></Link>} />
            {customerEvents.length === 0 ? (
              <EmptyState title="No activity yet" body="Consent, data access and decision events will be listed here." />
            ) : (
              <ul className="space-y-2">
                {customerEvents.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 text-[12.5px]">
                    <span className="tnum text-ink-3 shrink-0 w-[42px]">{new Date(e.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                    <span className="min-w-0">
                      <span className="text-ink">{EVENT_LABELS[e.type]}</span>
                      <span className="text-ink-3"> · {e.actorRole === "SYSTEM" ? "System" : e.actorRole === "SME_USER" ? "You" : e.actorName}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!activeApplication && assessment && (
            <Card className="bg-sunken">
              <div className="text-[14px] font-medium text-ink">Ready to apply</div>
              <p className="text-[13px] text-ink-2 mt-1">You can apply for up to {formatNaira(assessment.eligibleAmount)} over {onboarding.analysisDone ? "a tenor of your choice" : "an allowed tenor"}.</p>
              <Link href="/sme/application" className="inline-block mt-3"><Button variant="primary" size="sm">Apply for credit <ArrowRight size={13} /></Button></Link>
            </Card>
          )}
          {activeApplication?.status === "rejected" && <Chip family="danger" style="outline">Last application declined</Chip>}
        </div>
      </div>
    </>
  );
}
