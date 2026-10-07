import { ShieldCheck } from "lucide-react";
import { requireBankUser } from "@/server/auth";
import { loadAudit } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, Stat, StatRow } from "@/components/ui/Card";
import { AuditTable } from "@/components/bank/AuditTable";

export default async function AuditPage() {
  await requireBankUser("bank:view_audit");
  const { events, integrity, total, dataAccess } = await loadAudit();
  return (
    <>
      <PageHeader eyebrow="Ìrètí / Audit Ledger" title="Audit ledger" description="Chronological, append-only record of consent, data access, assessment, decision, disbursement, repayment and risk events. Private and permissioned; only audit metadata and hashes are stored, never raw financial data, identifiers or credentials." />
      <Card className="mb-6">
        <StatRow columns={4}>
          <Stat label="Events" size="lg" value={total} sub="Across all applications" />
          <Stat label="Data-access events" size="lg" value={dataAccess} sub="Customer-visible" />
          <Stat label="Chain integrity" size="lg" value={<span className="inline-flex items-center gap-2">{integrity.valid ? <><ShieldCheck size={22} className="text-success" /> Verified</> : <span className="text-danger">Broken at #{integrity.brokenAtSeq}</span>}</span>} sub="SHA-256 hash chain recomputed on load" />
          <Stat label="Ledger implementation" size="lg" value="Database chain" sub="Interface: auditLedger.record / verify" />
        </StatRow>
      </Card>
      <AuditTable events={events} />
    </>
  );
}
