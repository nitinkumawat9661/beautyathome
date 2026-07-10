# BeautyAtHome Documentation

This directory is the versioned source of truth for the BeautyAtHome product, business, technical, operational, deployment, and review baselines. The v1.0 baseline describes the Sikar Phase 1 product and the production controls required before launch.

“Final v1.0 baseline” means authoritative for implementation unless a section is explicitly marked pending review. It does not replace legal, tax, security, or external-provider approval where a review gate is shown.

## Document Index

| #   | Document                                 | Purpose                                                                                    | Status and review gate                                                           |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 01  | [Vision](./01-Vision.md)                 | Mission, positioning, principles, and long-term direction                                  | Final v1.0 baseline                                                              |
| 02  | [Business Requirements](./02-BRD.md)     | Objectives, users, launch scope, constraints, and success metrics                          | Final v1.0 baseline                                                              |
| 03  | [Product Requirements](./03-PRD.md)      | Phase 1 features, journeys, constraints, and acceptance criteria                           | Final v1.0 baseline                                                              |
| 04  | [Software Requirements](./04-SRS.md)     | Functional, non-functional, data, security, and dependency requirements                    | Final v1.0 baseline                                                              |
| 05  | [Tech Stack](./05-Tech-Stack.md)         | Approved application, data, integration, hosting, and development stack                    | Final v1.0 baseline; vendors pending where alternatives are listed               |
| 06  | [Architecture](./06-Architecture.md)     | System boundaries, modules, data flow, reliability, and architecture decisions             | Final v1.0 baseline                                                              |
| 07  | [Database](./07-Database.md)             | Relational entities, constraints, indexes, status history, and financial integrity         | Final v1.0 baseline; retention/legal controls pending professional review        |
| 08  | [API Specification](./08-API-Spec.md)    | Versioned API conventions, endpoints, contracts, errors, and idempotency                   | Final v1.0 baseline; integration details pending provider confirmation           |
| 09  | [UI and UX](./09-UI-UX.md)               | Information architecture, journeys, status presentation, responsive PWA, and accessibility | Final v1.0 baseline; third-party accessibility pending provider review           |
| 10  | [Business Rules](./10-Business-Rules.md) | Eligibility, booking, commission, payout, review, support, and promotion rules             | Final v1.0 baseline; configurable values require owner approval                  |
| 11  | [Security](./11-Security.md)             | Threat controls, identity, authorization, privacy, audit, and incident response            | Final v1.0 baseline; professional security/privacy review required before launch |
| 12  | [Revenue Model](./12-Revenue-Model.md)   | Commission, earnings, refunds, payouts, unit economics, and reconciliation                 | Final v1.0 baseline; rates and tax treatment pending owner/professional review   |
| 13  | [Operations](./13-Operations.md)         | Verification, booking, dispute, payout, support, fraud, and incident playbooks             | Final v1.0 baseline; provider SLAs and operator thresholds pending approval      |
| 14  | [Roadmap](./14-Roadmap.md)               | Gate-based Phase 1 delivery, pilot readiness, validation, and conditional expansion        | Final v1.0 baseline; no dates committed                                          |
| 15  | [Deployment](./15-Deployment.md)         | Environments, CI/CD, infrastructure, data operations, rollback, and observability          | Final v1.0 baseline; production vendors and RPO/RTO pending approval             |
| 16  | [Legal](./16-Legal.md)                   | India-specific legal, tax, privacy, marketplace, and provider review register              | v1.0 review baseline; professional legal/tax review required before production   |
| 17  | [Changelog](./17-Changelog.md)           | Living record of approved documentation and implementation changes                         | Living document                                                                  |

## Project Summary

BeautyAtHome is a Tier-2/Tier-3 focused home beauty services marketplace starting with Sikar as the pilot city and designed to expand across India.

## Core Decisions Locked

- Beauty services only for launch
- Female professionals only in Phase 1
- Managed marketplace with hybrid booking
- Mobile OTP login only
- Website + PWA first
- Flexible pricing with limits
- Dynamic commission engine
- Professional earnings clear no earlier than 6 hours after verified completion unless a dispute or approved hold applies
- Minimum withdrawal of ₹500
- Verified booking based reviews
- WhatsApp + ticket support
- Referral and rewards system
- Auto rebooking reminders

Hybrid booking means that a customer may select a professional or request best-professional assignment. Mobile OTP is the only authenticated login method; guest browsing remains available.

## Source-of-Truth and Change Control

- Documents 01–05 contain the locked vision, business, product, software, and stack decisions from which documents 06–16 are derived.
- Documents 06–16 make those decisions implementation-ready but cannot silently broaden or contradict Phase 1 scope.
- Explicit pending decisions remain blocked on their named owner, professional review, or provider confirmation; they are not implementation assumptions.
- Any approved scope or behavior change must update every affected document and [the changelog](./17-Changelog.md) in the same reviewed change.
- Native apps, male professionals, non-beauty services, live GPS tracking, advanced AI automation, microservices, and multi-city launch are outside Phase 1. Their appearance in a future-options section does not make them committed roadmap items.

## Review Labels

- **Final v1.0 baseline:** authoritative for Phase 1 design and implementation, subject to explicit review gates.
- **Pending owner approval:** a product, business, finance, or operations value has not been set by the authorized owner.
- **Pending provider confirmation:** behavior depends on a selected external vendor or its contract/capabilities.
- **Pending professional review:** legal, tax, privacy, or specialist security advice is required before production use.
- **Living document:** expected to change as approved work is implemented or decisions change.
