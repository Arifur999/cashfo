"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAdminUser } from "@/types/auth.types";
import type { IMySession, IMySignIn } from "@/types/myAccount.types";

// My account: every admin, about themselves only.
const BASE = "/admin/auth";

export const getMyAccount = async () => httpClient.get<IAdminUser>(`${BASE}/me`);

export const updateMyName = async (name: string) => httpClient.patch<IAdminUser>(`${BASE}/me`, { name });

export const getMySessions = async () => httpClient.get<IMySession[]>(`${BASE}/sessions`);

// Every session but the one making this request.
export const signOutMyOtherSessions = async () => httpClient.post<{ signedOut: number }>(`${BASE}/sessions/sign-out-others`);

export const getMySignIns = async () => httpClient.get<IMySignIn[]>(`${BASE}/sign-ins`);
