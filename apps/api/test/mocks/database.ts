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

export const Prisma = {
  TransactionIsolationLevel: { Serializable: 'Serializable' },
} as const;
