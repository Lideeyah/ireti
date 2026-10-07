import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSessionUser } from "@/server/auth";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";

export default async function Entry() {
  const user = await getSessionUser();
  if (user) redirect(user.organisationType === "bank" ? "/bank" : "/sme");
  return (
    <main className="min-h-screen flex flex-col bg-surface">
      <header className="h-16 flex items-center justify-between px-8 lg:px-14 border-b border-line">
        <Wordmark size="md" suffix="SME lending infrastructure" />
        <div className="flex items-center gap-2">
          <Link href="/sign-in"><Button variant="ghost" className="h-9 px-4 text-[13.5px]">Sign in</Button></Link>
          <Link href="/sign-up"><Button variant="primary" className="h-9 px-4 text-[13.5px]">Create business account</Button></Link>
        </div>
      </header>
      <section className="flex-1 flex items-center">
        <div className="w-full max-w-[1200px] mx-auto px-8 lg:px-14 py-16 grid lg:grid-cols-[1.15fr_1fr] gap-16 items-center">
          <div>
            <p className="eyebrow mb-4">SME lending infrastructure for commercial banks</p>
            <h1 className="text-[40px] lg:text-[48px] leading-[1.08] font-semibold tracking-[-0.02em] text-ink max-w-[640px]">A consolidated view of an SME&apos;s financial behaviour, a structured credit assessment, and an auditable lending decision.</h1>
            <p className="text-[16px] text-ink-2 mt-6 max-w-[560px] leading-relaxed">Ìrètí gives a bank one place to onboard an SME, consolidate its accounts through authorised Open Banking connections, assess eligibility against configured policy, approve, disburse and monitor repayment, with every material event recorded in a permissioned audit ledger.</p>
            <div className="flex items-center gap-3 mt-8">
              <Link href="/sign-up"><Button variant="primary" className="h-10 px-5 text-[14px]">Continue as SME <ArrowRight size={15} /></Button></Link>
              <Link href="/sign-in"><Button className="h-10 px-5 text-[14px]">Continue as Bank</Button></Link>
            </div>
          </div>
          <dl className="grid gap-px bg-line border border-line rounded-[10px] overflow-hidden">
            {[
              ["Financial data", "Businesses authorise Open Banking connections to each institution. Twelve months of transactions are consolidated and analysed with greater weight on recent activity."],
              ["Decision support", "A proprietary assessment scores the business against the bank's configured policy and recommends an amount, tenor and repayment window. The officer decides."],
              ["Auditability", "Consent, data access, assessment, decision, disbursement and repayment events are written to a private, hash-chained ledger the customer can also see."],
            ].map(([t, b]) => (
              <div key={t} className="bg-surface p-6">
                <dt className="text-[14px] font-semibold text-ink">{t}</dt>
                <dd className="text-[13.5px] text-ink-2 mt-1.5 leading-relaxed">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <footer className="border-t border-line px-8 lg:px-14 h-14 flex items-center justify-between text-[12.5px] text-ink-3">
        <span>Ìrètí</span>
        <span>Bank connections, identity verification, disbursement and repayment run through adapters; this environment uses simulated providers.</span>
      </footer>
    </main>
  );
}
