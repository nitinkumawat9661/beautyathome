import {
  ApiErrorResponseSchema,
  IndiaMobileNumberSchema,
  OtpRequestAcceptedResponseSchema,
  OtpRequestSchema,
  OtpVerifyRequestSchema,
  OtpVerifyResponseSchema,
  type ApiErrorCode,
  type IndiaMobileNumber,
  type OtpRequestAcceptedResponse,
  type OtpVerifyResponse,
} from '@beautyathome/auth';
import {
  AdminProfessionalApplicationPageSchema,
  ProfessionalApplicationDetailSchema,
  type AdminProfessionalApplicationDecision,
  type AdminProfessionalApplicationListQuery,
  type ProfessionalApplicationStartReview,
} from '@beautyathome/marketplace';

import {
  applyAuthenticatedSession,
  clearAuthenticatedSession,
  getAccessToken,
  markAuthSessionUnavailable,
} from '@/lib/auth/session-store';

type ResponseParser<T> = (value: unknown) => T;

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const requestTimeoutMs = 15_000;
let refreshPromise: Promise<OtpVerifyResponse> | null = null;

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | null;

  constructor(message: string, status: number, code: ApiErrorCode | null = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

function apiBaseUrl(): string {
  const value = configuredApiUrl || 'http://localhost:4000';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiClientError('The operations API is not configured.', 503, 'SERVICE_UNAVAILABLE');
  }

  if (typeof window !== 'undefined') {
    const localPage = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!configuredApiUrl && !localPage) {
      throw new ApiClientError('The operations API is not configured.', 503, 'SERVICE_UNAVAILABLE');
    }
    if (!localPage && url.protocol !== 'https:') {
      throw new ApiClientError('The operations API requires HTTPS.', 503, 'SERVICE_UNAVAILABLE');
    }
  }

  return `${url
    .toString()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')}/api/v1`;
}

async function readJson(response: Response): Promise<unknown> {
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function errorFrom(response: Response): Promise<ApiClientError> {
  const parsed = ApiErrorResponseSchema.safeParse(await readJson(response));
  if (parsed.success) {
    return new ApiClientError(parsed.data.error.message, response.status, parsed.data.error.code);
  }
  return new ApiClientError('The request could not be completed.', response.status);
}

async function send(
  path: string,
  init: RequestInit,
  token: string | null = null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && init.body !== null)
    headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${apiBaseUrl()}/${path.replace(/^\/+/, '')}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}

async function parseSuccess<T>(response: Response, parse: ResponseParser<T>): Promise<T> {
  try {
    return parse(await readJson(response));
  } catch {
    throw new ApiClientError(
      'The server returned an invalid response.',
      502,
      'SERVICE_UNAVAILABLE',
    );
  }
}

async function publicRequest<T>(
  path: string,
  init: RequestInit,
  parse: ResponseParser<T>,
): Promise<T> {
  const response = await send(path, init);
  if (!response.ok) throw await errorFrom(response);
  return parseSuccess(response, parse);
}

export async function refreshSession(): Promise<OtpVerifyResponse> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = publicRequest('/auth/token/refresh', { method: 'POST' }, (value) =>
    OtpVerifyResponseSchema.parse(value),
  )
    .then((response) => {
      applyAuthenticatedSession(response);
      return response;
    })
    .catch((error: unknown) => {
      if (error instanceof ApiClientError && error.status === 401) {
        clearAuthenticatedSession();
      } else {
        markAuthSessionUnavailable();
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function authenticatedRequest<T>(
  path: string,
  init: RequestInit,
  parse: ResponseParser<T>,
): Promise<T> {
  let token = getAccessToken();
  if (!token) {
    await refreshSession();
    token = getAccessToken();
  }
  if (!token)
    throw new ApiClientError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');

  let response = await send(path, init, token);
  if (response.status === 401) {
    await refreshSession();
    token = getAccessToken();
    if (!token)
      throw new ApiClientError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
    response = await send(path, init, token);
  }
  if (!response.ok) throw await errorFrom(response);
  return parseSuccess(response, parse);
}

export async function initializeAuthSession(): Promise<void> {
  if (getAccessToken()) return;
  try {
    await refreshSession();
  } catch {
    // A missing refresh cookie is normal before staff sign-in.
  }
}

export function normalizeIndiaMobile(value: string): IndiaMobileNumber | null {
  const compact = value.replace(/[\s()-]/g, '');
  const normalized = /^\d{10}$/.test(compact)
    ? `+91${compact}`
    : /^91\d{10}$/.test(compact)
      ? `+${compact}`
      : compact;
  const parsed = IndiaMobileNumberSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export function requestAdminOtp(
  mobileNumber: IndiaMobileNumber,
): Promise<OtpRequestAcceptedResponse> {
  const payload = OtpRequestSchema.parse({
    role: 'ADMIN',
    purpose: 'SIGN_IN',
    mobileNumber,
  });
  return publicRequest(
    '/auth/otp/request',
    { method: 'POST', body: JSON.stringify(payload) },
    (value) => OtpRequestAcceptedResponseSchema.parse(value),
  );
}

export async function verifyAdminOtp(
  mobileNumber: IndiaMobileNumber,
  challengeId: string,
  otp: string,
): Promise<OtpVerifyResponse> {
  const payload = OtpVerifyRequestSchema.parse({
    role: 'ADMIN',
    purpose: 'SIGN_IN',
    mobileNumber,
    challengeId,
    otp,
  });
  const response = await publicRequest(
    '/auth/otp/verify',
    { method: 'POST', body: JSON.stringify(payload) },
    (value) => OtpVerifyResponseSchema.parse(value),
  );
  applyAuthenticatedSession(response);
  return response;
}

export async function logoutAdmin(): Promise<void> {
  try {
    const response = await send('/auth/logout', { method: 'POST' }, getAccessToken());
    if (!response.ok) throw await errorFrom(response);
  } finally {
    clearAuthenticatedSession();
  }
}

export function listProfessionalApplications(query: AdminProfessionalApplicationListQuery) {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.after) params.set('after', query.after);
  if (query.limit) params.set('limit', String(query.limit));
  const suffix = params.size ? `?${params.toString()}` : '';
  return authenticatedRequest(
    `/admin/professional-applications${suffix}`,
    { method: 'GET' },
    (value) => AdminProfessionalApplicationPageSchema.parse(value),
  );
}

export function getProfessionalApplication(applicationId: string) {
  return authenticatedRequest(
    `/admin/professional-applications/${encodeURIComponent(applicationId)}`,
    { method: 'GET' },
    (value) => ProfessionalApplicationDetailSchema.parse(value),
  );
}

export function startProfessionalApplicationReview(
  applicationId: string,
  input: ProfessionalApplicationStartReview,
) {
  return authenticatedRequest(
    `/admin/professional-applications/${encodeURIComponent(applicationId)}/start-review`,
    { method: 'POST', body: JSON.stringify(input) },
    (value) => ProfessionalApplicationDetailSchema.parse(value),
  );
}

export function decideProfessionalApplication(
  applicationId: string,
  input: AdminProfessionalApplicationDecision,
) {
  return authenticatedRequest(
    `/admin/professional-applications/${encodeURIComponent(applicationId)}/decision`,
    { method: 'POST', body: JSON.stringify(input) },
    (value) => ProfessionalApplicationDetailSchema.parse(value),
  );
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'AUTH_STEP_UP_REQUIRED') {
      return 'Recent verification is required. Sign in again before making this decision.';
    }
    return error.message;
  }
  return 'The request could not be completed.';
}
