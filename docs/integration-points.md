# Integration points

Each external dependency sits behind an interface in `src/lib/services/`. The demo ships an in-process implementation; production replaces the implementation, not the callers.

## 1. Identity verification — `IdentityVerificationService`
- **Demo**: `demoIdentityService` validates format and simulates latency. The BVN is held only in component state during the call and is never persisted; the store records `identityVerified` and an `IDENTITY_VERIFIED` audit event.
- **Production**: NIBSS BVN validation through the bank's identity service, with the bank's KYC tier rules. Consider adding CAC registry verification at the same point.

## 2. Open Banking — `BankConnectionService`
- **Demo**: `demoBankConnectionService.connectBank` returns deterministic accounts and 12 months of transactions per institution. Connection, refresh and disconnect states are modelled.
- **Production**: an aggregator or direct APIs under the Open Banking Nigeria framework. The consent handshake happens on the institution's side (redirect / app-to-app); Ìrètí stores a `Consent` record with scope and a hash and never sees credentials. `refreshConnection` maps to incremental transaction sync; `disconnectBank` revokes consent.

## 3. Disbursement — `DisbursementService`
- **Demo**: `demoDisbursementService` returns `confirmed` with a reference, or `failed` with a reason (demo controls can force either).
- **Production**: the bank's core banking system or payment switch (NIP). Map response codes to `confirmed` / `failed`; keep `processing` for asynchronous responses and poll `getDisbursementStatus`. Idempotency keys should be the application reference + attempt.

## 4. Repayment — `RepaymentService`
- **Demo**: mandate creation and debit outcomes are simulated.
- **Production**: NIBSS direct debit (mandate creation, presentment on the due date within the window) or the bank's own collections engine. Retry policy (`maxDebitRetries`, `graceDays`) comes from BankPolicy.

## 5. Audit ledger — `AuditLedger`
- **Demo**: `demoAuditLedger` maintains a SHA-256 hash chain in process; `verify()` recomputes it on load and the audit screen shows the result.
- **Production**: a permissioned ledger (Hyperledger Fabric, Quorum) or a WORM/append-only store with the same `record` / `verify` contract. Only metadata and hashes cross this boundary. See `security-model.md`.

## 6. Decision support — `DecisionSupportService`
- **Demo**: deterministic rules in `src/lib/ai/decisionSupport.ts`.
- **Production**: a hosted model or vendor scorecard. The output shape (observations, recommendation, confidence) is fixed, so the UI and the audit event (`ASSESSMENT_CREATED` with `modelVersion`) remain unchanged. The product must keep working if the model is unavailable: fall back to the deterministic implementation and flag reduced confidence.

## 7. Notifications
- **Demo**: in-app notification centre.
- **Production**: email/SMS/push via the bank's messaging platform, driven by the same `Notification` records.

## 8. Authentication and roles
- **Demo**: persona switcher selects a seeded bank user; permissions are enforced by `can(role, permission)`.
- **Production**: the bank's SSO (SAML/OIDC) with role claims mapped onto `Role`. The permission matrix in `src/lib/auth/roles.ts` is the single place to adjust.

## 9. Persistence
- **Demo**: persisted browser store.
- **Production**: a relational database with the entities in `data-model.md`; the store's actions become API handlers and the UI reads through a data layer.
