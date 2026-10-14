// Server-only reader for the password vault's state, same shape as
// lib/habits.ts: the vault's entries need the vault token, but whether a
// vault password exists at all is readable with the session alone.
import { cache } from "react";
import { API_BASE_URL } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

export interface VaultStatus {
  hasVaultPassword: boolean;
}

export const getVaultStatus = cache(async (): Promise<VaultStatus | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const res = await customerApi.get<VaultStatus>(`${API_BASE_URL}/api/vault/status`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
