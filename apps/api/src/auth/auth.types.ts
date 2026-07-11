import type {
  AuthenticatedPrincipal,
  OtpAuthRole,
  OtpPurpose,
  UserRole,
  UserStatus,
} from '@beautyathome/auth';

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  deviceName?: string;
}

export interface IssuedSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  session: {
    id: string;
    createdAt: string;
    expiresAt: string;
  };
  principal: AuthenticatedPrincipal;
}

export interface TokenPrincipal {
  userId: string;
  sessionId: string;
  activeRole: OtpAuthRole;
  roles: UserRole[];
  status: UserStatus;
}

export interface OtpContext {
  mobileNumber: string;
  purpose: OtpPurpose;
  role: OtpAuthRole;
}
