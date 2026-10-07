import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Create a business account — Ìrètí" };

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect(user.organisationType === "bank" ? "/bank" : "/sme");
  return (
    <AuthShell title="Create a business account" subtitle="Set up access for your business, then complete onboarding: business details, identity verification and account connection." footer={<p>Already have an account? <Link href="/sign-in" className="text-link hover:underline">Sign in</Link>.</p>}>
      <SignUpForm />
    </AuthShell>
  );
}
