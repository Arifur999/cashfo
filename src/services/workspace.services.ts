"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { toPaginationMeta } from "@/lib/pagination";
import type { ApiResponse } from "@/types/api.types";
import type { IWorkspaceOverview, IWorkspaceOverviewBody } from "@/types/workspace.types";

export const getWorkspaceOverview = async (queryString: string): Promise<ApiResponse<IWorkspaceOverview>> => {
  const { data: body } = await httpClient.get<IWorkspaceOverviewBody>(`/admin/workspaces/overview?${queryString}`);
  return {
    success: true,
    message: "",
    data: { summary: body.summary, items: body.items },
    meta: toPaginationMeta(body),
  };
};
