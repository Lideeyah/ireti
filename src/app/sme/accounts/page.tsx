import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, Stat, StatRow } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { AccountManager, DisbursementAccountCard } from "@/components/sme/AccountManager";
import { formatNaira } from "@/lib/format";

export default async function AccountsPage() {
  const user = await requireSmeUser();
  const { business, connections, accounts, plan, assessmentStale, assessment } = await loadSmeBundle(user);
  const total = accounts.reduce((a, acc) => a + acc.balance, 0);
  const connected = connections.filter((c) => c.status === "connected").length;
  const mandateLocked = !!plan && plan.health !== "completed";

  return (
    <>
      <PageHeader title="Accounts" meta={<><span>{connected} connected</span><span>·</span><span>12 months of history</span></>} />

      {assessmentStale && assessment && (
        <div className="mb-6">
          <Banner tone="warning" title="Your assessment is out of date">
            The accounts connected to your profile changed after your last analysis. Re-run it from Onboarding to refresh your credit profile and eligibility.
          </Banner>
        </div>
      )}

      {accounts.length > 0 && (
        <Card className="mb-6">
          <StatRow columns={3}>
            <Stat label="Observed balance" size="lg" value={formatNaira(total)} />
            <Stat label="Accounts" size="lg" value={accounts.length} sub={`${connected} institutions`} />
            <Stat label="Coverage" size="lg" value="12 months" />
          </StatRow>
        </Card>
      )}

      <DisbursementAccountCard accounts={accounts} disbursementAccountId={business?.disbursementAccountId} mandateLocked={mandateLocked} />
      <AccountManager connections={connections} accounts={accounts} disbursementAccountId={business?.disbursementAccountId} mandateLocked={mandateLocked} />
    </>
  );
}
