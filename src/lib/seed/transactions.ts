import type { BankAccount, Institution, Transaction, TransactionCategory } from "../domain/types";
import { addMonths, daysInMonth, startOfMonth } from "../util/dates";
import { createRng, type Rng } from "../util/random";

/**
 * Deterministic transaction generator. A BusinessShape describes the financial
 * story (recurring revenue, settlement window, supplier payments, payroll, rent,
 * existing loan repayments, one-off events) and the generator renders 12 months
 * of transactions across the business's institutions.
 */
export interface InstitutionShape {
  institutionId: string;
  role: "primary" | "secondary" | "tertiary" | "minor";
  last4: string;
  balance: number;
  accountType: BankAccount["accountType"];
}

export interface BusinessShape {
  seed: number;
  /** Target average monthly inflow before events. */
  monthlyInflow: number;
  expenseRatio: number;
  /** Relative noise on recurring items. */
  volatility: number;
  windowStart: number; // settlement cluster start day
  loanRepaymentMonthly: number;
  loanRepaymentDay: number;
  obligationsOutstanding: number;
  /** Multiplier applied to the final three months. */
  recentTrend: number;
  /** Month index (0 = oldest) → inflow multiplier (seasonal dips, etc.). */
  seasonal?: Record<number, number>;
  /** One-off events by month index. */
  events?: { month: number; amount: number; category: TransactionCategory; counterparty: string; narration: string; day: number }[];
  institutions: InstitutionShape[];
  /** When a shape is narrowed to one institution, the share denominator of the full set is kept here. */
  totalShareOverride?: number;
  names: {
    settlementCounterparties: string[];
    salesCounterparties: string[];
    suppliers: string[];
    payrollNarration: string;
    rentCounterparty: string;
    rentAmountQuarterly: number;
  };
}

const ROLE_INFLOW_SHARE: Record<InstitutionShape["role"], number> = { primary: 0.62, secondary: 0.24, tertiary: 0.14, minor: 0.04 };

let txCounter = 0;
function tx(partial: Omit<Transaction, "id">): Transaction {
  txCounter += 1;
  return { id: `tx_${txCounter.toString(36)}_${Math.abs(Math.round(partial.amount)).toString(36)}`, ...partial };
}

function dateIn(year: number, monthIndex: number, day: number, rng: Rng): string {
  const d = new Date(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex)), rng.int(8, 17), rng.int(0, 59), rng.int(0, 59));
  return d.toISOString();
}

function noisy(rng: Rng, base: number, vol: number) {
  return Math.round(base * (1 + rng.noise(vol)) / 100) * 100;
}

