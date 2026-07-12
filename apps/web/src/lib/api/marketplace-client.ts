import {
  AdminMasterServicePageSchema,
  AdminProfessionalPageSchema,
  AdminServiceCategoryPageSchema,
  AdminServiceListQuerySchema,
  AdminServiceRequestPageSchema,
  AdminVerificationDecisionSchema,
  MasterServiceStatusChangeSchema,
  ServiceRequestStartReviewSchema,
  VerificationStartReviewSchema,
  DateAvailabilityOverridesReplaceSchema,
  OwnAvailabilityResponseSchema,
  OwnProfessionalServicePageSchema,
  ProfessionalDiscoveryQuerySchema,
  ProfessionalOwnProfileSchema,
  ProfessionalProfileUpdateSchema,
  ProfessionalServiceRequestCreateSchema,
  ProfessionalServiceRequestPageSchema,
  ProfessionalServiceUpsertSchema,
  ProfessionalVerificationApplicationSchema,
  ProfessionalVerificationSubmissionSchema,
  PublicCityPageSchema,
  PublicMasterServicePageSchema,
  PublicProfessionalPageSchema,
  PublicProfessionalServicePageSchema,
  PublicServiceAreaPageSchema,
  PublicServiceCategoryPageSchema,
  PublicServiceListQuerySchema,
  ServiceRequestListQuerySchema,
  VerificationApplicationPageSchema,
  WeeklyAvailabilityReplaceSchema,
  type AdminProfessionalListQuery,
  type AdminServiceListQuery,
  type AdminServiceRequestDecision,
  type AdminVerificationDecision,
  type DateAvailabilityOverridesReplace,
  type ProfessionalProfileUpdate,
  type ProfessionalServiceRequestCreate,
  type ProfessionalServiceUpsert,
  type ProfessionalVerificationSubmission,
  type ServiceRequestListQuery,
  type MasterServiceStatusChange,
  type ServiceRequestStartReview,
  type VerificationStartReview,
  type WeeklyAvailabilityReplace,
} from '@beautyathome/marketplace';
import { authenticatedJsonRequest, publicJsonRequest } from '@/lib/api/api-client';

function queryString(input: Record<string, unknown>): string {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    parameters.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const query = parameters.toString();
  return query ? `?${query}` : '';
}

export function listCities(signal?: AbortSignal) {
  return publicJsonRequest(`/cities?limit=20`, { method: 'GET', signal }, (value) =>
    PublicCityPageSchema.parse(value),
  );
}

export function listServiceAreas(cityId: string, signal?: AbortSignal) {
  return publicJsonRequest(
    `/service-areas${queryString({ cityId, limit: 100 })}`,
    { method: 'GET', signal },
    (value) => PublicServiceAreaPageSchema.parse(value),
  );
}

export function listCategories(search?: string, signal?: AbortSignal) {
  return publicJsonRequest(
    `/service-categories${queryString({ search, sort: 'displayOrderAsc', limit: 100 })}`,
    { method: 'GET', signal },
    (value) => PublicServiceCategoryPageSchema.parse(value),
  );
}

export function listServices(
  query: {
    cityId: string;
    categoryId?: string;
    search?: string;
    sort?: 'catalogueAsc' | 'nameAsc' | 'createdAtDesc';
    limit?: number;
  },
  signal?: AbortSignal,
) {
  const parsed = PublicServiceListQuerySchema.parse(query);
  return publicJsonRequest(`/services${queryString(parsed)}`, { method: 'GET', signal }, (value) =>
    PublicMasterServicePageSchema.parse(value),
  );
}

export function listProfessionals(
  query: {
    serviceId?: string;
    cityId: string;
    sort?: 'ratingDesc' | 'priceAsc' | 'experienceDesc';
    limit?: number;
  },
  signal?: AbortSignal,
) {
  const parsed = ProfessionalDiscoveryQuerySchema.parse(query);
  return publicJsonRequest(
    `/professionals${queryString(parsed)}`,
    { method: 'GET', signal },
    (value) => PublicProfessionalPageSchema.parse(value),
  );
}

export function listPublicProfessionalServices(
  professionalId: string,
  cityId: string,
  serviceId?: string,
  signal?: AbortSignal,
) {
  return publicJsonRequest(
    `/professionals/${professionalId}/services${queryString({ cityId, serviceId, limit: 20 })}`,
    { method: 'GET', signal },
    (value) => PublicProfessionalServicePageSchema.parse(value),
  );
}

export function getOwnProfessionalProfile(signal?: AbortSignal) {
  return authenticatedJsonRequest('/professional/profile', { method: 'GET', signal }, (value) =>
    ProfessionalOwnProfileSchema.parse(value),
  );
}

export function updateOwnProfessionalProfile(input: ProfessionalProfileUpdate) {
  const body = ProfessionalProfileUpdateSchema.parse(input);
  return authenticatedJsonRequest(
    '/professional/profile',
    { method: 'PATCH', body: JSON.stringify(body) },
    (value) => ProfessionalOwnProfileSchema.parse(value),
  );
}

export function listOwnProfessionalServices(signal?: AbortSignal) {
  return authenticatedJsonRequest(
    '/professional/services?limit=100',
    { method: 'GET', signal },
    (value) => OwnProfessionalServicePageSchema.parse(value),
  );
}

export function upsertOwnProfessionalService(serviceId: string, input: ProfessionalServiceUpsert) {
  const body = ProfessionalServiceUpsertSchema.parse(input);
  return authenticatedJsonRequest(
    `/professional/services/${serviceId}`,
    { method: 'PUT', body: JSON.stringify(body) },
    (value) => value,
  );
}

