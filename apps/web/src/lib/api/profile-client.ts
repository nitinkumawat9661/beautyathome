import { StaffProfileViewSchema, type StaffProfileView } from '@beautyathome/auth';
import {
  ProfessionalOwnProfileSchema,
  ProfessionalProfileUpdateSchema,
  type ProfessionalOwnProfile,
  type ProfessionalProfileUpdate,
} from '@beautyathome/marketplace';

import { authenticatedJsonRequest } from '@/lib/api/api-client';

export type AdminProfileView = StaffProfileView;
export type ProfessionalProfilePatch = ProfessionalProfileUpdate;
export type ProfessionalProfileView = ProfessionalOwnProfile;

export function getProfessionalProfile(signal?: AbortSignal): Promise<ProfessionalProfileView> {
  return authenticatedJsonRequest('/professional/profile', { method: 'GET', signal }, (value) =>
    ProfessionalOwnProfileSchema.parse(value),
  );
}

export function patchProfessionalProfile(
  payload: ProfessionalProfilePatch,
): Promise<ProfessionalProfileView> {
  const body = ProfessionalProfileUpdateSchema.parse(payload);
  return authenticatedJsonRequest(
    '/professional/profile',
    { method: 'PATCH', body: JSON.stringify(body) },
    (value) => ProfessionalOwnProfileSchema.parse(value),
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
