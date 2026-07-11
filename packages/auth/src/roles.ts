import { z } from 'zod';

/** All roles in the v1 authorization model. */
export const USER_ROLES = ['CUSTOMER', 'PROFESSIONAL', 'ADMIN', 'SUPPORT', 'FINANCE'] as const;

/** Roles that have a Phase 1 mobile OTP entry flow. Staff roles remain pre-provisioned. */
export const OTP_AUTH_ROLES = USER_ROLES;

/** Least-privilege staff roles. */
export const OPERATIONAL_ROLES = ['ADMIN', 'SUPPORT', 'FINANCE'] as const;

export const UserRoleSchema = z.enum(USER_ROLES);
export const OtpAuthRoleSchema = z.enum(OTP_AUTH_ROLES);
export const OperationalRoleSchema = z.enum(OPERATIONAL_ROLES);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type OtpAuthRole = z.infer<typeof OtpAuthRoleSchema>;
export type OperationalRole = z.infer<typeof OperationalRoleSchema>;

export function isUserRole(value: unknown): value is UserRole {
  return UserRoleSchema.safeParse(value).success;
}

export function canAuthenticateWithMobileOtp(role: UserRole): role is OtpAuthRole {
  return OtpAuthRoleSchema.safeParse(role).success;
}

export function isOperationalRole(role: UserRole): role is OperationalRole {
  return OperationalRoleSchema.safeParse(role).success;
}

export function hasRole(grantedRoles: readonly UserRole[], requiredRole: UserRole): boolean {
  return grantedRoles.includes(requiredRole);
}

export function hasAnyRole(
  grantedRoles: readonly UserRole[],
  requiredRoles: readonly UserRole[],
): boolean {
  return requiredRoles.some((role) => grantedRoles.includes(role));
}

export function hasEveryRole(
  grantedRoles: readonly UserRole[],
  requiredRoles: readonly UserRole[],
): boolean {
  return requiredRoles.every((role) => grantedRoles.includes(role));
}
