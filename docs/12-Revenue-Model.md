# 12 Revenue Model

## Document Control

- **Status:** Final v1 baseline
- **Scope:** Sikar Phase 1
- **Commercial model:** Managed marketplace funded primarily by dynamic booking commission
- **Currency:** Indian Rupee (INR)
- **Related documents:** `03-PRD.md`, `04-SRS.md`, `05-Tech-Stack.md`, `10-Business-Rules.md`, `13-Operations.md`, and `16-Legal.md`

Rates, taxes, fees, and provider contract terms marked **Decision pending** are deliberately not guessed. A paid production booking must not be enabled until all required financial policies have an approved effective version.

## 1. Revenue Principles

1. Phase 1 validates unit economics through completed home beauty bookings in Sikar.
2. Dynamic commission on completed bookings is the approved primary revenue mechanism.
3. Customer money collected for service delivery is not automatically platform revenue.
4. Revenue, professional earnings, taxes, fees, discounts, refunds, and payouts are separate ledger components.
5. Every financial calculation is deterministic, versioned, reversible through compensating entries, and reproducible from the booking snapshot.
6. A policy change affects future snapshots only; it does not silently recalculate an existing booking.
7. Promotional value is separate from withdrawable professional cash.
8. The platform must not recognize or pay out money that it has not collected, settled, or otherwise become legally obligated to fund.

## 2. Phase 1 Revenue Sources

| Source                                | Phase 1 status                                                        | Recognition rule                                                   |
| ------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Dynamic professional commission       | Active once rates and tax treatment are approved                      | Earned on verified booking completion, net of later reversals      |
| Customer convenience/platform fee     | **Decision pending — Product, Finance, and Legal review**             | Disabled and zero until approved and disclosed                     |
| Cancellation/no-show fee              | **Decision pending — Product, Finance, Operations, and Legal review** | Disabled and zero until an approved customer-facing policy applies |
| Professional subscription/listing fee | Not approved for Phase 1                                              | No charge                                                          |
| Advertising or sponsored ranking      | Not approved for Phase 1                                              | No revenue                                                         |
| Referral/reward breakage              | Not treated as an assumed revenue source                              | Accounting treatment pending Finance review                        |

The absence of an approved secondary source must not be interpreted as permission to charge it.

## 3. Monetary Representation

- Store and calculate all money as signed integer paise with ISO currency code `INR`.
- Floating-point arithmetic is prohibited.
- Percentage rates use integer basis points: `10,000 bps = 100%`.
- Unless a legally required tax rule specifies otherwise, percentage results use half-up rounding to the nearest paise at the individual component level.
- The rounding method and calculation order are recorded in the financial-policy version.
- Customer-visible totals must equal the sum of stored components; display-only recomputation is prohibited.

## 4. Booking Price Formula

For the immutable booking snapshot:

```text
service_subtotal = Σ(unit_price_paise × quantity)
total_discount = platform_funded_discount + professional_funded_discount
pre_tax_customer_amount = max(0, service_subtotal - total_discount)
customer_payable = pre_tax_customer_amount + customer_tax + customer_fee
advance_due = advance_policy(customer_payable)
balance_due = max(0, customer_payable - captured_advance - captured_balance - redeemed_credit)
```

Rules:

- `unit_price_paise` must be within the active catalog limits when snapshotted.
- `quantity` is a positive integer; unsupported quantities must be represented as separate catalog items rather than fractional units.
- `platform_funded_discount` reduces platform economics, not the professional's agreed entitlement, unless the approved campaign explicitly states otherwise.
- `professional_funded_discount` reduces the professional's service entitlement.
- `customer_fee` is zero until an approved fee policy exists.
- `customer_tax`, the taxable base, place/time-of-supply treatment, invoicing party, and rounding are **Decision pending — Indian CA/tax-counsel review**.
- The advance policy may be a percentage, fixed amount, or bounded combination, but its exact value is **Decision pending — Product and Finance approval**.
- No quote may be offered if its active advance policy cannot produce a deterministic `advance_due`.

Razorpay is the selected Phase 1 payment gateway. Gateway credentials, supported instruments, commercial fees, settlement cycle, refunds, webhooks, and merchant obligations are **Decision pending — Finance/Security review of the executed Razorpay contract**.

