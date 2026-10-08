"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { ShellUser } from "./AppShell";

/** Signed-in user block at the foot of the navigation rail. */
export function UserMenu({ user, demoMode }: { user: ShellUser; demoMode: boolean }) {
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
    <div className="relative p-3" ref={ref}>
      {open && (
        <div className="absolute left-3 right-3 bottom-[calc(100%-4px)] rounded-[8px] bg-[var(--neutral-800)] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.35)] py-1.5 fade-up">
          <div className="px-3.5 py-2.5 border-b border-white/10">
            <div className="text-[13px] font-medium text-white">{user.name}</div>
            <div className="text-[12px] text-white/55 truncate">{user.email}</div>
            <div className="text-[12px] text-white/55 mt-0.5">{ROLE_LABELS[user.role]}</div>
          </div>
          <button onClick={() => start(() => signOutAction())} disabled={pending} className="w-full flex items-center gap-2.5 px-3.5 h-9 text-[13px] text-white/80 hover:bg-white/[0.06] hover:text-white">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 h-11 px-2 rounded-[6px] hover:bg-white/[0.06] text-left">
        <span className="w-8 h-8 rounded-[6px] bg-white/10 text-white text-[12px] font-semibold inline-flex items-center justify-center shrink-0">{initials}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[13px] font-medium text-white truncate">{user.name}</span>
          <span className="block text-[11.5px] text-white/50 truncate">{user.title ?? ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronsUpDown size={14} className="text-white/40 shrink-0" />
      </button>
    </div>
  );
}
