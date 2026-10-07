import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      {Icon && (
        <div className="w-9 h-9 rounded-[8px] bg-sunken border border-line flex items-center justify-center text-ink-3 mb-3">
          <Icon size={16} />
        </div>
      )}
      <div className="text-[14px] font-medium text-ink">{title}</div>
      {body && <p className="text-[13px] text-ink-3 mt-1 max-w-[360px]">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
