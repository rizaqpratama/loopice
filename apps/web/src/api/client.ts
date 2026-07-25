const API_URL = import.meta.env.VITE_API_URL;
const DEV_TENANT_SUBDOMAIN = import.meta.env.VITE_DEV_TENANT_SUBDOMAIN;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  params?: Record<string, string | number | undefined>;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, params } = options;

  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (import.meta.env.DEV && DEV_TENANT_SUBDOMAIN) {
    headers["X-Tenant-Subdomain"] = DEV_TENANT_SUBDOMAIN;
  }

  if (auth && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? response.statusText, data?.details);
  }

  return data as T;
}
