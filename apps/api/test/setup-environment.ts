import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unused-for-http-shell-test',
  CORS_ORIGINS: 'http://localhost:3000',
  JWT_PRIVATE_KEY_BASE64: Buffer.from(
    privateKey.export({ format: 'pem', type: 'pkcs8' }),
  ).toString('base64'),
  JWT_PUBLIC_KEY_BASE64: Buffer.from(
    publicKey.export({ format: 'pem', type: 'spki' }),
  ).toString('base64'),
  OTP_DELIVERY_MODE: 'development',
  OTP_DEV_CODE: '123456',
  OTP_HMAC_SECRET: 'e2e-otp-hmac-secret-value-that-is-unique-0001',
  SESSION_TOKEN_SECRET: 'e2e-session-secret-value-that-is-unique-0002',
  PII_LOOKUP_SECRET: 'e2e-lookup-secret-value-that-is-unique-0003',
  REQUEST_CONTEXT_SECRET: 'e2e-context-secret-value-that-is-unique-0004',
  PII_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64'),
});
