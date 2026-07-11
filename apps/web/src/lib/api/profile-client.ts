import {
  ProfessionalProfileViewSchema,
  StaffProfileViewSchema,
  type ProfessionalProfileUpdate,
  type ProfessionalProfileView,
  type StaffProfileView,
} from '@beautyathome/auth';

import { authenticatedJsonRequest } from '@/lib/api/api-client';

export type AdminProfileView = StaffProfileView;
export type ProfessionalProfilePatch = ProfessionalProfileUpdate;
export type { ProfessionalProfileView };

export function getProfessionalProfile(signal?: AbortSignal): Promise<ProfessionalProfileView> {
  return authenticatedJsonRequest('/professional/profile', { method: 'GET', signal }, (value) =>
    ProfessionalProfileViewSchema.parse(value),
  );
}

export function patchProfessionalProfile(
  payload: ProfessionalProfilePatch,
): Promise<ProfessionalProfileView> {
  return authenticatedJsonRequest(
    '/professional/profile',
    { method: 'PATCH', body: JSON.stringify(payload) },
    (value) => ProfessionalProfileViewSchema.parse(value),
  );
}

export function getAdminProfile(signal?: AbortSignal): Promise<AdminProfileView> {
  return authenticatedJsonRequest('/admin/profile', { method: 'GET', signal }, (value) =>
    StaffProfileViewSchema.parse(value),
  );
}

export function patchAdminProfile(displayName: string | null): Promise<AdminProfileView> {
  return authenticatedJsonRequest(
    '/admin/profile',
    { method: 'PATCH', body: JSON.stringify({ displayName }) },
    (value) => StaffProfileViewSchema.parse(value),
  );
}
