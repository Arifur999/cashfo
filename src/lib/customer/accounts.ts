// Server-only helpers, same shape as lib/auth.ts's getCurrentUser().
import { cache } from "react";
import { API_BASE_URL, type Account, type AccountGroup, type AccountLedger, type AccountSummary, type WalletsOverview } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

export const getAccounts = cache(async (businessId: string): Promise<AccountGroup[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await customerApi.get<AccountGroup[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
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
    const response = await customerApi.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/wallets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

const EMPTY_WALLETS_OVERVIEW: WalletsOverview = { totalAccounts: 0, totalBalance: "0.00", inactiveAmount: "0.00", availableBalance: "0.00", accounts: [] };

// For the Balance Overview page -- per-wallet opening/in/out/current
// figures plus workspace-wide totals.
export const getWalletsOverview = cache(async (businessId: string): Promise<WalletsOverview> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_WALLETS_OVERVIEW;

  try {
    const response = await customerApi.get<WalletsOverview>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/wallets-overview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, EMPTY_WALLETS_OVERVIEW);
  }
});

// Savings Goals' own Wallet management page -- same shape as getWallets()
// above, filtered to accountSubtype "savings" instead of the regular
// money-account subtypes. See AccountsService.listSavingsWallets()'s
// comment for why these are a separate, deliberately-excluded-from-
// MONEY_ACCOUNT_SUBTYPES kind of Account.
export const getSavingsWallets = cache(async (businessId: string): Promise<Account[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await customerApi.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/savings-wallets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getAccount = cache(async (businessId: string, accountId: string): Promise<Account | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await customerApi.get<Account>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
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
    const response = await customerApi.get<AccountLedger>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${accountId}/ledger`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: filters,
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, EMPTY_LEDGER);
  }
});

const EMPTY_SUMMARY: AccountSummary = { currentBalance: "0", totalIn: "0", totalOut: "0", adjustment: "0.00", transactionCount: 0 };

export const getAccountSummary = cache(
  async (businessId: string, accountId: string, filters: { dateFrom?: string; dateTo?: string } = {}): Promise<AccountSummary> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return EMPTY_SUMMARY;

    try {
      const response = await customerApi.get<AccountSummary>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${accountId}/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: filters,
      });
      return response.data;
    } catch (error) {
      return emptyUnlessOutage(error, EMPTY_SUMMARY);
    }
  },
);

// Active Cash/Bank/MFS accounts, for the Transactions page's account filter.
export const getMoneyAccounts = cache(async (businessId: string): Promise<Account[]> => {
  try {
    const response = await customerApi.get<Account[]>(`/api/businesses/${businessId}/accounts/money-accounts`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});
