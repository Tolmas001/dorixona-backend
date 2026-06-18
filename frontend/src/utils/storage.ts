import type { AuthState } from '../types';

export const storageKeys = {
  token: 'dorixona_token',
  refreshToken: 'dorixona_refresh_token',
  user: 'dorixona_user',
};

export function readAuth(): AuthState | null {
  const token = localStorage.getItem(storageKeys.token);
  const rawUser = localStorage.getItem(storageKeys.user);
  if (!token || !rawUser) return null;

  try {
    return {
      token,
      refreshToken: localStorage.getItem(storageKeys.refreshToken) || undefined,
      user: JSON.parse(rawUser),
    };
  } catch {
    return null;
  }
}

export function saveAuth(auth: AuthState): void {
  localStorage.setItem(storageKeys.token, auth.token);
  if (auth.refreshToken) localStorage.setItem(storageKeys.refreshToken, auth.refreshToken);
  localStorage.setItem(storageKeys.user, JSON.stringify(auth.user));
}

export function clearAuth(): void {
  localStorage.removeItem(storageKeys.token);
  localStorage.removeItem(storageKeys.refreshToken);
  localStorage.removeItem(storageKeys.user);
}
