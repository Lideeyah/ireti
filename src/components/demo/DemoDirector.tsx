"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { DEMO_STEPS, PACE_MULTIPLIER, ROLE_LABELS, type DemoPace, type DemoRole } from "@/lib/demo/script";
import { runStepAction, stopRunAction } from "@/app/demo/actions";

const ROLE_TONE: Record<DemoRole, string> = {
  sme: "bg-[var(--chart-1)]",
  officer: "bg-[var(--chart-2)]",
  operations: "bg-[var(--chart-3)]",
  compliance: "bg-[var(--chart-4)]",
};

/**
 * Drives the guided run: performs each step against the live application, navigates to
 * the screen that shows the result, holds it, then continues. Fixed to the viewport so
 * it stays in frame while the product changes underneath it.
 */
/** Routes outside the product itself, where the control bar would be out of place. */
const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/demo"];

export function DemoDirector({ initialStep, pace }: { initialStep: number; pace: DemoPace }) {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(initialStep);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string>();
  const [finished, setFinished] = useState(initialStep >= DEMO_STEPS.length);
  const [working, setWorking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const advance = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setWorking(true);
    const r = await runStepAction();
    setWorking(false);
    running.current = false;
    if (!r.ok) {
      setError(r.error);
      setPaused(true);
      return;
    }
    const { route, done, state } = r.data;
    setIndex(state.step);
    if (route) router.push(route);
    router.refresh();
    if (done) setFinished(true);
  }, [router]);

  // Schedule the next step once the current one has been on screen long enough.
  useEffect(() => {
    clear();
    if (paused || finished || error) return;
    const step = DEMO_STEPS[index];
    const previous = DEMO_STEPS[index - 1];
    const dwell = (previous?.dwell ?? 1200) * PACE_MULTIPLIER[pace];
    if (!step) return;
    timer.current = setTimeout(() => void advance(), index === 0 ? 600 : dwell);
    return clear;
  }, [index, paused, finished, error, pace, advance]);

  const step = DEMO_STEPS[Math.min(index, DEMO_STEPS.length - 1)];
  const shown = finished ? DEMO_STEPS.length : index;
  const progress = (shown / DEMO_STEPS.length) * 100;
  const chapterSteps = DEMO_STEPS.filter((s) => s.chapter === step.chapter);
  const chapterPosition = chapterSteps.indexOf(step) + 1;

  // A finished run clears itself once the viewer leaves the product.
  useEffect(() => {
    if (finished && PUBLIC_ROUTES.includes(pathname)) void stopRunAction();
  }, [finished, pathname]);

  if (PUBLIC_ROUTES.includes(pathname)) return null;

  const exit = async () => {
    clear();
    await stopRunAction();
    router.push("/demo");
    router.refresh();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none">
      <div className="mx-auto max-w-[1000px] px-5 pb-5">
        <div className="pointer-events-auto rounded-[12px] bg-[var(--neutral-900)] text-white shadow-[0_18px_50px_rgba(10,14,22,0.42)] overflow-hidden">
          <div className="h-[3px] bg-white/10">
            <div className="h-full bg-[var(--action-primary)] transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center gap-5 px-5 py-4">
            <div className="flex items-center gap-2.5 shrink-0">
              <span className={`w-2 h-2 rounded-full ${ROLE_TONE[step.role]} ${working ? "pulse-dot" : ""}`} />
              <div className="leading-tight">
                <div className="text-[11px] uppercase tracking-[0.09em] text-white/45 font-semibold">{step.chapter}</div>
                <div className="text-[12.5px] text-white/80 whitespace-nowrap">{ROLE_LABELS[step.role]}</div>
              </div>
            </div>

            <div className="h-9 w-px bg-white/10 shrink-0" />

            <div className="min-w-0 flex-1">
              {finished ? (
                <>
                  <div className="text-[14px] font-medium text-white">Run complete</div>
                  <div className="text-[13px] text-white/60 mt-0.5">Onboarding, assessment, decision, disbursement, repayment failure and the audit trail — all on live records.</div>
                </>
              ) : error ? (
                <>
                  <div className="text-[14px] font-medium text-white">Paused: {error}</div>
                  <div className="text-[13px] text-white/60 mt-0.5">Resume to retry this step, or exit and reset the environment.</div>
                </>
              ) : (
                <>
                  <div className="text-[14px] font-medium text-white">{step.title}</div>
                  <div className="text-[13px] text-white/65 mt-0.5 line-clamp-2">{step.caption}</div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="tnum text-[12px] text-white/45 mr-1 whitespace-nowrap">
                {finished ? DEMO_STEPS.length : Math.min(index + 1, DEMO_STEPS.length)} / {DEMO_STEPS.length}
                <span className="text-white/25"> · {chapterPosition}/{chapterSteps.length}</span>
              </span>
              {!finished && (
                <>
                  <button onClick={() => { setError(undefined); setPaused((p) => !p); }} className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white" aria-label={paused ? "Resume" : "Pause"}>
                    {paused ? <Play size={15} /> : <Pause size={15} />}
                  </button>
                  <button onClick={() => { clear(); setError(undefined); void advance(); }} className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white" aria-label="Skip to next step">
                    <SkipForward size={15} />
                  </button>
                </>
              )}
              <button onClick={exit} className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white" aria-label="Exit run">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
