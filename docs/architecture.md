# Architecture

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — application shell and routes.
- **Tailwind CSS v4** with design tokens as CSS variables (see `src/app/globals.css`).
- **Zustand (persisted)** — application state and the use-case layer. State is persisted to `localStorage` so the demo survives refreshes and can be reset from `/dev`.
- **Recharts** — financial charts.
- **DM Sans** via `next/font` — single typeface, tabular numerals for money.

No backend process is required for the demo; the architecture is layered so that each layer can be moved behind an API without changing the UI.

## Layering — data → analysis → policy → decision

```
Transaction data (BankConnectionService)
        ↓
Financial analysis        src/lib/analysis/financialAnalysis.ts      → FinancialProfile
        ↓
Credit assessment         src/lib/assessment/engine.ts               → score, factors, eligibility
        ↓
Bank policy evaluation    src/lib/policy/evaluate.ts                 → policy checks
        ↓
Decision support          src/lib/ai/decisionSupport.ts              → recommendation + confidence
        ↓
Human bank decision       store actions approve/reject/requestInformation
```

Each arrow is a plain function boundary with typed inputs/outputs (`src/lib/domain/types.ts`). The assessment engine calls policy evaluation and decision support, but the **decision** only happens in the store when a bank user with `bank:decide_application` acts.

## Directory map

```
src/
  app/                    Routes (SME, Bank, dev, entry)
  components/
    ui/                   Primitives: Button, Chip (status mapping), Card, Input, Modal, Steps, Tabs…
    shell/                AppShell, notification centre, persona switcher, permission gate
    charts/               Cash-flow line chart, inflow/outflow bars, repayment timeline
    bank/                 Application queue
  lib/
    domain/               Entity types and labels
    analysis/             Financial analysis (measurement only)
    assessment/           Deterministic demo credit engine (configurable weights)
    policy/               Default policy + evaluation
    ai/                   DecisionSupportService interface + deterministic implementation
    loan/                 Pricing (reducing balance, equal instalments) and schedule
    services/             Adapters: identity (BVN), bank connection, disbursement, repayment, audit ledger
    seed/                 Institutions, deterministic transaction generator, demo organisation set
    auth/                 Roles and permission matrix
    store/                Zustand store = repositories + use cases
    util/                 PRNG, SHA-256, ids, dates
docs/                     This documentation
scripts/calibrate.ts      Reproduces the seeded Adebayo Foods analysis from the command line
```

## Services (adapters)

| Service | Interface | Demo implementation | Production target |
|---|---|---|---|
| Identity | `IdentityVerificationService.verifyBvn` | Format check + delay; BVN never stored | NIBSS BVN validation via the bank's identity provider |
| Open Banking | `BankConnectionService` (connect, accounts, balances, transactions, refresh, disconnect) | Deterministic seeded accounts/transactions | Open Banking Nigeria aggregator or direct bank APIs |
| Disbursement | `DisbursementService` (initiate, status, retry) | Simulated NIP-style success/failure | Core banking / payment switch |
| Repayment | `RepaymentService` (mandate, schedule, process, status, retry) | Simulated debit outcomes | NIBSS direct debit / collections engine |
| Audit ledger | `AuditLedger.record / verify` | In-process SHA-256 hash chain | Permissioned ledger (e.g. Hyperledger Fabric) or WORM store |
| Decision support | `DecisionSupportService.analyse` | Deterministic rules | Hosted model / vendor scorecard behind the same output shape |

## State and source of truth

The Zustand store (`src/lib/store/store.ts`) holds a relational `DB` of entities keyed by id and exposes use-case actions (`connectInstitution`, `runAnalysis`, `submitApplication`, `approveApplication`, `initiateDisbursement`, `processRepayment`, case actions, `updatePolicy`, …). Every UI interaction calls an action; every action mutates entities and appends audit events through the ledger service. Views are derived from the store, never from local component state, so the SME and bank experiences are always consistent.

Async operations (`connecting`, `processing`, `submitting`) are represented as explicit entity states, not just spinners, so the UI can never show a success the store does not hold.

## Design system

Colour is a signal, never decoration. Tokens follow the SME credit UI colour system: cool graphite neutrals, cobalt primary, four status roles (success / warning / danger / info), a violet single-hue risk-grade ramp that cannot be confused with status, and a categorical chart palette. The loan lifecycle maps each state to exactly one chip treatment (see `src/components/ui/Chip.tsx`). Money renders in primary text; only deltas take colour.
