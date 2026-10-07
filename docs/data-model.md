# Data model

All entities are defined in `src/lib/domain/types.ts` and stored relationally (by id) in the application store. Relationships are by reference; data is not duplicated across entities.

## Entities

| Entity | Key fields | Relationships |
|---|---|---|
| **User** | id, name, role, title | → Organisation |
| **Organisation** | id, name, type (sme/bank) | |
| **Business** | id, name, cacNumber, cacStatus, businessType, industry, location, yearsOperating, declaredMonthlyRevenue, identityVerified(+At) | → Organisation |
| **BankConnection** | id, institutionId, status (not_connected/connecting/connected/failed), provider, connectedAt, lastSyncedAt, failureReason | → Business, → Consent |
| **BankAccount** | id, institutionName, accountNumberMasked, accountType, balance | → BankConnection, → Business |
| **Transaction** | id, date, amount (+ inflow / − outflow), category, counterparty, narration | → BankAccount, → Business |
| **FinancialProfile** | monthly aggregates, recency-weighted averages, revenue CV & consistency, expense ratio, positive months, obligations & debt-service ratio, payment consistency, strongest inflow window, recommended repayment day, narrative | → Business |
| **CreditAssessment** | score, band, factors[] (label, rating, score, weight, evidence), eligibleAmount, recommendedAmount, recommendedTenor, repaymentWindow, risk/repayment observations, recommendation (action, confidence, reasoning), policyChecks, modelVersion, policyVersion | → Business, → FinancialProfile |
| **LoanOffer** | principal, tenor, annualInterestRate, interestMethod, interestAmount, feeAmount, totalRepayable, instalmentAmount, repaymentWindow, policyVersion | → Business, → LoanApplication |
| **LoanApplication** | reference (IR-YYYY-NNNNN), amount, purpose, tenor, status, submittedAt, reviewer, decision, informationRequest, disbursement record | → Business, → CreditAssessment, → LoanOffer, → Consent, → RepaymentPlan |
| **RepaymentPlan** | mandateReference, principal, totalRepayable, outstanding, paidToDate, health (healthy/watch/at_risk/completed) | → LoanApplication, → LoanOffer, → Repayment[] |
| **Repayment** | sequence, dueDate, window, amount, principal/interest portions, status (scheduled/processing/paid/failed/overdue), attempts, reference, failureReason | → RepaymentPlan |
| **RiskEvent** | type, severity, description | → Business, → LoanApplication, → Case |
| **Case** | reference (RISK-YYYY-NNNN), severity, trigger, owner, assignee, status (open/assigned/escalated/resolved), notes[], history[] | → RiskEvent, → Business, → LoanApplication |
| **AuditEvent** | seq, timestamp, type, actor (id/name/role), resource, metadata, payloadHash, previousHash, hash, customerVisible | → Business, → LoanApplication |
| **Notification** | audience (sme/bank), type, title, body, read, href | |
| **BankPolicy** | version, limits, min score, tenors, interest rate, fee, required documents, eligibility parameters, repayment rules, risk thresholds | |
| **Document** | type, name, status (requested/provided/verified) | → Business, → LoanApplication |
| **Consent** | scope[], grantedAt, grantedBy, hash | → Business, → LoanApplication / BankConnection |

## Status models

**Application**: `submitted → under_review → (additional_information →) approved → disbursement_pending → disbursed | disbursement_failed`, or `→ rejected`. Approval never sets `disbursed`; only a confirmed disbursement adapter response does.

**Disbursement record**: `pending → processing → confirmed | failed` (retry increments attempts).

**Repayment**: `scheduled → processing → paid | failed`; `overdue` is reserved for instalments unpaid beyond the grace period.

**Facility health**: `healthy | watch | at_risk | completed`, driven by failed debits, open cases and policy thresholds.

## Seeded demo data

- **Adebayo Foods Ltd** — the live demo SME. Starts un-onboarded. On connection, the generator produces ~450 transactions over 12 months across Sterling (•••• 4821), FirstBank (•••• 7730) and UBA (•••• 0915): distributor settlements on the 22nd–24th, weekly retail inflows, supplier payments, payroll on the 28th, quarterly rent, utilities, VAT, a ₦400k monthly repayment on an existing facility, a seasonal dip, one large contract inflow and one equipment purchase. Analysis lands at a score of 82/100, ₦18.5m eligibility and a 22nd–24th window.
- **Twenty other businesses** populate the bank queue across every status, including two disbursed facilities on watch / at risk with open cases.

Transactions are persisted only for Adebayo Foods; other businesses keep their derived FinancialProfile (charts use monthly aggregates).
