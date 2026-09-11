// Server-only helpers, same shape as lib/auth.ts's getCurrentUser().
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type Transaction, type TransactionListResponse, type TransactionType } from "./api";
import { getAccessToken } from "./tokenCookies";

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  transactionType?: TransactionType;
  accountId?: string;
  search?: string;
  limit?: number;
}

// Thin pass-through to the backend's own filters (Prompt 5) -- the friendly
// list page is just a filter-UI wrapper around listTransactions(), not a
// second implementation of filtering.
export const getTransactions = cache(async (businessId: string, filters: TransactionFilters = {}): Promise<TransactionListResponse> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  try {
    const response = await axios.get<TransactionListResponse>(`${API_BASE_URL}/api/businesses/${businessId}/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: filters,
    });
    return response.data;
  } catch {
    return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
});

export const getTransaction = cache(async (businessId: string, id: string): Promise<Transaction | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/transactions/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return null;
  }
});
