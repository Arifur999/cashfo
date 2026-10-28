"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAdminUser } from "@/types/auth.types";
import { getTrustedDeviceHeader } from "@/lib/tokenUtils";
import type { IMySession, IMySignIn, IMyTwoStep } from "@/types/myAccount.types";

// My account: every admin, about themselves only.
const BASE = "/admin/auth";

export const getMyAccount = async () => httpClient.get<IAdminUser>(`${BASE}/me`);

export const updateMyName = async (name: string) => httpClient.patch<IAdminUser>(`${BASE}/me`, { name });

export const getMySessions = async () => httpClient.get<IMySession[]>(`${BASE}/sessions`);

// Every session but the one making this request.
export const signOutMyOtherSessions = async () => httpClient.post<{ signedOut: number }>(`${BASE}/sessions/sign-out-others`);

export const getMySignIns = async () => httpClient.get<IMySignIn[]>(`${BASE}/sign-ins`);

// Two-step sign-in for the admin's own account (admin/auth/two-step). The
// trusted-device cookies go along, so the API can tell which trusted
// computer is this one.
const TWO_STEP = `${BASE}/two-step`;

export const getMyTwoStep = async () => httpClient.get<IMyTwoStep>(TWO_STEP, { headers: await getTrustedDeviceHeader() });

export const startMyTwoStepSetup = async (password: string) => httpClient.post<{ secret: string; otpauthUrl: string }>(`${TWO_STEP}/setup`, { password });

export const enableMyTwoStep = async (code: string) => httpClient.post<{ backupCodes: string[] }>(`${TWO_STEP}/enable`, { code });

export const makeMyBackupCodes = async (payload: { password: string; code: string }) => httpClient.post<{ backupCodes: string[] }>(`${TWO_STEP}/backup-codes`, payload);

export const disableMyTwoStep = async (payload: { password: string; code?: string; backupCode?: string }) => httpClient.post<{ success: boolean }>(`${TWO_STEP}/disable`, payload);

export const forgetMyTrustedDevice = async (id: string) => httpClient.delete<{ success: boolean }>(`${TWO_STEP}/trusted-devices/${encodeURIComponent(id)}`);

export const forgetMyTrustedDevices = async () => httpClient.delete<{ removed: number }>(`${TWO_STEP}/trusted-devices`);
