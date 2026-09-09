// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts).

import axios from "axios";
import { API_BASE_URL, type ListPlatformUsersResponse, type PlatformUserDetail } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getPlatformUsers(queryString: string): Promise<ListPlatformUsersResponse> {
  const response = await axios.get<ListPlatformUsersResponse>(`${API_BASE_URL}/admin/users?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getPlatformUserById(id: string): Promise<PlatformUserDetail | null> {
  try {
    const response = await axios.get<PlatformUserDetail>(`${API_BASE_URL}/admin/users/${id}`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}
