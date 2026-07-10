# 10 Business Rules

## Document Control

- **Status:** Final v1 baseline
- **Scope:** Sikar Phase 1
- **Applies to:** Customer, Professional (also called Freelancer), Admin, Support, Finance, and automated platform processes
- **Related documents:** `02-BRD.md`, `03-PRD.md`, `04-SRS.md`, `12-Revenue-Model.md`, `13-Operations.md`, and `16-Legal.md`

This document converts the approved product decisions into enforceable rules. A value marked **Decision pending** must not be hard-coded. It must be supplied through an approved, versioned configuration or the affected operation must remain unavailable.

## 1. Locked Phase 1 Rules

1. BeautyAtHome operates a managed home beauty-services marketplace in Sikar.
2. Only verified female professionals may offer services at launch.
3. Only services from the admin-managed beauty-service catalog may be booked.
4. Customers may choose a specific professional or request best-professional assignment.
5. Guests may browse; mobile OTP is the only Phase 1 sign-up and login method.
6. A booking request requires a successful advance payment.
7. Professionals set prices only within platform-defined limits.
8. A dynamic, versioned commission rule applies to every confirmed booking.
9. Service completion requires the customer's completion OTP.
10. Only completed bookings may receive a verified review.
11. Professional earnings clear no earlier than six hours after verified completion.
12. A withdrawal request and the available cash balance must each be at least ₹500.
13. Support is available through WhatsApp and platform tickets.
14. Native apps, male professionals, non-beauty services, live GPS, multi-city operation, and microservices are outside Phase 1.

## 2. Terms and Authorities

| Term                   | Meaning                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer               | An authenticated user who creates or receives service bookings.                                                                                       |
| Professional           | A verified female independent beauty-service provider. “Freelancer” is a synonym in earlier documents; new domain language should use “Professional.” |
| Admin                  | An authorized platform operator acting within an assigned role.                                                                                       |
| Master service         | An admin-approved service definition that may be offered by eligible professionals.                                                                   |
| Booking snapshot       | The immutable service, price, commission, address zone, slot, and policy versions captured for a booking.                                             |
| Available cash balance | Cleared professional earnings held by the platform, net of finalized debits and active holds. Promotional credits are excluded.                       |
| Business time          | India Standard Time for customer-facing dates and policies. Persistent timestamps and duration calculations use UTC.                                  |

When rules conflict, applicable law and executed contracts prevail, followed by the latest approved policy version, this document, and then operational guidance. Admins may not override a financial or status rule without an authorized reason code and immutable audit record.

## 3. Identity and Access

### 3.1 Guest and customer access

- Guests may view public services, public professional profiles, prices, ratings, and available slots.
- Login is required before saving an address, creating a booking, paying, reviewing, rebooking, opening a ticket, or viewing private data.
- A verified mobile number identifies an account in Phase 1. Account linking and recovery must not expose whether an unrelated number is registered.
- A user must re-authenticate for security-sensitive account or payout changes according to the security policy.
- Customer account states are `ACTIVE`, `SUSPENDED`, `BLOCKED`, and `CLOSED`.
- `SUSPENDED` blocks new bookings but permits access to existing bookings and support unless a safety restriction requires otherwise.
- `BLOCKED` denies normal access and routes the user to support. Only an authorized admin may apply or remove it.

### 3.2 Professional access and eligibility

A professional may be searchable and receive offers only when all of the following are true:

- account state is `ACTIVE`;
- verification state is `APPROVED`;
- the Sikar service area and requested service are enabled;
- the requested price is inside the active service price limits;
- the slot is available and has no conflicting confirmed booking;
- no safety, compliance, finance, or fraud hold prevents assignment.

Exact identity documents, minimum age, training evidence, KYC checks, background checks, periodic reverification, and the legally compliant method of confirming launch eligibility are **Decision pending — Legal/Compliance review with Operations approval**.

### 3.3 Admin access

- Admin access is role-based and least-privilege.
- Verification, catalog, support, finance, and security permissions must be independently assignable.
- The same actor must not both create and approve a manual financial adjustment above an approved threshold.
- The adjustment threshold is **Decision pending — Finance and Security review**.
- All verification, status, pricing-limit, commission, refund, payout, role, and account-enforcement actions require actor, timestamp, reason code, before/after values, and correlation ID.

## 4. Professional Verification

### 4.1 Verification states

`DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED`

Alternate transitions are:

- `UNDER_REVIEW -> REJECTED`
- `APPROVED -> SUSPENDED -> APPROVED`

`REJECTED` is terminal for that application version. A requested correction is a `REJECTED` decision with reason `CORRECTION_REQUIRED`; resubmission creates a new `DRAFT` version and preserves the old submission. Reactivation from `SUSPENDED` requires an authorized re-review. A permanent revocation is represented by `SUSPENDED` plus a non-expiring enforcement record rather than an additional verification state.

