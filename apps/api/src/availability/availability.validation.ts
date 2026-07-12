import {
  AvailabilitySlotIdSchema,
  IanaTimeZoneSchema,
  IsoUtcDateTimeSchema,
  MasterServiceIdSchema,
} from '@beautyathome/marketplace';
import { z } from 'zod';

export const AvailabilitySlotCreateSchema = z
  .object({
    serviceId: MasterServiceIdSchema,
    startsAt: IsoUtcDateTimeSchema,
    endsAt: IsoUtcDateTimeSchema,
    displayTimeZone: IanaTimeZoneSchema,
  })
  .strict()
  .refine(
    (slot) => Date.parse(slot.endsAt) > Date.parse(slot.startsAt),
    'Slot must end after it starts',
  );

export { AvailabilitySlotIdSchema };
export type AvailabilitySlotCreate = z.infer<
  typeof AvailabilitySlotCreateSchema
>;
