import type { ApiError } from './types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export class ApiRequestError extends Error {
  code: string;
  status?: number;
  constructor(error: ApiError) {
    super(error.message);
    this.code = error.code;
    this.status = error.status;
  }
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** Components (or the router) subscribe once to redirect to onboarding on 401. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function notifySessionExpired() {
  for (const listener of sessionExpiredListeners) listener();
}

function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
  signal?: AbortSignal;
}

/** JSON request/response helper for every non-streaming, non-blob Spring call. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token = null, body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiRequestError({ code: 'NETWORK_ERROR', message: 'Network request failed' });
  }

  if (response.status === 401) {
    notifySessionExpired();
    throw new ApiRequestError({ code: 'SESSION_EXPIRED', message: 'Session expired', status: 401 });
  }

  if (!response.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as Partial<ApiError> & { error?: Partial<ApiError> };
      const apiError = data.error ?? data;
      if (apiError.code) code = apiError.code;
      if (apiError.message) message = apiError.message;
    } catch {
      // response had no JSON body — keep the generic message
    }
    throw new ApiRequestError({ code, message, status: response.status });
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Blob request for the one binary response in the contract: PDF bytes. */
export async function apiFetchBlob(
  path: string,
  options: RequestOptions = {}
): Promise<{ blob: Blob; headers: Headers }> {
  const { method = 'POST', token = null, body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiRequestError({ code: 'NETWORK_ERROR', message: 'Network request failed' });
  }

  if (response.status === 401) {
    notifySessionExpired();
    throw new ApiRequestError({ code: 'SESSION_EXPIRED', message: 'Session expired', status: 401 });
  }
  if (!response.ok) {
    throw new ApiRequestError({ code: 'PDF_FAILED', message: `PDF request failed with status ${response.status}`, status: response.status });
  }

  return { blob: await response.blob(), headers: response.headers };
}
