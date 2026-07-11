import { randomUUID } from 'node:crypto';

import {
  AccessTokenClaimsSchema,
  type AccessTokenClaims,
  type OtpAuthRole,
  type UserRole,
} from '@beautyathome/auth';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { decodePem, type Environment } from '../config/environment';

interface AccessTokenInput {
  userId: string;
  sessionId: string;
  activeRole: OtpAuthRole;
  roles: UserRole[];
}

interface IssuedAccessToken {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AccessTokenService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
  ) {
    this.privateKey = decodePem(
      this.config.get('JWT_PRIVATE_KEY_BASE64', { infer: true }),
      'JWT_PRIVATE_KEY_BASE64',
    );
    this.publicKey = decodePem(
      this.config.get('JWT_PUBLIC_KEY_BASE64', { infer: true }),
      'JWT_PUBLIC_KEY_BASE64',
    );
  }

  async issue(input: AccessTokenInput): Promise<IssuedAccessToken> {
    const ttlSeconds = this.config.get('JWT_ACCESS_TTL_SECONDS', {
      infer: true,
    });
    const token = await this.jwt.signAsync(
      {
        tokenUse: 'access',
        sid: input.sessionId,
        activeRole: input.activeRole,
        roles: input.roles,
      },
      {
        algorithm: 'RS256',
        privateKey: this.privateKey,
        keyid: this.config.get('JWT_KEY_ID', { infer: true }),
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        subject: input.userId,
        jwtid: randomUUID(),
        expiresIn: ttlSeconds,
      },
    );

    return { token, expiresAt: new Date(Date.now() + ttlSeconds * 1_000) };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    this.assertHeader(token);
    const claims: unknown = await this.jwt.verifyAsync(token, {
      algorithms: ['RS256'],
      publicKey: this.publicKey,
      issuer: this.config.get('JWT_ISSUER', { infer: true }),
      audience: this.config.get('JWT_AUDIENCE', { infer: true }),
    });
    return AccessTokenClaimsSchema.parse(claims);
  }

  private assertHeader(token: string): void {
    if (token.length > 8_192) throw new Error('Access token is too long');
    const [encodedHeader, payload, signature, extra] = token.split('.');
    if (!encodedHeader || !payload || !signature || extra)
      throw new Error('Malformed access token');

    const decoded: unknown = JSON.parse(
      Buffer.from(encodedHeader, 'base64url').toString('utf8'),
    );
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('alg' in decoded) ||
      decoded.alg !== 'RS256' ||
      !('kid' in decoded) ||
      decoded.kid !== this.config.get('JWT_KEY_ID', { infer: true }) ||
      ('typ' in decoded && decoded.typ !== 'JWT')
    ) {
      throw new Error('Unsupported access token header');
    }
  }
}
