CREATE TYPE "professional_experience_band" AS ENUM (
  'LESS_THAN_ONE',
  'ONE_TO_TWO',
  'THREE_TO_FIVE',
  'SIX_PLUS'
);

CREATE TYPE "professional_interest_status" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "professional_interest_applications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_reference_id" UUID NOT NULL,
  "full_name" VARCHAR(100) NOT NULL,
  "mobile_number_ciphertext" TEXT NOT NULL,
  "mobile_number_lookup_hash" CHAR(64) NOT NULL,
  "mobile_number_encryption_key_version" VARCHAR(64) NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "experience_band" "professional_experience_band" NOT NULL,
  "services" JSONB NOT NULL,
  "coverage" VARCHAR(500) NOT NULL,
  "work_summary" VARCHAR(2000) NOT NULL,
  "consented_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "professional_interest_status" NOT NULL DEFAULT 'SUBMITTED',
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "linked_user_id" UUID,
  "decision_reason_code" VARCHAR(80),
  "decision_note" VARCHAR(2000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "professional_interest_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "professional_interest_applications_reviewer_fkey"
    FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "professional_interest_applications_linked_user_fkey"
    FOREIGN KEY ("linked_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "professional_interest_applications_reference_key"
  ON "professional_interest_applications"("public_reference_id");

CREATE UNIQUE INDEX "professional_interest_applications_mobile_lookup_key"
  ON "professional_interest_applications"("mobile_number_lookup_hash");

CREATE INDEX "professional_interest_applications_status_created_at_idx"
  ON "professional_interest_applications"("status", "created_at");

CREATE INDEX "professional_interest_applications_reviewer_idx"
  ON "professional_interest_applications"("reviewed_by_user_id", "reviewed_at");

CREATE INDEX "professional_interest_applications_linked_user_idx"
  ON "professional_interest_applications"("linked_user_id");
