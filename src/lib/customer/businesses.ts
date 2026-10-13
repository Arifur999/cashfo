// Server-only helper, same shape as lib/auth.ts's getCurrentUser().
import { cache } from "react";
import { API_BASE_URL, type BusinessDetail, type BusinessLimits, type WorkspaceListItem } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

export const getBusinessLimits = cache(async (): Promise<BusinessLimits | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await customerApi.get<BusinessLimits>(`${API_BASE_URL}/api/businesses/limits`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// The Group Expense list and a group's own page read through these, so an
// outage reaches the error screen instead of "no workspaces yet" or a bounce
// back to the list. Client components keep using businessActions.ts.
export const listWorkspaces = cache(async (): Promise<WorkspaceListItem[]> => {
  try {
    const response = await customerApi.get<WorkspaceListItem[]>("/api/businesses");
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getWorkspace = cache(async (id: string): Promise<BusinessDetail | null> => {
  try {
    const response = await customerApi.get<BusinessDetail>(`/api/businesses/${id}`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
