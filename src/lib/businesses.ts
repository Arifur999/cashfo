// Server-only helper, same shape as lib/auth.ts's getCurrentUser().
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type BusinessLimits } from "./api";
import { getAccessToken } from "./tokenCookies";

export const getBusinessLimits = cache(async (): Promise<BusinessLimits | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get<BusinessLimits>(`${API_BASE_URL}/api/businesses/limits`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return null;
  }
});