export function generateBusinessData(shape: BusinessShape, businessId: string, asOf: Date, connectionIds: Record<string, string>) {
  const accounts: BankAccount[] = [];
  const transactions: Transaction[] = [];
  const end = startOfMonth(asOf);
  const start = addMonths(end, -12);
  const totalShare = shape.totalShareOverride ?? shape.institutions.reduce((a, i) => a + ROLE_INFLOW_SHARE[i.role], 0);

  for (const inst of shape.institutions) {
    const rng = createRng(shape.seed * 7919 + inst.institutionId.length * 131 + inst.last4.charCodeAt(0));
    const connectionId = connectionIds[inst.institutionId];
    const accountId = `acc_${businessId}_${inst.institutionId}`;
    accounts.push({
      id: accountId,
      connectionId,
      businessId,
      institutionId: inst.institutionId,
      institutionName: "", // filled by caller
      accountNumberMasked: `•••• ${inst.last4}`,
      accountType: inst.accountType,
      currency: "NGN",
      balance: inst.balance,
    });

    const share = ROLE_INFLOW_SHARE[inst.role] / totalShare;
    const push = (date: string, amount: number, category: TransactionCategory, counterparty: string, narration: string) => {
      if (Math.abs(amount) < 500) return;
      transactions.push(tx({ accountId, businessId, date, amount, category, counterparty, narration }));
    };

    for (let m = 0; m < 12; m++) {
      const monthDate = addMonths(start, m);
      const y = monthDate.getFullYear();
      const mi = monthDate.getMonth();
      let inflowTarget = shape.monthlyInflow * share;
      inflowTarget *= shape.seasonal?.[m] ?? 1;
      if (m >= 9) inflowTarget *= shape.recentTrend;
      const outflowTarget = shape.monthlyInflow * share * shape.expenseRatio;

      // --- Inflows ---
      if (inst.role === "primary" || inst.role === "secondary") {
        // Settlement cluster in the window (55% of this account's inflow for primary, 35% secondary)
        const clusterShare = inst.role === "primary" ? 0.55 : 0.35;
        const cluster = inflowTarget * clusterShare;
        const splits = inst.role === "primary" ? [0.42, 0.35, 0.23] : [0.6, 0.4];
        splits.forEach((s, k) => {
          const cp = shape.names.settlementCounterparties[(k + m) % shape.names.settlementCounterparties.length];
          push(dateIn(y, mi, shape.windowStart + k, rng), noisy(rng, cluster * s, shape.volatility), "distributor_settlement", cp, `Settlement — ${cp}`);
        });
        // Spread sales inflows
        const spread = inflowTarget * (1 - clusterShare);
        const count = inst.role === "primary" ? 4 : 5;
        const days = inst.role === "primary" ? [4, 11, 18, 27] : [3, 9, 14, 19, 28];
        for (let k = 0; k < count; k++) {
          const cp = shape.names.salesCounterparties[(k * 3 + m) % shape.names.salesCounterparties.length];
          push(dateIn(y, mi, days[k], rng), noisy(rng, spread / count, shape.volatility * 1.4), "sales", cp, `Transfer — ${cp}`);
        }
      } else {
        // Tertiary / minor: many small POS and transfer inflows
        const count = inst.role === "tertiary" ? 8 : 3;
        for (let k = 0; k < count; k++) {
          const day = 2 + Math.floor((k / count) * 26) + rng.int(0, 2);
          const isPos = rng.chance(0.6);
          push(
            dateIn(y, mi, day, rng),
            noisy(rng, inflowTarget / count, shape.volatility * 1.8),
            "sales",
            isPos ? "POS settlement" : "Customer transfer",
            isPos ? "POS settlement — terminal 2211" : "Inward transfer",
          );
        }
      }

      // --- Outflows ---
      if (inst.role === "primary") {
        const payroll = outflowTarget * 0.26;
        const suppliers = outflowTarget * 0.38;
        const utilities = outflowTarget * 0.035;
        const tax = outflowTarget * 0.02;
        push(dateIn(y, mi, 28, rng), -noisy(rng, payroll, 0.02), "payroll", "Staff salaries", shape.names.payrollNarration);
        for (let k = 0; k < 3; k++) {
          const s = shape.names.suppliers[(k + m) % shape.names.suppliers.length];
          push(dateIn(y, mi, [6, 13, 25][k], rng), -noisy(rng, suppliers / 3, shape.volatility * 1.3), "supplier_payment", s, `Supplier payment — ${s}`);
        }
        push(dateIn(y, mi, 8, rng), -noisy(rng, utilities, 0.15), "utilities", "Ikeja Electric", "Electricity — prepaid");
        push(dateIn(y, mi, 20, rng), -noisy(rng, tax, 0.1), "tax", "FIRS", "VAT remittance");
        if (m % 3 === 0) {
          push(dateIn(y, mi, 2, rng), -shape.names.rentAmountQuarterly, "rent", shape.names.rentCounterparty, "Warehouse rent — quarterly");
        }
        if (shape.loanRepaymentMonthly > 0) {
          const late = rng.chance(0.08);
          push(dateIn(y, mi, late ? shape.loanRepaymentDay + 6 : shape.loanRepaymentDay, rng), -shape.loanRepaymentMonthly, "loan_repayment", "Existing facility", "Loan repayment — term facility");
        }
      } else if (inst.role === "secondary") {
        for (let k = 0; k < 2; k++) {
          const s = shape.names.suppliers[(k + m + 2) % shape.names.suppliers.length];
          push(dateIn(y, mi, [10, 22][k], rng), -noisy(rng, outflowTarget * 0.55 / 2, shape.volatility), "supplier_payment", s, `Supplier payment — ${s}`);
        }
        push(dateIn(y, mi, 16, rng), -noisy(rng, outflowTarget * 0.3, 0.2), "logistics", "GIG Logistics", "Haulage — Lagos–Ibadan");
        push(dateIn(y, mi, 29, rng), -noisy(rng, outflowTarget * 0.1, 0.2), "other", "Bank charges", "Account maintenance and transfer fees");
      } else {
        const count = inst.role === "tertiary" ? 4 : 2;
        const items: [TransactionCategory, string, string][] = [
          ["other", "Total Energies", "Fuel — delivery vans"],
          ["other", "MTN Nigeria", "Airtime and data"],
          ["logistics", "Vehicle maintenance", "Van servicing"],
          ["other", "Bank charges", "SMS and transfer fees"],
        ];
        for (let k = 0; k < count; k++) {
          const [cat, cp, nar] = items[k];
          push(dateIn(y, mi, 5 + k * 6, rng), -noisy(rng, outflowTarget / count, 0.25), cat, cp, nar);
        }
      }
    }

    // One-off events live on the primary account
    if (inst.role === "primary" && shape.events) {
      for (const ev of shape.events) {
        const monthDate = addMonths(start, ev.month);
        push(dateIn(monthDate.getFullYear(), monthDate.getMonth(), ev.day, rng), ev.amount, ev.category, ev.counterparty, ev.narration);
      }
    }
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return { accounts, transactions };
}

/** Convenience used by the demo BankConnectionService: data for a single institution. */
export function generateInstitutionData(params: { businessId: string; institution: Institution; connectionId: string; asOf: Date; seedKey: string }) {
  const shape = shapeFor(params.seedKey, params.institution.id);
  const data = generateBusinessData(shape, params.businessId, params.asOf, { [params.institution.id]: params.connectionId });
  for (const a of data.accounts) a.institutionName = params.institution.name;
  return data;
}

// --- Shapes ---------------------------------------------------------------

export const ADEBAYO_INSTITUTIONS: InstitutionShape[] = [
  { institutionId: "sterling", role: "primary", last4: "4821", balance: 4_280_300, accountType: "Current" },
  { institutionId: "firstbank", role: "secondary", last4: "7730", balance: 2_141_750, accountType: "Current" },
  { institutionId: "uba", role: "tertiary", last4: "0915", balance: 1_062_400, accountType: "Current" },
];

export const ADEBAYO_SHAPE: BusinessShape = {
  seed: 20260482,
  monthlyInflow: 6_520_000,
  expenseRatio: 0.565,
  volatility: 0.09,
  windowStart: 22,
  loanRepaymentMonthly: 400_000,
  loanRepaymentDay: 5,
  obligationsOutstanding: 1_200_000,
  recentTrend: 1.06,
  seasonal: { 4: 0.86, 5: 0.93 },
  events: [
    { month: 7, day: 15, amount: 2_450_000, category: "contract_payment", counterparty: "Lagos State Home-Grown School Feeding", narration: "Contract payment — Q2 supply" },
    { month: 8, day: 9, amount: -1_650_000, category: "equipment", counterparty: "Coolworld Refrigeration", narration: "Cold-room compressor replacement" },
  ],
  institutions: ADEBAYO_INSTITUTIONS,
  names: {
    settlementCounterparties: ["Shoprite Distribution", "Justrite Superstores", "Prince Ebeano Supermarket", "Spar Nigeria"],
    salesCounterparties: ["Mama Cass Restaurants", "Chicken Republic", "Kilimanjaro Foods", "Sweet Sensation", "Eko Hotels procurement", "Mile 12 wholesalers", "Oyingbo market agents"],
    suppliers: ["Dangote Sugar Refinery", "Flour Mills of Nigeria", "Olam Grains", "Honeywell Flour", "Wacot Rice"],
    payrollNarration: "Monthly payroll — 14 staff",
    rentCounterparty: "Oregun Industrial Estate",
    rentAmountQuarterly: 1_800_000,
  },
};

/** Minor account shape used when the SME connects an institution outside the main three. */
function minorInstitution(institutionId: string): InstitutionShape {
  const code = institutionId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    institutionId,
    role: "minor",
    last4: String(1000 + (code * 37) % 9000),
    balance: 180_000 + (code * 1234) % 420_000,
    accountType: institutionId === "opay" || institutionId === "moniepoint" ? "Wallet" : "Current",
  };
}

