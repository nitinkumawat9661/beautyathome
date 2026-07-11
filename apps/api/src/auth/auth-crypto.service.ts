import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { decodeBase64, type Environment } from '../config/environment';
import type { OtpContext } from './auth.types';

@Injectable()
export class AuthCryptoService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly config: ConfigService<Environment, true>) {
    this.encryptionKey = decodeBase64(
      this.config.get('PII_ENCRYPTION_KEY_BASE64', { infer: true }),
      'PII_ENCRYPTION_KEY_BASE64',
    );
  }

  mobileLookup(mobileNumber: string): string {
    return this.hmac('PII_LOOKUP_SECRET', `mobile:${mobileNumber}`);
  }

  otpDigest(challengeId: string, context: OtpContext, otp: string): string {
    return this.hmac(
      'OTP_HMAC_SECRET',
      [
        'auth-otp-v1',
        challengeId,
        this.mobileLookup(context.mobileNumber),
        context.purpose,
        context.role,
        otp,
      ].join(':'),
    );
  }

  refreshTokenHash(token: string): string {
    return this.hmac('SESSION_TOKEN_SECRET', `refresh:v1:${token}`);
  }

  requestContextHash(
    value: string | undefined,
    namespace: string,
  ): string | undefined {
    const normalized = value?.trim();
    return normalized
      ? this.hmac('REQUEST_CONTEXT_SECRET', `${namespace}:${normalized}`)
      : undefined;
  }

  encryptMobile(mobileNumber: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(mobileNumber, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      'aes-256-gcm',
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decryptMobile(payload: string): string {
    const [algorithm, encodedIv, encodedTag, encodedCiphertext, extra] =
      payload.split('.');
    if (
      algorithm !== 'aes-256-gcm' ||
      !encodedIv ||
      !encodedTag ||
      !encodedCiphertext ||
      extra
    ) {
      throw new Error('Unsupported encrypted mobile payload');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(encodedIv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  maskMobile(mobileNumber: string): string {
    return `+91******${mobileNumber.slice(-4)}`;
  }

  secureEqualsHex(left: string, right: string): boolean {
    if (!/^[0-9a-f]{64}$/.test(left) || !/^[0-9a-f]{64}$/.test(right))
      return false;
    return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
  }

  randomRefreshSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  private hmac(
    secretName:
      | 'OTP_HMAC_SECRET'
      | 'SESSION_TOKEN_SECRET'
      | 'PII_LOOKUP_SECRET'
      | 'REQUEST_CONTEXT_SECRET',
    value: string,
  ): string {
    return createHmac('sha256', this.config.get(secretName, { infer: true }))
      .update(value)
      .digest('hex');
  }
}
