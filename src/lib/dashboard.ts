import axios from "axios";
import { API_BASE_URL, type DashboardSummary } from "./api";
import { getAccessToken } from "./tokenCookies";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const accessToken = await getAccessToken();
  const response = await axios.get<DashboardSummary>(`${API_BASE_URL}/admin/dashboard/summary`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return response.data;
}
