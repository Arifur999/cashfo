import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import type { AdminRole, ITwoStepSignInResponse } from "@/types/auth.types";

// The pages anyone can open from an email: an admin invite, an admin's
// password reset, and confirming a customer's email address. server-only,
// not "use server": accepting an invite answers with tokens. Errors are the
// callers' to read (they carry the API's reason).
const TIMEOUT_MS = 30_000;
// The pages wait on the checks, so those get less.
const CHECK_TIMEOUT_MS = 8000;

const post = async <T>(path: string, body: unknown): Promise<T> =>
  (await axios.post<T>(`${API_BASE_URL}${path}`, body, { headers: await getClientHeaders(), timeout: TIMEOUT_MS })).data;

const get = async <T>(path: string, token: string): Promise<T> =>
  (await axios.get<T>(`${API_BASE_URL}${path}`, { params: { token }, headers: await getClientHeaders(), timeout: CHECK_TIMEOUT_MS })).data;

// ---- Admin invites (GET /admin/auth/invites/check ...) ----

export type InviteCheck =
  | { valid: true; email: string; name: string | null; role: AdminRole; invitedByName: string; expiresAt: string }
  | { valid: false; reason: "NOT_FOUND" | "EXPIRED" | "ACCEPTED" | "REVOKED" };

export const checkAdminInvite = (token: string) => get<InviteCheck>("/admin/auth/invites/check", token);

// Made once per link and kept, so a reload shows the same QR code.
export const getInviteTwoStepSecret = (token: string) => post<{ secret: string; otpauthUrl: string }>("/admin/auth/invites/two-step-secret", { token });

// Creates the admin and signs them in, with their ten backup codes.
export const acceptAdminInvite = (payload: { token: string; name: string; password: string; code: string }) =>
  post<ITwoStepSignInResponse & { backupCodes: string[] }>("/admin/auth/invites/accept", payload);

// ---- An admin's forgotten password ----

// Always { success: true }, whether or not the email is an admin's.
export const requestAdminPasswordReset = (email: string) => post<{ success: true }>("/admin/auth/forgot-password", { email });

export const checkAdminResetLink = (token: string) => get<{ valid: boolean }>("/admin/auth/reset-password/check", token);

// Signs the admin out everywhere and hands out no tokens.
export const resetAdminPassword = (payload: { token: string; password: string }) => post<{ success: true }>("/admin/auth/reset-password", payload);

// ---- Confirming a customer's email (/verify-email?token=) ----

export const checkEmailVerification = (token: string) => get<{ valid: boolean; email?: string }>("/api/auth/verify-email", token);

export const confirmEmailVerification = (token: string) => post<{ verified: true; email: string }>("/api/auth/verify-email", { token });
