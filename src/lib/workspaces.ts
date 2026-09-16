// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts / platformUsers.ts).

import axios from "axios";
import { API_BASE_URL, type WorkspaceOverviewResponse } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getWorkspaceOverview(queryString: string): Promise<WorkspaceOverviewResponse> {
  const response = await axios.get<WorkspaceOverviewResponse>(`${API_BASE_URL}/admin/workspaces/overview?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}
