import { clsx } from "clsx";

/**
 * Ìrètí wordmark. The diacritics are part of the brand and must render everywhere;
 * the string is kept as Unicode text so it is selectable and accessible.
 */
export function Wordmark({ size = "md", suffix, className, tone = "ink" }: { size?: "sm" | "md" | "lg"; suffix?: string; className?: string; tone?: "ink" | "inverse" }) {
  const sz = size === "lg" ? "text-[30px]" : size === "md" ? "text-[18px]" : "text-[16px]";
  return (
    <span className={clsx("inline-flex items-baseline gap-2.5 select-none", className)}>
      <span className={clsx("inline-flex items-center gap-2", sz)}>
        <Mark size={size === "lg" ? 24 : size === "md" ? 18 : 16} />
        <span className={clsx("font-semibold tracking-[-0.015em]", tone === "inverse" ? "text-white" : "text-ink")} lang="yo">
          Ìrètí
        </span>
      </span>
      {suffix && <span className={clsx(tone === "inverse" ? "text-white/60" : "text-ink-3", size === "lg" ? "text-[15px]" : "text-[13px]")}>{suffix}</span>}
    </span>
  );
}

/** Three ascending bars in the primary blue. No container, no fill box. */
export function Mark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden className={className}>
      <rect x="1" y="10" width="4" height="7" rx="1" fill="var(--action-primary)" />
      <rect x="7" y="6" width="4" height="11" rx="1" fill="var(--action-primary)" />
      <rect x="13" y="1" width="4" height="16" rx="1" fill="var(--action-primary)" />
    </svg>
  );
}
