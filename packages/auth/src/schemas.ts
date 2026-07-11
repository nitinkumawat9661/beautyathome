import type { UserId } from '@beautyathome/types';
import { z } from 'zod';

import {
  AuthChallengeIdSchema,
  AuthSessionIdSchema,
  IndiaMobileNumberSchema,
  IsoDateTimeSchema,
  MaskedIndiaMobileNumberSchema,
  OtpCodeSchema,
  ProfileIdSchema,
} from './validation.js';
import { UserRoleSchema, type UserRole } from './roles.js';

const UserIdSchema = z
  .string()
  .uuid()
  .transform((value): UserId => value as UserId);

const uniqueRoles = (roles: UserRole[]): boolean => new Set(roles).size === roles.length;

export const OtpPurposeSchema = z.enum(['SIGN_IN', 'SIGN_UP']);
export type OtpPurpose = z.infer<typeof OtpPurposeSchema>;

const CustomerOtpRequestFields = {
  mobileNumber: IndiaMobileNumberSchema,
  role: z.literal('CUSTOMER'),
  purpose: OtpPurposeSchema,
} as const;

const ProfessionalOtpRequestFields = {
  mobileNumber: IndiaMobileNumberSchema,
  role: z.literal('PROFESSIONAL'),
  purpose: OtpPurposeSchema,
} as const;

const AdminOtpRequestFields = {
  mobileNumber: IndiaMobileNumberSchema,
  role: z.literal('ADMIN'),
  purpose: z.literal('SIGN_IN'),
} as const;

const SupportOtpRequestFields = {
  mobileNumber: IndiaMobileNumberSchema,
  role: z.literal('SUPPORT'),
  purpose: z.literal('SIGN_IN'),
} as const;

const FinanceOtpRequestFields = {
  mobileNumber: IndiaMobileNumberSchema,
  role: z.literal('FINANCE'),
  purpose: z.literal('SIGN_IN'),
} as const;

export const CustomerOtpRequestSchema = z.object(CustomerOtpRequestFields).strict();
export const ProfessionalOtpRequestSchema = z.object(ProfessionalOtpRequestFields).strict();
export const AdminOtpRequestSchema = z.object(AdminOtpRequestFields).strict();
export const SupportOtpRequestSchema = z.object(SupportOtpRequestFields).strict();
export const FinanceOtpRequestSchema = z.object(FinanceOtpRequestFields).strict();

export const OtpRequestSchema = z.discriminatedUnion('role', [
  CustomerOtpRequestSchema,
  ProfessionalOtpRequestSchema,
  AdminOtpRequestSchema,
  SupportOtpRequestSchema,
  FinanceOtpRequestSchema,
]);

export type CustomerOtpRequest = z.infer<typeof CustomerOtpRequestSchema>;
export type ProfessionalOtpRequest = z.infer<typeof ProfessionalOtpRequestSchema>;
export type AdminOtpRequest = z.infer<typeof AdminOtpRequestSchema>;
export type SupportOtpRequest = z.infer<typeof SupportOtpRequestSchema>;
export type FinanceOtpRequest = z.infer<typeof FinanceOtpRequestSchema>;
export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const CustomerOtpVerifyRequestSchema = z
  .object({
    ...CustomerOtpRequestFields,
    challengeId: AuthChallengeIdSchema,
    otp: OtpCodeSchema,
  })
  .strict();

export const ProfessionalOtpVerifyRequestSchema = z
  .object({
    ...ProfessionalOtpRequestFields,
    challengeId: AuthChallengeIdSchema,
    otp: OtpCodeSchema,
  })
  .strict();

export const AdminOtpVerifyRequestSchema = z
  .object({
    ...AdminOtpRequestFields,
    challengeId: AuthChallengeIdSchema,
    otp: OtpCodeSchema,
  })
  .strict();

export const SupportOtpVerifyRequestSchema = z
  .object({
    ...SupportOtpRequestFields,
    challengeId: AuthChallengeIdSchema,
    otp: OtpCodeSchema,
  })
  .strict();

export const FinanceOtpVerifyRequestSchema = z
  .object({
    ...FinanceOtpRequestFields,
    challengeId: AuthChallengeIdSchema,
    otp: OtpCodeSchema,
  })
  .strict();

export const OtpVerifyRequestSchema = z.discriminatedUnion('role', [
  CustomerOtpVerifyRequestSchema,
  ProfessionalOtpVerifyRequestSchema,
  AdminOtpVerifyRequestSchema,
  SupportOtpVerifyRequestSchema,
  FinanceOtpVerifyRequestSchema,
]);

export type CustomerOtpVerifyRequest = z.infer<typeof CustomerOtpVerifyRequestSchema>;
export type ProfessionalOtpVerifyRequest = z.infer<typeof ProfessionalOtpVerifyRequestSchema>;
export type AdminOtpVerifyRequest = z.infer<typeof AdminOtpVerifyRequestSchema>;
export type SupportOtpVerifyRequest = z.infer<typeof SupportOtpVerifyRequestSchema>;
export type FinanceOtpVerifyRequest = z.infer<typeof FinanceOtpVerifyRequestSchema>;
export type OtpVerifyRequest = z.infer<typeof OtpVerifyRequestSchema>;

