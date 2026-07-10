# 17 Changelog

- **Document status:** Living record
- **Scope:** Product, specification, architecture, and repository-foundation changes

## 1. How to Use This Changelog

- Record an entry whenever an approved product decision, specification, architecture boundary, operational policy, or release-ready capability changes.
- Describe implemented repository work separately from documented future requirements.
- Link changes to their commit, pull request, decision record, or issue when available.
- Do not use this file as evidence that a documented marketplace feature is implemented or deployed.

## 2. Unreleased

No approved changes have been recorded after the v1.0 documentation baseline.

## 3. Documentation Baseline v1.0 — 2026-07-10

### Added

- Finalized the BeautyAtHome Phase 1 product and technical specification set from `01-Vision.md` through `16-Legal.md`.
- Added concrete architecture, relational data, API, UI/UX, booking-state, business-rule, security, revenue, operations, roadmap, deployment, and legal/compliance baselines.
- Added a linked documentation index with status and review-gate visibility.
- Established `17-Changelog.md` as the living record for future approved changes.

### Clarified

- Phase 1 is a Sikar pilot for beauty services delivered by female professionals through the website and PWA.
- “Female-only” describes professional eligibility in the locked Phase 1 requirements; it is not an undocumented customer-gender restriction.
- Hybrid booking means customer-selected professional or best-professional assignment.
- Mobile OTP is the only Phase 1 authenticated login method; guests may browse without authentication.
- The six-hour earnings clearance hold and ₹500 minimum withdrawal are locked rules, while detailed commission rates, pricing bands, advance amount, refunds, and other configurable financial values require approved decisions.
- Legal, tax, payment-provider, communications-provider, verification-provider, and hosting-provider dependencies are explicitly marked for professional review or provider confirmation.

### Not implemented by this documentation milestone

- This baseline documents the marketplace to be built. It does not claim that authentication, service discovery, professional verification, booking, payments, payouts, reviews, support, rewards, reminders, fraud controls, or admin operations are implemented.
- Conditional roadmap options are not approved Phase 1 features.

## 4. Repository Foundation History — Before Documentation Baseline v1.0

The following entries reflect the existing Git history on `develop` and describe scaffolding/configuration, not completed marketplace functionality.

| Commit    | Repository milestone                                        |
| --------- | ----------------------------------------------------------- |
| `eaac3bc` | Completed the Next.js workspace scaffold for `apps/web`     |
| `3b438e4` | Scaffolded the NestJS service in `apps/api`                 |
| `83b5cb6` | Configured shared workspace tooling and package foundations |
| `52ecfab` | Added the Prisma and PostgreSQL configuration foundation    |
| `329da3d` | Added the monorepo validation workflow for GitHub Actions   |
| `0a8b00c` | Added Docker development-stack definitions                  |
| `007cb45` | Made pre-commit checks workspace-aware                      |

### Validation state at the foundation baseline

- `pnpm install`, lint, type-check, tests, and production build passed.
- The web and API scaffolds passed local runtime checks.
- The working branch was synchronized with `origin/develop` before this documentation milestone began.
- Docker configuration exists, but local container execution was not verified because the Docker CLI/runtime was unavailable.

## 5. Earlier Documentation History

- Created the documentation index and initial Vision, BRD, PRD, SRS, and Tech Stack documents.
- Those documents are the locked source decisions used to produce the v1.0 specification baseline; their original Git history remains authoritative.

## 6. Entry Template

Use this structure for future entries:

```markdown
## [Version or milestone] — YYYY-MM-DD

### Added

- New approved or implemented capability.

### Changed

- Existing behavior or decision that changed.

### Fixed

- Corrected implementation or documentation behavior.

### Security

- Security-relevant change with sensitive details omitted.

### Pending review

- Explicit legal, tax, security, operational, or provider decision that remains open.
```
