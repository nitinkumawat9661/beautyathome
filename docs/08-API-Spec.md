# 08 API Specification

## Document Status

- Status: Target v1 contract
- Implementation state: The current NestJS application exposes only the scaffold `GET /` response.
  No endpoint in this document is implemented unless later code and tests demonstrate it.
- Canonical term: **Professional**. Older baseline documents use _freelancer_ for the same role.

## Scope

This specification defines the Phase 1 HTTP API for the BeautyAtHome web/PWA, Professional
workflows, and admin operations. It supports Sikar, beauty services, verified female Professionals,
mobile OTP authentication, hybrid booking, advance payments, completion OTP, verified reviews,
support, dynamic commission, and payout withdrawal.

Native mobile apps, live GPS tracking, non-beauty services, male Professionals, public third-party
API access, and microservices are out of scope for v1.

## API Style and Versioning

- Protocol: HTTPS in every non-local environment.
- Base path: `/api/v1`.
- Media type: `application/json; charset=utf-8` unless uploading through a signed object-storage URL.
- OpenAPI 3.1 is the machine-readable contract and must be generated from reviewed NestJS DTOs.
- Breaking changes require a new major API path. Additive optional fields may be introduced in v1.
- Server and client must ignore unknown response fields but reject unknown security-sensitive input
  fields through strict DTO validation.
- The API accepts and returns camelCase JSON.

## Representation Conventions

| Concern       | Convention                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Identifiers   | Opaque UUID strings; clients must not infer ordering.                                                       |
| Time          | ISO 8601 UTC, for example `2026-07-10T12:30:00.000Z`.                                                       |
| Money         | Integer paise plus ISO currency, for example `{ "amount": 50000, "currency": "INR" }`.                      |
| Mobile number | E.164 format. India numbers are normalized before comparison.                                               |
| Pagination    | Cursor-based using `limit`, `after`, `data`, and `pageInfo.nextCursor`. Maximum limit is server-controlled. |
| Filtering     | Explicit allowlisted query parameters; no arbitrary database field filtering.                               |
| Sorting       | Explicit values such as `ratingDesc`, `priceAsc`, or `experienceDesc`.                                      |
| Concurrency   | Mutable aggregate responses expose `version`; sensitive updates may require `If-Match`.                     |
| Tracing       | Every response includes `X-Request-Id`; a valid incoming value may be propagated.                           |

Exact page-size limits, public-search throttles, OTP limits, and token lifetimes are **Decision
pending security and capacity review**.

## Authentication and Authorization

Phase 1 authentication uses mobile OTP only. Google and other social login are not part of v1.

- Access token: short-lived JWT sent as `Authorization: Bearer <token>` and kept in web-app memory.
- Refresh token: opaque rotating credential held in a `Secure`, `HttpOnly`, appropriately scoped
  cookie; its server-side identifier is stored only as a hash.
- The refresh and logout endpoints apply origin/CSRF controls appropriate to cookie use.
- Authentication OTP and booking-completion OTP are different purpose-bound challenges.
- Resource ownership is checked in addition to role. A role alone never grants access to another
  customer's or Professional's records.

Target roles:

- `CUSTOMER`
- `PROFESSIONAL`
- `ADMIN`
- `SUPPORT`
- `FINANCE`

`SUPPORT` and `FINANCE` are least-privilege admin subroles. They do not alter the marketplace user
model.

## Standard Error Contract

```json
{
  "error": {
    "code": "BOOKING_INVALID_TRANSITION",
    "message": "The booking cannot be accepted in its current state.",
    "requestId": "01J...",
    "details": [
      {
        "field": "status",
        "reason": "expected PENDING_PROFESSIONAL"
      }
    ]
  }
}
```

- Public messages must not reveal account existence, provider secrets, internal risk scores, stack
  traces, SQL, or private admin notes.
- `details` is optional and must contain only safe validation information.
- Error codes are stable identifiers and are documented in OpenAPI.

