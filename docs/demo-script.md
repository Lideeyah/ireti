# Demo script — end to end

Open `http://localhost:3100`. If the demo has been used before, sign in as the administrator and use **Administration → Reset demo environment**, or run `npm run db:reset`.

## Accounts

All seeded accounts share the demo password `ireti-demo-2026` (demo environment only).

| Account | Email | Role |
|---|---|---|
| Folake Adebayo (Adebayo Foods Ltd, not yet onboarded) | folake@adebayofoods.ng | SME |
| Sarah Adeyemi | s.adeyemi@bank.example | Credit Officer |
| Emeka Nwosu | e.nwosu@bank.example | Risk |
| Halima Bello | h.bello@bank.example | Operations |
| Tunde Okafor | t.okafor@bank.example | Compliance |
| Ngozi Eze | n.eze@bank.example | Administrator |

You can also create a brand-new business account at `/sign-up`.

## SME

1. **Enter product** — click *Continue as SME* and either sign in as Folake Adebayo or create a new business account. New accounts land on onboarding.
2. **Create business** — fill the form (or click *Use demo business details* for Adebayo Foods Ltd) and *Continue*. Validation blocks continuation until all required fields are valid.
3. **Verify BVN** — enter any 11-digit number, click *Verify identity*. Observe the processing state, then **Identity verified**. Continue.
4. **Connect three bank accounts** — select Sterling Bank, FirstBank and UBA, then click *Connect* on each. Each moves Not connected → Connecting → Connected and shows account ending, current balance and last synced. (Any institution can be connected; the three above carry the richest seeded data.)
5. **See accounts connected** — 3 of 3 connected. Click *Run financial analysis*.
6. **Run financial analysis** — the progress sequence animates through six stages.
7. **See consolidated financial profile** — revenue, expenses, cash flow, credit behaviour, liquidity, with the explanatory narrative. Click *View credit profile*.
8. **See proprietary credit assessment** — 82 / 100 Strong, five expandable factors with evidence, policy evaluation, risk and repayment observations.
9. **See eligible amount** — ₦18,500,000 eligible, ₦12,000,000 recommended, 6 months, window 22nd–24th. Click *Apply for credit*.
10. **Apply for ₦12m** — amount defaults to the recommendation; try typing a higher amount to see the eligibility cap. Choose a purpose and tenor. Continue.
11. **Review interest, fees and total repayment** — interest (18% annualised, reducing balance), ₦60,000 fee, total repayable and instalment.
12. **See recommended repayment window** — 22nd–24th monthly, recommended date 23rd. Click *Review application*.
13. **Give consent** — tick all four permissions. The submit button enables only when all are ticked.
14. **Submit application** — processing state, then **Application submitted** with reference `IR-2026-00482` (sequence continues from seeded data) and status Under review. Click *View application* to see the timeline and activity log.
15. **Application enters bank queue** — the bank notification badge increments.

## Bank

16. **Switch to Bank** — sign out from the user menu and sign in as Sarah Adeyemi (Credit Officer).
17. **See new application** — Lending operations shows the queue with Adebayo Foods Ltd as *Submitted*. Open *Applications* to filter *New*.
18. **Open Adebayo Foods Ltd** — status moves to *In review*; the access is written to the ledger and the SME is notified.
19. **Review business information**, **consolidated accounts** (3 institutions, total observed balance), **12-month financial trends** (switch 12/6/3 months; recent quarter shaded), and the **credit assessment**.
20. **Open assessment factors** — click each factor to reveal evidence.
21. **Read decision-support recommendation** — "Approve within configured eligibility", confidence High, reasoning bullets. The officer decides.
22. **Approve** — click *Approve*, review the confirmation (amount, tenor, total expected repayment, window), click *Confirm approval*. Observe *Submitting approval to banking system…* then **Approval confirmed** and the next state *Preparing disbursement*.
23. **Initiate disbursement** — the disbursement panel states that it requires Operations. Sign out and sign in as Halima Bello, reopen the application and click *Initiate disbursement*.
24. **Disbursement succeeds** — **Disbursement confirmed** with amount, destination •••• 4821, timestamp, reference and mandate. (To show the failure path, click *Simulate failure* first, then *Retry disbursement* or *Escalate to operations*.)

## After approval

25. **Return to SME** — sign in as the business again; the overview shows the disbursed facility.
26. **See disbursement** on the application timeline and banner.
27. **See repayment schedule** — *Repayments*: outstanding ₦12.7m, next instalment ≈ ₦2.1m, expected date 23 Oct, window 22–24 Oct, six-instalment timeline.
28. **See recommended repayment date** — Repayment profile: strongest inflow 22nd–24th, average inflow in window, recommended date 23rd, with the no-guarantee statement.

## Monitoring

29. **Bank opens Monitoring** — portfolio health counts and open cases (seeded: Ilorin Furniture Makers at risk after a failed repayment; Uyo Poultry Farms on watch for reduced inflows).
30. **See repayment event** — as Operations, on the application's repayment panel click *Simulate failed debit*; Monitoring shows the new case and the facility at **At risk**. Open the case: assign, add a note, escalate or resolve.
31. **See risk state** — the SME's Repayments page shows **Repayment attention required** with Retry.
32. **Open audit ledger** — sign in as Compliance (Tunde Okafor). The ledger shows the full chain for `IR-2026-00482`: consent, profile generated, assessment created (score 82, model CA-2.4), submitted, review started, data access, approved, disbursement initiated and confirmed, mandate created, repayment failed, risk event created. Expand a row for metadata and hashes; chain integrity reads **Verified**.

## Shortcuts

Administrators have **Administration → Demo controls** for resetting the environment and simulating repayments on any disbursed facility.
