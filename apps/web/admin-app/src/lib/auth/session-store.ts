import type { AuthenticatedPrincipal, OtpVerifyResponse } from '@beautyathome/auth';

export type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';

export interface AuthSessionSnapshot {
  status: AuthSessionStatus;
  principal: AuthenticatedPrincipal | null;
}

const loadingSnapshot: AuthSessionSnapshot = Object.freeze({
  status: 'loading',
  principal: null,
});
const unauthenticatedSnapshot: AuthSessionSnapshot = Object.freeze({
  status: 'unauthenticated',
  principal: null,
});
const unavailableSnapshot: AuthSessionSnapshot = Object.freeze({
  status: 'unavailable',
  principal: null,
});

let snapshot = loadingSnapshot;
let accessToken: string | null = null;
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeToAuthSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthSessionSnapshot(): AuthSessionSnapshot {
  return snapshot;
}

export function getServerAuthSessionSnapshot(): AuthSessionSnapshot {
  return loadingSnapshot;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function applyAuthenticatedSession(response: OtpVerifyResponse): void {
  accessToken = response.accessToken;
  snapshot = Object.freeze({
    status: 'authenticated',
    principal: response.principal,
  });
  emitChange();
}

export function clearAuthenticatedSession(): void {
  accessToken = null;
  snapshot = unauthenticatedSnapshot;
  emitChange();
}

export function markAuthSessionUnavailable(): void {
  if (snapshot.status === 'authenticated') return;
  snapshot = unavailableSnapshot;
  emitChange();
}
