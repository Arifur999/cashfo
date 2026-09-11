// Server-only helpers, same shape as lib/auth.ts's getCurrentUser().
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type Account, type AccountGroup, type AccountLedger, type AccountSummary } from "./api";
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

// For the Wallet management page -- money accounts of every status
// (archived ones stay visible, struck through), unlike
// quickEntryActions.ts's getMoneyAccountsAction which is ACTIVE-only
// (correct for a "pick an account for a new transaction" dropdown, wrong
// for a management list).
export const getWallets = cache(async (businessId: string): Promise<Account[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/wallets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return [];
  }
});

export const getAccount = cache(async (businessId: string, accountId: string): Promise<Account | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get<Account>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return null;
  }
});

export interface LedgerFilters {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

const EMPTY_LEDGER: AccountLedger = {
  accountId: "",
  accountName: "",
  openingBalance: "0",
  balanceBroughtForward: "0",
  entries: [],
  closingBalance: "0",
  meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
};

export const getLedger = cache(async (businessId: string, accountId: string, filters: LedgerFilters = {}): Promise<AccountLedger> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_LEDGER;

  try {
    const response = await axios.get<AccountLedger>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${accountId}/ledger`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: filters,
    });
    return response.data;
  } catch {
    return EMPTY_LEDGER;
  }
});

const EMPTY_SUMMARY: AccountSummary = { currentBalance: "0", totalIn: "0", totalOut: "0", transactionCount: 0 };

export const getAccountSummary = cache(
  async (businessId: string, accountId: string, filters: { dateFrom?: string; dateTo?: string } = {}): Promise<AccountSummary> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return EMPTY_SUMMARY;

    try {
      const response = await axios.get<AccountSummary>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${accountId}/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: filters,
      });
      return response.data;
    } catch {
      return EMPTY_SUMMARY;
    }
  },
);
