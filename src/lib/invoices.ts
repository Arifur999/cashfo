import axios from "axios";
import { API_BASE_URL, type InvoiceDetail, type ListInvoicesResponse } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getInvoices(queryString: string): Promise<ListInvoicesResponse> {
  const response = await axios.get<ListInvoicesResponse>(`${API_BASE_URL}/admin/invoices?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getInvoiceById(id: string): Promise<InvoiceDetail | null> {
  try {
    const response = await axios.get<InvoiceDetail>(`${API_BASE_URL}/admin/invoices/${id}`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}