### 4.2 Verification rules

- Submission requires all mandatory fields and explicit declarations for the active verification-policy version.
- Approval requires a named reviewer; self-approval is prohibited.
- Rejection, suspension, and revocation require a reason code and a user-safe explanation.
- A professional cannot publish services, accept offers, accrue new earnings, or appear in search before approval.
- Suspension prevents new offers but does not erase bookings, ledger entries, reviews, or audit history. Operations must reassign or resolve affected future bookings.
- Document retention and deletion periods are **Decision pending — Indian legal and privacy review**.

## 5. Service Catalog, Pricing, and Availability

### 5.1 Catalog

- Admin owns the master catalog, category hierarchy, descriptions, expected duration, city availability, and active state.
- A professional offering references a master service; professionals cannot create unapproved service types.
- Disabling a service prevents new bookings but does not alter existing booking snapshots.
- Material catalog or duration changes create a new effective version.

### 5.2 Price validation

For service `s`, city `c`, and effective instant `t`:

`min_price(s,c,t) <= professional_price <= max_price(s,c,t)`

- All values are integer paise in INR.
- The active price and applicable limits are snapshotted when the booking is created.
- A later price change affects only new bookings.
- Exact minimums, maximums, allowed increments, taxes, and exception authority are **Decision pending — Product, Finance, and Operations review**.
- If no approved price-limit version exists, the service cannot be published or booked.

### 5.3 Availability

- Availability is stored as explicit time intervals in the pilot city's time zone.
- A slot is offered only if it fits within availability, expected duration, and any configured travel/buffer time.
- A professional cannot accept overlapping bookings.
- Slot granularity, travel buffer, maximum daily workload, booking lead time, and future booking horizon are **Decision pending — Operations review**.
- Availability is rechecked transactionally when a professional accepts; stale availability must return a conflict rather than double-book.

## 6. Booking and Assignment

### 6.1 Booking modes

- `SELECTED_PROFESSIONAL`: the customer requests one chosen eligible professional.
- `BEST_AVAILABLE`: the platform finds eligible professionals for the service, zone, and slot.

The best-available candidate set must first satisfy every eligibility condition in section 3.2. Ranking inputs and weights are **Decision pending — Product, Operations, and fairness review**. Until approved, an assignment implementation must use an explicitly versioned deterministic ordering and professional ID as the final tie-breaker; it must not imply quality criteria that have not been approved.

### 6.2 Booking states

| State                  | Meaning                                                          | Allowed next states                                                  |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `DRAFT`                | Customer is selecting service, location, slot, and booking mode. | `PENDING_ADVANCE`, `CANCELLED`, `EXPIRED`                            |
| `PENDING_ADVANCE`      | Booking snapshot exists; advance is not captured.                | `PENDING_ASSIGNMENT`, `PENDING_PROFESSIONAL`, `EXPIRED`, `CANCELLED` |
| `PENDING_ASSIGNMENT`   | Advance is captured; the system is selecting a professional.     | `PENDING_PROFESSIONAL`, `CANCELLED`, `EXPIRED`                       |
| `PENDING_PROFESSIONAL` | An offer is waiting for professional response.                   | `CONFIRMED`, `PENDING_ASSIGNMENT`, `CANCELLED`, `EXPIRED`            |
| `CONFIRMED`            | An eligible professional accepted and the slot is reserved.      | `IN_SERVICE`, `CANCELLED`                                            |
| `IN_SERVICE`           | The professional marked the service as started.                  | `COMPLETION_PENDING`, `CANCELLED`                                    |
| `COMPLETION_PENDING`   | A completion OTP challenge is active.                            | `COMPLETED`, `IN_SERVICE`, `CANCELLED`                               |
| `COMPLETED`            | Customer completion OTP was verified.                            | Terminal booking state                                               |
| `CANCELLED`            | Booking ended under a cancellation reason.                       | Terminal booking state                                               |
| `EXPIRED`              | Required payment or response did not arrive in time.             | Terminal booking state                                               |

Payment, refund, dispute, and payout states are independent dimensions. A completed booking may therefore have an open dispute without rewriting its booking history.

### 6.3 Deterministic transition rules

