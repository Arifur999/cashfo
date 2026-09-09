import axios from "axios";
import { API_BASE_URL, type ChurnData, type RevenueSummary } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getRevenueSummary(): Promise<RevenueSummary | null> {
  try {
    const response = await axios.get<RevenueSummary>(`${API_BASE_URL}/admin/revenue/summary`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function getChurn(): Promise<ChurnData | null> {
  try {
    const response = await axios.get<ChurnData>(`${API_BASE_URL}/admin/revenue/churn`, { headers: await authHeaders() });
    return response.data;
  } catch {
    return null;
  }
}
