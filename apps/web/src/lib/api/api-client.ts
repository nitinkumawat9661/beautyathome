import {
  ApiErrorResponseSchema,
  AuthenticatedPrincipalSchema,
  CustomerProfileSummarySchema,
  OtpRequestAcceptedResponseSchema,
  OtpRequestSchema,
  OtpVerifyRequestSchema,
  OtpVerifyResponseSchema,
  type ApiErrorCode,
  type AuthenticatedPrincipal,
  type CustomerProfileSummary,
  type OtpRequest,
  type OtpRequestAcceptedResponse,
  type OtpVerifyRequest,
  type OtpVerifyResponse,
} from '@beautyathome/auth';

import {
  applyAuthenticatedSession,
  clearAuthenticatedSession,
  getAccessToken,
  getAuthSessionRevision,
  markAuthSessionUnavailable,
  replaceAuthenticatedPrincipal,
} from '@/lib/auth/auth-session-store';

type ResponseParser<T> = (value: unknown) => T;

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const requestTimeoutMs = 15_000;
const refreshLockName = 'beautyathome-refresh-token';
const refreshLeaseKey = 'beautyathome:refresh-lock';
const tabId = globalThis.crypto?.randomUUID?.() ?? `tab-${String(Date.now())}`;

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

function endpointUrl(path: string): string {
  const apiBaseUrl = resolveApiBaseUrl();
  return `${apiBaseUrl}/${path.replace(/^\/+/, '')}`;
}

function resolveApiBaseUrl(): string {
  const value = configuredApiUrl || 'http://localhost:4000';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiClientError('The application API is not configured.', 503, 'SERVICE_UNAVAILABLE');
  }

  if (typeof window !== 'undefined') {
    const localPage = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!configuredApiUrl && !localPage) {
      throw new ApiClientError(
        'The application API is not configured.',
        503,
        'SERVICE_UNAVAILABLE',
      );
    }
    if (!localPage && url.protocol !== 'https:') {
      throw new ApiClientError(
        'The application API requires a secure connection.',
        503,
        'SERVICE_UNAVAILABLE',
      );
    }
  }

  return `${url
    .toString()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')}/api/v1`;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function apiErrorFrom(response: Response): Promise<ApiClientError> {
  const body = await readJson(response);
  const parsed = ApiErrorResponseSchema.safeParse(body);

  if (parsed.success) {
    return new ApiClientError(parsed.data.error.message, response.status, parsed.data.error.code);
  }

  return new ApiClientError('The request could not be completed.', response.status);
}

function requestHeaders(init: RequestInit, token: string | null): Headers {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (init.body !== undefined && init.body !== null) {
    headers.set('Content-Type', 'application/json');
  }

  if (token !== null) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function send(
  path: string,
  init: RequestInit,
  token: string | null = null,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  return fetch(endpointUrl(path), {
    ...init,
    headers: requestHeaders(init, token),
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
}

async function parseSuccess<T>(response: Response, parse: ResponseParser<T>): Promise<T> {
  const body = await readJson(response);

  try {
    return parse(body);
  } catch {
    throw new ApiClientError(
      'The server returned an invalid response.',
      502,
      'SERVICE_UNAVAILABLE',
    );
  }
}

async function unauthenticatedRequest<T>(
  path: string,
  init: RequestInit,
  parse: ResponseParser<T>,
): Promise<T> {
  const response = await send(path, init);
  if (!response.ok) {
    throw await apiErrorFrom(response);
  }

  return parseSuccess(response, parse);
}

export function publicJsonRequest<T>(
  path: string,
  init: RequestInit,
  parse: ResponseParser<T>,
): Promise<T> {
  return unauthenticatedRequest(path, init, parse);
}

let refreshPromise: Promise<OtpVerifyResponse> | null = null;

type AuthChannelMessage =
  { source: string; type: 'session'; payload: unknown } | { source: string; type: 'logout' };

const authChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('beautyathome-auth')
    : null;

if (authChannel) {
  authChannel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
    if (!event.data || event.data.source === tabId) return;
    if (event.data.type === 'logout') {
      clearAuthenticatedSession();
      return;
    }

    const response = OtpVerifyResponseSchema.safeParse(event.data.payload);
    if (response.success) applyAuthenticatedSession(response.data);
  };
}

function publishSession(response: OtpVerifyResponse): void {
  authChannel?.postMessage({ source: tabId, type: 'session', payload: response });
}

function publishLogout(): void {
  authChannel?.postMessage({ source: tabId, type: 'logout' });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function withLocalStorageRefreshLease<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return operation();
  const owner = `${tabId}:${String(Date.now())}`;
  const deadline = Date.now() + 25_000;

  while (Date.now() < deadline) {
    const now = Date.now();
    try {
      const stored = window.localStorage.getItem(refreshLeaseKey);
      const current = stored
        ? (JSON.parse(stored) as { owner?: unknown; expiresAt?: unknown })
        : null;
      const available =
        !current || typeof current.expiresAt !== 'number' || current.expiresAt <= now;
      if (available) {
        window.localStorage.setItem(
          refreshLeaseKey,
          JSON.stringify({ owner, expiresAt: now + 20_000 }),
        );
        const confirmed = JSON.parse(window.localStorage.getItem(refreshLeaseKey) ?? '{}') as {
          owner?: unknown;
        };
        if (confirmed.owner === owner) {
          try {
            return await operation();
          } finally {
            const latest = JSON.parse(window.localStorage.getItem(refreshLeaseKey) ?? '{}') as {
              owner?: unknown;
            };
            if (latest.owner === owner) window.localStorage.removeItem(refreshLeaseKey);
          }
        }
      }
    } catch {
      throw new ApiClientError(
        'Secure session coordination is unavailable.',
        503,
        'SERVICE_UNAVAILABLE',
      );
    }

    const jitter = globalThis.crypto?.getRandomValues(new Uint8Array(1))[0] ?? 0;
    await delay(75 + (jitter % 75));
  }

  throw new ApiClientError('Secure session refresh timed out.', 503, 'SERVICE_UNAVAILABLE');
}

function withRefreshLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks
      .request(refreshLockName, { mode: 'exclusive' }, () => operation())
      .then((result) => result);
  }
  return withLocalStorageRefreshLease(operation);
}

