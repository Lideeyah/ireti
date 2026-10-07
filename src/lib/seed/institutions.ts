import type { Institution } from "../domain/types";

/** Demo institutions only. Connection to any of these is simulated. */
export const INSTITUTIONS: Institution[] = [
  { id: "sterling", name: "Sterling Bank", shortName: "Sterling", kind: "commercial" },
  { id: "firstbank", name: "FirstBank", shortName: "FirstBank", kind: "commercial" },
  { id: "zenith", name: "Zenith Bank", shortName: "Zenith", kind: "commercial" },
  { id: "access", name: "Access Bank", shortName: "Access", kind: "commercial" },
  { id: "gtbank", name: "GTBank", shortName: "GTBank", kind: "commercial" },
  { id: "uba", name: "UBA", shortName: "UBA", kind: "commercial" },
  { id: "stanbic", name: "Stanbic IBTC", shortName: "Stanbic", kind: "commercial" },
  { id: "moniepoint", name: "Moniepoint", shortName: "Moniepoint", kind: "fintech" },
  { id: "opay", name: "OPay", shortName: "OPay", kind: "fintech" },
];

export function institutionById(id: string): Institution {
  const found = INSTITUTIONS.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown institution ${id}`);
  return found;
}
