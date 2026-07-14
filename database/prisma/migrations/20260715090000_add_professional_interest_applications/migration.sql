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
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "professional_interest_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "professional_interest_applications_reference_key"
  ON "professional_interest_applications"("public_reference_id");

CREATE UNIQUE INDEX "professional_interest_applications_mobile_lookup_key"
  ON "professional_interest_applications"("mobile_number_lookup_hash");

CREATE INDEX "professional_interest_applications_status_created_at_idx"
  ON "professional_interest_applications"("status", "created_at");
