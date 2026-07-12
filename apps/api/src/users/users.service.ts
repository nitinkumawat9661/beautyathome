import { HttpStatus, Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { AppException } from '../common/errors/app.exception';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { PrismaService } from '../database/prisma/prisma.service';
import type {
  AdminProfileUpdate,
  CustomerProfileUpdate,
} from './users.validation';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  getMe(actor: AuthenticatedActor) {
    return this.auth.getPrincipal(actor);
  }

  async updateCustomerProfile(
    actor: AuthenticatedActor,
    input: CustomerProfileUpdate,
  ) {
    try {
      const profile = await this.prisma.customerProfile.update({
        where: { userId: actor.userId },
        data: { displayName: input.displayName },
      });
      return {
        id: profile.id,
        role: 'CUSTOMER' as const,
        displayName: profile.displayName,
        profileComplete: Boolean(profile.displayName),
      };
    } catch (error) {
      this.translateMissingProfile(error);
    }
  }

  async getAdminProfile(actor: AuthenticatedActor) {
    const profile = await this.prisma.adminProfile.findUnique({
      where: { userId: actor.userId },
    });
    if (!profile) this.throwProfileNotFound();
    return { id: profile.id, displayName: profile.displayName };
  }

  async updateAdminProfile(
    actor: AuthenticatedActor,
    input: AdminProfileUpdate,
  ) {
    try {
      const profile = await this.prisma.adminProfile.update({
        where: { userId: actor.userId },
        data: input,
      });
      return { id: profile.id, displayName: profile.displayName };
    } catch (error) {
      this.translateMissingProfile(error);
    }
  }

  private translateMissingProfile(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      this.throwProfileNotFound();
    }
    throw error;
  }

  private throwProfileNotFound(): never {
    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Profile not found.',
    );
  }
}
