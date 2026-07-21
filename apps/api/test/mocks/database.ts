export class PrismaClient {}

export const BookingStatus = {
  DRAFT: 'DRAFT',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CONFIRMED: 'CONFIRMED',
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ARRIVED',
  START_OTP_PENDING: 'START_OTP_PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETION_OTP_PENDING: 'COMPLETION_OTP_PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED',
  NO_SHOW: 'NO_SHOW',
} as const;
export const AssignmentStatus = {
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export const PaymentStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
} as const;
export const PaymentAttemptStatus = {
  CREATED: 'CREATED',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  TIMED_OUT: 'TIMED_OUT',
} as const;
export const RefundStatus = {
  REQUESTED: 'REQUESTED',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export const ServiceOtpPurpose = {
  START: 'START',
  COMPLETION: 'COMPLETION',
} as const;
export const ServiceOtpStatus = {
  ACTIVE: 'ACTIVE',
  CONSUMED: 'CONSUMED',
  EXPIRED: 'EXPIRED',
  LOCKED: 'LOCKED',
  REVOKED: 'REVOKED',
} as const;
export const WalletEntryDirection = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
} as const;
export const WalletEntryState = {
  PENDING: 'PENDING',
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SETTLED: 'SETTLED',
  REVERSED: 'REVERSED',
} as const;
export const WithdrawalStatus = {
  REQUESTED: 'REQUESTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

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
  sql(strings: TemplateStringsArray, ...values: unknown[]) {
    return { strings: [...strings], values };
  },
} as const;
