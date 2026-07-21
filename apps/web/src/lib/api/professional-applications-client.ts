import {
  ProfessionalApplicationAcceptedSchema,
  ProfessionalApplicationInputSchema,
  type ProfessionalApplicationAccepted,
} from '@beautyathome/marketplace';

import { publicJsonRequest } from '@/lib/api/api-client';

export function submitProfessionalApplication(
  payload: unknown,
): Promise<ProfessionalApplicationAccepted> {
  const request = ProfessionalApplicationInputSchema.parse(payload);
  return publicJsonRequest(
    '/professional-applications',
    { method: 'POST', body: JSON.stringify(request) },
    (value) => ProfessionalApplicationAcceptedSchema.parse(value),
  );
}
