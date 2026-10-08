import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Field } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { BusinessProfileForm } from "@/components/sme/BusinessProfileForm";
import { formatDateTime } from "@/lib/format";

export default async function BusinessPage() {
  const user = await requireSmeUser();
  const { business } = await loadSmeBundle(user);
  if (!business) {
    return (
      <>
        <PageHeader title="Business profile" />
        <Card><EmptyState title="No business yet" body="Complete onboarding to create your business profile." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Start onboarding</Button></Link>} /></Card>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Business profile" meta={<><span>{business.industry}</span><span>·</span><span>{business.location}</span></>} />
      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-6">
        <BusinessProfileForm business={business} />
        <div className="space-y-6">
          <Card>
            <CardHeader title="Verification" />
            <div className="flex items-center gap-3 rounded-[8px] border border-success-border bg-success-bg px-4 py-3">
              <ShieldCheck size={18} className="text-success" />
              <div>
                <div className="text-[14px] font-semibold text-success">{business.identityVerified ? "Identity verified" : "Not verified"}</div>
                {business.identityVerifiedAt && <div className="text-[12.5px] text-success/80">{formatDateTime(business.identityVerifiedAt)}</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-5">
              <Field label="CAC number"><span className="tnum">{business.cacNumber}</span></Field>
              <Field label="CAC status"><Chip family="success">{business.cacStatus}</Chip></Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Account" />
            <div className="grid grid-cols-1 gap-4">
              <Field label="Signed in as">{user.name}</Field>
              <Field label="Email">{user.email}</Field>
              <Field label="Role">Authorised signatory</Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
