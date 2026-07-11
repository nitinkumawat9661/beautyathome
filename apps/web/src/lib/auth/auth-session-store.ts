import type { AuthenticatedPrincipal, OtpVerifyResponse } from '@beautyathome/auth';

export type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';

export interface AuthSessionSnapshot {
  status: AuthSessionStatus;
  principal: AuthenticatedPrincipal | null;
  accessTokenExpiresAt: string | null;
}

const loadingSnapshot: AuthSessionSnapshot = Object.freeze({
  status: 'loading',
  principal: null,
  accessTokenExpiresAt: null,
});

const unauthenticatedSnapshot: AuthSessionSnapshot = Object.freeze({
  status: 'unauthenticated',
  principal: null,
  accessTokenExpiresAt: null,
});

const unavailableSnapshot: AuthSessionSnapshot = Object.freeze({
  status: 'unavailable',
  principal: null,
  accessTokenExpiresAt: null,
});

let snapshot = loadingSnapshot;
let accessToken: string | null = null;
let revision = 0;
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getAuthSessionSnapshot(): AuthSessionSnapshot {
  return snapshot;
}

export function getServerAuthSessionSnapshot(): AuthSessionSnapshot {
  return loadingSnapshot;
}

export function subscribeToAuthSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAuthSessionRevision(): number {
  return revision;
}

export function applyAuthenticatedSession(response: OtpVerifyResponse): void {
  revision += 1;
  accessToken = response.accessToken;
  snapshot = Object.freeze({
    status: 'authenticated',
    principal: response.principal,
    accessTokenExpiresAt: response.accessTokenExpiresAt,
  });
  emitChange();
}

export function replaceAuthenticatedPrincipal(principal: AuthenticatedPrincipal): void {
  if (snapshot.status !== 'authenticated' || accessToken === null) {
    return;
  }

  snapshot = Object.freeze({ ...snapshot, principal });
  revision += 1;
  emitChange();
}

export function clearAuthenticatedSession(): void {
  revision += 1;
  accessToken = null;
  snapshot = unauthenticatedSnapshot;
  emitChange();
}

export function markAuthSessionUnavailable(): void {
  if (accessToken !== null && snapshot.status === 'authenticated') {
    return;
  }

  revision += 1;
  snapshot = unavailableSnapshot;
  emitChange();
}
