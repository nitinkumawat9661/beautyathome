import { generateKeyPairSync, randomBytes } from 'node:crypto';

import {
  isAllowedCorsOrigin,
  parseCorsOrigins,
  validateEnvironment,
} from './environment';

function generateRsaEnvironmentKeys(): {
  privateKeyBase64: string;
  publicKeyBase64: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  return {
    privateKeyBase64: Buffer.from(
      privateKey.export({ format: 'pem', type: 'pkcs8' }),
    ).toString('base64'),
    publicKeyBase64: Buffer.from(
      publicKey.export({ format: 'pem', type: 'spki' }),
    ).toString('base64'),
  };
}

function validDevelopmentEnvironment(): Record<string, string> {
  const keys = generateRsaEnvironmentKeys();

  return {
    NODE_ENV: 'development',
    API_PORT: '4000',
    DATABASE_URL:
      'postgresql://beautyathome:beautyathome@localhost:5432/beautyathome',
    CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
    TRUST_PROXY: 'false',
    JWT_PRIVATE_KEY_BASE64: keys.privateKeyBase64,
    JWT_PUBLIC_KEY_BASE64: keys.publicKeyBase64,
    JWT_KEY_ID: 'test-key',
    JWT_ISSUER: 'beautyathome-api-test',
    JWT_AUDIENCE: 'beautyathome-web-test',
    JWT_ACCESS_TTL_SECONDS: '900',
    REFRESH_TOKEN_TTL_SECONDS: '2592000',
    REFRESH_COOKIE_NAME: 'bah_refresh',
    REFRESH_COOKIE_SAME_SITE: 'lax',
    COOKIE_SECURE: 'false',
    OTP_DELIVERY_MODE: 'development',
    OTP_DEV_CODE: '123456',
    OTP_CODE_LENGTH: '6',
    OTP_TTL_SECONDS: '300',
    OTP_MAX_ATTEMPTS: '5',
    OTP_REQUEST_COOLDOWN_SECONDS: '60',
    OTP_HMAC_SECRET: 'otp-hmac-secret-value-that-is-unique-0001',
    SESSION_TOKEN_SECRET: 'session-token-secret-that-is-unique-0002',
    PII_LOOKUP_SECRET: 'pii-lookup-secret-value-that-is-unique-0003',
    REQUEST_CONTEXT_SECRET: 'request-context-secret-that-is-unique-0004',
    PII_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64'),
    PII_ENCRYPTION_KEY_VERSION: 'test-v1',
  };
}

describe('validateEnvironment', () => {
  it('accepts a complete safe development environment', () => {
    const result = validateEnvironment(validDevelopmentEnvironment());

    expect(result).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 4000,
      COOKIE_SECURE: false,
      OTP_CODE_LENGTH: 6,
      OTP_MAX_ATTEMPTS: 5,
      TRUST_PROXY: false,
    });
  });

  it('rejects unsafe production origins, cookies, and development OTP delivery', () => {
    const environment = {
      ...validDevelopmentEnvironment(),
      NODE_ENV: 'production',
      CORS_ORIGINS: 'http://beautyathome.example',
      COOKIE_SECURE: 'false',
      OTP_DELIVERY_MODE: 'development',
    };

    expect(() => validateEnvironment(environment)).toThrow(
      /production origins must use HTTPS/,
    );
    expect(() => validateEnvironment(environment)).toThrow(
      /Development OTP delivery is forbidden in production/,
    );
    expect(() => validateEnvironment(environment)).toThrow(
      /Refresh cookies must be secure in production/,
    );
  });

  it('allows development OTP delivery only for an explicit Vercel preview', () => {
    const result = validateEnvironment({
      ...validDevelopmentEnvironment(),
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      CORS_ORIGINS: 'https://beautyathome-web-preview.vercel.app',
      CORS_PREVIEW_PROJECT: 'beautyathome-web-preview',
      COOKIE_SECURE: 'true',
      REFRESH_COOKIE_SAME_SITE: 'none',
    });

    expect(result.VERCEL_ENV).toBe('preview');
  });

  it('rejects a wildcard CORS origin', () => {
    expect(() =>
      validateEnvironment({
        ...validDevelopmentEnvironment(),
        CORS_ORIGINS: '*',
      }),
    ).toThrow(/explicit web origin is required/);
  });

  it('rejects reuse of a secret across authentication purposes', () => {
    const environment = validDevelopmentEnvironment();
    environment.SESSION_TOKEN_SECRET = environment.OTP_HMAC_SECRET;

    expect(() => validateEnvironment(environment)).toThrow(
      /Authentication secrets must use separate values/,
    );
  });

  it('rejects a public key that does not match the configured private key', () => {
    const environment = validDevelopmentEnvironment();
    environment.JWT_PUBLIC_KEY_BASE64 =
      generateRsaEnvironmentKeys().publicKeyBase64;

    expect(() => validateEnvironment(environment)).toThrow(
      /JWT keys must be a matching base64-encoded RSA PEM key pair/,
    );
  });

  it('rejects SameSite=None when secure cookies are disabled', () => {
    expect(() =>
      validateEnvironment({
        ...validDevelopmentEnvironment(),
        REFRESH_COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/SameSite=None requires secure cookies/);
  });

  it('rejects an encryption key that is not exactly 32 bytes', () => {
    expect(() =>
      validateEnvironment({
        ...validDevelopmentEnvironment(),
        PII_ENCRYPTION_KEY_BASE64: randomBytes(16).toString('base64'),
      }),
    ).toThrow(/PII encryption key must be a base64-encoded 32-byte key/);
  });
});

describe('parseCorsOrigins', () => {
  it('trims entries and removes empty values', () => {
    expect(
      parseCorsOrigins(' https://app.example.com, ,https://admin.example.com '),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });
});

describe('isAllowedCorsOrigin', () => {
  it('allows only the configured Vercel project during preview deployments', () => {
    expect(
      isAllowedCorsOrigin(
        'https://beautyathome-web-preview-abc.vercel.app',
        [],
        'preview',
        'beautyathome-web-preview',
      ),
    ).toBe(true);
    expect(
      isAllowedCorsOrigin(
        'https://other-project-abc.vercel.app',
        [],
        'preview',
        'beautyathome-web-preview',
      ),
    ).toBe(false);
  });
});
