import "server-only";
import axios from "axios";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";
import type { ApiResponse, IPaginatedBody } from "@/types/api.types";
import { getClientHeaders } from "./clientHeaders";
import { logServiceError } from "./logServiceError";

// No NEXT_PUBLIC_ prefix on purpose: the browser never talks to the backend
// directly -- it always goes through this Next.js server (Server Components,
// Server Actions, proxy.ts) -- so the backend URL never reaches a client bundle.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

// Token refresh deliberately does NOT happen here. proxy.ts refreshes an
// about-to-expire access token on every /admin request -- page renders and
// Server Action POSTs alike -- and the refreshed cookie is what cookies()
// returns for the rest of that request. Refreshing again here would also be
// impossible during a Server Component render, where cookies are read-only.
const buildHeaders = async (extra?: Record<string, string>) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  // The NestJS admin routes authenticate with a Bearer token today. The whole
  // cookie jar is forwarded as well, so a cookie-session backend (better-auth)
  // works later without touching a single service.
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(await getClientHeaders()),
    ...extra,
  };
};

export interface ApiRequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

// The one request path every method goes through. Failures are logged here,
// once (method, url, status -- never the headers), and rethrown for the
// _action.ts layer to turn into values -- so services need no try/catch.
//
// The raw NestJS body is wrapped in the app's envelope. `message` stays empty:
// the backend sends no success message, so callers fall back to their own
// toast text (`result.message || "Coupon created"`).
const send = async <TData>(method: HttpMethod, endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  try {
    const response = await axios.request<TData>({
      method,
      baseURL: API_BASE_URL,
      url: endpoint,
      timeout: 30000,
      headers: await buildHeaders(options?.headers),
      params: options?.params,
      data: method === "get" || method === "delete" ? undefined : (body ?? {}),
    });
    return { success: true, message: "", data: response.data };
  } catch (error) {
    logServiceError("API request failed", error);
    throw error;
  }
};

// For `{ data, meta }` list endpoints: lifts meta onto the envelope so a
// table reads `response.data` (the rows) and `response.meta` side by side.
const getPaginated = async <TItem>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TItem[]>> => {
  const { data: body } = await send<IPaginatedBody<TItem>>("get", endpoint, undefined, options);
  return { success: true, message: "", data: body.data, meta: body.meta };
};

export const httpClient = {
  get: <TData>(endpoint: string, options?: ApiRequestOptions) => send<TData>("get", endpoint, undefined, options),
  getPaginated,
  post: <TData>(endpoint: string, body?: unknown, options?: ApiRequestOptions) => send<TData>("post", endpoint, body, options),
  put: <TData>(endpoint: string, body?: unknown, options?: ApiRequestOptions) => send<TData>("put", endpoint, body, options),
  patch: <TData>(endpoint: string, body?: unknown, options?: ApiRequestOptions) => send<TData>("patch", endpoint, body, options),
  delete: <TData>(endpoint: string, options?: ApiRequestOptions) => send<TData>("delete", endpoint, undefined, options),
};
