const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Central API client — all calls go through here.
 * Routes to the backend server instead of Next.js API routes.
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, options);
}

/**
 * Shorthand for JSON POST requests.
 */
export async function apiPost(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
