# 11 Security

## Document Status

- Status: Target v1 security specification
- Implementation state: Most controls in this document are release requirements, not current
  implementation. The present API is an unconfigured NestJS scaffold.
- Review requirement: Security, privacy, payment, employment/gig-work, consumer, and data-retention
  obligations must receive professional review before production launch.

## Security Objectives

BeautyAtHome must protect customer and Professional safety, identity, service location, verification
evidence, booking integrity, and financial balances while keeping Phase 1 operations manageable.
The primary objectives are:

1. Prevent account takeover, unauthorized role use, and cross-account data access.
2. Keep customer and Professional direct contact details hidden from one another.
3. Verify Professional onboarding decisions and preserve an auditable review history.
4. Prevent duplicate, forged, or inconsistent booking, payment, commission, wallet, and payout state.
5. Limit the effect of compromised providers, credentials, application instances, and admin accounts.
6. Detect, contain, investigate, and recover from abuse or security incidents.

## Current Foundation Controls

The repository already provides a useful baseline:

- frozen pnpm lockfile installation in CI;
- an explicit pnpm build-script allowlist;
- GitHub Actions with read-only repository-content permission;
- ignored local environment files and a non-secret example file;
- non-root API and web container users;
- lint, typecheck, test, and build gates.

These controls do not make the product production-secure. Authentication, authorization, provider
verification, data protection, monitoring, and runtime hardening are still unimplemented.

## Threat Model

| Threat                              | Examples                                                                                      | Required mitigation themes                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Account takeover                    | OTP brute force, SIM swap, stolen refresh token, session fixation                             | Neutral OTP responses, throttling, short expiry, rotating sessions, revocation, step-up checks       |
| Broken access control               | Customer reads another Booking; Professional changes another schedule; support sees bank data | Deny-by-default roles, ownership checks, field redaction, automated authorization tests              |
| Marketplace bypass and safety       | Contact details leaked through profiles, messages, logs, or support evidence                  | Contact masking, mediated notifications, content controls, restricted service-address release        |
| False Professional identity         | Forged documents, compromised review account, stale approval                                  | Private evidence, reviewer audit, separation of duties, suspension, expiry/reverification policy     |
| Booking manipulation                | Double booking, forged completion, invalid state jumps                                        | Database constraints, named commands, optimistic locking, purpose-bound completion OTP               |
| Payment and payout fraud            | Webhook spoof/replay, duplicate refund, wallet race, payout-destination takeover              | Signature verification, idempotency, immutable ledger, holds, reconciliation, step-up/admin controls |
| Malicious uploads                   | Malware, polyglot files, stored XSS, location metadata                                        | Private signed upload, content sniffing, scanning, safe derivatives, metadata removal                |
| Admin misuse                        | Unauthorized verification, refund, role assignment, score access                              | Least privilege, reason capture, step-up auth, immutable audit, maker-checker where approved         |
| Provider or supply-chain compromise | Malicious package script, leaked SMS/payment key, compromised image                           | Lockfiles/allowlists, secret manager, scanning, scoped credentials, rotation, signed artifacts       |
| Availability abuse                  | OTP floods, scraping, support spam, provider outage                                           | Layered throttles, quotas, circuit breakers, retry budgets, queues, graceful degradation             |

The threat model must be reviewed before launch and after every material workflow, provider, or data
classification change.

## Identity and Session Security

### Mobile OTP Authentication

Mobile OTP is the only Phase 1 customer and Professional login mechanism. Google and other social
login are excluded.

- Normalize the destination to E.164 before lookup.
- Return the same accepted response regardless of whether an account exists.
- Bind every challenge to a single purpose, destination, request context, expiry, and attempt budget.
- Store only a keyed digest of the OTP; never log or persist the code in plaintext.
- Generate codes with a cryptographically secure random generator.
- Mark a challenge consumed atomically and prevent replay.
- Rate-limit by destination, account, IP, device signal, and provider budget.
- Apply escalating cooldown and abuse review without revealing thresholds.
- Redact destinations in logs, admin views, and provider diagnostics.
- Never accept a provider delivery callback as proof that the user entered the OTP.

Exact code length, TTL, retry count, cooldown, daily limits, SMS provider, template registration, and
fallback behavior are **Decision pending provider and security review**.

### Booking-Completion OTP

- Use a separate purpose and key namespace from authentication OTP.
- Create it only for an eligible `IN_SERVICE` Booking and assigned Professional request.
- Deliver it only to the Booking customer through an approved channel.
- The authenticated customer submits it through the customer completion endpoint.
- Bind it to one Booking, one customer, an expiry, and a limited attempt count.
- Successful consumption, `COMPLETED` transition, recognition of the pre-payment commission snapshot, earning, and hold creation occur atomically.
- Support/admin exceptions require an explicit reason, supporting evidence, step-up authentication,
  and audit; they never expose the OTP.

