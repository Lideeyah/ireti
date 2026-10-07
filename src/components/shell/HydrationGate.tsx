"use client";
import { useHydrated } from "@/lib/store/store";

export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-6 w-56 rounded bg-neutral-bg" />
        <div className="h-28 rounded-[8px] bg-surface border border-line" />
        <div className="h-64 rounded-[8px] bg-surface border border-line" />
      </div>
    );
  }
  return <>{children}</>;
}
