import {
  BookingListSchema,
  BookingViewSchema,
  CommerceRecordListSchema,
  WalletViewSchema,
  type BookingStatus,
} from '@beautyathome/booking';
import { authenticatedJsonRequest } from '@/lib/api/api-client';

const json = (value: unknown) => value as Record<string, unknown>;
export function listBookings(scope: 'customer' | 'professional' | 'admin', status?: BookingStatus) {
  const base =
    scope === 'customer'
      ? '/bookings'
      : scope === 'professional'
        ? '/professional/bookings'
        : '/admin/commerce/bookings';
  return authenticatedJsonRequest(
    `${base}?limit=100${status ? `&status=${status}` : ''}`,
    { method: 'GET' },
    (value) => BookingListSchema.parse(value),
  );
}
export function getBooking(id: string, scope: 'customer' | 'professional' | 'admin') {
  const path =
    scope === 'customer'
      ? `/bookings/${id}`
      : scope === 'professional'
        ? `/professional/bookings/${id}`
        : `/admin/commerce/bookings/${id}`;
  return authenticatedJsonRequest(path, { method: 'GET' }, (value) =>
    BookingViewSchema.parse(value),
  );
}
export function createBooking(
  input: {
    serviceId: string;
    cityId: string;
    serviceAreaId: string;
    addressId: string;
    availabilitySlotId: string;
    assignmentMode: 'SELECTED_PROFESSIONAL' | 'BEST_AVAILABLE';
    selectedProfessionalId?: string;
  },
  idempotencyKey: string,
) {
  return authenticatedJsonRequest(
    '/bookings',
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) },
    (value) => BookingViewSchema.parse(value),
  );
}
export function cancelBooking(id: string, version: number) {
  return authenticatedJsonRequest(
    `/bookings/${id}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({
        reasonCode: 'CUSTOMER_CANCELLED',
        reason: 'Cancelled by customer',
        expectedVersion: version,
      }),
    },
    (value) => BookingViewSchema.parse(value),
  );
}
export function createPaymentOrder(id: string, key: string) {
  return authenticatedJsonRequest(
    `/bookings/${id}/payment-order`,
    { method: 'POST', body: JSON.stringify({ idempotencyKey: key }) },
    json,
  );
}
export function confirmPayment(
  id: string,
  input: { paymentId: string; signature: string; idempotencyKey: string },
) {
  return authenticatedJsonRequest(
    `/bookings/${id}/payment-confirmation`,
    { method: 'POST', body: JSON.stringify(input) },
    json,
  );
}
export function reviewBooking(id: string, rating: number, comment?: string) {
  return authenticatedJsonRequest(
    `/bookings/${id}/reviews`,
    { method: 'POST', body: JSON.stringify({ rating, comment }) },
    json,
  );
}
export function createReminder(id: string, schedule: 'DAYS_15' | 'DAYS_30' | 'DAYS_45') {
  return authenticatedJsonRequest(
    `/bookings/${id}/rebooking-reminders`,
    { method: 'POST', body: JSON.stringify({ schedule }) },
    json,
  );
}
export function professionalDecision(id: string, action: 'accept' | 'reject', version: number) {
  return authenticatedJsonRequest(
    `/professional/bookings/${id}/${action}`,
    {
      method: 'POST',
      body: JSON.stringify({
        expectedVersion: version,
        ...(action === 'reject' ? { reasonCode: 'PROFESSIONAL_UNAVAILABLE' } : {}),
      }),
    },
    (value) => BookingViewSchema.parse(value),
  );
}
export function professionalAction(id: string, action: 'en-route' | 'arrived', version: number) {
  return authenticatedJsonRequest(
    `/professional/bookings/${id}/${action}`,
    { method: 'POST', body: JSON.stringify({ expectedVersion: version }) },
    (value) => BookingViewSchema.parse(value),
  );
}
export function issueServiceOtp(id: string, purpose: 'start' | 'completion') {
  return authenticatedJsonRequest(
    `/professional/bookings/${id}/${purpose}-otp`,
    { method: 'POST' },
    json,
  );
}
export function verifyServiceOtp(
  id: string,
  purpose: 'start' | 'completion',
  input: { challengeId: string; code: string; expectedVersion: number },
) {
  return authenticatedJsonRequest(
    `/professional/bookings/${id}/${purpose}-otp/verify`,
    { method: 'POST', body: JSON.stringify(input) },
    (value) => BookingViewSchema.parse(value),
  );
}
export function getWallet() {
  return authenticatedJsonRequest('/professional/wallet', { method: 'GET' }, (value) =>
    WalletViewSchema.parse(value),
  );
}
export function listPayoutAccounts() {
  return authenticatedJsonRequest('/professional/payout-accounts', { method: 'GET' }, (value) =>
    CommerceRecordListSchema.parse(value),
  );
}
export function createPayoutAccount(accountReference: string, maskedLabel: string) {
  return authenticatedJsonRequest(
    '/professional/payout-accounts',
    { method: 'POST', body: JSON.stringify({ provider: 'mock', accountReference, maskedLabel }) },
    json,
  );
}
export function listWithdrawals(scope: 'professional' | 'admin') {
  return authenticatedJsonRequest(
    scope === 'professional' ? '/professional/withdrawals' : '/admin/commerce/withdrawals',
    { method: 'GET' },
    (value) => CommerceRecordListSchema.parse(value),
  );
}
export function requestWithdrawal(payoutAccountId: string, amountPaise: number, key: string) {
  return authenticatedJsonRequest(
    '/professional/withdrawals',
    { method: 'POST', body: JSON.stringify({ payoutAccountId, amountPaise, idempotencyKey: key }) },
    json,
  );
}
export function adminRecords(
  resource:
    | 'payment-attempts'
    | 'refunds'
    | 'wallet-entries'
    | 'withdrawals'
    | 'commission-rules'
    | 'disputes',
) {
  return authenticatedJsonRequest(`/admin/commerce/${resource}`, { method: 'GET' }, (value) =>
    resource === 'disputes'
      ? BookingListSchema.parse(value)
      : CommerceRecordListSchema.parse(value),
  );
}
export function decideAdminRecord(
  resource: 'refunds' | 'withdrawals',
  id: string,
  action: 'APPROVE' | 'REJECT' | 'RETRY',
  expectedStatus: string,
) {
  return authenticatedJsonRequest(
    `/admin/commerce/${resource}/${id}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({
        action,
        expectedStatus,
        internalNote: `${action} after administrative review`,
      }),
    },
    json,
  );
}
export function overrideBooking(id: string, toStatus: BookingStatus, version: number) {
  return authenticatedJsonRequest(
    `/admin/commerce/bookings/${id}/override`,
    {
      method: 'POST',
      body: JSON.stringify({
        toStatus,
        expectedVersion: version,
        reasonCode: 'ADMIN_OVERRIDE',
        reason: 'Authorized administrative correction',
      }),
    },
    (value) => BookingViewSchema.parse(value),
  );
}
export function createCommissionRule(input: {
  rateBasisPoints: number;
  fixedFeePaise: number;
  effectiveFrom: string;
  priority: number;
}) {
  return authenticatedJsonRequest(
    '/admin/commerce/commission-rules',
    { method: 'POST', body: JSON.stringify({ ...input, promotionalOverride: false }) },
    json,
  );
}
