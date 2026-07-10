# 14 Roadmap

- **Document status:** Final v1.0 baseline
- **Planning model:** Outcome- and gate-based; no calendar dates are committed in this document

## 1. Purpose

This roadmap sequences BeautyAtHome from its completed engineering foundation through the Sikar Phase 1 pilot and into conditional expansion. A stage advances only when its entry criteria, exit evidence, operational readiness, and required reviews are satisfied.

“Committed” below describes approved Phase 1 product scope. It does not promise a release date. Later options remain conditional and must not be treated as approved features merely because they appear on the roadmap.

## 2. Locked Direction

- Launch home beauty services in Sikar before broader rollout.
- Support female professionals only in Phase 1.
- Deliver a responsive website and PWA before any native mobile application.
- Use a managed marketplace with customer selection and best-professional assignment.
- Use mobile OTP as the only Phase 1 authentication method while allowing guest browsing.
- Build the Phase 1 platform as a modular monolith, not microservices.
- Validate trust, repeat usage, unit economics, and manageable operations before city expansion.

## 3. Stage 0: Engineering Foundation — Complete

### Delivered baseline

- pnpm and Turborepo monorepo workspace
- Next.js web application scaffold
- NestJS API application scaffold
- Shared UI, configuration, types, and utilities package foundations
- PostgreSQL and Prisma configuration foundation
- Workspace lint, formatting, type-checking, test, build, Husky, and lint-staged tooling
- GitHub Actions validation workflow
- Docker development-stack definitions

### Evidence

- Workspace installation, lint, type-check, test, and production build passed at the foundation baseline.
- Web and API scaffold runtime checks passed.
- Docker definitions exist; local container execution remains unverified until a Docker CLI/runtime is available.

### Boundary

Foundation completion does not mean the marketplace capabilities in Stage 1 are implemented. It means the repository is ready for feature development.

## 4. Stage 1: Sikar Phase 1 Marketplace — Committed Scope

### 4.1 Identity and role foundation

- Guest browsing
- Customer and professional mobile OTP registration and sign-in
- JWT access and refresh-token lifecycle
- Role-based access for customer, professional, and admin capabilities
- Session, consent, audit, and account-status controls required by the security baseline

**Exit gate:** authentication and authorization journeys pass automated and manual tests; OTP abuse controls are configured; SMS provider behavior is confirmed; privacy and consent text has completed required professional review.

### 4.2 Catalogue and professional supply

- Admin-managed master beauty-service catalogue
- Professional profile, portfolio, experience, approved services, and bounded pricing
- Availability management
- Professional verification submission and admin review
- Customer discovery and filters for rating, price, experience, and availability

**Exit gate:** an admin can approve a professional; an approved professional can publish eligible services and slots; an unapproved or out-of-limit record cannot enter discovery; verification and portfolio controls pass privacy, legal, and operations review.

### 4.3 Booking and service completion

- Customer-selected professional and best-professional assignment modes
- Sikar address/serviceability and slot selection without live GPS tracking
- Booking request, professional accept/decline, confirmation, cancellation, expiry, and status history
- Advance payment and provider reconciliation
- OTP-based service-completion verification
- Verified-booking review and same-professional rebooking

**Exit gate:** both assignment paths complete end to end; retries and provider webhooks are idempotent; booking and payment histories reconcile; cancellation/refund rules are approved; no direct customer-professional contact details are exposed.

### 4.4 Earnings, commission, and payouts

- Dynamic, auditable commission configuration
- Professional earnings ledger and simple wallet presentation
- Six-hour post-completion clearance hold
- Minimum ₹500 withdrawal rule
- Payout request, review, processing, failure, rejection, cancellation, and completion handling
- Admin reconciliation and financial audit trail

**Exit gate:** ledger invariants and concurrent transaction tests pass; commission and payout outcomes reconcile to booking/payment records; Razorpay or the approved provider confirms the required live capabilities; tax and regulated-money-flow treatment completes professional review.

### 4.5 Trust, retention, and operations

- WhatsApp and ticket support
- Booking disputes and admin resolution workflow
- Referrals, rewards, and coupons under configured rules
- Automatic rebooking reminders
- Hidden internal customer/professional risk or quality score inputs
- Admin fraud-signal review and platform performance reporting

**Exit gate:** support ownership and escalation paths are rehearsed; the platform can suspend unsafe actions; communication consent and template requirements are approved; rewards cannot create untracked financial value; hidden scores are protected and have documented operational use.

## 5. Stage 2: Sikar Pilot Readiness — Required Gate

The Phase 1 scope may enter a controlled Sikar pilot only when all of the following are true:

