# 16 Legal

## Document Control and Disclaimer

- **Status:** Final v1 legal-readiness specification; not approved legal language
- **Scope:** Sikar, Rajasthan, India, Phase 1
- **Legal review date:** 10 July 2026
- **Related documents:** `01-Vision.md`, `02-BRD.md`, `03-PRD.md`, `04-SRS.md`, `10-Business-Rules.md`, `11-Security.md`, `12-Revenue-Model.md`, and `13-Operations.md`

This document is an engineering and operations compliance checklist, not legal, tax, employment, insurance, or regulatory advice. Every item marked **Decision pending** requires written approval from the named qualified reviewer before the affected production capability launches. Laws, rules, notifications, and provider terms must be rechecked at launch and on a scheduled basis.

## 1. Locked Product Facts for Legal Review

1. BeautyAtHome is a managed marketplace for home beauty services, beginning in Sikar.
2. Supply is limited at launch to verified female independent beauty professionals.
3. Customers are described as women and households; the existing baseline does not restrict customer accounts to women.
4. Customers may select a professional or use best-professional assignment.
5. Guests browse; authenticated customers and professionals use mobile OTP.
6. Customers pay an advance through the selected Phase 1 gateway, Razorpay.
7. The platform manages booking status, dynamic commission, professional earnings, withdrawals, reviews, referrals/rewards, reminders, support, disputes, and hidden risk signals.
8. Professionals set service prices within platform limits and may accept or decline bookings.
9. Completion uses a customer OTP; earnings normally clear after six hours; minimum withdrawal is ₹500.
10. Personal contact details are not directly shared between customer and professional.

These facts are product requirements, not conclusions about marketplace, intermediary, employer, payment-aggregator, tax, or other legal classification.

## 2. Launch Entity and Legal Classification

Before contracting with any customer, professional, or provider, Indian counsel and a chartered accountant must confirm:

- operating legal entity, registered address, authorized signatories, business registrations, bank accounts, and required local/state registrations;
- whether BeautyAtHome is a marketplace e-commerce entity, intermediary, aggregator, principal, agent, or another category for each applicable regime;
- whether the professional or platform supplies/invoices the underlying beauty service;
- whether the platform's assignment, price limits, verification, quality controls, commission, suspension, and payout practices affect independent-contractor, gig/platform-worker, employment, agency, or vicarious-liability analysis;
- Rajasthan/Sikar licensing, shops and establishments, professional/service, municipal, labour, health/sanitation, and consumer requirements;
- the lawful governing law, venue, dispute mechanism, and any mandatory consumer forum rights.

All classifications and registrations are **Decision pending — licensed Indian corporate, consumer, labour, technology, and local counsel plus CA review**.

Product text may call providers “independent professionals,” but contracts and actual operations must support the legally approved relationship. A label alone does not determine classification.

## 3. Required Legal Documents

