# 06 Architecture

## Document Control

| Field              | Value                                        |
| ------------------ | -------------------------------------------- |
| Status             | Final v1.0 architecture baseline             |
| Scope              | Phase 1, Sikar pilot                         |
| Architecture style | Clean Architecture within a modular monolith |
| Source documents   | Vision, BRD, PRD, SRS, and Tech Stack        |

This document defines the target Phase 1 architecture. The repository currently contains the production-ready foundation and scaffolds; a module listed here is not considered implemented until its code, migration, tests, and operational controls are complete.

## Architecture Goals

- Support the complete customer, professional, and admin journeys defined in the PRD.
- Keep booking, payment, commission, and payout changes consistent and auditable.
- Protect customer and professional contact information and role boundaries.
- Launch as a manageable Sikar-only modular monolith without creating premature services.
- Permit later city-by-city expansion through configuration and data partitioning rather than a core redesign.
- Keep provider integrations replaceable behind application-owned interfaces.

## System Context

### Human actors

- **Guest:** browses active services and public professional profiles.
- **Customer:** authenticates by mobile OTP, books a service, pays the required advance, tracks the booking, confirms completion, reviews, rebooks, and raises support requests.
- **Professional:** a verified female beauty professional who manages a profile, services, pricing within platform limits, availability, booking requests, and earnings.
- **Admin:** verifies professionals and operates catalog, bookings, disputes, commissions, payouts, rewards, fraud review, and support.

### External systems

- Mobile OTP/SMS provider.
- Razorpay for Phase 1 payment processing; exact payout and settlement capabilities require provider confirmation.
- WhatsApp business provider for opted-in transactional support and notifications.
- Object storage for profile and portfolio media.
- Managed PostgreSQL.
- Frontend, API, monitoring, and notification hosting providers.

External systems never own BeautyAtHome business state. Provider identifiers, requests, webhook payloads, and reconciliation outcomes are recorded locally.

## Runtime View

```text
Browser / installed PWA
        |
        | HTTPS JSON API
        v
Next.js web application  --->  NestJS modular monolith
                                      |
                 +--------------------+--------------------+
                 |                    |                    |
             PostgreSQL          Object storage      Provider adapters
                                                      | OTP/SMS
                                                      | Razorpay
                                                      | WhatsApp
```

The Next.js application owns presentation, web navigation, PWA behavior, and safe server-side composition. NestJS owns authorization and all business decisions. Clients must not calculate authoritative prices, commissions, eligibility, balances, or status transitions.

## Repository Boundaries

| Path              | Responsibility                                                |
| ----------------- | ------------------------------------------------------------- |
| `apps/web`        | Next.js website and PWA                                       |
| `apps/api`        | NestJS HTTP API and application modules                       |
| `packages/ui`     | Shared presentational UI primitives                           |
| `packages/types`  | Shared stable TypeScript contracts and identifiers            |
| `packages/utils`  | Framework-neutral utilities                                   |
| `packages/config` | Shared TypeScript configuration                               |
| `database/prisma` | Prisma schema, migrations, and seed entry point               |
| `infrastructure`  | Container and deployment support files                        |
| `docs`            | Frozen baseline specifications and living operational records |

Application packages may depend on shared packages. Shared packages must not import from an application. Domain logic belongs in the API, not in `packages/ui` or browser-only code.

## Backend Modules