| HTTP status           | Use                                                                                |
| --------------------- | ---------------------------------------------------------------------------------- |
| `200` / `201` / `204` | Successful read/create/no-content command.                                         |
| `400`                 | Malformed input or failed validation.                                              |
| `401`                 | Missing, expired, or invalid authentication.                                       |
| `403`                 | Authenticated but not authorized or resource access is disallowed.                 |
| `404`                 | Resource is absent or intentionally concealed from the caller.                     |
| `409`                 | Invalid state transition, slot conflict, duplicate operation, or version conflict. |
| `422`                 | Semantically valid input that violates an applicable business rule.                |
| `429`                 | Rate or abuse limit exceeded.                                                      |
| `500`                 | Unexpected server error; return only request id and safe message.                  |
| `502` / `503`         | Required provider or service unavailable.                                          |

## Idempotency

`Idempotency-Key` is required for commands that can create money movement, duplicate bookings, or
duplicate provider work:

- booking creation;
- advance-payment order creation;
- cancellation/refund initiation;
- completion verification;
- withdrawal creation;
- admin refund or payout commands.

The same authenticated actor, endpoint, and key with the same normalized payload returns the
original result. Reuse with a different payload returns `409`. Provider webhooks are deduplicated by
provider and external event id. Exact key retention duration is **Decision pending operational and
payment-provider review**.

## Health Endpoints

| Method and path            | Access                 | Behavior                                                                        |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `GET /api/v1/health/live`  | Public, rate-limited   | Process liveness only; no sensitive dependency data.                            |
| `GET /api/v1/health/ready` | Platform/load balancer | Readiness including required database connectivity; safe component status only. |

## Authentication Endpoints

