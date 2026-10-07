import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { DemoTag } from "@/components/ui/Banner";

export default function Entry() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="h-14 flex items-center justify-between px-8 border-b border-line bg-surface">
        <Wordmark size="md" suffix="SME lending infrastructure" />
        <DemoTag />
      </header>
      <section className="flex-1 flex items-center">
        <div className="w-full max-w-[1100px] mx-auto px-8 grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
          <div>
            <Wordmark size="lg" />
            <h1 className="text-[32px] leading-[1.15] font-semibold tracking-[-0.015em] text-ink mt-6 max-w-[520px]">
              A consolidated view of an SME&apos;s financial behaviour, a structured credit assessment, and an auditable lending decision.
            </h1>
            <p className="text-[15px] text-ink-2 mt-4 max-w-[520px]">
              Ìrètí gives a bank one place to onboard an SME, consolidate its accounts through authorised Open Banking connections, assess eligibility against configured policy, approve, disburse and monitor repayment, with every material event recorded in a permissioned audit ledger.
            </p>
            <dl className="grid grid-cols-3 gap-6 mt-8 max-w-[520px] border-t border-line pt-5">
              <div>
                <dt className="eyebrow">Financial data</dt>
                <dd className="text-[13px] text-ink-2 mt-1">Open Banking connections, 12-month consolidated analysis</dd>
              </div>
              <div>
                <dt className="eyebrow">Decision support</dt>
                <dd className="text-[13px] text-ink-2 mt-1">Proprietary assessment, policy evaluation, human decision</dd>
              </div>
              <div>
                <dt className="eyebrow">Auditability</dt>
                <dd className="text-[13px] text-ink-2 mt-1">Private permissioned ledger of consent, access and decisions</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-3">
            <EntryCard href="/sme" title="Continue as SME" body="Onboard a business, verify identity, connect accounts and apply for credit." />
            <EntryCard href="/bank" title="Continue as Bank" body="Review the application queue, assess, approve, disburse and monitor." />
            <p className="text-[12px] text-ink-3 pt-2">
              Demo environment. Bank connections, identity verification, disbursement and repayment are simulated through adapters; no live banking systems are contacted.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function EntryCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="group surface flex items-center justify-between gap-4 p-5 hover:border-line-strong transition-colors">
      <div>
        <div className="text-[16px] font-semibold text-ink">{title}</div>
        <div className="text-[13.5px] text-ink-2 mt-1">{body}</div>
      </div>
      <ArrowRight size={18} className="text-ink-3 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}
