import { createHmac, timingSafeEqual } from 'node:crypto';

import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppException } from '../errors/app.exception';
import type { Environment } from '../../config/environment';

type CursorPayload = {
  version: 1;
  id: string;
  sortValue: string;
  fingerprint: string;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return (
      '{' +
      entries
        .map(([key, item]) => JSON.stringify(key) + ':' + stableJson(item))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

@Injectable()
export class CursorService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  fingerprint(value: unknown): string {
    return this.sign(stableJson(value)).slice(0, 22);
  }

  encode(input: Omit<CursorPayload, 'version'>): string {
    const payload = Buffer.from(
      JSON.stringify({ version: 1, ...input } satisfies CursorPayload),
    ).toString('base64url');
    return payload + '.' + this.sign(payload);
  }

  decode(value: string | undefined, fingerprint: string): CursorPayload | null {
    if (!value) return null;
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra || !this.matches(payload, signature)) {
      this.throwInvalidCursor();
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Partial<CursorPayload>;
      if (
        parsed.version !== 1 ||
        typeof parsed.id !== 'string' ||
        typeof parsed.sortValue !== 'string' ||
        parsed.fingerprint !== fingerprint
      ) {
        this.throwInvalidCursor();
      }
      return parsed as CursorPayload;
    } catch (error: unknown) {
      if (error instanceof AppException) throw error;
      this.throwInvalidCursor();
    }
  }

  private sign(value: string): string {
    return createHmac(
      'sha256',
      this.config.get('SESSION_TOKEN_SECRET', { infer: true }),
    )
      .update('marketplace-cursor:')
      .update(value)
      .digest('base64url');
  }

  private matches(payload: string, supplied: string): boolean {
    const expected = Buffer.from(this.sign(payload));
    const received = Buffer.from(supplied);
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }

  private throwInvalidCursor(): never {
    throw new AppException(
      'REQUEST_VALIDATION_FAILED',
      HttpStatus.BAD_REQUEST,
      'The pagination cursor is invalid for this request.',
      [
        {
          field: 'after',
          reason: 'Use the cursor returned by the same list query.',
        },
      ],
    );
  }
}
