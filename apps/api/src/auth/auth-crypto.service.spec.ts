import { randomBytes, randomUUID } from 'node:crypto';

import type { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment';
import { AuthCryptoService } from './auth-crypto.service';

function createConfig(): ConfigService<Environment, true> {
  const values: Partial<Environment> = {
    PII_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64'),
    OTP_HMAC_SECRET: 'otp-hmac-secret-value-that-is-unique-0001',
    SESSION_TOKEN_SECRET: 'session-token-secret-that-is-unique-0002',
    PII_LOOKUP_SECRET: 'pii-lookup-secret-value-that-is-unique-0003',
    REQUEST_CONTEXT_SECRET: 'request-context-secret-that-is-unique-0004',
  };

  return {
    get: jest.fn((name: keyof Environment) => values[name]),
  } as unknown as ConfigService<Environment, true>;
}

describe('AuthCryptoService', () => {
  let crypto: AuthCryptoService;

  beforeEach(() => {
    crypto = new AuthCryptoService(createConfig());
  });

  it('encrypts and decrypts a mobile number with randomized authenticated encryption', () => {
    const mobileNumber = '+919876543210';
    const first = crypto.encryptMobile(mobileNumber);
    const second = crypto.encryptMobile(mobileNumber);

    expect(first).not.toBe(second);
    expect(first).not.toContain(mobileNumber);
    expect(crypto.decryptMobile(first)).toBe(mobileNumber);
    expect(crypto.decryptMobile(second)).toBe(mobileNumber);
  });

  it('rejects a tampered encrypted mobile payload', () => {
    const parts = crypto.encryptMobile('+919876543210').split('.');
    const ciphertext = parts[3];
    if (!ciphertext) throw new Error('Expected encrypted ciphertext');
    parts[3] = `${ciphertext[0] === 'A' ? 'B' : 'A'}${ciphertext.slice(1)}`;

    expect(() => crypto.decryptMobile(parts.join('.'))).toThrow();
  });

  it('creates a stable lookup digest without exposing the mobile number', () => {
    const mobileNumber = '+919876543210';
    const lookup = crypto.mobileLookup(mobileNumber);

    expect(lookup).toMatch(/^[0-9a-f]{64}$/);
    expect(lookup).toBe(crypto.mobileLookup(mobileNumber));
    expect(lookup).not.toContain(mobileNumber);
    expect(lookup).not.toBe(crypto.mobileLookup('+919876543211'));
  });

  it('binds an OTP digest to challenge, mobile, purpose, and role', () => {
    const challengeId = randomUUID();
    const context = {
      mobileNumber: '+919876543210',
      purpose: 'SIGN_IN' as const,
      role: 'CUSTOMER' as const,
    };
    const digest = crypto.otpDigest(challengeId, context, '123456');

    expect(digest).toBe(crypto.otpDigest(challengeId, context, '123456'));
    expect(digest).not.toBe(crypto.otpDigest(randomUUID(), context, '123456'));
    expect(digest).not.toBe(
      crypto.otpDigest(
        challengeId,
        { ...context, mobileNumber: '+919876543211' },
        '123456',
      ),
    );
    expect(digest).not.toBe(
      crypto.otpDigest(
        challengeId,
        { ...context, purpose: 'SIGN_UP' },
        '123456',
      ),
    );
    expect(digest).not.toBe(
      crypto.otpDigest(
        challengeId,
        { ...context, role: 'PROFESSIONAL' },
        '123456',
      ),
    );
  });

  it('hashes refresh credentials deterministically and independently', () => {
    const first = crypto.refreshTokenHash('session-id.first-secret');
    const second = crypto.refreshTokenHash('session-id.second-secret');

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toBe(crypto.refreshTokenHash('session-id.first-secret'));
    expect(first).not.toBe(second);
    expect(crypto.secureEqualsHex(first, first)).toBe(true);
    expect(crypto.secureEqualsHex(first, second)).toBe(false);
  });

  it('rejects malformed values before constant-time digest comparison', () => {
    const digest = crypto.refreshTokenHash('refresh-token');

    expect(crypto.secureEqualsHex(digest, 'not-a-digest')).toBe(false);
    expect(crypto.secureEqualsHex(digest.toUpperCase(), digest)).toBe(false);
  });

  it('generates independent 256-bit refresh secrets', () => {
    const first = crypto.randomRefreshSecret();
    const second = crypto.randomRefreshSecret();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });

  it('hashes request context by namespace and omits blank values', () => {
    const ipHash = crypto.requestContextHash(' 127.0.0.1 ', 'ip');

    expect(ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(ipHash).not.toBe(crypto.requestContextHash('127.0.0.1', 'device'));
    expect(crypto.requestContextHash('  ', 'ip')).toBeUndefined();
    expect(crypto.requestContextHash(undefined, 'ip')).toBeUndefined();
  });

  it('returns only the approved masked mobile representation', () => {
    expect(crypto.maskMobile('+919876543210')).toBe('+91******3210');
  });
});
