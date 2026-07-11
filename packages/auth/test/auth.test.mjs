import assert from 'node:assert/strict';
import test from 'node:test';

import {
  API_ERROR_CODES,
  AccessTokenClaimsSchema,
  AdminOtpRequestSchema,
  AuthenticatedPrincipalSchema,
  CustomerOtpRequestSchema,
  IndiaMobileNumberSchema,
  OtpCodeSchema,
  OtpRequestSchema,
  OtpVerifyRequestSchema,
  ProfessionalProfileUpdateSchema,
  ProfessionalProfileViewSchema,
  canAuthenticateWithMobileOtp,
  createOtpCodeSchema,
  hasAnyRole,
  hasEveryRole,
  hasRole,
  isIndiaMobileNumber,
  isOperationalRole,
  isOtpCode,
  isUserRole,
} from '../dist/index.js';

const challengeId = '30b218f4-2f8b-45a7-b09c-7b40cf4200ce';
const sessionId = '455d4702-1535-48ef-ab67-11b1bd6d3de0';
const userId = '56d25d35-8715-40f3-89f2-fe08e295f6d9';
const profileId = '1617fc85-489e-4d70-beec-42c5ec600305';

test('accepts Indian E.164 mobile numbers and rejects ambiguous input', () => {
  assert.equal(IndiaMobileNumberSchema.parse('+919876543210'), '+919876543210');
  assert.equal(isIndiaMobileNumber('+916123456789'), true);
  assert.equal(isIndiaMobileNumber('9876543210'), false);
  assert.equal(isIndiaMobileNumber('+911234567890'), false);
  assert.equal(isIndiaMobileNumber('+91987654321'), false);
});

test('accepts only the bounded numeric OTP transport shape', () => {
  assert.equal(OtpCodeSchema.parse('0123'), '0123');
  assert.equal(OtpCodeSchema.parse('01234567'), '01234567');
  assert.equal(isOtpCode('123456'), true);
  assert.equal(isOtpCode('123'), false);
  assert.equal(isOtpCode('123456789'), false);
  assert.equal(isOtpCode('12345a'), false);
  assert.equal(isOtpCode(123456), false);
});

test('creates an exact OTP validator from application configuration', () => {
  const configuredOtpSchema = createOtpCodeSchema(6);

  assert.equal(configuredOtpSchema.parse('012345'), '012345');
  assert.equal(configuredOtpSchema.safeParse('01234').success, false);
  assert.throws(() => createOtpCodeSchema(3), RangeError);
  assert.throws(() => createOtpCodeSchema(9), RangeError);
  assert.throws(() => createOtpCodeSchema(5.5), RangeError);
});

test('OTP request contracts are strict, role-discriminated, and block admin signup', () => {
  const customer = CustomerOtpRequestSchema.parse({
    mobileNumber: '+919876543210',
    role: 'CUSTOMER',
    purpose: 'SIGN_UP',
  });

  assert.equal(customer.role, 'CUSTOMER');
  assert.equal(
    AdminOtpRequestSchema.safeParse({
      mobileNumber: '+919876543210',
      role: 'ADMIN',
      purpose: 'SIGN_UP',
    }).success,
    false,
  );
  assert.equal(
    OtpRequestSchema.safeParse({
      mobileNumber: '+919876543210',
      role: 'SUPPORT',
      purpose: 'SIGN_IN',
    }).success,
    true,
  );
  assert.equal(
    OtpRequestSchema.safeParse({
      mobileNumber: '+919876543210',
      role: 'FINANCE',
      purpose: 'SIGN_UP',
    }).success,
    false,
  );
  assert.equal(
    OtpRequestSchema.safeParse({ ...customer, provider: 'not-part-of-the-contract' }).success,
    false,
  );
});

test('OTP verification requires a UUID challenge and bounded numeric code', () => {
  assert.equal(
    OtpVerifyRequestSchema.safeParse({
      challengeId,
      mobileNumber: '+919876543210',
      otp: '123456',
      role: 'PROFESSIONAL',
      purpose: 'SIGN_IN',
    }).success,
    true,
  );
  assert.equal(
    OtpVerifyRequestSchema.safeParse({
      challengeId: 'provider-reference',
      mobileNumber: '+919876543210',
      otp: '123456',
      role: 'PROFESSIONAL',
      purpose: 'SIGN_IN',
    }).success,
    false,
  );
});

