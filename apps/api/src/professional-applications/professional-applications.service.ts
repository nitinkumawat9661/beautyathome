import { randomUUID } from 'node:crypto';

import {
  ProfessionalApplicationAcceptedSchema,
  type ProfessionalApplicationAccepted,
  type ProfessionalApplicationInput,
} from '@beautyathome/marketplace';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthCryptoService } from '../auth/auth-crypto.service';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma/prisma.service';

interface StoredApplication {
  referenceId: string;
  submittedAt: Date;
}

@Injectable()
export class ProfessionalApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: AuthCryptoService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async submit(
    input: ProfessionalApplicationInput,
  ): Promise<ProfessionalApplicationAccepted> {
    const referenceId = randomUUID();
    const mobileLookupHash = this.crypto.mobileLookup(input.mobileNumber);
    const mobileNumberCiphertext = this.crypto.encryptMobile(
      input.mobileNumber,
    );
    const mobileNumberEncryptionKeyVersion = this.config.get(
      'PII_ENCRYPTION_KEY_VERSION',
      {
        infer: true,
      },
    );
    const servicesJson = JSON.stringify(input.services);

    const applications = await this.prisma.$queryRaw<StoredApplication[]>`
      WITH inserted AS (
        INSERT INTO professional_interest_applications (
          public_reference_id,
          full_name,
          mobile_number_ciphertext,
          mobile_number_lookup_hash,
          mobile_number_encryption_key_version,
          city,
          experience_band,
          services,
          coverage,
          work_summary,
          consented_at,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${referenceId}::uuid,
          ${input.fullName},
          ${mobileNumberCiphertext},
          ${mobileLookupHash},
          ${mobileNumberEncryptionKeyVersion},
          ${input.city},
          ${input.experienceBand}::professional_experience_band,
          CAST(${servicesJson} AS jsonb),
          ${input.coverage},
          ${input.workSummary},
          CURRENT_TIMESTAMP,
          'SUBMITTED'::professional_interest_status,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (mobile_number_lookup_hash) DO UPDATE
        SET
          public_reference_id = EXCLUDED.public_reference_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING public_reference_id, updated_at
      )
      SELECT public_reference_id AS "referenceId", updated_at AS "submittedAt"
      FROM inserted
    `;

    const application = applications[0];
    if (!application) {
      throw new Error('Professional application could not be persisted');
    }

    return ProfessionalApplicationAcceptedSchema.parse({
      accepted: true,
      referenceId: application.referenceId,
      submittedAt: application.submittedAt.toISOString(),
    });
  }
}
