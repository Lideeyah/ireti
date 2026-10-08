"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { startRunAction } from "@/app/demo/actions";
import { DEMO_STEPS, PACE_MULTIPLIER, type DemoPace } from "@/lib/demo/script";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import { SegmentedControl } from "@/components/ui/Tabs";

const totalSeconds = (pace: DemoPace) => Math.round((DEMO_STEPS.reduce((a, s) => a + s.dwell, 0) * PACE_MULTIPLIER[pace]) / 1000);

export function StartRunForm() {
  const router = useRouter();
  const [pace, setPace] = useState<DemoPace>("normal");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const seconds = totalSeconds(pace);

  return (
    <div>
      <Label hint="How long each screen is held">Pace</Label>
      <SegmentedControl
        value={pace}
        onChange={setPace}
        options={[{ value: "slow", label: "Slow" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Fast" }]}
      />
      <div className="mt-4 text-[13px] text-ink-2">
        {DEMO_STEPS.length} steps · about {Math.floor(seconds / 60)}m {String(seconds % 60).padStart(2, "0")}s
      </div>
      {error && <div className="mt-4"><Banner tone="danger" title="Could not start">{error}</Banner></div>}
      <Button
        variant="primary"
        className="w-full h-10 text-[14px] mt-5"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await startRunAction(pace);
            if (!r.ok) { setError(r.error); return; }
            router.push("/sme/onboarding");
            router.refresh();
          })
        }
      >
        <Play size={15} /> {pending ? "Preparing environment" : "Start guided run"}
      </Button>
      <p className="text-[12px] text-ink-3 mt-3">Starts by wiping and reseeding, so every run tells the same story.</p>
    </div>
  );
}