1. Customer selection begins in `DRAFT`; freezing the booking snapshot for payment changes it to `PENDING_ADVANCE`.
2. No professional offer is sent before the gateway confirms advance capture through an idempotently processed event.
3. After capture, a selected-professional booking becomes `PENDING_PROFESSIONAL`; a best-available booking becomes `PENDING_ASSIGNMENT` and then `PENDING_PROFESSIONAL` when an offer is issued.
4. Acceptance atomically rechecks eligibility and availability, reserves the slot, and changes state to `CONFIRMED`.
5. A decline or offer timeout returns a best-available booking to `PENDING_ASSIGNMENT`. A selected-professional decline cancels that booking with reason `SELECTED_PROFESSIONAL_DECLINED` and starts the full-refund flow; the customer may explicitly create a new `BEST_AVAILABLE` booking.
6. If no eligible professional can be assigned, the booking is cancelled with reason `NO_PROFESSIONAL_AVAILABLE`, and all captured booking funds enter the refund flow.
7. `IN_SERVICE` requires the assigned professional and the scheduled-service context. The permitted early/late start window is **Decision pending — Operations review**.
8. Only the assigned professional may request completion; only the customer completion OTP may move the booking to `COMPLETED`.
9. Every transition is conditional on the current version, is idempotent, and appends a status-history record.

Payment expiry, offer timeout, maximum assignment attempts, and customer response timeout are **Decision pending — Product and Operations SLA review**. Until configured, production booking for the affected path must remain disabled rather than wait indefinitely.

### 6.4 Completion OTP

- The OTP confirms service completion, not login and not payment.
- It must be generated server-side for one booking, stored only in protected form, expire, have a limited attempt count, and be invalidated after success.
- The customer must not disclose it before the service is complete.
- Expiry duration, resend interval, and attempt limit are **Decision pending — Security review**.
- Manual completion is exceptional, requires Support plus authorized Admin approval, documentary evidence, a reason code, and an audit entry.

## 7. Cancellation, Refund, and Dispute Rules

### 7.1 Cancellation

- Every cancellation records initiating actor, booking state, reason code, policy version, timestamp, and calculated financial effect.
- Before professional acceptance, a customer cancellation or assignment failure returns all captured booking funds unless a legally reviewed non-refundable fee is active.
- After `CONFIRMED`, the system calculates rather than manually guesses the applicable cancellation fee.
- Cancellation after `IN_SERVICE` is always routed to Support for service-delivery assessment.
- A professional cancellation triggers reassignment where possible; otherwise it triggers cancellation and refund processing. Any professional consequence is policy-based and appealable.

Exact free-cancellation window, fee amount or percentage, professional compensation, no-show evidence, rescheduling limits, emergency exceptions, and repeat-cancellation consequences are **Decision pending — Product and Operations approval with Legal/Finance review**. Until approved, the customer-facing fee defaults to zero; no undisclosed fee may be charged.

### 7.2 Refund calculation

`refundable_amount = max(0, captured_amount - prior_refunds - approved_non_refundable_amount)`

- `approved_non_refundable_amount` is zero unless an active, disclosed, legally reviewed policy version explicitly sets it.
- A refund cannot exceed the net captured amount for that payment.
- Refunds return through the original payment route wherever supported; exceptions require Finance review.
- Gateway processing time and the customer-visible refund SLA are **Decision pending — Razorpay contract and Finance review**.
- Refund creation, gateway submission, success, failure, and reversal are separate audited states.

### 7.3 Disputes

Dispute states are `NONE`, `OPEN`, `UNDER_REVIEW`, and `RESOLVED`.

`NONE -> OPEN -> UNDER_REVIEW -> RESOLVED`. Evidence requests are tracked as actions/deadlines on `OPEN` or `UNDER_REVIEW`, not as additional states. A resolved dispute may return to `UNDER_REVIEW` only through an authorized appeal/reopen action.

- Opening a booking-related financial dispute places a hold on the disputed professional amount and any not-yet-processed payout containing it.
- Support records claims and evidence from both sides and identifies the policy version used.
- Resolution outcomes are `CUSTOMER`, `PROFESSIONAL`, `PARTIAL`, `NO_ADJUSTMENT`, or `DUPLICATE`.
- Financial adjustments require balanced ledger entries; booking history is never rewritten.
- Dispute eligibility window, evidence window, appeal window, and decision SLA are **Decision pending — Operations and Legal review**.

## 8. Commissions, Earnings, and Withdrawals

- A booking cannot become `CONFIRMED` without an applicable approved commission-rule snapshot.
- Commission is calculated from the immutable booking snapshot using `12-Revenue-Model.md`.
- Completion creates professional earnings and platform commission ledger entries. A cancellation or refund creates reversals; prior records remain immutable.
- Normal clearance time is exactly `completed_at + 6 hours`, calculated in UTC.
- An active dispute, chargeback, fraud, compliance, or legal hold postpones only the affected amount.
- A withdrawal may be requested only when available cash balance is at least ₹500, the requested amount is at least ₹500, and the requested amount does not exceed that balance.
- Promotional credits, pending earnings, held earnings, and already reserved withdrawal amounts do not count toward the ₹500 threshold.
- Exact commission rates, taxes, tax withholding, payout rail, payout fees, settlement SLA, and failed-payout retry policy are **Decision pending — Finance/Tax review and provider contract**.

