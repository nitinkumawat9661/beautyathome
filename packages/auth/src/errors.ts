import { z } from 'zod';

/**
 * Stable public error identifiers for the shared authentication boundary.
 * Additive changes are allowed; existing values must not be renamed or repurposed.
 */
export const API_ERROR_CODES = [
  'REQUEST_VALIDATION_FAILED',
  'AUTHENTICATION_REQUIRED',
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
