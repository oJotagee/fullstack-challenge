import { useAuthStore } from '@/features/auth/auth-store';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await useAuthStore.getState().getValidAccessToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await getErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response): Promise<string> {
  const fallback = response.statusText || 'Erro na requisição';
  const text = await response.text().catch(() => '');

  try {
    const body = JSON.parse(text) as { message?: unknown; error?: unknown };

    if (typeof body.message === 'string') {
      return body.message;
    }

    if (Array.isArray(body.message) && body.message.every((item) => typeof item === 'string')) {
      return body.message.join('\n');
    }

    if (typeof body.error === 'string') {
      return body.error;
    }

    return fallback;
  } catch {
    return text || fallback;
  }
}
