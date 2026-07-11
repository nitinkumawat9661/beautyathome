import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';

import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment';
import { AccessTokenService } from './access-token.service';

jest.mock('@beautyathome/auth', () => ({
  AccessTokenClaimsSchema: {
    parse: (claims: unknown) => claims,
  },
}));

function createFixture(): {
  service: AccessTokenService;
  jwt: JwtService;
  environment: Environment;
  privateKey: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const privateKeyPem = privateKey
    .export({
      format: 'pem',
      type: 'pkcs8',
    })
    .toString();
  const publicKeyPem = publicKey
    .export({
      format: 'pem',
      type: 'spki',
    })
    .toString();
  const environment = {
    NODE_ENV: 'test',
    API_PORT: 4000,
    DATABASE_URL: 'postgresql://unused',
    CORS_ORIGINS: 'http://localhost:3000',
    TRUST_PROXY: false,
    JWT_PRIVATE_KEY_BASE64: Buffer.from(privateKeyPem).toString('base64'),
    JWT_PUBLIC_KEY_BASE64: Buffer.from(publicKeyPem).toString('base64'),
    JWT_KEY_ID: 'unit-test-key',
    JWT_ISSUER: 'beautyathome-api-test',
    JWT_AUDIENCE: 'beautyathome-web-test',
    JWT_ACCESS_TTL_SECONDS: 900,
    STEP_UP_TTL_SECONDS: 600,
    REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
    REFRESH_COOKIE_NAME: 'bah_refresh',
    REFRESH_COOKIE_SAME_SITE: 'lax',
    COOKIE_SECURE: false,
    OTP_DELIVERY_MODE: 'development',
    OTP_DEV_CODE: '123456',
    OTP_CODE_LENGTH: 6,
    OTP_TTL_SECONDS: 300,
    OTP_MAX_ATTEMPTS: 5,
    OTP_REQUEST_COOLDOWN_SECONDS: 60,
    OTP_HMAC_SECRET: 'otp-hmac-secret-value-that-is-unique-0001',
    SESSION_TOKEN_SECRET: 'session-token-secret-that-is-unique-0002',
    PII_LOOKUP_SECRET: 'pii-lookup-secret-value-that-is-unique-0003',
    REQUEST_CONTEXT_SECRET: 'request-context-secret-that-is-unique-0004',
    PII_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64'),
    PII_ENCRYPTION_KEY_VERSION: 'test-v1',
  } satisfies Environment;
  const config = {
    get: jest.fn((name: keyof Environment) => environment[name]),
  } as unknown as ConfigService<Environment, true>;
  const jwt = new JwtService();

  return {
    service: new AccessTokenService(jwt, config),
    jwt,
    environment,
    privateKey: privateKeyPem,
  };
}

describe('AccessTokenService', () => {
  it('issues and verifies an RS256 access token with the configured key id', async () => {
    const { service } = createFixture();
    const userId = randomUUID();
    const sessionId = randomUUID();

    const issued = await service.issue({
      userId,
      sessionId,
      activeRole: 'CUSTOMER',
      roles: ['CUSTOMER'],
    });
    const header = JSON.parse(
      Buffer.from(issued.token.split('.')[0] ?? '', 'base64url').toString(),
    ) as Record<string, unknown>;
    const claims = await service.verify(issued.token);

    expect(header).toMatchObject({
      alg: 'RS256',
      kid: 'unit-test-key',
      typ: 'JWT',
    });
    expect(claims).toMatchObject({
      tokenUse: 'access',
      sub: userId,
      sid: sessionId,
      activeRole: 'CUSTOMER',
      roles: ['CUSTOMER'],
    });
    expect(claims).not.toHaveProperty('mobileNumber');
  });

  it('rejects a token signed with a symmetric algorithm', async () => {
    const { service, jwt, environment } = createFixture();
    const token = await jwt.signAsync(
      {
        tokenUse: 'access',
        sid: randomUUID(),
        activeRole: 'CUSTOMER',
        roles: ['CUSTOMER'],
      },
      {
        algorithm: 'HS256',
        secret: 'test-only-symmetric-secret',
        keyid: environment.JWT_KEY_ID,
        issuer: environment.JWT_ISSUER,
        audience: environment.JWT_AUDIENCE,
        subject: randomUUID(),
        expiresIn: 900,
      },
    );

    await expect(service.verify(token)).rejects.toThrow(
      /Unsupported access token header/,
    );
  });

  it('rejects an otherwise valid token with an unknown key id', async () => {
    const { service, jwt, environment, privateKey } = createFixture();
    const token = await jwt.signAsync(
      {
        tokenUse: 'access',
        sid: randomUUID(),
        activeRole: 'CUSTOMER',
        roles: ['CUSTOMER'],
      },
      {
        algorithm: 'RS256',
        privateKey,
        keyid: 'retired-or-unknown-key',
        issuer: environment.JWT_ISSUER,
        audience: environment.JWT_AUDIENCE,
        subject: randomUUID(),
        expiresIn: 900,
      },
    );

    await expect(service.verify(token)).rejects.toThrow(
      /Unsupported access token header/,
    );
  });

  it('rejects a token issued for a different audience', async () => {
    const { service, jwt, environment, privateKey } = createFixture();
    const token = await jwt.signAsync(
      {
        tokenUse: 'access',
        sid: randomUUID(),
        activeRole: 'CUSTOMER',
        roles: ['CUSTOMER'],
      },
      {
        algorithm: 'RS256',
        privateKey,
        keyid: environment.JWT_KEY_ID,
        issuer: environment.JWT_ISSUER,
        audience: 'another-application',
        subject: randomUUID(),
        expiresIn: 900,
      },
    );

    await expect(service.verify(token)).rejects.toThrow();
  });
});
