"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAdminHelp, IHelpVideo, IHelpVideoPayload, IUpdateHelpCompanyPayload } from "@/types/help.types";

export const getAdminHelp = async () => httpClient.get<IAdminHelp>("/admin/help");

export const updateHelpCompany = async (payload: IUpdateHelpCompanyPayload) => httpClient.put<IAdminHelp>("/admin/help/company", payload);

export const addHelpVideo = async (payload: IHelpVideoPayload) => httpClient.post<IHelpVideo>("/admin/help/videos", payload);

export const updateHelpVideo = async ({ id, ...payload }: Partial<IHelpVideoPayload> & { id: string }) => httpClient.patch<IHelpVideo>(`/admin/help/videos/${id}`, payload);

export const deleteHelpVideo = async ({ id }: { id: string }) => httpClient.delete<IHelpVideo>(`/admin/help/videos/${id}`);

export const orderHelpVideos = async ({ ids }: { ids: string[] }) => httpClient.put<IAdminHelp>("/admin/help/videos/order", { ids });
