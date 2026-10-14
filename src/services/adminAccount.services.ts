"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type {
  IAdminAccount,
  ICreateAdminPayload,
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

// The signed-in admin's own password. The API signs their other sessions out.
export const changeOwnPassword = async (payload: { currentPassword: string; newPassword: string }) =>
  httpClient.post<void>("/admin/auth/change-password", payload);
