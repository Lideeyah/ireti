import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSessionUser } from "@/server/auth";
import { Wordmark } from "@/components/ui/Wordmark";
import { Button } from "@/components/ui/Button";
import { HeroVisual } from "@/components/marketing/HeroVisual";

const PILLARS = [
  ["Financial data", "Open Banking connections, twelve months consolidated."],
  ["Decision support", "Scored against bank policy. The officer decides."],
  ["Auditability", "Every access and decision on a permissioned ledger."],
];

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

      <section className="flex-1 flex items-center bg-canvas">
        <div className="w-full max-w-[1200px] mx-auto px-8 lg:px-14 py-16 grid lg:grid-cols-[1fr_520px] gap-16 items-center">
          <div>
            <p className="eyebrow mb-4 rise">SME lending infrastructure</p>
            <h1 className="text-[40px] lg:text-[50px] leading-[1.06] font-semibold tracking-[-0.025em] text-ink max-w-[580px] rise" style={{ "--d": "60ms" } as React.CSSProperties}>
              Consolidated financials.<br />Structured assessment.<br />Auditable decisions.
            </h1>
            <p className="text-[16px] text-ink-2 mt-6 max-w-[460px] rise" style={{ "--d": "140ms" } as React.CSSProperties}>
              One place for a bank to onboard an SME, assess it against policy, decide, disburse and monitor repayment.
            </p>
            <div className="flex items-center gap-3 mt-8 rise" style={{ "--d": "220ms" } as React.CSSProperties}>
              <Link href="/sign-up"><Button variant="primary" className="h-10 px-5 text-[14px]">Continue as SME <ArrowRight size={15} /></Button></Link>
              <Link href="/sign-in"><Button className="h-10 px-5 text-[14px]">Continue as Bank</Button></Link>
            </div>
            <dl className="grid sm:grid-cols-3 gap-x-8 gap-y-5 mt-12 pt-8 border-t border-line max-w-[560px]">
              {PILLARS.map(([t, b], i) => (
                <div key={t} className="rise" style={{ "--d": `${300 + i * 80}ms` } as React.CSSProperties}>
                  <dt className="text-[13.5px] font-semibold text-ink">{t}</dt>
                  <dd className="text-[13px] text-ink-3 mt-1.5">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroVisual />
        </div>
      </section>

      <footer className="border-t border-line px-8 lg:px-14 h-14 flex items-center justify-between text-[12.5px] text-ink-3 bg-surface">
        <span lang="yo">Ìrètí</span>
        <span>Open Banking · NIBSS · core banking adapters</span>
      </footer>
    </main>
  );
}
