import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CircleCheck } from "lucide-react";
import { isDemoMode } from "@/server/db";
import { getRunState } from "@/server/demoRun";
import { DEMO_STEPS, CHAPTERS } from "@/lib/demo/script";
import { Wordmark } from "@/components/ui/Wordmark";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StartRunForm } from "@/components/demo/StartRunForm";

export const metadata = { title: "Guided run — Ìrètí" };

export default async function DemoLauncher() {
  if (!isDemoMode()) redirect("/");
  const state = await getRunState();
  if (state && state.step < DEMO_STEPS.length) redirect("/sme");

  return (
    <main className="min-h-screen bg-canvas flex flex-col">
      <header className="h-16 flex items-center justify-between px-8 lg:px-14 border-b border-line bg-surface">
        <Link href="/"><Wordmark size="md" suffix="Guided run" /></Link>
        <Link href="/sign-in"><Button variant="ghost" className="h-9 px-4 text-[13.5px]">Sign in instead</Button></Link>
      </header>

      <section className="flex-1 flex items-center">
        <div className="w-full max-w-[1060px] mx-auto px-8 lg:px-14 py-14 grid lg:grid-cols-[1fr_380px] gap-14 items-start">
          <div>
            <p className="eyebrow mb-4 rise">Guided run</p>
            <h1 className="text-[36px] leading-[1.1] font-semibold tracking-[-0.022em] text-ink max-w-[520px] rise" style={{ "--d": "60ms" } as React.CSSProperties}>
              The whole lending cycle, driven end to end.
            </h1>
            <p className="text-[15.5px] text-ink-2 mt-5 max-w-[480px] rise" style={{ "--d": "130ms" } as React.CSSProperties}>
              {DEMO_STEPS.length} steps across both sides of the platform, performed against live records. Every action writes the same data and the same audit events as a person clicking through it.
            </p>

            <ol className="mt-10 space-y-5">
              {CHAPTERS.map((chapter, i) => {
                const steps = DEMO_STEPS.filter((s) => s.chapter === chapter);
                return (
                  <li key={chapter} className="flex gap-4 rise" style={{ "--d": `${220 + i * 70}ms` } as React.CSSProperties}>
                    <span className="tnum text-[11px] font-semibold w-6 h-6 rounded-[5px] inline-flex items-center justify-center bg-neutral-bg text-ink-3 shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-medium text-ink">{chapter}</div>
                      <div className="text-[13px] text-ink-3 mt-1">{steps.map((s) => s.title).join(" · ")}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <Card className="rise" style={{ "--d": "200ms" } as React.CSSProperties}>
            <StartRunForm />
            <ul className="mt-6 pt-5 border-t border-line-subtle space-y-2.5">
              {[
                "Resets to a clean environment first",
                "Pause, skip or exit at any point",
                "Leaves real records behind to explore",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[13px] text-ink-2">
                  <CircleCheck size={15} className="text-success mt-px shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <footer className="border-t border-line px-8 lg:px-14 h-14 flex items-center justify-between text-[12.5px] text-ink-3 bg-surface">
        <span lang="yo">Ìrètí</span>
        <Link href="/" className="hover:text-ink inline-flex items-center gap-1.5">Back to the product <ArrowRight size={13} /></Link>
      </footer>
    </main>
  );
}
