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
import { INTEGRATIONS } from "@/lib/domain/integrations";

export default async function SettingsPage() {
  await requireBankUser("bank:configure_policy");
  const [staff, disbursed] = await Promise.all([loadBankStaff(), prisma.loanApplication.findMany({ where: { status: "disbursed" }, include: { business: true }, orderBy: { updatedAt: "desc" } })]);
  return (
    <>
      <PageHeader title="Administration" />
      <Card padded={false} className="mb-6">
        <ListHeader title="Integrations" description={`${INTEGRATIONS.length} adapters`} />
        <table className="data-table">
          <thead><tr><th>Capability</th><th>Provider</th><th>Interface</th><th>Status</th></tr></thead>
          <tbody>
            {INTEGRATIONS.map((i) => (
              <tr key={i.capability}>
                <td><div className="text-ink whitespace-nowrap">{i.capability}</div><span className="sub">{i.detail}</span></td>
                <td className="text-ink-2 whitespace-nowrap">{i.provider}</td>
                <td className="text-ink-3 font-mono text-[12.5px] whitespace-nowrap">{i.interface}</td>
                <td><Chip family={i.live ? "success" : "neutral"}>{i.live ? "Live" : "Sandbox"}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card padded={false}>
          <ListHeader title="Bank staff" description={`${staff.length} accounts`} />
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>{staff.map((s) => <tr key={s.id}><td><div className="text-ink">{s.name}</div><div className="text-[12.5px] text-ink-3">{s.title}</div></td><td className="text-ink-2">{s.email}</td><td><Chip family={s.role === "ADMIN" ? "info" : "neutral"}>{ROLE_LABELS[s.role as Role]}</Chip></td></tr>)}</tbody>
          </table>
        </Card>
        {isDemoMode() ? (
          <DemoControls facilities={disbursed.map((a) => ({ id: a.id, reference: a.reference, business: a.business.name }))} />
        ) : (
          <Card><CardHeader title="Operations tools unavailable" description="Manual collection and environment reset are disabled here." /></Card>
        )}
      </div>
    </>
  );
}
