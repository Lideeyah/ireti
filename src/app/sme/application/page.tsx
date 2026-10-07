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
        <PageHeader eyebrow="Application" title="Apply for credit" />
        <Card><EmptyState title="Credit assessment required" body="Complete onboarding to see your eligibility before applying." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Go to onboarding</Button></Link>} /></Card>
      </>
    );
  }
  if (activeApplication && activeApplication.status !== "rejected") {
    return (
      <>
        <PageHeader eyebrow="Application" title="Active application" />
        <Card><EmptyState title={`${activeApplication.reference} is in progress`} body="Only one application can be active at a time. Open it to track its status." action={<Link href={`/sme/application/${activeApplication.id}`}><Button size="sm" variant="primary">View application</Button></Link>} /></Card>
      </>
    );
  }
  return (
    <>
      <PageHeader eyebrow="Application" title="Apply for credit" description={`Eligible for up to ${formatNaira(assessment.eligibleAmount)}. Pricing follows the bank's configured lending policy (${policy.version}).`} />
      <ApplicationFlow assessment={assessment} policy={policy} />
    </>
  );
}
