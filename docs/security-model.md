# Security model

## Principle of least privilege

Roles and permissions are explicit (`src/lib/auth/roles.ts`). Every server action calls `requireBankUser(permission)` or `requireSmeUser()` before touching data, and SME use cases are scoped to the caller's organisation. The `Require` component mirrors the same matrix in the UI so staff see what they cannot do and why.

## Authentication and sessions

- Passwords are hashed with bcrypt (cost 10). Minimum length is enforced at sign-up.
- Sessions are random 256-bit identifiers stored server-side with an expiry, carried in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). Signing out deletes the session row.
- `src/middleware.ts` redirects unauthenticated requests for `/sme` and `/bank` to sign-in; layouts then verify the organisation type and pages verify permissions.

| Role | Can |
|---|---|
| SME_USER | View own application, apply, report unusual access |
| BANK_OFFICER | View queue, review applications, decide (approve/reject), request information, view financials and risk |
| BANK_RISK | View queue, review, view financials and risk, manage cases |
| BANK_OPERATIONS | View queue, review, manage disbursement, process repayments, manage cases |
| BANK_COMPLIANCE | View queue, review, view financials and risk, inspect audit ledger, manage cases |
| ADMIN | Everything above plus configure lending policy |

No bank role can see or access raw banking credentials; credentials never enter the product.

## Data handling

- **BVN**: used transiently for verification, never persisted. Only the verification outcome and timestamp are stored.
- **Banking credentials**: never collected. Consent is granted at the institution; Ìrètí stores a consent record (scope, time, hash).
- **Account numbers**: stored masked (`•••• 4821`).
- **Transactions**: held in the application data store for analysis; **never** written to the audit ledger.
- **Policy and model versions**: recorded with every assessment so decisions can be reconstructed.

## Audit ledger

- Private and permissioned: readable by Compliance and Admin in the bank; the SME sees a customer-facing subset (`customerVisible` events for their own business).
- Append-only. Each event carries `seq`, `payloadHash` (SHA-256 of canonical metadata), `previousHash` and `hash`. `verify()` recomputes the chain; the audit screen reports integrity.
- Stored content is limited to: event type, actor id/name/role, application reference, resource label, non-sensitive metadata (amounts, versions, statuses, references, counts, hash prefixes). No BVNs, passwords, transaction histories or raw financial data.

Recorded events: identity verified, consent recorded, account connected / failed, data access, financial profile generated, assessment created (score + model version), application submitted / review started / information requested / provided / approved / rejected, disbursement initiated / confirmed / failed, mandate created, repayment processed / failed, risk event created, case updated / resolved, access reported, policy updated.

## Data access events and customer control

Whenever a bank user opens an application review, a `DATA_ACCESS` event is recorded with actor, role and time (deduplicated within 15 minutes per user and application to avoid noise). The SME sees this in *Data access* and on the application timeline and can **Report unusual access**, which opens a compliance case and is itself recorded.

## Separation of concerns

Data → analysis → assessment → policy → decision support → human decision are separate modules. The decision-support layer cannot change application state; only an authorised human action can.

## Production hardening (not in the demo)

SSO/OIDC with role claims for bank staff; MFA; account recovery; rate limiting and lockout on sign-in; encryption at rest and in transit; secrets management; CSRF hardening beyond the framework defaults; penetration testing; data retention and deletion policies aligned to NDPR; and independent review of the ledger implementation.
