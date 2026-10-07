let counter = 0;

/** Short unique ids for demo records. Production would use database-generated ids. */
export function uid(prefix: string): string {
  counter += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${t}${counter.toString(36)}${r}`;
}

export function applicationReference(year: number, sequence: number): string {
  return `IR-${year}-${String(sequence).padStart(5, "0")}`;
}

export function caseReference(year: number, sequence: number): string {
  return `RISK-${year}-${String(sequence).padStart(4, "0")}`;
}
