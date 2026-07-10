# 09 UI and UX Specification

- **Document status:** Final v1.0 baseline
- **Release scope:** Phase 1, Sikar pilot
- **Platforms:** Responsive website and Progressive Web App (PWA)

## 1. Purpose

This document defines the Phase 1 information architecture, user journeys, screen responsibilities, interaction states, and accessibility baseline for BeautyAtHome. It translates the product requirements into a consistent experience for guests, customers, professionals, and platform administrators.

This specification does not define a logo, color palette, typography brand, illustration style, or marketing campaign. Those visual-brand decisions may be added later without changing the product flows defined here.

## 2. Experience Principles

- **Mobile first:** prioritize narrow screens, touch input, and mobile-network conditions while retaining complete desktop functionality.
- **Trust at every step:** show verification, price, rating, booking, payment, and support information in plain language.
- **Progressive commitment:** allow guest browsing and request OTP authentication only when an authenticated action is required.
- **Short booking flow:** ask only for information needed to select a professional, confirm serviceability, choose a slot, pay the advance, and create the booking.
- **Clear ownership:** every status must explain what happened, who acts next, and what the user can do.
- **Financial clarity:** distinguish pending earnings, available earnings, withdrawals, commission, payment, and refund states.
- **Privacy by default:** do not expose direct customer or professional contact details through profiles, bookings, reviews, or support views.
- **Recoverable interactions:** preserve safe user input, prevent duplicate submissions, and provide a retry or support path when an operation fails.
- **Operational simplicity:** avoid UI behavior that requires undocumented manual work or creates a second source of truth outside the platform.

## 3. Users and Access

| User         | Phase 1 needs                                                                                                                                       | Access boundary                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Guest        | Browse services and professional profiles                                                                                                           | Cannot book, review, manage an account, or access private data                                    |
| Customer     | Book home beauty services, manage bookings, review completed services, rebook, use rewards, and contact support                                     | Sees only their own account, bookings, payments, rewards, reviews, and tickets                    |
| Professional | Complete onboarding, submit verification, configure approved services and availability, respond to requests, complete services, and manage earnings | Sees only their own profile, assigned requests, bookings, reviews, earnings, payouts, and tickets |
| Admin        | Operate verification, services, bookings, disputes, commissions, payouts, promotions, fraud review, support, and reporting                          | Access is role-authorized and audited                                                             |

The Phase 1 female-only rule applies to professionals. The existing requirements describe customers as women and households; the UI must not reinterpret the professional eligibility rule as an undocumented customer-gender restriction.

## 4. Information Architecture

### 4.1 Public experience

- Home and service discovery
- Master service catalogue and service detail
- Professional listing with rating, price, experience, and availability filters
- Professional profile with verification state, approved services, allowed prices, portfolio, experience, availability, and verified-booking ratings
- Mobile OTP sign-up and sign-in
- Public help, policy, and legal links

Public pages must communicate that Phase 1 availability is limited to Sikar. Professional phone numbers, personal messaging details, and precise private addresses must not appear.

### 4.2 Customer experience

- Customer home and service discovery
- Professional selection or best-professional assignment
- Service location and slot entry
- Booking review and advance payment
- Booking confirmation, active status, and history
- Completion OTP interaction
- Verified review and same-professional rebooking
- Referrals, rewards, and eligible coupon presentation
- Support tickets and platform WhatsApp support entry point
- Profile, saved information, session management, and notification preferences

### 4.3 Professional experience

- Onboarding progress and verification status
- Profile and portfolio management
- Approved master-service selection and price entry within platform limits
- Availability management
- Incoming requests and accept/decline actions
- Confirmed, active, and historical bookings
- Service-completion verification
- Earnings summary, clearance hold, available balance, and withdrawal requests
- Commission and payout detail
- Ratings and reviews
- Support tickets, account, and notification preferences

### 4.4 Admin experience

- Operational dashboard
- Professional application and verification queues
- Customer and professional account views
- Master services and allowed price-limit management
- Booking monitoring and status history
- Disputes and support-ticket queues
- Commission, earnings-ledger, withdrawal, payout, refund, and reconciliation views
- Referral, reward, and coupon administration
- Fraud-signal review
- Performance reporting and audit history

