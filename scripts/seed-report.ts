import { buildSeed } from "../src/lib/seed/demoData";
import { DEFAULT_POLICY } from "../src/lib/policy/defaultPolicy";
const s = buildSeed(DEFAULT_POLICY);
for (const a of s.applications) {
  const b = s.businesses.find((x) => x.id === a.businessId)!;
  const c = s.assessments.find((x) => x.id === a.assessmentId)!;
  const p = s.profiles.find((x) => x.id === c.profileId)!;
  console.log(`${b.name.padEnd(32)} status=${a.status.padEnd(22)} score=${c.score} band=${c.band.padEnd(8)} elig=${(c.eligibleAmount/1e6).toFixed(1)}m req=${(a.amount/1e6).toFixed(1)}m net=${(p.avgNetMonthlyFlow/1e6).toFixed(2)}m dsr=${p.debtServiceRatio.toFixed(2)} rec=${c.recommendation.action}`);
}
console.log("audit events", s.auditEvents.length, "cases", s.cases.length);
