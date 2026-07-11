import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AdminServiceRequestDecisionSchema,
  AdminVerificationDecisionSchema,
  AvailabilityRangeQuerySchema,
  DateAvailabilityOverridesReplaceSchema,
  MasterServiceCreateSchema,
  ProfessionalDiscoveryQuerySchema,
  ProfessionalProfileUpdateSchema,
  ProfessionalServiceRequestCreateSchema,
  ProfessionalServiceUpsertSchema,
  PublicProfessionalProfileSchema,
  PublicServiceCategoryPageSchema,
  ServiceCityPricePolicySchema,
  WeeklyAvailabilityReplaceSchema,
  isPriceWithinPolicy,
} from '../dist/index.js';

const ids = {
  category: '11111111-1111-4111-8111-111111111111',
  city: '22222222-2222-4222-8222-222222222222',
  service: '33333333-3333-4333-8333-333333333333',
  upload: '44444444-4444-4444-8444-444444444444',
};

const serviceDraft = {
  categoryId: ids.category,
  name: 'Bridal makeup',
  slug: 'bridal-makeup',
  description: 'Professional bridal makeup at home.',
  defaultDurationMinutes: 120,
  images: [{ uploadId: ids.upload, altText: 'Bridal makeup', displayOrder: 0 }],
  cityPolicies: [
    {
      cityId: ids.city,
      minimumPricePaise: 150000,
      maximumPricePaise: 500000,
      effectiveFrom: '2026-07-11T00:00:00.000Z',
    },
  ],
};

test('master service creation uses integer paise, versioned city inputs, and strict fields', () => {
  assert.equal(MasterServiceCreateSchema.safeParse(serviceDraft).success, true);
  assert.equal(
    MasterServiceCreateSchema.safeParse({
      ...serviceDraft,
      status: 'ACTIVE',
    }).success,
    false,
  );
  assert.equal(
    MasterServiceCreateSchema.safeParse({
      ...serviceDraft,
      cityPolicies: [{ ...serviceDraft.cityPolicies[0], minimumPricePaise: 500001 }],
    }).success,
    false,
  );
  assert.equal(
    MasterServiceCreateSchema.safeParse({
      ...serviceDraft,
      cityPolicies: [{ ...serviceDraft.cityPolicies[0], minimumPricePaise: 10.5 }],
    }).success,
    false,
  );
});

test('service request approval links a service or creates an inactive draft without publish authority', () => {
  const link = {
    decision: 'APPROVE',
    resolution: { mode: 'LINK_EXISTING', masterServiceId: ids.service },
    reasonCode: 'APPROVED_SERVICE_REQUEST',
    expectedVersion: 1,
  };
  assert.equal(AdminServiceRequestDecisionSchema.safeParse(link).success, true);
  assert.equal(
    AdminServiceRequestDecisionSchema.safeParse({
      ...link,
      resolution: {
        mode: 'CREATE_INACTIVE_MASTER_SERVICE',
        service: serviceDraft,
      },
    }).success,
    true,
  );
  assert.equal(
    AdminServiceRequestDecisionSchema.safeParse({
      ...link,
      resolution: {
        mode: 'CREATE_INACTIVE_MASTER_SERVICE',
        service: { ...serviceDraft, status: 'ACTIVE' },
      },
    }).success,
    false,
  );
});

test('professional request and offering commands reject identity and authority mass assignment', () => {
  assert.equal(
    ProfessionalServiceRequestCreateSchema.safeParse({
      categoryId: ids.category,
      proposedName: 'Airbrush makeup',
      proposedDescription: 'Airbrush makeup service requested for the master catalogue.',
      requestedCityIds: [ids.city],
    }).success,
    true,
  );
  assert.equal(
    ProfessionalServiceUpsertSchema.safeParse({
      cityId: ids.city,
      pricePaise: 250000,
      estimatedDurationMinutes: 90,
      isEnabled: true,
      portfolioImages: [],
    }).success,
    true,
  );
  assert.equal(
    ProfessionalServiceUpsertSchema.safeParse({
      professionalId: '55555555-5555-4555-8555-555555555555',
      serviceId: ids.service,
      cityId: ids.city,
      pricePaise: 250000,
      estimatedDurationMinutes: 90,
      isEnabled: true,
      portfolioImages: [],
      state: 'ENABLED',
    }).success,
    false,
  );
  assert.equal(
    ProfessionalServiceUpsertSchema.safeParse({
      pricePaise: 250000,
      estimatedDurationMinutes: 90,
      isEnabled: true,
      portfolioImages: [],
    }).success,
    false,
  );
});

test('profile self-update cannot assign verification, eligibility, account, or internal score', () => {
  const safeUpdate = {
    displayName: 'Asha Beauty',
    biography: 'Experienced beauty professional.',
    experienceYears: 6,
    languageCodes: ['hi', 'en-IN'],
    serviceAreaIds: ['66666666-6666-4666-8666-666666666666'],
    expectedVersion: 1,
  };
  assert.equal(ProfessionalProfileUpdateSchema.safeParse(safeUpdate).success, true);
  for (const field of [
    'verificationStatus',
    'launchEligibility',
    'accountStatus',
    'internalProfessionalScore',
  ]) {
    assert.equal(
      ProfessionalProfileUpdateSchema.safeParse({ ...safeUpdate, [field]: 'APPROVED' }).success,
      false,
    );
  }
});