test('role helpers cover marketplace and operational authorization checks', () => {
  const granted = ['CUSTOMER', 'SUPPORT'];

  assert.equal(isUserRole('PROFESSIONAL'), true);
  assert.equal(isUserRole('GUEST'), false);
  assert.equal(canAuthenticateWithMobileOtp('ADMIN'), true);
  assert.equal(canAuthenticateWithMobileOtp('SUPPORT'), true);
  assert.equal(isOperationalRole('SUPPORT'), true);
  assert.equal(hasRole(granted, 'CUSTOMER'), true);
  assert.equal(hasAnyRole(granted, ['ADMIN', 'SUPPORT']), true);
  assert.equal(hasEveryRole(granted, ['CUSTOMER', 'SUPPORT']), true);
  assert.equal(hasEveryRole(granted, ['CUSTOMER', 'FINANCE']), false);
});

test('authenticated principal requires matching granted, active, and profile roles', () => {
  const principal = {
    user: {
      id: userId,
      mobileNumberMasked: '+91******3210',
      status: 'ACTIVE',
      roles: ['CUSTOMER'],
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
    },
    activeRole: 'CUSTOMER',
    profile: {
      id: profileId,
      role: 'CUSTOMER',
      displayName: 'Asha',
      profileComplete: true,
    },
  };

  assert.equal(AuthenticatedPrincipalSchema.safeParse(principal).success, true);
  assert.equal(
    AuthenticatedPrincipalSchema.safeParse({
      ...principal,
      activeRole: 'PROFESSIONAL',
    }).success,
    false,
  );
  assert.equal(
    AuthenticatedPrincipalSchema.safeParse({
      ...principal,
      user: { ...principal.user, roles: ['SUPPORT'] },
      activeRole: 'SUPPORT',
      profile: { ...principal.profile, role: 'SUPPORT' },
    }).success,
    true,
  );
});

test('access claims stay PII-free and enforce temporal and role invariants', () => {
  const claims = {
    tokenUse: 'access',
    iss: 'https://api.beautyathome.example',
    aud: 'beautyathome-web',
    sub: userId,
    sid: sessionId,
    roles: ['CUSTOMER'],
    activeRole: 'CUSTOMER',
    iat: 1_783_675_200,
    exp: 1_783_676_100,
  };

  assert.equal(AccessTokenClaimsSchema.safeParse(claims).success, true);
  assert.equal(AccessTokenClaimsSchema.safeParse({ ...claims, exp: claims.iat }).success, false);
  assert.equal(
    AccessTokenClaimsSchema.safeParse({ ...claims, activeRole: 'PROFESSIONAL' }).success,
    false,
  );
  assert.equal(
    AccessTokenClaimsSchema.safeParse({ ...claims, mobileNumber: '+919876543210' }).success,
    false,
  );
});

test('public API error codes remain unique stable identifiers', () => {
  assert.equal(new Set(API_ERROR_CODES).size, API_ERROR_CODES.length);
  assert.ok(API_ERROR_CODES.includes('AUTH_OTP_INVALID'));
  assert.ok(API_ERROR_CODES.includes('AUTH_INVALID_OR_EXPIRED_OTP'));
  assert.ok(API_ERROR_CODES.includes('AUTH_SESSION_REVOKED'));
});

test('professional profile contracts reject authority fields and invalid view data', () => {
  assert.equal(
    ProfessionalProfileUpdateSchema.safeParse({
      displayName: 'Asha',
      biography: 'Bridal and salon-at-home specialist',
      experienceYears: 4,
    }).success,
    true,
  );
  assert.equal(
    ProfessionalProfileUpdateSchema.safeParse({
      displayName: 'Asha',
      verificationStatus: 'APPROVED',
    }).success,
    false,
  );
  assert.equal(
    ProfessionalProfileViewSchema.safeParse({
      id: profileId,
      displayName: 'Asha',
      biography: null,
      experienceYears: 4,
      verificationStatus: 'DRAFT',
      isServiceActive: false,
    }).success,
    true,
  );
});