The PRD requires online advance payment but does not finalize how `balance_due` is collected. Online balance, directly collected balance, or another route is **Decision pending — Product, Finance, Operations, Legal, and payment-provider review**. The system must record the collection source explicitly and must not assume cash handling.

## 5. Dynamic Commission Engine

### 5.1 Rule contents

Every published commission rule contains:

- immutable rule ID and version;
- status and approval metadata;
- effective start and optional end instant;
- matching scope, such as platform, city, service, or professional-service combination;
- priority and specificity;
- percentage rate in basis points;
- optional flat amount in paise;
- commission-base policy ID;
- tax policy ID;
- funding/allocation policy for discounts and adjustments.

Exact rates, flat amounts, approved scopes, and whether taxes are added to or included in commission are **Decision pending — Finance approval with Indian CA/tax-counsel review**.

### 5.2 Rule selection

When the server creates a quote, the engine:

1. selects only approved rules active at the quote instant;
2. removes rules whose city, service, and professional scope do not match;
3. chooses highest configured priority;
4. chooses highest scope specificity;
5. chooses the latest effective start;
6. uses immutable rule ID as the final deterministic tie-breaker.

Publishing validation should reject overlapping rules that reach the tie-breaker. The quote carries the selected rule/version and calculation inputs; submitting the persisted `DRAFT` freezes them in the booking snapshot before advance payment or Professional confirmation. Completion recognizes commission and posts ledger entries from that frozen snapshot. If no rule matches or the quote is no longer valid, the booking cannot leave `DRAFT`.

### 5.3 Commission formula

```text
commission_base = commission_base_policy(booking_snapshot)
percentage_commission = round_half_up(commission_base × commission_rate_bps / 10,000)
commission_before_tax = percentage_commission + commission_flat_paise
commission_tax = tax_policy(commission_before_tax, booking_snapshot)
commission_customer_or_professional_debit = commission_before_tax + recoverable_commission_tax
```

`commission_base_policy` must explicitly define treatment of service tax, each discount type, tips if ever supported, refunds, and balance collected outside the platform. The exact policy is **Decision pending — Finance and Indian CA/tax-counsel review**. Until approved, no commission rule may be activated.

Platform accounting revenue is normally commission before indirect tax, not customer GMV or tax collected; the final recognition policy is **Decision pending — accountant review**.

## 6. Professional Earnings Formula

```text
professional_gross_entitlement = entitlement_policy(booking_snapshot)
professional_net_earning =
    professional_gross_entitlement
  + approved_professional_bonus
  - commission_customer_or_professional_debit
  - professional_tax_withholding
  - professional_funded_discount
  - approved_professional_adjustments
```

- The entitlement policy must reconcile with who invoices the customer and who collects the balance.
- `approved_professional_adjustments` must be itemized; an unclassified manual deduction is prohibited.
- Tax withholding, GST/TCS/TDS applicability, invoice issuer, registration thresholds, and professional reporting are **Decision pending — Indian CA/tax-counsel review**.
- A negative result is recorded as an account receivable/negative balance under an approved recovery policy; it must not be silently clamped or deducted from unrelated funds without contractual authority.
- Recovery order, reserve limits, and negative-balance collection are **Decision pending — Finance and Legal review**.

## 7. Ledger and Recognition Events

The ledger is append-only and double-entry. Each entry includes account, debit/credit amount, currency, booking/payment/payout reference, event ID, policy version, effective time, creation time, and idempotency key.

| Event                            | Required accounting effect                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Advance captured                 | Record cash/gateway receivable and customer service liability; do not yet recognize full GMV as revenue           |
| Booking completed                | Recognize approved commission, professional payable, relevant taxes, discount funding, and fees from the snapshot |
| Booking cancelled                | Reverse or release the applicable customer liability under the snapshotted cancellation policy                    |
| Refund processed                 | Reduce cash/gateway receivable and the allocated liability/revenue/earnings using compensating entries            |
| Dispute opened                   | Place a hold on the disputed payable; do not delete earned entries                                                |
| Dispute resolved                 | Release the hold or post authorized adjustment entries                                                            |
| Payout requested                 | Reserve available professional cash to prevent duplicate withdrawal                                               |
| Payout paid                      | Reduce platform cash and professional payable                                                                     |
| Payout failed/rejected/cancelled | Release the reserved amount unless another hold applies                                                           |
| Chargeback received              | Record chargeback receivable/loss and allocate under the approved chargeback policy                               |