## 9. Reviews, Referrals, Rewards, and Reminders

### 9.1 Reviews

- One customer review may be associated with one completed booking.
- Reviews must be labeled as verified-booking reviews and linked internally to the booking.
- No review is permitted for cancelled, expired, or uncompleted bookings.
- Moderation may hide abusive, unlawful, irrelevant, or privacy-violating content but must preserve the original and audit reason.
- Review submission/edit window, rating aggregation, professional response, and appeal policy are **Decision pending — Product, Operations, and Legal review**.

### 9.2 Referrals and rewards

- Every reward has a program version, qualifying event, beneficiary, value, expiry, usage restrictions, and funding owner.
- A booking-based referral cannot qualify before verified completion and cannot reward self-referral or duplicate identities.
- Reward credits are non-withdrawable promotional value unless a legally and financially approved program explicitly states otherwise.
- Referral values, qualification windows, caps, expiry, redemption rules, tax treatment, and abuse thresholds are **Decision pending — Growth, Finance, Fraud, and Legal review**.

### 9.3 Rebooking reminders

- A reminder proposes a new booking; it never creates or confirms one automatically.
- It must honor notification consent, opt-out, quiet-hour, frequency, and account-status rules.
- Rebooking creates a new booking with current availability, price, commission, and policy snapshots; the old price is not guaranteed.
- Reminder timing and channels are **Decision pending — Product and consent/privacy review**.

## 10. Support, Safety, and Fraud

- WhatsApp and tickets are supported intake channels; both create or attach to a canonical ticket record.
- Ticket states are `OPEN`, `ASSIGNED`, `WAITING_CUSTOMER`, `WAITING_PROFESSIONAL`, `UNDER_REVIEW`, `RESOLVED`, and `CLOSED`.
- Ticket categories, priority rules, escalation, and operating procedure are defined in `13-Operations.md`.
- Personal contact details must not be directly exposed between customers and professionals. Any masked-contact or in-platform communication solution requires a provider and privacy review.
- Hidden customer and professional scores are internal risk/operations signals, not public ratings.
- A hidden score alone must not produce an irreversible adverse decision. Suspension, rejection, payout hold, or blocking requires a recorded rule/evidence and authorized human review unless an emergency temporary control is necessary.
- Score inputs, retention, thresholds, fairness testing, explanations, and appeals are **Decision pending — Fraud, Security, Legal, and Product review**.

## 11. System Invariants

1. A professional cannot accept a booking without current approval and availability.
2. A booking cannot have more than one active assigned professional.
3. A completed booking must have a verified completion event or audited manual exception.
4. A verified review must reference exactly one completed booking and its customer.
5. Money is stored and calculated as integer paise; floating-point arithmetic is prohibited.
6. Financial entries are immutable, balanced, idempotent, and traceable to their source event.
7. Status history and critical admin audit history are append-only.
8. No captured amount may be refunded more than once or above the captured net amount.
9. No professional amount may be withdrawn more than once or while pending/held.
10. A policy change never retroactively changes an existing booking snapshot unless law requires a separately audited corrective adjustment.

## 12. Pending Decision Register

| Decision                                                            | Owner/review                           | Required before                |
| ------------------------------------------------------------------- | -------------------------------------- | ------------------------------ |
| Verification evidence, KYC, background check, and reverification    | Legal/Compliance + Operations          | Professional onboarding launch |
| Service price limits and exceptions                                 | Product + Finance + Operations         | Catalog publication            |
| Assignment ranking, timeouts, and attempt limits                    | Product + Operations + fairness review | Best-available launch          |
| Cancellation, no-show, reschedule, and provider-compensation policy | Product + Operations + Legal + Finance | Paid booking launch            |
| Refund and dispute windows/SLAs                                     | Operations + Legal + Razorpay contract | Paid booking launch            |
| Commission rates, base, taxes, and withholding                      | Finance + tax professional             | First confirmed booking        |
| Payout method, fees, SLA, retries, and maker-checker threshold      | Finance + Security + provider contract | First withdrawal               |
| Review moderation and appeal rules                                  | Product + Operations + Legal           | Reviews launch                 |
| Referral/reward economics and terms                                 | Growth + Finance + Fraud + Legal       | Program activation             |
| Reminder consent, cadence, and quiet hours                          | Product + Privacy/Legal                | Reminder activation            |
| Hidden-score governance                                             | Fraud + Security + Product + Legal     | Automated scoring activation   |
| Support SLAs and operating hours                                    | Operations                             | Public launch                  |