export function refreshAccessToken(): Promise<OtpVerifyResponse> {
  if (refreshPromise !== null) {
    return refreshPromise;
  }

  let operationRevision = getAuthSessionRevision();
  refreshPromise = withRefreshLock(async () => {
    operationRevision = getAuthSessionRevision();
    return unauthenticatedRequest('/auth/token/refresh', { method: 'POST' }, (value) =>
      OtpVerifyResponseSchema.parse(value),
    );
  })
    .then((response) => {
      if (getAuthSessionRevision() === operationRevision) {
        applyAuthenticatedSession(response);
        publishSession(response);
      }
      return response;
    })
    .catch((error: unknown) => {
      if (getAuthSessionRevision() === operationRevision) {
        if (error instanceof ApiClientError && error.status === 401) {
          clearAuthenticatedSession();
          publishLogout();
        } else if (getAccessToken() === null) {
          markAuthSessionUnavailable();
        }
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

  if (token === null) {
    await refreshAccessToken();
    token = getAccessToken();
  }

  if (token === null) {
    throw new ApiClientError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  }

  let response = await send(path, init, token);

  if (response.status === 401) {
    const currentToken = getAccessToken();
    if (currentToken === token) {
      await refreshAccessToken();
    }
    token = getAccessToken();
    if (token === null) {
      throw new ApiClientError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
    }
    response = await send(path, init, token);
  }

  if (!response.ok) {
    throw await apiErrorFrom(response);
  }

  return parseSuccess(response, parse);
}

export function authenticatedJsonRequest<T>(
  path: string,
  init: RequestInit,
  parse: ResponseParser<T>,
): Promise<T> {
  return authenticatedRequest(path, init, parse);
}

export async function initializeAuthSession(): Promise<void> {
  if (getAccessToken() !== null) {
    return;
  }

  try {
    await refreshAccessToken();
  } catch {
    // The store is already moved to the unauthenticated state. A missing refresh cookie is normal.
  }
}

export async function requestOtp(payload: OtpRequest): Promise<OtpRequestAcceptedResponse> {
  const request = OtpRequestSchema.parse(payload);
  return unauthenticatedRequest(
    '/auth/otp/request',
    { method: 'POST', body: JSON.stringify(request) },
    (value) => OtpRequestAcceptedResponseSchema.parse(value),
  );
}

export async function verifyOtp(payload: OtpVerifyRequest): Promise<OtpVerifyResponse> {
  const request = OtpVerifyRequestSchema.parse(payload);
  const response = await unauthenticatedRequest(
    '/auth/otp/verify',
    { method: 'POST', body: JSON.stringify(request) },
    (value) => OtpVerifyResponseSchema.parse(value),
  );
  applyAuthenticatedSession(response);
  publishSession(response);
  return response;
}

export async function getCurrentPrincipal(): Promise<AuthenticatedPrincipal> {
  const principal = await authenticatedRequest('/me', { method: 'GET' }, (value) =>
    AuthenticatedPrincipalSchema.parse(value),
  );
  replaceAuthenticatedPrincipal(principal);
  return principal;
}

export async function patchCustomerProfile(
  displayName: string | null,
): Promise<CustomerProfileSummary> {
  return authenticatedRequest(
    '/me/customer-profile',
    { method: 'PATCH', body: JSON.stringify({ displayName }) },
    (value) => CustomerProfileSummarySchema.parse(value),
  );
}

export async function logout(): Promise<void> {
  const token = getAccessToken();

  const response = await send('/auth/logout', { method: 'POST' }, token);
  if (!response.ok) throw await apiErrorFrom(response);
  clearAuthenticatedSession();
  publishLogout();
}

export async function logoutAllSessions(): Promise<void> {
  await authenticatedRequest('/auth/logout-all', { method: 'POST' }, () => undefined);
  clearAuthenticatedSession();
  publishLogout();
}

export function authenticationErrorMessage(error: unknown, action: 'request' | 'verify'): string {
  if (!(error instanceof ApiClientError)) {
    return action === 'verify'
      ? 'We could not verify that code. Check it and try again.'
      : 'We could not request a code right now. Please try again.';
  }

  if (error.code === 'AUTH_OTP_RATE_LIMITED' || error.code === 'RATE_LIMITED') {
    return 'Please wait before requesting another code.';
  }

  if (error.code === 'AUTH_PROVIDER_UNAVAILABLE' || error.code === 'SERVICE_UNAVAILABLE') {
    return 'Mobile verification is temporarily unavailable. Please try again later.';
  }

  if (action === 'verify') {
    return 'We could not verify that code. It may be incorrect or expired.';
  }

  return 'We could not request a code right now. Please try again.';
}

export function profileErrorMessage(error: unknown, action: 'load' | 'save' = 'save'): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return 'Your session has expired. Sign in again to continue.';
    }
    if (error.status === 403) {
      return 'This account does not have permission to make that change.';
    }
    if (error.status === 429) {
      return 'Too many requests were made. Please wait and try again.';
    }
  }

  return `We could not ${action} your profile right now. Please try again.`;
}
