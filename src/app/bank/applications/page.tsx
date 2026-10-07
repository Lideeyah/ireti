import { requireBankUser } from "@/server/auth";
import { loadQueue } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { ApplicationQueue } from "@/components/bank/ApplicationQueue";

export default async function ApplicationsPage() {
  await requireBankUser("bank:view_queue");
  const rows = await loadQueue();
  return (
    <>
      <PageHeader eyebrow="Ìrètí / Lending Operations" title="Application queue" description="Click a row to open the review. New applications move to Under review when first opened, and the access is recorded in the audit ledger." />
      <ApplicationQueue rows={rows} />
    </>
  );
}