Admin views must make privileged actions explicit, require confirmation for material changes, and preserve an auditable reason where the applicable business rule requires one.

## 5. Core Journey Specifications

### 5.1 Guest discovery and authentication

1. A guest can browse services, apply the supported filters, and open a professional profile without signing in.
2. An authenticated action redirects the guest to mobile OTP authentication and returns them to the intended step after success.
3. The OTP screen must show the masked mobile number, resend availability, expiry guidance, validation errors, and a safe way to change the number.
4. OTP retry, expiry, throttling, and lockout copy must reflect server policy. Provider-specific timing and limits remain pending SMS/OTP provider confirmation.

### 5.2 Customer booking

1. **Discover:** select a service and review eligible professionals.
2. **Choose assignment mode:** select a professional or request best-professional assignment. The two choices must be explained without implying a guaranteed professional before assignment is complete.
3. **Enter service details:** provide a Sikar service address and an offered time slot. Phase 1 does not include live location tracking.
4. **Review:** confirm service, assignment mode, address, slot, displayed price, advance due, and applicable terms.
5. **Pay advance:** start payment through the configured gateway. Pending or uncertain gateway results must remain pending until server reconciliation; the UI must not invite an immediate duplicate payment.
6. **Track confirmation:** show the API-controlled booking status and next action. A request is not confirmed while assignment or professional acceptance is pending.
7. **Complete service:** present the completion OTP only in the completion flow and distinguish it from the login OTP.
8. **Review or rebook:** after a verified completed booking, allow a review and offer rebooking with the same professional, subject to current serviceability and availability.

The uncollected service balance, refund eligibility, and cancellation charges must be rendered from finalized business rules. The UI must not imply cash, full online payment, or an automatic refund rule that the platform has not approved.

### 5.3 Professional onboarding and service delivery

1. Sign in with mobile OTP and create a professional profile.
2. Complete all required onboarding sections and submit verification information.
3. See a clear submitted, approved, or rejected verification outcome, including a safe correction/resubmission path where permitted.
4. Choose services only from the approved master list, enter prices within displayed limits, and set availability.
5. Receive a booking request with enough service, area, slot, and earnings information to accept or decline without revealing unnecessary customer data.
6. Track confirmed work and the service-completion flow.
7. After completion, see earnings move through the six-hour clearance hold before they become available, unless an applicable dispute or financial control prevents release.
8. Request a withdrawal of at least ₹500 only when the available balance is at least ₹500, then follow it until paid, rejected/cancelled, or a failed attempt is resolved.

### 5.4 Admin operations

1. Work from prioritized verification, booking, support, dispute, finance, and fraud queues.
2. Open a record with its current status, history, related records, and permitted actions.
3. Record an outcome and reason for a verification, dispute, payout review, or other material administrative action.
4. Confirm destructive or financially material actions and show an immutable success reference after completion.
5. Never use an optimistic success state for a payment, refund, earnings release, or payout before the backend confirms it.

## 6. Status Presentation

The API and business rules are the source of truth for status transitions. Clients may translate enum values into plain-language labels, but must not merge states that have different owners or permitted actions.

### 6.1 Booking status

