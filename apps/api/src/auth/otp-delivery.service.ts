import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment';

export interface OtpDeliveryResult {
  delivered: boolean;
  providerReference?: string;
}

@Injectable()
export class OtpDeliveryService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  getCode(): string {
    const mode = this.config.get('OTP_DELIVERY_MODE', { infer: true });
    if (mode === 'development') {
      return this.config.get('OTP_DEV_CODE', { infer: true }) ?? '';
    }

    return Array.from(
      { length: this.config.get('OTP_CODE_LENGTH', { infer: true }) },
      () => String(randomInt(0, 10)),
    ).join('');
  }

  deliver(mobileNumber: string, otp: string): Promise<OtpDeliveryResult> {
    void mobileNumber;
    void otp;
    if (
      this.config.get('OTP_DELIVERY_MODE', { infer: true }) === 'development'
    ) {
      return Promise.resolve({
        delivered: true,
        providerReference: 'development-fixed-code',
      });
    }

    return Promise.resolve({ delivered: false });
  }
}
import { randomInt } from 'node:crypto';
