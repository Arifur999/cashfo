// Server-only helpers, same shape as lib/accounts.ts.
import { cache } from "react";
import { API_BASE_URL, type Contact, type ContactCategory, type ContactListResponse, type ContactStatus, type ContactType, type TransactionListResponse } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

export interface ContactFilters {
  type?: ContactType;
  category?: ContactCategory;
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
    const response = await customerApi.get<ContactListResponse>(`${API_BASE_URL}/api/businesses/${businessId}/contacts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: filters,
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, EMPTY_LIST);
  }
});

export const getContact = cache(async (businessId: string, contactId: string): Promise<Contact | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await customerApi.get<Contact>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// Everything posted against one contact -- invoices, payments, loans, and
// any other entry naming them -- newest first (GET .../contacts/:id/transactions).
export const getContactTransactions = cache(async (businessId: string, contactId: string): Promise<TransactionListResponse> => {
  const empty: TransactionListResponse = { data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  const accessToken = await getAccessToken();
  if (!accessToken) return empty;

  try {
    const response = await customerApi.get<TransactionListResponse>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 50 },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, empty);
  }
});

// Every customer and supplier the business trades with (category BUSINESS;
// lending contacts live in Loans), across however many pages the API
// needs. Books' lists and totals want them all at once.
export const getBusinessContacts = cache(async (businessId: string): Promise<Contact[]> => {
  const contacts: Contact[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await getContacts(businessId, { category: "BUSINESS", page, limit: 100 });
    contacts.push(...data);
    if (page >= meta.totalPages) return contacts;
  }
});
