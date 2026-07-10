# 13 Operations

## Document Control

- **Status:** Final v1 baseline
- **Scope:** Sikar Phase 1 operating model
- **Channels:** Website/PWA, WhatsApp support, and platform tickets
- **Related documents:** `02-BRD.md`, `03-PRD.md`, `04-SRS.md`, `10-Business-Rules.md`, `11-Security.md`, `12-Revenue-Model.md`, and `16-Legal.md`

This document defines how BeautyAtHome operates the managed marketplace. Exact staffing levels, operating hours, service-level targets, commercial thresholds, provider contract terms, and legally sensitive procedures remain **Decision pending** where identified.

## 1. Operating Objectives

Operations must:

1. onboard only eligible, verified female beauty professionals;
2. preserve a reliable Sikar service catalog, price limits, and availability;
3. move paid bookings through assignment, service, completion, and review safely;
4. reconcile every payment, refund, commission, hold, and payout;
5. resolve booking, quality, safety, payment, and payout issues consistently;
6. minimize marketplace bypass without exposing personal contact details;
7. detect abuse while preserving human review and appeal;
8. maintain auditable records and manageable Phase 1 complexity; and
9. provide evidence for pilot unit-economics and expansion decisions.

## 2. Operating Roles and Segregation

| Role                         | Primary responsibilities                                                                | Restricted actions                                             |
| ---------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Operations Lead              | Daily marketplace health, assignment exceptions, catalog execution, escalations         | Cannot make unaudited financial or verification decisions      |
| Verification Reviewer        | Review professional applications and evidence                                           | Cannot approve own submission or bypass required checks        |
| Support Agent                | Ticket intake, authentication, communication, evidence collection, standard resolutions | Cannot issue out-of-policy refunds or expose private data      |
| Support/Trust Lead           | Safety, quality, fraud, disputed completion, appeals                                    | Cannot alter ledger history                                    |
| Finance Operator             | Reconciliation, refund/payout processing, exception management                          | Cannot create and approve the same high-risk adjustment        |
| Finance Approver             | Maker-checker approval, write-offs, policy publication                                  | Cannot approve without evidence and reason code                |
| Catalog Admin                | Master services, price limits, city/service activation                                  | Cannot retroactively change booking snapshots                  |
| Security/Engineering On-call | Technical incidents, access, fraud tooling, provider failures                           | Cannot decide customer/professional commercial liability alone |
| Legal/Compliance Adviser     | Policy review, notices, regulatory and safety advice                                    | Advisory/approval scope set by company authority               |

One person may cover multiple Phase 1 roles, but the system must preserve least privilege and maker-checker separation for high-risk financial, access, and verification actions. Exact approval thresholds and staffing coverage are **Decision pending — Finance, Security, and Operations leadership review**.

## 3. Operating Calendar and Service Levels

- Customer-facing times use India Standard Time; system timestamps and duration controls use UTC.
- Support operating hours, holiday coverage, on-call coverage, and response/resolution targets are **Decision pending — Operations leadership approval**.
- Payment, payout, SMS/OTP, WhatsApp, storage, hosting, and database provider SLAs are **Decision pending — executed provider contracts**.
- A public SLA must not be published until staffing, escalation, and provider dependencies can support it.
- Safety and suspected account compromise reports receive immediate priority regardless of normal queues.

## 4. Professional Onboarding Runbook

