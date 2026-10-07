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
      <PageHeader eyebrow="Ìrètí / Lending policy" title="Lending policy configuration" description="Every figure the product uses for eligibility, pricing, repayment and risk comes from this policy. Changes create a new policy version; existing applications keep the version they were assessed under." meta={<><span>Version {policy.version}</span><span>·</span><span>Updated {formatDateTime(policy.updatedAt)} by {policy.updatedByName}</span></>} />
      <Require role={user.role} permission="bank:configure_policy">
        <PolicyForm policy={policy} readOnly={!can(user.role, "bank:configure_policy")} />
      </Require>
    </>
  );
}
