export const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { data?: T; error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    throw new ApiClientError(body?.error?.message ?? `Request failed with status ${response.status}`, response.status, body?.error?.code);
  }
  if (body === null || !('data' in body)) throw new ApiClientError('The server returned an invalid response.', response.status);
  return body.data as T;
}

export async function get<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { credentials: 'include', signal: options?.signal });
  return parseResponse<T>(response);
}

export async function post<TRequest, TResponse>(path: string, payload: TRequest): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse<TResponse>(response);
}

export async function put<TRequest, TResponse>(path: string, payload: TRequest): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return parseResponse<TResponse>(response);
}

export async function patch<TRequest, TResponse>(path: string, payload: TRequest): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return parseResponse<TResponse>(response);
}

export async function del<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, { method: 'DELETE', credentials: 'include' });
  return parseResponse<TResponse>(response);
}

/** Fire-and-forget writes used when a document is being unloaded. */
export function postKeepalive<TRequest>(path: string, payload: TRequest): void {
  void fetch(`${baseUrl}${path}`, {
    method: 'POST', credentials: 'include', keepalive: true,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function putKeepalive<TRequest>(path: string, payload: TRequest): void {
  void fetch(`${baseUrl}${path}`, { method: 'PUT', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => undefined);
}
