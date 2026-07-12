export class PrismaClient {}

export const OtpStatus = {
  PENDING: 'PENDING',
  CONSUMED: 'CONSUMED',
  EXPIRED: 'EXPIRED',
  LOCKED: 'LOCKED',
  CANCELLED: 'CANCELLED',
} as const;

export const Role = {
  CUSTOMER: 'CUSTOMER',
  PROFESSIONAL: 'PROFESSIONAL',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  FINANCE: 'FINANCE',
} as const;

export const SessionRevocationReason = {
  LOGOUT: 'LOGOUT',
  LOGOUT_ALL: 'LOGOUT_ALL',
  TOKEN_REUSE: 'TOKEN_REUSE',
  ACCOUNT_STATUS_CHANGED: 'ACCOUNT_STATUS_CHANGED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
} as const;

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLOCKED: 'BLOCKED',
  CLOSED: 'CLOSED',
} as const;

export const AuditActorType = {
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  JOB: 'JOB',
} as const;

export const AuditOutcome = {
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  DENIED: 'DENIED',
} as const;

export const AvailabilitySource = {
  WEEKLY: 'WEEKLY',
  OVERRIDE: 'OVERRIDE',
  AD_HOC: 'AD_HOC',
} as const;

export const AvailabilityStatus = {
  AVAILABLE: 'AVAILABLE',
  HELD: 'HELD',
  BOOKED: 'BOOKED',
  BLOCKED: 'BLOCKED',
  EXPIRED: 'EXPIRED',
} as const;

export const DateOverrideKind = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;

export const LaunchEligibilityStatus = {
  NOT_ASSESSED: 'NOT_ASSESSED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ELIGIBLE: 'ELIGIBLE',
  INELIGIBLE: 'INELIGIBLE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const MasterServiceStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const MediaModerationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const PricePolicyStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const ProfessionalServiceState = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
  SUSPENDED: 'SUSPENDED',
} as const;

export const ServiceAreaStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const ServiceCategoryStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const ServiceCityStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const ServiceRequestStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const VerificationApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const VerificationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
} as const;

export const Prisma = {
  TransactionIsolationLevel: { Serializable: 'Serializable' },
} as const;
