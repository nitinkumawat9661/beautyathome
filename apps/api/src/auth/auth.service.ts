import { randomUUID } from 'node:crypto';

import {
  AuthenticatedPrincipalSchema,
  AuthSessionSummarySchema,
  OtpRequestAcceptedResponseSchema,
  isOperationalRole,
  type AuthenticatedPrincipal,
  type AuthSessionSummary,
  type OtpAuthRole,
  type OtpRequest,
  type OtpVerifyRequest,
  type UserRole,
} from '@beautyathome/auth';
import {
  OtpStatus,
  Prisma,
  Role,
  SessionRevocationReason,
  UserStatus,
} from '@beautyathome/database';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppException } from '../common/errors/app.exception';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma/prisma.service';
import { AccessTokenService } from './access-token.service';
import { AuthCryptoService } from './auth-crypto.service';
import type {
  IssuedSession,
  RequestContext,
  TokenPrincipal,
} from './auth.types';
import { OtpDeliveryService } from './otp-delivery.service';

type AuthUser = Prisma.UserGetPayload<{
  include: {
    roles: true;
    customerProfile: true;
    professionalProfile: true;
    adminProfile: true;
  };
}>;

const INVALID_OTP_MESSAGE =
  'The verification code is invalid or no longer available.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
    private readonly crypto: AuthCryptoService,
    private readonly delivery: OtpDeliveryService,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async requestOtp(input: OtpRequest, context: RequestContext) {
    const id = randomUUID();
    const mobileLookup = this.crypto.mobileLookup(input.mobileNumber);
    const otp = this.delivery.getCode();
    const expiresAt = new Date(
      Date.now() + this.config.get('OTP_TTL_SECONDS', { infer: true }) * 1_000,
    );
    const cooldownCutoff = new Date(
      Date.now() -
        this.config.get('OTP_REQUEST_COOLDOWN_SECONDS', { infer: true }) *
          1_000,
    );

    const challenge = await this.runSerializable(async (transaction) => {
      const [user, latestChallenge] = await Promise.all([
        transaction.user.findFirst({
          where: { mobileNumberLookupHash: mobileLookup, deletedAt: null },
          include: { roles: true },
        }),
        transaction.otpChallenge.findFirst({
          where: {
            destinationLookupHash: mobileLookup,
            purpose: input.purpose,
            requestedRole: input.role,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      const hasRole =
        user?.roles.some((role) => role.role === input.role) ?? false;
      const eligibleAccount =
        input.purpose === 'SIGN_UP'
          ? true
          : hasRole &&
            user !== null &&
            (user.status === UserStatus.ACTIVE ||
              user.status === UserStatus.SUSPENDED);
      const suppressed =
        latestChallenge !== null && latestChallenge.createdAt > cooldownCutoff;
      const canDeliver =
        eligibleAccount &&
        !suppressed &&
        this.config.get('OTP_DELIVERY_MODE', { infer: true }) === 'development';

      if (canDeliver) {
        await transaction.otpChallenge.updateMany({
          where: {
            destinationLookupHash: mobileLookup,
            purpose: input.purpose,
            requestedRole: input.role,
            status: OtpStatus.PENDING,
          },
          data: { status: OtpStatus.CANCELLED },
        });
      }

      return transaction.otpChallenge.create({
        data: {
          id,
          userId: user?.id,
          purpose: input.purpose,
          requestedRole: input.role,
          status: canDeliver ? OtpStatus.PENDING : OtpStatus.CANCELLED,
          destinationLookupHash: mobileLookup,
          codeDigest: this.crypto.otpDigest(id, input, otp),
          maxAttempts: this.config.get('OTP_MAX_ATTEMPTS', { infer: true }),
          requestIpHash: this.crypto.requestContextHash(
            context.ipAddress,
            'ip',
          ),
          deviceFingerprintHash: this.crypto.requestContextHash(
            context.deviceFingerprint,
            'device',
          ),
          userAgentHash: this.crypto.requestContextHash(
            context.userAgent,
            'user-agent',
          ),
          expiresAt,
        },
      });
    });

    if (challenge.status === OtpStatus.PENDING) {
      let deliveryResult: Awaited<ReturnType<OtpDeliveryService['deliver']>>;
      try {
        deliveryResult = await this.delivery.deliver(input.mobileNumber, otp);
      } catch {
        deliveryResult = { delivered: false };
      }
      await this.prisma.otpChallenge.updateMany({
        where: { id: challenge.id, status: OtpStatus.PENDING },
        data: deliveryResult.delivered
          ? {
              providerReference: deliveryResult.providerReference?.slice(
                0,
                255,
              ),
            }
          : { status: OtpStatus.CANCELLED },
      });
    }

    return OtpRequestAcceptedResponseSchema.parse({
      accepted: true,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  }

  async verifyOtp(
    input: OtpVerifyRequest,
    context: RequestContext,
  ): Promise<IssuedSession> {
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const refreshToken = `${sessionId}.${this.crypto.randomRefreshSecret()}`;
    const now = new Date();
    const sessionExpiresAt = new Date(
      now.getTime() +
        this.config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) * 1_000,
    );
    const mobileLookup = this.crypto.mobileLookup(input.mobileNumber);

    const result = await this.runSerializable(async (transaction) => {
      const challenge = await transaction.otpChallenge.findUnique({
        where: { id: input.challengeId },
      });
      if (
        !challenge ||
        challenge.status !== OtpStatus.PENDING ||
        challenge.purpose !== input.purpose ||
        challenge.requestedRole !== input.role ||
        !this.crypto.secureEqualsHex(
          challenge.destinationLookupHash,
          mobileLookup,
        )
      ) {
        return { ok: false as const };
      }

      if (challenge.expiresAt <= now) {
        await transaction.otpChallenge.updateMany({
          where: { id: challenge.id, status: OtpStatus.PENDING },
          data: { status: OtpStatus.EXPIRED },
        });
        return { ok: false as const };
      }

      const submittedDigest = this.crypto.otpDigest(
        challenge.id,
        input,
        input.otp,
      );
      if (!this.crypto.secureEqualsHex(challenge.codeDigest, submittedDigest)) {
        const attemptCount = challenge.attemptCount + 1;
        await transaction.otpChallenge.updateMany({
          where: {
            id: challenge.id,
            status: OtpStatus.PENDING,
            attemptCount: challenge.attemptCount,
          },
          data: {
            attemptCount,
            lastAttemptAt: now,
            ...(attemptCount >= challenge.maxAttempts
              ? { status: OtpStatus.LOCKED }
              : {}),
          },
        });
        return { ok: false as const };
      }

      let user = await transaction.user.findFirst({
        where: { mobileNumberLookupHash: mobileLookup, deletedAt: null },
        include: { roles: true },
      });
      const signingUp = input.purpose === 'SIGN_UP';

      if (
        user &&
        (user.status === UserStatus.BLOCKED ||
          user.status === UserStatus.CLOSED)
      ) {
        return { ok: false as const };
      }

      const alreadyGranted =
        user?.roles.some((role) => role.role === input.role) ?? false;
      if (!signingUp && !alreadyGranted) return { ok: false as const };

      const consumed = await transaction.otpChallenge.updateMany({
        where: {
          id: challenge.id,
          status: OtpStatus.PENDING,
          attemptCount: challenge.attemptCount,
        },
        data: {
          status: OtpStatus.CONSUMED,
          consumedAt: now,
          lastAttemptAt: now,
        },
      });
      if (consumed.count !== 1) return { ok: false as const };

      if (!user) {
        user = await transaction.user.create({
          data: {
            mobileNumberCiphertext: this.crypto.encryptMobile(
              input.mobileNumber,
            ),
            mobileNumberLookupHash: mobileLookup,
            mobileNumberEncryptionKeyVersion: this.config.get(
              'PII_ENCRYPTION_KEY_VERSION',
              { infer: true },
            ),
            mobileVerifiedAt: now,
          },
          include: { roles: true },
        });
      }

      if (!alreadyGranted) {
        await transaction.userRole.create({
          data: { userId: user.id, role: input.role },
        });
      }
      await this.ensureProfile(transaction, user.id, input.role);
      await transaction.user.update({
        where: { id: user.id },
        data: { mobileVerifiedAt: now },
      });

      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          familyId,
          activeRole: input.role,
          refreshTokenHash: this.crypto.refreshTokenHash(refreshToken),
          deviceFingerprintHash: this.crypto.requestContextHash(
            context.deviceFingerprint,
            'device',
          ),
          deviceName: context.deviceName?.trim().slice(0, 120),
          userAgentHash: this.crypto.requestContextHash(
            context.userAgent,
            'user-agent',
          ),
          createdIpHash: this.crypto.requestContextHash(
            context.ipAddress,
            'ip',
          ),
          lastIpHash: this.crypto.requestContextHash(context.ipAddress, 'ip'),
          expiresAt: sessionExpiresAt,
          lastUsedAt: now,
        },
      });

      const hydratedUser = await this.loadAuthUser(transaction, user.id);
      return { ok: true as const, user: hydratedUser };
    });

    if (!result.ok) this.throwInvalidOtp();

    try {
      return await this.buildIssuedSession(
        result.user,
        input.role,
        familyId,
        refreshToken,
        now,
        sessionExpiresAt,
      );
    } catch (error) {
      await this.revokeFamily(familyId, SessionRevocationReason.ADMINISTRATIVE);
      throw error;
    }
  }

  async refresh(
    refreshToken: string,
    context: RequestContext,
  ): Promise<IssuedSession> {
    const parsed = this.parseRefreshToken(refreshToken);
    const now = new Date();
    const nextId = randomUUID();
    const nextRefreshToken = `${nextId}.${this.crypto.randomRefreshSecret()}`;
    const expiresAt = new Date(
      now.getTime() +
        this.config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) * 1_000,
    );

    const result = await this.runSerializable(async (transaction) => {
      const current = await transaction.authSession.findUnique({
        where: { id: parsed.id },
        include: { user: { include: { roles: true } } },
      });
      if (
        !current ||
        !this.crypto.secureEqualsHex(
          current.refreshTokenHash,
          this.crypto.refreshTokenHash(refreshToken),
        )
      ) {
        return { state: 'invalid' as const };
      }

      if (current.rotatedAt && !current.revokedAt) {
        await transaction.authSession.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: {
            revokedAt: now,
            revocationReason: SessionRevocationReason.TOKEN_REUSE,
          },
        });
        return { state: 'reuse' as const };
      }

      if (current.revokedAt || current.expiresAt <= now)
        return { state: 'invalid' as const };
      if (
        current.user.status === UserStatus.BLOCKED ||
        current.user.status === UserStatus.CLOSED
      ) {
        await transaction.authSession.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: {
            revokedAt: now,
            revocationReason: SessionRevocationReason.ACCOUNT_STATUS_CHANGED,
          },
        });
        return { state: 'invalid' as const };
      }

      const currentRoles = current.user.roles.map((role) => role.role);
      if (!currentRoles.includes(current.activeRole)) {
        await transaction.authSession.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: {
            revokedAt: now,
            revocationReason: SessionRevocationReason.ROLE_CHANGED,
          },
        });
        return { state: 'invalid' as const };
      }

      const rootSession = await transaction.authSession.findFirstOrThrow({
        where: { familyId: current.familyId, previousSessionId: null },
        select: { createdAt: true },
      });

      const rotated = await transaction.authSession.updateMany({
        where: { id: current.id, rotatedAt: null, revokedAt: null },
        data: {
          rotatedAt: now,
          lastUsedAt: now,
          lastIpHash: this.crypto.requestContextHash(context.ipAddress, 'ip'),
        },
      });
      if (rotated.count !== 1) return { state: 'invalid' as const };

      await transaction.authSession.create({
        data: {
          id: nextId,
          userId: current.userId,
          familyId: current.familyId,
          activeRole: current.activeRole,
          previousSessionId: current.id,
          refreshTokenHash: this.crypto.refreshTokenHash(nextRefreshToken),
          deviceFingerprintHash: current.deviceFingerprintHash,
          deviceName: current.deviceName,
          userAgentHash: this.crypto.requestContextHash(
            context.userAgent,
            'user-agent',
          ),
          createdIpHash: current.createdIpHash,
          lastIpHash: this.crypto.requestContextHash(context.ipAddress, 'ip'),
          expiresAt,
          lastUsedAt: now,
        },
      });

      return {
        state: 'ok' as const,
        familyId: current.familyId,
        familyCreatedAt: rootSession.createdAt,
        activeRole: current.activeRole,
        user: await this.loadAuthUser(transaction, current.userId),
      };
    });

    if (result.state !== 'ok') this.throwInvalidSession();
    try {
      return await this.buildIssuedSession(
        result.user,
        result.activeRole,
        result.familyId,
        nextRefreshToken,
        result.familyCreatedAt,
        expiresAt,
      );
    } catch (error) {
      await this.revokeFamily(
        result.familyId,
        SessionRevocationReason.ADMINISTRATIVE,
      );
      throw error;
    }
  }

  async authenticateAccessToken(token: string): Promise<TokenPrincipal> {
    try {
      const claims = await this.accessTokens.verify(token);
      const current = await this.prisma.authSession.findFirst({
        where: {
          familyId: claims.sid,
          userId: claims.sub,
          rotatedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: { include: { roles: true } } },
      });
      if (!current || current.user.deletedAt)
        throw new Error('Session is not active');
      if (
        current.user.status === UserStatus.BLOCKED ||
        current.user.status === UserStatus.CLOSED
      ) {
        throw new Error('Account is restricted');
      }
      const roles = current.user.roles.map((role) => role.role) as UserRole[];
      if (
        !roles.includes(claims.activeRole) ||
        current.activeRole !== claims.activeRole
      ) {
        throw new Error('Role is no longer granted');
      }

      return {
        userId: current.userId,
        sessionId: current.familyId,
        activeRole: claims.activeRole,
        roles,
        status: current.user.status,
      };
    } catch {
      throw new AppException(
        'AUTH_TOKEN_INVALID',
        HttpStatus.UNAUTHORIZED,
        'Authentication is required.',
      );
    }
  }

  async getPrincipal(
    actor: AuthenticatedActor,
  ): Promise<AuthenticatedPrincipal> {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: {
        roles: true,
        customerProfile: true,
        professionalProfile: true,
        adminProfile: true,
      },
    });
    if (!user || user.deletedAt) {
      throw new AppException(
        'RESOURCE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Profile not found.',
      );
    }
    return this.buildPrincipal(user, actor.activeRole);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const parsed = this.parseRefreshToken(refreshToken);
      const session = await this.prisma.authSession.findUnique({
        where: { id: parsed.id },
      });
      if (
        !session ||
        !this.crypto.secureEqualsHex(
          session.refreshTokenHash,
          this.crypto.refreshTokenHash(refreshToken),
        )
      )
        return;
      await this.revokeFamily(session.familyId, SessionRevocationReason.LOGOUT);
    } catch {
      return;
    }
  }

  async logoutAll(actor: AuthenticatedActor): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId: actor.userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revocationReason: SessionRevocationReason.LOGOUT_ALL,
      },
    });
  }

  async listSessions(actor: AuthenticatedActor): Promise<AuthSessionSummary[]> {
    const sessions = await this.prisma.authSession.findMany({
      where: {
        userId: actor.userId,
        rotatedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (sessions.length === 0) return [];
    const roots = await this.prisma.authSession.findMany({
      where: {
        familyId: { in: sessions.map((session) => session.familyId) },
        previousSessionId: null,
      },
      select: { familyId: true, createdAt: true },
    });
    const familyCreatedAt = new Map(
      roots.map((session) => [session.familyId, session.createdAt] as const),
    );
    return sessions.map((session) =>
      AuthSessionSummarySchema.parse({
        id: session.familyId,
        createdAt: (
          familyCreatedAt.get(session.familyId) ?? session.createdAt
        ).toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }),
    );
  }

  async revokeOwnedSession(
    actor: AuthenticatedActor,
    familyId: string,
  ): Promise<void> {
    const result = await this.prisma.authSession.updateMany({
      where: { userId: actor.userId, familyId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revocationReason: SessionRevocationReason.LOGOUT,
      },
    });
    if (result.count === 0) {
      throw new AppException(
        'RESOURCE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Session not found.',
      );
    }
  }

  private async buildIssuedSession(
    user: AuthUser,
    activeRole: OtpAuthRole,
    familyId: string,
    refreshToken: string,
    createdAt: Date,
    expiresAt: Date,
  ): Promise<IssuedSession> {
    const roles = user.roles.map((role) => role.role) as UserRole[];
    const accessToken = await this.accessTokens.issue({
      userId: user.id,
      sessionId: familyId,
      activeRole,
      roles,
    });
    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
      refreshToken,
      session: {
        id: familyId,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      principal: this.buildPrincipal(user, activeRole),
    };
  }

  private buildPrincipal(
    user: AuthUser,
    activeRole: OtpAuthRole,
  ): AuthenticatedPrincipal {
    const base = {
      user: {
        id: user.id,
        mobileNumberMasked: this.crypto.maskMobile(
          this.crypto.decryptMobile(user.mobileNumberCiphertext),
        ),
        status: user.status,
        roles: user.roles.map((role) => role.role),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      activeRole,
    };

    if (activeRole === Role.CUSTOMER && user.customerProfile) {
      return AuthenticatedPrincipalSchema.parse({
        ...base,
        profile: {
          id: user.customerProfile.id,
          role: Role.CUSTOMER,
          displayName: user.customerProfile.displayName,
          profileComplete: Boolean(user.customerProfile.displayName),
        },
      });
    }
    if (activeRole === Role.PROFESSIONAL && user.professionalProfile) {
      return AuthenticatedPrincipalSchema.parse({
        ...base,
        profile: {
          id: user.professionalProfile.id,
          role: Role.PROFESSIONAL,
          displayName: user.professionalProfile.displayName,
          profileComplete: Boolean(
            user.professionalProfile.displayName &&
            user.professionalProfile.biography,
          ),
          verificationStatus: user.professionalProfile.verificationStatus,
        },
      });
    }
    if (isOperationalRole(activeRole) && user.adminProfile) {
      return AuthenticatedPrincipalSchema.parse({
        ...base,
        profile: {
          id: user.adminProfile.id,
          role: activeRole,
          displayName: user.adminProfile.displayName,
          profileComplete: Boolean(user.adminProfile.displayName),
        },
      });
    }

    throw new Error('Authenticated profile is missing');
  }

  private async ensureProfile(
    transaction: Prisma.TransactionClient,
    userId: string,
    activeRole: OtpAuthRole,
  ): Promise<void> {
    if (activeRole === Role.CUSTOMER) {
      await transaction.customerProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    } else if (activeRole === Role.PROFESSIONAL) {
      await transaction.professionalProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    } else {
      await transaction.adminProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }
  }

  private loadAuthUser(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<AuthUser> {
    return transaction.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: true,
        customerProfile: true,
        professionalProfile: true,
        adminProfile: true,
      },
    });
  }

  private parseRefreshToken(token: string): { id: string } {
    if (token.length > 512) this.throwInvalidSession();
    const [id, secret, extra] = token.split('.');
    if (
      !id ||
      !secret ||
      extra ||
      !/^[0-9a-f-]{36}$/i.test(id) ||
      !/^[A-Za-z0-9_-]{43}$/.test(secret)
    ) {
      this.throwInvalidSession();
    }
    return { id };
  }

  private async revokeFamily(
    familyId: string,
    reason: (typeof SessionRevocationReason)[keyof typeof SessionRevocationReason],
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revocationReason: reason },
    });
  }

  private async runSerializable<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        const isRetryable =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2034';
        if (!isRetryable || attempt === 3) throw error;
      }
    }
    throw new Error('Serializable transaction retry budget exhausted');
  }

  private throwInvalidOtp(): never {
    throw new AppException(
      'AUTH_INVALID_OR_EXPIRED_OTP',
      HttpStatus.UNAUTHORIZED,
      INVALID_OTP_MESSAGE,
    );
  }

  private throwInvalidSession(): never {
    throw new AppException(
      'AUTH_SESSION_INVALID',
      HttpStatus.UNAUTHORIZED,
      'The session is invalid or no longer available.',
    );
  }
}