- Product acceptance criteria in the PRD, SRS, API, UI/UX, and business-rules documents pass.
- Production providers for OTP/SMS, WhatsApp, payments/payouts, object storage, hosting, and managed PostgreSQL are selected and validated.
- Production secrets, backups, restore tests, monitoring, alerting, audit logs, and incident response are ready.
- Security review, dependency scanning, access-control testing, and critical-flow penetration testing are complete.
- Terms, privacy notices, professional agreement, cancellation/refund rules, tax treatment, grievance flow, and required India-specific compliance complete professional review.
- A verified initial professional supply can serve the enabled Sikar areas and service catalogue.
- Admins can run verification, support, dispute, payment, payout, refund, fraud, and emergency procedures.
- Analytics can report the approved business success metrics without collecting unnecessary personal data.

Pilot rollout must be reversible. A failed readiness check blocks launch rather than creating a manual production workaround.

## 6. Stage 3: Pilot Validation and Stabilization — Committed Evaluation

The Sikar pilot is evaluated against the business metrics already defined in the BRD:

- registered professionals;
- active customers;
- booking completion rate;
- repeat booking rate;
- cancellation rate;
- support resolution time; and
- monthly commission revenue.

The platform operator must approve numerical thresholds before the pilot begins. Thresholds are not invented in this roadmap. The expansion decision also considers fraud, safety incidents, professional service capacity, payment/payout reliability, customer satisfaction, support workload, and unit economics.

During stabilization, priority goes to correctness, trust, operational load, and repeat usage. Net-new scope must not displace unresolved safety, financial, or support issues.

**Exit gate:** the pilot meets its pre-approved success thresholds for a representative evaluation period, material incidents have acceptable resolutions, and the operator confirms that the playbook can be repeated without disproportionate manual effort.

## 7. Stage 4: City-by-City Expansion — Conditional

Expansion beyond Sikar is consistent with the long-term vision but is not automatic. Each city requires:

- a serviceability and professional-supply assessment;
- city-specific catalogue, pricing limits, commission configuration, and operations ownership;
- confirmed legal, tax, provider, and data-handling applicability;
- support, dispute, safety, and payout readiness;
- a controlled launch with city-level metrics and rollback criteria; and
- evidence that the modular monolith and managed infrastructure can absorb projected load safely.

The system should reuse the core platform and configuration model. A new city must not require redesigning the booking, ledger, identity, or support domains.

## 8. Later Options — Not Committed

The following items require separate discovery, business approval, architecture review, and roadmap entry:

- native mobile applications;
- adjacent or non-beauty service categories;
- eligibility changes beyond female professionals;
- live GPS tracking;
- advanced AI automation;
- microservices extraction; and
- any multi-city launch that bypasses the city-by-city gate.

Simple deterministic recommendations may be evaluated inside the existing product boundaries, but no AI capability is required for the Phase 1 acceptance criteria. Microservices are considered only when measured scaling or ownership constraints justify the operational cost.

## 9. Decision and Review Gates

| Area                 | Required decision or evidence                                                                          | Owner/review                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| OTP and messaging    | Vendors, delivery behavior, DLT registration, templates, consent, fallback, and limits                 | Platform owner, provider confirmation, professional legal review                                   |
| Payments and payouts | Advance, refund, webhook, settlement, payout, chargeback, fee, and reconciliation capabilities         | Platform owner, Razorpay/approved provider confirmation, finance and legal review                  |
| Commission and tax   | Configured calculation basis, invoicing, GST/TDS treatment, and reporting                              | Platform owner, finance/tax professional review                                                    |
| Verification         | Required evidence, retention, re-review, rejection, and appeal rules                                   | Operations owner, verification provider confirmation where used, professional legal/privacy review |
| Security and privacy | Threat review, retention schedule, consent, incident response, access review, and launch test evidence | Engineering/security owner and professional legal/security review                                  |
| Infrastructure       | Production vendors, regions, scaling, monitoring, backups, restore evidence, RPO/RTO, and support      | Engineering/operations owner and provider confirmation                                             |
| Pilot operations     | Service areas, supply, support SLAs, escalation, cancellation/refund playbook, and metric thresholds   | Platform and operations owners                                                                     |

## 10. Roadmap Change Control

- Scope changes require updates to the authoritative product or business document, this roadmap, and `17-Changelog.md` in the same reviewed change.
- A conditional item becomes committed only after its decision record, acceptance criteria, dependencies, and gate evidence are approved.
- Provider or legal uncertainty must be labelled explicitly; it must not be converted into an assumed implementation detail.
- Dates, staffing estimates, and numerical business targets belong in an approved delivery plan, not in this frozen product roadmap.