Canonical verification states are `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, and `SUSPENDED`.

### 4.1 Intake and review

1. **Draft:** professional verifies mobile number, completes profile, selects master services, supplies prices within limits, service zone, availability, and required declarations.
2. **Pre-submit validation:** system verifies mandatory fields, file types, consent/declaration versions, duplicate signals, and catalog/price constraints.
3. **Submitted:** submission becomes read-only and receives an application version, timestamp, and acknowledgement.
4. **Under review:** named reviewer claims the case and completes every approved checklist item.
5. **Correction required:** reviewer records specific deficiencies and rejects the current application with reason `CORRECTION_REQUIRED`; resubmission creates a new immutable `DRAFT` application version.
6. **Approved:** reviewer records decision evidence and activation date. Search/listing remains subject to account, service, city, pricing, and availability rules.
7. **Rejected:** reviewer selects reason codes, records internal evidence, and provides a lawful user-safe explanation and appeal/reapplication route where allowed.
8. **Suspended:** authorized Trust/Operations actor records scope, reason, evidence, future-booking impact, review owner, and expiry/review date where permitted.

### 4.2 Required checks

The workflow must support identity, eligibility, service competency, payout beneficiary, duplicate-account, sanctions/compliance where applicable, safety, and contact validation. Exact documents, KYC method, background/police checks, qualifications, minimum age, insurance, address evidence, renewal cycle, and female-professional eligibility verification are **Decision pending — Indian Legal/Compliance review with Operations approval**.

No operator may add an unreviewed check ad hoc. Sensitive evidence is visible only to approved roles and is retained according to the legal retention schedule.

### 4.3 Suspension impact

- Stop new offers and remove the professional from search.
- Identify all `PENDING_PROFESSIONAL`, `CONFIRMED`, and future bookings.
- For safety suspension, stop assignment immediately and route every affected booking to the Trust Lead.
- For non-safety suspension, Operations decides reassignment/cancellation under the active policy; it cannot silently leave bookings active.
- Reactivation requires an authorized re-review that resolves the enforcement record and records `SUSPENDED -> APPROVED`; no operator may simply clear the flag.
- Do not erase completed bookings, reviews, earnings, payouts, or audit history.

## 5. Catalog, Pricing, and Availability Operations

### 5.1 Catalog change

1. Catalog Admin creates a draft version with name, category, description, duration, Sikar availability, and price limits.
2. A second authorized reviewer validates customer clarity, operational feasibility, and financial policy coverage.
3. Publication requires an effective time and audit reason.
4. Existing booking snapshots remain unchanged.
5. Disabling a service stops new quotes and triggers review of future bookings only if service delivery is no longer possible.

Exact master services, durations, price bands, price increments, buffers, add-ons, and exception limits are **Decision pending — Product, Operations, and Finance approval**.

### 5.2 Availability hygiene

- Professionals maintain explicit availability; accepted bookings block overlapping capacity atomically.
- Operations monitors stale calendars, repeated declines, lateness, and conflicts.
- Manual availability changes must not cancel a confirmed booking.
- Slot granularity, travel buffer, lead time, booking horizon, and workload limits are **Decision pending — Operations review**.

## 6. Booking Operations

Canonical booking states are:

`DRAFT -> PENDING_ADVANCE -> PENDING_ASSIGNMENT | PENDING_PROFESSIONAL -> CONFIRMED -> IN_SERVICE -> COMPLETION_PENDING -> COMPLETED`

`CANCELLED` and `EXPIRED` are terminal alternatives.

### 6.1 State ownership

| State                  | Primary owner                   | Operational control                                                 |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------- |
| `DRAFT`                | Customer                        | Support may explain; it does not complete checkout for the customer |
| `PENDING_ADVANCE`      | Payment system                  | No manual confirmation without verified provider evidence           |
| `PENDING_ASSIGNMENT`   | Assignment engine/Operations    | Only eligible candidates; manual assignment is audited              |
| `PENDING_PROFESSIONAL` | Professional/assignment process | Accept/decline/timeout; availability is rechecked on acceptance     |
| `CONFIRMED`            | Customer and Professional       | Slot is reserved; changes use reschedule/cancellation policy        |
| `IN_SERVICE`           | Assigned Professional           | Start event is logged; service issues route to Support              |
| `COMPLETION_PENDING`   | Customer and Professional       | Customer completion OTP is required                                 |
| `COMPLETED`            | System after verified OTP       | Starts six-hour earnings clearance timer                            |
| `CANCELLED`            | Authorized actor/system rule    | Financial outcome calculated from policy snapshot                   |
| `EXPIRED`              | System timeout                  | Late provider/payment events go to exception handling               |

### 6.2 Assignment exception handling

- A selected-professional decline cancels that booking with reason `SELECTED_PROFESSIONAL_DECLINED` and starts the full-refund flow. Support may offer guidance for creating a new best-available booking, but cannot silently change the cancelled booking's mode.
- A best-available decline or timeout returns the booking to `PENDING_ASSIGNMENT` while attempts remain.
- If no eligible candidate remains, cancel with `NO_PROFESSIONAL_AVAILABLE` and start the full-refund flow.
- Operations may manually choose only from the eligibility-filtered candidate set. The action records actor, reason, candidate list, and ranking-policy version.
- Offer timeout, maximum attempts, reassignment radius/zone, and escalation time are **Decision pending — Product and Operations SLA review**.

### 6.3 Completion exceptions

- Professionals must not request the completion OTP before finishing the service.
- OTP expiry, resend, or failed-attempt cases return to the controlled completion flow; they never auto-complete a booking.
- Manual completion requires customer evidence where possible, Support recommendation, authorized Admin approval, reason code, and immutable audit record.
- A disagreement about completion opens a dispute and holds affected earnings.

## 7. Daily Marketplace Control Cycle

### Opening review

- provider uptime and overnight technical incidents;
- today's confirmed bookings and unassigned paid bookings;
- professional suspensions, availability conflicts, and high-risk flags;
- failed/late payment events and refund exceptions;
- pending payouts and prior-day reconciliation exceptions;
- open safety, account-compromise, and high-priority support cases.

### Intraday review

- bookings aging in `PENDING_ASSIGNMENT` or `PENDING_PROFESSIONAL`;
- same-day confirmations, cancellations, delayed starts, and completion-OTP issues;
- payment/OTP/WhatsApp provider health;
- support queue by priority and age;
- disputed or held professional earnings.

### Closing review

- completed/cancelled/expired booking counts and unresolved same-day cases;
- payment, refund, commission, ledger, and payout reconciliation;
- safety and fraud handoffs;
- queue ownership for the next coverage period;
- daily pilot metrics and exception report.

Exact review times and aging thresholds are **Decision pending — Operations SLA review**.

## 8. Payments and Refund Operations

Canonical payment states are `CREATED`, `PENDING`, `CAPTURED`, `FAILED`, `CANCELLED`, `PARTIALLY_REFUNDED`, and `REFUNDED`.

### 8.1 Payment exceptions

- Trust verified Razorpay server events, not screenshots or customer redirects.
- Match internal payment ID, provider order/payment ID, amount, currency, customer, booking, and signature result.
- Quarantine amount mismatch, duplicate capture, unknown payment, late capture, ambiguous provider status, and settlement mismatch.
- A late capture for a cancelled/expired booking starts refund review; it does not restore the booking.
- Customer communication uses the canonical internal state and provider reference without exposing secrets.

### 8.2 Refund workflow

1. Support or system creates a refund case linked to booking/payment and active policy version.
2. System calculates the maximum refundable amount and allocation.
3. A permitted standard refund proceeds; an exception requires Finance approval.
4. Finance submits the provider request with an idempotency key.
5. Webhook/polling confirms success or creates a failed/unknown exception.
6. Ledger posts compensating entries and payment becomes `PARTIALLY_REFUNDED` or `REFUNDED` only for successful refunded value.
7. Support communicates amount, route, reference, and provider-dependent timing.

Refund approval limits, Razorpay processing times, retry limits, and customer SLA are **Decision pending — Finance, Security, Support, and executed Razorpay contract**.

## 9. Earnings and Payout Operations

### 9.1 Clearance

- Verified completion sets `clearance_at = completed_at + 6 hours` in UTC.
- Open disputes and scoped fraud, chargeback, compliance, legal, tax, or security holds block affected money.
- Operations may view a hold but only its authorized owner may release it.
- The wallet distinguishes pending, held, available, reserved, paid, and promotional balances.

### 9.2 Withdrawal workflow

Canonical payout states are `REQUESTED`, `UNDER_REVIEW`, `PROCESSING`, `PAID`, `FAILED`, `REJECTED`, and `CANCELLED`.

1. System atomically verifies at least ₹500 available, verifies that the requested amount is at least ₹500 and no greater than the available balance, and reserves it.
2. `REQUESTED` moves to `UNDER_REVIEW` for beneficiary, KYC, balance, duplicate, hold, and fraud checks.
3. Authorized Finance actor approves processing or rejects with reason.
4. `PROCESSING` creates one provider attempt with a unique idempotency key.
5. Provider-confirmed settlement reference moves it to `PAID`.
6. Known failure moves it to `FAILED`; ambiguous status remains under Finance investigation without releasing funds.
7. Retry creates a new provider attempt under the same payout obligation.
8. `REJECTED` or `CANCELLED` releases reservation only after confirming no provider debit.

Payout rail/provider, beneficiary checks, fees, settlement days, batching, approval threshold, retry schedule, and communication SLA are **Decision pending — Finance, Security, Legal, and provider-contract review**.

## 10. Support Operations

### 10.1 Canonical ticket record

Every WhatsApp or in-platform request creates or attaches to a ticket containing:

- ticket ID, authenticated requester where possible, and intake channel;
- booking/payment/payout/professional references;
- category, priority, state, owner, and timestamps;
- consent-safe conversation and evidence history;
- actions, policy versions, financial approvals, and resolution code.

WhatsApp is an intake/communication channel, not the system of record.

### 10.2 Categories

- `BOOKING_OR_ASSIGNMENT`
- `CANCELLATION_OR_RESCHEDULE`
- `SERVICE_QUALITY`
- `SAFETY`
- `PAYMENT`
- `REFUND`
- `PROFESSIONAL_PAYOUT`
- `ACCOUNT_OR_OTP`
- `REVIEW_OR_CONTENT`
- `REFERRAL_OR_REWARD`
- `PRIVACY_OR_LEGAL`
- `TECHNICAL`
- `OTHER`

### 10.3 Priorities

| Priority      | Definition                                                                                                         | Routing                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `P0_CRITICAL` | Immediate personal safety risk, active major data/security event, or systemic financial integrity risk             | Trust/Security/Operations lead immediately; preserve evidence |
| `P1_HIGH`     | Same-day customer stranded, account takeover, widespread booking/payment failure, or time-sensitive payout anomaly | Senior queue and responsible operational owner                |
| `P2_NORMAL`   | Ordinary booking, quality, payment, refund, or payout issue                                                        | Standard support queue                                        |
| `P3_LOW`      | Information request, feedback, or non-urgent account/content issue                                                 | Standard low-priority queue                                   |

Exact first-response, update, and resolution targets for each priority are **Decision pending — Operations leadership approval**.

### 10.4 Ticket lifecycle

Canonical states are `OPEN`, `ASSIGNED`, `WAITING_CUSTOMER`, `WAITING_PROFESSIONAL`, `UNDER_REVIEW`, `RESOLVED`, and `CLOSED`.

```text
OPEN -> ASSIGNED
ASSIGNED -> WAITING_CUSTOMER | WAITING_PROFESSIONAL | UNDER_REVIEW | RESOLVED
WAITING_CUSTOMER | WAITING_PROFESSIONAL -> ASSIGNED | UNDER_REVIEW
UNDER_REVIEW -> WAITING_CUSTOMER | WAITING_PROFESSIONAL | RESOLVED
RESOLVED -> CLOSED
RESOLVED | CLOSED -> ASSIGNED (authorized reopen)
```

### 10.5 Standard support flow

1. **Intake:** acknowledge request and create/link canonical ticket.
2. **Authenticate:** verify identity proportionate to requested action; never request an OTP value or unnecessary identity document in chat.
3. **Classify:** assign category, priority, related entities, and safety/financial/privacy flags.
4. **Contain:** stop immediate harm, freeze affected finance action where authorized, or escalate system incident.
5. **Collect evidence:** request only necessary information from each party and provider logs.
6. **Evaluate:** apply the booking's policy versions and documented reason codes consistently.
7. **Approve:** obtain Finance/Trust/Legal approval for out-of-policy or high-risk action.
8. **Execute:** make idempotent status/financial actions; never edit ledger or audit history destructively.
9. **Communicate:** state outcome, amount if relevant, next step, timing, and appeal/reopen path.
10. **Resolve and close:** record structured resolution; close after the approved waiting period.

Waiting timeout, auto-close period, reopen window, evidence period, and appeal route are **Decision pending — Operations and Legal review**.

## 11. Dispute Operations

Dispute is separate from booking state and uses `NONE`, `OPEN`, `UNDER_REVIEW`, and `RESOLVED`.

1. Create `OPEN` dispute with claim, requested remedy, affected amount, and booking/payment references.
2. Immediately hold the affected unpaid professional amount where contractually and legally permitted.
3. Collect customer, professional, system, and provider evidence without exposing one party's private information to the other.
4. Move to `UNDER_REVIEW` when the evidence package or deadline is ready.
5. Authorized reviewer chooses `CUSTOMER`, `PROFESSIONAL`, `PARTIAL`, `NO_ADJUSTMENT`, or `DUPLICATE` outcome.
6. Finance posts approved compensating entries; Operations records non-financial action.
7. Move to `RESOLVED`, notify both parties with lawful detail, and preserve appeal/reopen metadata.

Dispute window, evidence deadline, review SLA, appeal window, compensation limits, and authority matrix are **Decision pending — Operations, Finance, and Indian Legal review**.

## 12. Cancellation, Reschedule, and No-Show Operations

- Before professional acceptance, captured funds use the zero-fee full-refund baseline unless a disclosed, legally reviewed policy says otherwise.
- Selected-professional decline may be converted to best-available only with customer consent.
- Professional cancellation attempts reassignment when feasible; otherwise cancel and refund according to policy.
- Customer or professional cancellation after `CONFIRMED` must capture actor, state, scheduled time, reason, policy version, and evidence.
- Cancellation after `IN_SERVICE`, disputed arrival, or no-show is a Support case; automated blame is prohibited without approved evidence rules.
- A reschedule creates an auditable slot change only after revalidating professional availability, pricing/policy treatment, and both-party consent where required.

Free window, cancellation fees, professional compensation, reschedule count, lateness threshold, arrival proof, no-show definition, emergency exception, and repeat-offender action are **Decision pending — Product, Operations, Finance, and Legal review**.

## 13. Trust, Safety, and Fraud

### 13.1 Safety response

- BeautyAtHome is not an emergency service. Where there is immediate danger, Support should direct the reporter to appropriate local emergency assistance and escalate internally without delay.
- Safety cases are access-restricted and handled by trained, authorized personnel.
- Preserve booking, account, communication, location, payment, and audit evidence under a legal hold where required.
- Temporary suspension may be applied to prevent imminent harm; permanent action requires documented review and appeal where lawful.
- Do not promise confidentiality that legal or safety obligations cannot support.

Emergency contacts, police/reporting criteria, medical escalation, evidence retention, insurance handling, investigation standard, and training are **Decision pending — Indian Legal, safety specialist, and insurer review**.

### 13.2 Fraud controls

Monitor at minimum duplicate identities, OTP abuse, referral abuse, payment anomalies, chargebacks, unusual cancellations, fabricated completion, review manipulation, payout beneficiary changes, and account takeover.

- Hidden customer/professional scores are internal signals, never public ratings.
- An irreversible adverse outcome requires evidence and authorized human review; an automated signal may impose a short emergency hold.
- Every hold has scope, reason, owner, start, review/expiry where possible, and appeal path.
- Score inputs, thresholds, model/rule validation, fairness testing, retention, and appeal are **Decision pending — Fraud, Security, Product, and Legal review**.

## 14. Reviews, Referrals, Rewards, and Reminders

- Moderate only reviews tied to completed bookings; preserve original content and moderation history.
- Escalate threats, personal data, unlawful content, coercion, and review-for-refund attempts.
- Referral reward qualification occurs only after verified completion and fraud checks.
- Reverse rewards through program rules when a qualifying booking is refunded or found abusive; never delete wallet history.
- Rebooking reminders require valid consent and opt-out and create no booking automatically.

Moderation SLA, review appeal, reward values/caps/expiry, reminder timing, quiet hours, WhatsApp template approval, and campaign consent are **Decision pending — Product/Growth, Operations, Finance, Fraud, and Legal review**.

## 15. Data and Access Operations

- Collect only information required for an approved purpose.
- Restrict professional verification, support evidence, addresses, payment references, and safety cases by role.
- Never request or store raw payment-card credentials.
- Support exports and screenshots must be minimized, access-controlled, and deleted under retention policy.
- Data correction, access, deletion, consent withdrawal, and grievance requests create traceable privacy tickets.
- Legal holds suspend only affected deletion; they do not justify indefinite general retention.
- Retention periods, Data Protection Officer/consent-manager requirements, grievance contacts, and data-principal workflows are **Decision pending — Indian privacy-counsel review**.

## 16. Operational and Technical Incidents

### 16.1 Incident flow

1. Detect and create an incident record.
2. Classify severity and affected customer/professional/financial/data scope.
3. Assign Incident Lead and functional owners.
4. Contain impact; pause booking, payment, payout, or notification paths selectively when needed.
5. Communicate approved status updates without exposing security-sensitive detail.
6. Recover and reconcile queued/ambiguous events before resuming.
7. Validate customer journeys and financial controls.
8. Close with timeline, impact, root cause, corrective actions, owners, and deadlines.

Incident severities, on-call response targets, recovery-time objective, recovery-point objective, notification thresholds, and status-page process are **Decision pending — Engineering, Security, Operations, and Legal review**.

Provider outage behavior must fail safely:

- payment ambiguity does not confirm a booking;
- OTP outage does not bypass completion verification;
- payout ambiguity does not release reserved funds;
- WhatsApp outage falls back to platform tickets/SMS only if consent and provider capability allow;
- database or ledger ambiguity halts financial mutation until consistency is established.

## 17. Metrics and Reporting

Operations reports at least:

- registered, submitted, approved, rejected, suspended, and active professionals;
- verification age and reason distribution;
- active customers and booking funnel by canonical state;
- assignment time, acceptance/decline rate, completion rate, cancellation/no-show rate, and repeat rate;
- payment capture, refund, chargeback, payout failure, and reconciliation exception rates;
- GMV, commission, contribution, and professional available/held balances;
- ticket volume, age, first response, resolution, reopen rate, category, priority, and outcome;
- safety/fraud cases with access-restricted reporting;
- review rating/volume and referral/reward qualification/reversal;
- provider availability and incident impact.

Metrics must use versioned definitions and exclude test/internal data where appropriate.

## 18. Sikar Pilot and Expansion Gate

No additional city is activated until leadership reviews:

- demand, active supply, booking completion, repeat usage, cancellations, support workload, and unit economics;
- professional verification capacity and safety readiness;
- payment/payout reconciliation and unresolved losses;
- provider reliability and technical capacity;
- city-specific catalog, pricing, tax, legal, language, and support requirements;
- documented incident, dispute, refund, and payout runbooks.

Exact launch targets and minimum observation period are **Decision pending — Business, Product, Finance, Operations, and Legal approval**. Expansion creates new city configuration; it must not bypass Sikar learnings or require core-system redesign.

## 19. Required Runbooks Before Public Launch

- professional verification, correction, rejection, appeal, suspension, and reverification;
- catalog/price publication and rollback;
- unassigned/declined booking and professional cancellation;
- payment capture ambiguity, late capture, duplicate event, and reconciliation;
- cancellation, refund, chargeback, and disputed completion;
- payout review, failed/ambiguous payout, and beneficiary change;
- OTP/SMS/WhatsApp outage;
- account takeover and privacy request;
- customer/professional safety incident;
- database, hosting, storage, and gateway incident;
- daily opening, closing, reconciliation, and management reporting.

Each runbook must identify trigger, owner, permissions, steps, reason codes, evidence, communications, escalation, rollback/containment, and completion check.

## 20. Pending Decision Register

| Decision                                                          | Owner/review                                     | Required before                 |
| ----------------------------------------------------------------- | ------------------------------------------------ | ------------------------------- |
| Staffing, operating hours, holidays, and support SLAs             | Operations leadership                            | Public launch                   |
| Verification/KYC/background-check procedure and retention         | Legal/Compliance + Operations                    | Professional onboarding launch  |
| Catalog, price bands, buffers, and availability limits            | Product + Operations + Finance                   | Catalog publication             |
| Assignment ranking, timeouts, attempts, and escalation            | Product + Operations                             | Best-available launch           |
| Cancellation, no-show, reschedule, refund, and dispute policy     | Product + Operations + Finance + Legal           | Paid booking launch             |
| Razorpay and notification-provider operational SLAs               | Finance + Security + Operations + contracts      | Production integration          |
| Payout provider, beneficiary checks, approval thresholds, and SLA | Finance + Security + Legal                       | First withdrawal                |
| Safety escalation, reporting, evidence, insurance, and training   | Legal + safety specialist + insurer + Operations | Public launch                   |
| Fraud scoring, holds, fairness, and appeals                       | Fraud + Security + Product + Legal               | Scoring activation              |
| Data rights, retention, legal holds, and privacy operations       | Indian privacy counsel + Security                | Personal-data processing launch |
| Pilot launch/expansion targets                                    | Business + Product + Finance + Operations        | Launch decision                 |
