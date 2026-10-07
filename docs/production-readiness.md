# Production readiness

This document separates what exists, what is a demo implementation, and what remains institution-specific. It makes no claim of regulatory certification, production banking integration or bank approval.

## Already implemented (product level)

- Complete lending workflow: onboarding → identity → account connection → analysis → assessment → eligibility → application → consent → bank review → decision → disbursement → repayment → monitoring → audit.
- Relational domain model for all required entities (see `data-model.md`).
- Separation of data, analysis, policy, decision support and human decision in code.
- Configurable lending policy (`BankPolicy`) driving pricing, eligibility, tenors, documents, repayment rules and risk thresholds; versioned on change.
- Reducing-balance pricing and amortisation schedule aligned to the recommended repayment day.
- Accounts, sessions and role-based permissions enforced server-side in every action; UI gating mirrors it.
- Append-only, hash-chained audit ledger with integrity verification and a customer-facing access view.
- Notification centre for SME and bank audiences.
- Risk cases with assignment, notes, escalation and resolution; facility health states.
- Explicit loading, empty and error states; no silent success.
- Institutional design system with a disciplined status/risk colour mapping; DM Sans; tabular numerals.
- Documentation set.

## Demo implementations (to be replaced, same interfaces)

| Area | Demo | Replace with |
|---|---|---|
| Identity verification | Format check + simulated latency | NIBSS BVN validation via bank identity provider |
| Bank connection / transactions | Deterministic seeded generator | Open Banking aggregator or direct APIs with institution-side consent |
| Disbursement | Simulated success/failure | Core banking / NIP integration with idempotency and async status |
| Repayment | Simulated mandate and debits | NIBSS direct debit / collections engine |
| Audit ledger | SHA-256 chain in the application database, written inside each transaction | Permissioned ledger or WORM store mirroring the same events |
| Decision support | Deterministic rules | Governed model with versioning and fallback |
| Authentication | Email + hashed password, server sessions | Bank SSO (OIDC/SAML) for staff; MFA; password policy and recovery for SMEs |
| Persistence | Prisma over SQLite (local) | Prisma over managed PostgreSQL with backups and migrations |
| Notifications | In-app only | Email / SMS / push via bank messaging |

## Institution-specific work remaining

1. **Integrations** listed above, against the bank's actual systems and vendors.
2. **Credit policy configuration** — real limits, rates, fees, tenors, document requirements, risk thresholds; approval matrices (dual control for amounts above thresholds).
3. **Credit model** — validation of the assessment approach, or integration of the bank's model; bureau data (CRC, FirstCentral, CreditRegistry) as an additional input; model governance.
4. **Security validation** — penetration test, secure SDLC review, secrets and key management, encryption, logging and SIEM integration, NDPR compliance review, data retention.
5. **Regulatory approval** — CBN requirements for digital lending, Open Banking participation, consent management and record keeping; legal review of consent and facility terms.
6. **Operational integration** — collections and recovery procedures, reconciliation, GL posting, reporting, customer support tooling, SLAs.
7. **Non-functional** — hosting, availability targets, backup/restore, observability, load testing, accessibility audit.
8. **User acceptance** — pilot with a controlled SME cohort; officer training; adjustments to queue and review ergonomics.

## What this prototype is not

- Not connected to any bank, Open Banking provider, NIBSS or payment switch.
- Not a regulated credit score.
- Not a public blockchain product.
- Not certified, approved or audited by any regulator or institution.
