import "server-only";
import axios, { isAxiosError } from "axios";
import { cache } from "react";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { logServiceError } from "@/lib/axios/logServiceError";
import { getAccessToken } from "@/lib/tokenUtils";
import type { ICustomerProfile } from "@/types/customer.types";

// The signed-in customer, shared by everything in one request (see
// getUserInfo in auth.services.ts for why cache() and raw axios).
export const getCustomerProfile = cache(async (): Promise<ICustomerProfile | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const response = await axios.get<ICustomerProfile>(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, ...(await getClientHeaders()) },
    });
    return response.data;
  } catch (error) {
    // 401/403 is a sign-out; anything else is an outage, shown as one.
    if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      return null;
    }
    logServiceError("Error fetching the current customer", error);
    throw error;
  }
});
