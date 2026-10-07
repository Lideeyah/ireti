# Architecture

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — server components render each page from the database; client "islands" handle interaction and call **server actions**.
- **Prisma ORM** over **SQLite** locally (`prisma/schema.prisma`); the datasource provider switches to PostgreSQL for deployment without changing the application code.
- **Authentication**: email + bcrypt-hashed password, server-side sessions in the `Session` table, `httpOnly` cookie, route protection in `src/middleware.ts` and role checks in every server action.
- **Tailwind CSS v4** with design tokens as CSS variables (see `src/app/globals.css`).
- **Recharts** — financial charts.
- **DM Sans** via `next/font` — single typeface, tabular numerals for money.

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
  server/                 Auth, use cases, read models, ledger (server-only)
  middleware.ts           Session-cookie route protection
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
| Audit ledger | `recordAudit / verifyLedger` | SHA-256 hash chain in the `AuditEvent` table, verified on load | Permissioned ledger (e.g. Hyperledger Fabric) or WORM store |
| Decision support | `DecisionSupportService.analyse` | Deterministic rules | Hosted model / vendor scorecard behind the same output shape |

## Request flow and source of truth

```
Browser ──(server action)──▶ src/app/actions.ts ──▶ src/server/{sme,bank,risk,demo}.ts ──▶ Prisma ──▶ SQLite/Postgres
   ▲                                                       │ recordAudit() + notify() in the same transaction
   └──(revalidatePath → server components re-render)◀──────┘
```

- `src/server/auth.ts` — sign-up, sign-in, sessions, `requireSmeUser` / `requireBankUser(permission)`.
- `src/server/sme.ts` — business details, identity verification, account connection, analysis, application submission, information provision, access reports. Every function is scoped to the caller's organisation.
- `src/server/bank.ts` — review access logging, information requests, approve/reject, disbursement, collections, policy updates.
- `src/server/risk.ts` — risk events and cases.
- `src/server/queries.ts` — read models for pages.
- `src/server/core.ts` — audit ledger writes (hash chain computed inside the transaction), notifications, policy access, reference counters.

Each use case runs inside a database transaction that also appends the audit event, so state and ledger can never disagree. Async adapter calls (`connecting`, `processing`) are persisted as explicit statuses before the adapter is called and resolved afterwards, so a page refresh mid-operation shows the truth.

## Design system

Colour is a signal, never decoration. Tokens follow the SME credit UI colour system: cool graphite neutrals, cobalt primary, four status roles (success / warning / danger / info), a violet single-hue risk-grade ramp that cannot be confused with status, and a categorical chart palette. The loan lifecycle maps each state to exactly one chip treatment (see `src/components/ui/Chip.tsx`). Money renders in primary text; only deltas take colour.
