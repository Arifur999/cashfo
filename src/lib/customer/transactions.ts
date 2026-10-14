// Server-only helpers, same shape as lib/auth.ts's getCurrentUser().
import { cache } from "react";
import { API_BASE_URL, type ContactCategory, type Transaction, type TransactionListResponse, type TransactionType } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  transactionType?: TransactionType;
  // "Any of these types" rather than an exact match -- see the backend
  // DTO's comment. Ignored by the backend if transactionType is also set.
  transactionTypes?: TransactionType[];
  accountId?: string;
  categoryId?: string;
  contactId?: string;
  contactCategory?: ContactCategory;
  search?: string;
  page?: number;
  limit?: number;
}

// Thin pass-through to the backend's own filters (Prompt 5) -- the friendly
// list page is just a filter-UI wrapper around listTransactions(), not a
// second implementation of filtering.
export const getTransactions = cache(async (businessId: string, filters: TransactionFilters = {}): Promise<TransactionListResponse> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  try {
    // Joined into one comma-separated string explicitly, rather than
    // relying on axios's default array param serialization (repeated
    // keys) -- the backend DTO expects (and its own comment documents)
    // a single comma-separated value.
    const { transactionTypes, ...rest } = filters;
    const response = await customerApi.get<TransactionListResponse>(`${API_BASE_URL}/api/businesses/${businessId}/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { ...rest, transactionTypes: transactionTypes?.join(",") },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  }
});

// Pages whose summary cards total every matching transaction (Balance
// Transfer, Loan Transactions) read them all, a page of 100 at a time, up to
// `maxRows`; totals made from just the first 100 were wrong past that.
// `complete` is false when even maxRows wasn't all of them.
export async function getAllTransactions(
  businessId: string,
  filters: Omit<TransactionFilters, "page" | "limit">,
  maxRows = 1000,
): Promise<{ data: Transaction[]; total: number; complete: boolean }> {
  const PAGE = 100;
  const data: Transaction[] = [];
  let total = 0;
  for (let page = 1; data.length < maxRows; page++) {
    const response = await getTransactions(businessId, { ...filters, page, limit: PAGE });
    total = response.meta.total;
    data.push(...response.data);
    if (response.data.length < PAGE || data.length >= total) break;
  }
  return { data, total, complete: data.length >= total };
}

export const getTransaction = cache(async (businessId: string, id: string): Promise<Transaction | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await customerApi.get<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/transactions/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
