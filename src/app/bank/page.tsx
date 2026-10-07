import Link from "next/link";
import { requireBankUser } from "@/server/auth";
import { loadBankStats, loadQueue } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, Stat, StatRow } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationQueue } from "@/components/bank/ApplicationQueue";
import { formatNairaCompact } from "@/lib/format";

export default async function BankHome() {
  const user = await requireBankUser("bank:view_queue");
  const [stats, rows] = await Promise.all([loadBankStats(), loadQueue()]);
  const hour = new Date().getHours();
  return (
    <>
      <PageHeader eyebrow="Ìrètí / Lending Operations" title="Lending operations" description={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}. ${stats.awaiting} application${stats.awaiting === 1 ? "" : "s"} awaiting review.`} actions={<Link href="/bank/applications"><Button>Open full queue</Button></Link>} />
      <Card className="mb-8">
        <StatRow columns={5}>
          <Stat label="Applications" size="lg" value={stats.total} sub="All time" />
          <Stat label="Awaiting review" size="lg" value={stats.awaiting} sub={`${stats.newCount} not yet opened`} />
          <Stat label="Approved today" size="lg" value={stats.approvedToday} sub={`${stats.preparing} preparing disbursement`} />
          <Stat label="Disbursed" size="lg" value={stats.disbursed} sub={`${formatNairaCompact(stats.disbursedValue)} principal`} />
          <Stat label="At risk" size="lg" value={stats.atRisk} sub={`${stats.watch} on watch`} />
        </StatRow>
      </Card>
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow">Application queue</div>
        <Link href="/bank/applications" className="text-[13px] text-link hover:underline">All applications</Link>
      </div>
      <ApplicationQueue rows={rows} limit={12} compact />
    </>
  );
}
