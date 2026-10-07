# Ìrètí — SME lending infrastructure

A working prototype of an SME lending infrastructure platform for Nigerian commercial banks: consolidated financial view through Open Banking connections, structured credit assessment against configured policy, cash-flow-aware repayment, human lending decisions, disbursement and repayment tracking, and a permissioned audit ledger.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3100. Demo mode works immediately with seeded data; nothing external is contacted.

- `/` entry · `/sme` business portal · `/bank` operations console · `/dev` demo controls (reset, role switch, journey shortcuts)
- `npm run calibrate` prints the seeded Adebayo Foods analysis
- `npm run typecheck` · `npm run build`

## Documentation

See `docs/`: product overview, architecture, data model, integration points, security model, credit assessment, demo script, production readiness.