| Method and path                            | Access                       | Purpose                                                                                          |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST /api/v1/auth/otp/request`            | Guest                        | Request a purpose-bound login or signup OTP. Always return a neutral accepted response.          |
| `POST /api/v1/auth/otp/verify`             | Guest                        | Verify OTP, create/activate the permitted account context, and issue access/refresh credentials. |
| `POST /api/v1/auth/token/refresh`          | Refresh cookie               | Rotate refresh credential and issue a new access token.                                          |
| `POST /api/v1/auth/logout`                 | Authenticated/refresh cookie | Revoke the current session and clear its cookie.                                                 |
| `POST /api/v1/auth/logout-all`             | Authenticated                | Revoke all sessions for the current User.                                                        |
| `GET /api/v1/auth/sessions`                | Authenticated                | List the User's redacted active sessions.                                                        |
| `DELETE /api/v1/auth/sessions/{sessionId}` | Owner                        | Revoke one owned session.                                                                        |

OTP request payload includes `mobileNumber` and `purpose`. The response never returns an OTP or
reveals whether the account exists. Provider, TTL, retry count, cooldown, and rate-limit values are
**Decision pending provider and security review**.

## Public Discovery Endpoints

| Method and path                                           | Access | Purpose                                                                                      |
| --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `GET /api/v1/cities`                                      | Guest  | List active marketplace cities; only Sikar is active in Phase 1.                             |
| `GET /api/v1/service-areas?cityId=`                       | Guest  | List active serviceability areas.                                                            |
| `GET /api/v1/service-categories`                          | Guest  | List active beauty categories.                                                               |
| `GET /api/v1/services?categoryId=&cityId=`                | Guest  | Browse active services and platform price/duration guidance.                                 |
| `GET /api/v1/professionals`                               | Guest  | Search approved, active Professionals by service, area, slot, rating, price, and experience. |
| `GET /api/v1/professionals/{professionalId}`              | Guest  | View approved public profile, portfolio, services, ratings, and safe availability summary.   |
| `GET /api/v1/professionals/{professionalId}/availability` | Guest  | Return bookable slots for an approved service/date range.                                    |

Public responses never include mobile number, exact home address, verification documents, internal
notes, risk signals, hidden score, payout information, or provider identifiers.

## Customer Profile and Address Endpoints

| Method and path                           | Access        | Purpose                                                        |
| ----------------------------------------- | ------------- | -------------------------------------------------------------- |
| `GET /api/v1/me`                          | Authenticated | Return the current User and permitted profile contexts.        |
| `PATCH /api/v1/me/customer-profile`       | Customer      | Update allowlisted customer profile fields.                    |
| `GET /api/v1/me/addresses`                | Customer      | List owned addresses.                                          |
| `POST /api/v1/me/addresses`               | Customer      | Create and validate an address against an active service area. |
| `PATCH /api/v1/me/addresses/{addressId}`  | Owner         | Update an owned address; Booking snapshots are unaffected.     |
| `DELETE /api/v1/me/addresses/{addressId}` | Owner         | Soft-delete an unused address from future selection.           |

## Quote and Booking Endpoints

| Method and path                                       | Access                   | Purpose                                                                                                             |
| ----------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/booking-quotes`                         | Customer                 | Validate services, address, slot, assignment mode, offers/coupon, and return a short-lived server-calculated quote. |
| `POST /api/v1/bookings`                               | Customer                 | Create a persisted `DRAFT` Booking from a valid quote. Idempotent.                                                  |
| `GET /api/v1/bookings`                                | Customer                 | List owned Bookings with status filters and cursor pagination.                                                      |
| `GET /api/v1/bookings/{bookingId}`                    | Participant/admin        | Return a role-redacted Booking and allowed action links.                                                            |
| `POST /api/v1/bookings/{bookingId}/submit`            | Owner customer           | Revalidate and freeze the `DRAFT` price/commission/policy snapshot, then enter `PENDING_ADVANCE`. Idempotent.       |
| `POST /api/v1/bookings/{bookingId}/advance-payment`   | Owner customer           | Create or return the active Razorpay advance-payment order. Idempotent.                                             |
| `POST /api/v1/bookings/{bookingId}/cancel`            | Participant/admin policy | Request cancellation with reason; server calculates eligibility, fees, and refund.                                  |
| `POST /api/v1/bookings/{bookingId}/completion/verify` | Owner customer           | Verify the purpose-bound completion OTP and atomically complete the Booking.                                        |
| `POST /api/v1/bookings/{bookingId}/rebook`            | Owner customer           | Create a quote draft using the prior service and Professional when still eligible.                                  |

Example create request:

```json
{
  "quoteId": "1de5ad26-2be6-4bf6-947d-4cecd78bc2cd",
  "assignmentMode": "SELECTED_PROFESSIONAL",
  "selectedProfessionalId": "cc8a93fa-a446-48ce-9c79-a2bd36984163",
  "addressId": "38c967aa-5972-48fb-aea1-42ecbb4ca788",
  "scheduledStart": "2026-07-12T05:30:00.000Z"
}
```

For `BEST_AVAILABLE`, `selectedProfessionalId` is omitted. Prices, advance, discounts, taxes, and refund estimates come only from the server quote. Before Professional acceptance, cancellation, selected-Professional decline, or assignment failure uses the approved zero-fee full-refund baseline. Exact advance amount, post-confirmation cancellation cutoff/fees, Professional compensation, taxes, and provider refund timing are **Decision pending — Product, Finance, Operations, Legal, Tax, and Razorpay review**.

## Booking Lifecycle

