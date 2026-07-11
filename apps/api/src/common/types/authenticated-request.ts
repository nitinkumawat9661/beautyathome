import type { OtpAuthRole, UserRole, UserStatus } from '@beautyathome/auth';
import type { Request } from 'express';

export interface AuthenticatedActor {
  userId: string;
  sessionId: string;
  activeRole: OtpAuthRole;
  roles: UserRole[];
  status: UserStatus;
}

export interface RequestWithContext extends Request {
  requestId: string;
  actor?: AuthenticatedActor;
}
