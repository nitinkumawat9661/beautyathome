-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_user_id" UUID NOT NULL,
    "service_area_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "recipient_name" VARCHAR(120) NOT NULL,
    "encrypted_address" TEXT NOT NULL,
    "address_key_version" VARCHAR(40) NOT NULL,
    "masked_address" VARCHAR(250) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_addresses_customer_deleted_idx" ON "customer_addresses"("customer_user_id", "deleted_at");
CREATE INDEX "customer_addresses_area_deleted_idx" ON "customer_addresses"("service_area_id", "deleted_at");

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'REQUESTED', 'ACCEPTED', 'REJECTED', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'START_OTP_PENDING', 'IN_PROGRESS', 'COMPLETION_OTP_PENDING', 'COMPLETED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "assignment_mode" AS ENUM ('SELECTED_PROFESSIONAL', 'BEST_AVAILABLE');

-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('CREATED', 'PENDING', 'CAPTURED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "payment_attempt_status" AS ENUM ('CREATED', 'SUCCEEDED', 'FAILED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "wallet_entry_direction" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "wallet_entry_state" AS ENUM ('PENDING', 'AVAILABLE', 'RESERVED', 'SETTLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "withdrawal_status" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payout_account_status" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "service_otp_purpose" AS ENUM ('START', 'COMPLETION');

-- CreateEnum
CREATE TYPE "service_otp_status" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'LOCKED', 'REVOKED');

-- CreateEnum
CREATE TYPE "review_moderation_status" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "reminder_status" AS ENUM ('SCHEDULED', 'SENT', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_user_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "service_area_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "selected_professional_id" UUID,
    "assigned_professional_id" UUID,
    "assignment_mode" "assignment_mode" NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "service_price_paise" BIGINT NOT NULL,
    "platform_fee_paise" BIGINT NOT NULL DEFAULT 0,
    "discount_paise" BIGINT NOT NULL DEFAULT 0,
    "reward_paise" BIGINT NOT NULL DEFAULT 0,
    "tax_paise" BIGINT NOT NULL DEFAULT 0,
    "total_paise" BIGINT NOT NULL,
    "advance_paise" BIGINT NOT NULL,
    "remaining_paise" BIGINT NOT NULL,
    "service_name_snapshot" VARCHAR(120) NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "scheduled_start" TIMESTAMPTZ(3) NOT NULL,
    "scheduled_end" TIMESTAMPTZ(3) NOT NULL,
    "quote_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancellation_reason_code" VARCHAR(80),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "from_status" "booking_status",
    "to_status" "booking_status" NOT NULL,
    "actor_user_id" UUID,
    "actor_role" "role",
    "reason_code" VARCHAR(80) NOT NULL,
    "reason" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "score_snapshot" JSONB NOT NULL,
    "status" "assignment_status" NOT NULL DEFAULT 'OFFERED',
    "offered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "responded_at" TIMESTAMPTZ(3),
    "decline_reason_code" VARCHAR(80),

    CONSTRAINT "booking_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_order_id" VARCHAR(200),
    "provider_payment_id" VARCHAR(200),
    "amount_paise" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "payment_status" NOT NULL DEFAULT 'CREATED',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "captured_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "status" "payment_attempt_status" NOT NULL,
    "provider_reference" VARCHAR(200),
    "failure_code" VARCHAR(100),
    "failure_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(40) NOT NULL,
    "provider_event_id" VARCHAR(200) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "processed_at" TIMESTAMPTZ(3),
    "failure_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "policy_version" VARCHAR(80) NOT NULL,
    "refund_basis_points" INTEGER NOT NULL,
    "reason_code" VARCHAR(80) NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'REQUESTED',
    "provider_refund_id" VARCHAR(200),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "level" VARCHAR(50),
    "package_code" VARCHAR(80),
    "minimum_completed_jobs" INTEGER,
    "category_id" UUID,
    "city_id" UUID,
    "promotional_override" BOOLEAN NOT NULL DEFAULT false,
    "rate_basis_points" INTEGER NOT NULL,
    "fixed_fee_paise" BIGINT NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "effective_to" TIMESTAMPTZ(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "calculation_snapshot" JSONB NOT NULL,
    "gross_paise" BIGINT NOT NULL,
    "commission_paise" BIGINT NOT NULL,
    "net_paise" BIGINT NOT NULL,
    "recognized_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "booking_id" UUID,
    "withdrawal_id" UUID,
    "reversal_of_entry_id" UUID,
    "entry_type" VARCHAR(60) NOT NULL,
    "direction" "wallet_entry_direction" NOT NULL,
    "state" "wallet_entry_state" NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "available_at" TIMESTAMPTZ(3),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "encrypted_details" TEXT NOT NULL,
    "details_key_version" VARCHAR(40) NOT NULL,
    "masked_label" VARCHAR(100) NOT NULL,
    "beneficiary_reference" VARCHAR(200),
    "status" "payout_account_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "payout_account_id" UUID NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "withdrawal_status" NOT NULL DEFAULT 'REQUESTED',
    "destination_snapshot" JSONB NOT NULL,
    "provider_payout_id" VARCHAR(200),
    "failure_code" VARCHAR(100),
    "internal_note" VARCHAR(2000),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),
    "settled_at" TIMESTAMPTZ(3),

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "purpose" "service_otp_purpose" NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "status" "service_otp_status" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "regenerated_from_id" UUID,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "customer_user_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(2000),
    "moderation_status" "review_moderation_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebooking_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "customer_user_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "remind_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "reminder_status" NOT NULL DEFAULT 'SCHEDULED',
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebooking_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotency_key" ON "bookings"("idempotency_key");

-- CreateIndex
CREATE INDEX "bookings_customer_created_idx" ON "bookings"("customer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_professional_schedule_idx" ON "bookings"("assigned_professional_id", "status", "scheduled_start");

-- CreateIndex
CREATE INDEX "bookings_slot_status_idx" ON "bookings"("slot_id", "status");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_created_idx" ON "booking_status_history"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_assignments_professional_status_idx" ON "booking_assignments"("professional_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_assignments_booking_professional_key" ON "booking_assignments"("booking_id", "professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_order_key" ON "payments"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_booking_status_idx" ON "payments"("booking_id", "status");

-- CreateIndex
CREATE INDEX "payment_attempts_payment_created_idx" ON "payment_attempts"("payment_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhooks_provider_event_key" ON "payment_webhook_events"("provider", "provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_key" ON "refunds"("provider_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotency_key" ON "refunds"("idempotency_key");

-- CreateIndex
CREATE INDEX "refunds_booking_status_idx" ON "refunds"("booking_id", "status");

-- CreateIndex
CREATE INDEX "commission_rules_match_idx" ON "commission_rules"("city_id", "category_id", "active", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "booking_commissions_booking_key" ON "booking_commissions"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_professional_key" ON "wallet_accounts"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_entries_idempotency_key" ON "wallet_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "wallet_entries_wallet_state_available_idx" ON "wallet_ledger_entries"("wallet_id", "state", "available_at");

-- CreateIndex
CREATE INDEX "wallet_entries_booking_created_idx" ON "wallet_ledger_entries"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "payout_accounts_professional_status_idx" ON "payout_accounts"("professional_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_provider_payout_key" ON "withdrawals"("provider_payout_id");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_idempotency_key" ON "withdrawals"("idempotency_key");

-- CreateIndex
CREATE INDEX "withdrawals_status_requested_idx" ON "withdrawals"("status", "requested_at");

-- CreateIndex
CREATE INDEX "service_otps_booking_purpose_status_idx" ON "service_otp_challenges"("booking_id", "purpose", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_professional_status_created_idx" ON "reviews"("professional_id", "moderation_status", "created_at");

-- CreateIndex
CREATE INDEX "rebooking_reminders_status_time_idx" ON "rebooking_reminders"("status", "remind_at");

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "commission_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_reversal_of_entry_id_fkey" FOREIGN KEY ("reversal_of_entry_id") REFERENCES "wallet_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_payout_account_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "payout_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_otp_challenges" ADD CONSTRAINT "service_otp_challenges_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebooking_reminders" ADD CONSTRAINT "rebooking_reminders_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reviewed manual invariants that Prisma cannot express in the schema DSL.
-- A marketplace slot can back only one live booking lifecycle at a time.
CREATE UNIQUE INDEX "bookings_active_slot_key"
ON "bookings" ("slot_id")
WHERE "status" IN (
  'PAYMENT_PENDING', 'REQUESTED', 'ACCEPTED', 'CONFIRMED', 'EN_ROUTE',
  'ARRIVED', 'START_OTP_PENDING', 'IN_PROGRESS', 'COMPLETION_OTP_PENDING'
);

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_money_nonnegative_check"
CHECK (
  "service_price_paise" >= 0 AND "platform_fee_paise" >= 0 AND
  "discount_paise" >= 0 AND "reward_paise" >= 0 AND "tax_paise" >= 0 AND
  "total_paise" >= 0 AND "advance_paise" >= 0 AND "remaining_paise" >= 0
);
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_rate_check"
CHECK ("rate_basis_points" BETWEEN 0 AND 10000 AND "fixed_fee_paise" >= 0);
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_money_check"
CHECK (
  "gross_paise" >= 0 AND "commission_paise" >= 0 AND "net_paise" >= 0 AND
  "commission_paise" + "net_paise" = "gross_paise"
);
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_entries_positive_amount_check"
CHECK ("amount_paise" > 0);
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_minimum_amount_check"
CHECK ("amount_paise" >= 50000);
