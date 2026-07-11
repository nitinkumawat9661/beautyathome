-- BeautyAtHome Feature Phase 1 authentication and profile foundation.
-- This migration was generated from schema.prisma with Prisma 7.8.0, then
-- reviewed and extended with PostgreSQL constraints Prisma cannot express.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('CUSTOMER', 'PROFESSIONAL', 'ADMIN', 'SUPPORT', 'FINANCE');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "otp_purpose" AS ENUM ('SIGN_IN', 'SIGN_UP', 'STEP_UP');

-- CreateEnum
CREATE TYPE "otp_status" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED', 'LOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "session_revocation_reason" AS ENUM ('LOGOUT', 'LOGOUT_ALL', 'TOKEN_REUSE', 'ACCOUNT_STATUS_CHANGED', 'ROLE_CHANGED', 'ADMINISTRATIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mobile_number_ciphertext" TEXT NOT NULL,
    "mobile_number_lookup_hash" CHAR(64) NOT NULL,
    "mobile_number_encryption_key_version" VARCHAR(64) NOT NULL,
    "mobile_verified_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_mobile_ciphertext_not_empty_check" CHECK (length("mobile_number_ciphertext") > 0),
    CONSTRAINT "users_mobile_lookup_hash_format_check" CHECK ("mobile_number_lookup_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "users_mobile_key_version_not_empty_check" CHECK (length(btrim("mobile_number_encryption_key_version")) > 0)
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role" "role" NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_profiles_display_name_not_blank_check" CHECK ("display_name" IS NULL OR length(btrim("display_name")) > 0)
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(100),
    "biography" VARCHAR(1000),
    "experience_years" INTEGER,
    "verification_status" "verification_status" NOT NULL DEFAULT 'DRAFT',
    "is_service_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "professional_profiles_display_name_not_blank_check" CHECK ("display_name" IS NULL OR length(btrim("display_name")) > 0),
    CONSTRAINT "professional_profiles_biography_not_blank_check" CHECK ("biography" IS NULL OR length(btrim("biography")) > 0),
    CONSTRAINT "professional_profiles_experience_years_check" CHECK ("experience_years" IS NULL OR "experience_years" >= 0),
    CONSTRAINT "professional_profiles_service_requires_approval_check" CHECK (NOT "is_service_active" OR "verification_status" = 'APPROVED')
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_profiles_display_name_not_blank_check" CHECK ("display_name" IS NULL OR length(btrim("display_name")) > 0)
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "purpose" "otp_purpose" NOT NULL,
    "requested_role" "role" NOT NULL,
    "status" "otp_status" NOT NULL DEFAULT 'PENDING',
    "destination_lookup_hash" CHAR(64) NOT NULL,
    "code_digest" CHAR(64) NOT NULL,
    "provider_reference" VARCHAR(255),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL,
    "request_ip_hash" CHAR(64),
    "device_fingerprint_hash" CHAR(64),
    "user_agent_hash" CHAR(64),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "last_attempt_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "otp_challenges_destination_hash_format_check" CHECK ("destination_lookup_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "otp_challenges_code_digest_format_check" CHECK ("code_digest" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "otp_challenges_attempt_budget_check" CHECK ("max_attempts" > 0 AND "attempt_count" >= 0 AND "attempt_count" <= "max_attempts"),
    CONSTRAINT "otp_challenges_expiry_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "otp_challenges_last_attempt_check" CHECK ("last_attempt_at" IS NULL OR "last_attempt_at" >= "created_at"),
    CONSTRAINT "otp_challenges_consumed_state_check" CHECK (("status" = 'CONSUMED') = ("consumed_at" IS NOT NULL)),
    CONSTRAINT "otp_challenges_locked_state_check" CHECK ("status" <> 'LOCKED' OR "attempt_count" = "max_attempts"),
    CONSTRAINT "otp_challenges_public_signup_role_check" CHECK ("purpose" <> 'SIGN_UP' OR "requested_role" IN ('CUSTOMER', 'PROFESSIONAL'))
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "active_role" "role" NOT NULL,
    "previous_session_id" UUID,
    "refresh_token_hash" CHAR(64) NOT NULL,
    "device_fingerprint_hash" CHAR(64),
    "device_name" VARCHAR(120),
    "user_agent_hash" CHAR(64),
    "created_ip_hash" CHAR(64),
    "last_ip_hash" CHAR(64),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3),
    "last_step_up_at" TIMESTAMPTZ(3),
    "rotated_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" "session_revocation_reason",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_sessions_refresh_hash_format_check" CHECK ("refresh_token_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "auth_sessions_previous_not_self_check" CHECK ("previous_session_id" IS NULL OR "previous_session_id" <> "id"),
    CONSTRAINT "auth_sessions_expiry_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "auth_sessions_last_used_check" CHECK ("last_used_at" IS NULL OR "last_used_at" >= "created_at"),
    CONSTRAINT "auth_sessions_rotated_at_check" CHECK ("rotated_at" IS NULL OR "rotated_at" >= "created_at"),
    CONSTRAINT "auth_sessions_revoked_at_check" CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at"),
    CONSTRAINT "auth_sessions_revocation_reason_check" CHECK (("revoked_at" IS NULL) = ("revocation_reason" IS NULL))
);

-- CreateIndex
CREATE INDEX "users_mobile_number_lookup_hash_idx" ON "users"("mobile_number_lookup_hash");

-- A closed/deleted identity does not reserve its mobile lookup forever. Any
-- reuse workflow still requires the application-level legal/retention policy.
CREATE UNIQUE INDEX "users_mobile_number_active_key"
ON "users"("mobile_number_lookup_hash")
WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "users_status_deleted_at_idx" ON "users"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "user_roles_role_granted_at_idx" ON "user_roles"("role", "granted_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_user_id_key" ON "professional_profiles"("user_id");

-- CreateIndex
CREATE INDEX "professional_profiles_discovery_status_idx" ON "professional_profiles"("verification_status", "is_service_active");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_user_id_key" ON "admin_profiles"("user_id");

-- CreateIndex
CREATE INDEX "otp_challenges_context_idx" ON "otp_challenges"("destination_lookup_hash", "purpose", "requested_role", "status", "created_at");

-- CreateIndex
CREATE INDEX "otp_challenges_user_created_at_idx" ON "otp_challenges"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "otp_challenges_status_expires_at_idx" ON "otp_challenges"("status", "expires_at");

-- CreateIndex
CREATE INDEX "otp_challenges_provider_reference_idx" ON "otp_challenges"("provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_previous_session_id_key" ON "auth_sessions"("previous_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_active_idx" ON "auth_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_family_created_at_idx" ON "auth_sessions"("family_id", "created_at");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- A refresh family is a single linear chain with one root and no more than one
-- current generation. Rotation must update the previous row and insert its
-- replacement in the same transaction.
CREATE UNIQUE INDEX "auth_sessions_one_root_per_family_key"
ON "auth_sessions"("family_id")
WHERE "previous_session_id" IS NULL;

CREATE UNIQUE INDEX "auth_sessions_one_current_generation_per_family_key"
ON "auth_sessions"("family_id")
WHERE "rotated_at" IS NULL AND "revoked_at" IS NULL;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_previous_session_id_fkey" FOREIGN KEY ("previous_session_id") REFERENCES "auth_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
