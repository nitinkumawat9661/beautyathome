import { z } from 'zod';

/**
 * Stable public error identifiers for the shared authentication boundary.
 * Additive changes are allowed; existing values must not be renamed or repurposed.
 */
export const API_ERROR_CODES = [
  'REQUEST_VALIDATION_FAILED',
  'AUTHENTICATION_REQUIRED',
  'AUTH_STEP_UP_REQUIRED',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_INVALID_OR_EXPIRED_OTP',
  'AUTH_OTP_CHALLENGE_INVALID',
  'AUTH_OTP_INVALID',
  'AUTH_OTP_EXPIRED',
  'AUTH_OTP_ATTEMPTS_EXCEEDED',
  'AUTH_OTP_RATE_LIMITED',
  'AUTH_SESSION_INVALID',
  'AUTH_SESSION_EXPIRED',
  'AUTH_SESSION_REVOKED',
  'AUTH_ACCOUNT_UNAVAILABLE',
  'AUTH_ROLE_FORBIDDEN',
  'AUTH_PROVIDER_UNAVAILABLE',
  'CATALOG_CATEGORY_DUPLICATE',
  'CATALOG_SERVICE_AREA_DUPLICATE',
  'CATALOG_SERVICE_DUPLICATE',
  'CATALOG_SERVICE_INACTIVE',
  'CATALOG_CITY_UNAVAILABLE',
  'CATALOG_PRICE_POLICY_MISSING',
  'CATALOG_PRICE_POLICY_NOT_EFFECTIVE',
  'CATALOG_PRICE_OUT_OF_RANGE',
  'CATALOG_DURATION_OUT_OF_RANGE',
  'CATALOG_INVALID_TRANSITION',
  'SERVICE_REQUEST_DUPLICATE',
  'SERVICE_REQUEST_INVALID_TRANSITION',
  'SERVICE_REQUEST_RESOLUTION_MISMATCH',
  'PROFESSIONAL_NOT_APPROVED',
  'PROFESSIONAL_NOT_ELIGIBLE',
  'PROFESSIONAL_SERVICE_SUSPENDED',
  'PROFESSIONAL_SERVICE_INVALID_TRANSITION',
  'VERIFICATION_APPLICATION_INCOMPLETE',
  'VERIFICATION_INVALID_TRANSITION',
  'VERIFICATION_ELIGIBILITY_NOT_CONFIRMED',
  'VERIFICATION_PROFILE_LOCKED',
  'AVAILABILITY_INVALID_INTERVAL',
  'AVAILABILITY_OUTSIDE_SCHEDULE',
  'AVAILABILITY_OVERLAP',
  'AVAILABILITY_SLOT_RESERVED',
  'OPTIMISTIC_LOCK_CONFLICT',
  'UPLOAD_NOT_READY',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorDetailSchema = z
  .object({
    field: z.string().trim().min(1).max(128),
    reason: z.string().trim().min(1).max(512),
  })
  .strict();

export const ApiErrorSchema = z
  .object({
    code: ApiErrorCodeSchema,
    message: z.string().trim().min(1).max(512),
    requestId: z.string().trim().min(1).max(128),
    details: z.array(ApiErrorDetailSchema).max(50).optional(),
  })
  .strict();

export const ApiErrorResponseSchema = z
  .object({
    error: ApiErrorSchema,
  })
  .strict();

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
