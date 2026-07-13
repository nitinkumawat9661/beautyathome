import {
  AuthSessionIdSchema,
  OtpRequestSchema,
  OtpVerifyRequestSchema,
  OtpVerifyResponseSchema,
  type OtpRequest,
  type OtpVerifyRequest,
  type OtpVerifyResponse,
} from '@beautyathome/auth';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';

import { AllowedAccountStatuses } from '../common/decorators/account-statuses.decorator';
import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AppException } from '../common/errors/app.exception';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type {
  AuthenticatedActor,
  RequestWithContext,
} from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import { AuthService } from './auth.service';
import type { IssuedSession, RequestContext } from './auth.types';
import { OriginGuard } from './guards/origin.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/request')
  @HttpCode(HttpStatus.ACCEPTED)
  requestOtp(
    @Body(new ZodValidationPipe(OtpRequestSchema)) input: OtpRequest,
    @Req() request: RequestWithContext,
  ) {
    this.assertSelfServiceRole(input);
    return this.auth.requestOtp(input, this.requestContext(request));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('otp/verify')
  async verifyOtp(
    @Body(new ZodValidationPipe(OtpVerifyRequestSchema))
    input: OtpVerifyRequest,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<OtpVerifyResponse> {
    this.assertSelfServiceRole(input);
    const session = await this.auth.verifyOtp(
      input,
      this.requestContext(request),
    );
    this.setRefreshCookie(response, session.refreshToken);
    return this.publicSession(session);
  }

  @Public()
  @UseGuards(OriginGuard)
  @Post('token/refresh')
  async refresh(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<OtpVerifyResponse> {
    const refreshToken = this.readRefreshCookie(request);
    const session = await this.auth.refresh(
      refreshToken,
      this.requestContext(request),
    );
    this.setRefreshCookie(response, session.refreshToken);
    return this.publicSession(session);
  }

  @Public()
  @UseGuards(OriginGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(this.readRefreshCookieOptional(request));
    this.clearRefreshCookie(response);
  }

  @AllowedAccountStatuses('ACTIVE', 'SUSPENDED')
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentActor() actor: AuthenticatedActor,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logoutAll(actor);
    this.clearRefreshCookie(response);
  }

  @AllowedAccountStatuses('ACTIVE', 'SUSPENDED')
  @Get('sessions')
  listSessions(@CurrentActor() actor: AuthenticatedActor) {
    return this.auth.listSessions(actor);
  }

  @AllowedAccountStatuses('ACTIVE', 'SUSPENDED')
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSession(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('sessionId', new ZodValidationPipe(AuthSessionIdSchema))
    sessionId: string,
  ): Promise<void> {
    return this.auth.revokeOwnedSession(actor, sessionId);
  }

  private assertSelfServiceRole(input: OtpRequest | OtpVerifyRequest): void {
    if (input.purpose === 'SIGN_UP' && input.role !== 'CUSTOMER') {
      throw new AppException(
        'AUTH_ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'This account type must be provisioned by authorized platform operations.',
      );
    }
  }

  private requestContext(request: RequestWithContext): RequestContext {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      deviceFingerprint: request.header('x-device-fingerprint'),
      deviceName: request.header('x-device-name'),
    };
  }

  private publicSession(session: IssuedSession): OtpVerifyResponse {
    return OtpVerifyResponseSchema.parse({
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      session: session.session,
      principal: session.principal,
    });
  }

  private readRefreshCookie(request: RequestWithContext): string {
    const value = this.readRefreshCookieOptional(request);
    if (!value) return '';
    return value;
  }

  private readRefreshCookieOptional(
    request: RequestWithContext,
  ): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const value =
      cookies?.[this.config.get('REFRESH_COOKIE_NAME', { infer: true })];
    return typeof value === 'string' ? value : undefined;
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(
      this.config.get('REFRESH_COOKIE_NAME', { infer: true }),
      token,
      {
        ...this.cookieOptions(),
        maxAge:
          this.config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) * 1_000,
      },
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(
      this.config.get('REFRESH_COOKIE_NAME', { infer: true }),
      this.cookieOptions(),
    );
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: this.config.get('REFRESH_COOKIE_SAME_SITE', { infer: true }),
      path: '/api/v1/auth',
    };
  }
}
