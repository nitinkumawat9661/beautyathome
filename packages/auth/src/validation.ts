import type { Brand } from '@beautyathome/types';
import { z } from 'zod';

export type IndiaMobileNumber = Brand<string, 'IndiaMobileNumber'>;
export type MaskedIndiaMobileNumber = Brand<string, 'MaskedIndiaMobileNumber'>;
export type OtpCode = Brand<string, 'OtpCode'>;
export type AuthChallengeId = Brand<string, 'AuthChallengeId'>;
export type AuthSessionId = Brand<string, 'AuthSessionId'>;
export type ProfileId = Brand<string, 'ProfileId'>;

export const INDIA_E164_MOBILE_PATTERN = /^\+91[6-9]\d{9}$/;
export const MASKED_INDIA_MOBILE_PATTERN = /^\+91\*{6}\d{4}$/;
export const OTP_CODE_PATTERN = /^\d{4,8}$/;
export const MIN_OTP_CODE_LENGTH = 4;
export const MAX_OTP_CODE_LENGTH = 8;

export const IndiaMobileNumberSchema = z
  .string()
  .trim()
  .regex(INDIA_E164_MOBILE_PATTERN, 'Mobile number must be an Indian E.164 mobile number')
  .transform((value): IndiaMobileNumber => value as IndiaMobileNumber);

export const MaskedIndiaMobileNumberSchema = z
  .string()
  .regex(MASKED_INDIA_MOBILE_PATTERN, 'Mobile number must be masked')
  .transform((value): MaskedIndiaMobileNumber => value as MaskedIndiaMobileNumber);

export const OtpCodeSchema = z
  .string()
  .regex(OTP_CODE_PATTERN, 'OTP must contain between four and eight digits')
  .transform((value): OtpCode => value as OtpCode);

export const AuthChallengeIdSchema = z
  .string()
  .uuid()
  .transform((value): AuthChallengeId => value as AuthChallengeId);

export const AuthSessionIdSchema = z
  .string()
  .uuid()
  .transform((value): AuthSessionId => value as AuthSessionId);

export const ProfileIdSchema = z
  .string()
  .uuid()
  .transform((value): ProfileId => value as ProfileId);

export const IsoDateTimeSchema = z.string().datetime({ offset: true });

export function isIndiaMobileNumber(value: unknown): value is IndiaMobileNumber {
  return IndiaMobileNumberSchema.safeParse(value).success;
}

export function isOtpCode(value: unknown): value is OtpCode {
  return OtpCodeSchema.safeParse(value).success;
}

/**
 * Builds the exact-length validator after the approved OTP length is loaded by an application.
 * The shared package intentionally does not choose that deployment value.
 */
export function createOtpCodeSchema(length: number) {
  if (!Number.isInteger(length) || length < MIN_OTP_CODE_LENGTH || length > MAX_OTP_CODE_LENGTH) {
    throw new RangeError(
      `OTP length must be an integer between ${String(MIN_OTP_CODE_LENGTH)} and ${String(MAX_OTP_CODE_LENGTH)}`,
    );
  }

  return z
    .string()
    .regex(
      new RegExp(`^\\d{${String(length)}}$`),
      `OTP must contain exactly ${String(length)} digits`,
    )
    .transform((value): OtpCode => value as OtpCode);
}