| Document                                             | Minimum subjects                                                                                                                                                                                                                   | Owner/review                                       | Launch gate                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------ |
| Customer Terms of Use/Service                        | Eligibility, account, marketplace role, booking, prices, advance/balance, completion OTP, cancellation/refund, conduct, reviews, support, liability, disputes                                                                      | Product + Indian consumer/technology counsel       | Before customer account/paid booking |
| Professional Agreement                               | Eligibility, independent relationship, services, pricing limits, acceptance, quality/safety, commission, taxes/invoices, collection, holds, payouts, cancellations, reviews, IP, data, insurance, suspension/termination, disputes | Operations + Finance + labour/consumer/tax counsel | Before professional submission       |
| Privacy Notice                                       | Data categories, purposes, notices, sharing, processors, retention, security, rights, grievance/contact, cross-border processing                                                                                                   | Privacy owner + Indian privacy counsel             | Before any personal-data collection  |
| Cookie/Tracking Notice                               | Essential and optional technologies, consent choice, retention, vendors                                                                                                                                                            | Product + Privacy + counsel                        | Before non-essential tracking        |
| Cancellation, Refund, Reschedule, and No-Show Policy | Actor/status rules, fees, refund amount/route/timing, evidence, exceptions, appeals                                                                                                                                                | Product + Operations + Finance + consumer counsel  | Before paid booking                  |
| Professional Verification Policy                     | Eligibility, evidence, KYC/background checks, decision, correction, appeal, reverification, retention                                                                                                                              | Operations + Privacy + labour/consumer counsel     | Before onboarding                    |
| Community, Review, and Content Policy                | Prohibited content, verified review rules, moderation, appeals, IP licence, reporting                                                                                                                                              | Operations + counsel                               | Before reviews/uploads               |
| Referral, Reward, Coupon, and Reminder Terms         | Qualification, funding, caps, expiry, reversal, tax, abuse, consent/opt-out                                                                                                                                                        | Growth + Finance + Privacy + counsel               | Before program activation            |
| Payout and Wallet Terms                              | Ledger meaning, hold, ₹500 minimum, KYC, fees, timing, failures, negative balances, tax withholding                                                                                                                                | Finance + counsel + provider contract              | Before wallet/withdrawal             |
| Grievance and Escalation Policy                      | Contact, officer if required, acknowledgement, resolution, appeal, regulatory channels                                                                                                                                             | Support + counsel                                  | Before public launch                 |
| Safety and Incident Policy                           | Scope, emergency limitation, reporting, evidence, suspension, insurance, law-enforcement requests                                                                                                                                  | Trust/Safety + counsel + insurer                   | Before first service                 |
| Vendor Terms and Data Processing Agreements          | Security, confidentiality, instructions, location, subprocessors, incidents, deletion, audit, SLA, exit                                                                                                                            | Procurement + Security + Privacy + counsel         | Before production data transfer      |

Exact legal text, acceptance mechanics, translations, version notice, and effective dates are **Decision pending — qualified Indian counsel**. Acceptance evidence must retain document/version ID, user, timestamp, method, and applicable locale.

## 4. Consumer and E-Commerce Compliance

Counsel must assess the Consumer Protection Act, 2019; Consumer Protection (E-Commerce) Rules, 2020 and amendments; dark-pattern rules/guidelines; advertising requirements; and other applicable consumer law.

The production experience must be reviewed for at least:

- clear legal entity and contact/grievance information;
- accurate service, professional, price, tax, advance, balance, discount, fee, availability, and expected-duration disclosures before payment;
- plain distinction between payment acknowledgement, professional acceptance, and confirmed booking;
- material professional information and how “verified,” ratings, and best-professional assignment are defined;
- cancellation, reschedule, no-show, refund, replacement/reassignment, complaint, and expected refund timing;
- no preselected paid extras, hidden charges, false urgency, disguised advertising, obstructive cancellation, misleading ranking, or other dark patterns;
- truthful advertising, promotion, referral, discount, “best,” “verified,” safety, income, and savings claims supported by evidence;
- accessible customer support and preserved complaint records;
- consumer remedies that are not unlawfully waived or restricted.

Exact mandatory disclosures, grievance officer, response timelines, seller/professional disclosures, invoice obligations, and language requirements are **Decision pending — Indian consumer/e-commerce counsel**.

## 5. Professional Eligibility and Female-Only Launch Rule

Female professionals only is a locked launch decision. Before implementation, counsel must approve:

- lawful rationale and wording for the eligibility rule;
- how eligibility is declared or evidenced without disproportionate collection of sensitive personal data;
- treatment of transgender and gender-diverse applicants under applicable law;
- reviewer training, correction, appeal, and discrimination/harassment safeguards;
- retention, access, and deletion of any supporting evidence;
- consistency between public claims, onboarding, contracts, and actual enforcement.

The precise rule, evidence, adjudication, and appeal process are **Decision pending — Indian constitutional/employment/consumer/privacy counsel and qualified inclusion review**. The product must not infer eligibility from name, photo, voice, or automated scoring.

Customer eligibility, minimum ages, minors acting through households, and consent/contract capacity are also **Decision pending — Indian consumer and privacy counsel**. No professional onboarding of minors or minor-specific customer flow should launch without an approved policy.

## 6. Professional Relationship, Work, and Social Protection

The Professional Agreement and operating practice must address:

- freedom to set availability, select permitted services, price within limits, and accept/decline requests;
- platform assignment, conduct, quality, cancellation, ranking, suspension, and fraud controls;
- ownership/provision of products, tools, travel, uniforms/branding if any, and expenses;
- professional qualifications, taxes, invoices, insurance, licences, health/sanitation, and legal compliance;
- commission, customer collections, wallet, holds, refunds, chargebacks, negative balances, and payouts;
- safety, harassment, discrimination, complaints, investigation, and appeal;
- termination and effect on bookings, balances, data, and legal records.

Counsel must review the current central and Rajasthan labour/social-security framework, including any rules or schemes applicable to gig/platform workers and aggregators at launch. Classification, registration, contributions, benefits, welfare obligations, worker notices, and reporting are **Decision pending — Indian labour counsel and CA review**.

## 7. Privacy and Personal Data

Counsel must map the Digital Personal Data Protection Act, 2023, the Digital Personal Data Protection Rules, 2025, commencement notifications, the Information Technology Act/rules, and other applicable privacy requirements to the launch date and entity.

### 7.1 Data inventory

At minimum, the record of processing must cover:

| Data subject        | Data categories                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest               | Device/network data, essential security logs, consent choices, browsing data where enabled                                                                              |
| Customer            | Mobile number, profile, address/service location, booking history, OTP/security events, payments/references, reviews, referrals/rewards, support/safety evidence        |
| Professional        | Customer data plus profile, portfolio, verification/KYC evidence, availability, services/prices, earnings, payout beneficiary, tax data, ratings, internal risk signals |
| Admin/support staff | Identity, role, authentication, audit actions, support communications, employment/contract data outside product scope                                                   |

For every field, document purpose, lawful ground, source, notice, required/optional status, access roles, processor, storage location, transfer, retention, deletion, and legal hold.

### 7.2 Consent and notice rules

- OTP authentication is not marketing consent.
- Terms acceptance is not blanket consent for optional tracking, marketing, referral outreach, or reminders.
- Consent requests must be specific, informed, affirmative, recorded, withdrawable, and no harder to withdraw than to give, as legally required.
- WhatsApp, SMS, rebooking reminders, promotions, analytics, and portfolio/public profile processing require separate purpose and consent/other lawful-ground review.
- A denied or withdrawn optional consent must not block unrelated core service.
- Privacy notices must be available before or at collection in legally required language/form.

Exact lawful grounds, consent-manager obligations, notice content/languages, legitimate uses, withdrawal behavior, and records are **Decision pending — Indian privacy counsel**.

### 7.3 Rights and grievances

The platform must support an authenticated workflow for applicable access/summary, correction, completion, erasure, consent withdrawal, nomination, and grievance rights. The workflow records request, identity verification, scope, decision, actions, legal exception, response, and appeal/escalation.

Identity-verification method, response deadlines, Data Protection Officer/contact or Significant Data Fiduciary obligations, nomination process, and regulatory escalation are **Decision pending — Indian privacy counsel based on current notifications and designation**.

### 7.4 Children and vulnerable people

The platform must not assume that an OTP holder is an adult. Child definition, verifiable parental consent, age assurance, restrictions on tracking/targeting, household booking, and safety controls are **Decision pending — Indian privacy/consumer counsel**. Until approved, no child-directed experience or behavioral advertising may be launched.

### 7.5 Retention and deletion

- Use category-specific retention; “keep forever” is prohibited.
- Preserve only scoped records under a documented legal, dispute, tax, fraud, safety, or chargeback hold.
- Delete or irreversibly anonymize expired data across production, search, analytics, exports, and provider systems subject to backup procedure.
- Financial/audit, tax, contract, support, safety, KYC, OTP/security, and marketing-consent records may require different periods.

Exact retention periods, backup expiry, legal-hold authority, and deletion evidence are **Decision pending — privacy counsel, CA/tax adviser, Security, and Operations**.

## 8. Security and Cyber-Incident Legal Duties

Technical controls are defined in `11-Security.md`. Legal/Compliance must separately determine:

- applicability of CERT-In directions and current incident-reporting timelines/categories;
- log/time-synchronization and retention requirements;
- regulator, affected-user, provider, insurer, law-enforcement, and contractual notification duties;
- preservation, privilege, forensic access, and chain of custody;
- contact registration or point-of-contact obligations;
- cross-border incident and processor coordination.

No document should hard-code a statutory reporting deadline until counsel verifies the current rule and applicability. Incident decisions must record discovery time, facts known, decision owner, notifications, and evidence.

## 9. Marketplace Content, Reviews, and Intermediary Duties

Customer reviews, professional profiles, portfolio images, descriptions, and support attachments are user/provider content. Before launch, counsel must determine whether and how intermediary due-diligence rules apply.

The approved policy and tooling must cover:

- ownership and a limited licence necessary to host/display content;
- permission/model release for people shown in portfolio media;
- prohibited unlawful, infringing, deceptive, abusive, discriminatory, explicit, dangerous, or privacy-invasive content;
- verified-booking review labeling and prohibition on purchased/coerced reviews;
- reporting, notice-and-action, preservation, counter-notice/appeal, repeat abuse, and lawful government/court requests;
- moderation logs and restricted access to removed content;
- grievance contact and timelines where legally required.

Intermediary classification, due-diligence procedure, takedown deadlines, grievance/appellate obligations, and retention are **Decision pending — Indian technology/intermediary counsel**.

## 10. Payments, Wallet, and Payout Legal Review

Razorpay is the selected gateway. BeautyAtHome must use a duly approved provider configuration and must not operate an unlicensed payment aggregation, escrow, stored-value, prepaid-instrument, lending, remittance, or banking product.

Counsel, Finance, and the provider must approve:

- merchant and marketplace onboarding structure;
- which party collects customer advance and balance and which party receives settlement;
- gateway/payment-aggregator authorization and current contract scope;
- settlement, nodal/escrow, split/route, refund, chargeback, reserve, payout, and KYC responsibilities;
- whether the displayed “wallet” is only an internal ledger/earnings view and how to prevent it being represented as customer stored value;
- beneficiary verification, payout instruction, failed/ambiguous payout, unclaimed amount, death/incapacity, and fraud holds;
- PCI responsibilities and prohibition on BeautyAtHome storing raw card credentials;
- customer/provider terms, fees, timing, complaint escalation, and data sharing.

All payment-provider terms, gateway fees, settlement/refund/payout timelines, reserves, chargeback liability, and wallet wording are **Decision pending — RBI/payments counsel, Finance, Security, and executed Razorpay/provider contracts**.

## 11. Tax, Invoice, and Accounting Review

An Indian chartered accountant and tax counsel must decide:

- GST registrations and place/time/value of supply for platform and beauty service;
- whether the platform or professional invoices each component;
- GST on commission, fees, discounts, cancellation amounts, advances, refunds, and professional services;
- e-commerce operator TCS and any category-specific tax-payment obligation;
- income-tax e-commerce withholding/TDS and professional reporting;
- professional PAN/GSTIN and invoice requirements/thresholds;
- withholding certificates, statements/returns, credit notes, reconciliation, and record retention;
- state/local levies and treatment of referral/reward value.

Exact rates, thresholds, HSN/SAC, TCS/TDS/GST responsibility, invoice format, and filing calendar are **Decision pending — Indian CA and tax counsel**. Tax amounts must come from an approved, effective tax-policy version, not source-code constants.

## 12. Safety, Quality, Products, and Insurance

Home beauty service creates bodily injury, allergy, infection, harassment, property, travel, and product risks. Before first service, qualified advisers must approve:

- professional qualification/experience and sanitation standards;
- prohibited/high-risk services and contraindication/allergy consultation;
- product authenticity, labeling, expiry, storage, patch-test, disposal, and responsibility for supplies;
- customer home/site safety expectations and professional right to leave unsafe conditions;
- anti-harassment, discrimination, boundary, lone-worker, and emergency protocols;
- incident reporting, evidence, medical/police referral, suspension, investigation, and appeal;
- customer and professional waivers/acknowledgements that do not unlawfully exclude liability;
- public/product/professional liability, accident, cyber, crime, and other insurance.