Exact completion-code TTL, resend policy, offline recovery, and support override approvals are
**Decision pending security and operations review**.

### Access and Refresh Tokens

- Sign access JWTs with an asymmetric production key, `RS256`, and a current `kid`.
- Validate algorithm, signature, issuer, audience, subject, session id, issued-at, and expiry.
- Include only opaque identifiers and authorization claims; do not place mobile numbers, addresses,
  verification data, or bank data in a token.
- Keep the access token in web-app memory, not local storage.
- Use a cryptographically random opaque refresh token with at least 256 bits of entropy.
- Store only its hash and rotation lineage in `AuthSession`.
- Put the refresh token in a `Secure`, `HttpOnly`, host-scoped cookie with the narrowest practical
  path and an approved `SameSite` setting.
- Rotate on every refresh. Reuse of a rotated token revokes its session family and raises an alert.
- Revoke current/all sessions on logout, account suspension, material role change, or confirmed
  compromise.
- Rotate signing keys with overlap for valid short-lived access tokens; remove retired keys after the
  maximum validation window.

Exact access/refresh lifetimes, inactivity timeout, concurrent-session limit, cookie domain, and key
rotation interval are **Decision pending security review**.

## Authorization Model

Authorization is deny-by-default and enforced in the API service layer and database query scope.

| Role         | Permitted scope                                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest        | Public cities, services, approved Professional profiles, safe reviews and availability.                                                                  |
| Customer     | Own profile, addresses, quotes, Bookings, completion, reviews, rewards and support.                                                                      |
| Professional | Own profile/application, services, availability, offers, assigned Bookings, wallet, withdrawals and support.                                             |
| Support      | Assigned support/dispute data and minimum related Booking context; no unrestricted payout destination or secret access.                                  |
| Finance      | Commission, wallet, withdrawal, payout and refund operations needed for assigned duties; no verification-document access by default.                     |
| Admin        | Approved operational configuration and oversight; high-risk actions remain step-up/audited and are not automatically unrestricted infrastructure access. |

Required checks for every protected operation:

1. valid session and active User;
2. required role;
3. resource ownership/assignment or explicit administrative scope;
4. resource status and command guard;
5. field-level redaction;
6. recent step-up authentication for sensitive operations where configured.

Role grant/revoke, Professional approval/suspension, payout-destination change, high-value refund,
manual completion, financial adjustment, and audit export are high-risk actions. Exact maker-checker
thresholds and which actions require two approvers are **Decision pending security and finance
review**.

## Contact and Location Protection

- Public and participant APIs never reveal customer or Professional mobile numbers to one another.
- Notifications and WhatsApp interactions are platform-mediated through approved templates or relay
  mechanisms.
- Profile text, portfolio content, reviews, and participant-visible support messages must reject or
  moderate attempts to publish direct contact details.
- Release only the minimum service-location data required by the assigned, confirmed Professional at
  the approved stage of the Booking.
- Hide customer address from declined, expired, unassigned, suspended, and unrelated Professionals.
- Do not put exact address, mobile number, document URL, or map coordinates in analytics events,
  push payload previews, logs, or unencrypted caches.
- Live location tracking is out of scope.

Exact participant messaging/relay design and WhatsApp provider capabilities are **Decision pending — Product, Operations, Security, Privacy, Legal, and provider review**.

## Data Classification and Protection

| Class             | Examples                                                                                                                            | Minimum handling                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Public            | Approved service catalogue, safe Professional profile, aggregate rating                                                             | Integrity controls, moderation and cache invalidation                                     |
| Internal          | Operational metrics, non-sensitive configuration, hidden score summaries                                                            | Authenticated staff access, no public API                                                 |
| Confidential      | Mobile number, customer address, Booking history, support conversation, session/device metadata                                     | Encryption, purpose-based access, redacted logging                                        |
| Highly restricted | Verification documents, payout destination, payment/provider metadata, dispute evidence, secrets, signing keys, raw webhook payload | Strong encryption, narrowly scoped access, access audit, private storage, retention limit |

Controls:

- TLS 1.2 or newer for all external and service/database connections; prefer TLS 1.3 where supported.
- Managed encryption at rest for database, backups, logs, queues, and object storage.
- Application-layer envelope encryption for fields whose exposure would create disproportionate
  safety or financial risk, including payout destination and approved identity/document attributes.
- Use a keyed lookup digest for normalized mobile-number equality/uniqueness when the stored value is
  encrypted.
