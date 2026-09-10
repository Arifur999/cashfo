// Server-side only -- there is no NEXT_PUBLIC_ prefix here on purpose. The
// browser never talks to the backend directly; it always goes through this
// Next.js server (Server Actions / proxy), same boundary as admin-frontend.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

export type LanguagePreference = "EN" | "BN";
export type WorkspaceType = "PERSONAL" | "BUSINESS";
export type MemberRole = "OWNER" | "ACCOUNTANT" | "STAFF";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  preferredLanguage: LanguagePreference;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  defaultBusinessId: string | null;
}

export interface UserBusiness {
  id: string;
  name: string;
  type: WorkspaceType;
  role: MemberRole;
  isDefault: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferredLanguage: LanguagePreference;
  emailVerifiedAt: string | null;
  businesses: UserBusiness[];
}

export interface BusinessLimits {
  maxBusinessWorkspaces: number;
  currentCount: number;
  atLimit: boolean;
}

export interface BusinessDetail {
  id: string;
  name: string;
  type: WorkspaceType;
  currency: string;
  isDefault: boolean;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NestErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export function getApiErrorMessage(body: unknown, fallback = "Something went wrong"): string {
  const err = body as NestErrorBody | undefined;
  if (!err?.message) return fallback;
  return Array.isArray(err.message) ? err.message.join(", ") : err.message;
}
