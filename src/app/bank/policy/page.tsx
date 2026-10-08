import { requireBankUser } from "@/server/auth";
import { getPolicy } from "@/server/core";
import { can } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shell/PageHeader";
import { Require } from "@/components/shell/Require";
import { PolicyForm } from "@/components/bank/PolicyForm";
import { formatDateTime } from "@/lib/format";

export default async function PolicyPage() {
  const user = await requireBankUser();
  const policy = await getPolicy();
  return (
    <>
      <PageHeader title="Lending policy" meta={<><span>Version {policy.version}</span><span>·</span><span>Updated {formatDateTime(policy.updatedAt)} by {policy.updatedByName}</span></>} />
      <Require role={user.role} permission="bank:configure_policy">
        <PolicyForm policy={policy} readOnly={!can(user.role, "bank:configure_policy")} />
      </Require>
    </>
  );
}
