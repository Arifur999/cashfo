"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { toPaginationMeta } from "@/lib/pagination";
import type { ApiResponse, IItemsPageBody } from "@/types/api.types";
import type { IChangeOwnerPlanPayload, IOwnerDetail, IOwnerOverviewItem, IOwnersPage, ISuspendOwnerPayload } from "@/types/owner.types";

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
