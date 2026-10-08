import Link from "next/link";
import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApplicationFlow } from "@/components/sme/ApplicationFlow";
import { formatNaira } from "@/lib/format";

export default async function ApplicationPage() {
  const user = await requireSmeUser();
  const { assessment, activeApplication, policy, business } = await loadSmeBundle(user);
  if (!assessment || !business) {
    return (
      <>
        <PageHeader title="Apply for credit" />
        <Card><EmptyState title="Credit assessment required" body="Complete onboarding to see your eligibility before applying." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Go to onboarding</Button></Link>} /></Card>
      </>
    );
  }
  if (activeApplication && activeApplication.status !== "rejected") {
    return (
      <>
        <PageHeader title="Application" />
        <Card><EmptyState title={`${activeApplication.reference} is in progress`} body="Only one application can be active at a time. Open it to track its status." action={<Link href={`/sme/application/${activeApplication.id}`}><Button size="sm" variant="primary">View application</Button></Link>} /></Card>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Apply for credit" meta={<><span>Eligible up to {formatNaira(assessment.eligibleAmount)}</span><span>·</span><span>Policy {policy.version}</span></>} />
      <ApplicationFlow assessment={assessment} policy={policy} />
    </>
  );
}
