import {
  CityIdSchema,
  CursorPaginationQuerySchema,
  MasterServiceIdSchema,
  QueryPageLimitSchema,
  ReasonCodeSchema,
  SearchTermSchema,
  ServiceAreaIdSchema,
  ServiceAreaStatusSchema,
  ServiceCategoryIdSchema,
  ServiceCategoryStatusSchema,
  ShortReasonSchema,
  VersionSchema,
} from '@beautyathome/marketplace';
import { z } from 'zod';

export const CityListQuerySchema = CursorPaginationQuerySchema;

export const ServiceAreaListQuerySchema = z
  .object({
    cityId: CityIdSchema,
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const AdminServiceAreaListQuerySchema = z
  .object({
    cityId: CityIdSchema,
    status: ServiceAreaStatusSchema.optional(),
    search: SearchTermSchema.optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const CategoryListQuerySchema = z
  .object({
    search: SearchTermSchema.optional(),
    status: ServiceCategoryStatusSchema.optional(),
    sort: z.enum(['displayOrderAsc', 'nameAsc', 'createdAtDesc']).optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const ServiceDetailQuerySchema = z
  .object({ cityId: CityIdSchema })
  .strict();

export const PricePolicyActivationSchema = z
  .object({
    reasonCode: ReasonCodeSchema,
    reason: ShortReasonSchema,
    expectedServiceVersion: VersionSchema,
  })
  .strict();

export {
  CityIdSchema,
  MasterServiceIdSchema,
  ServiceAreaIdSchema,
  ServiceCategoryIdSchema,
};