export function shapeFor(seedKey: string, institutionId: string): BusinessShape {
  const base = seedKey === "adebayo" ? ADEBAYO_SHAPE : genericShape(seedKey);
  const known = base.institutions.find((i) => i.institutionId === institutionId);
  const totalShareOverride = base.institutions.reduce((a, i) => a + ROLE_INFLOW_SHARE[i.role], 0);
  return { ...base, institutions: [known ?? minorInstitution(institutionId)], totalShareOverride };
}

function buildGenericInstitutions(rng: Rng, monthlyInflow: number): InstitutionShape[] {
  const primary = rng.pick(["gtbank", "access", "zenith", "sterling", "firstbank"]);
  const out: InstitutionShape[] = [
    { institutionId: primary, role: "primary", last4: String(rng.int(1000, 9999)), balance: Math.round(monthlyInflow * rng.between(0.2, 0.8)), accountType: "Current" },
  ];
  if (rng.chance(0.75)) {
    const secondary = rng.pick(["uba", "stanbic", "moniepoint", "opay", "zenith"].filter((i) => i !== primary));
    out.push({ institutionId: secondary, role: "secondary", last4: String(rng.int(1000, 9999)), balance: Math.round(monthlyInflow * rng.between(0.05, 0.4)), accountType: secondary === "opay" || secondary === "moniepoint" ? "Wallet" : "Current" });
  }
  if (rng.chance(0.3)) {
    const used = out.map((o) => o.institutionId);
    const tertiary = rng.pick(["uba", "stanbic", "moniepoint", "opay", "access", "gtbank"].filter((i) => !used.includes(i)));
    out.push({ institutionId: tertiary, role: "tertiary", last4: String(rng.int(1000, 9999)), balance: Math.round(monthlyInflow * rng.between(0.03, 0.2)), accountType: "Current" });
  }
  return out;
}