Exact service standards, forms, training, exclusions, insurance type/limits, claims flow, and liability allocation are **Decision pending — Indian consumer/tort counsel, qualified beauty-service safety specialist, and insurer/broker**.

The platform must not publish “safe,” “guaranteed,” “background checked,” “certified,” or similar claims beyond the exact approved verification and insurance controls.

## 13. Communications, WhatsApp, SMS, and Marketing

- OTP, booking updates, support, reminders, and promotions are distinct communication purposes.
- Sender registration, message templates, headers, consent/preferences, opt-out, frequency, quiet hours, suppression, and complaint handling must comply with current telecom rules and provider policies.
- WhatsApp support conversations must create/attach to the platform ticket; WhatsApp is not the sole legal record.
- Marketing consent must not be bundled with core booking or support.
- Referral invitations must not enable address-book scraping or unsolicited bulk messages.

Exact classification of transactional/service/promotional messages, DLT or sender requirements, consent evidence, template approval, opt-out wording, and retention are **Decision pending — Indian telecom/privacy counsel and SMS/WhatsApp provider review**.

## 14. Intellectual Property and Brand

Before public launch:

- clear the BeautyAtHome name, logos, domain, and visual assets; decide trademark filings;
- obtain licences for fonts, icons, photographs, code, service descriptions, and marketing assets;
- require professionals to own or have permission for portfolio images and depicted persons;
- define platform/customer/professional ownership and limited content licences;
- maintain open-source notices and comply with dependency licences;
- establish infringement reporting, takedown, counter-notice/appeal, and repeat-infringer procedure where applicable.

Trademark clearance/registration, content licence text, release forms, and infringement procedure are **Decision pending — Indian IP counsel**.

## 15. Complaints, Disputes, and Lawful Requests

- WhatsApp and tickets feed one canonical support record.
- Customer/professional disputes follow `13-Operations.md` without limiting statutory remedies.
- Contractual internal resolution does not remove mandatory consumer, privacy, labour, regulator, police, or court rights.
- Government/law-enforcement requests require identity/authority validation, scope review, Legal approval unless emergency law provides otherwise, minimum necessary disclosure, and audit record.
- Preserve affected records under a scoped legal hold and challenge or notify where lawful and appropriate.

Grievance officer/contact, acknowledgement/resolution periods, appellate route, arbitration/mediation clauses, jurisdiction, law-enforcement playbook, and transparency reporting are **Decision pending — Indian counsel**.

## 16. Vendor and Provider Contract Controls

Production onboarding for Vercel/equivalent hosting, managed Node hosting, PostgreSQL hosting, object storage, Razorpay, SMS/OTP, WhatsApp, email if introduced, analytics, monitoring, and support tools requires:

- legal entity and service scope;
- security/privacy due diligence and data-flow record;
- confidentiality, data-processing instructions, subprocessors, location/transfer, retention/deletion, and audit rights;
- uptime/support, incident notification, recovery, backup, export, termination, and migration;
- regulatory cooperation, lawful requests, intellectual property, indemnity, liability, and insurance;
- fees, taxes, settlement where relevant, renewal, suspension, and exit assistance.

Exact providers other than the documented Razorpay selection, data regions, service tiers, contract clauses, subprocessors, and fallbacks are **Decision pending — Procurement, Security, Privacy, Finance, and Indian counsel**.

## 17. Legal Change Management

1. Legal/Compliance maintains an obligations register with source, applicability decision, owner, control, evidence, review date, and change status.
2. Review occurs before launch, before entering a new city/category, before a new provider/payment flow, and after relevant legal or regulatory change.
3. Changed terms/policies receive a new version and effective date; material changes use approved notice and renewed acceptance/consent where required.
4. Booking snapshots retain applicable commercial policy versions.
5. Training, UI copy, support scripts, contracts, and technical controls must be updated together.
6. Legal exceptions must be documented, time-bound where possible, and approved by authorized counsel/company leadership.

## 18. Official Regulatory Reference Points

These official sources were checked on 10 July 2026 as issue-spotting references. They do not establish applicability or replace professional advice.