Ledger postings and webhook processing must be idempotent. A duplicate provider event produces no duplicate financial entry.

## 8. Payment Lifecycle

Payment states are:

`CREATED -> PENDING -> CAPTURED`

Alternate terminal or post-capture paths are:

- `CREATED | PENDING -> FAILED`
- `CREATED | PENDING -> CANCELLED`
- `CAPTURED -> PARTIALLY_REFUNDED -> REFUNDED`
- `CAPTURED -> REFUNDED`

Rules:

- Client redirects or screenshots never prove payment; only a verified server-side gateway response or webhook may do so.
- Provider order/payment IDs and idempotency keys must be unique.
- A late capture after booking expiry is quarantined for reconciliation and refund; it must not silently confirm an expired booking.
- `FAILED` and `CANCELLED` payments cannot become `CAPTURED`; a retry creates a new payment attempt.
- Refund processing attempts are separate records so a failed refund does not corrupt the payment's captured amount.
- Payment webhook signature algorithm, replay window, retries, and event retention follow the current Razorpay contract and security specification.

## 9. Clearance and Available Balance

For each eligible professional earning:

```text
clearance_at = completed_at_utc + 6 hours
cleared_credit = earning when now_utc >= clearance_at and no active hold; otherwise 0
available_cash_balance =
    Σ(cleared withdrawable credits)
  - Σ(finalized debits)
  - Σ(active withdrawal reservations)
  - Σ(active financial holds)
```

- Six hours is a minimum clearance hold, not a promise of payout within six hours.
- An `OPEN` or `UNDER_REVIEW` dispute freezes the affected amount even after `clearance_at`.
- Fraud, chargeback, compliance, court, tax, and security holds require scope, reason, owner, and review/expiry time where legally possible.
- Promotional rewards never enter `available_cash_balance`.
- Wallet UI must separately show pending, held, available, reserved-for-payout, paid, and promotional amounts.

## 10. Payouts and Withdrawals

### 10.1 Eligibility

A professional may request withdrawal only when:

- account and verification states allow payout;
- required payout/KYC details are valid;
- `available_cash_balance >= ₹500`;
- requested amount is at least ₹500 and no more than available balance;
- no account-level finance, fraud, compliance, legal, or security hold applies.

The ₹500 test uses the balance at the atomic reservation transaction. Concurrent requests cannot reserve the same funds.

### 10.2 Payout states

`REQUESTED -> UNDER_REVIEW -> PROCESSING -> PAID`

Alternate transitions are:

- `REQUESTED | UNDER_REVIEW -> REJECTED`
- `REQUESTED | UNDER_REVIEW -> CANCELLED`
- `PROCESSING -> FAILED`
- `FAILED -> UNDER_REVIEW | PROCESSING | CANCELLED`

- `PAID` requires provider-confirmed success and a settlement reference.
- `FAILED`, `REJECTED`, or `CANCELLED` releases the reservation only after Finance confirms that no debit or ambiguous provider state remains.
- Retry must reuse the payout obligation but create a new provider attempt and idempotency key.
- Payout rail, beneficiary verification, provider, fee allocation, processing calendar, SLA, retry count, and maker-checker threshold are **Decision pending — Finance, Security, Legal, and provider-contract review**.

## 11. Refunds, Cancellations, and Chargebacks

### 11.1 Refund ceiling

```text
approved_non_refundable_amount = active_policy_amount_or_zero
refundable_amount = max(
  0,
  net_captured_amount - prior_successful_refunds - approved_non_refundable_amount
)
```