| API status             | Customer-facing meaning                      | Required UX treatment                                                                         |
| ---------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DRAFT`                | Booking not submitted                        | Preserve progress and show the next incomplete step                                           |
| `PENDING_ADVANCE`      | Advance payment required or being reconciled | Show the gateway state and prevent unsafe duplicate payment                                   |
| `PENDING_ASSIGNMENT`   | Platform is assigning a professional         | Show that confirmation has not occurred and provide the permitted cancellation/support action |
| `PENDING_PROFESSIONAL` | Waiting for professional response            | Show who acts next and the current requested slot                                             |
| `CONFIRMED`            | Professional and slot confirmed              | Show service summary and the next service-stage action                                        |
| `IN_SERVICE`           | Service is in progress                       | Make completion verification and support easy to locate                                       |
| `COMPLETION_PENDING`   | Completion OTP verification required         | Identify which user must act; do not expose the OTP in unrelated views                        |
| `COMPLETED`            | Service completion verified                  | Show receipt/financial summary, verified review eligibility, and rebooking                    |
| `CANCELLED`            | Booking cancelled                            | Show actor, reason, timestamp, and financial outcome when available                           |
| `EXPIRED`              | Request ended without confirmation in time   | Explain the outcome and offer a safe new-booking path                                         |

A dispute is a separate state: `NONE`, `OPEN`, `UNDER_REVIEW`, or `RESOLVED`. When present, it appears as a prominent overlay on the booking and financial views without rewriting the underlying booking status.

Every booking card and detail view must show the current label, latest status time, service, slot, relevant professional or assignment mode, payment summary, next action owner, and available support action.

### 6.2 Earnings and payouts

The professional earnings view must separate:

- pending earnings in the six-hour clearance hold;
- available earnings eligible for withdrawal;
- requested or processing withdrawals;
- completed payouts;
- commission and other approved adjustments.

The withdrawal control must display and validate the ₹500 minimum for both available balance and requested amount. It remains disabled with an explanation when the available balance is lower. Funds reserved for an unresolved failed payout attempt, held funds, requested funds, and disputed funds must not count as available; a confirmed no-debit failure may release its reservation under the finance rules.

| Payout status  | Plain-language treatment                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| `REQUESTED`    | Request received                                                                |
| `UNDER_REVIEW` | Platform review in progress                                                     |
| `PROCESSING`   | Sent for provider processing; do not present as paid                            |
| `PAID`         | Provider-confirmed payout completed                                             |
| `FAILED`       | Processing failed; show retry or support guidance supplied by the API           |
| `REJECTED`     | Platform rejected the request; show the recorded reason and permitted next step |
| `CANCELLED`    | Request cancelled; show actor and timestamp                                     |

The label “wallet” in existing requirements describes a simple earnings view. It must not imply that customers or professionals can deposit, transfer, or spend regulated stored value. Final financial terminology is pending payment-provider and professional legal review.

### 6.3 Support tickets

Ticket views must preserve the distinction between `OPEN`, `ASSIGNED`, `WAITING_CUSTOMER`, `WAITING_PROFESSIONAL`, `UNDER_REVIEW`, `RESOLVED`, and `CLOSED`. The page must show the current owner, latest update, response action, and related booking when applicable. WhatsApp is a platform support channel, not permission to expose direct customer-professional contact details.

## 7. Common Interaction States

### 7.1 Loading

- Use stable skeletons for page and list loading so content does not jump.
- Keep action-specific progress close to the button or record being updated.
- Disable repeat submission while an operation is in flight.
- For payment and payout operations, use a server-confirmed result rather than an elapsed client timer.

### 7.2 Empty

- Explain why the list is empty and offer one relevant next action.
- Distinguish “no records yet” from “no filter matches” and “service unavailable in this area.”
- Do not fabricate professional availability, ratings, earnings, or operational metrics to fill an empty state.

### 7.3 Error

- Put field-validation messages beside the affected field and provide a page-level summary for long forms.
- Preserve non-sensitive input after a recoverable failure.
- Use actionable language for expired OTPs, unavailable slots, invalid price limits, failed uploads, and authorization failures.
- Give uncertain payment, refund, and payout results a pending/reconciliation state rather than a false failure or success.
- Include a ticket or WhatsApp support route when self-service recovery is not available.

### 7.4 Offline and poor connectivity

- The PWA may show a previously loaded shell or safe read-only content when offline.
- Booking, verification submission, payment, completion, review, admin, and payout mutations require confirmed connectivity.
- Do not queue financial or lifecycle mutations silently for later replay.
- Announce reconnection and require the user to review any action whose server outcome is unknown.

### 7.5 Unauthorized, forbidden, and unavailable

- An expired session requests OTP re-authentication and returns the user to a safe destination.
- A forbidden action explains that the account does not have permission without revealing protected data.
- A suspended, unverified, out-of-service-area, or otherwise unavailable state must explain the permitted recovery/support route supplied by policy.

## 8. Responsive and PWA Behavior

- Core discovery, authentication, booking, professional, and support journeys must be fully operable on a narrow mobile viewport.
- Use a single primary column on small screens; place secondary detail after the primary action and avoid horizontal page scrolling.
- Tables in admin and finance areas must provide a mobile-safe card or horizontal-container treatment without hiding required fields.
- Sticky or fixed actions must not cover inputs, validation messages, browser controls, or the on-screen keyboard.
- Desktop layouts may add side navigation and parallel context, but must retain the same actions and state meanings as mobile.
- PWA installation is optional and must not block website use. Launching from an installed PWA must preserve authentication, navigation, and deep-link behavior.
- Update prompts must avoid interrupting an active booking, payment, OTP, completion, or withdrawal action.

## 9. Accessibility Baseline

The implementation target is WCAG 2.2 Level AA for Phase 1 user and admin journeys.

- Use semantic headings, landmarks, form labels, lists, tables, and buttons.
- Make all functionality keyboard operable with a visible focus indicator and logical focus order.
- Do not encode status, error, verification, or financial meaning by color alone.
- Maintain sufficient text, icon, focus, and control contrast regardless of the future brand palette.
- Provide accessible names for icon-only controls and text alternatives for meaningful images.
- Announce dynamic validation, OTP errors, status changes, and async completion through appropriate live regions without repeated noise.
- Move focus to a useful heading or error summary after navigation or failed form submission.
- Support zoom and text reflow without loss of information or actions.
- Provide adequately sized touch targets and spacing for mobile use.
- Respect reduced-motion preferences and avoid motion required to understand a flow.
- Require descriptive portfolio-image alternatives or mark decorative imagery appropriately.
- Use plain, consistent language for money, dates, times, cancellation, verification, and support.

An accessibility audit is required before pilot release. Any third-party payment, OTP, WhatsApp, upload, or verification interface remains subject to provider capability review.

## 10. Content and Data Presentation

- Use “Customer,” “Professional,” and “Admin” consistently. Reserve “provider” for external technology/payment vendors to avoid confusing it with a beauty professional.
- Format money in Indian rupees and always show whether an amount is an advance, price, commission, held earning, available earning, withdrawal, refund, or adjustment.
- Display service times in the pilot-city local time and include the date wherever a relative label could become ambiguous.
- Mark ratings as verified-booking ratings and do not permit a review UI before eligible completion.
- Explain verification accurately; platform verification must not be presented as an absolute safety guarantee.
- Keep policy summaries readable and link to the applicable full terms once professionally reviewed.
- Use neutral component tokens from the shared UI package. Brand-specific tokens remain a separate approved design decision.

## 11. Security and Privacy in the Interface

- Mask mobile numbers and sensitive identifiers except where explicitly required and authorized.
- Do not store OTPs, access tokens, payment credentials, or identity-document contents in client logs or analytics.
- Require re-authentication or an equivalent server-approved control for sensitive account and payout changes.
- Show generic authentication failure messages where a more specific message would enable account enumeration.
- Do not expose internal fraud rules or hidden customer/professional score values.
- Make admin impersonation, export, override, and financial controls unavailable unless explicitly authorized and audited.

## 12. Acceptance Criteria

- Guests can browse Phase 1 services and professional profiles without authentication.
- A customer can complete the documented booking journey on mobile web and installed PWA and can always identify the current status and next action.
- A professional can understand onboarding progress, respond to requests, complete service verification, and distinguish held earnings from withdrawable earnings.
- An admin can operate the required queues without relying on undocumented status meanings.
- Booking, dispute, payout, and ticket statuses preserve the distinctions defined in this document and the API specification.
- All critical journeys provide loading, empty, error, offline, unauthorized, and recovery behavior.
- No user-facing flow exposes direct customer-professional contact information.
- The Phase 1 accessibility baseline is verified before the Sikar pilot release.
