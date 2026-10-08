"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/Tabs";

/** Filters are held in the URL so a filtered view can be linked and reloaded. */
export function TransactionFilters({ accounts }: { accounts: { id: string; label: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const apply = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`/sme/transactions?${next.toString()}`);
  };

  const direction = (params.get("direction") ?? "all") as "all" | "in" | "out";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        value={direction}
        onChange={(v) => apply({ direction: v === "all" ? undefined : v })}
        options={[{ value: "all", label: "All" }, { value: "in", label: "Inflow" }, { value: "out", label: "Outflow" }]}
      />
      <div className="w-[260px]">
        <Select value={params.get("account") ?? ""} onChange={(e) => apply({ account: e.target.value || undefined })}>
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </Select>
      </div>
      <form
        className="relative w-[280px]"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() || undefined });
        }}
      >
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Counterparty or narration" className="pl-8" />
      </form>
    </div>
  );
}
