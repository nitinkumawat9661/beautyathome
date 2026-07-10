export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type ServiceId = Brand<string, 'ServiceId'>;
export type BookingId = Brand<string, 'BookingId'>;
