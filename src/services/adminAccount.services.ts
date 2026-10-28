"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type {
  IAdminAccount,
  IAdminInvite,
  ICreateAdminInvitePayload,
  ICreateAdminPayload,
  ICreatedAdminInvite,
  ICreatedAdmin,
  ITemporaryPassword,
  IUpdateAdminPayload,
} from "@/types/adminAccount.types";

const BASE = "/admin/admins";

// SUPER_ADMIN only; every admin, suspended ones included.
export const getAdminAccounts = async () => httpClient.get<IAdminAccount[]>(BASE);

export const createAdminAccount = async (payload: ICreateAdminPayload) => httpClient.post<ICreatedAdmin>(BASE, payload);

export const updateAdminAccount = async (id: string, payload: IUpdateAdminPayload) => httpClient.patch<IAdminAccount>(`${BASE}/${id}`, payload);

export const suspendAdminAccount = async (id: string) => httpClient.patch<IAdminAccount>(`${BASE}/${id}/suspend`);

export const activateAdminAccount = async (id: string) => httpClient.patch<IAdminAccount>(`${BASE}/${id}/activate`);

export const resetAdminPassword = async (id: string) => httpClient.post<ITemporaryPassword>(`${BASE}/${id}/reset-password`);

// Turns off another admin's two-step sign-in (a lost phone) and signs them out.
export const disableAdminTwoStep = async (id: string) => httpClient.post<unknown>(`${BASE}/${id}/two-step/disable`);

// Invites: a one-time emailed link that works for seven days.
export const getAdminInvites = async () => httpClient.get<IAdminInvite[]>(`${BASE}/invites`);

export const createAdminInvite = async (payload: ICreateAdminInvitePayload) => httpClient.post<ICreatedAdminInvite>(`${BASE}/invites`, payload);

export const resendAdminInvite = async (id: string) => httpClient.post<unknown>(`${BASE}/invites/${id}/resend`);

export const revokeAdminInvite = async (id: string) => httpClient.delete<unknown>(`${BASE}/invites/${id}`);

// The signed-in admin's own password. The API signs their other sessions out.
export const changeOwnPassword = async (payload: { currentPassword: string; newPassword: string }) =>
  httpClient.post<void>("/admin/auth/change-password", payload);
