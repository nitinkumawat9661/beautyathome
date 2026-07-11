import { z } from 'zod';

import {
  CityIdSchema,
  IanaTimeZoneSchema,
  IsoUtcDateTimeSchema,
  NameSchema,
  PHASE_ONE_COUNTRY_CODE,
  ServiceAreaIdSchema,
  SlugSchema,
  VersionSchema,
  createCursorPageSchema,
  hasMutableField,
} from './primitives.js';

export const CITY_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const SERVICE_AREA_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const CityStatusSchema = z.enum(CITY_STATUSES);
export const ServiceAreaStatusSchema = z.enum(SERVICE_AREA_STATUSES);

export const PublicCitySchema = z
  .object({
    id: CityIdSchema,
    name: NameSchema,
    slug: SlugSchema,
    state: NameSchema,
    countryCode: z.literal(PHASE_ONE_COUNTRY_CODE),
    timeZone: IanaTimeZoneSchema,
  })
  .strict();

export const AdminCitySchema = PublicCitySchema.extend({
  status: CityStatusSchema,
  version: VersionSchema,
  createdAt: IsoUtcDateTimeSchema,
  updatedAt: IsoUtcDateTimeSchema,
}).strict();

export const CityCreateSchema = z
  .object({
    name: NameSchema,
    slug: SlugSchema,
    state: NameSchema,
    countryCode: z.literal(PHASE_ONE_COUNTRY_CODE),
    timeZone: IanaTimeZoneSchema,
  })
  .strict();

export const CityUpdateSchema = CityCreateSchema.partial()
  .extend({ expectedVersion: VersionSchema })
  .strict()
  .refine(hasMutableField, 'At least one city field is required');

export const CityStatusChangeSchema = z
  .object({
    action: z.enum(['ACTIVATE', 'DEACTIVATE']),
    reasonCode: z.string().trim().min(2).max(80),
    expectedVersion: VersionSchema,
  })
  .strict();

export const PublicServiceAreaSchema = z
  .object({
    id: ServiceAreaIdSchema,
    cityId: CityIdSchema,
    name: NameSchema,
    slug: SlugSchema,
  })
  .strict();

export const AdminServiceAreaSchema = PublicServiceAreaSchema.extend({
  status: ServiceAreaStatusSchema,
  version: VersionSchema,
  createdAt: IsoUtcDateTimeSchema,
  updatedAt: IsoUtcDateTimeSchema,
}).strict();

export const ServiceAreaCreateSchema = z
  .object({
    cityId: CityIdSchema,
    name: NameSchema,
    slug: SlugSchema,
  })
  .strict();

export const ServiceAreaUpdateSchema = z
  .object({
    name: NameSchema.optional(),
    slug: SlugSchema.optional(),
    expectedVersion: VersionSchema,
  })
  .strict()
  .refine(hasMutableField, 'At least one service-area field is required');

export const PublicCityPageSchema = createCursorPageSchema(PublicCitySchema);
export const PublicServiceAreaPageSchema = createCursorPageSchema(PublicServiceAreaSchema);

export type CityStatus = z.infer<typeof CityStatusSchema>;
export type PublicCity = z.infer<typeof PublicCitySchema>;
export type AdminCity = z.infer<typeof AdminCitySchema>;
export type CityCreate = z.infer<typeof CityCreateSchema>;
export type CityUpdate = z.infer<typeof CityUpdateSchema>;
export type PublicServiceArea = z.infer<typeof PublicServiceAreaSchema>;
export type ServiceAreaCreate = z.infer<typeof ServiceAreaCreateSchema>;
