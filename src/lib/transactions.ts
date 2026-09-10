// Server-only helpers, same shape as lib/auth.ts's getCurrentUser().
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type Transaction, type TransactionListResponse } from "./api";
import { getAccessToken } from "./tokenCookies";

export const getTransactions = cache(async (businessId: string): Promise<TransactionListResponse> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  try {
    const response = await axios.get<TransactionListResponse>(`${API_BASE_URL}/api/businesses/${businessId}/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
