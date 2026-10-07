"use client";
import Link from "next/link";
import { useStore } from "@/lib/store/store";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, Stat } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationQueue } from "@/components/bank/ApplicationQueue";
import { formatNairaCompact } from "@/lib/format";

export default function BankHome() {
  const db = useStore((s) => s.db);
  const today = new Date().toDateString();
  const awaiting = db.applications.filter((a) => a.status === "submitted" || a.status === "under_review").length;
  const approvedToday = db.applications.filter((a) => a.decision?.outcome === "approved" && new Date(a.decision.at).toDateString() === today).length;
  const disbursed = db.applications.filter((a) => a.status === "disbursed");
  const disbursedValue = disbursed.reduce((a, x) => a + x.amount, 0);
  const atRisk = db.plans.filter((p) => p.health === "at_risk").length;
  const watch = db.plans.filter((p) => p.health === "watch").length;
  const user = useStore((s) => s.currentBankUser());

  return (
    <>
      <PageHeader eyebrow="Ìrètí / Lending Operations" title="Lending operations" description={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${user.name.split(" ")[0]}. ${awaiting} application${awaiting === 1 ? "" : "s"} awaiting review.`} actions={<Link href="/bank/applications"><Button>Open full queue</Button></Link>} />
      <Card className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 xl:divide-x divide-line-subtle [&>*:not(:first-child)]:xl:pl-6">
          <Stat label="Applications" size="lg" value={db.applications.length} sub="All time" />
          <Stat label="Awaiting review" size="lg" value={awaiting} sub={`${db.applications.filter((a) => a.status === "submitted").length} not yet opened`} />
          <Stat label="Approved today" size="lg" value={approvedToday} sub={`${db.applications.filter((a) => a.status === "approved" || a.status === "disbursement_pending").length} preparing disbursement`} />
          <Stat label="Disbursed" size="lg" value={disbursed.length} sub={`${formatNairaCompact(disbursedValue)} outstanding principal`} />
          <Stat label="At risk" size="lg" value={atRisk} sub={`${watch} on watch`} />
        </div>
      </Card>
      <div className="flex items-center justify-between mb-2">
        <div className="eyebrow">Application queue</div>
        <Link href="/bank/applications" className="text-[12.5px] text-link hover:underline">All applications</Link>
      </div>
      <ApplicationQueue limit={12} compact />
    </>
  );
}
