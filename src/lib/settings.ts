import axios from "axios";
import { API_BASE_URL, type PlatformSettings } from "./api";
import { getAccessToken } from "./tokenCookies";

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const accessToken = await getAccessToken();
  const response = await axios.get<PlatformSettings>(`${API_BASE_URL}/admin/settings`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return response.data;
}