| Module                   | Responsibilities                                                                                                                        | Must not own                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Auth                     | OTP challenge, session issuance, refresh-token rotation, logout, authentication rate limits                                             | Profile verification or booking authorization                    |
| Users                    | User identity, role assignments, account state, consent references                                                                      | Professional approval decisions                                  |
| Customers                | Customer profile, saved addresses, internal customer signals                                                                            | Payment or booking status                                        |
| Professionals            | Public/private professional profile, onboarding completeness, service radius/configured areas                                           | Verification evidence decisions                                  |
| Verification             | Verification submissions, evidence metadata, reviewer decision, reason, status history                                                  | Public profile content                                           |
| Catalog                  | City, beauty categories, master services, price limits, duration, activation                                                            | Professional-specific availability                               |
| Professional Services    | Professional service opt-in, price within configured bounds, service activation                                                         | Master catalog definition                                        |
| Availability             | Time slots, exceptions, capacity, booking conflict checks                                                                               | Booking lifecycle                                                |
| Discovery and Assignment | Filters and eligible-professional candidates for selection or best-professional assignment                                              | Final booking state or hidden-score disclosure                   |
| Bookings                 | Booking aggregate, immutable commercial snapshot, assignment, status transitions, completion OTP, cancellation/reschedule orchestration | Gateway settlement or payout transfer                            |
| Payments                 | Advance payment order, attempts, webhook verification, refunds, reconciliation                                                          | Commission policy                                                |
| Commission               | Versioned dynamic commission rules and per-booking commission snapshot                                                                  | Provider transfer execution                                      |
| Earnings Ledger          | Append-only professional credits, holds, releases, debits, and adjustments                                                              | Editing historical entries                                       |
| Payouts                  | Withdrawal eligibility, ₹500 minimum, payout requests, transfer state, reconciliation                                                   | Recomputing booking prices                                       |
| Reviews                  | Verified-booking eligibility, rating/review submission, moderation state                                                                | Arbitrary guest reviews                                          |
| Support                  | WhatsApp-linked and in-product tickets, disputes, evidence, ownership, escalation, resolution                                           | Silent mutation of financial history                             |
| Referrals and Rewards    | Referral attribution, qualification, reward ledger, coupon/reward redemption                                                            | Unapproved commercial values                                     |
| Notifications            | Template selection, consent/opt-out checks, delivery attempts, provider callbacks                                                       | Business-state transitions based only on delivery                |
| Admin                    | Authorized operational commands and read models                                                                                         | Bypassing module policies                                        |
| Risk and Audit           | Internal signals, admin audit trail, suspicious-event review                                                                            | Automatic punitive action without a defined rule and appeal path |

The terms **Professional** and **Freelancer** refer to the same supply-side role. New implementation and documentation use **Professional**.

## Clean Architecture Inside Each Module

Each substantial module should separate:

1. **Domain:** entities, value objects, invariants, and allowed transitions.
2. **Application:** commands, queries, use cases, authorization decisions, and ports.
3. **Infrastructure:** Prisma repositories and external provider adapters.
4. **Transport:** NestJS controllers, DTO validation, serialization, and HTTP concerns.

Domain and application code must not import NestJS controllers, Prisma-generated types, or a provider SDK. Transactions begin in application services and use repositories through explicit interfaces.

## Core Transaction Boundaries

The following actions are atomic database transactions:

- Reserving a slot and creating a provisional booking.
- Applying a verified payment webhook and advancing the booking when allowed.
- Accepting a booking while preventing conflicting assignments.
- Verifying the completion OTP and creating the held earnings entry.
- Releasing held earnings after the six-hour rule when no blocking dispute exists.
- Creating a payout request and reserving the requested ledger balance.
- Applying a refund, commission reversal, payout result, or approved adjustment.

Network calls to Razorpay, SMS, WhatsApp, or storage do not remain open inside a database transaction. The system records an operation or outbox item, commits, performs the provider call, and records the outcome idempotently.

## Booking Orchestration

The architecture resolves the PRD's confirmation-order ambiguity by distinguishing:

- **Request recorded:** slot, address, service, pricing, and assignment preference captured.
- **Advance paid:** the required advance has been verified by server-side webhook or provider verification.
- **Professional confirmed:** a specific professional has accepted or an eligible selected professional has been confirmed.

Only the third state is presented as a confirmed service appointment. Payment success alone does not imply professional acceptance. Exact timeout and reassignment durations are operational configuration decisions pending pilot approval.

### High-level sequence

1. API validates city, service, address coverage, price limits, slot request, and an applicable commission rule, then creates a short-lived quote and persisted `DRAFT`.
2. Customer submission revalidates the quote, freezes price/commission/policy inputs in the booking snapshot, and moves the booking to `PENDING_ADVANCE`.
3. Payments module creates the advance order and returns provider-safe checkout data.
4. A verified, idempotent payment result marks the advance paid.
5. Assignment module targets the selected professional or an ordered set of eligible professionals.
6. The professional accepts or declines; only an allowed transition is persisted.
7. At service completion, the customer's completion OTP is verified server-side.
8. The booking completes, the frozen commission is recognized, and held earnings-ledger entries are created atomically.
9. The hold-release job evaluates eligibility after six hours.
10. Review eligibility opens only for the completed verified booking.

