"use client";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-[6px] font-medium whitespace-nowrap transition-colors duration-150 select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed border border-transparent",
        variant === "secondary" && "bg-surface text-ink border border-line-strong hover:bg-hover",
        variant === "ghost" && "bg-transparent text-ink-2 hover:bg-hover hover:text-ink border border-transparent",
        variant === "destructive" && "bg-surface text-danger border border-danger-border hover:bg-danger-bg",
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={12} />}
      {children}
    </button>
  );
}
