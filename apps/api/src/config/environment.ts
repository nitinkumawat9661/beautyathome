import { createPrivateKey, createPublicKey } from 'node:crypto';

import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    DATABASE_URL: z.string().trim().min(1),
    CORS_ORIGINS: z.string().trim().default('http://localhost:3000'),
    TRUST_PROXY: booleanString,
    JWT_PRIVATE_KEY_BASE64: z.string().min(1),
    JWT_PUBLIC_KEY_BASE64: z.string().min(1),
    JWT_KEY_ID: z.string().trim().min(1).max(64).default('primary'),
    JWT_ISSUER: z.string().trim().min(1).max(512).default('beautyathome-api'),
    JWT_AUDIENCE: z.string().trim().min(1).max(512).default('beautyathome-web'),
    JWT_ACCESS_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(3_600)
      .default(900),
    STEP_UP_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(3_600)
      .default(600),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(3_600)
      .max(31_536_000)
      .default(2_592_000),
    REFRESH_COOKIE_NAME: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .default('bah_refresh'),
    REFRESH_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    COOKIE_SECURE: booleanString,
    OTP_DELIVERY_MODE: z
      .enum(['development', 'disabled'])
      .default('development'),
    OTP_DEV_CODE: z
      .string()
      .regex(/^\d{4,8}$/)
      .optional(),
    OTP_CODE_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
    OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    OTP_REQUEST_COOLDOWN_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .max(3_600)
      .default(60),
    OTP_HMAC_SECRET: z.string().min(32),
    SESSION_TOKEN_SECRET: z.string().min(32),
    PII_LOOKUP_SECRET: z.string().min(32),
    REQUEST_CONTEXT_SECRET: z.string().min(32),
    PII_ENCRYPTION_KEY_BASE64: z.string().min(1),
    PII_ENCRYPTION_KEY_VERSION: z.string().trim().min(1).max(64).default('v1'),
    PROFESSIONAL_ELIGIBILITY_POLICY_VERSION: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),
  })
  .superRefine((environment, context) => {
    const origins = parseCorsOrigins(environment.CORS_ORIGINS);

    if (origins.length === 0 || origins.includes('*')) {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'At least one explicit web origin is required',
      });
    }

    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (
          parsed.origin !== origin ||
          (environment.NODE_ENV === 'production' &&
            parsed.protocol !== 'https:')
        ) {
          throw new Error('invalid origin');
        }
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message:
            'Origins must be comma-separated URL origins; production origins must use HTTPS',
        });
        break;
      }
    }

    if (environment.OTP_DELIVERY_MODE === 'development') {
      if (environment.NODE_ENV === 'production') {
        context.addIssue({
          code: 'custom',
          path: ['OTP_DELIVERY_MODE'],
          message: 'Development OTP delivery is forbidden in production',
        });
      }

      if (!environment.OTP_DEV_CODE) {
        context.addIssue({
          code: 'custom',
          path: ['OTP_DEV_CODE'],
          message: 'OTP_DEV_CODE is required for development delivery',
        });
      }

      if (environment.OTP_DEV_CODE?.length !== environment.OTP_CODE_LENGTH) {
        context.addIssue({
          code: 'custom',
          path: ['OTP_DEV_CODE'],
          message: 'OTP_DEV_CODE length must match OTP_CODE_LENGTH',
        });
      }
    }

    if (environment.NODE_ENV === 'production') {
      if (environment.OTP_DELIVERY_MODE === 'disabled') {
        context.addIssue({
          code: 'custom',
          path: ['OTP_DELIVERY_MODE'],
          message: 'A reviewed production OTP provider must be configured',
        });
      }

      if (!environment.COOKIE_SECURE) {
        context.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'Refresh cookies must be secure in production',
        });
      }
    }

    if (
      environment.REFRESH_COOKIE_SAME_SITE === 'none' &&
      !environment.COOKIE_SECURE
    ) {
      context.addIssue({
        code: 'custom',
        path: ['REFRESH_COOKIE_SAME_SITE'],
        message: 'SameSite=None requires secure cookies',
      });
    }

    const secrets = [
      environment.OTP_HMAC_SECRET,
      environment.SESSION_TOKEN_SECRET,
      environment.PII_LOOKUP_SECRET,
      environment.REQUEST_CONTEXT_SECRET,
    ];
    if (new Set(secrets).size !== secrets.length) {
      context.addIssue({
        code: 'custom',
        path: ['OTP_HMAC_SECRET'],
        message: 'Authentication secrets must use separate values',
      });
    }

    if (
      environment.NODE_ENV === 'production' &&
      secrets.some((secret) =>
        /replace-with|development|change-me/i.test(secret),
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['OTP_HMAC_SECRET'],
        message:
          'Placeholder or development authentication secrets are forbidden in production',
      });
    }

    try {
      if (
        decodeBase64(
          environment.PII_ENCRYPTION_KEY_BASE64,
          'PII_ENCRYPTION_KEY_BASE64',
        ).length !== 32
      ) {
        throw new Error('invalid length');
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['PII_ENCRYPTION_KEY_BASE64'],
        message: 'PII encryption key must be a base64-encoded 32-byte key',
      });
    }

    try {
      const privateKey = createPrivateKey(
        decodePem(environment.JWT_PRIVATE_KEY_BASE64, 'JWT_PRIVATE_KEY_BASE64'),
      );
      const publicKey = createPublicKey(
        decodePem(environment.JWT_PUBLIC_KEY_BASE64, 'JWT_PUBLIC_KEY_BASE64'),
      );
      if (
        privateKey.asymmetricKeyType !== 'rsa' ||
        publicKey.asymmetricKeyType !== 'rsa' ||
        (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2_048
      ) {
        throw new Error('RSA key is too weak');
      }

      const derivedPublicKey = createPublicKey(privateKey).export({
        format: 'der',
        type: 'spki',
      });
      const configuredPublicKey = publicKey.export({
        format: 'der',
        type: 'spki',
      });
      if (!derivedPublicKey.equals(configuredPublicKey))
        throw new Error('key mismatch');
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['JWT_PRIVATE_KEY_BASE64'],
        message: 'JWT keys must be a matching base64-encoded RSA PEM key pair',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    const message = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  return result.data;
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function decodeBase64(value: string, name: string): Buffer {
  const decoded = Buffer.from(value, 'base64');
  if (
    decoded.length === 0 ||
    decoded.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')
  ) {
    throw new Error(`${name} must be valid base64`);
  }
  return decoded;
}

export function decodePem(value: string, name: string): string {
  const decoded = decodeBase64(value, name).toString('utf8');
  if (!decoded.includes('-----BEGIN'))
    throw new Error(`${name} must contain a PEM key`);
  return decoded;
}
