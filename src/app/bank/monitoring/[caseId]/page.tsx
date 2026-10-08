import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBankUser } from "@/server/auth";
import { loadCase, loadBankStaff } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Field, Divider, ListHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeverityChip, CaseStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Require } from "@/components/shell/Require";
import { CaseActions } from "@/components/bank/CaseActions";
import { formatDateTime, formatDate } from "@/lib/format";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const user = await requireBankUser("bank:view_risk");
  const [data, staff] = await Promise.all([loadCase(caseId), loadBankStaff()]);
  if (!data) return <Card><EmptyState title="Case not found" action={<Link href="/bank/monitoring"><Button size="sm">Back to monitoring</Button></Link>} /></Card>;
  const { c, business, application, event } = data;
  const history = [...c.history].reverse();
  return (
    <>
      <Link href="/bank/monitoring" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink mb-3"><ArrowLeft size={13} /> Monitoring</Link>
      <PageHeader title={c.reference} meta={<><CaseStatusChip status={c.status} /><SeverityChip severity={c.severity} /><span>{business.name}</span>{application && <><span>·</span><Link href={`/bank/applications/${application.id}`} className="text-link hover:underline tnum">{application.reference}</Link></>}</>} actions={c.status !== "resolved" ? <Require role={user.role} permission="bank:manage_cases" inline label="Case actions require"><CaseActions caseId={c.id} status={c.status} staff={staff.map((s) => ({ name: s.name, title: s.title }))} /></Require> : undefined} />
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader title={c.trigger} />
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Case ID"><span className="tnum">{c.reference}</span></Field>
              <Field label="Severity"><SeverityChip severity={c.severity} /></Field>
              <Field label="Trigger">{c.trigger}</Field>
              <Field label="Created">{formatDate(c.createdAt)}</Field>
              <Field label="Owner">{c.owner}</Field>
              <Field label="Assigned to">{c.assigneeName ?? "Unassigned"}</Field>
              <Field label="Status"><CaseStatusChip status={c.status} /></Field>
              {c.resolvedAt && <Field label="Resolved">{formatDateTime(c.resolvedAt)}</Field>}
            </div>
            <Divider />
            <div className="eyebrow mb-2">Trigger detail</div>
            <p className="text-[14px] text-ink-2 leading-relaxed">{event.description}</p>
          </Card>
          <Card>
            <CardHeader title="Notes" description={c.notes.length ? `${c.notes.length}` : undefined} />
            {c.notes.length === 0 ? <p className="text-[13.5px] text-ink-3">Record the outcome of calls, agreed arrangements and verification steps here. Notes are hashed into the audit ledger.</p> : (
              <ul className="space-y-3">{[...c.notes].reverse().map((n, i) => <li key={i} className="rounded-[6px] bg-sunken border border-line-subtle px-4 py-3"><div className="text-[12.5px] text-ink-3 mb-1.5">{n.byName} · {formatDateTime(n.at)}</div><p className="text-[14px] text-ink">{n.text}</p></li>)}</ul>
            )}
          </Card>
        </div>
        <Card padded={false}>
          <ListHeader title="History" />
          <ol className="divide-y divide-line-subtle">{history.map((h, i) => <li key={i} className="px-6 py-3 flex items-start gap-4 text-[13.5px]"><span className="tnum text-ink-3 w-[160px] shrink-0">{formatDateTime(h.at)}</span><span className="flex-1 text-ink">{h.action}</span><span className="text-ink-3">{h.byName}</span></li>)}</ol>
        </Card>
      </div>
    </>
  );
}