| From                          | Command/event                               | To                     | Required guard                                                                                                                                               |
| ----------------------------- | ------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DRAFT`                       | Submit Booking                              | `PENDING_ADVANCE`      | Valid unexpired quote, serviceable address, available slot.                                                                                                  |
| `DRAFT`                       | Draft/quote deadline expires                | `EXPIRED`              | Draft was not submitted before its server-defined expiry.                                                                                                    |
| `PENDING_ADVANCE`             | Verified payment capture                    | `PENDING_ASSIGNMENT`   | `BEST_AVAILABLE` mode.                                                                                                                                       |
| `PENDING_ADVANCE`             | Verified payment capture                    | `PENDING_PROFESSIONAL` | Selected Professional remains eligible and receives offer.                                                                                                   |
| `PENDING_ADVANCE`             | Quote/payment deadline expires              | `EXPIRED`              | No captured payment; pending provider order is closed where possible.                                                                                        |
| `PENDING_ASSIGNMENT`          | Candidate chosen                            | `PENDING_PROFESSIONAL` | Candidate is approved, active, qualified, and available.                                                                                                     |
| `PENDING_PROFESSIONAL`        | Professional accepts                        | `CONFIRMED`            | Offer is active and slot reservation succeeds.                                                                                                               |
| `PENDING_ASSIGNMENT`          | Assignment deadline expires                 | `EXPIRED`              | No active offer remains and the approved assignment-attempt window ended; captured funds enter full refund.                                                  |
| `PENDING_PROFESSIONAL`        | Best-available candidate declines/times out | `PENDING_ASSIGNMENT`   | Attempts remain and the booking uses `BEST_AVAILABLE`.                                                                                                       |
| `PENDING_PROFESSIONAL`        | Selected Professional declines              | `CANCELLED`            | Record `SELECTED_PROFESSIONAL_DECLINED`; captured funds enter full refund. A new best-available booking is separate.                                         |
| `PENDING_PROFESSIONAL`        | Final offer deadline expires                | `EXPIRED`              | No eligible reassignment remains; captured funds enter full refund.                                                                                          |
| `CONFIRMED`                   | Professional starts service                 | `IN_SERVICE`           | Actor is assigned Professional and scheduled-time guard passes. Exact early/late tolerance is **Decision pending — Product, Operations, and Safety review**. |
| `IN_SERVICE`                  | Professional requests completion            | `COMPLETION_PENDING`   | System sends a new completion OTP to the customer.                                                                                                           |
| `COMPLETION_PENDING`          | Challenge expires/is withdrawn              | `IN_SERVICE`           | Service remains active; issue a new challenge only through the guarded completion request.                                                                   |
| `COMPLETION_PENDING`          | Customer verifies completion OTP            | `COMPLETED`            | Valid, unexpired, unused challenge. Recognizes the snapshotted commission and creates earning/hold ledger entries atomically.                                |
| Any allowed nonterminal state | Cancellation command                        | `CANCELLED`            | Role, timing, reason, payment, and dispute rules pass. Post-confirmation policy is **Decision pending — Product, Operations, Finance, and Legal review**.    |

`COMPLETED`, `CANCELLED`, and `EXPIRED` are terminal for ordinary commands. Support/admin corrections
use explicit audited operations and compensating financial entries, never direct status edits.

## Professional Endpoints

### Profile and Verification

| Method and path                                                     | Access        | Purpose                                                                         |
| ------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------- |
| `GET /api/v1/professional/profile`                                  | Professional  | Return own onboarding/profile state.                                            |
| `PATCH /api/v1/professional/profile`                                | Professional  | Update allowlisted profile fields.                                              |
| `POST /api/v1/uploads`                                              | Authenticated | Create a short-lived signed upload authorization for an approved purpose.       |
| `POST /api/v1/uploads/{uploadId}/complete`                          | Upload owner  | Verify checksum/type/size and attach uploaded metadata after security scanning. |
| `POST /api/v1/professional/verification-applications`               | Professional  | Submit a complete draft application for review.                                 |
| `GET /api/v1/professional/verification-applications/current`        | Professional  | Return own current status and public-safe rejection reason.                     |
| `POST /api/v1/professional/verification-applications/{id}/resubmit` | Owner         | Create the next application version after rejection where eligible.             |

Verification transitions:

`DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED | REJECTED`, with administrative `APPROVED -> SUSPENDED -> APPROVED` after authorized re-review. A correction request rejects the current version with reason `CORRECTION_REQUIRED`; resubmission creates a new `DRAFT` and never overwrites history.

### Services and Availability

| Method and path                                           | Access                | Purpose                                                     |
| --------------------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| `GET /api/v1/professional/services`                       | Professional          | List own approved master services and offering state.       |
| `PUT /api/v1/professional/services/{serviceId}`           | Approved Professional | Set price and enabled state within platform limits.         |
| `DELETE /api/v1/professional/services/{serviceId}`        | Approved Professional | Disable future offering; existing Booking snapshots remain. |
| `GET /api/v1/professional/availability`                   | Professional          | List own slots/rules for a date range.                      |
| `POST /api/v1/professional/availability/slots`            | Approved Professional | Create available slots without overlap.                     |
| `DELETE /api/v1/professional/availability/slots/{slotId}` | Owner                 | Remove an unreserved future slot.                           |

### Booking Work

| Method and path                                                     | Access                | Purpose                                                           |
| ------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| `GET /api/v1/professional/bookings`                                 | Professional          | List assigned/offered Bookings with status filters.               |
| `POST /api/v1/professional/bookings/{bookingId}/accept`             | Offered Professional  | Accept an active offer and confirm slot.                          |
| `POST /api/v1/professional/bookings/{bookingId}/decline`            | Offered Professional  | Decline with an allowlisted reason.                               |
| `POST /api/v1/professional/bookings/{bookingId}/start`              | Assigned Professional | Move an eligible confirmed Booking to `IN_SERVICE`.               |
| `POST /api/v1/professional/bookings/{bookingId}/completion/request` | Assigned Professional | Move to `COMPLETION_PENDING` and send completion OTP to customer. |

The completion OTP is entered by the authenticated customer through the customer endpoint; it is
never returned to the Professional or API caller.

## Wallet, Withdrawal, and Payout Endpoints

| Method and path                                               | Access        | Purpose                                                                                                            |
| ------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/professional/wallet`                             | Professional  | Return simple pending, available, and reserved INR balances plus next-clearance summary.                           |
| `GET /api/v1/professional/wallet/entries`                     | Professional  | Cursor-paginated own earnings, adjustments, reservations, payouts, and reversals.                                  |
| `GET /api/v1/professional/earnings`                           | Professional  | Booking-level commission and net-earning summaries without exposing rule internals not applicable to that Booking. |
| `POST /api/v1/professional/withdrawals`                       | Professional  | Reserve available balance and create a withdrawal of at least ₹500. Idempotent.                                    |
| `GET /api/v1/professional/withdrawals`                        | Professional  | List own requests and payout status.                                                                               |
| `GET /api/v1/professional/withdrawals/{withdrawalId}`         | Owner/finance | Return a role-redacted request and payout attempts.                                                                |
| `POST /api/v1/professional/withdrawals/{withdrawalId}/cancel` | Owner         | Cancel only before processing where policy permits.                                                                |

