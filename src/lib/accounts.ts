// Server-only helper, same shape as lib/auth.ts's getCurrentUser().
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type AccountGroup } from "./api";
import { getAccessToken } from "./tokenCookies";

export const getAccounts = cache(async (businessId: string): Promise<AccountGroup[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<AccountGroup[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return [];
  }
});
