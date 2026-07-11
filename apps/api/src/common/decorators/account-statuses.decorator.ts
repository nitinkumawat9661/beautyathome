import type { UserStatus } from '@beautyathome/auth';
import { SetMetadata } from '@nestjs/common';

export const ACCOUNT_STATUSES_KEY = 'accountStatuses';
export const AllowedAccountStatuses = (...statuses: UserStatus[]) =>
  SetMetadata(ACCOUNT_STATUSES_KEY, statuses);