- [Digital Personal Data Protection Act, 2023 — MeitY](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
- [Digital Personal Data Protection Rules, 2025 — MeitY](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025686cadad39.pdf)
- [Consumer Protection Act and E-Commerce Rules — Department of Consumer Affairs](https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection)
- [IT Act notifications and Intermediary Rules — MeitY](https://www.meity.gov.in/documents/orders-and-notices/notifications-on-information-technology-act-2000-its-rules-AOzATOtQWa)
- [Cyber Security Directions under IT Act section 70B — CERT-In](https://cert-in.org.in/Directions70B.jsp)
- [Payment Aggregator and Payment Gateway guidance — Reserve Bank of India](https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=11996)
- [GSTR-8 e-commerce operator FAQ — GST Portal](https://tutorial.gst.gov.in/userguide/returns/FAQs_GSTR-8.htm)
- [Labour Codes, rules, notifications, and FAQs — Ministry of Labour & Employment](https://www.labour.gov.in/offerings/schemes-and-services/details/labour-codes-gzNzQzMtQWa)

Counsel must use current gazette notifications, amendments, commencement provisions, Rajasthan/local rules, binding decisions, and facts of the final operating model.

## 19. Legal Launch Gate

No public paid-service launch should proceed until authorized leadership has evidence of:

- operating entity and registration approval;
- signed-off customer terms, professional agreement, privacy/cookie notices, cancellation/refund, verification, wallet/payout, content, referral/reward, grievance, and safety policies;
- approved female-professional eligibility and KYC/background-check process;
- approved consumer disclosures and grievance mechanism;
- current privacy data map, consent/notice design, rights process, retention schedule, and vendor DPAs;
- Razorpay/payment and payout structure approved by counsel, Finance, Security, and providers;
- CA-approved GST/TCS/TDS, invoice, withholding, and accounting treatment;
- labour/gig/platform-worker classification and obligations reviewed;
- safety standards, incident procedure, training, and insurance decision;
- telecom/WhatsApp/SMS consent, sender, template, and opt-out compliance;
- security incident legal response and lawful-request runbooks;
- IP clearance and provider contracts;
- named owners, approval records, next review dates, and a process to stop launch if an approval is missing.

## 20. Pending Decision Register

| Decision                                                                       | Owner/review                                                                 | Required before              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------- |
| Entity, registrations, marketplace/intermediary/aggregator classification      | Indian corporate, consumer, technology, local counsel + CA                   | Any public contracting       |
| Customer and professional legal terms                                          | Indian consumer, labour, technology, tax counsel                             | Account/onboarding launch    |
| Female-professional eligibility evidence and appeal                            | Indian constitutional/employment/consumer/privacy counsel + inclusion review | Professional onboarding      |
| KYC, background checks, qualifications, and reverification                     | Legal/Compliance + Operations + payment provider                             | Professional approval/payout |
| Privacy notices, consent, rights, retention, minors, transfers, DPAs           | Indian privacy counsel + Security                                            | Personal-data processing     |
| Consumer disclosures, cancellation/refund, grievance, ranking claims           | Indian consumer/e-commerce counsel                                           | Paid booking launch          |
| Gig/platform-worker, labour, social-security, and insurance duties             | Indian labour counsel + CA + insurer                                         | First professional service   |
| Razorpay/payment, wallet, collection, settlement, payout, chargeback structure | RBI/payments counsel + Finance + Security + provider                         | Production payments/payouts  |
| GST/TCS/TDS, invoice, tax rates, returns, and retention                        | Indian CA + tax counsel                                                      | First transaction            |
| Safety standards, restricted services, incident response, liability, insurance | Consumer/tort counsel + safety specialist + insurer                          | First service                |
| Reviews/content/intermediary procedure and IP                                  | Technology/intermediary/IP counsel                                           | Profile/review uploads       |
| SMS/WhatsApp/marketing consent, sender registration, templates, opt-out        | Telecom/privacy counsel + providers                                          | Production messaging         |
| Grievance officers, statutory timelines, disputes, lawful requests             | Indian counsel                                                               | Public launch                |
| Governing law, venue, arbitration/mediation, and mandatory consumer remedies   | Indian counsel                                                               | Terms publication            |
