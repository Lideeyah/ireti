import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { isDemoMode } from "@/server/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { OnboardingFlow } from "@/components/sme/OnboardingFlow";

export default async function OnboardingPage() {
  const user = await requireSmeUser();
  const { business, connections, accounts, profile, assessment } = await loadSmeBundle(user);
  return (
    <>
      <PageHeader title="Onboarding" />
      <OnboardingFlow business={business} connections={connections} accounts={accounts} profile={profile} assessment={assessment} demoMode={isDemoMode()} hasApplication={false} />
    </>
  );
}