Payout rules:

- Verified Booking completion creates the Professional net earning in pending state.
- Normal availability time is `completedAt + 6 hours`.
- Open dispute, fraud/risk hold, refund processing, or financial inconsistency can block release with
  an auditable reason.
- Withdrawal amount must be at least `50000` paise and no more than available balance.
- Request creation atomically moves funds from available to reserved.
- Exact commission rate/slab, payout provider, bank verification, gateway fees, taxes, payout SLA, failed-payout retry policy, and exceptional release rules are **Decision pending — Finance, Security, Legal, Tax, and provider review**.

Target withdrawal/payout flow:

`REQUESTED -> UNDER_REVIEW -> PROCESSING -> PAID`

Alternative non-success outcomes are `FAILED`, `REJECTED`, or `CANCELLED`. `FAILED` is recoverable: an audited Finance command moves it to `UNDER_REVIEW`, `PROCESSING`, or `CANCELLED` after confirming provider debit state. `REJECTED` and `CANCELLED` are terminal; money must never be both available and reserved/paid.

## Reviews, Referrals, Rewards, and Reminders

| Method and path                                      | Access                      | Purpose                                             |
| ---------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| `POST /api/v1/bookings/{bookingId}/reviews`          | Owner customer              | Create one verified review for a completed Booking. |
| `GET /api/v1/professionals/{professionalId}/reviews` | Guest                       | List moderated verified reviews.                    |
| `GET /api/v1/me/referral`                            | Customer/Professional       | Return own referral code and public-safe progress.  |
| `POST /api/v1/referrals/apply`                       | Eligible authenticated User | Apply a referral under server eligibility rules.    |
| `GET /api/v1/me/rewards`                             | Authenticated               | Return own reward balance and ledger.               |
| `GET /api/v1/me/rebooking-reminders`                 | Customer                    | List own reminder schedule/status.                  |
| `PATCH /api/v1/me/rebooking-reminders/{id}`          | Owner                       | Enable, disable, or adjust an eligible reminder.    |

