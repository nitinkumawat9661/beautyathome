-- BeautyAtHome services and Professional marketplace foundation.
-- Generated with Prisma 7.8.0 `migrate diff` from the committed authentication
-- schema to the marketplace schema. The final reviewed block contains only
-- PostgreSQL constraints Prisma cannot express: check constraints, partial
-- unique indexes, GiST exclusion constraints, and append-only triggers.

-- CreateEnum
CREATE TYPE "city_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "service_area_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "service_category_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "master_service_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "service_city_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "price_policy_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "media_moderation_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "professional_service_state" AS ENUM ('ENABLED', 'DISABLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "service_request_status" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "launch_eligibility_status" AS ENUM ('NOT_ASSESSED', 'UNDER_REVIEW', 'ELIGIBLE', 'INELIGIBLE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "verification_application_status" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "iso_weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "date_override_kind" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "availability_status" AS ENUM ('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "availability_source" AS ENUM ('WEEKLY', 'OVERRIDE', 'AD_HOC');

-- CreateEnum
CREATE TYPE "audit_actor_type" AS ENUM ('USER', 'SYSTEM', 'JOB');

-- CreateEnum
CREATE TYPE "audit_outcome" AS ENUM ('SUCCEEDED', 'FAILED', 'DENIED');

-- DropIndex
DROP INDEX "professional_profiles_discovery_status_idx";

-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "average_rating" DECIMAL(3,2),
ADD COLUMN     "city_id" UUID,
ADD COLUMN     "completed_jobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "eligibility_policy_version" VARCHAR(100),
ADD COLUMN     "eligibility_reviewed_at" TIMESTAMPTZ(3),
ADD COLUMN     "eligibility_reviewed_by_user_id" UUID,
ADD COLUMN     "internal_score" DECIMAL(7,3),
ADD COLUMN     "internal_score_updated_at" TIMESTAMPTZ(3),
ADD COLUMN     "internal_score_version" VARCHAR(100),
ADD COLUMN     "languages" VARCHAR(35)[] DEFAULT ARRAY[]::VARCHAR(35)[],
ADD COLUMN     "launch_eligibility_status" "launch_eligibility_status" NOT NULL DEFAULT 'NOT_ASSESSED',
ADD COLUMN     "profile_image_moderation_status" "media_moderation_status",
ADD COLUMN     "profile_image_origin_object_key" TEXT,
ADD COLUMN     "profile_image_public_object_key" TEXT,
ADD COLUMN     "profile_image_upload_id" UUID,
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "biography" SET DATA TYPE VARCHAR(2000);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "state" VARCHAR(120) NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'IN',
    "time_zone" VARCHAR(100) NOT NULL,
    "status" "city_status" NOT NULL DEFAULT 'INACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "status" "service_area_status" NOT NULL DEFAULT 'INACTIVE',
    "serviceability_definition" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "service_category_status" NOT NULL DEFAULT 'INACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "default_duration_minutes" INTEGER NOT NULL,
    "status" "master_service_status" NOT NULL DEFAULT 'INACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "suspension_reason_code" VARCHAR(80),
    "suspension_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "origin_object_key" TEXT,
    "approved_public_object_key" TEXT,
    "alt_text" VARCHAR(180) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "moderation_status" "media_moderation_status" NOT NULL DEFAULT 'PENDING',
    "user_safe_rejection_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_city_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "status" "service_city_status" NOT NULL DEFAULT 'INACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_city_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_city_price_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "minimum_price_paise" INTEGER NOT NULL,
    "maximum_price_paise" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "price_policy_status" NOT NULL DEFAULT 'INACTIVE',
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "effective_to" TIMESTAMPTZ(3),
    "created_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_city_price_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_service_areas" (
    "professional_id" UUID NOT NULL,
    "service_area_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_service_areas_pkey" PRIMARY KEY ("professional_id","service_area_id")
);

-- CreateTable
CREATE TABLE "portfolio_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "origin_object_key" TEXT,
    "approved_public_object_key" TEXT,
    "alt_text" VARCHAR(180) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "moderation_status" "media_moderation_status" NOT NULL DEFAULT 'PENDING',
    "user_safe_rejection_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "portfolio_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "issuer" VARCHAR(120) NOT NULL,
    "issued_on" DATE NOT NULL,
    "expires_on" DATE,
    "private_object_key" TEXT,
    "moderation_status" "media_moderation_status" NOT NULL DEFAULT 'PENDING',
    "user_safe_rejection_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professional_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "price_policy_id" UUID,
    "price_paise" INTEGER NOT NULL,
    "estimated_duration_minutes" INTEGER NOT NULL,
    "state" "professional_service_state" NOT NULL DEFAULT 'DISABLED',
    "admin_suspended_by_user_id" UUID,
    "admin_suspended_at" TIMESTAMPTZ(3),
    "admin_reason_code" VARCHAR(80),
    "user_safe_admin_reason" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professional_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_service_assets" (
    "professional_service_id" UUID NOT NULL,
    "portfolio_asset_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_service_assets_pkey" PRIMARY KEY ("professional_service_id","portfolio_asset_id")
);