test('public professional profile rejects internal and contact fields', () => {
  const profile = {
    id: '55555555-5555-4555-8555-555555555555',
    displayName: 'Asha Beauty',
    profileImage: null,
    biography: null,
    experienceYears: 6,
    languageCodes: ['hi'],
    serviceAreas: [],
    verificationStatus: 'APPROVED',
    portfolio: [],
    certificates: [],
    metrics: { averageRating: 4.8, ratingCount: 20, completedJobs: 18 },
  };
  assert.equal(PublicProfessionalProfileSchema.safeParse(profile).success, true);
  assert.equal(
    PublicProfessionalProfileSchema.safeParse({ ...profile, mobileNumber: '+919876543210' })
      .success,
    false,
  );
  assert.equal(
    PublicProfessionalProfileSchema.safeParse({ ...profile, internalProfessionalScore: 91 })
      .success,
    false,
  );
});

test('female-only launch eligibility is an admin decision, never a self-update field', () => {
  assert.equal(
    AdminVerificationDecisionSchema.safeParse({
      decision: 'APPROVE',
      eligibilityPolicyVersionReviewed: 'sikar-phase-1-v1',
      reasonCode: 'VERIFICATION_APPROVED',
      internalNote: 'Evidence reviewed under the approved policy.',
      expectedVersion: 2,
    }).success,
    true,
  );
  assert.equal(
    AdminVerificationDecisionSchema.safeParse({
      decision: 'REQUEST_CHANGES',
      reasonCode: 'CORRECTION_REQUIRED',
      userMessage: 'Please provide a clearer approved document.',
      expectedVersion: 2,
    }).success,
    true,
  );
  assert.equal(
    AdminVerificationDecisionSchema.safeParse({
      decision: 'REQUEST_CHANGES',
      reasonCode: 'APPROVED',
      userMessage: 'Unsafe shortcut.',
      expectedVersion: 2,
    }).success,
    false,
  );
});

test('weekly and date override schedules prevent overlaps and duplicate dates', () => {
  const schedule = {
    timeZone: 'Asia/Kolkata',
    rules: [
      { weekday: 'MONDAY', startLocalTime: '09:00', endLocalTime: '12:00' },
      { weekday: 'MONDAY', startLocalTime: '12:00', endLocalTime: '15:00' },
    ],
  };
  assert.equal(WeeklyAvailabilityReplaceSchema.safeParse(schedule).success, true);
  assert.equal(
    WeeklyAvailabilityReplaceSchema.safeParse({
      ...schedule,
      rules: [
        ...schedule.rules,
        { weekday: 'MONDAY', startLocalTime: '11:00', endLocalTime: '13:00' },
      ],
    }).success,
    false,
  );
  assert.equal(
    DateAvailabilityOverridesReplaceSchema.safeParse({
      timeZone: 'Asia/Kolkata',
      overrides: [{ date: '2026-07-12', kind: 'UNAVAILABLE', reason: 'Personal leave' }],
    }).success,
    true,
  );
  assert.equal(
    DateAvailabilityOverridesReplaceSchema.safeParse({
      timeZone: 'Asia/Kolkata',
      overrides: [
        { date: '2026-07-12', kind: 'UNAVAILABLE' },
        {
          date: '2026-07-12',
          kind: 'AVAILABLE',
          intervals: [{ startLocalTime: '10:00', endLocalTime: '11:00' }],
        },
      ],
    }).success,
    false,
  );
});

test('price, filter, range, and pagination contracts enforce bounds and reject unknowns', () => {
  const policy = {
    id: '77777777-7777-4777-8777-777777777777',
    serviceId: ids.service,
    city: {
      id: ids.city,
      name: 'Sikar',
      slug: 'sikar-rajasthan',
      state: 'Rajasthan',
      countryCode: 'IN',
      timeZone: 'Asia/Kolkata',
    },
    version: 1,
    minimumPricePaise: 10000,
    maximumPricePaise: 50000,
    status: 'ACTIVE',
    effectiveFrom: '2026-07-11T00:00:00.000Z',
    effectiveTo: null,
  };
  assert.equal(ServiceCityPricePolicySchema.safeParse(policy).success, true);
  assert.equal(isPriceWithinPolicy(25000, policy), true);
  assert.equal(isPriceWithinPolicy(50001, policy), false);
  assert.equal(
    ProfessionalDiscoveryQuerySchema.safeParse({
      cityId: ids.city,
      minimumPricePaise: '50000',
      maximumPricePaise: '40000',
    }).success,
    false,
  );
  const parsedQuery = ProfessionalDiscoveryQuerySchema.parse({
    cityId: ids.city,
    minimumRating: '4',
    languageCodes: 'hi,en-IN',
    limit: '20',
  });
  assert.equal(parsedQuery.minimumRating, 4);
  assert.deepEqual(parsedQuery.languageCodes, ['hi', 'en-IN']);
  assert.equal(parsedQuery.limit, 20);
  assert.equal(
    AvailabilityRangeQuerySchema.safeParse({
      fromDate: '2026-07-20',
      toDate: '2026-07-19',
    }).success,
    false,
  );
  assert.equal(
    PublicServiceCategoryPageSchema.safeParse({
      data: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
    }).success,
    true,
  );
  assert.equal(
    PublicServiceCategoryPageSchema.safeParse({
      data: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
      total: 0,
    }).success,
    false,
  );
});
