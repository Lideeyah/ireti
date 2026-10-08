import { requireBankUser } from "@/server/auth";
import { loadQueue } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { ApplicationQueue } from "@/components/bank/ApplicationQueue";

export default async function ApplicationsPage() {
  await requireBankUser("bank:view_queue");
  const rows = await loadQueue();
  return (
    <>
      <PageHeader title="Applications" />
      <ApplicationQueue rows={rows} />
    </>
  );
}
