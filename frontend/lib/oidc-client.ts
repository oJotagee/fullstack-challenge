const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL!;
const REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM!;
const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;

const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/callback` : '';

const TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
const AUTH_ENDPOINT = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth`;
const LOGOUT_ENDPOINT = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`;

const PKCE_VERIFIER_KEY = 'pkce_code_verifier';
const PKCE_STATE_KEY = 'pkce_state';

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function sha256Base64Url(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function startLoginFlow(): Promise<void> {
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const state = randomBase64Url(16);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}/callback`,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(
  code: string,
  returnedState: string,
): Promise<TokenSet> {
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const savedState = sessionStorage.getItem(PKCE_STATE_KEY);

  if (!codeVerifier || !savedState) {
    throw new Error('PKCE state missing — login flow was not initiated here');
  }
  if (returnedState !== savedState) {
    throw new Error('State mismatch — possible CSRF attack');
  }

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}/callback`,
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return response.json() as Promise<TokenSet>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return response.json() as Promise<TokenSet>;
}

export function buildLogoutUrl(idToken: string): string {
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
    client_id: CLIENT_ID,
  });
  return `${LOGOUT_ENDPOINT}?${params.toString()}`;
}

export interface JwtClaims {
  sub: string;
  preferred_username: string;
  email?: string;
  exp: number;
}

export function parseJwt(token: string): JwtClaims {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Invalid JWT');
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded) as JwtClaims;
}

export function isTokenExpired(token: string): boolean {
  try {
    const { exp } = parseJwt(token);
    // 30s buffer
    return Date.now() / 1000 > exp - 30;
  } catch {
    return true;
  }
}

export { REDIRECT_URI };
