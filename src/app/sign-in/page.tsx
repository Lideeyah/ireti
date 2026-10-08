import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { isDemoMode } from "@/server/db";
import { DEMO_ACCOUNTS } from "@/server/demo";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in — Ìrètí" };

export default async function SignInPage() {
  const user = await getSessionUser();
  if (user) redirect(user.organisationType === "bank" ? "/bank" : "/sme");
  const demo = isDemoMode();
  return (
    <AuthShell title="Sign in" subtitle="Business owners and bank staff." footer={<p>New business? <Link href="/sign-up" className="text-link hover:underline">Create an account</Link>.</p>}>
      <SignInForm demoAccounts={demo ? DEMO_ACCOUNTS : []} demoPassword={demo ? "ireti-demo-2026" : undefined} />
    </AuthShell>
  );
}
