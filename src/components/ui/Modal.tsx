"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, eyebrow, children, footer, width = 480 }: { open: boolean; onClose: () => void; title: React.ReactNode; eyebrow?: string; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-[rgba(27,34,48,0.45)]" onClick={onClose} />
      <div className="relative surface shadow-[0_8px_30px_rgba(27,34,48,0.12)] w-full fade-up" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line-subtle">
          <div>
            {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink p-1 rounded-[4px] hover:bg-hover" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line-subtle flex items-center justify-end gap-2 bg-sunken rounded-b-[8px]">{footer}</div>}
      </div>
    </div>
  );
}