- Keep encryption keys in a managed key/secrets service, separate from encrypted data.
- Version ciphertext/key references so keys can rotate without destructive migration.
- Never store raw OTPs, refresh tokens, card numbers, CVV, UPI PINs, payment credentials, or provider
  secret keys in product tables.

Exact field-encryption scope, key provider, rotation cadence, retention periods, data localization,
consent/notice text, data-principal request process, and deletion/anonymization schedule are
**Decision pending professional privacy/legal and security review**.

## API and Web Application Controls

### Request Handling

- Enable NestJS global validation with an explicit DTO allowlist, transformation, payload-size
  limits, and rejection of unknown fields.
- Treat all identifiers, pagination cursors, sort/filter values, filenames, URLs, and provider
  metadata as untrusted.
- Use Prisma parameterization; reviewed migration SQL and tightly controlled raw queries are the only
  exceptions.
- Prevent mass assignment by mapping DTOs to explicit command objects.
- Enforce idempotency and optimistic concurrency for Booking and financial commands.
- Return stable safe errors and an opaque request id; never return a stack trace in production.

### Browser Boundary

- Allow CORS only from explicit environment-specific web origins; never use wildcard origin with
  credentials.
- Use bearer access tokens for state-changing product APIs.
- Protect cookie-backed refresh/logout flows with `Origin`/`Referer` validation and an approved CSRF
  design.
- Apply a restrictive Content Security Policy using nonces/hashes as required by Next.js.
- Set HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, an allowlisted
  `Permissions-Policy`, and `frame-ancestors`/clickjacking protection.
- Encode untrusted content by default. Sanitization is required for any intentionally rendered rich
  text; Phase 1 should prefer plain text.
- Do not cache authenticated or PII-bearing responses in shared/public caches.

### Abuse and Availability

- Apply separate rate-limit policies to OTP, token refresh, public search, Booking creation, payment,
  upload, review, referral, support, admin, and webhook endpoints.
- Place stricter limits and anomaly alerts on OTP, completion, refund, wallet, payout, and role
  operations.
- Use bounded retries with exponential backoff and jitter for transient providers.
- Use circuit breakers and queues/outbox processing so an SMS, WhatsApp, payment, or payout outage
  does not corrupt authoritative state.
- Exact thresholds, CAPTCHA/device-risk controls, WAF rules, and denial-of-service capacity are
  **Decision pending measured traffic and security review**.

## Payment, Commission, Wallet, and Payout Security

- Use Razorpay's approved client flow so BeautyAtHome servers do not handle raw payment instrument
  data.
- Keep provider secret keys server-side in the environment's secret manager.
- Verify payment/refund webhook signatures over the exact raw request body before parsing into a
  trusted event.
- Deduplicate by provider event id and validate order, Booking, amount, currency, and allowed state.
- Record the verified event durably before asynchronous processing and tolerate duplicate/out-of-order
  delivery.
- Never treat a browser redirect or client callback as payment capture proof.
- Calculate quote, commission, Professional net earning, and refund server-side from versioned rules. Select the commission rule for the quote and freeze its rule/version plus calculation inputs when the `DRAFT` Booking is submitted, before payment or Professional confirmation.
- At verified completion, recognize commission and post earning/hold entries from the frozen snapshot; never recompute historical payout from a newly edited rule.
- Maintain an immutable wallet ledger with atomic reservations and reversals.
- Start the six-hour earning clearance hold only after verified Booking completion. Open disputes,
  approved fraud holds, refunds, or reconciliation failures can block release with an audit event.
- Enforce both requested amount of at least ₹500 and available balance of at least that amount inside the same transaction that reserves a withdrawal.
- Encrypt and mask payout destinations. Destination creation/change requires recent step-up
  authentication and a risk hold where approved.
- Reconcile provider payment, refund, withdrawal, payout, commission, and wallet records regularly.

Exact advance amount, commission rate/slabs, cancellation/refund policy, gateway-fee allocation,
tax treatment, payout provider, payout retry/SLA, reconciliation frequency, and high-value approval
thresholds are **Decision pending provider, finance, tax, legal, operations, and security review**.

## File and Object-Storage Security

- Use private buckets/containers; no verification document or dispute evidence is publicly readable.
- Authorize an upload purpose before issuing a short-lived, single-use signed upload.
- Generate object names server-side; never trust a user filename as a path or content type.
- Restrict size and type by purpose, inspect magic bytes, calculate checksum, and scan for malware.
- Reject executable, HTML, and unsafe active content. Re-encode public portfolio images into approved
  formats and strip metadata such as EXIF location.