export function genericShape(seedKey: string, overrides: Partial<BusinessShape> = {}): BusinessShape {
  const seed = seedKey.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rng = createRng(seed);
  const monthlyInflow = overrides.monthlyInflow ?? Math.round(rng.between(1_800_000, 14_000_000) / 50_000) * 50_000;
  const expenseRatio = overrides.expenseRatio ?? rng.between(0.55, 0.85);
  // Existing debt service is bounded to a share of net flow so seeded businesses stay internally coherent.
  const netFlow = monthlyInflow * (1 - expenseRatio);
  const loanRepaymentMonthly = rng.chance(0.6) ? Math.round(Math.min(monthlyInflow * rng.between(0.03, 0.12), netFlow * 0.3) / 10_000) * 10_000 : 0;
  return {
    seed,
    monthlyInflow,
    expenseRatio,
    volatility: rng.between(0.08, 0.32),
    windowStart: rng.pick([1, 5, 15, 22, 25, 27]),
    loanRepaymentMonthly: Math.max(0, loanRepaymentMonthly),
    loanRepaymentDay: rng.pick([3, 5, 7, 10]),
    obligationsOutstanding: Math.round(monthlyInflow * rng.between(0.1, 0.9) / 100_000) * 100_000,
    recentTrend: rng.between(0.78, 1.12),
    seasonal: rng.chance(0.5) ? { [rng.int(1, 8)]: rng.between(0.6, 0.9) } : undefined,
    institutions: buildGenericInstitutions(rng, monthlyInflow),
    names: {
      settlementCounterparties: ["Principal customer A", "Principal customer B", "Principal customer C"],
      salesCounterparties: ["Customer transfer", "Retail customer", "Wholesale customer", "Corporate client"],
      suppliers: ["Primary supplier", "Secondary supplier", "Raw materials vendor"],
      payrollNarration: "Monthly payroll",
      rentCounterparty: "Premises landlord",
      rentAmountQuarterly: Math.round(monthlyInflow * 0.25 / 50_000) * 50_000,
    },
    ...overrides,
  };
}