## Data and Consistency Strategy

- PostgreSQL is the system of record.
- Prisma migrations are the only production schema-change mechanism.
- Financial values use integer minor currency units and `INR`; binary floating-point is prohibited.
- Booking price, commission rule, professional identity, service, address reference, and duration are snapshotted so later catalog edits do not rewrite history.
- Booking, verification, payment, payout, support, and critical account changes retain status history.
- Financial records use append-only ledger entries and compensating adjustments; balances are derived or transactionally maintained from the ledger.
- Optimistic concurrency or row locking protects slot, booking, and balance transitions.
- Every externally retried command uses an idempotency key or provider event identifier.
- Database identifiers are opaque and never encode phone numbers or business meaning.

## API Strategy

- Versioned REST endpoints under `/api/v1`.
- JSON request and response bodies, except direct media upload flows using signed URLs.
- DTO validation at the transport boundary.
- Central authentication and role/ownership authorization guards.
- Cursor pagination for growing collections; bounded page sizes for operational lists.
- Stable machine-readable error codes plus user-safe messages.
- `Idempotency-Key` required for booking creation, payment order creation, completion, refund commands, and payout requests where retries could duplicate value.
- Provider webhooks use dedicated unauthenticated endpoints protected by signature verification, replay controls, and idempotent event storage.

## Security Boundaries

- The browser receives only the minimum public or role-authorized fields.
- Personal contact details are not exposed between customer and professional through standard APIs.
- Admin access is separately authorized and audited; an admin role is not a bypass around module invariants.
- Login OTP and booking-completion OTP are separate challenge types with independent purpose, expiry, attempt limits, and hashes.
- Secrets remain in environment/secret management and never in the repository or client bundle.
- Uploaded content is type/size checked, malware-scanned where supported, and delivered through controlled URLs.

Detailed controls are defined in [11-Security.md](./11-Security.md).

## Background Work

Phase 1 remains a modular monolith, but durable background tasks are required for:

- OTP and transactional notification delivery.
- Assignment timeout and reassignment evaluation.
- Six-hour earnings hold release.
- Rebooking reminders.
- Payment, refund, and payout reconciliation.
- Media lifecycle processing.
- Operational metric aggregation.

The job technology is a deployment decision pending load and hosting review. Jobs must be durable, retryable with bounded backoff, idempotent, observable, and runnable without splitting the application into microservices.

## Observability

- Structured logs carry a request/correlation ID, actor ID where permitted, module, operation, and result.
- OTP values, tokens, full phone numbers, full addresses, payment secrets, and verification documents are never logged.
- Metrics cover request health, authentication abuse, booking funnel, provider delivery, payment reconciliation, hold releases, payouts, and job backlog.
- Alerts focus on user-impacting failures and financial inconsistencies.
- Critical business events and admin actions have a durable audit record separate from transient application logs.

## Scalability and City Expansion

- City is explicit on service availability, catalog rules, price bounds, professional coverage, bookings, and commission configuration.
- Queries use city and active-status filters from the start.
- Configuration is effective-dated so an expansion does not alter historical Sikar bookings.
- Stateless web/API containers may scale horizontally after shared session, jobs, and rate-limiting infrastructure are selected.
- Microservices remain out of scope for Phase 1 and require measured scaling or team-ownership evidence before consideration.

## Architecture Decisions Pending

| Decision                                         | Constraint                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Managed hosting products and regions             | Must support India users, encrypted transport/storage, backups, observability, and provider agreements |
| Durable job/queue implementation                 | Must work with the modular monolith and provide retry/idempotency controls                             |
| Cache and distributed rate-limit store           | Add only when horizontal scaling or measured load requires it                                          |
| Object storage provider                          | Must support signed access, encryption, lifecycle policy, and suitable data region                     |
| Payment/payout integration shape                 | Pending Razorpay capability and commercial confirmation; business ledgers remain provider-independent  |
| Exact availability and assignment timeout values | Pending Sikar pilot operations approval                                                                |

## Prohibited Phase 1 Architecture Drift

- No native mobile application dependency.
- No live GPS tracking subsystem.
- No advanced AI decision system.
- No microservice split.
- No client-authoritative booking, commission, or wallet calculation.
- No direct provider SDK usage outside its adapter module.
- No mutation of settled financial history without a compensating audit entry.