export function createServiceRequest(input: ProfessionalServiceRequestCreate) {
  const body = ProfessionalServiceRequestCreateSchema.parse(input);
  return authenticatedJsonRequest(
    '/professional/service-requests',
    { method: 'POST', body: JSON.stringify(body) },
    (value) => value,
  );
}

export function listOwnServiceRequests(query: ServiceRequestListQuery, signal?: AbortSignal) {
  const parsed = ServiceRequestListQuerySchema.parse(query);
  return authenticatedJsonRequest(
    `/professional/service-requests${queryString(parsed)}`,
    { method: 'GET', signal },
    (value) => ProfessionalServiceRequestPageSchema.parse(value),
  );
}

export function getOwnAvailability(fromDate: string, toDate: string, signal?: AbortSignal) {
  return authenticatedJsonRequest(
    `/professional/availability${queryString({ fromDate, toDate, limit: 100 })}`,
    { method: 'GET', signal },
    (value) => OwnAvailabilityResponseSchema.parse(value),
  );
}

export function replaceWeeklyAvailability(input: WeeklyAvailabilityReplace) {
  const body = WeeklyAvailabilityReplaceSchema.parse(input);
  return authenticatedJsonRequest(
    '/professional/availability/weekly',
    { method: 'PUT', body: JSON.stringify(body) },
    (value) => OwnAvailabilityResponseSchema.parse(value),
  );
}

export function replaceDateOverrides(input: DateAvailabilityOverridesReplace) {
  const body = DateAvailabilityOverridesReplaceSchema.parse(input);
  return authenticatedJsonRequest(
    '/professional/availability/overrides',
    { method: 'PUT', body: JSON.stringify(body) },
    (value) => OwnAvailabilityResponseSchema.parse(value),
  );
}

export function getCurrentVerification(signal?: AbortSignal) {
  return authenticatedJsonRequest(
    '/professional/verification-applications/current',
    { method: 'GET', signal },
    (value) => ProfessionalVerificationApplicationSchema.nullable().parse(value),
  );
}

export function submitVerification(input: ProfessionalVerificationSubmission) {
  const body = ProfessionalVerificationSubmissionSchema.parse(input);
  return authenticatedJsonRequest(
    '/professional/verification-applications',
    { method: 'POST', body: JSON.stringify(body) },
    (value) => ProfessionalVerificationApplicationSchema.parse(value),
  );
}

export function resubmitVerification(applicationId: string) {
  return authenticatedJsonRequest(
    `/professional/verification-applications/${applicationId}/resubmit`,
    { method: 'POST', body: JSON.stringify({}) },
    (value) => ProfessionalVerificationApplicationSchema.parse(value),
  );
}

export function listAdminCategories(signal?: AbortSignal) {
  return authenticatedJsonRequest(
    '/admin/service-categories?limit=100',
    { method: 'GET', signal },
    (value) => AdminServiceCategoryPageSchema.parse(value),
  );
}

export function listAdminServices(query: AdminServiceListQuery, signal?: AbortSignal) {
  const parsed = AdminServiceListQuerySchema.parse(query);
  return authenticatedJsonRequest(
    `/admin/services${queryString(parsed)}`,
    { method: 'GET', signal },
    (value) => AdminMasterServicePageSchema.parse(value),
  );
}

export function listAdminServiceRequests(query: ServiceRequestListQuery, signal?: AbortSignal) {
  return authenticatedJsonRequest(
    `/admin/service-requests${queryString(query)}`,
    { method: 'GET', signal },
    (value) => AdminServiceRequestPageSchema.parse(value),
  );
}

export function decideServiceRequest(requestId: string, input: AdminServiceRequestDecision) {
  return authenticatedJsonRequest(
    `/admin/service-requests/${requestId}/decision`,
    { method: 'POST', body: JSON.stringify(input) },
    (value) => value,
  );
}

export function startServiceRequestReview(requestId: string, input: ServiceRequestStartReview) {
  const body = ServiceRequestStartReviewSchema.parse(input);
  return authenticatedJsonRequest(
    `/admin/service-requests/${requestId}/start-review`,
    { method: 'POST', body: JSON.stringify(body) },
    (value) => value,
  );
}

export function changeMasterServiceStatus(serviceId: string, input: MasterServiceStatusChange) {
  const body = MasterServiceStatusChangeSchema.parse(input);
  return authenticatedJsonRequest(
    `/admin/services/${serviceId}/status`,
    { method: 'POST', body: JSON.stringify(body) },
    (value) => value,
  );
}

export function listAdminProfessionals(query: AdminProfessionalListQuery, signal?: AbortSignal) {
  return authenticatedJsonRequest(
    `/admin/professionals${queryString(query)}`,
    { method: 'GET', signal },
    (value) => AdminProfessionalPageSchema.parse(value),
  );
}

export function listVerificationApplications(signal?: AbortSignal) {
  return authenticatedJsonRequest(
    '/admin/verification-applications?limit=100',
    { method: 'GET', signal },
    (value) => VerificationApplicationPageSchema.parse(value),
  );
}

export function startVerificationReview(applicationId: string, input: VerificationStartReview) {
  const body = VerificationStartReviewSchema.parse(input);
  return authenticatedJsonRequest(
    `/admin/verification-applications/${applicationId}/start-review`,
    { method: 'POST', body: JSON.stringify(body) },
    (value) => ProfessionalVerificationApplicationSchema.parse(value),
  );
}

export function decideVerification(applicationId: string, input: AdminVerificationDecision) {
  const body = AdminVerificationDecisionSchema.parse(input);
  return authenticatedJsonRequest(
    `/admin/verification-applications/${applicationId}/decision`,
    { method: 'POST', body: JSON.stringify(body) },
    (value) => value,
  );
}
