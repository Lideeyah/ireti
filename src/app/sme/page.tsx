import Link from "next/link";
import { ArrowRight, Landmark, FileText } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat, StatRow, Field, ListHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationStatusChip, RatingChip, RepaymentStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { NetFlowSparkline } from "@/components/charts/CashFlowChart";
import { formatNaira, formatNairaCompact, formatRelative, formatDate, formatWindow, formatTime } from "@/lib/format";
import { EVENT_LABELS } from "@/lib/domain/labels";

export default async function SmeHome() {
  const user = await requireSmeUser();
  const { business, connections, accounts, profile, assessment, activeApplication, plan, repayments, activity } = await loadSmeBundle(user);

  if (!business) {
    return (
      <>
        <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Complete onboarding to see your credit eligibility." />
        <Card className="max-w-[880px]">
          <ol className="grid sm:grid-cols-5 gap-5">
            {["Business details", "Identity verification", "Connect accounts", "Financial analysis", "Credit profile"].map((s, i) => (
              <li key={s} className="flex items-start gap-3">
                <span className="tnum text-[11px] font-semibold w-6 h-6 rounded-[5px] inline-flex items-center justify-center bg-neutral-bg text-ink-3 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[14px] text-ink-2 leading-snug">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 pt-5 border-t border-line-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-[13px] text-ink-3">About five minutes. No banking passwords are entered here.</p>
            <Link href="/sme/onboarding"><Button variant="primary">Start onboarding <ArrowRight size={14} /></Button></Link>
          </div>
        </Card>
      </>
    );
  }

  const connected = connections.filter((c) => c.status === "connected");
  const incomplete = !assessment;
  const nextRepayment = repayments.find((r) => r.status === "scheduled" || r.status === "failed" || r.status === "processing");
  const profileBand = profile ? (profile.revenueConsistency === "High" && profile.positiveNetMonths >= 10 ? "Strong" : profile.revenueConsistency === "Low" ? "Weak" : "Moderate") : undefined;

  return (
    <>
      <PageHeader title={business.name} meta={<><span>{business.industry}</span><span>·</span><span>{business.location}</span><span>·</span><span>{connected.length} {connected.length === 1 ? "institution" : "institutions"} connected</span></>} actions={!activeApplication && assessment ? <Link href="/sme/application"><Button variant="primary">Apply for credit <ArrowRight size={14} /></Button></Link> : undefined} />

      {incomplete && (
        <Card className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[15px] font-medium text-ink">Onboarding in progress</div>
            <p className="text-[13.5px] text-ink-2 mt-1">{!business.identityVerified ? "Verify your identity to continue." : connected.length === 0 ? "Connect at least one business account to build your financial profile." : "Run the financial analysis to generate your credit profile."}</p>
          </div>
          <Link href="/sme/onboarding"><Button variant="primary">Continue onboarding <ArrowRight size={14} /></Button></Link>
        </Card>
      )}

      <Card className="mb-6">
        <StatRow columns={4}>
          <Stat label="Credit profile" size="xl" value={assessment ? <>{assessment.score} <span className="text-ink-3 text-[18px] font-medium">/ 100</span></> : "—"} sub={assessment ? <RatingChip rating={assessment.band} /> : "Pending analysis"} />
          <Stat label="Eligible amount" size="xl" value={assessment ? formatNaira(assessment.eligibleAmount) : "—"} sub={assessment ? `Recommended ${formatNaira(assessment.recommendedAmount)}` : "Pending analysis"} />
          <Stat label="Financial profile" size="xl" value={profileBand ?? "—"} sub={profile ? `Net ${formatNairaCompact(profile.avgNetMonthlyFlow)} / month` : "Pending analysis"} />
          <Stat label="Application" size="xl" value={activeApplication ? activeApplication.reference : "None"} sub={activeApplication ? <ApplicationStatusChip status={activeApplication.status} health={plan?.health} /> : "No active application"} />
        </StatRow>
      </Card>

      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6">
          {plan && (
            <Card>
              <CardHeader title="Active facility" action={<Link href="/sme/repayments"><Button size="sm">View repayments</Button></Link>} />
              <StatRow columns={2}>
                <Stat label="Outstanding balance" size="lg" value={formatNaira(plan.outstanding)} sub={`of ${formatNaira(plan.totalRepayable)} total`} />
                <Stat label="Next repayment" size="lg" value={nextRepayment ? formatNaira(nextRepayment.amount) : "—"} sub={nextRepayment && <RepaymentStatusChip status={nextRepayment.status} />} />
                <Stat label="Expected date" size="lg" value={nextRepayment ? formatDate(nextRepayment.dueDate) : "—"} />
                <Stat label="Repayment window" size="lg" value={nextRepayment ? `${new Date(nextRepayment.windowStart).getDate()}–${formatDate(nextRepayment.windowEnd, { day: "numeric", month: "long" })}` : "—"} />
              </StatRow>
            </Card>
          )}

          <Card>
            <CardHeader title="Financial analysis" description={profile ? `Generated ${formatRelative(profile.generatedAt)}` : undefined} action={profile && <Link href="/sme/credit-profile"><Button size="sm">Credit profile</Button></Link>} />
            {profile ? (
              <>
                <div className="grid grid-cols-3 gap-6 mb-5">
                  <Field label="Average monthly inflow"><span className="tnum font-medium">{formatNairaCompact(profile.avgMonthlyInflow)}</span></Field>
                  <Field label="Average monthly outflow"><span className="tnum font-medium">{formatNairaCompact(profile.avgMonthlyOutflow)}</span></Field>
                  <Field label="Strongest inflow window"><span className="tnum font-medium">{formatWindow(profile.strongestInflowWindow)}</span></Field>
                </div>
                <div className="border border-line-subtle rounded-[6px] bg-sunken px-3 pt-2 pb-1">
                  <div className="text-[11.5px] text-ink-3">Net monthly flow, last 12 months</div>
                  <NetFlowSparkline monthly={profile.monthly} height={64} />
                </div>
              </>
            ) : (
              <EmptyState icon={FileText} title="No financial analysis" body="Connect your accounts and run the analysis to see your consolidated financial profile." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Go to onboarding</Button></Link>} />
            )}
          </Card>

          {activeApplication && (
            <Card>
              <CardHeader title={`Application ${activeApplication.reference}`} action={<Link href={`/sme/application/${activeApplication.id}`}><Button size="sm">View application</Button></Link>} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Field label="Requested"><span className="tnum">{formatNaira(activeApplication.amount)}</span></Field>
                <Field label="Tenor">{activeApplication.tenorMonths} months</Field>
                <Field label="Status"><ApplicationStatusChip status={activeApplication.status} health={plan?.health} /></Field>
                <Field label="Submitted">{formatRelative(activeApplication.submittedAt)}</Field>
              </div>
              {activeApplication.status === "additional_information" && <div className="mt-5 pt-4 border-t border-line-subtle text-[13.5px] text-warning">Additional information requested by the bank. Open the application to respond.</div>}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card padded={false}>
            <ListHeader title="Connected institutions" action={<Link href="/sme/accounts"><Button size="sm" variant="ghost">Manage</Button></Link>} />
            {connected.length === 0 ? (
              <EmptyState icon={Landmark} title="No connected accounts" body="Connect your business accounts through an authorised Open Banking connection." />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {connected.map((c) => {
                  const acc = accounts.find((a) => a.connectionId === c.id);
                  return (
                    <li key={c.id} className="flex items-center justify-between px-6 py-3.5">
                      <div>
                        <div className="text-[14px] text-ink">{c.institutionName}</div>
                        <div className="text-[12.5px] text-ink-3 tnum mt-0.5">{acc?.accountNumberMasked} · synced {c.lastSyncedAt ? formatRelative(c.lastSyncedAt) : "—"}</div>
                      </div>
                      <div className="tnum text-[14px] text-ink">{acc ? formatNaira(acc.balance) : "—"}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card padded={false}>
            <ListHeader title="Recent activity" action={<Link href="/sme/activity"><Button size="sm" variant="ghost">All activity</Button></Link>} />
            {activity.length === 0 ? (
              <EmptyState title="No activity yet" body="Consent, data access and decision events will be listed here." />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {activity.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-start gap-4 px-6 py-3 text-[13px]">
                    <span className="tnum text-ink-3 shrink-0 w-[44px]">{formatTime(e.timestamp)}</span>
                    <span className="min-w-0">
                      <span className="text-ink">{EVENT_LABELS[e.type]}</span>
                      <span className="text-ink-3"> · {e.actorRole === "SYSTEM" ? "System" : e.actorRole === "SME_USER" ? "You" : e.actorName}</span>
                    </span>
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
