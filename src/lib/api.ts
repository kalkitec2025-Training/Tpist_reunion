// Thin client for the BACK2CAMPUS API. Same origin by default; VITE_API_URL can
// point the front end at an API on another origin.
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/$/, '') + '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'Network problem. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || `Request failed (${res.status}).`);
  return data as T;
}

/** True when a server with a working database answers; otherwise the app runs in demo mode. */
export async function apiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(API_BASE + '/health', { credentials: 'include' });
    return res.ok && Boolean((await res.json()).database);
  } catch {
    return false;
  }
}
