"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { ShellUser } from "./AppShell";

export function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 h-9 pl-1.5 pr-2 rounded-[6px] hover:bg-hover">
        <span className="w-7 h-7 rounded-[6px] bg-[var(--neutral-900)] text-white text-[11px] font-semibold inline-flex items-center justify-center">{initials}</span>
        <span className="text-left leading-tight hidden md:block">
          <span className="block text-[13px] font-medium text-ink">{user.name}</span>
          <span className="block text-[11.5px] text-ink-3">{user.title ?? ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown size={14} className="text-ink-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-[260px] surface shadow-[0_8px_30px_rgba(27,34,48,0.12)] z-40 fade-up py-1.5">
          <div className="px-4 py-2.5 border-b border-line-subtle">
            <div className="text-[13.5px] font-medium text-ink">{user.name}</div>
            <div className="text-[12px] text-ink-3">{user.email}</div>
            <div className="text-[12px] text-ink-3 mt-0.5">{ROLE_LABELS[user.role]}</div>
          </div>
          <button onClick={() => start(() => signOutAction())} disabled={pending} className="w-full flex items-center gap-2.5 px-4 h-9 text-[13.5px] text-ink-2 hover:bg-hover hover:text-ink">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
