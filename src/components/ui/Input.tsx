"use client";
import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const base =
  "w-full h-8 px-2.5 rounded-[6px] border border-line-strong bg-surface text-[13.5px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--focus-ring)]/25 disabled:bg-sunken disabled:text-ink-4";

export function Label({ children, hint, required }: { children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block text-[12.5px] font-medium text-ink-2 mb-1">
      {children}
      {required && <span className="text-danger ml-0.5">*</span>}
      {hint && <span className="font-normal text-ink-3 ml-1.5">{hint}</span>}
    </label>
  );
}

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={clsx(base, invalid && "border-danger-border", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(base, "pr-7 appearance-none bg-no-repeat bg-[right_8px_center]", className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236F7A8E' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")" }} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(base, "h-auto py-2 min-h-[72px] resize-y", className)} {...rest} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-[12px] text-danger mt-1">{children}</p>;
}

export function Checkbox({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded-[4px] border-line-strong accent-[var(--action-primary)]" />
      <span className="min-w-0">
        <span className="block text-[13.5px] text-ink">{label}</span>
        {description && <span className="block text-[12.5px] text-ink-3 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