Rating scale, moderation rules, referral/reward values, expiry, coupon values, reminder timing, and anti-abuse thresholds are **Decision pending — Product, Growth, Operations, Finance, Fraud, and Legal review**.

## Support and Dispute Endpoints

| Method and path                                      | Access                            | Purpose                                                                                   |
| ---------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `POST /api/v1/support/tickets`                       | Authenticated                     | Create a ticket, optionally linked to an owned/assigned Booking, payment, or withdrawal.  |
| `GET /api/v1/support/tickets`                        | Requester/participant             | List own tickets.                                                                         |
| `GET /api/v1/support/tickets/{ticketId}`             | Participant/support/admin         | Return ticket and messages with role-based redaction.                                     |
| `POST /api/v1/support/tickets/{ticketId}/messages`   | Participant/support/admin         | Add a participant-visible message or authorized internal note.                            |
| `POST /api/v1/support/tickets/{ticketId}/close`      | Requester/support/admin           | Close an eligible resolved ticket.                                                        |
| `POST /api/v1/support/tickets/{ticketId}/reopen`     | Eligible participant/support      | Reopen a resolved/closed ticket within the approved window and record its reason/history. |
| `POST /api/v1/support/tickets/{ticketId}/disputes`   | Eligible participant/support      | Open one active dispute for the linked Booking.                                           |
| `GET /api/v1/support/disputes/{disputeId}`           | Participant/support/admin/finance | Return role-redacted dispute and evidence.                                                |
| `POST /api/v1/support/disputes/{disputeId}/evidence` | Participant/support/admin         | Attach private evidence through the secure upload flow.                                   |
| `POST /api/v1/support/disputes/{disputeId}/reopen`   | Authorized support/admin          | Reopen a resolved dispute for an approved appeal with reason and audit evidence.          |

Ticket lifecycle:

`OPEN -> ASSIGNED -> WAITING_CUSTOMER | WAITING_PROFESSIONAL | UNDER_REVIEW -> RESOLVED -> CLOSED`

Reassignment and movement among waiting/review states is allowed with history. A participant reply
returns a waiting ticket to `ASSIGNED` or `UNDER_REVIEW`. Exact SLA, escalation, reopen window, WhatsApp provider, and WhatsApp-to-ticket synchronization are **Decision pending — Operations, Legal, Privacy, and provider review**.

Dispute lifecycle: `OPEN -> UNDER_REVIEW -> RESOLVED`, with authorized appeal/reopen `RESOLVED -> UNDER_REVIEW`. Resolution records outcome, actor, reason, financial effect, and evidence. It may issue separate refund/hold/reversal commands; it does not directly edit ledger history. The appeal/reopen window is **Decision pending — Operations and Legal review**.

## Admin and Operations Endpoints