- Keep new uploads quarantined until validation/moderation succeeds.
- Serve private downloads through short-lived signed authorization after a fresh role/ownership
  check.
- Prevent bucket listing and cross-tenant object-key guessing.
- Log upload, scan, moderation, access, and deletion actions without logging signed URLs.

Exact file types/sizes, scanner, storage provider, signed-URL lifetime, moderation workflow, and
retention are **Decision pending provider, security, operations, and legal review**.

## Infrastructure and Secrets

- Use separate accounts/projects, databases, buckets, credentials, and signing keys for local, CI,
  staging, and production.
- Keep production PostgreSQL on a private network with TLS, restricted security groups, backups,
  point-in-time recovery, and no public administrative endpoint.
- Give the runtime database user only application privileges. Use a separate controlled migration
  identity.
- Run containers as non-root with minimal images, dropped Linux capabilities, read-only filesystem
  where compatible, resource limits, and regularly rebuilt patched bases.
- Terminate HTTPS at an approved managed edge/load balancer and re-encrypt internal connections where
  supported.
- Store all production secrets in a managed secret store. Do not commit, bake into an image, expose
  through `NEXT_PUBLIC_*`, print, or copy them into support tickets.
- Scope provider credentials to the environment and minimum capability. Rotate on schedule and
  immediately after suspected exposure.
- Restrict production console, database, log, object-store, CI, and deployment access through
  individual accounts, least privilege, strong MFA, and reviewed access logs.

Provider selection, network topology, secrets/key service, access-review cadence, and production recovery objectives are **Decision pending — Architecture, Operations, Security, Privacy, Legal, and provider review**.

## Logging, Audit, Detection, and Response

### Security Logging

Record structured events for:

- OTP request/verification outcomes without code or full destination;
- login, refresh rotation/reuse, logout, session revocation, and role change;
- authorization denial and suspicious enumeration;
- verification submission/review/suspension and document access;
- Booking transition, assignment, cancellation, completion, and override;
- payment/refund webhook verification and state application;
- commission publication/application, wallet adjustment, hold/release, withdrawal and payout;
- support/dispute access and resolution;
- fraud signal, admin step-up, configuration change, export, and secret/key operation.

Logs must include timestamp, environment, service, request/trace id, event code, actor/target opaque
ids, outcome, and safe reason. They must exclude OTPs, tokens, secrets, full mobile numbers, exact
addresses, payout data, document URLs, and unrestricted provider payloads.

### Detection

Alert on OTP floods, repeated challenge failures, refresh-token reuse, unusual role/admin actions,
verification-volume anomalies, webhook signature failures, payment/Booking mismatches, duplicate
financial attempts, ledger reconciliation differences, payout-destination changes, high refund or
withdrawal activity, malware detections, and log/backup failures.

Exact alert thresholds, on-call provider, severity mapping, retention, and response SLA are
**Decision pending operations and security review**.

### Incident Response

The production runbook must cover triage, containment, evidence preservation, credential/key
rotation, provider coordination, affected-user analysis, recovery, reconciliation, notification,
post-incident review, and control follow-up. Notification duties and timelines require professional
legal review; this document is not legal advice.

## Secure Development Lifecycle

Required before production:

1. Protected branches, reviewed pull requests, least-privilege CI, and no direct production changes.
2. Frozen dependencies and reviewed build scripts.
3. Secret scanning, dependency audit, SAST, license policy, and container/IaC scanning in CI.
4. Unit/integration/e2e tests for ownership, roles, redaction, transitions, idempotency, concurrency,
   payment webhooks, and financial invariants.
5. Migration validation against disposable PostgreSQL.
6. Security header/CORS/CSRF automated tests and authenticated cache tests.
7. Provider sandbox contract and failure tests.
8. Pre-launch threat-model review, abuse-case review, and independent penetration test.
9. Remediation SLA and emergency dependency/key rotation process.
10. Restore, reconciliation, incident, and rollback exercises.

## Production Security Release Blockers

Production must not launch until all of the following are demonstrated:

- OTP, JWT, refresh rotation, session revocation, role, ownership, and admin step-up controls;
- purpose-bound completion OTP and audited exception handling;
- strict validation, CORS, CSRF, security headers, request limits, and rate limits;
- private encrypted verification/support storage and safe portfolio processing;
- Razorpay webhook verification, idempotent state handling, immutable wallet ledger, reconciliation,
  payout protection, and dispute holds;
- production secrets/key management, private managed PostgreSQL, encrypted tested backups, runtime
  hardening, monitoring, alerts, and incident runbooks;
- finalized legal/privacy/provider/tax decisions and approved user-facing notices/policies;
- passed security tests with no unresolved critical or high-risk finding.
