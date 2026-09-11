// Server-only helpers, same shape as lib/accounts.ts.
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type Contact, type ContactListResponse, type ContactStatus, type ContactType, type TransactionListResponse } from "./api";
import { getAccessToken } from "./tokenCookies";

export interface ContactFilters {
  type?: ContactType;
  status?: ContactStatus;
  search?: string;
  page?: number;
  limit?: number;
}

const EMPTY_LIST: ContactListResponse = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

export const getContacts = cache(async (businessId: string, filters: ContactFilters = {}): Promise<ContactListResponse> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_LIST;

  try {
    const response = await axios.get<ContactListResponse>(`${API_BASE_URL}/api/businesses/${businessId}/contacts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: filters,
    });
    return response.data;
  } catch {
    return EMPTY_LIST;
  }
});

export const getContact = cache(async (businessId: string, contactId: string): Promise<Contact | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get<Contact>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return null;
  }
});

const EMPTY_TRANSACTIONS: TransactionListResponse = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

export const getContactTransactions = cache(async (businessId: string, contactId: string): Promise<TransactionListResponse> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_TRANSACTIONS;

  try {
    const response = await axios.get<TransactionListResponse>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_TRANSACTIONS;
  }
});
