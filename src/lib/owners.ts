// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts / workspaces.ts).

import axios from "axios";
import { API_BASE_URL, type OwnerOverviewResponse } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getOwnerOverview(queryString: string): Promise<OwnerOverviewResponse> {
  const response = await axios.get<OwnerOverviewResponse>(`${API_BASE_URL}/admin/owners?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}