- The default `approved_non_refundable_amount` is zero.
- A refund instruction cannot exceed `refundable_amount`.
- Before professional acceptance, assignment failure or customer cancellation returns the captured booking amount under the zero-fee default.
- After confirmation, exact cancellation bands, fees, professional compensation, no-show rules, and service-start treatment are **Decision pending — Product, Operations, Finance, and Legal review**.
- Tax, commission, discount, and professional-earning reversals follow the snapshotted allocation policy and are posted as compensating entries.
- Customer-facing refund timing is **Decision pending — Razorpay contract and Finance/Support SLA review**.

### 11.2 Chargebacks and losses

- A chargeback opens a finance case, freezes unreleased related earnings, and is reconciled to the original payment.
- Liability allocation, evidence submission, provider recovery, platform loss, reserves, and post-payout recovery are **Decision pending — Finance, Fraud, Legal, and Razorpay contract review**.
- A chargeback never causes destructive ledger edits.

## 12. Discounts, Referrals, and Rewards

- Every coupon or reward has an immutable program version, funding owner, eligibility predicate, value, cap, effective period, redemption limit, and accounting code.
- Platform-funded and professional-funded discounts must be separate fields.
- Booking-based referral rewards become eligible only after verified completion and applicable fraud checks.
- Promotional credit is non-cash, non-transferable, and non-withdrawable unless an approved program and legal terms explicitly state otherwise.
- Campaign stacking, referral values, caps, expiry, reversal, GST treatment, unredeemed-credit treatment, and fraud rules are **Decision pending — Growth, Finance, Fraud, and Legal review**.

## 13. Reconciliation and Controls

### 13.1 Daily controls

Finance must reconcile at least daily:

- internal payment attempts against Razorpay orders, payments, captures, refunds, and settlements;
- captured customer amount against booking liabilities;
- completed bookings against commission and professional-payable entries;
- payout attempts against provider status and bank settlement references;
- financial holds, negative balances, chargebacks, and unresolved exceptions;
- ledger control-account totals against subledger totals.

Every mismatch creates a tracked exception with owner, amount, age, and resolution. Financial exceptions are never fixed by deleting records.

### 13.2 Access controls

- Commission and financial-policy publication requires maker-checker approval.
- Refunds, manual credits/debits, payout overrides, and write-offs require scoped permissions and reason codes.
- Exact approval thresholds are **Decision pending — Finance and Security review**.
- Production financial exports must be access-controlled, encrypted, and auditable.

## 14. Unit Economics and Reporting

At minimum, report by day, service, professional, and city:

```text
GMV = Σ(completed booking service value before platform-funded discounts)
gross_commission = Σ(commission_before_tax)
net_commission_revenue = gross_commission - commission reversals
contribution_before_overhead =
    net_commission_revenue
  + approved customer fees before tax
  - platform-funded discounts
  - payment/payout processing cost
  - platform-funded professional incentives
  - refunds, chargebacks, and support compensation borne by platform
take_rate = net_commission_revenue / GMV, when GMV > 0
```

Also track advance capture rate, booking completion rate, refund rate, cancellation rate, chargeback rate, payout failure rate, average order value, repeat booking rate, support cost per completed booking, and contribution per completed booking.

Tax collected, professional payable, and customer deposits are liabilities and must not inflate revenue reporting.

## 15. Pending Decision Register

| Decision                                                                         | Owner/review                           | Required before               |
| -------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------- |
| Commission rates, flat fees, base policy, and scope                              | Finance + Indian CA/tax counsel        | First confirmed booking       |
| GST/TCS/TDS, invoicing party, withholding, and reporting                         | Indian CA/tax counsel                  | Payment launch                |
| Advance formula and balance collection route                                     | Product + Finance + Operations + Legal | Paid booking launch           |
| Razorpay instruments, fees, settlement/refund SLA, webhooks, and contract duties | Finance + Security + Legal             | Gateway production enablement |
| Cancellation fee bands and professional compensation                             | Product + Operations + Finance + Legal | Paid booking launch           |
| Payout provider/rail, KYC, fees, calendar, SLA, and retries                      | Finance + Security + Legal             | First withdrawal              |
| Chargeback and negative-balance recovery                                         | Finance + Fraud + Legal                | Payment launch                |
| Referral/reward economics and accounting                                         | Growth + Finance + Fraud + Legal       | Program activation            |
| Financial approval thresholds and write-off authority                            | Finance + Security                     | Operations launch             |
