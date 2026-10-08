# Ìrètí — SME lending infrastructure

SME lending infrastructure for commercial banks: consolidated financial view through Open Banking connections, structured credit assessment against configured policy, cash-flow-aware repayment, human lending decisions, disbursement and repayment tracking, and a permissioned audit ledger.

## Run locally

```bash
npm install
cp .env.example .env     # defaults work for local development
npm run db:reset         # creates prisma/dev.db and seeds the demo bank, staff and queue
npm run dev
```

Open http://localhost:4300.

- Businesses create an account at `/sign-up`, then complete onboarding (business details, BVN verification, account connection, analysis, credit profile) and apply.
- Bank staff sign in at `/sign-in`. In demo mode (`DEMO_MODE=true`) the sign-in page lists the seeded staff accounts; the shared demo password is `ireti-demo-2026`.
- `/bank/settings` (administrators) holds staff accounts and the demo controls (reset, simulate repayments).

## Stack

Next.js 15 (App Router, server components and server actions) · TypeScript · Prisma with SQLite locally (switch the datasource provider to PostgreSQL for deployment) · session cookies with bcrypt-hashed passwords · Tailwind CSS v4 · Recharts · DM Sans.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 3100 |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:push` | Apply the Prisma schema to the database |
| `npm run db:seed` | Seed demo data (idempotent for accounts and policy) |
| `npm run db:reset` | Wipe, re-create and reseed the database |
| `npm run typecheck` | TypeScript check |
| `npm run calibrate` | Print the seeded Adebayo Foods analysis |
| `npm run seed:report` | Print every seeded application's score and eligibility |

## Documentation

See `docs/`: product overview, architecture, data model, integration points, security model, credit assessment, demo script, production readiness.
