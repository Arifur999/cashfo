import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL, httpClient } from "@/lib/axios/httpClient";

// Not a "use server" module, like auth.services.ts: startOwnerView() returns
// a customer's tokens, and every export of a "use server" file is a
// client-callable endpoint.

export interface IOwnerViewTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// "View as customer" (super admins): a one-hour, read-only session of the
// owner, as customer tokens.
export const startOwnerView = async (userId: string) => httpClient.post<IOwnerViewTokens>(`/admin/owners/${userId}/impersonate`);

// Called while the cookies still hold the customer's tokens, so the admin's
// own access token is passed in.
export const endOwnerView = async (userId: string, adminAccessToken: string) => {
  await axios.delete(`${API_BASE_URL}/admin/owners/${userId}/impersonate`, {
    headers: { Authorization: `Bearer ${adminAccessToken}`, ...(await getClientHeaders()) },
    timeout: 30000,
  });
};
