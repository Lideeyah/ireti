"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function NotificationCenter({ audience }: { audience: "sme" | "bank" }) {
  const all = useStore((s) => s.db.notifications);
  const notifications = all.filter((n) => n.audience === audience);
  const markRead = useStore((s) => s.markNotificationsRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative h-8 w-8 inline-flex items-center justify-center rounded-[6px] text-ink-2 hover:bg-hover hover:text-ink" aria-label="Notifications">
        <Bell size={16} />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-white text-[9.5px] font-semibold tnum inline-flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-[380px] surface shadow-[0_8px_30px_rgba(27,34,48,0.12)] z-40 fade-up">
          <div className="flex items-center justify-between px-4 h-10 border-b border-line-subtle">
            <span className="text-[13px] font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={() => markRead(audience)}>
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <EmptyState icon={Inbox} title="No notifications" body="Events relating to applications, disbursement and repayment will appear here." />
            ) : (
              <ul>
                {notifications.slice(0, 30).map((n) => (
                  <li key={n.id} className="border-b border-line-subtle last:border-b-0">
                    <Link href={n.href ?? "#"} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-2.5 hover:bg-hover">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-ink">{n.title}</span>
                        <span className="block text-[12.5px] text-ink-2 mt-0.5 line-clamp-2">{n.body}</span>
                        <span className="block text-[11.5px] text-ink-3 mt-1">{formatRelative(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
