import {
  CityIdSchema,
  CursorPaginationQuerySchema,
  MasterServiceIdSchema,
  ProfessionalServiceIdSchema,
  QueryPageLimitSchema,
  ServiceRequestIdSchema,
} from '@beautyathome/marketplace';
import { z } from 'zod';

export const ProfessionalServiceListQuerySchema = CursorPaginationQuerySchema;
export const ProfessionalServiceDisableQuerySchema = z
  .object({
    cityId: CityIdSchema,
    expectedVersion: z.coerce.number().int().positive(),
  })
  .strict();
export const PublicProfessionalServiceListQuerySchema = z
  .object({
    cityId: CityIdSchema,
    serviceId: MasterServiceIdSchema.optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export {
  MasterServiceIdSchema,
  ProfessionalServiceIdSchema,
  ServiceRequestIdSchema,
};
