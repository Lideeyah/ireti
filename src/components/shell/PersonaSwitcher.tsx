"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { USERS } from "@/lib/seed/demoData";
import { ROLE_LABELS } from "@/lib/auth/roles";

export function PersonaSwitcher({ area }: { area: "sme" | "bank" }) {
  const bankUserId = useStore((s) => s.bankUserId);
  const setBankUser = useStore((s) => s.setBankUser);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = area === "sme" ? USERS[0] : USERS.find((u) => u.id === bankUserId) ?? USERS[1];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => area === "bank" && setOpen((o) => !o)} className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-[6px] hover:bg-hover">
        <span className="w-6 h-6 rounded-[5px] bg-neutral-bg text-ink-2 text-[10.5px] font-semibold inline-flex items-center justify-center">{initials}</span>
        <span className="text-left leading-tight hidden md:block">
          <span className="block text-[12.5px] font-medium text-ink">{user.name}</span>
          <span className="block text-[11px] text-ink-3">{user.title}</span>
        </span>
        {area === "bank" && <ChevronDown size={13} className="text-ink-3" />}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-[280px] surface shadow-[0_8px_30px_rgba(27,34,48,0.12)] z-40 fade-up py-1">
          <div className="px-3 py-1.5 eyebrow">Switch bank persona</div>
          {USERS.filter((u) => u.organisationId === "org_bank").map((u) => (
            <button key={u.id} onClick={() => { setBankUser(u.id); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 h-9 hover:bg-hover text-left">
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] text-ink">{u.name}</span>
                <span className="block text-[11.5px] text-ink-3">{u.title} · {ROLE_LABELS[u.role]}</span>
              </span>
              {u.id === bankUserId && <Check size={14} className="text-primary" />}
            </button>
          ))}
          <div className="px-3 pt-1.5 pb-1 text-[11px] text-ink-3 border-t border-line-subtle mt-1">Permissions follow the selected role. Demo only; production uses the bank&apos;s identity provider.</div>
        </div>
      )}
    </div>
  );
}