All admin commands require an explicit reason, least-privilege role, request id, and audit event.
List endpoints are paginated and use allowlisted filters.

| Area             | Target endpoints/commands                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verification     | `GET /admin/verification-applications`, `GET /{id}`, `POST /{id}/start-review`, `POST /{id}/approve`, `POST /{id}/reject`, `POST /professionals/{id}/suspend`, `POST /professionals/{id}/reactivate` |
| Catalogue        | CRUD/deactivate `/admin/service-categories` and `/admin/services`; version price limits rather than rewriting Booking snapshots                                                                      |
| Commission       | CRUD/publish `/admin/commission-rules`; published versions are immutable and effective-dated                                                                                                         |
| Bookings         | Search/detail, explicit assign/reassign, support cancellation, and timeline endpoints; no generic status patch                                                                                       |
| Payments/refunds | Search payment state and `POST /admin/payments/{id}/refunds`; provider result remains authoritative                                                                                                  |
| Finance          | Queue/detail for withdrawals and explicit review/approve/reject/retry payout commands                                                                                                                |
| Support          | Ticket queue, assign, change waiting/review state, resolve, close, and dispute resolution commands                                                                                                   |
| Risk             | Fraud-signal queue, acknowledge/escalate/resolve, and documented hold/release commands                                                                                                               |
| Growth           | Versioned coupon, referral, reward, and reminder configuration within approved business rules                                                                                                        |
| Audit/metrics    | Read-only audit search and aggregate operational metrics; raw hidden scores remain restricted                                                                                                        |

The `/admin` paths above are relative to `/api/v1`. Exact Finance approval thresholds and
maker-checker requirements are **Decision pending finance and security review**.

## Provider Webhooks

| Method and path                                  | Source                         | Requirements                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/webhooks/razorpay`                 | Razorpay                       | Verify signature over raw body, deduplicate event, acknowledge quickly, and process capture/refund state transactionally.                                                                                |
| `POST /api/v1/webhooks/notifications/{provider}` | Approved notification provider | Verify provider authentication, allowlist event types, deduplicate, and update delivery attempt only. Provider is **Decision pending — Product, Operations, Security, Privacy, and Procurement review**. |
| `POST /api/v1/webhooks/payouts/{provider}`       | Approved payout provider       | Verify signature, deduplicate, and apply payout result through the Finance module. Provider is **Decision pending — Finance, Security, Legal, and Procurement review**.                                  |

Webhook handlers must tolerate duplicates and out-of-order events. A successful HTTP acknowledgment
means the event was durably recorded, not necessarily fully processed. Unknown events are retained
for restricted review without changing domain state.

## Privacy and Field-Level Redaction

- Customer and Professional public APIs never expose personal mobile numbers to one another.
- Exact service address is limited to the minimum operational stage and authorized Booking
  participants; direct contact details remain hidden.
- Verification documents, payment metadata, bank/payout destinations, support evidence, internal
  notes, audit events, fraud signals, and hidden scores are restricted by role and purpose.
- Logs and error responses use opaque ids and redacted provider/customer values.
- Admin exports are not part of the public API and require a separately approved audited control.

## Contract Quality Gates

Before an endpoint is complete, it must have:

1. Strict request and response DTOs.
2. OpenAPI description and stable error codes.
3. Authentication, role, ownership, and field-redaction tests.
4. Happy-path, invalid-transition, idempotency, concurrency, and failure tests.
5. Audit coverage for critical actions.
6. Provider contract tests or verified sandbox fixtures where applicable.
7. Database transaction/invariant tests for Booking and financial commands.
8. Rate-limit and abuse-control tests for OTP, search, upload, support, and payment boundaries.

## Current Scaffold Gaps

The current API has no global prefix/version, DTO validation, OpenAPI, database module, auth module,
domain modules, CORS policy, security headers, rate limiting, provider adapters, webhooks, health
checks, or product endpoints. These are release blockers, not hidden implementation assumptions.
