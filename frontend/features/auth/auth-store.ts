'use client';

import { create } from 'zustand';

import {
  buildLogoutUrl,
  isTokenExpired,
  parseJwt,
  refreshAccessToken,
  type TokenSet,
} from '@/lib/oidc-client';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  playerId: string | null;
  username: string | null;
  isAuthenticated: boolean;

  setTokens: (tokens: TokenSet) => void;
  logout: () => void;
  getValidAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  idToken: null,
  playerId: null,
  username: null,
  isAuthenticated: false,

  setTokens(tokens: TokenSet) {
    const claims = parseJwt(tokens.access_token);
    set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      playerId: claims.preferred_username ?? claims.sub,
      username: claims.preferred_username,
      isAuthenticated: true,
    });
  },

  logout() {
    const { idToken } = get();
    set({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      playerId: null,
      username: null,
      isAuthenticated: false,
    });
    if (idToken) {
      window.location.href = buildLogoutUrl(idToken);
    }
  },

  async getValidAccessToken(): Promise<string | null> {
    const { accessToken, refreshToken, setTokens } = get();

    if (!accessToken || !refreshToken) return null;

    if (!isTokenExpired(accessToken)) return accessToken;

    try {
      const newTokens = await refreshAccessToken(refreshToken);
      setTokens(newTokens);
      return newTokens.access_token;
    } catch {
      get().logout();
      return null;
    }
  },
}));
