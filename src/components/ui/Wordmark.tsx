import { clsx } from "clsx";

/**
 * Ìrètí wordmark. The diacritics are part of the brand and must render everywhere;
 * the string is kept as Unicode text (not an image) so it is selectable and accessible.
 */
export function Wordmark({ size = "md", suffix, className }: { size?: "sm" | "md" | "lg"; suffix?: string; className?: string }) {
  const sz = size === "lg" ? "text-[28px]" : size === "md" ? "text-[17px]" : "text-[15px]";
  return (
    <span className={clsx("inline-flex items-baseline gap-2 select-none", className)}>
      <span className={clsx("inline-flex items-center gap-1.5", sz)}>
        <Mark size={size === "lg" ? 22 : 16} />
        <span className="font-semibold tracking-[-0.01em] text-ink" lang="yo">
          Ìrètí
        </span>
      </span>
      {suffix && <span className={clsx("text-ink-3", size === "lg" ? "text-[15px]" : "text-[13px]")}>/ {suffix}</span>}
    </span>
  );
}

/** A quiet mark: three ascending bars inside a square, echoing an upward trajectory. */
export function Mark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="var(--action-primary)" />
      <rect x="3.5" y="9" width="2" height="4" rx="0.5" fill="white" fillOpacity="0.95" />
      <rect x="7" y="6.5" width="2" height="6.5" rx="0.5" fill="white" fillOpacity="0.95" />
      <rect x="10.5" y="3.5" width="2" height="9.5" rx="0.5" fill="white" fillOpacity="0.95" />
    </svg>
  );
}
