import "server-only";
import axios from "axios";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";
import type { ApiResponse, IPaginatedBody } from "@/types/api.types";

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
    ...extra,
  };
};

const axiosInstance = async (headers?: Record<string, string>) =>
  axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: await buildHeaders(headers),
  });

// Raw NestJS body -> the app's envelope. `message` stays empty: the backend
// sends no success message, so callers fall back to their own toast text
// (`result.message || "Coupon created"`).
const toApiResponse = <TData>(data: TData): ApiResponse<TData> => ({ success: true, message: "", data });

export interface ApiRequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

const httpGet = async <TData>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  const instance = await axiosInstance(options?.headers);
  const response = await instance.get<TData>(endpoint, { params: options?.params });
  return toApiResponse(response.data);
};

// For `{ data, meta }` list endpoints: lifts meta onto the envelope so a
// table reads `response.data` (the rows) and `response.meta` side by side.
const httpGetPaginated = async <TItem>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TItem[]>> => {
  const { data: body } = await httpGet<IPaginatedBody<TItem>>(endpoint, options);
  return { success: true, message: "", data: body.data, meta: body.meta };
};

const httpPost = async <TData>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  const instance = await axiosInstance(options?.headers);
  const response = await instance.post<TData>(endpoint, body ?? {}, { params: options?.params });
  return toApiResponse(response.data);
};

const httpPut = async <TData>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  const instance = await axiosInstance(options?.headers);
  const response = await instance.put<TData>(endpoint, body ?? {}, { params: options?.params });
  return toApiResponse(response.data);
};

const httpPatch = async <TData>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  const instance = await axiosInstance(options?.headers);
  const response = await instance.patch<TData>(endpoint, body ?? {}, { params: options?.params });
  return toApiResponse(response.data);
};

const httpDelete = async <TData>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
  const instance = await axiosInstance(options?.headers);
  const response = await instance.delete<TData>(endpoint, { params: options?.params });
  return toApiResponse(response.data);
};

export const httpClient = {
  get: httpGet,
  getPaginated: httpGetPaginated,
  post: httpPost,
  put: httpPut,
  patch: httpPatch,
  delete: httpDelete,
};
