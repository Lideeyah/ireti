# Ìrètí — Product overview

**Ìrètí** (Yoruba: *hope*) is SME lending infrastructure for commercial banks. It gives a bank a consolidated view of an applicant's financial behaviour across institutions, produces a structured credit assessment against the bank's own lending policy, recommends repayment timing around observed cash-flow behaviour, and records every material lending event in a private, permissioned audit ledger.

The brand name carries its Yoruba diacritics everywhere it appears: **Ìrètí**, never "Ireti".

## What the platform does

1. Onboards the SME (business details).
2. Verifies identity (BVN) through an identity adapter; the BVN itself is never stored.
3. Connects the SME's bank accounts through an Open Banking connection layer with explicit consent per institution.
4. Consolidates financial activity across all connected accounts.
5. Analyses ~12 months of transactions with greater weight on the most recent three months.
6. Produces a structured **financial profile** (revenue, expenses, cash flow, credit behaviour, liquidity window).
7. Generates a **proprietary credit assessment** (score, band, weighted factors with evidence).
8. Evaluates the result against **configured bank policy** and calculates an eligible lending amount.
9. Lets the SME apply for an amount within eligibility, with pricing from policy.
10. Recommends a repayment window aligned with the strongest recurring inflow.
11. Routes the application to the bank's review queue.
12. Gives the officer a complete **decision-support view**: business, consolidated accounts, 12-month trends, assessment factors, policy checks and a recommendation with confidence.
13. Supports approve, reject, or request additional information. The decision is always human.
14. Runs disbursement as an explicit, separately authorised step with real success/failure states.
15. Tracks repayment through a mandate and schedule; failures open risk cases rather than triggering automatic collections.
16. Records consent, access, assessment, decision, disbursement, repayment and risk events in an **immutable, hash-chained audit ledger** that the SME can also see in a customer-facing view.

## Positioning

- The **lending workflow** is the product.
- **AI / analytics** is a decision-support layer. It never decides.
- **Open Banking** is the financial-data layer.
- The **private permissioned ledger** is the auditability layer.

Ìrètí is not a consumer finance app, a loan marketplace, a chatbot, or a public blockchain product.

## Two experiences

| Area | Route | Who |
|---|---|---|
| Business portal | `/sme` | The SME applying for credit |
| Operations console | `/bank` | Credit officers, risk, operations, compliance, administrators |

A development route `/dev` offers demo controls (reset, role switch, journey shortcuts).

## Demo environment

Everything runs locally with seeded data. Identity verification, bank connections, disbursement and repayment are simulated by adapters that return realistic states, and the UI labels them (DEMO ENVIRONMENT, SIMULATED BANK CONNECTION, DEMO DISBURSEMENT, DEMO CREDIT ASSESSMENT). No live banking system is contacted and no real credentials are required.