/** Neutral response: it carries no account-existence or provider information. */
export const OtpRequestAcceptedResponseSchema = z
  .object({
    accepted: z.literal(true),
    challengeId: AuthChallengeIdSchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict();

export type OtpRequestAcceptedResponse = z.infer<typeof OtpRequestAcceptedResponseSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED', 'CLOSED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

const DisplayNameSchema = z.string().trim().min(1).max(100).nullable();

export const CustomerProfileSummarySchema = z
  .object({
    id: ProfileIdSchema,
    role: z.literal('CUSTOMER'),
    displayName: DisplayNameSchema,
    profileComplete: z.boolean(),
  })
  .strict();

export const VerificationStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const ProfessionalProfileSummarySchema = z
  .object({
    id: ProfileIdSchema,
    role: z.literal('PROFESSIONAL'),
    displayName: DisplayNameSchema,
    profileComplete: z.boolean(),
    verificationStatus: VerificationStatusSchema,
  })
  .strict();

export const AdminProfileSummarySchema = z
  .object({
    id: ProfileIdSchema,
    role: z.enum(['ADMIN', 'SUPPORT', 'FINANCE']),
    displayName: DisplayNameSchema,
    profileComplete: z.boolean(),
  })
  .strict();

export const AuthenticatedProfileSummarySchema = z.discriminatedUnion('role', [
  CustomerProfileSummarySchema,
  ProfessionalProfileSummarySchema,
  AdminProfileSummarySchema,
]);

export type CustomerProfileSummary = z.infer<typeof CustomerProfileSummarySchema>;
export type ProfessionalProfileSummary = z.infer<typeof ProfessionalProfileSummarySchema>;
export type AdminProfileSummary = z.infer<typeof AdminProfileSummarySchema>;
export type AuthenticatedProfileSummary = z.infer<typeof AuthenticatedProfileSummarySchema>;

export const CustomerProfileUpdateSchema = z.object({ displayName: DisplayNameSchema }).strict();
export type CustomerProfileUpdate = z.infer<typeof CustomerProfileUpdateSchema>;

export const ProfessionalProfileUpdateSchema = z
  .object({
    displayName: DisplayNameSchema.optional(),
    biography: z.string().trim().min(1).max(1_000).nullable().optional(),
    experienceYears: z.number().int().min(0).max(80).nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, 'At least one profile field is required');
export type ProfessionalProfileUpdate = z.infer<typeof ProfessionalProfileUpdateSchema>;

export const StaffProfileUpdateSchema = z.object({ displayName: DisplayNameSchema }).strict();
export type StaffProfileUpdate = z.infer<typeof StaffProfileUpdateSchema>;

export const ProfessionalProfileViewSchema = z
  .object({
    id: ProfileIdSchema,
    displayName: DisplayNameSchema,
    biography: z.string().max(1_000).nullable(),
    experienceYears: z.number().int().min(0).max(80).nullable(),
    verificationStatus: VerificationStatusSchema,
    isServiceActive: z.boolean(),
  })
  .strict();
export type ProfessionalProfileView = z.infer<typeof ProfessionalProfileViewSchema>;

export const StaffProfileViewSchema = z
  .object({
    id: ProfileIdSchema,
    displayName: DisplayNameSchema,
  })
  .strict();
export type StaffProfileView = z.infer<typeof StaffProfileViewSchema>;

const UserRolesSchema = z
  .array(UserRoleSchema)
  .min(1)
  .max(5)
  .refine(uniqueRoles, 'Roles must be unique');

export const AuthenticatedUserSummarySchema = z
  .object({
    id: UserIdSchema,
    mobileNumberMasked: MaskedIndiaMobileNumberSchema,
    status: UserStatusSchema,
    roles: UserRolesSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export type AuthenticatedUserSummary = z.infer<typeof AuthenticatedUserSummarySchema>;

export const AuthenticatedPrincipalSchema = z
  .object({
    user: AuthenticatedUserSummarySchema,
    activeRole: UserRoleSchema,
    profile: AuthenticatedProfileSummarySchema,
  })
  .strict()
  .superRefine((principal, context) => {
    if (!principal.user.roles.includes(principal.activeRole)) {
      context.addIssue({
        code: 'custom',
        path: ['activeRole'],
        message: 'Active role must be granted to the authenticated user',
      });
    }

    if (principal.profile.role !== principal.activeRole) {
      context.addIssue({
        code: 'custom',
        path: ['profile', 'role'],
        message: 'Profile role must match the active role',
      });
    }
  });

export type AuthenticatedPrincipal = z.infer<typeof AuthenticatedPrincipalSchema>;

export const AuthSessionSummarySchema = z
  .object({
    id: AuthSessionIdSchema,
    createdAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict();

export type AuthSessionSummary = z.infer<typeof AuthSessionSummarySchema>;

export const OtpVerifyResponseSchema = z
  .object({
    accessToken: z.string().min(1).max(8192),
    accessTokenExpiresAt: IsoDateTimeSchema,
    session: AuthSessionSummarySchema,
    principal: AuthenticatedPrincipalSchema,
  })
  .strict();

export type OtpVerifyResponse = z.infer<typeof OtpVerifyResponseSchema>;

export const AccessTokenClaimsSchema = z
  .object({
    tokenUse: z.literal('access'),
    iss: z.string().trim().min(1).max(512),
    aud: z.union([
      z.string().trim().min(1).max(512),
      z.array(z.string().trim().min(1).max(512)).min(1).max(10),
    ]),
    sub: UserIdSchema,
    sid: AuthSessionIdSchema,
    roles: UserRolesSchema,
    activeRole: UserRoleSchema,
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
    jti: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .superRefine((claims, context) => {
    if (claims.exp <= claims.iat) {
      context.addIssue({
        code: 'custom',
        path: ['exp'],
        message: 'Access token expiry must be later than its issued-at time',
      });
    }

    if (!claims.roles.includes(claims.activeRole)) {
      context.addIssue({
        code: 'custom',
        path: ['activeRole'],
        message: 'Active role must be granted to the authenticated user',
      });
    }
  });

export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;
