"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { toPaginationMeta } from "@/lib/pagination";
import type { ApiResponse, IItemsPageBody } from "@/types/api.types";
import type { IChangeOwnerPlanPayload, IOwnerDetail, IOwnerNote, IOwnerOverviewItem, IOwnersPage, ISuspendOwnerPayload } from "@/types/owner.types";

type OwnersListBody = IItemsPageBody<IOwnerOverviewItem> & Pick<IOwnersPage, "statusCounts">;

export const getOwners = async (queryString: string): Promise<ApiResponse<IOwnersPage>> => {
  const { data: body } = await httpClient.get<OwnersListBody>(`/admin/owners?${queryString}`);
  return { success: true, message: "", data: { items: body.items, statusCounts: body.statusCounts }, meta: toPaginationMeta(body) };
};

export const getOwnerById = async (userId: string) => httpClient.get<IOwnerDetail>(`/admin/owners/${userId}`);

export const suspendOwner = async (userId: string, payload: ISuspendOwnerPayload) =>
  httpClient.patch<void>(`/admin/owners/${userId}/suspend`, payload);

export const activateOwner = async (userId: string) => httpClient.patch<void>(`/admin/owners/${userId}/activate`);

export const changeOwnerPlan = async (userId: string, payload: IChangeOwnerPlanPayload) =>
  httpClient.patch<void>(`/admin/owners/${userId}/change-plan`, payload);

// Wipes the owner's workspace business data (transactions, accounts,
// contacts, ...) -- the login itself stays intact.
export const resetOwnerData = async (userId: string) => httpClient.post<void>(`/admin/owners/${userId}/reset`);

// A one-time password for a customer who can't get in; shown once.
export const resetOwnerPassword = async (userId: string) => httpClient.post<{ temporaryPassword: string }>(`/admin/owners/${userId}/reset-password`);

// Cancels a customer's "Delete my account" inside its 30 days.
export const restoreOwner = async (userId: string) => httpClient.post<unknown>(`/admin/owners/${userId}/restore`);

// Signs the customer out on every phone and computer at once.
export const signOutOwnerEverywhere = async (userId: string) => httpClient.post<{ signedOut: number }>(`/admin/owners/${userId}/sign-out-everywhere`);

// Turns off two-step sign-in for a customer who lost their phone (super
// admin; the customer is told).
export const disableOwnerTwoStep = async (userId: string) => httpClient.post<unknown>(`/admin/owners/${userId}/two-step/disable`);

// "Notes for admins": every admin reads them; support and super admins write.
export const getOwnerNotes = async (userId: string) => httpClient.get<IOwnerNote[]>(`/admin/owners/${userId}/notes`);

export const addOwnerNote = async (userId: string, payload: { body: string }) => httpClient.post<IOwnerNote>(`/admin/owners/${userId}/notes`, payload);

export const deleteOwnerNote = async (userId: string, noteId: string) => httpClient.delete<{ success: boolean }>(`/admin/owners/${userId}/notes/${noteId}`);
