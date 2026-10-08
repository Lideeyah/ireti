import { buildSeed } from "../src/lib/seed/demoData";
import { DEFAULT_POLICY } from "../src/lib/policy/defaultPolicy";
const s = buildSeed(DEFAULT_POLICY);
const m = (n: number) => (n / 1e6).toFixed(1) + "m";
console.log("business".padEnd(30), "score", "band".padEnd(9), "elig".padEnd(7), "req".padEnd(7), "cap".padEnd(7), "afford".padEnd(7), "binding".padEnd(13), "dscr", "pol", "rec");
for (const a of s.applications) {
  const b = s.businesses.find((x) => x.id === a.businessId)!;
  const c = s.assessments.find((x) => x.id === a.assessmentId)!;
  console.log(
    b.name.slice(0, 29).padEnd(30),
    String(c.score).padEnd(5),
    c.band.padEnd(9),
    m(c.eligibleAmount).padEnd(7),
    m(a.amount).padEnd(7),
    m(c.capacityCeiling).padEnd(7),
    m(c.affordabilityCeiling).padEnd(7),
    c.bindingConstraint.padEnd(13),
    c.projectedDscr.toFixed(2),
    c.policyPassed ? "ok " : "EXC",
    c.recommendation.action,
  );
}
const binding = s.assessments.reduce((acc, a) => { acc[a.bindingConstraint] = (acc[a.bindingConstraint] ?? 0) + 1; return acc; }, {} as Record<string, number>);
console.log("\nbinding constraint distribution:", binding);
console.log("audit events", s.auditEvents.length, "cases", s.cases.length);