-- CreateTable
CREATE TABLE "professional_service_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "proposed_name" VARCHAR(120) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "proposed_description" VARCHAR(2000) NOT NULL,
    "suggested_duration_minutes" INTEGER,
    "suggested_price_paise" INTEGER,
    "status" "service_request_status" NOT NULL DEFAULT 'SUBMITTED',
    "linked_service_id" UUID,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "reason_code" VARCHAR(80),
    "user_safe_decision_reason" VARCHAR(500),
    "internal_note" VARCHAR(2000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professional_service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_service_request_cities" (
    "request_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,

    CONSTRAINT "professional_service_request_cities_pkey" PRIMARY KEY ("request_id","city_id")
);

-- CreateTable
CREATE TABLE "service_request_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "from_status" "service_request_status",
    "to_status" "service_request_status" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason_code" VARCHAR(80),
    "request_idempotency_key" VARCHAR(128),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "verification_application_status" NOT NULL DEFAULT 'DRAFT',
    "eligibility_policy_version_acknowledged" VARCHAR(100) NOT NULL,
    "eligibility_declaration_accepted_at" TIMESTAMPTZ(3) NOT NULL,
    "reviewed_by_user_id" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "reviewed_at" TIMESTAMPTZ(3),
    "reason_code" VARCHAR(80),
    "user_safe_decision_reason" VARCHAR(500),
    "internal_note" VARCHAR(2000),
    "correction_allowed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "from_status" "verification_application_status",
    "to_status" "verification_application_status" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "time_zone" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "availability_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_weekly_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "weekday" "iso_weekday" NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_weekly_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_date_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "kind" "date_override_kind" NOT NULL,
    "reason" VARCHAR(300),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "availability_date_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_override_intervals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "override_id" UUID NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "availability_override_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professional_id" UUID NOT NULL,
    "schedule_id" UUID,
    "city_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "display_time_zone" VARCHAR(100) NOT NULL,
    "status" "availability_status" NOT NULL DEFAULT 'AVAILABLE',
    "source" "availability_source" NOT NULL,
    "schedule_version" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_type" "audit_actor_type" NOT NULL,
    "actor_user_id" UUID,
    "actor_role" "role",
    "action" VARCHAR(150) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" UUID NOT NULL,
    "outcome" "audit_outcome" NOT NULL,
    "reason_code" VARCHAR(80),
    "reason" VARCHAR(500),
    "request_id" VARCHAR(128) NOT NULL,
    "changed_fields" VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR(100)[],
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "cities_status_name_idx" ON "cities"("status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_country_state_normalized_name_key" ON "cities"("country_code", "state", "normalized_name");

-- CreateIndex
CREATE INDEX "service_areas_city_status_name_idx" ON "service_areas"("city_id", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_city_slug_key" ON "service_areas"("city_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_city_normalized_name_key" ON "service_areas"("city_id", "normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

-- CreateIndex
CREATE INDEX "service_categories_status_display_order_idx" ON "service_categories"("status", "display_order", "name");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_parent_normalized_name_key" ON "service_categories"("parent_id", "normalized_name");

-- CreateIndex
CREATE INDEX "services_category_status_name_idx" ON "services"("category_id", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "services_category_normalized_name_key" ON "services"("category_id", "normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "services_category_slug_key" ON "services"("category_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_images_upload_id_key" ON "service_images"("upload_id");

-- CreateIndex
CREATE INDEX "service_images_service_moderation_idx" ON "service_images"("service_id", "moderation_status");

-- CreateIndex
CREATE UNIQUE INDEX "service_images_service_display_order_key" ON "service_images"("service_id", "display_order");

-- CreateIndex
CREATE INDEX "service_city_availability_discovery_idx" ON "service_city_availability"("city_id", "status", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_city_availability_service_city_key" ON "service_city_availability"("service_id", "city_id");

-- CreateIndex
CREATE INDEX "service_city_price_policies_effective_idx" ON "service_city_price_policies"("service_id", "city_id", "status", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "service_city_price_policies_service_city_version_key" ON "service_city_price_policies"("service_id", "city_id", "version");

-- CreateIndex
CREATE INDEX "professional_service_areas_area_professional_idx" ON "professional_service_areas"("service_area_id", "professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_assets_upload_id_key" ON "portfolio_assets"("upload_id");

-- CreateIndex
CREATE INDEX "portfolio_assets_professional_moderation_idx" ON "portfolio_assets"("professional_id", "moderation_status");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_assets_professional_display_order_key" ON "portfolio_assets"("professional_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "professional_certificates_upload_id_key" ON "professional_certificates"("upload_id");

-- CreateIndex
CREATE INDEX "professional_certificates_professional_moderation_idx" ON "professional_certificates"("professional_id", "moderation_status");

-- CreateIndex
CREATE INDEX "professional_services_discovery_idx" ON "professional_services"("service_id", "city_id", "state", "price_paise");

-- CreateIndex
CREATE INDEX "professional_services_professional_state_idx" ON "professional_services"("professional_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "professional_services_professional_service_city_key" ON "professional_services"("professional_id", "service_id", "city_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_service_assets_service_display_order_key" ON "professional_service_assets"("professional_service_id", "display_order");

-- CreateIndex
CREATE INDEX "professional_service_requests_status_submitted_idx" ON "professional_service_requests"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "professional_service_requests_duplicate_lookup_idx" ON "professional_service_requests"("professional_id", "category_id", "normalized_name");

-- CreateIndex
CREATE INDEX "professional_service_request_cities_city_request_idx" ON "professional_service_request_cities"("city_id", "request_id");

-- CreateIndex
CREATE INDEX "service_request_status_history_request_created_idx" ON "service_request_status_history"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "verification_applications_status_submitted_idx" ON "verification_applications"("status", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_applications_professional_version_key" ON "verification_applications"("professional_id", "version");

-- CreateIndex
CREATE INDEX "verification_notes_application_created_idx" ON "verification_notes"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "verification_status_history_application_created_idx" ON "verification_status_history"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "availability_schedules_professional_city_active_idx" ON "availability_schedules"("professional_id", "city_id", "is_active");

-- CreateIndex
CREATE INDEX "availability_weekly_rules_schedule_weekday_idx" ON "availability_weekly_rules"("schedule_id", "weekday", "start_minute");

-- CreateIndex
CREATE INDEX "availability_date_overrides_schedule_date_kind_idx" ON "availability_date_overrides"("schedule_id", "local_date", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "availability_date_overrides_schedule_date_key" ON "availability_date_overrides"("schedule_id", "local_date");

-- CreateIndex
CREATE INDEX "availability_override_intervals_override_start_idx" ON "availability_override_intervals"("override_id", "start_minute");

-- CreateIndex
CREATE INDEX "availability_slots_professional_status_start_idx" ON "availability_slots"("professional_id", "status", "starts_at");

-- CreateIndex
CREATE INDEX "availability_slots_discovery_idx" ON "availability_slots"("service_id", "city_id", "status", "starts_at");

-- CreateIndex
CREATE INDEX "audit_events_target_created_idx" ON "audit_events"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_created_idx" ON "audit_events"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_action_created_idx" ON "audit_events"("action", "created_at");

-- CreateIndex
CREATE INDEX "professional_profiles_discovery_status_idx" ON "professional_profiles"("city_id", "verification_status", "launch_eligibility_status", "is_service_active");

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_eligibility_reviewed_by_user_id_fkey" FOREIGN KEY ("eligibility_reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_images" ADD CONSTRAINT "service_images_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_city_availability" ADD CONSTRAINT "service_city_availability_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_city_availability" ADD CONSTRAINT "service_city_availability_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_city_price_policies" ADD CONSTRAINT "service_city_price_policies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_city_price_policies" ADD CONSTRAINT "service_city_price_policies_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_city_price_policies" ADD CONSTRAINT "service_city_price_policies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_city_price_policies" ADD CONSTRAINT "service_city_price_policies_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_areas" ADD CONSTRAINT "professional_service_areas_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_areas" ADD CONSTRAINT "professional_service_areas_service_area_id_fkey" FOREIGN KEY ("service_area_id") REFERENCES "service_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_assets" ADD CONSTRAINT "portfolio_assets_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_certificates" ADD CONSTRAINT "professional_certificates_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_price_policy_id_fkey" FOREIGN KEY ("price_policy_id") REFERENCES "service_city_price_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_admin_suspended_by_user_id_fkey" FOREIGN KEY ("admin_suspended_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_assets" ADD CONSTRAINT "professional_service_assets_professional_service_id_fkey" FOREIGN KEY ("professional_service_id") REFERENCES "professional_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_assets" ADD CONSTRAINT "professional_service_assets_portfolio_asset_id_fkey" FOREIGN KEY ("portfolio_asset_id") REFERENCES "portfolio_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_requests" ADD CONSTRAINT "professional_service_requests_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_requests" ADD CONSTRAINT "professional_service_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_requests" ADD CONSTRAINT "professional_service_requests_linked_service_id_fkey" FOREIGN KEY ("linked_service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_requests" ADD CONSTRAINT "professional_service_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_request_cities" ADD CONSTRAINT "professional_service_request_cities_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "professional_service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_request_cities" ADD CONSTRAINT "professional_service_request_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_status_history" ADD CONSTRAINT "service_request_status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "professional_service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_status_history" ADD CONSTRAINT "service_request_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_applications" ADD CONSTRAINT "verification_applications_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_applications" ADD CONSTRAINT "verification_applications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_notes" ADD CONSTRAINT "verification_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "verification_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_notes" ADD CONSTRAINT "verification_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_status_history" ADD CONSTRAINT "verification_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "verification_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_status_history" ADD CONSTRAINT "verification_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_schedules" ADD CONSTRAINT "availability_schedules_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_schedules" ADD CONSTRAINT "availability_schedules_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_weekly_rules" ADD CONSTRAINT "availability_weekly_rules_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "availability_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_date_overrides" ADD CONSTRAINT "availability_date_overrides_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "availability_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_override_intervals" ADD CONSTRAINT "availability_override_intervals_override_id_fkey" FOREIGN KEY ("override_id") REFERENCES "availability_date_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "availability_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reviewed PostgreSQL invariants not expressible in Prisma schema syntax.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "professional_profiles"
  DROP CONSTRAINT IF EXISTS "professional_profiles_service_requires_approval_check",
  ADD CONSTRAINT "professional_profiles_experience_years_check"
    CHECK ("experience_years" IS NULL OR "experience_years" BETWEEN 0 AND 80),
  ADD CONSTRAINT "professional_profiles_rating_check"
    CHECK (
      ("average_rating" IS NULL OR "average_rating" BETWEEN 1 AND 5)
      AND "rating_count" >= 0
      AND "completed_jobs" >= 0
    ),
  ADD CONSTRAINT "professional_profiles_score_metadata_check"
    CHECK (
      (
        "internal_score" IS NULL
        AND "internal_score_version" IS NULL
        AND "internal_score_updated_at" IS NULL
      )
      OR (
        "internal_score" IS NOT NULL
        AND "internal_score_version" IS NOT NULL
        AND "internal_score_updated_at" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "professional_profiles_profile_image_check"
    CHECK (
      "profile_image_moderation_status" <> 'APPROVED'
      OR "profile_image_public_object_key" IS NOT NULL
    ),
  ADD CONSTRAINT "professional_profiles_service_eligibility_check"
    CHECK (
      NOT "is_service_active"
      OR (
        "verification_status" = 'APPROVED'
        AND "launch_eligibility_status" = 'ELIGIBLE'
      )
    ),
  ADD CONSTRAINT "professional_profiles_version_check" CHECK ("version" > 0);

ALTER TABLE "cities"
  ADD CONSTRAINT "cities_country_code_check" CHECK ("country_code" = 'IN'),
  ADD CONSTRAINT "cities_time_zone_not_blank_check" CHECK (length(btrim("time_zone")) > 0),
  ADD CONSTRAINT "cities_version_check" CHECK ("version" > 0);

ALTER TABLE "service_areas"
  ADD CONSTRAINT "service_areas_version_check" CHECK ("version" > 0);

ALTER TABLE "service_categories"
  ADD CONSTRAINT "service_categories_display_order_check" CHECK ("display_order" >= 0),
  ADD CONSTRAINT "service_categories_version_check" CHECK ("version" > 0);

ALTER TABLE "services"
  ADD CONSTRAINT "services_duration_check"
    CHECK ("default_duration_minutes" BETWEEN 5 AND 1440),
  ADD CONSTRAINT "services_reviewer_separation_check"
    CHECK ("reviewed_by_user_id" IS NULL OR "reviewed_by_user_id" <> "created_by_user_id"),
  ADD CONSTRAINT "services_publication_review_check"
    CHECK (
      "status" <> 'ACTIVE'
      OR ("reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
    ),
  ADD CONSTRAINT "services_suspension_reason_check"
    CHECK (
      (
        "status" = 'SUSPENDED'
        AND "suspension_reason_code" IS NOT NULL
        AND "suspension_reason" IS NOT NULL
      )
      OR (
        "status" <> 'SUSPENDED'
        AND "suspension_reason_code" IS NULL
        AND "suspension_reason" IS NULL
      )
    ),
  ADD CONSTRAINT "services_version_check" CHECK ("version" > 0);

ALTER TABLE "service_images"
  ADD CONSTRAINT "service_images_display_order_check" CHECK ("display_order" >= 0),
  ADD CONSTRAINT "service_images_public_key_check"
    CHECK (
      "moderation_status" <> 'APPROVED'
      OR "approved_public_object_key" IS NOT NULL
    );

ALTER TABLE "service_city_availability"
  ADD CONSTRAINT "service_city_availability_version_check" CHECK ("version" > 0);

ALTER TABLE "service_city_price_policies"
  ADD CONSTRAINT "service_city_price_policies_bounds_check"
    CHECK (
      "minimum_price_paise" >= 0
      AND "maximum_price_paise" >= "minimum_price_paise"
    ),
  ADD CONSTRAINT "service_city_price_policies_currency_check" CHECK ("currency" = 'INR'),
  ADD CONSTRAINT "service_city_price_policies_effective_range_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  ADD CONSTRAINT "service_city_price_policies_reviewer_separation_check"
    CHECK ("reviewed_by_user_id" IS NULL OR "reviewed_by_user_id" <> "created_by_user_id"),
  ADD CONSTRAINT "service_city_price_policies_activation_review_check"
    CHECK ("status" <> 'ACTIVE' OR "reviewed_by_user_id" IS NOT NULL),
  ADD CONSTRAINT "service_city_price_policies_version_check" CHECK ("version" > 0);

ALTER TABLE "portfolio_assets"
  ADD CONSTRAINT "portfolio_assets_display_order_check" CHECK ("display_order" >= 0),
  ADD CONSTRAINT "portfolio_assets_public_key_check"
    CHECK (
      "moderation_status" <> 'APPROVED'
      OR "approved_public_object_key" IS NOT NULL
    );

ALTER TABLE "professional_certificates"
  ADD CONSTRAINT "professional_certificates_expiry_check"
    CHECK ("expires_on" IS NULL OR "expires_on" >= "issued_on");

ALTER TABLE "professional_services"
  ADD CONSTRAINT "professional_services_price_check" CHECK ("price_paise" >= 0),
  ADD CONSTRAINT "professional_services_duration_check"
    CHECK ("estimated_duration_minutes" BETWEEN 5 AND 1440),
  ADD CONSTRAINT "professional_services_suspension_metadata_check"
    CHECK (
      (
        "state" = 'SUSPENDED'
        AND "admin_suspended_by_user_id" IS NOT NULL
        AND "admin_suspended_at" IS NOT NULL
        AND "admin_reason_code" IS NOT NULL
        AND "user_safe_admin_reason" IS NOT NULL
      )
      OR (
        "state" <> 'SUSPENDED'
        AND "admin_suspended_by_user_id" IS NULL
        AND "admin_suspended_at" IS NULL
        AND "admin_reason_code" IS NULL
        AND "user_safe_admin_reason" IS NULL
      )
    ),
  ADD CONSTRAINT "professional_services_version_check" CHECK ("version" > 0);

ALTER TABLE "professional_service_assets"
  ADD CONSTRAINT "professional_service_assets_display_order_check"
    CHECK ("display_order" >= 0);

ALTER TABLE "professional_service_requests"
  ADD CONSTRAINT "professional_service_requests_duration_check"
    CHECK (
      "suggested_duration_minutes" IS NULL
      OR "suggested_duration_minutes" BETWEEN 5 AND 1440
    ),
  ADD CONSTRAINT "professional_service_requests_price_check"
    CHECK ("suggested_price_paise" IS NULL OR "suggested_price_paise" >= 0),
  ADD CONSTRAINT "professional_service_requests_decision_check"
    CHECK (
      (
        "status" IN ('SUBMITTED', 'UNDER_REVIEW')
        AND "reviewed_at" IS NULL
      )
      OR (
        "status" IN ('APPROVED', 'REJECTED')
        AND "reviewed_at" IS NOT NULL
        AND "reviewed_by_user_id" IS NOT NULL
        AND "reason_code" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "professional_service_requests_approval_link_check"
    CHECK ("status" <> 'APPROVED' OR "linked_service_id" IS NOT NULL),
  ADD CONSTRAINT "professional_service_requests_version_check" CHECK ("version" > 0);

ALTER TABLE "verification_applications"
  ADD CONSTRAINT "verification_applications_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "verification_applications_submission_check"
    CHECK (
      ("status" = 'DRAFT' AND "submitted_at" IS NULL)
      OR ("status" <> 'DRAFT' AND "submitted_at" IS NOT NULL)
    ),
  ADD CONSTRAINT "verification_applications_decision_check"
    CHECK (
      "status" NOT IN ('APPROVED', 'REJECTED')
      OR (
        "reviewed_at" IS NOT NULL
        AND "reviewed_by_user_id" IS NOT NULL
        AND "reason_code" IS NOT NULL
      )
    );

ALTER TABLE "availability_schedules"
  ADD CONSTRAINT "availability_schedules_version_check" CHECK ("version" > 0);

ALTER TABLE "availability_weekly_rules"
  ADD CONSTRAINT "availability_weekly_rules_minutes_check"
    CHECK (
      "start_minute" >= 0
      AND "end_minute" <= 1440
      AND "start_minute" < "end_minute"
    );

ALTER TABLE "availability_date_overrides"
  ADD CONSTRAINT "availability_date_overrides_reason_check"
    CHECK ("kind" <> 'UNAVAILABLE' OR "reason" IS NULL OR length(btrim("reason")) > 0),
  ADD CONSTRAINT "availability_date_overrides_version_check" CHECK ("version" > 0);

ALTER TABLE "availability_override_intervals"
  ADD CONSTRAINT "availability_override_intervals_minutes_check"
    CHECK (
      "start_minute" >= 0
      AND "end_minute" <= 1440
      AND "start_minute" < "end_minute"
    );

ALTER TABLE "availability_slots"
  ADD CONSTRAINT "availability_slots_range_check" CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "availability_slots_schedule_version_check"
    CHECK ("schedule_version" IS NULL OR "schedule_version" > 0),
  ADD CONSTRAINT "availability_slots_version_check" CHECK ("version" > 0);

ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_actor_check"
    CHECK (
      (
        "actor_type" = 'USER'
        AND "actor_user_id" IS NOT NULL
        AND "actor_role" IS NOT NULL
      )
      OR (
        "actor_type" <> 'USER'
        AND "actor_user_id" IS NULL
        AND "actor_role" IS NULL
      )
    );

CREATE UNIQUE INDEX "professional_service_requests_one_open_equivalent_key"
ON "professional_service_requests" (
  "professional_id",
  "category_id",
  "normalized_name"
)
WHERE "status" IN ('SUBMITTED', 'UNDER_REVIEW');

CREATE UNIQUE INDEX "availability_schedules_one_active_key"
ON "availability_schedules" ("professional_id", "city_id")
WHERE "is_active";

ALTER TABLE "service_city_price_policies"
  ADD CONSTRAINT "service_city_price_policies_no_active_overlap"
  EXCLUDE USING gist (
    "service_id" WITH =,
    "city_id" WITH =,
    tstzrange(
      "effective_from",
      COALESCE("effective_to", 'infinity'::timestamptz),
      '[)'
    ) WITH &&
  )
  WHERE ("status" = 'ACTIVE');

ALTER TABLE "availability_weekly_rules"
  ADD CONSTRAINT "availability_weekly_rules_no_overlap"
  EXCLUDE USING gist (
    "schedule_id" WITH =,
    "weekday" WITH =,
    int4range("start_minute", "end_minute", '[)') WITH &&
  );

ALTER TABLE "availability_override_intervals"
  ADD CONSTRAINT "availability_override_intervals_no_overlap"
  EXCLUDE USING gist (
    "override_id" WITH =,
    int4range("start_minute", "end_minute", '[)') WITH &&
  );

ALTER TABLE "availability_slots"
  ADD CONSTRAINT "availability_slots_no_overlap"
  EXCLUDE USING gist (
    "professional_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('AVAILABLE', 'HELD', 'BOOKED'));

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER "service_request_status_history_append_only"
BEFORE UPDATE OR DELETE ON "service_request_status_history"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER "verification_notes_append_only"
BEFORE UPDATE OR DELETE ON "verification_notes"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER "verification_status_history_append_only"
BEFORE UPDATE OR DELETE ON "verification_status_history"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER "audit_events_append_only"
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
