import { requireBankUser } from "@/server/auth";
import { loadBankStaff } from "@/server/queries";
import { isDemoMode } from "@/server/db";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, ListHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Role } from "@/lib/domain/types";
import { DemoControls } from "@/components/bank/DemoControls";

export default async function SettingsPage() {
  await requireBankUser("bank:configure_policy");
  const [staff, disbursed] = await Promise.all([loadBankStaff(), prisma.loanApplication.findMany({ where: { status: "disbursed" }, include: { business: true }, orderBy: { updatedAt: "desc" } })]);
  return (
    <>
      <PageHeader eyebrow="Ìrètí / Administration" title="Administration" description="Bank staff accounts and, in the demo environment, controls for resetting and simulating the end-to-end journey." />
      <div className="grid xl:grid-cols-2 gap-6">
        <Card padded={false}>
          <ListHeader eyebrow="Bank staff" title={`${staff.length} accounts`} description="Roles determine permissions across review, decisions, disbursement, collections, audit and policy. In production, accounts and roles come from the bank's identity provider." />
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>{staff.map((s) => <tr key={s.id}><td><div className="text-ink">{s.name}</div><div className="text-[12.5px] text-ink-3">{s.title}</div></td><td className="text-ink-2">{s.email}</td><td><Chip family={s.role === "ADMIN" ? "info" : "neutral"}>{ROLE_LABELS[s.role as Role]}</Chip></td></tr>)}</tbody>
          </table>
        </Card>
        {isDemoMode() ? (
          <DemoControls facilities={disbursed.map((a) => ({ id: a.id, reference: a.reference, business: a.business.name }))} />
        ) : (
          <Card><CardHeader eyebrow="Demo controls" title="Disabled" description="Set DEMO_MODE=true to enable reset and simulation controls in a demonstration environment." /></Card>
        )}
      </div>
    </>
  );
}
